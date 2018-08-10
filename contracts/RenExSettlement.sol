pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/math/Math.sol";

import "republic-sol/contracts/Orderbook.sol";
import "republic-sol/contracts/SettlementUtils.sol";

import "./RenExBalances.sol";
import "./RenExTokens.sol";

/// @notice RenExSettlement implements the Settlement interface. It implements
/// the on-chain settlement for the RenEx settlement layer, and the fee payment
/// for the RenExAtomic settlement layer.
contract RenExSettlement is Ownable {
    using SafeMath for uint256;

    // This contract handles the settlements with ID 1 and 2.
    uint32 constant public RENEX_SETTLEMENT_ID = 1;
    uint32 constant public RENEX_ATOMIC_SETTLEMENT_ID = 2;

    // Fees in RenEx are 0.2%. To represent this as integers, it is broken into
    // a numerator and denominator.
    uint256 constant public DARKNODE_FEES_NUMERATOR = 2;
    uint256 constant public DARKNODE_FEES_DENOMINATOR = 1000;

    // Constants used in the price / volume inputs.
    int16 constant private PRICE_OFFSET = 12;
    int16 constant private VOLUME_OFFSET = 12;

    // Constructor parameters, updatable by the owner
    Orderbook public orderbookContract;
    RenExTokens public renExTokensContract;
    RenExBalances public renExBalancesContract;
    address public slasherAddress;
    uint256 public submissionGasPriceLimit;

    enum OrderStatus {None, Submitted, Settled, Slashed}

    struct TokenPair {
        RenExTokens.TokenDetails priorityToken;
        RenExTokens.TokenDetails secondaryToken;
    }

    // A uint256 tuple representing a value and an associated fee
    struct ValueWithFees {
        uint256 value;
        uint256 fees;
    }

    // A uint256 tuple representing a fraction
    struct Fraction {
        uint256 numerator;
        uint256 denominator;
    }

    // We use left and right because the tokens do not always represent the
    // priority and secondary tokens.
    struct SettlementDetails {
        uint256 leftVolume;
        uint256 rightVolume;
        uint256 leftFee;
        uint256 rightFee;
        address leftAddress;
        address rightAddress;
    }

    // Events
    event LogOrderbookUpdated(Orderbook previousOrderbook, Orderbook nextOrderbook);
    event LogRenExTokensUpdated(RenExTokens previousRenExTokens, RenExTokens nextRenExTokens);
    event LogRenExBalancesUpdated(RenExBalances previousRenExBalances, RenExBalances nextRenExBalances);
    event LogSubmissionGasPriceLimitUpdated(uint256 previousSubmissionGasPriceLimit, uint256 nextSubmissionGasPriceLimit);
    event LogSlasherUpdated(address previousSlasher, address nextSlasher);

    // Order Storage
    mapping(bytes32 => SettlementUtils.OrderDetails) public orderDetails;
    mapping(bytes32 => address) public orderSubmitter;
    mapping(bytes32 => OrderStatus) public orderStatus;

    // Match storage (match details are indexed by [buyID][sellID])
    mapping(bytes32 => mapping(bytes32 => uint256)) public matchTimestamp;

    /// @notice Prevents a function from being called with a gas price higher
    /// than the specified limit.
    ///
    /// @param _gasPriceLimit The gas price upper-limit in Wei.
    modifier withGasPriceLimit(uint256 _gasPriceLimit) {
        require(tx.gasprice <= _gasPriceLimit, "gas price too high");
        _;
    }

    /// @notice Restricts a function to only being called by the slasher
    /// address.
    modifier onlySlasher() {
        require(msg.sender == slasherAddress, "unauthorised");
        _;
    }

    /// @param _orderbookContract The address of the Orderbook contract.
    /// @param _renExBalancesContract The address of the RenExBalances
    ///        contract.
    /// @param _renExTokensContract The address of the RenExTokens contract.
    constructor(
        Orderbook _orderbookContract,
        RenExTokens _renExTokensContract,
        RenExBalances _renExBalancesContract,
        address _slasherAddress,
        uint256 _submissionGasPriceLimit
    ) public {
        orderbookContract = _orderbookContract;
        renExTokensContract = _renExTokensContract;
        renExBalancesContract = _renExBalancesContract;
        slasherAddress = _slasherAddress;
        submissionGasPriceLimit = _submissionGasPriceLimit;
    }

    /// @notice The owner of the contract can update the Orderbook address.
    /// @param _newOrderbookContract The address of the new Orderbook contract.
    function updateOrderbook(Orderbook _newOrderbookContract) external onlyOwner {
        emit LogOrderbookUpdated(orderbookContract, _newOrderbookContract);
        orderbookContract = _newOrderbookContract;
    }

    /// @notice The owner of the contract can update the RenExTokens address.
    /// @param _newRenExTokensContract The address of the new RenExTokens
    ///       contract.
    function updateRenExTokens(RenExTokens _newRenExTokensContract) external onlyOwner {
        emit LogRenExTokensUpdated(renExTokensContract, _newRenExTokensContract);
        renExTokensContract = _newRenExTokensContract;
    }
    
    /// @notice The owner of the contract can update the RenExBalances address.
    /// @param _newRenExBalancesContract The address of the new RenExBalances
    ///       contract.
    function updateRenExBalances(RenExBalances _newRenExBalancesContract) external onlyOwner {
        emit LogRenExBalancesUpdated(renExBalancesContract, _newRenExBalancesContract);
        renExBalancesContract = _newRenExBalancesContract;
    }

    /// @notice The owner of the contract can update the order submission gas
    /// price limit.
    /// @param _newSubmissionGasPriceLimit The new gas price limit.
    function updateSubmissionGasPriceLimit(uint256 _newSubmissionGasPriceLimit) external onlyOwner {
        emit LogSubmissionGasPriceLimitUpdated(submissionGasPriceLimit, _newSubmissionGasPriceLimit);
        submissionGasPriceLimit = _newSubmissionGasPriceLimit;
    }

    /// @notice The owner of the contract can update the slasher address.
    /// @param _newSlasherAddress The new slasher address.
    function updateSlasher(address _newSlasherAddress) external onlyOwner {
        emit LogSlasherUpdated(slasherAddress, _newSlasherAddress);
        slasherAddress = _newSlasherAddress;
    }

    /// @notice Stores the details of an order.
    ///
    /// @param _prefix The miscellaneous details of the order required for
    ///        calculating the order id.
    /// @param _settlementID The settlement identifier.
    /// @param _tokens The encoding of the token pair (buy token is encoded as
    ///        the first 32 bytes and sell token is encoded as the last 32
    ///        bytes).
    /// @param _price The price of the order. Interpreted as the cost for 1
    ///        standard unit of the non-priority token, in 1e12 (i.e.
    ///        PRICE_OFFSET) units of the priority token).
    /// @param _volume The volume of the order. Intepreted as the maximum number
    ///        of 1e-12 (i.e. VOLUME_OFFSET) units of the non-priority token
    ///        that can be traded by this order.
    /// @param _minimumVolume The minimum volume the trader is willing to
    ///        accept. Encoded the same as the volume.
    function submitOrder(
        bytes _prefix,
        uint64 _settlementID,
        uint64 _tokens,
        uint256 _price,
        uint256 _volume,
        uint256 _minimumVolume
    ) external withGasPriceLimit(submissionGasPriceLimit) {

        SettlementUtils.OrderDetails memory order = SettlementUtils.OrderDetails({
            settlementID: _settlementID,
            tokens: _tokens,
            price: _price,
            volume: _volume,
            minimumVolume: _minimumVolume
        });
        bytes32 orderID = SettlementUtils.hashOrder(_prefix, order);

        require(orderStatus[orderID] == OrderStatus.None, "order already submitted");
        require(orderbookContract.orderState(orderID) == Orderbook.OrderState.Confirmed, "unconfirmed order");

        orderSubmitter[orderID] = msg.sender;
        orderStatus[orderID] = OrderStatus.Submitted;
        orderDetails[orderID] = order;
    }

    /// @notice Settles two orders that are matched. `submitOrder` must have been
    /// called for each order before this function is called.
    ///
    /// @param _buyID The 32 byte ID of the buy order.
    /// @param _sellID The 32 byte ID of the sell order.
    function submitMatch(bytes32 _buyID, bytes32 _sellID) external {
        require(orderStatus[_buyID] == OrderStatus.Submitted, "invalid buy status");
        require(orderStatus[_sellID] == OrderStatus.Submitted, "invalid sell status");

        // Check the settlement ID (only have to check for one, since
        // `verifyMatchDetails` checks that they are the same)
        require(
            orderDetails[_buyID].settlementID == RENEX_ATOMIC_SETTLEMENT_ID ||
            orderDetails[_buyID].settlementID == RENEX_SETTLEMENT_ID,
            "invalid settlement id"
        );

        // Verify that the two order details are compatible.
        require(SettlementUtils.verifyMatchDetails(orderDetails[_buyID], orderDetails[_sellID]), "incompatible orders");

        // Verify that the two orders have been confirmed to one another.
        require(orderbookContract.orderMatch(_buyID) == _sellID, "unconfirmed orders");

        // Retrieve token details.
        TokenPair memory tokens = getTokenDetails(orderDetails[_buyID].tokens);

        // Require that the tokens have been registered.
        require(tokens.priorityToken.registered, "unregistered priority token");
        require(tokens.secondaryToken.registered, "unregistered secondary token");

        address buyer = orderbookContract.orderTrader(_buyID);
        address seller = orderbookContract.orderTrader(_sellID);

        require(buyer != seller, "orders from same trader");

        execute(_buyID, _sellID, buyer, seller, tokens);

        matchTimestamp[_buyID][_sellID] = now;

        // Store that the orders have been settled.
        orderStatus[_buyID] = OrderStatus.Settled;
        orderStatus[_sellID] = OrderStatus.Settled;
    }

    /// @notice Slashes the bond of a guilty trader. This is called when an
    /// atomic swap is not executed successfully.
    /// To open an atomic order, a trader must have a balance equivalent to
    /// 0.6% of the trade in the Ethereum-based token. 0.2% is always paid in
    /// darknode fees when the order is matched. If the remaining amount is
    /// is slashed, it is distributed as follows:
    ///   1) 0.2% goes to the other trader, covering their fee
    ///   2) 0.2% goes to the slasher address
    /// Only one order in a match can be slashed.
    ///
    /// @param _guiltyOrderID The 32 byte ID of the order of the guilty trader.
    function slash(
        bytes32 _guiltyOrderID
    ) external onlySlasher {
        require(orderDetails[_guiltyOrderID].settlementID == RENEX_ATOMIC_SETTLEMENT_ID, "slashing non-atomic trade");

        bytes32 innocentOrderID = orderbookContract.orderMatch(_guiltyOrderID);

        require(orderStatus[_guiltyOrderID] == OrderStatus.Settled, "invalid order status");
        require(orderStatus[innocentOrderID] == OrderStatus.Settled, "invalid order status");
        orderStatus[_guiltyOrderID] = OrderStatus.Slashed;

        (bytes32 buyID, bytes32 sellID) = isBuyOrder(_guiltyOrderID) ?
            (_guiltyOrderID, innocentOrderID) : (innocentOrderID, _guiltyOrderID);

        TokenPair memory tokens = getTokenDetails(orderDetails[buyID].tokens);

        SettlementDetails memory settlementDetails = calculateAtomicFees(buyID, sellID, tokens);

        // Transfer the fee amount to the other trader and to the slasher.
        renExBalancesContract.transferBalanceWithFee(
            orderbookContract.orderTrader(_guiltyOrderID),
            orderbookContract.orderTrader(innocentOrderID),
            settlementDetails.leftAddress,
            settlementDetails.leftFee,
            settlementDetails.leftFee,
            slasherAddress
        );
    }

    /// @notice Retrieves the settlement details of an order.
    /// For atomic swaps, it returns the full volumes, not the settled fees.
    ///
    /// @param _orderID The order to lookup the details of. Can be the ID of a
    ///        buy or a sell order.
    /// @return [
    ///     a boolean representing whether or not the order has been settled,
    ///     the volume of the priority token,
    ///     the volume of the secondary token,
    ///     the fee paid in the priority token,
    ///     the fee paid in the secondary token,
    ///     the address of the priority token,
    ///     the address of the secondary token
    /// ]
    function getMatchDetails(bytes32 _orderID)
    external view returns (
        bool settled,
        uint256 priorityVolume,
        uint256 secondaryVolume,
        uint256 priorityFee,
        uint256 secondaryFee,
        address priorityAddress,
        address secondaryAddress
    ) {
        bytes32 matchedID = orderbookContract.orderMatch(_orderID);

        (bytes32 buyID, bytes32 sellID) = isBuyOrder(_orderID) ?
            (_orderID, matchedID) : (matchedID, _orderID);

        TokenPair memory tokens = getTokenDetails(orderDetails[buyID].tokens);

        SettlementDetails memory settlementDetails = calculateSettlementDetails(buyID, sellID, tokens);

        return (
            orderStatus[_orderID] == OrderStatus.Settled || orderStatus[_orderID] == OrderStatus.Slashed,
            settlementDetails.leftVolume,
            settlementDetails.rightVolume,
            settlementDetails.leftFee,
            settlementDetails.rightFee,
            settlementDetails.leftAddress,
            settlementDetails.rightAddress
        );
    }

    /// @notice Exposes the hashOrder function for computing a hash of an
    /// order's details. An order hash is used as its ID. See `submitOrder`
    /// for the paramater descriptions.
    ///
    /// @return The 32-byte hash of the order.
    function hashOrder(
        bytes _prefix,
        uint64 _settlementID,
        uint64 _tokens,
        uint256 _price,
        uint256 _volume,
        uint256 _minimumVolume
    ) external pure returns (bytes32) {
        return SettlementUtils.hashOrder(_prefix, SettlementUtils.OrderDetails({
            settlementID: _settlementID,
            tokens: _tokens,
            price: _price,
            volume: _volume,
            minimumVolume: _minimumVolume
        }));
    }

    /// @notice Called by `settle`, executes the settlement for a RenEx order
    /// or distributes the fees for a RenExAtomic swap.
    ///
    /// @param _buyID The 32 byte ID of the buy order.
    /// @param _sellID The 32 byte ID of the sell order.
    /// @param _buyer The address of the buy trader.
    /// @param _seller The address of the sell trader.
    /// @param _tokens The details of the priority and secondary tokens.
    function execute(
        bytes32 _buyID, bytes32 _sellID, address _buyer, address _seller, TokenPair memory _tokens
    ) private {
        // Calculate the fees for atomic swaps, and the settlement details
        // otherwise.
        SettlementDetails memory settlementDetails = (orderDetails[_buyID].settlementID == RENEX_ATOMIC_SETTLEMENT_ID) ?
            settlementDetails = calculateAtomicFees(_buyID, _sellID, _tokens) :
            settlementDetails = calculateSettlementDetails(_buyID, _sellID, _tokens);

        // Transfer priority token value
        renExBalancesContract.transferBalanceWithFee(
            _buyer,
            _seller,
            settlementDetails.leftAddress,
            settlementDetails.leftVolume,
            settlementDetails.leftFee,
            orderSubmitter[_buyID]
        );

        // Transfer secondary token value
        renExBalancesContract.transferBalanceWithFee(
            _seller,
            _buyer,
            settlementDetails.rightAddress,
            settlementDetails.rightVolume,
            settlementDetails.rightFee,
            orderSubmitter[_sellID]
        );
    }

    /// @notice Calculates the details required to execute two matched orders.
    ///
    /// @param _buyID The 32 byte ID of the buy order.
    /// @param _sellID The 32 byte ID of the sell order.
    /// @param _tokens The details of the priority and secondary tokens.
    /// @return A struct containing the settlement details.
    function calculateSettlementDetails(
        bytes32 _buyID, bytes32 _sellID, TokenPair memory _tokens
    ) private view returns (SettlementDetails memory) {

        // Calculate the midprice (using numerator and denominator to not loose
        // precision).
        Fraction memory midPrice = Fraction(orderDetails[_buyID].price + orderDetails[_sellID].price, 2);

        // Calculate the lower of the two max volumes of each trader
        uint256 commonVolume = Math.min256(orderDetails[_buyID].volume, orderDetails[_sellID].volume);

        uint256 priorityTokenVolume = joinFraction(
            commonVolume.mul(midPrice.numerator),
            midPrice.denominator,
            int16(_tokens.priorityToken.decimals) - PRICE_OFFSET - VOLUME_OFFSET
        );
        uint256 secondaryTokenVolume = joinFraction(
            commonVolume,
            1,
            int16(_tokens.secondaryToken.decimals) - VOLUME_OFFSET
        );

        // Calculate darknode fees
        ValueWithFees memory priorityVwF = subtractDarknodeFee(priorityTokenVolume);
        ValueWithFees memory secondaryVwF = subtractDarknodeFee(secondaryTokenVolume);

        return SettlementDetails({
            leftVolume: priorityVwF.value,
            rightVolume: secondaryVwF.value,
            leftFee: priorityVwF.fees,
            rightFee: secondaryVwF.fees,
            leftAddress: _tokens.priorityToken.addr,
            rightAddress: _tokens.secondaryToken.addr
        });
    }

    /// @notice Calculates the fees to be transferred for an atomic swap.
    ///
    /// @param _buyID The 32 byte ID of the buy order.
    /// @param _sellID The 32 byte ID of the sell order.
    /// @param _tokens The details of the priority and secondary tokens.
    /// @return A struct containing the fee details.
    function calculateAtomicFees(
        bytes32 _buyID, bytes32 _sellID, TokenPair memory tokens
    ) private view returns (SettlementDetails memory) {

        // Calculate the midprice (using numerator and denominator to not loose
        // precision).
        Fraction memory midPrice = Fraction(orderDetails[_buyID].price + orderDetails[_sellID].price, 2);

        // Calculate the lower of the two max volumes of each trader
        uint256 commonVolume = Math.min256(orderDetails[_buyID].volume, orderDetails[_sellID].volume);

        if (isEthereumBased(tokens.secondaryToken.addr)) {
            uint256 secondaryTokenVolume = joinFraction(
                commonVolume,
                1,
                int16(tokens.secondaryToken.decimals) - VOLUME_OFFSET
            );

            // Calculate darknode fees
            ValueWithFees memory secondaryVwF = subtractDarknodeFee(secondaryTokenVolume);

            return SettlementDetails({
                leftVolume: 0,
                rightVolume: 0,
                leftFee: secondaryVwF.fees,
                rightFee: secondaryVwF.fees,
                leftAddress: tokens.secondaryToken.addr,
                rightAddress: tokens.secondaryToken.addr
            });
        } else if (isEthereumBased(tokens.priorityToken.addr)) {
            uint256 priorityTokenVolume = joinFraction(
                commonVolume.mul(midPrice.numerator),
                midPrice.denominator,
                int16(tokens.priorityToken.decimals) - PRICE_OFFSET - VOLUME_OFFSET
            );

            // Calculate darknode fees
            ValueWithFees memory priorityVwF = subtractDarknodeFee(priorityTokenVolume);

            return SettlementDetails({
                leftVolume: 0,
                rightVolume: 0,
                leftFee: priorityVwF.fees,
                rightFee: priorityVwF.fees,
                leftAddress: tokens.priorityToken.addr,
                rightAddress: tokens.priorityToken.addr
            });
        } else {
            // Currently, at least one token must be Ethereum-based.
            // This will be implemented in the future.
            revert("non-eth atomic swaps are not supported");
        }
    }

    /// @notice Order parity is set by the order tokens are listed. This returns
    /// whether an order is a buy or a sell.
    /// @return true if _orderID is a buy order.
    function isBuyOrder(bytes32 _orderID) private view returns (bool) {
        uint64 tokens = orderDetails[_orderID].tokens;
        uint32 firstToken = uint32(tokens >> 32);
        uint32 secondaryToken = uint32(tokens);
        return (firstToken < secondaryToken);
    }

    /// @return (value - fee, fee) where fee is 0.2% of value
    function subtractDarknodeFee(uint256 value) private pure returns (ValueWithFees memory) {
        uint256 newValue = (value * (DARKNODE_FEES_DENOMINATOR - DARKNODE_FEES_NUMERATOR)) / DARKNODE_FEES_DENOMINATOR;
        return ValueWithFees(newValue, value - newValue);
    }

    /// @notice Gets the order details of the priority and secondary token from
    /// the RenExTokens contract and returns them as a single struct.
    ///
    /// @param tokens The 64-bit combined token identifiers.
    /// @return A TokenPair struct containing two TokenDedetails structs.
    function getTokenDetails(uint64 tokens) private view returns (TokenPair memory) {
        (
            address priorityAddress,
            uint8 priorityDecimals,
            bool priorityRegistered
        ) = renExTokensContract.tokens(uint32(tokens >> 32));

        (
            address secondaryAddress,
            uint8 secondaryDecimals,
            bool secondaryRegistered
        ) = renExTokensContract.tokens(uint32(tokens));

        return TokenPair({
            priorityToken: RenExTokens.TokenDetails(priorityAddress, priorityDecimals, priorityRegistered),
            secondaryToken: RenExTokens.TokenDetails(secondaryAddress, secondaryDecimals, secondaryRegistered)
        });
    }

    /// @return true if _tokenAddress is 0x0, representing a token that is not
    /// on Ethereum
    function isEthereumBased(address _tokenAddress) private pure returns (bool) {
        return (_tokenAddress != address(0x0));
    }

    /// @notice Computes (numerator / denominator) * 10 ** scale
    function joinFraction(uint256 numerator, uint256 denominator, int16 scale) private pure returns (uint256) {
        if (scale >= 0) {
            // Check that (10**scale) doesn't overflow
            assert(scale <= 77); // log10(2**256) = 77.06
            return numerator.mul(10 ** uint256(scale)) / denominator;
        } else {
            /// @dev If scale is less than -77, 10**-scale would overflow.
            // For now, -scale > -24 (when a token has 0 decimals and
            // VOLUME_OFFSET and PRICE_OFFSET are each 12). It is unlikely these
            // will be increased to add to more than 77.
            // assert((-scale) <= 77); // log10(2**256) = 77.06
            return (numerator / denominator) / 10 ** uint256(-scale);
        }
    }
}