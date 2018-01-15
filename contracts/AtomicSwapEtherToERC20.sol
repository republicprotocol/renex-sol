pragma solidity 0.4.18;

import "./TestERC20.sol";

contract AtomicSwapEtherToErc20 {

  struct Swap {
    uint256 timestamp;
    uint256 value;
    address ethTrader;
    uint256 erc20Value;
    address erc20Trader;
    address erc20ContractAddress;
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

  modifier onlyExpirableSwaps(bytes32 _swapID) {
    if (swaps[_swapID].timestamp - now >= 2 days) {
      _;
    }
  }

  function open(bytes32 _swapID, uint256 _erc20Value, address _erc20TraderAddress, address _erc20ContractAddress) public payable {
    Swap memory swap = Swap({
      timestamp: now,
      value: msg.value,
      ethTrader: msg.sender,
      erc20Value: _erc20Value,
      erc20Trader: _erc20TraderAddress,
      erc20ContractAddress: _erc20ContractAddress
    });
    swaps[_swapID] = swap;
    swapStates[_swapID] = States.OPEN;
  }

  function close(bytes32 _swapID) public onlyOpenSwaps(_swapID) {
    Swap memory swap = swaps[_swapID];

    TestERC20 erc20Contract = TestERC20(swap.erc20ContractAddress);
    require(swap.erc20Value <= erc20Contract.allowance(swap.erc20Trader, address(this)));

    swapStates[_swapID] = States.CLOSED;
    swap.erc20Trader.transfer(swap.value);
    require(erc20Contract.transferFrom(swap.erc20Trader, swap.ethTrader, swap.erc20Value));
  }

  function expire(bytes32 _swapID) public onlyOpenSwaps(_swapID) onlyExpirableSwaps(_swapID) {
    Swap memory swap = swaps[_swapID];
    swapStates[_swapID] = States.EXPIRED;
    swap.ethTrader.transfer(swap.value);
  }

  function check(bytes32 _swapID) public view returns (uint256 timestamp, uint256 value, uint256 erc20Value, address erc20Trader, address erc20ContractAddress) {
    Swap memory swap = swaps[_swapID];
    return (swap.timestamp, swap.value, swap.erc20Value, swap.erc20Trader, swap.erc20ContractAddress);
  }
}
