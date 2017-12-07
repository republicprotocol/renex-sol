pragma solidity ^0.4.4;

contract RepublicAtomicSwapEther {

  struct Trade {
    address trader;
    address tradee;
    uint value;
    uint time;
  }
  mapping (bytes32 => bool) status;
  mapping (bytes32 => Trade) locker;

  function depositEther(address to, bytes32 secretLock) public payable {
    require(!status[secretLock]);
    locker[secretLock].value = msg.value;
    locker[secretLock].tradee = to;
    locker[secretLock].trader = msg.sender;
    locker[secretLock].time = now;  
  } 

  function check(bytes32 secretLock) public constant returns (uint) {
    if (locker[secretLock].tradee == msg.sender) {
      return locker[secretLock].value;
    }
  }

  function withdrawEther(bytes secretKey) public {
    bytes32 secretLock = keccak256(secretKey);
    if (locker[secretLock].value > 0 && locker[secretLock].tradee == msg.sender) {
      msg.sender.transfer(locker[secretLock].value);
      locker[secretLock].value = 0;
    }
  }

  function revertEther(bytes32 secretLock) public {
    if (now - locker[secretLock].time >= 1 days) {
      msg.sender.transfer(locker[secretLock].value);
      locker[secretLock].value = 0;
    }
  }

}