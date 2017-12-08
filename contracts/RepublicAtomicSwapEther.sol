pragma solidity ^0.4.4;

contract RepublicAtomicSwapEther {

  struct Swap {
    address to;
    address from;
    uint value;
    uint time;
    bytes32 secretKey;
  }
  mapping (bytes32 => bool) public status;
  mapping (bytes32 => Swap) lockbox;

  function deposit(address to, bytes32 secretLock) public payable {
    require(!status[secretLock]);
    lockbox[secretLock].to = to;
    lockbox[secretLock].from = msg.sender;
    lockbox[secretLock].value = msg.value;
    lockbox[secretLock].time = now;
    lockbox[secretLock].secretKey = 0x0;
    status[secretLock] = true;
  } 

  function checkValue(bytes32 secretLock) public constant returns (uint) {
    require(lockbox[secretLock].to == msg.sender || lockbox[secretLock].from == msg.sender);
    return lockbox[secretLock].value;
  }

  function checkSecretKey(bytes32 secretLock) public constant returns (bytes32) {
    require(lockbox[secretLock].to == msg.sender || lockbox[secretLock].from == msg.sender);
    return lockbox[secretLock].secretKey;
  }

  function withdraw(bytes32 secretKey) public {
    bytes32 secretLock = sha256(secretKey);
    require(status[secretLock]);

    lockbox[secretLock].to.transfer(lockbox[secretLock].value);

    lockbox[secretLock].value = 0;
    lockbox[secretLock].secretKey = secretKey;
    status[secretLock] = false;
  }

  function expire(bytes32 secretLock) public {
    require(status[secretLock]);
    require(now - lockbox[secretLock].time >= 1 days);

    lockbox[secretLock].from.transfer(lockbox[secretLock].value);

    lockbox[secretLock].value = 0;
    status[secretLock] = false;
  }

}