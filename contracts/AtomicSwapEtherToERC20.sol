pragma solidity 0.4.18;

import "./ERC20.sol";

contract AtomicSwapEtherToERC20 {

  struct Swap {
    uint256 timestamp;
    uint256 value;
    address ethTrader;
    uint256 erc20Value;
    address erc20Trader;
    address erc20ContractAddress;
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

  modifier onlyExpirableSwaps(bytes32 _swapID) {
    if (swaps[_swapID].timestamp - now >= 1 days) {
      _;
    }
  }

  function open(bytes32 _swapID, uint256 _erc20Value, address _erc20Trader, address _erc20ContractAddress) public onlyInvalidSwaps(_swapID) payable {
    // Store the details of the swap.
    Swap memory swap = Swap({
      timestamp: now,
      value: msg.value,
      ethTrader: msg.sender,
      erc20Value: _erc20Value,
      erc20Trader: _erc20Trader,
      erc20ContractAddress: _erc20ContractAddress
    });
    swaps[_swapID] = swap;
    swapStates[_swapID] = States.OPEN;
  }

  function close(bytes32 _swapID) public onlyOpenSwaps(_swapID) {
    // Close the swap.
    Swap memory swap = swaps[_swapID];
    swapStates[_swapID] = States.CLOSED;

    // Transfer the ERC20 funds from the ERC20 trader to the ETH trader.
    ERC20 erc20Contract = ERC20(swap.erc20ContractAddress);
    require(swap.erc20Value <= erc20Contract.allowance(swap.erc20Trader, address(this)));
    require(erc20Contract.transferFrom(swap.erc20Trader, swap.ethTrader, swap.erc20Value));

    // Transfer the ETH funds from this contract to the ERC20 trader.
    swap.erc20Trader.transfer(swap.value);
  }

  function expire(bytes32 _swapID) public onlyOpenSwaps(_swapID) onlyExpirableSwaps(_swapID) {
    // Expire the swap.
    Swap memory swap = swaps[_swapID];
    swapStates[_swapID] = States.EXPIRED;

    // Transfer the ETH value from this contract back to the ETH trader.
    swap.ethTrader.transfer(swap.value);
  }

  function check(bytes32 _swapID) public view returns (uint256 timeRemaining, uint256 value, uint256 erc20Value, address erc20Trader, address erc20ContractAddress) {
    Swap memory swap = swaps[_swapID];
    return (swap.timestamp-now, swap.value, swap.erc20Value, swap.erc20Trader, swap.erc20ContractAddress);
  }
}
