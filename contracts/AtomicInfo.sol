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

    function updateOrderbook(Orderbook _newOrderbookContract) public onlyOwner {
        emit OrderbookUpdated(orderbookContract, _newOrderbookContract);
        orderbookContract = _newOrderbookContract;
    }

    modifier onlyAuthorisedSwapper(bytes32 _orderID, address _swapper) {
        address trader = orderbookContract.orderTrader(_orderID);
        require(authorisedSwapper[trader][_swapper] == true);
        _;
    }

    function authoriseSwapper(address _swapper) public {
        authorisedSwapper[msg.sender][_swapper] = true;
    }

    function deauthoriseSwapper(address _swapper) public {
        authorisedSwapper[msg.sender][_swapper] = false;
    }

    function submitDetails(bytes32 _orderID, bytes _swapDetails) public onlyAuthorisedSwapper(_orderID, msg.sender) {
        swapDetails[_orderID] = _swapDetails;
    }

    function setOwnerAddress(bytes32 _orderID, bytes _owner) public onlyAuthorisedSwapper(_orderID, msg.sender) {
        getOwnerAddress[_orderID] = _owner;
    }
}