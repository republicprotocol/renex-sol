pragma solidity ^0.4.4;

import "./ERC721.sol";

contract RepublicAtomicSwapERC721 {
  ERC721 erc721;
  
  struct Trade {
    address contractAddress;
    address trader;
    address tradee;
    uint tokenID;
    uint time;
  }

  mapping (bytes32 => bool) public status;
  mapping (bytes32 => Trade) locker;

  function depositERC721(address to, address contractAddress, uint tokenID, bytes32 secretLock) payable {
    require(!status[secretLock]);
    erc721 = ERC721(contractAddress);
    erc721.transferFrom(msg.sender, address(this), tokenID);
    locker[secretLock].contractAddress = contractAddress;
    locker[secretLock].tokenID = tokenID;
    locker[secretLock].tradee = to;
    locker[secretLock].trader = msg.sender;
    locker[secretLock].time = now;  
    status[secretLock] = true;
  } 

  function check(bytes32 secretLock) constant returns (uint, address) {
    require(locker[secretLock].tradee == msg.sender || locker[secretLock].trader == msg.sender);
    return (locker[secretLock].tokenID, locker[secretLock].contractAddress);
  }

  function withdrawErc721(bytes secretKey) {
    bytes32 secretLock = sha3(secretKey);
    Trade memory t = locker[secretLock];
    require(status[secretLock]);
    require(t.tradee == msg.sender);
    erc721 = ERC721(t.contractAddress);
    erc721.transfer(msg.sender, t.tokenID);
    status[secretLock] = false;
  }

  function revertEther(bytes32 secretLock) {
    Trade memory t = locker[secretLock];
    require(now - t.time >= 1 days);
    require(status[secretLock]);
    erc721 = ERC721(t.contractAddress);
    erc721.transfer(msg.sender, t.tokenID);
    status[secretLock] = false;
  }

}
