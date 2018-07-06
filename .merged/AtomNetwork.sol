pragma solidity 0.4.24;

contract AtomNetwork {
    mapping (bytes32 => bytes) public swapDetails;

    function submitDetails(bytes32 _orderID, bytes _swapDetails) public {
        swapDetails[_orderID] = _swapDetails;
    }
}