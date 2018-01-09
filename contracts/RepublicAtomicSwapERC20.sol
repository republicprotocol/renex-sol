pragma solidity ^0.4.4;

import "./ERC20.sol";

contract RepublicAtomicSwapERC20 {

  struct Swap {
    address to;
    address from;
    uint value;
    uint time;
    bytes32 secretKey;
    address contractAddress;
  }

  // mapping (bytes32 => uint8) public status;
  mapping (bytes32 => Swap) lockbox;

  function deposit(address to, bytes32 secretLock, address contractAddress, uint value) public {
    // require(status[secretLock] <= 1);
    bytes32 swapHash = sha256(to, secretLock);

    ERC20 erc20 = ERC20(contractAddress);
    require(value <= erc20.allowance(msg.sender, address(this)));
    require(erc20.transferFrom(msg.sender, address(this), value));
    
    lockbox[swapHash].to = to;
    lockbox[swapHash].from = msg.sender;
    lockbox[swapHash].value = value;
    lockbox[swapHash].time = now;
    lockbox[swapHash].secretKey = 0x0;
    lockbox[swapHash].contractAddress = contractAddress;

    // status[secretLock] = 1;
    return;
  } 

  function peek(bytes32 secretLock) public constant returns (address, address, uint, uint, address) {
    bytes32 swapHash = sha256(msg.sender, secretLock);
    return (lockbox[swapHash].to, lockbox[swapHash].from, lockbox[swapHash].value, lockbox[swapHash].time - now, lockbox[swapHash].contractAddress);
  }

  function peekSecretKey(bytes32 secretLock) public constant returns (bytes32) {
   bytes32 swapHash = sha256(msg.sender, secretLock);
   return lockbox[swapHash].secretKey;
  }


  function withdraw(bytes32 secretKey) public {
    bytes32 secretLock = sha256(secretKey);
    // require(status[secretLock] == 1 || status[secretLock] == 2);
    bytes32 swapHash = sha256(msg.sender, secretLock);
    Swap memory swap = lockbox[swapHash];
    ERC20 erc20 = ERC20(swap.contractAddress);
    require(erc20.transfer(swap.to, swap.value));
    // lockbox[swapHash].value = 0;
    // lockbox[swapHash].secretKey = secretKey;
    // status[secretLock]++;
  }


  // function expire(bytes32 secretLock, address to) public {
  //   // require(status[secretLock] == 1);
  //   require(now - lockbox[secretLock].time >= 1 days);
  //   SwapID memory swapID;
  //   swapID.secretLock = secretLock;
  //   swapID.to = to;
  //   bytes32 swapHash = sha256(swapID);
  //   Swap memory swap = lockbox[swapHash];
  //   ERC20 erc20 = ERC20(swap.contractAddress);
  //   require(erc20.transfer(swap.from, swap.value));
  //   lockbox[swapHash].value = 0;
  //   // status[secretLock] = 4;
  // }

}
