pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "republic-sol/contracts/Orderbook.sol";
import "republic-sol/contracts/SettlementUtils.sol";

import "./RenExBalances.sol";
import "./RenExTokens.sol";

/**
@title The contract responsible for holding trader funds and settling matched
order values
@author Republic Protocol
*/
contract RenExSettlement is Ownable {
    using SafeMath for uint256;

    address public slasherAddress;

    /**
      * @notice Fees are in RenEx are 0.2% and to represent this in integers it
      * is broken into a numerator and denominator.
      */
    uint256 constant public DARKNODE_FEES_NUMERATOR = 2;
    uint256 constant public DARKNODE_FEES_DENOMINATOR = 1000;

    uint32 constant public RENEX_SETTLEMENT_ID = 1;
    uint32 constant public RENEX_ATOMIC_SETTLEMENT_ID = 2;

    Orderbook public orderbookContract;
    RenExTokens public renExTokensContract;
    RenExBalances public renExBalancesContract;

    uint256 public submissionGasPriceLimit;

    enum OrderType {Midpoint, Limit}
    enum OrderParity {Buy, Sell}
    enum OrderStatus {None, Submitted, Matched}

    struct MatchDetails {
        uint256 lowTokenVolume;
        uint256 highTokenVolume;
        uint32 lowToken;
        uint32 highToken;
        address lowTokenAddress;
        address highTokenAddress;
    }

    // Events
    // event OrderbookUpdated(Orderbook previousOrderbook, Orderbook nextOrderbook);
    // event RenExBalancesUpdated(RenExBalances previousRenExBalances, RenExBalances nextRenExBalances);
    // event SubmissionGasPriceLimitUpdated(uint256 previousSubmissionGasPriceLimit, uint256 nextSubmissionGasPriceLimit);

    // Order Storage
    mapping(bytes32 => SettlementUtils.OrderDetails) public orderDetails;
    mapping(bytes32 => OrderStatus) public orderStatus;
    mapping(bytes32 => address) public orderTrader;
    mapping(bytes32 => address) public orderSubmitter;
    // Match storage
    mapping(bytes32 => MatchDetails) public matchDetails;
    // Slasher storage
    mapping(bytes32 => bool) public slashedMatches;


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
        uint256 _submissionGasPriceLimit,
        address _slasherAddress
    ) public {
        orderbookContract = _orderbookContract;
        renExTokensContract = _renExTokensContract;
        renExBalancesContract = _renExBalancesContract;
        submissionGasPriceLimit = _submissionGasPriceLimit;
        slasherAddress = _slasherAddress;
    }

    /********** UPDATER FUNCTIONS *********************************************/

    function updateOrderbook(Orderbook _newOrderbookContract) public onlyOwner {
        // emit OrderbookUpdated(orderbookContract, _newOrderbookContract);
        orderbookContract = _newOrderbookContract;
    }

    function updateRenExBalances(RenExBalances _newRenExBalancesContract) public onlyOwner {
        // emit RenExBalancesUpdated(renExBalancesContract, _newRenExBalancesContract);
        renExBalancesContract = _newRenExBalancesContract;
    }

    function updateSubmissionGasPriceLimit(uint256 _newSubmissionGasPriceLimit) public onlyOwner {
        // emit SubmissionGasPriceLimitUpdated(submissionGasPriceLimit, _newSubmissionGasPriceLimit);
        submissionGasPriceLimit = _newSubmissionGasPriceLimit;
    }

    /********** MODIFIERS *****************************************************/

    modifier withGasPriceLimit(uint256 gasPriceLimit) {
        require(tx.gasprice <= gasPriceLimit, "gas price too high");
        _;
    }

    modifier onlySlasher() {
        require(msg.sender == slasherAddress, "unauthorised");
        _;
    }

    /********** WITHDRAWAL FUNCTIONS ******************************************/

    function traderCanWithdraw(address _trader, address _token, uint256 amount) public returns (bool) {
        // In the future, this will return false (i.e. invalid withdrawal) if the
        // trader has open orders for that token
        return true;
    }


   /**
      * @notice Stores the details of an order
      * @param _orderType one of Midpoint or Limit
      * @param _parity one of Buy or Sell
      * @param _expiry the expiry date of the order in seconds since Unix epoch
      * @param _tokens two 32-bit token codes concatenated (with the lowest first)
      * @param _price the order price
      * @param _volume the order volume
      * @param _minimumVolume the order minimum volume
      * @param _nonceHash the keccak256 hash of a random 32 byte value
      */
    function submitOrder(
        uint32 _settlementID,
        uint8 _orderType,
        uint8 _parity,
        uint64 _expiry,
        uint64 _tokens,
        uint256 _price,
        uint256 _volume,
        uint256 _minimumVolume,
        uint256 _nonceHash
    ) public withGasPriceLimit(submissionGasPriceLimit) {
        SettlementUtils.OrderDetails memory order = SettlementUtils.OrderDetails({
            settlementID: _settlementID,
            orderType: _orderType,
            parity: _parity,
            expiry: _expiry,
            tokens: _tokens,
            price: _price,
            volume: _volume,
            minimumVolume: _minimumVolume,
            nonceHash: _nonceHash
        });

        bytes32 orderID = SettlementUtils.hashOrder(order);

        orderSubmitter[orderID] = msg.sender;

        require(orderStatus[orderID] == OrderStatus.None, "order already submitted");
        orderStatus[orderID] = OrderStatus.Submitted;

        require(orderbookContract.orderState(orderID) == Orderbook.OrderState.Confirmed, "uncofirmed order");

        orderTrader[orderID] = orderbookContract.orderTrader(orderID);

        orderDetails[orderID] = order;
    }

    /**
      * @notice Settles two orders that are matched. `submitOrder` must have been
      * called for each order before this function is called.
      *
      * @param _buyID the 32 byte ID of the buy order
      * @param _sellID the 32 byte ID of the sell order
      */
    function submitMatch(bytes32 _buyID, bytes32 _sellID) public {
        require(orderStatus[_buyID] == OrderStatus.Submitted, "invalid buy status");
        require(orderStatus[_sellID] == OrderStatus.Submitted, "invalid sell status");

        require(SettlementUtils.verifyMatch(orderDetails[_buyID], orderDetails[_sellID]), "incompatible orders");

        require(orderbookContract.orderMatch(_buyID)[0] == _sellID, "invalid order pair");

        uint32 buyToken = uint32(orderDetails[_sellID].tokens);
        uint32 sellToken = uint32(orderDetails[_sellID].tokens >> 32);

        (address buyTokenAddress, uint8 buyTokenDecimals, RenExTokens.TokenStatus buyTokenStatus) = renExTokensContract.tokens(buyToken);
        (address sellTokenAddress, uint8 sellTokenDecimals, RenExTokens.TokenStatus sellTokenStatus) = renExTokensContract.tokens(sellToken);

        require(buyTokenStatus == RenExTokens.TokenStatus.Registered, "unregistered buy token");
        require(sellTokenStatus == RenExTokens.TokenStatus.Registered, "unregistered sell token");


        prepareMatchSettlement(_buyID, _sellID, buyToken, sellToken, buyTokenAddress, sellTokenAddress, buyTokenDecimals, sellTokenDecimals);

        // Note: verifyMatch checks that the buy and sell settlement IDs match
        uint32 settlementID = orderDetails[_buyID].settlementID;
        if (settlementID == RENEX_ATOMIC_SETTLEMENT_ID) {
            // Pay darknode fees
            payFees(_buyID, _sellID);
        } else if (settlementID == RENEX_SETTLEMENT_ID) {
            // Settle funds
            settleFunds(_buyID, _sellID);
        } else {
            revert("invalid settlement id");
        }

        orderStatus[_buyID] = OrderStatus.Matched;
        orderStatus[_sellID] = OrderStatus.Matched;
    }

    function prepareMatchSettlement(
        bytes32 _buyID, bytes32 _sellID,
        uint32 buyToken, uint32 sellToken,
        address buyTokenAddress, address sellTokenAddress,
        uint8 buyTokenDecimals, uint8 sellTokenDecimals
    ) private {
        // Verify details

        // uint256 priceN = orderDetails[_buyID].price + orderDetails[_sellID].price;
        // uint256 priceD = 2;

        (uint256 lowTokenVolume, uint256 highTokenVolume) = settlementDetails(
            orderDetails[_buyID].price + orderDetails[_sellID].price, /* priceN */
            2, /* priceD */
            orderDetails[_buyID].volume,
            orderDetails[_sellID].volume,
            buyTokenDecimals,
            sellTokenDecimals
        );
        
        bytes32 matchID = keccak256(abi.encodePacked(_buyID, _sellID));
        matchDetails[matchID] = MatchDetails({
            lowTokenVolume: lowTokenVolume,
            highTokenVolume: highTokenVolume,
            lowToken: sellToken,
            highToken: buyToken,
            lowTokenAddress: sellTokenAddress,
            highTokenAddress: buyTokenAddress
        });
    }

    function settlementDetails(
        uint256 _priceN,
        uint256 _priceD,
        uint256 _buyVolume,
        uint256 _sellVolume,
        uint8 _buyTokenDecimals,
        uint8 _sellTokenDecimals
    ) private pure returns (uint256, uint256) {
        uint256 minVolumeN;
        uint256 minVolumeQ;
        if (_buyVolume * (10**12) / (_priceN / _priceD) <= _sellVolume) {
            minVolumeN = _buyVolume * (10**12) * _priceD;
            minVolumeQ = _priceN;
        } else {
            minVolumeN = _sellVolume;
            minVolumeQ = 1;
        }

        uint256 lowTokenValue = joinFraction(minVolumeN * _priceN, minVolumeQ * _priceD, int16(_sellTokenDecimals) - 24);
        uint256 highTokenValue = joinFraction(minVolumeN, minVolumeQ, int16(_buyTokenDecimals) - 12);

        return (lowTokenValue, highTokenValue);
    }

    /** 
     * @notice Computes (numerator / denominator) * 10 ** scale
     */
    function joinFraction(uint256 numerator, uint256 denominator, int16 scale) private pure returns (uint256) {
        if (scale >= 0) {
            return numerator * 10 ** uint256(scale) / denominator;
        } else {
            return (numerator / denominator) / 10 ** uint256(-scale);
        }
    }

    /**
      * @notice Slashes the bond of a guilty trader. This is called when an atomic
      * swap is not executed successfully. The bond of the trader who caused the
      * swap to fail has their bond taken from them and split between the innocent
      * trader and the watchdog.
      *
      * @param _guiltyOrderID the 32 byte ID of the order of the guilty trader
      */
    function slash(
        bytes32 _guiltyOrderID
    ) public onlySlasher {
        require(orderDetails[_guiltyOrderID].settlementID == RENEX_ATOMIC_SETTLEMENT_ID, "slashing non-atomic trade");

        bytes32 innocentOrderID = orderbookContract.orderMatch(_guiltyOrderID)[0];
        bytes32 matchID;
        if (orderDetails[_guiltyOrderID].parity == uint8(OrderParity.Buy)) {
            matchID = keccak256(abi.encodePacked(_guiltyOrderID, innocentOrderID));
        } else {
            matchID = keccak256(abi.encodePacked(innocentOrderID, _guiltyOrderID));
        }
        require(slashedMatches[matchID] == false, "match already slashed");
        uint256 fee;
        address tokenAddress;
        if (isEthereumBased(matchDetails[matchID].highTokenAddress)) {
            tokenAddress = matchDetails[matchID].highTokenAddress;
            (,fee) = subtractDarknodeFee(matchDetails[matchID].highTokenVolume);
        } else if (isEthereumBased(matchDetails[matchID].lowTokenAddress)) {
            tokenAddress = matchDetails[matchID].lowTokenAddress;
            (,fee) = subtractDarknodeFee(matchDetails[matchID].lowTokenVolume);
        } else {
            revert("non-eth tokens");
        }
        slashedMatches[matchID] = true;
        renExBalancesContract.decrementBalanceWithFee(orderTrader[_guiltyOrderID], tokenAddress, fee, fee, slasherAddress);
        renExBalancesContract.incrementBalance(orderTrader[innocentOrderID], tokenAddress, fee);
    }

    function payFees(
        bytes32 _buyID, bytes32 _sellID
    ) private {
        bytes32 matchID = keccak256(abi.encodePacked(_buyID, _sellID));

        uint256 fee;
        address tokenAddress;
        if (isEthereumBased(matchDetails[matchID].highTokenAddress)) {
            tokenAddress = matchDetails[matchID].highTokenAddress;
            (,fee) = subtractDarknodeFee(matchDetails[matchID].highTokenVolume);
        } else if (isEthereumBased(matchDetails[matchID].lowTokenAddress)) {
            tokenAddress = matchDetails[matchID].lowTokenAddress;
            (,fee) = subtractDarknodeFee(matchDetails[matchID].lowTokenVolume);
        } else {
            return;
        }
        renExBalancesContract.decrementBalanceWithFee(orderTrader[_buyID], tokenAddress, 0, fee, orderSubmitter[_buyID]);
        renExBalancesContract.decrementBalanceWithFee(orderTrader[_sellID], tokenAddress, 0, fee, orderSubmitter[_sellID]);
    }

    /**
     * @notice (private) Calls the RenExBalances contract to update the balances
     */
    function settleFunds(
        bytes32 _buyID, bytes32 _sellID
    ) private {
        bytes32 matchID = keccak256(abi.encodePacked(_buyID, _sellID));

        (uint256 lowTokenFinal, uint256 lowTokenFee) = subtractDarknodeFee(matchDetails[matchID].lowTokenVolume);
        (uint256 highTokenFinal, uint256 highTokenFee) = subtractDarknodeFee(matchDetails[matchID].highTokenVolume);

        // Subtract values
        renExBalancesContract.decrementBalanceWithFee(
            orderTrader[_buyID], matchDetails[matchID].lowTokenAddress, lowTokenFinal, lowTokenFee, orderSubmitter[_buyID]
        );
        renExBalancesContract.decrementBalanceWithFee(
            orderTrader[_sellID], matchDetails[matchID].highTokenAddress, highTokenFinal, highTokenFee, orderSubmitter[_sellID]
        );

        // Add values
        renExBalancesContract.incrementBalance(orderTrader[_sellID], matchDetails[matchID].lowTokenAddress, lowTokenFinal);
        renExBalancesContract.incrementBalance(orderTrader[_buyID], matchDetails[matchID].highTokenAddress, highTokenFinal);
    }

    function isEthereumBased(address _tokenAddress) private pure returns (bool) {
        return (_tokenAddress != address(0x0));
    }

    function subtractDarknodeFee(uint256 value) internal pure returns (uint256, uint256) {
        uint256 newValue = (value * (DARKNODE_FEES_DENOMINATOR - DARKNODE_FEES_NUMERATOR)) / DARKNODE_FEES_DENOMINATOR;
        return (newValue, value - newValue);
    }

    function getMatchDetails(bytes32 _orderID) public view returns (bytes32, bytes32, uint256, uint256, uint32, uint32) {
        bytes32 matchingOrderID = orderbookContract.orderMatch(_orderID)[0];
        bytes32 matchID;
        MatchDetails memory details;
        if (orderDetails[_orderID].parity == uint8(OrderParity.Buy)) {
            matchID = keccak256(abi.encodePacked(_orderID, matchingOrderID));

            details = matchDetails[matchID];

            return (_orderID, matchingOrderID, details.highTokenVolume, details.lowTokenVolume, details.highToken, details.lowToken);
        } else {
            matchID = keccak256(abi.encodePacked(matchingOrderID, _orderID));

            details = matchDetails[matchID];

            return (_orderID, matchingOrderID, details.lowTokenVolume, details.highTokenVolume, details.lowToken, details.highToken);
        }
    }
}