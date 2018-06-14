pragma solidity 0.4.24;

contract AtomInfo {
    mapping (bytes32 => bytes) public getOwnerAddress;
    
    function setOwnerAddress(bytes32 _orderID, bytes _owner) public {
       getOwnerAddress[_orderID] = _owner;
    }
}