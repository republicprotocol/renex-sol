pragma solidity ^0.4.4;

contract RepublicAtomicSwapEther {

  struct trade{
    address trader;
    address tradee;
    uint value;
    uint time;
  }
  mapping (bytes32 => bool) status;
  mapping (bytes32 => trade) locker;

  function depositEther(address to, bytes32 secretLock) payable {
    require(!status[secretLock]);
    locker[secretLock].value = msg.value;
    locker[secretLock].tradee = to;
    locker[secretLock].trader = msg.sender;
    locker[secretLock].time = now;  
  } 

  function check(bytes32 secretLock) constant returns (uint) {
    if (locker[secretLock].tradee == msg.sender) {
      return locker[secretLock].value;
    }
  }

  function withdrawEther(bytes secretKey) {
    bytes32 secretLock = sha3(secretKey);
    if (locker[secretLock].value > 0 && locker[secretLock].tradee == msg.sender) {
      msg.sender.transfer(locker[secretLock].value);
      locker[secretLock].value = 0;
    }
  }

  function revertEther(bytes32 secretLock) {
    if (now - locker[secretLock].time >= 1 days) {
      msg.sender.transfer(locker[secretLock].value);
      locker[secretLock].value = 0;
    }
  }

}