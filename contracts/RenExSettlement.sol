pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "republic-sol/contracts/Orderbook.sol";
import "republic-sol/contracts/SettlementUtils.sol";

import "./RenExBalances.sol";
import "./RenExTokens.sol";

/// @notice RenExSettlement is responsible for holding trader funds and settling
/// matched order values.
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

    event LogOrderbookUpdated(Orderbook previousOrderbook, Orderbook nextOrderbook);
    event LogRenExBalancesUpdated(RenExBalances previousRenExBalances, RenExBalances nextRenExBalances);
    event LogSubmissionGasPriceLimitUpdated(uint256 previousSubmissionGasPriceLimit, uint256 nextSubmissionGasPriceLimit);
    event LogSlasherUpdated(address previousSlasher, address nextSlasher);

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

    modifier withGasPriceLimit(uint256 gasPriceLimit) {
        require(tx.gasprice <= gasPriceLimit, "gas price too high");
        _;
    }

    modifier onlySlasher() {
        require(msg.sender == slasherAddress, "unauthorised");
        _;
    }

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

    /// @notice The of the contract can update the Orderbook address.
    /// @param _newOrderbookContract The address of the new Orderbook contract.
    function updateOrderbook(Orderbook _newOrderbookContract) external onlyOwner {
        emit LogOrderbookUpdated(orderbookContract, _newOrderbookContract);
        orderbookContract = _newOrderbookContract;
    }

    /// @notice The owner of the contract can update the RenExBalances address.
    /// @param _newRenExBalancesContract The address of the new RenExBalances contract.
    function updateRenExBalances(RenExBalances _newRenExBalancesContract) external onlyOwner {
        emit LogRenExBalancesUpdated(renExBalancesContract, _newRenExBalancesContract);
        renExBalancesContract = _newRenExBalancesContract;
    }
    
    /// @notice The owner of the contract can update the submission gas price limit.
    /// @param _newSubmissionGasPriceLimit The new gas price limit.
    function updateSubmissionGasPriceLimit(uint256 _newSubmissionGasPriceLimit) external onlyOwner {
        emit LogSubmissionGasPriceLimitUpdated(submissionGasPriceLimit, _newSubmissionGasPriceLimit);
        submissionGasPriceLimit = _newSubmissionGasPriceLimit;
    }

    function updateSlasher(address _newSlasherAddress) external onlyOwner {
        emit LogSlasherUpdated(slasherAddress, _newSlasherAddress);
        slasherAddress = _newSlasherAddress;
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
    ) external withGasPriceLimit(submissionGasPriceLimit) {
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
    function submitMatch(bytes32 _buyID, bytes32 _sellID) external {
        require(orderSubmitted[_buyID], "buy not submitted");
        require(orderSubmitted[_sellID], "sell not submitted");
        require(!matchSettled[_buyID][_sellID], "match already submitted");

        // Verify that the two orders should have been matched
        require(SettlementUtils.verifyMatchDetails(orderDetails[_buyID], orderDetails[_sellID]), "incompatible orders");

        // Verify that the two orders have been confirmed to one another
        require(orderbookContract.orderMatch(_buyID) == _sellID, "unconfirmed orders");

        // Verify that the order traders are distinct
        require(orderbookContract.orderTrader(_buyID) != orderbookContract.orderTrader(_sellID), "orders from same trader");

        // Verify that the buy's tokens represent a buy order
        require(isBuyOrder(_buyID), "not a buy order");

        // Calculate token codes
        uint32 buyToken = uint32(orderDetails[_buyID].tokens);
        uint32 sellToken = uint32(orderDetails[_buyID].tokens >> 32);

        // Retrieve token details
        (address buyTokenAddress, uint8 buyTokenDecimals, bool buyTokenRegistered) = renExTokensContract.tokens(buyToken);
        (address sellTokenAddress, uint8 sellTokenDecimals, bool sellTokenRegistered) = renExTokensContract.tokens(sellToken);

        // Require that the tokens have been registered
        require(buyTokenRegistered, "unregistered buy token");
        require(sellTokenRegistered, "unregistered sell token");

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

    /// @notice Slashes the bond of the buy trader. This is called when an atomic
    /// swap is not executed successfully. The bond of the trader who caused the
    /// swap to fail has their bond taken from them and split between the innocent
    /// trader and the watchdog.
    ///
    /// @param _buyID The order ID of the buy order.
    /// @param _sellID The order ID of the buy order.
    ///        guilty.
    function slashBuyer(
        bytes32 _buyID, bytes32 _sellID
    ) external onlySlasher {
        slash(_buyID, _sellID, true);
    }

    /// @notice See `slashBuyer`
    function slashSeller(
        bytes32 _buyID, bytes32 _sellID
    ) external onlySlasher {
        slash(_buyID, _sellID, true);
    }

    /// @notice Calculates the hash of the provided order.
    ///
    /// @param _prefix The miscellaneous details of the order required for 
    ///        calculating the order id.
    /// @param _settlement The settlement identifier.
    /// @param _tokens The encoding of the token pair (buy token is encoded as
    ///        the first 32 bytes and sell token is encoded as the last 32 
    ///        bytes).
    /// @param _price The price of the order (the price is interpreted as the 
    ///        cost for 1 standard unit of the priority token, in 1e-12 units
    ///        of the non-priority token).
    /// @param _volume The volume of the order (The volume is interpreted as 
    ///        the maximum number of 1e-12 units of the sell token that can 
    ///        be traded by this order.)
    /// @param _minimumVolume The minimum volume the trader is willing to 
    ///        accept (It's encoding is the same as that of the volume).
    ///
    /// @return Hash of the order.
    function hashOrder(
        bytes _prefix,
        uint64 _settlement,
        uint64 _tokens,
        uint256 _price,
        uint256 _volume,
        uint256 _minimumVolume
    ) external pure returns (bytes32) {
        return SettlementUtils.hashOrder(SettlementUtils.OrderDetails({
            details: _prefix,
            settlementID: _settlement,
            tokens: _tokens,
            price: _price,
            volume: _volume,
            minimumVolume: _minimumVolume
        }));
    }

    /// @notice Settles the order match by updating the balances on the 
    /// RenExBalances contract.
    ///
    /// @param _buyID The buy order ID.
    /// @param _sellID The sell order ID.
    function settleFunds(
        bytes32 _buyID, bytes32 _sellID
    ) private {
        MatchDetails memory details = matchDetails[_buyID][_sellID];
        
        (uint256 lowTokenFinal, uint256 lowTokenFee) = subtractDarknodeFee(details.lowTokenVolume);
        (uint256 highTokenFinal, uint256 highTokenFee) = subtractDarknodeFee(details.highTokenVolume);

        // Transfer values
        renExBalancesContract.transferBalanceWithFee(
            orderTrader[_buyID], orderTrader[_sellID], details.lowTokenAddress, lowTokenFinal, lowTokenFee, orderSubmitter[_buyID]
        );
        renExBalancesContract.transferBalanceWithFee(
            orderTrader[_sellID], orderTrader[_buyID], details.highTokenAddress, highTokenFinal, highTokenFee, orderSubmitter[_sellID]
        );
    }

    /// @notice Settles the order match by updating the balances on the 
    /// RenExBalances contract.
    ///
    /// @param _buyID The buy order ID.
    /// @param _sellID The sell order ID.
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

    function payFees(
        bytes32 _buyID, bytes32 _sellID
    ) private {
        MatchDetails memory details = matchDetails[_buyID][_sellID];

        uint256 fee;
        address tokenAddress;
        if (isEthereumBased(details.highTokenAddress)) {
            tokenAddress = details.highTokenAddress;
            (, fee) = subtractDarknodeFee(details.highTokenVolume);
        } else if (isEthereumBased(details.lowTokenAddress)) {
            tokenAddress = details.lowTokenAddress;
            (, fee) = subtractDarknodeFee(details.lowTokenVolume);
        } else {
            return;
        }
        renExBalancesContract.transferBalanceWithFee(orderTrader[_buyID], 0x0, tokenAddress, 0, fee, orderSubmitter[_buyID]);
        renExBalancesContract.transferBalanceWithFee(orderTrader[_sellID], 0x0, tokenAddress, 0, fee, orderSubmitter[_sellID]);
    }

    function isBuyOrder(bytes32 _orderID) private view returns (bool) {
        uint64 tokens = orderDetails[_orderID].tokens;
        uint32 firstToken = uint32(tokens >> 32);
        uint32 secondToken = uint32(tokens);
        return (firstToken < secondToken);
    }

    function subtractDarknodeFee(uint256 value) private pure returns (uint256, uint256) {
        uint256 newValue = (value * (DARKNODE_FEES_DENOMINATOR - DARKNODE_FEES_NUMERATOR)) / DARKNODE_FEES_DENOMINATOR;
        return (newValue, value - newValue);
    }

    function isEthereumBased(address _tokenAddress) private pure returns (bool) {
        return (_tokenAddress != address(0x0));
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

    /// @notice See `slashBuyer`.
    /// @param _buyerGuilty True if the buyer should be punished, false for the
    ///        seller.
    function slash(
        bytes32 _buyID, bytes32 _sellID, bool _buyerGuilty
    ) private onlySlasher {
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
        renExBalancesContract.transferBalanceWithFee(orderTrader[guiltyID], orderTrader[innocentID], tokenAddress, fee, fee, slasherAddress);
    }
}