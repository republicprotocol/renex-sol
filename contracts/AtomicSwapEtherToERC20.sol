pragma solidity ^0.4.18;

import "./TestERC20.sol";

contract AtomicSwapEtherToErc20 {

struct Swap {
  address ethTrader;
  address erc20Trader;
  uint256 value;
  uint256 erc20Value;
  address erc20ContractAddress;
  uint256 timestamp;
}  

enum States {
  NOT_INITIATED,
  OPEN,
  CLOSED,
  EXPIRED
}

mapping (bytes32 => Swap) Swaps;
mapping (bytes32 => States) SwapStates;

function open(bytes32 _matchID, address _erc20TraderAddress, uint256 _erc20Value, address _erc20ContractAddress) public payable {
  Swap memory order = Swap({
    ethTrader: msg.sender,
    erc20Trader: _erc20TraderAddress,
    value: msg.value,
    erc20Value: _erc20Value,
    erc20ContractAddress: _erc20ContractAddress,
    timestamp: now
  });
  Swaps[_matchID] = order;
  SwapStates[_matchID] = States.OPEN;
}

function close(bytes32 _matchID) public {
  Swap memory order = Swaps[_matchID];
  require(SwapStates[_matchID] == States.OPEN);
  TestERC20 erc20Token = TestERC20(order.erc20ContractAddress);
  require(order.erc20Value <= erc20Token.allowance(order.erc20Trader, address(this)));
  require(erc20Token.transferFrom(order.erc20Trader, order.ethTrader, order.erc20Value));
  order.erc20Trader.transfer(order.value);
  SwapStates[_matchID] = States.CLOSED;
}

function check(bytes32 _matchID) view public returns (uint256 value, uint256 erc20Value, address erc20Address, address toAddress) {
  Swap memory order = Swaps[_matchID];
  return(order.value, order.erc20Value, order.erc20ContractAddress, order.erc20Trader);
}

function expire(bytes32 _matchID) public {
  Swap memory order = Swaps[_matchID];
  require(order.timestamp - now >= 2 days && SwapStates[_matchID] == States.OPEN);
  order.ethTrader.transfer(order.value);
  SwapStates[_matchID] = States.EXPIRED;
}

}
