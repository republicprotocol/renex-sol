pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "republic-sol/contracts/Orderbook.sol";
import "republic-sol/contracts/SettlementUtils.sol";

import "./RenExBalances.sol";
import "./RenExTokens.sol";

/// @notice The contract responsible for holding trader funds and settling matched
/// order values.
contract RenExSettlement is Ownable {
    using SafeMath for uint256;

    address public slasherAddress;

    /// @notice Fees are in RenEx are 0.2% and to represent this in integers it
    /// is broken into a numerator and denominator.
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

    struct MatchDetails {
        uint256 lowTokenVolume;
        uint256 highTokenVolume;
        uint32 lowToken;
        uint32 highToken;
        address lowTokenAddress;
        address highTokenAddress;
        uint256 timestamp;
    }

    // Events
    // event OrderbookUpdated(Orderbook previousOrderbook, Orderbook nextOrderbook);
    // event RenExBalancesUpdated(RenExBalances previousRenExBalances, RenExBalances nextRenExBalances);
    // event SubmissionGasPriceLimitUpdated(uint256 previousSubmissionGasPriceLimit, uint256 nextSubmissionGasPriceLimit);

    // Order Storage
    mapping(bytes32 => SettlementUtils.OrderDetails) public orderDetails;
    mapping(bytes32 => address) public orderTrader;
    mapping(bytes32 => address) public orderSubmitter;
    mapping(bytes32 => bool) public orderSubmitted;

    // Match storage
    mapping(bytes32 => mapping(bytes32 => MatchDetails)) public matchDetails;
    mapping(bytes32 => mapping(bytes32 => bool)) public matchSettled;

    // Slasher storage
    mapping(bytes32 => mapping(bytes32 => bool)) public matchSlashed;

    /// @notice constructor
    ///
    /// @param _orderbookContract The address of the Orderbook contract.
    /// @param _renExBalancesContract The address of the RenExBalances
    ///        contract.
    /// @param _renExTokensContract The address of the RenExTokens contract.
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

    modifier withGasPriceLimit(uint256 gasPriceLimit) {
        require(tx.gasprice <= gasPriceLimit, "gas price too high");
        _;
    }

    modifier onlySlasher() {
        require(msg.sender == slasherAddress, "unauthorised");
        _;
    }

    function traderCanWithdraw(address _trader, address _token, uint256 _amount) public returns (bool) {
        // In the future, this will return false (i.e. invalid withdrawal) if the
        // trader has open orders for that token
        return true;
    }

    /// @notice Stores the details of an order
    ///
    /// @param _details miscellaneous details 
    /// @param _settlementID id of the settlement
    /// @param _tokens two 32-bit token codes concatenated (with the lowest first)
    /// @param _price the order price
    /// @param _volume the order volume
    /// @param _minimumVolume the order minimum volume
    function submitOrder(
        bytes _details,
        uint64 _settlementID,
        uint64 _tokens,
        uint256 _price,
        uint256 _volume,
        uint256 _minimumVolume
    ) public withGasPriceLimit(submissionGasPriceLimit) {
        SettlementUtils.OrderDetails memory order = SettlementUtils.OrderDetails({
            details: _details,
            settlementID: _settlementID,
            tokens: _tokens,
            price: _price,
            volume: _volume,
            minimumVolume: _minimumVolume
        });

        bytes32 orderID = SettlementUtils.hashOrder(order);
        orderSubmitter[orderID] = msg.sender;

        require(!orderSubmitted[orderID], "order already submitted");
        orderSubmitted[orderID] = true;
        require(orderbookContract.orderState(orderID) == Orderbook.OrderState.Confirmed, "uncofirmed order");

        orderTrader[orderID] = orderbookContract.orderTrader(orderID);
        orderDetails[orderID] = order;
    }

    /// @notice Settles two orders that are matched. `submitOrder` must have been
    /// called for each order before this function is called.
    ///
    /// @param _buyID the 32 byte ID of the buy order
    /// @param _sellID the 32 byte ID of the sell order
    function submitMatch(bytes32 _buyID, bytes32 _sellID) public {
        require(orderSubmitted[_buyID], "buy not submitted");
        require(orderSubmitted[_sellID], "sell not submitted");
        require(!matchSettled[_buyID][_sellID], "match already submitted");

        // Verify that the two orders should have been matched
        require(SettlementUtils.verifyMatchDetails(orderDetails[_buyID], orderDetails[_sellID]), "incompatible orders");

        // Verify that the two orders have been confirmed to one another
        require(SettlementUtils.verifyOrderPair(orderbookContract, _buyID, _sellID), "unconfirmed orders");

        // Verify that the order traders are distinct
        require(orderbookContract.orderTrader(_buyID) != orderbookContract.orderTrader(_sellID), "orders from same trader");

        // Verify that the buy's tokens represent a buy order
        require(isBuyOrder(_buyID), "not a buy order");

        // Calculate token codes
        uint32 buyToken = uint32(orderDetails[_sellID].tokens);
        uint32 sellToken = uint32(orderDetails[_sellID].tokens >> 32);

        // Retrieve token details
        (address buyTokenAddress, uint8 buyTokenDecimals, RenExTokens.TokenStatus buyTokenStatus) = renExTokensContract.tokens(buyToken);
        (address sellTokenAddress, uint8 sellTokenDecimals, RenExTokens.TokenStatus sellTokenStatus) = renExTokensContract.tokens(sellToken);

        // Require that the tokens have been registered
        require(buyTokenStatus == RenExTokens.TokenStatus.Registered, "unregistered buy token");
        require(sellTokenStatus == RenExTokens.TokenStatus.Registered, "unregistered sell token");

        // Calculate and store settlement details
        prepareMatchSettlement(_buyID, _sellID, buyToken, sellToken, buyTokenAddress, sellTokenAddress, buyTokenDecimals, sellTokenDecimals);

        // Note: verifyMatch checks that the buy and sell settlement IDs match
        uint64 settlementID = orderDetails[_buyID].settlementID;
        if (settlementID == RENEX_ATOMIC_SETTLEMENT_ID) {
            // Pay darknode fees
            payFees(_buyID, _sellID);
        } else if (settlementID == RENEX_SETTLEMENT_ID) {
            // Settle funds
            settleFunds(_buyID, _sellID);
        } else {
            revert("invalid settlement id");
        }

        // Note: slash() relies on matchSettled[_sellID][_buyID] not being set
        matchSettled[_buyID][_sellID] = true;
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
        
        matchDetails[_buyID][_sellID] = MatchDetails({
            lowTokenVolume: lowTokenVolume,
            highTokenVolume: highTokenVolume,
            lowToken: sellToken,
            highToken: buyToken,
            lowTokenAddress: sellTokenAddress,
            highTokenAddress: buyTokenAddress,
            timestamp: now
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

    /// @notice Computes (numerator / denominator) * 10 ** scale
    function joinFraction(uint256 numerator, uint256 denominator, int16 scale) private pure returns (uint256) {
        if (scale >= 0) {
            return numerator * 10 ** uint256(scale) / denominator;
        } else {
            return (numerator / denominator) / 10 ** uint256(-scale);
        }
    }

    /// @notice Slashes the bond of a guilty trader. This is called when an atomic
    /// swap is not executed successfully. The bond of the trader who caused the
    /// swap to fail has their bond taken from them and split between the innocent
    /// trader and the watchdog.
    ///
    /// @param _buyID The order ID of the buy order.
    /// @param _sellID The order ID of the buy order.
    /// @param _buyerGuilty True if the buyer is guilty, false if the seller is
    ///        guilty.
    function slash(
        bytes32 _buyID, bytes32 _sellID, bool _buyerGuilty
    ) public onlySlasher {

        // Must be atomic swap
        require(orderDetails[_buyID].settlementID == RENEX_ATOMIC_SETTLEMENT_ID, "slashing non-atomic trade");

        // Must not have already been swapped
        require(matchSlashed[_buyID][_sellID] == false, "match already slashed");

        // Match must have been submitted/settled
        // We don't have to check isBuyOrder(_buyID) because otherwise the next
        // step would fail.
        require(matchSettled[_buyID][_sellID], "match not submitted");

        MatchDetails memory details = matchDetails[_buyID][_sellID];        

        uint256 fee;
        address tokenAddress;
        if (isEthereumBased(details.highTokenAddress)) {
            tokenAddress = details.highTokenAddress;
            (,fee) = subtractDarknodeFee(details.highTokenVolume);
        } else if (isEthereumBased(details.lowTokenAddress)) {
            tokenAddress = details.lowTokenAddress;
            (,fee) = subtractDarknodeFee(details.lowTokenVolume);
        } else {
            revert("non-eth tokens");
        }

        // Remember that this trade has been submitted
        matchSlashed[_buyID][_sellID] = true;

        // Get the order ID of the guilty trader
        bytes32 guiltyID;
        bytes32 innocentID;
        if (_buyerGuilty) {
            guiltyID = _buyID;
            innocentID = _sellID;
        } else {
            guiltyID = _sellID;
            innocentID = _buyID;
        }

        // Punish guilty trader        
        renExBalancesContract.decrementBalanceWithFee(orderTrader[guiltyID], tokenAddress, fee, fee, slasherAddress);
        renExBalancesContract.incrementBalance(orderTrader[innocentID], tokenAddress, fee);
    }

    function payFees(
        bytes32 _buyID, bytes32 _sellID
    ) private {
        MatchDetails memory details = matchDetails[_buyID][_sellID];

        uint256 fee;
        address tokenAddress;
        if (isEthereumBased(details.highTokenAddress)) {
            tokenAddress = details.highTokenAddress;
            (,fee) = subtractDarknodeFee(details.highTokenVolume);
        } else if (isEthereumBased(details.lowTokenAddress)) {
            tokenAddress = details.lowTokenAddress;
            (,fee) = subtractDarknodeFee(details.lowTokenVolume);
        } else {
            return;
        }
        renExBalancesContract.decrementBalanceWithFee(orderTrader[_buyID], tokenAddress, 0, fee, orderSubmitter[_buyID]);
        renExBalancesContract.decrementBalanceWithFee(orderTrader[_sellID], tokenAddress, 0, fee, orderSubmitter[_sellID]);
    }

    /// @notice (private) Calls the RenExBalances contract to update the balances
    function settleFunds(
        bytes32 _buyID, bytes32 _sellID
    ) private {
        MatchDetails memory details = matchDetails[_buyID][_sellID];
        
        (uint256 lowTokenFinal, uint256 lowTokenFee) = subtractDarknodeFee(details.lowTokenVolume);
        (uint256 highTokenFinal, uint256 highTokenFee) = subtractDarknodeFee(details.highTokenVolume);

        // Subtract values
        renExBalancesContract.decrementBalanceWithFee(
            orderTrader[_buyID], details.lowTokenAddress, lowTokenFinal, lowTokenFee, orderSubmitter[_buyID]
        );
        renExBalancesContract.decrementBalanceWithFee(
            orderTrader[_sellID], details.highTokenAddress, highTokenFinal, highTokenFee, orderSubmitter[_sellID]
        );

        // Add values
        renExBalancesContract.incrementBalance(orderTrader[_sellID], details.lowTokenAddress, lowTokenFinal);
        renExBalancesContract.incrementBalance(orderTrader[_buyID], details.highTokenAddress, highTokenFinal);
    }

    function isEthereumBased(address _tokenAddress) private pure returns (bool) {
        return (_tokenAddress != address(0x0));
    }

    function subtractDarknodeFee(uint256 value) internal pure returns (uint256, uint256) {
        uint256 newValue = (value * (DARKNODE_FEES_DENOMINATOR - DARKNODE_FEES_NUMERATOR)) / DARKNODE_FEES_DENOMINATOR;
        return (newValue, value - newValue);
    }

    function isBuyOrder(bytes32 _orderID) internal view returns (bool) {
        uint64 tokens = orderDetails[_orderID].tokens;
        uint32 firstToken = uint32(tokens >> 32);
        uint32 secondToken = uint32(tokens);
        return (firstToken < secondToken);
    }

    function hashOrder(
        bytes _details,
        uint64 _settlementID,
        uint64 _tokens,
        uint256 _price,
        uint256 _volume,
        uint256 _minimumVolume
    ) external pure returns (bytes32) {
        return SettlementUtils.hashOrder(SettlementUtils.OrderDetails({
            details: _details,
            settlementID: _settlementID,
            tokens: _tokens,
            price: _price,
            volume: _volume,
            minimumVolume: _minimumVolume
        }));
    }
}