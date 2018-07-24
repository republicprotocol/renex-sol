pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "republic-sol/contracts/Orderbook.sol";

contract AtomicInfo is Ownable {

    Orderbook public orderbookContract;

    event OrderbookUpdated(Orderbook previousOrderbook, Orderbook nextOrderbook);

    mapping (address => mapping (address => bool)) public authorisedSwapper;

    mapping (bytes32 => bytes) public getOwnerAddress;
    mapping (bytes32 => uint256) public ownerAddressTimestamp;

    mapping (bytes32 => bytes) public swapDetails;
    mapping (bytes32 => uint256) public swapDetailsTimestamp;

    /**
      * @notice constructor
      *
      * @param _orderbookContract The address of the Orderbook contract.
      */
    constructor(
        Orderbook _orderbookContract
    ) public {
        orderbookContract = _orderbookContract;
    }

    /**
     * @notice The owner of the contract can update the orderbook address
     */
    function updateOrderbook(Orderbook _newOrderbookContract) public onlyOwner {
        emit OrderbookUpdated(orderbookContract, _newOrderbookContract);
        orderbookContract = _newOrderbookContract;
    }

    /**
     * @notice Restricts a function to only be called by an address that has
     * been authorised by the trader who submitted the order
     */
    modifier onlyAuthorisedSwapper(bytes32 _orderID, address _swapper) {
        address trader = orderbookContract.orderTrader(_orderID);
        require(authorisedSwapper[trader][_swapper] == true);
        _;
    }

    /**
     * @notice Permits the address to submit details for the message senders's
     * atomic swaps
     */
    function authoriseSwapper(address _swapper) public {
        authorisedSwapper[msg.sender][_swapper] = true;
    }

    /**
     * @notice Revokes the permissions allowed by `authoriseSwapper`
     */
    function deauthoriseSwapper(address _swapper) public {
        authorisedSwapper[msg.sender][_swapper] = false;
    }


    function submitDetails(bytes32 _orderID, bytes _swapDetails) public onlyAuthorisedSwapper(_orderID, msg.sender) {
        swapDetails[_orderID] = _swapDetails;
        swapDetailsTimestamp[_orderID] = now;
    }

    function setOwnerAddress(bytes32 _orderID, bytes _owner) public onlyAuthorisedSwapper(_orderID, msg.sender) {
        getOwnerAddress[_orderID] = _owner;
        ownerAddressTimestamp[_orderID] = now;

    }
}