pragma solidity ^0.4.18;

contract AtomicSwapEther {

  struct Swap {
    uint256 timestamp;
    uint256 value;
    address ethTrader;
    address withdrawTrader;
    bytes32 secretLock;
    bytes secretKey;
  }

  enum States {
    INVALID,
    OPEN,
    CLOSED,
    EXPIRED
  }

  mapping (bytes32 => Swap) private swaps;
  mapping (bytes32 => States) private swapStates;

  event Open(bytes32 _swapID, address _withdrawTrader,bytes32 _secretLock);
  event Expire(bytes32 _swapID);
  event Close(bytes32 _swapID, bytes _secretKey);

  modifier onlyInvalidSwaps(bytes32 _swapID) {
    if (swapStates[_swapID] == States.INVALID) {
      _;
    }
  }

  modifier onlyOpenSwaps(bytes32 _swapID) {
    if (swapStates[_swapID] == States.OPEN) {
      _;
    }
  }

  modifier onlyClosedSwaps(bytes32 _swapID) {
    if (swapStates[_swapID] == States.CLOSED) {
      _;
    }
  }

  modifier onlyExpirableSwaps(bytes32 _swapID) {
    if (swaps[_swapID].timestamp - now >= 1 minutes) {
      _;
    }
  }

  modifier onlyWithSecretKey(bytes32 _swapID, bytes _secretKey) {
    if (swaps[_swapID].secretLock == sha256(_secretKey)) {
      _;
    }
  }

  function open(bytes32 _swapID, address _withdrawTrader, bytes32 _secretLock) public onlyInvalidSwaps(_swapID) payable {
    // Store the details of the swap.
    Swap memory swap = Swap({
      timestamp: now,
      value: msg.value,
      ethTrader: msg.sender,
      withdrawTrader: _withdrawTrader,
      secretLock: _secretLock,
      secretKey: new bytes(0)
    });
    swaps[_swapID] = swap;
    swapStates[_swapID] = States.OPEN;

    // Trigger open event.
    Open(_swapID, _withdrawTrader, _secretLock);
  }

  function close(bytes32 _swapID, bytes _secretKey) public onlyOpenSwaps(_swapID) onlyWithSecretKey(_swapID, _secretKey) {
    // Close the swap.
    Swap memory swap = swaps[_swapID];
    swaps[_swapID].secretKey = _secretKey;
    swapStates[_swapID] = States.CLOSED;

    // Transfer the ETH funds from this contract to the withdrawing trader.
    swap.withdrawTrader.transfer(swap.value);

    // Trigger close event.
    Close(_swapID, _secretKey);
  }

  function expire(bytes32 _swapID) public onlyOpenSwaps(_swapID) onlyExpirableSwaps(_swapID) {
    // Expire the swap.
    Swap memory swap = swaps[_swapID];
    swapStates[_swapID] = States.EXPIRED;

    // Transfer the ETH value from this contract back to the ETH trader.
    swap.ethTrader.transfer(swap.value);

     // Trigger expire event.
    Expire(_swapID);
  }

  function check(bytes32 _swapID) public view returns (uint256 timeRemaining, uint256 value, address withdrawTrader, bytes32 secretLock) {
    Swap memory swap = swaps[_swapID];
    return (swap.timestamp-now, swap.value, swap.withdrawTrader, swap.secretLock);
  }

  function checkSecretKey(bytes32 _swapID) public view onlyClosedSwaps(_swapID) returns (bytes secretKey) {
    Swap memory swap = swaps[_swapID];
    return swap.secretKey;
  }
}
