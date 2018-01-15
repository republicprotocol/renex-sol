pragma solidity 0.4.18;

import "./ERC20.sol";

contract AtomicSwapERC20 {

  struct Swap {
    uint256 timestamp;
    uint256 erc20Value;
    address erc20Trader;
    address erc20ContractAddress;
    address withdrawTrader;
    bytes32 secretLock;
    bytes secretKey;
  }

  enum States {
    OPEN,
    CLOSED,
    EXPIRED
  }

  mapping (bytes32 => Swap) private swaps;
  mapping (bytes32 => States) private swapStates;

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
    if (swaps[_swapID].timestamp - now >= 1 days) {
      _;
    }
  }

  modifier onlyWithSecretKey(bytes32 _swapID, bytes _secretKey) {
    if (swaps[_swapID].secretLock == sha256(_secretKey)) {
      _;
    }
  }

  function open(bytes32 _swapID, uint256 _erc20Value, address _erc20ContractAddress, address _withdrawTrader, bytes32 _secretLock) public {
    // Transfer value from the ERC20 trader to this contract.
    ERC20 erc20Contract = ERC20(_erc20ContractAddress);
    require(_erc20Value <= erc20Contract.allowance(msg.sender, address(this)));
    require(erc20Contract.transferFrom(msg.sender, address(this), _erc20Value));

    // Store the details of the swap.
    Swap memory swap = Swap({
      timestamp: now,
      erc20Value: _erc20Value,
      erc20Trader: msg.sender,
      erc20ContractAddress: _erc20ContractAddress,
      withdrawTrader: _withdrawTrader,
      secretLock: _secretLock,
      secretKey: new bytes(0)
    });
    swaps[_swapID] = swap;
    swapStates[_swapID] = States.OPEN;
  }

  function close(bytes32 _swapID, bytes _secretKey) public onlyOpenSwaps(_swapID) onlyWithSecretKey(_swapID, _secretKey) {
    // Close the swap.
    Swap memory swap = swaps[_swapID];
    swap.secretKey = _secretKey;
    swapStates[_swapID] = States.CLOSED;

    // Transfer the ERC20 funds from this contract to the withdrawing trader.
    ERC20 erc20Contract = ERC20(swap.erc20ContractAddress);
    require(erc20Contract.transfer(swap.withdrawTrader, swap.erc20Value));
  }

  function expire(bytes32 _swapID) public onlyOpenSwaps(_swapID) onlyExpirableSwaps(_swapID) {
    // Expire the swap.
    Swap memory swap = swaps[_swapID];
    swapStates[_swapID] = States.EXPIRED;

    // Transfer the ERC20 value from this contract back to the ERC20 trader.
    ERC20 erc20Contract = ERC20(swap.erc20ContractAddress);
    require(erc20Contract.transfer(swap.erc20Trader, swap.erc20Value));
  }

  function check(bytes32 _swapID) public view returns (uint256 timeRemaining, uint256 erc20Value, address erc20ContractAddress, address withdrawTrader, bytes32 secretLock) {
    Swap memory swap = swaps[_swapID];
    return (swap.timestamp-now, swap.erc20Value, swap.erc20ContractAddress, swap.withdrawTrader, swap.secretLock);
  }

  function checkSecretKey(bytes32 _swapID) public view onlyClosedSwaps(_swapID) returns (bytes secretKey) {
    Swap memory swap = swaps[_swapID];
    return swap.secretKey;
  }
}
