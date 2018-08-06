pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "republic-sol/contracts/Orderbook.sol";

/// @notice RenExAtomicInfo is a way for two traders performing an atomic swap
/// to transmit data to one another.
/// Traders are able to authorise other addresses to transmit data for their
/// trades, allowing traders to open orders with one wallet (e.g. Metamask) and
/// perform the trade with another (e.g. the keystore used by Swapper)
contract RenExAtomicInfo is Ownable {

    Orderbook public orderbookContract;

    // Events
    event LogOrderbookUpdated(Orderbook previousOrderbook, Orderbook nextOrderbook);

    // Storage
    mapping (address => mapping (address => bool)) public authorisedSwapper;
    mapping (bytes32 => bytes) public getOwnerAddress;
    mapping (bytes32 => uint256) public ownerAddressTimestamp;
    mapping (bytes32 => bytes) public swapDetails;
    mapping (bytes32 => uint256) public swapDetailsTimestamp;

    /// @notice Restricts a function to only be called by an address that has
    /// been authorised by the trader who submitted the order, or by the trader
    /// themselves.
    ///
    /// @param _orderID The id of the order
    /// @param _swapper The address of the swapper
    modifier onlyAuthorisedSwapper(bytes32 _orderID, address _swapper) {
        address trader = orderbookContract.orderTrader(_orderID);
        require(_swapper == trader || authorisedSwapper[trader][_swapper], "not authorised");
        _;
    }

    /// @param _orderbookContract The address of the Orderbook contract.
    constructor(
        Orderbook _orderbookContract
    ) public {
        orderbookContract = _orderbookContract;
    }

    /// @notice The owner of the contract can update the orderbook address.
    ///
    /// @param _newOrderbookContract The address of the new orderbook contract.
    function updateOrderbook(Orderbook _newOrderbookContract) external onlyOwner {
        emit LogOrderbookUpdated(orderbookContract, _newOrderbookContract);
        orderbookContract = _newOrderbookContract;
    }

    /// @notice Permits the provided address to submit atomic swap details on
    /// behalf of the msg.sender.
    ///
    /// @param _swapper The address of the swapper.
    function authoriseSwapper(address _swapper) external {
        authorisedSwapper[msg.sender][_swapper] = true;
    }

    /// @notice Revokes the permissions allowed by `authoriseSwapper`.
    ///
    /// @param _swapper The address of the swapper.
    function deauthoriseSwapper(address _swapper) external {
        authorisedSwapper[msg.sender][_swapper] = false;
    }

    /// @notice Provides the encoded swap details about an order. Can only be
    /// called once per order ID.
    ///
    /// @param _orderID The id of the order the details are for.
    /// @param _swapDetails The details required for the atomic swap.
    function submitDetails(bytes32 _orderID, bytes _swapDetails) external onlyAuthorisedSwapper(_orderID, msg.sender) {
        require(swapDetailsTimestamp[_orderID] == 0, "already submitted");
        swapDetails[_orderID] = _swapDetails;
        swapDetailsTimestamp[_orderID] = now;
    }

    /// @notice Provides the address that will participate in the swap for the
    /// order. Can only be called once per order ID.
    ///
    /// @param _orderID The id of the order the details are for.
    /// @param _owner The address of the order ID's owner.
    function setOwnerAddress(bytes32 _orderID, bytes _owner) external onlyAuthorisedSwapper(_orderID, msg.sender) {
        require(ownerAddressTimestamp[_orderID] == 0, "already set");
        getOwnerAddress[_orderID] = _owner;
        ownerAddressTimestamp[_orderID] = now;
    }
}