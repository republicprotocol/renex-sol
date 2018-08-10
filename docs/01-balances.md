# Balances

RenEx Balances is a smart contract used to store the funds of traders. These funds stored are used for two purposes:

1. Executing order settlements, and
2. paying fees to the Darknodes for running the Secure Order Matcher.

Traders are identified using Ethereum accounts. Although RenEx does provide an official RenEx Broker, broker rules are not enforced by the RenEx Balances contract — any Ethereum account is free to deposit and withdraw funds from RenEx Balances and become a trader. However, only traders that have been approved by the official RenEx Broker will be allowed to open orders. To all other traders, RenEx Balances serves no purpose.

RenEx Balance will increment and decrement the balances stored against the trader when they deposit and withdraw funds. It will also increment and decrement the balances as matching orders are settled by [RenEx Settlement](./02-settlement.md).

## Deposit

```sol
function deposit(address _token, uint256 _value) external payable
```

The Ethereum account that calls `deposit` will be identified as the trader. The ERC20 token at the `_token` address will be used to transfer `_value` amount of the token to RenEx Balances. The trader's balance for that token will be incremented accordingly. The `_value` is assumed to be the smallest unit supported by the ERC20 token.

Using the `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` address for `_token` will signal that the trader is depositing ETH, and RenEx Balances will expected to amount of value ETH transferred, as part of the deposit transaction, to match the `_value`. The `_value` is assumed to be the smallest unit of ETH  — wei.

## Withdraw

```sol
function withdraw(address _token, uint256 _value) external
```

The Ethereum account that calls `withdraw` will be identified as the trader. The ERC20 token at the `_token` address will be used to transfer `_value` amount of the token from RenEx Balances to the trader. The trader's balance for that token will be decremented accordingly. RenEx Balances will not allow a trader to withdraw if the `_value` would cause their balance to drop below zero. The `_value` is assumed to be the smallest unit supported by the ERC20 token.

Using the `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` address for `_token` will signal that the trader is withdrawing ETH. The `_value` is assumed to be the smallest unit of ETH  — wei.

For the withdrawal to succeed, the trader must provide a signature from the official RenEx Broker that approves the withdrawal or the trader must have signalled their intent to withdraw more than 48 hours prior. This prevents traders from withdrawing tokens while there are still open orders for that `_token`.

## Withdraw Signal

```sol
function signalBackupWithdraw(address _token) external
```

The Ethereum account that calls `signalBackupWithdraw` will be identified as the trader. The ERC20 token at the `_token` address will be used to transfer `_value` amount of the token from RenEx Balances to the trader. The trader's balance for that token will be decremented accordingly.

Using the `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` address for `_token` will signal that the trader is withdrawing ETH.

This function is available as a backup for when the official RenEx Broker is not trusted to provide the required signature, or when the official RenEx Broker is erroneously unavailable. After 48 hours, the trader can call `withdraw` and the withdrawal will succeed. During this time, the official RenEx Broker will not provide the required signature for a trader trying to open a new order for this `_token`. This prevents traders from withdrawing tokens while there are still open orders for the `_token`.