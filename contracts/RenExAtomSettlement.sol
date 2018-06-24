pragma solidity ^0.4.24;

import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "../Orderbook.sol";
import "./RenExBalances.sol";
import "./RenExTokens.sol";

/**
@title The contract responsible for holding trader funds and settling matched
order values
@author Republic Protocol
*/
contract RenExAtomSettlement is Ownable {
    using SafeMath for uint256;

    // Fees are 0.2%
    uint256 FEES_NUMERATOR = 2;
    uint256 FEES_DENOMINATOR = 1000;

    // Republic Protocol settlement identifier
    uint32 constant public identifier = 1;

    Orderbook orderbookContract;
    RenExTokens renExTokensContract;
    RenExBalances renExBalancesContract;

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

    struct Match {
        uint256 price;
        uint256 lowVolume;
        uint256 highVolume;
    }

    // Events
    event Transfer(address from, address to, uint32 token, uint256 value);
    event Debug256(string msg, uint256 num);
    event Debug32(string msg, bytes32 b);
    event DebugAddress(string msg, address addr);
    event DebugBytes(string msg, bytes b);
    event Debugi256(string msg, int256 num);
    event Debug(string msg);
    event DebugTuple(string msg, uint256 c, uint256 q);
    event DebugTupleI(string msg, uint256 c, int256 q);


    // Storage
    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => OrderStatus) private orderStatuses;

    /**
    @notice constructor
    @param _orderbookContract the address of the Orderbook contract
    @param _renExBalancesContract the address of the RenExBalances contract
    @param _renExTokensContract the address of the RenExTokens contract
    */
    constructor(
        Orderbook _orderbookContract,
        RenExTokens _renExTokensContract,
        RenExBalances _renExBalancesContract
    ) public {
        orderbookContract = _orderbookContract;
        renExTokensContract = _renExTokensContract;
        renExBalancesContract = _renExBalancesContract;
    }


    /********** WITHDRAWAL FUNCTIONS ******************************************/

    function traderCanWithdraw(address _trader, address _token, uint256 amount) public returns (bool) {
        // In the future, this will return true (i.e. invalid withdrawal) if the
        // trader has open orders for that token
        return true;
    }



    /********** SETTLEMENT FUNCTIONS ******************************************/
    
    // Price/volume calculation functions

    function priceMidPoint(bytes32 buyID, bytes32 sellID) private view returns (uint256, int256) {
        // Normalize to same exponent before finding mid-point (mean)
        // Common exponent is 0 (to ensure division doesn't lose details)
        // uint256 norm1 = orders[buyID].priceC * 10 ** (orders[buyID].priceQ);
        // uint256 norm2 = orders[sellID].priceC * 10 ** (orders[sellID].priceQ);
        // return ((norm1 + norm2) / 2, 0);
        uint256 norm = orders[buyID].priceC * 10 ** uint256(orders[buyID].priceQ - orders[sellID].priceQ);
        int256 q = int256(orders[sellID].priceQ);
        uint256 sum = (orders[sellID].priceC + norm);
        if (sum % 2 == 0) {
            return (sum / 2, q);
        } else {
            // To not lose the .5 for odd numbers, multiply by 5 and subtract from q
            return (sum * (10 / 2), q - 1);
        }
    }

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

    // Ensure this remains private
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

    // Ensure this remains private
    function payFeesAtom(
        bytes32 _buyID, bytes32 _sellID,
        uint32 buyToken, uint32 sellToken,
        uint256 lowTokenValue, uint256 highTokenValue
    ) private {
        if (renExTokensContract.isEthereum(buyToken)) {
            address tokenAddress = renExTokensContract.tokenAddresses(buyToken);   
            uint256 fee = (lowTokenValue * FEES_NUMERATOR)/ FEES_DENOMINATOR;
        } else {
            address tokenAddress = renExTokensContract.tokenAddresses(sellToken); 
            uint256 fee = (highTokenValue * FEES_NUMERATOR)/ FEES_DENOMINATOR;       
        }   
       
        address buySubmitter = orders[_buyID].submitter;
        address sellSubmitter = orders[_sellID].submitter;

        // Subtract values
        renExBalancesContract.decrementBalanceWithFee(
            orders[_buyID].trader, tokenAddress, 0, fee, buySubmitter
        );
        renExBalancesContract.decrementBalanceWithFee(
            orders[_sellID].trader, tokenAddress, 0, fee, sellSubmitter
        );

        // emit Transfer(buyer, seller, sellToken, lowTokenValueFinal);
        // emit Transfer(seller, buyer, buyToken, highTokenValueFinal);
    }

    // TODO: Implement
    function hashOrder(Order order) private pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                order.orderType,
                order.parity,
                identifier,
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
    @notice Stores the details of an order
    @param _orderType one of Midpoint or Limit
    @param _parity one of Buy or Sell
    @param _expiry the expiry date of the order in seconds since Unix epoch
    @param _tokens two 32-bit token codes concatenated (with the lowest first)
    @param _priceC the constant in the price tuple
    @param _priceQ the exponent in the price tuple
    @param _volumeC the constant in the volume tuple
    @param _volumeQ the exponent in the volume tuple
    @param _minimumVolumeC the constant in the minimum-volume tuple
    @param _minimumVolumeQ the exponent in the minimum-volume tuple
    @param _nonceHash the keccak256 hash of a random 32 byte value
    */
    function submitOrder(
        uint8 _orderType,
        uint8 _parity,
        uint64 _expiry,
        uint64 _tokens,
        uint16 _priceC, uint16 _priceQ,
        uint16 _volumeC, uint16 _volumeQ,
        uint16 _minimumVolumeC, uint16 _minimumVolumeQ,
        uint256 _nonceHash
    ) public {

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

        order.trader = orderbookContract.orderTrader(orderID);
        require(order.trader != 0x0);

        orders[orderID] = order;
    }

    function verifyMatch(bytes32 _buyID, bytes32 _sellID) public view returns (uint32, uint32) {
        require(orderStatuses[_buyID] == OrderStatus.Submitted);
        require(orderStatuses[_sellID] == OrderStatus.Submitted);

        // Require that the orders are confirmed to one another
        require(orders[_buyID].parity == uint8(OrderParity.Buy));
        require(orders[_sellID].parity == uint8(OrderParity.Sell));
        require(orderbookContract.orderState(_buyID) == 2);
        require(orderbookContract.orderState(_sellID) == 2);
        
        // TODO: Loop through and check at all indices
        require(orderbookContract.orderMatch(_buyID)[0] == _sellID);

        uint32 buyToken = uint32(orders[_sellID].tokens);
        uint32 sellToken = uint32(orders[_sellID].tokens >> 32);

        require(renExTokensContract.tokenIsRegistered(buyToken));
        require(renExTokensContract.tokenIsRegistered(sellToken));

        return (buyToken, sellToken);

        // TODO: Compare prices and volumes/minimum volumes
    }

    /**
    @notice Settles two orders that are matched. `submitOrder` must have been
    called for each order before this function is called
    @param _buyID the 32 byte ID of the buy order
    @param _sellID the 32 byte ID of the sell order
    */
    function submitMatch(bytes32 _buyID, bytes32 _sellID) public {
        // Verify match
        (uint32 buyToken, uint32 sellToken) = verifyMatch(_buyID, _sellID);

        (uint256 lowTokenValue, uint256 highTokenValue) = settlementDetails(
            _buyID,
            _sellID,
            buyToken,
            sellToken
        );

        settleFunds(_buyID, _sellID, buyToken, sellToken, lowTokenValue, highTokenValue);

        orderStatuses[_buyID] = OrderStatus.Matched;
        orderStatuses[_sellID] = OrderStatus.Matched;
    }

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

    function getMidPrice(bytes32 _buyID, bytes32 _sellID) public view returns (uint256) {
        (uint256 midPriceC, int256 midPriceQ) = priceMidPoint(_buyID, _sellID);
        uint32 sellToken = uint32(orders[_sellID].tokens >> 32);

        uint32 sellTokenDecimals = renExTokensContract.tokenDecimals(sellToken);
        return tupleToPrice(midPriceC, midPriceQ, sellTokenDecimals);
    }
}
