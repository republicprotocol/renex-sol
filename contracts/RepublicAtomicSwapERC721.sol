pragma solidity ^0.4.4;

import "./ERC721.sol";

contract RepublicAtomicSwapERC721 {

  struct Swap {
    address to;
    address from;
    uint tokenID;
    uint time;
    bytes32 secretKey;
    address contractAddress;
  }
  mapping (bytes32 => bool) public status;
  mapping (bytes32 => Swap) lockbox;
  ERC721 erc721;

  function deposit(address to, bytes32 secretLock, address contractAddress, uint tokenID) public {
    require(!status[secretLock]);

    erc721 = ERC721(contractAddress);
    erc721.transferFrom(msg.sender, address(this), tokenID);

    lockbox[secretLock].to = to;
    lockbox[secretLock].from = msg.sender;
    lockbox[secretLock].tokenID = tokenID;
    lockbox[secretLock].time = now;
    lockbox[secretLock].secretKey = 0x0;
    lockbox[secretLock].contractAddress = contractAddress;
    status[secretLock] = true;
  } 

  function checkTokenID(bytes32 secretLock) public constant returns (uint, address) {
    require(lockbox[secretLock].to == msg.sender || lockbox[secretLock].from == msg.sender);
    return (lockbox[secretLock].tokenID, lockbox[secretLock].contractAddress);
  }

  function checkSecretKey(bytes32 secretLock) public constant returns (bytes32) {
    require(lockbox[secretLock].to == msg.sender || lockbox[secretLock].from == msg.sender);
    return lockbox[secretLock].secretKey;
  }

  function withdraw(bytes32 secretKey) public {
    bytes32 secretLock = sha256(secretKey);
    require(status[secretLock]);

    Swap memory swap = lockbox[secretLock];
    erc721 = ERC721(swap.contractAddress);
    erc721.transfer(swap.to, swap.tokenID);

    lockbox[secretLock].tokenID = 0;
    lockbox[secretLock].secretKey = secretKey;
    status[secretLock] = false;
  }

  function expire(bytes32 secretLock) public {
    require(status[secretLock]);
    require(now - lockbox[secretLock].time >= 1 days);

    Swap memory swap = lockbox[secretLock];
    erc721 = ERC721(swap.contractAddress);
    erc721.transfer(swap.from, swap.tokenID);

    lockbox[secretLock].tokenID = 0;
    status[secretLock] = false;
  }

}
