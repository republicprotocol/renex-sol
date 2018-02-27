pragma solidity ^0.4.18;

contract ARC7 {

  struct Signature {
    uint8 v;
    bytes32 r;
    bytes32 s;
  }

  struct Swap {
    address owner;
    bytes sig;
    uint256 value;
    bytes matchSigA;
    bytes matchSigB;
  }

  enum SwapStatus {
    nothing, initiated, redeemed
  }
  
  mapping (bytes32 => Swap) swaps;
  mapping (bytes32 => SwapStatus) public swapStatus;
    
  function initiate(bytes32 _orderID, address _owner, bytes _signature) public payable {
    require(verifySignature(_owner, _orderID, _signature));
    swaps[_orderID].sig = _signature;
    swaps[_orderID].owner = _owner;
    swaps[_orderID].value = msg.value;
    swapStatus[_orderID] = SwapStatus.initiated;
  }

  function audit(bytes32 _orderID) public view returns(uint256) {
    return swaps[_orderID].value;
  }

  function redeem(bytes32 _orderIDA, bytes32 _orderIDB, bytes _signatureB, bytes _matchSigA, bytes _matchSigB, bytes _receiverSig) public {
    
    require(swapStatus[_orderIDA] == SwapStatus.initiated);
    
    var sigB = decodeSignature(_signatureB);
    var ownerB = ecrecover(_orderIDB, sigB.v, sigB.r, sigB.s);

    swaps[_orderIDA].matchSigA = _matchSigA;
    swaps[_orderIDA].matchSigB = _matchSigB;

    var matchID = getMatchID(swaps[_orderIDA].sig, _signatureB);

    require(verifySignature(swaps[_orderIDA].owner, matchID, _matchSigA));
    require(verifySignature(ownerB, matchID, _matchSigB));
    require(verifySignature(ownerB, bytes32(msg.sender), _receiverSig));

    msg.sender.transfer(swaps[_orderIDA].value);
  }

  function extractSecret(bytes32 _orderID) public constant returns (bytes matchSigA, bytes matchSigB) {
    return (swaps[_orderID].matchSigA, swaps[_orderID].matchSigB);
  }

  function getMatchID(bytes _sigA, bytes _sigB) pure internal returns (bytes32) {
    if (keccak256(_sigA) < keccak256(_sigB)) {
      return keccak256(_sigA, _sigB);
    } else {
      return keccak256(_sigB, _sigA);
    }
  }

  function verifySignature(address _signer, bytes32 _hash, bytes _signature) pure internal returns (bool) {
    return (_signer == ecrecover(_hash,uint8(_signature[0]),toBytes32(_signature, 1),toBytes32(_signature, 33)));
  }

  function decodeSignature(bytes signature) pure internal returns (Signature) {
    return Signature({
      v: uint8(signature[0]),
      r: toBytes32(signature, 1),
      s: toBytes32(signature, 33)
    });
  }

  function toBytes32(bytes data, uint pos) pure internal returns (bytes32) {
    uint256 subdata = 0;
    for (uint256 i = 0; i < 32; i++) {
        subdata += uint256(data[i + pos]) << 2*i;
    }
    return bytes32(subdata);
  }
}