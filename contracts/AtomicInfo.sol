pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "republic-sol/contracts/Orderbook.sol";

contract AtomicInfo is Ownable {
    /********** CONTRACTS *****************************************************/
    Orderbook private orderbookContract;

    /********** EVENTS ********************************************************/
    event LogOrderbookUpdated(Orderbook previousOrderbook, Orderbook nextOrderbook);

    /********** STORAGE *******************************************************/
    mapping (address => mapping (address => bool)) public authorisedSwapper;
    mapping (bytes32 => bytes) public getOwnerAddress;
    mapping (bytes32 => uint256) public ownerAddressTimestamp;
    mapping (bytes32 => bytes) public swapDetails;
    mapping (bytes32 => uint256) public swapDetailsTimestamp;

    /********** MODIFIERS *******************************************************/
    /// @notice Restricts a function to only be called by an address that has
    /// been authorised by the trader who submitted the order
    /// @param _orderID The id of the order
    /// @param _swapper The address of the swapper
    modifier onlyAuthorisedSwapper(bytes32 _orderID, address _swapper) {
        address trader = orderbookContract.orderTrader(_orderID);
        require(_swapper == trader || authorisedSwapper[trader][_swapper] == true, "not authorised");
        _;
    }

    /// @notice constructor
    /// @param _orderbookContract The address of the Orderbook contract.
    constructor(
        Orderbook _orderbookContract
    ) public {
        orderbookContract = _orderbookContract;
    }

    /********** External Functions ***********************************************/
    /// @notice The owner of the contract can update the orderbook address.
    /// @param _newOrderbookContract The address of the new orderbook contract.
    function updateOrderbook(Orderbook _newOrderbookContract) external onlyOwner {
        emit LogOrderbookUpdated(orderbookContract, _newOrderbookContract);
        orderbookContract = _newOrderbookContract;
    }

    /// @notice Permits the address to submit details for the message senders's
    ///         atomic swaps
    /// @param _swapper The address of the swapper
    function authoriseSwapper(address _swapper) external {
        authorisedSwapper[msg.sender][_swapper] = true;
    }
    
    /// @notice Revokes the permissions allowed by `authoriseSwapper`
    /// @param _swapper The address of the swapper
    function deauthoriseSwapper(address _swapper) external {
        authorisedSwapper[msg.sender][_swapper] = false;
    }

    /// @notice Provides the encoded swap details about an order
    /// @param _orderID the id of the order the details are for
    /// @param _swapDetails the details required for the atomic swap
    function submitDetails(bytes32 _orderID, bytes _swapDetails) external onlyAuthorisedSwapper(_orderID, msg.sender) {
        swapDetails[_orderID] = _swapDetails;
        swapDetailsTimestamp[_orderID] = now;
    }

    /// @notice Provides the address that will participate in the swap for the order 
    /// @param _orderID the id of the order the details are for
    /// @param _owner address of the order ID's owner
    function setOwnerAddress(bytes32 _orderID, bytes _owner) external onlyAuthorisedSwapper(_orderID, msg.sender) {
        getOwnerAddress[_orderID] = _owner;
        ownerAddressTimestamp[_orderID] = now;
    }
}