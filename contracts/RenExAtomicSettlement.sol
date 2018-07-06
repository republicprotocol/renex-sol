pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "republic-sol/contracts/Orderbook.sol";
import "republic-sol/contracts/renex/RenExBalances.sol";
import "republic-sol/contracts/renex/RenExTokens.sol";

/**
@title The contract responsible for holding trader funds and settling matched
order values
@author Republic Protocol
*/
contract RenExAtomicSettlement is Ownable {
    using SafeMath for uint256;

    /**
      * @notice Fees are in RenEx are 0.2% and to represent this in integers it
      * is broken into a numerator and denominator.
      */
    uint256 constant public FEES_NUMERATOR = 2;
    uint256 constant public FEES_DENOMINATOR = 1000;

    /**
      * @notice This is a Republic Protocol settlement identifier for the
      * RenExAtomicSettlement contract. It is used in orders to specify which
      * settlement layer is being used.
      */
    uint32 constant public SETTLEMENT_IDENTIFIER = 2;

    Orderbook public orderbookContract;
    RenExTokens public renExTokensContract;
    RenExBalances public renExBalancesContract;

    uint256 public submissionGasPriceLimit;

    enum OrderType {Midpoint, Limit}
    enum OrderParity {Buy, Sell}
    enum OrderStatus {None, Submitted, Matched}

    struct Order {
        uint8 parity;
        uint8 orderType;
        uint64 expiry;
        uint64 tokens;
        uint64 priceC; uint64 priceQ;
        uint64 volumeC; uint64 volumeQ;
        uint64 minimumVolumeC; uint64 minimumVolumeQ;
        uint256 nonceHash;
        address trader;
        address submitter;
    }

    struct MatchDetails {
        bytes32 personalOrder;
        bytes32 foreignOrder;
        uint256 sendValue;
        uint256 recieveValue;
        uint32 sendCurrency;
        uint32 recieveCurrency;
    }

    // Events
    event Transfer(address from, address to, uint32 token, uint256 value);
    event OrderbookUpdates(Orderbook previousOrderbook, Orderbook nextOrderbook);
    event RenExBalancesUpdates(RenExBalances previousRenExBalances, RenExBalances nextRenExBalances);
    event SubmissionGasPriceLimitUpdates(uint256 previousSubmissionGasPriceLimit, uint256 nextSubmissionGasPriceLimit);

    // Storage
    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => MatchDetails) public getMatchDetails;
    mapping(bytes32 => bytes32) public matches;
    mapping(bytes32 => OrderStatus) private orderStatuses;

    /**
      * @notice constructor
      *
      * @param _orderbookContract The address of the Orderbook contract.
      * @param _renExBalancesContract The address of the RenExBalances
      *                               contract.
      * @param _renExTokensContract The address of the RenExTokens contract.
      */
    constructor(
        Orderbook _orderbookContract,
        RenExTokens _renExTokensContract,
        RenExBalances _renExBalancesContract,
        uint256 _submissionGasPriceLimit
    ) public {
        orderbookContract = _orderbookContract;
        renExTokensContract = _renExTokensContract;
        renExBalancesContract = _renExBalancesContract;
        submissionGasPriceLimit = _submissionGasPriceLimit;
    }

    /********** UPDATER FUNCTIONS *********************************************/

    function updateOrderbook(Orderbook _newOrderbookContract) public onlyOwner {
        emit OrderbookUpdates(orderbookContract, _newOrderbookContract);
        orderbookContract = _newOrderbookContract;
    }

    function updateRenExBalances(RenExBalances _newRenExBalancesContract) public onlyOwner {
        emit RenExBalancesUpdates(renExBalancesContract, _newRenExBalancesContract);
        renExBalancesContract = _newRenExBalancesContract;
    }

    function updateSubmissionGasPriceLimit(uint256 _newSubmissionGasPriceLimit) public onlyOwner {
        emit SubmissionGasPriceLimitUpdates(submissionGasPriceLimit, _newSubmissionGasPriceLimit);
        submissionGasPriceLimit = _newSubmissionGasPriceLimit;
    }

    /********** MODIFIERS *****************************************************/

    modifier withGasPriceLimit(uint256 gasPriceLimit) {
        require(tx.gasprice <= gasPriceLimit);
        _;
    }

    /********** WITHDRAWAL FUNCTIONS ******************************************/

    function traderCanWithdraw(address _trader, address _token, uint256 amount) public returns (bool) {
        // In the future, this will return false (i.e. invalid withdrawal) if the
        // trader has open orders for that token
        return true;
    }

    /********** SETTLEMENT FUNCTIONS ******************************************/

    // Price/volume calculation functions

    /**
     * @notice Returns true if the left tuple represents a larger number than
     * the right tuple
     */
    function tupleGTE(uint64 leftC, uint64 leftQ, uint64 rightC, uint64 rightQ) private pure returns (bool) {
        if (leftQ < rightQ) {
            return false;
        }

        uint256 norm = leftC * 10 ** uint256(leftQ - rightQ);

        return norm >= rightC;
    }

    /**
     * @notice Returns the midpoint between the buy and sell prices as a tuple
     */
    function priceMidPoint(bytes32 buyID, bytes32 sellID) private view returns (uint256, int256) {
        // Normalize to same exponent before finding mid-point (mean)
        uint256 norm = uint256(orders[buyID].priceC) * 10 ** uint256(orders[buyID].priceQ - orders[sellID].priceQ);
        int256 q = int256(orders[sellID].priceQ);
        uint256 sum = (orders[sellID].priceC + norm);
        if (sum % 2 == 0) {
            return (sum / 2, q);
        } else {
            // To not lose the .5 for odd numbers, multiply by 5 and subtract from q
            return (sum * (10 / 2), q - 1);
        }
    }

    /**
     * @notice Returns the smaller volume in the high token
     */
    function minimumVolume(bytes32 buyID, bytes32 sellID, uint256 priceC, int256 priceQ)
    private view returns (uint256, int256, uint256) {
        uint256 buyV = tupleToVolume(orders[buyID].volumeC, int256(orders[buyID].volumeQ), 1, 12);
        uint256 sellV = tupleToScaledVolume(orders[sellID].volumeC, int256(orders[sellID].volumeQ), priceC, priceQ, 1, 12);

        if (buyV < sellV) {
            // Instead of dividing the constant by priceC, we delay the division
            // until the recombining c and q, to ensure that minimal precision
            // is lost
            return (orders[buyID].volumeC * 200, int256(orders[buyID].volumeQ + 26 + 12) - priceQ, priceC);
        } else {
            return (orders[sellID].volumeC, int256(orders[sellID].volumeQ), 1);
        }
    }

    /**
     * @notice Converts a tuple to a volume after multiplying by the price
     */
    function tupleToScaledVolume(uint256 volC, int256 volQ, uint256 priceC, int256 priceQ, uint256 divideC, uint256 decimals)
    private pure returns (uint256) {
        // 0.2 turns into 2 * 10**-1 (-1 moved to exponent)
        // 0.005 turns into 5 * 10**-3 (-3 moved to exponent)
        uint256 c = volC * 5 * priceC * 2;

        int256 e = int256(decimals) + volQ + priceQ - (26 + 12 + 3 + 12 + 1);

        // If (ep-en) is negative, divide instead of multiplying
        uint256 value;
        if (e >= 0) {
            value = c * 10 ** uint256(e);
        } else {
            value = c / 10 ** uint256(-e);
        }

        value = value / divideC;

        return value;
    }

    /**
     * @notice Converts a tuple to a price
     */
    function tupleToPrice(uint256 priceC, int256 priceQ, uint256 decimals)
    private pure returns (uint256) {
        // 0.2 turns into 2 * 10**-1 (-1 moved to exponent)
        // 0.005 turns into 5 * 10**-3 (-3 moved to exponent)
        uint256 c = priceC * 5;

        int256 e = int256(decimals) + priceQ - (26 + 12 + 3);

        // If (ep-en) is negative, divide instead of multiplying
        uint256 value;
        if (e >= 0) {
            value = c * 10 ** uint256(e);
        } else {
            value = c / 10 ** uint256(-e);
        }

        return value;
    }

    /**
     * @notice Converts a tuple to a volume
     */
    function tupleToVolume(uint256 volC, int256 volQ, uint256 divideC, uint256 decimals) private pure returns (uint256) {
        // 0.2 turns into 2 * 10**-1 (-1 moved to exponent)
        uint256 c = 2 * volC;

        // Positive and negative components of exponent
        uint256 ep = decimals;
        uint256 en = 12 + 1;
        // Add volQ to positive or negative component based on its sign
        if (volQ < 0) {
            en += uint256(-volQ);
        } else {
            ep += uint256(volQ);
        }

        // If (ep-en) is negative, divide instead of multiplying
        uint256 value;
        if (ep >= en) {
            value = c * 10 ** (ep - en);
        } else {
            value = c / 10 ** (en - ep);
        }

        value = value / divideC;

        return value;
    }

    /**
     * @notice (private) Calls the RenExBalances contract to update the balances
     */
    function settleFunds(
        bytes32 _buyID, bytes32 _sellID,
        uint32 buyToken, uint32 sellToken,
        uint256 lowTokenValue, uint256 highTokenValue
    ) private {
        address buyTokenAddress = renExTokensContract.tokenAddresses(buyToken);
        address sellTokenAddress = renExTokensContract.tokenAddresses(sellToken);

        address buySubmitter = orders[_buyID].submitter;
        address sellSubmitter = orders[_sellID].submitter;

        uint256 lowTokenValueFinal = (lowTokenValue * (FEES_DENOMINATOR - FEES_NUMERATOR)) / FEES_DENOMINATOR;

        uint256 highTokenValueFinal = (highTokenValue * (FEES_DENOMINATOR - FEES_NUMERATOR)) / FEES_DENOMINATOR;

        // Subtract values
        renExBalancesContract.decrementBalanceWithFee(
            orders[_buyID].trader, sellTokenAddress, lowTokenValueFinal, lowTokenValue - lowTokenValueFinal, buySubmitter
        );
        renExBalancesContract.decrementBalanceWithFee(
            orders[_sellID].trader, buyTokenAddress, highTokenValueFinal, highTokenValue - highTokenValueFinal, sellSubmitter
        );

        // Add values
        renExBalancesContract.incrementBalance(orders[_sellID].trader, sellTokenAddress, lowTokenValueFinal);
        renExBalancesContract.incrementBalance(orders[_buyID].trader, buyTokenAddress, highTokenValueFinal);

        // emit Transfer(buyer, seller, sellToken, lowTokenValueFinal);
        // emit Transfer(seller, buyer, buyToken, highTokenValueFinal);
    }



    /**
     * @notice Calculates the ID of the order
     * @param order the order to hash
     */
    function hashOrder(Order order) private pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                order.orderType,
                order.parity,
                SETTLEMENT_IDENTIFIER,
                order.expiry,
                order.tokens,
                order.priceC, order.priceQ,
                order.volumeC, order.volumeQ,
                order.minimumVolumeC, order.minimumVolumeQ,
                order.nonceHash
            )
        );
    }




    /**
      * @notice Stores the details of an order
      * @param _orderType one of Midpoint or Limit
      * @param _parity one of Buy or Sell
      * @param _expiry the expiry date of the order in seconds since Unix epoch
      * @param _tokens two 32-bit token codes concatenated (with the lowest first)
      * @param _priceC the constant in the price tuple
      * @param _priceQ the exponent in the price tuple
      * @param _volumeC the constant in the volume tuple
      * @param _volumeQ the exponent in the volume tuple
      * @param _minimumVolumeC the constant in the minimum-volume tuple
      * @param _minimumVolumeQ the exponent in the minimum-volume tuple
      * @param _nonceHash the keccak256 hash of a random 32 byte value
      */
    function submitOrder(
        uint8 _orderType,
        uint8 _parity,
        uint64 _expiry,
        uint64 _tokens,
        uint64 _priceC, uint64 _priceQ,
        uint64 _volumeC, uint64 _volumeQ,
        uint64 _minimumVolumeC, uint64 _minimumVolumeQ,
        uint256 _nonceHash
    ) public withGasPriceLimit(submissionGasPriceLimit) {
        Order memory order = Order({
            orderType: _orderType,
            parity: _parity,
            expiry: _expiry,
            tokens: _tokens,
            priceC: _priceC, priceQ: _priceQ,
            volumeC: _volumeC, volumeQ: _volumeQ,
            minimumVolumeC: _minimumVolumeC, minimumVolumeQ: _minimumVolumeQ,
            nonceHash: _nonceHash,
            trader: 0x0,
            submitter: msg.sender
        });

        bytes32 orderID = hashOrder(order);

        require(orderStatuses[orderID] == OrderStatus.None);
        orderStatuses[orderID] = OrderStatus.Submitted;

        require(orderbookContract.orderState(orderID) == 2);

        order.trader = orderbookContract.orderTrader(orderID);

        // Trader should not be 0x0
        // assert(order.trader != 0x0);

        orders[orderID] = order;
    }

    /**
     * @notice Verifies details about an order

     * @param _orderID the ID of the order to verify
     */
    function verifyOrder(bytes32 _orderID) public view {
        require(orderStatuses[_orderID] == OrderStatus.Submitted);

        // Verify price ranges
        require(orders[_orderID].priceC <= 1999);
        require(orders[_orderID].priceQ <= 52);

        // Verify volume ranges
        require(orders[_orderID].volumeC <= 49);
        require(orders[_orderID].volumeQ <= 52);

        // Verify minimum volume ranges
        require(orders[_orderID].minimumVolumeC <= 49);
        require(orders[_orderID].minimumVolumeQ <= 52);
    }

    /**
     * @notice Verifies details about an match

     * @param _buyID the ID of the buy order
     * @param _sellID the ID of the sell order
     * @return the token IDs of the match
     */
    function verifyMatch(bytes32 _buyID, bytes32 _sellID) public view returns (uint32, uint32) {
        // Require that the orders are confirmed to one another
        require(orders[_buyID].parity == uint8(OrderParity.Buy));
        require(orders[_sellID].parity == uint8(OrderParity.Sell));

        // TODO: Loop through and check for all indices when an order is able to
        // be matched with multiple orders
        require(orderbookContract.orderMatch(_buyID)[0] == _sellID);

        // Buy price should be greater than sell price
        require(tupleGTE(orders[_buyID].priceC, orders[_buyID].priceQ, orders[_sellID].priceC, orders[_sellID].priceQ));
        
        // Buy volume should be greater than sell minimum volume
        require(tupleGTE(orders[_buyID].volumeC, orders[_buyID].volumeQ, orders[_sellID].minimumVolumeC, orders[_sellID].minimumVolumeQ));
        
        // Sell volume should be greater than buy minimum volume
        require(tupleGTE(orders[_sellID].volumeC, orders[_sellID].volumeQ, orders[_buyID].minimumVolumeC, orders[_buyID].minimumVolumeQ));
    
        uint32 buyToken = uint32(orders[_sellID].tokens);
        uint32 sellToken = uint32(orders[_sellID].tokens >> 32);

        require(renExTokensContract.tokenIsRegistered(buyToken));
        require(renExTokensContract.tokenIsRegistered(sellToken));

        return (buyToken, sellToken);
    }

    /**
      * @notice Settles two orders that are matched. `submitOrder` must have been
      * called for each order before this function is called.
      *
      * @param _buyID the 32 byte ID of the buy order
      * @param _sellID the 32 byte ID of the sell order
      */
    function submitMatch(bytes32 _buyID, bytes32 _sellID) public {
        // Verify details
        verifyOrder(_buyID);
        verifyOrder(_sellID);
        (uint32 buyToken, uint32 sellToken) = verifyMatch(_buyID, _sellID);

        (uint256 lowTokenValue, uint256 highTokenValue) = settlementDetails(
            _buyID,
            _sellID,
            buyToken,
            sellToken
        );

        payFees(_buyID, _sellID, buyToken, sellToken, lowTokenValue, highTokenValue);
        setMatchDetails(_buyID, _sellID, buyToken, sellToken, lowTokenValue, highTokenValue);

        orderStatuses[_buyID] = OrderStatus.Matched;
        orderStatuses[_sellID] = OrderStatus.Matched;
    }


    /**
     * @notice Calculates the volumes to be transferred between traders
     * (not including fees)
     */
    function settlementDetails(
        bytes32 _buyID,
        bytes32 _sellID,
        uint32 _buyToken,
        uint32 _sellToken
    ) private view returns (uint256, uint256) {
        uint32 buyTokenDecimals = renExTokensContract.tokenDecimals(_buyToken);
        uint32 sellTokenDecimals = renExTokensContract.tokenDecimals(_sellToken);

        // Price midpoint
        (uint256 midPriceC, int256 midPriceQ) = priceMidPoint(_buyID, _sellID);

        (uint256 minVolC, int256 minVolQ, uint256 divideC) = minimumVolume(_buyID, _sellID, midPriceC, midPriceQ);

        uint256 lowTokenValue = tupleToScaledVolume(minVolC, minVolQ, midPriceC, midPriceQ, divideC, sellTokenDecimals);

        uint256 highTokenValue = tupleToVolume(minVolC, minVolQ, divideC, buyTokenDecimals);

        return (lowTokenValue, highTokenValue);
    }

    /**
     * @notice (read-only) Returns the volumes transferred between traders and
     * the respective fees
     */
    function getSettlementDetails(bytes32 _buyID, bytes32 _sellID)
    external view returns (uint256, uint256, uint256, uint256, uint256) {
        uint32 buyToken = uint32(orders[_sellID].tokens);
        uint32 sellToken = uint32(orders[_sellID].tokens >> 32);

        (uint256 lowTokenValue, uint256 highTokenValue) = settlementDetails(
            _buyID,
            _sellID,
            buyToken,
            sellToken
        );

        uint256 lowTokenValueFinal = (lowTokenValue * (FEES_DENOMINATOR - FEES_NUMERATOR)) / FEES_DENOMINATOR;

        uint256 highTokenValueFinal = (highTokenValue * (FEES_DENOMINATOR - FEES_NUMERATOR)) / FEES_DENOMINATOR;

        uint256 midPrice = getMidPrice(_buyID, _sellID);

        return (midPrice, lowTokenValueFinal, highTokenValueFinal, lowTokenValue - lowTokenValueFinal, highTokenValue - highTokenValueFinal);
    }

    /**
     * @notice Calculates the midprice tuple and converts it to a uint256
     */
    function getMidPrice(bytes32 _buyID, bytes32 _sellID) public view returns (uint256) {
        (uint256 midPriceC, int256 midPriceQ) = priceMidPoint(_buyID, _sellID);
        uint32 sellToken = uint32(orders[_sellID].tokens >> 32);

        uint32 sellTokenDecimals = renExTokensContract.tokenDecimals(sellToken);
        return tupleToPrice(midPriceC, midPriceQ, sellTokenDecimals);
    }

    function setMatchDetails(bytes32 _buyID, bytes32 _sellID, uint32 _buyToken, uint32 _sellToken, uint256 _lowTokenValue, uint256 _highTokenValue) private {
        getMatchDetails[_buyID] = MatchDetails({
            personalOrder: _buyID,
            foreignOrder: _sellID,
            sendValue: _lowTokenValue,
            recieveValue: _highTokenValue,
            sendCurrency: _sellToken,
            recieveCurrency: _buyToken
        });

        getMatchDetails[_sellID] = MatchDetails({
            personalOrder: _sellID,
            foreignOrder: _buyID,
            sendValue: _highTokenValue,
            recieveValue: _lowTokenValue,
            sendCurrency: _buyToken,
            recieveCurrency: _sellToken
        });
    }

    function payFees(bytes32 _personalID, bytes32 _foreignID, uint32 _sendToken, uint32 _recieveToken, uint256 _sendValue, uint256 _recieveValue) private {
        uint256 fee;
        address tokenAddress;
        if (isEthereumBased(_sendToken)) {
            tokenAddress = getTokenAddress(_sendToken);
            fee = calculateFee(_sendValue);
        } else if (isEthereumBased(_recieveToken)) {
            tokenAddress = getTokenAddress(_recieveToken);
            fee = calculateFee(_recieveValue);
        } else {
            return;
        }
        renExBalancesContract.decrementBalanceWithFee(getTrader(_personalID), tokenAddress, 0, fee, getSubmitter(_personalID));
        renExBalancesContract.decrementBalanceWithFee(getTrader(_foreignID), tokenAddress, 0, fee, getSubmitter(_foreignID));
    }

    function calculateFee(uint256 _value) private view returns (uint256) {
        return (_value *  FEES_NUMERATOR) / FEES_DENOMINATOR;
    }

    function getTrader(bytes32 _orderID) private view returns (address) {
        return orders[_orderID].trader;
    }

    function getSubmitter(bytes32 _orderID) private view returns (address) {
        return orders[_orderID].submitter;
    }

    function getTokenAddress(uint32 _token) private view returns (address) {
        return renExTokensContract.tokenAddresses(_token);
    }

    function isEthereumBased(uint32 _token) private view returns (bool) {
        return (getTokenAddress(_token) != address(0x0));
    }
}