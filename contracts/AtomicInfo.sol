pragma solidity 0.4.24;

contract AtomicInfo {
    mapping (bytes32 => bytes) public getOwnerAddress;
    mapping (bytes32 => bytes) public swapDetails;

    function submitDetails(bytes32 _orderID, bytes _swapDetails) public {
        swapDetails[_orderID] = _swapDetails;
    }

    function setOwnerAddress(bytes32 _orderID, bytes _owner) public {
        getOwnerAddress[_orderID] = _owner;
    }
}