pragma solidity ^0.4.4;

import "./ERC20.sol";

contract RepublicAtomicSwapERC20 {
  ERC20 erc20;
  
  struct Trade {
    address contractAddress;
    address trader;
    address tradee;
    uint value;
    uint time;
  }

  mapping (bytes32 => bool) public status;
  mapping (bytes32 => Trade) locker;

  function depositERC20(address to, address contractAddress, bytes32 secretLock) payable {
    require(!status[secretLock]);
    erc20 = ERC20(contractAddress);
    uint value = erc20.allowance(msg.sender, address(this));
    erc20.transferFrom(msg.sender, address(this), value);
    locker[secretLock].contractAddress = contractAddress;
    locker[secretLock].value = value;
    locker[secretLock].tradee = to;
    locker[secretLock].trader = msg.sender;
    locker[secretLock].time = now;  
    status[secretLock] = true;
  } 

  function check(bytes32 secretLock) constant returns (uint, address) {
    require(locker[secretLock].tradee == msg.sender || locker[secretLock].trader == msg.sender);
    return (locker[secretLock].value,locker[secretLock].contractAddress);
  }

  function withdrawErc20(bytes secretKey) {
    bytes32 secretLock = sha3(secretKey);
    Trade memory t = locker[secretLock];
    require(status[secretLock]);
    require(t.value > 0 && t.tradee == msg.sender);
    erc20 = ERC20(t.contractAddress);
    erc20.transfer(msg.sender, t.value);
    status[secretLock] = false;
  }

  function revertEther(bytes32 secretLock) {
    Trade memory t = locker[secretLock];
    require(now - locker[secretLock].time >= 1 days);
    require(status[secretLock]);
    erc20 = ERC20(t.contractAddress);
    erc20.transfer(msg.sender, t.value);
    status[secretLock] = false;
  }

}
