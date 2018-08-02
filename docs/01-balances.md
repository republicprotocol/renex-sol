# Balances

RenEx Balances is a smart contract used to store the funds of traders. These funds stored are used for two purposes:

1. Executing order settlements, and
2. paying fees to the Darknodes for running the Secure Order Matcher.

Traders are identified using Ethereum accounts. Although RenEx does provide an official RenEx Broker, broker rules are not enforced by the RenEx Balances contract — any Ethereum account is free to deposit and withdraw funds from RenEx Balances and become a trader. However, only traders that have been approved by the official RenEx Broker will be allowed to open orders. To all other traders, RenEx Balances serves no purpose.

## Deposit

```sol
function deposit(address _token, uint256 _value) payable public
```

The Ethereum account that calls `deposit` will be identified as the trader. The ERC20 token at the `_token` address will be used to transfer `_value` amount of the token to RenEx Balances. The trader's balance for that token will be incremented accordingly. The `_value` is assumed to be the smallest unit supported by the ERC20 token.

Using the `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` address for `_token` will signal that the trader is depositing ETH, and RenEx Balances will expected to amount of value ETH transferred, as part of the deposit transaction, to match the `_value`. The `_value` is assumed to be the smallest unit of ETH  — wei.

## Withdraw

```sol
function withdraw(address _token, uint256 _value) public
```

The Ethereum account that calls `withdraw` will be identified as the trader. The ERC20 token at the `_token` address will be used to transfer `_value` amount of the token from RenEx Balances to the trader. The trader's balance for that token will be decremented accordingly. The `_value` is assumed to be the smallest unit supported by the ERC20 token.

Using the `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` address for `_token` will signal that the trader is withdrawing ETH. The `_value` is assumed to be the smallest unit of ETH  — wei.

*Note: RenEx Balances will not allow a trader to withdraw if the `_value` would cause their balance to drop below zero.*