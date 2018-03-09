# Ethereum Atomic Swap

[![Build Status](https://travis-ci.org/republicprotocol/eth-atomic-swap.svg?branch=master)](https://travis-ci.org/republicprotocol/eth-atomic-swap)
[![Coverage Status](https://coveralls.io/repos/github/republicprotocol/eth-atomic-swap/badge.svg?branch=master)](https://coveralls.io/github/republicprotocol/eth-atomic-swap?branch=master)

The Ethereum Atomic Swap library is an official reference implementation of atomic swaps on Ethereum for the Republic Protocol, written in Solidity. This library supports Ether and ERC20 atomic swaps, cross-chain Ether atomic swaps, and cross-chain ERC20 atomic swaps. Currently, the Republic Protocol only provides support for cross-chain trading with Bitcoin.

## Smart contracts

The Ethereum Atomic Swap library is made up of several different smart contracts that work together to implement atomic swaps. These smart contracts are used by traders after the Republic Protocol has successfully matched their orders. However, traders are not required to use the Republic Protocol to use the Ethereum Atomic Swap contracts.

1. The EtherToERC20 contract implements atomic swaps between Ether and an ERC20 token.
2. The ERC20ToERC20 contract implements atomic swaps between two ERC20 tokens.
3. The Ether contract implements cross-chain atomic swaps where Ether is being used.
4. The ERC20 contract implements cross-chain atomic swaps where an ERC20 token is being used.

None of the contract expose orders. Orders are never passed to the Republic network under any circumstances, and order fragments are never passed to the blockchain. The `_swapID` used by the contracts are only for identifying the swap, and is negotiated between traders. This maintains privacy between traders that have matched on the order book, and atomic swaps that have been executed.

## How it works

These contracts are used by the Republic Protocol, but can also be used by any traders that are looking to perform a cross-chain atomic swaps. Traders are not required to use the Republic Protocol to use the Ethereum Atomic Swap contracts.

### Ether to ERC20

When performing an atomic swap between Ether and ERC20 tokens, the `AtomicSwapEtherToERC20` contract should be used. For this example, Alice holds Ether and Bob holds ERC20 tokens. Alice is looking to give Ether to Bob in exchange for his ERC20 tokens.

1. Alice calls `open` using a unique `_swapID` that has been negotiated between both traders. This is a payable call and Alice must send her Ether when she makes this call.
2. Bob calls `check` to verify the details of the trade. If he does not agree then he does not need to do anything. At any point, Alice can call `expire` and get a refund of her Ether. Doing this cancels the swap.
3. Bob provides an allowance to the `AtomicSwapEtherToERC20` contract, using his ERC20 contract to do so.
4. Bob calls `close`, which will check the allowance and use it to transfer his ERC20 tokens to Alice. At the same time, it will transfer Alice's Ether to Bob. Alice can no longer expire the swap.

### ERC20 to ERC20

When performing an atomic swap between ERC20 and another ERC20 token, the `AtomicSwapERC20ToERC20` contract should be used. For this example, Alice holds ERC20 tokens and Bob also holds ERC20 tokens. Alice is looking to give her ERC20 tokens to Bob in exchange for his ERC20 tokens, and Alice has agreed to initiate the atomic swap.

1. Alice provides an allowance to the `AtomicSwapERC20ToERC20` contract, using her ERC20 contract to do so.
1. Alice calls `open` using a unique `_swapID` that has been negotiated between both traders. The allowance will be checked and used to transfer Alice's ERC20 tokens to the `AtomicSwapERC20ToERC20` contract.
2. Bob calls `check` to verify the details of the trade. If he does not agree then he does not need to do anything. At any point, Alice can call `expire` and get a refund of her ERC20 tokens. Doing this cancels the swap.
3. Bob provides an allowance to the `AtomicSwapERC20ToERC20` contract, using his ERC20 contract to do so.
4. Bob calls `close`, which will check the allowance and use it to transfer his ERC20 tokens to Alice. At the same time, it will transfer Alice's ERC20 tokens to Bob. Alice can no longer expire the swap.

### Ether to Bitcoin

> This example will use Bitcoin as the non-Ethereum cryptocurrency being traded. However, it works with any cryptocurrency that supports the same level of scripting as Bitcoin; including, but not limited to, Bitcoin Cash, Bitcoin Gold, and LiteCoin. The Republic Protocol team will provide an official implementation of the Bitcoin Script required to perform atomic swaps with these contracts, which be used without even if the Republic Protocol was not used to match the traders. Third party scripts will not be supported by the Republic Protocol, but users are free to use whichever scripts they want.

When performing an atomic swap between Ether and Bitcoin, the `AtomicSwapEther` contract should be used. For this example, Alice holds Ether and Bob also holds Bitcoin. Alice is looking to give her Ether to Bob in exchange for his Bitcoins.

1. Bob generates a random secret key and hashes it using SHA256 to generate a secret lock.
2. Bob uses the secret lock, and a Bitcoin Script, to setup a transaction to Alice on the condition that she produces the secret key. If she does not do so within 48 hours then Bob can withdraw the funds.
3. Bob sends the secret lock to Alice along with the address of his transaction on the Bitcoin blockchain.
4. Alice checks Bob's transaction, verifying the details of the trade. If she does not agree then she does not need to do anything. After 48 hours, Bob can withdraw his funds.
5. Alice calls `open` using a unique `_swapID` that has been negotiated between both traders. She also uses the secret lock that was provided by Bob. This is a payable call and Alice must send her Ether when she makes this call.
6. Bob calls `check` to verify the details of the trade. If he does not agree, then he does not need to do anything. After 24 hours, Alice can call `expire`, getting a refund of her Ether.
7. Bob calls `close`, which requires that he submits the secret key associated with the secret lock. If he has provided the correct secret key, it will transfer Alice's Ether to Bob and store the secret key.
8. Alice calls `checkSecretKey`, acquiring the secret key.
9. Alice provides the secret key to Bob's Bitcoin Script, and receives his Bitcoin.

### ERC20 to Bitcoin

> This example will use Bitcoin as the non-Ethereum cryptocurrency being traded. However, it works with any cryptocurrency that supports the same level of scripting as Bitcoin; including, but not limited to, Bitcoin Cash, Bitcoin Gold, and LiteCoin. The Republic Protocol team will provide an official implementation of the Bitcoin Script required to perform atomic swaps with these contracts, which be used without even if the Republic Protocol was not used to match the traders. Third party scripts will not be supported by the Republic Protocol, but users are free to use whichever scripts they want.

When performing an atomic swap between ERC20 and Bitcoin, the `AtomicSwapERC20` contract should be used. For this example, Alice holds ERC20 tokens and Bob also holds Bitcoin. Alice is looking to give her ERC20 tokens to Bob in exchange for his Bitcoins.

1. Bob generates a random secret key and hashes it using SHA256 to generate a secret lock.
2. Bob uses the secret lock, and a Bitcoin Script, to setup a transaction to Alice on the condition that she produces the secret key. If she does not do so within 48 hours then Bob can withdraw the funds.
3. Bob sends the secret lock to Alice along with the address of his transaction on the Bitcoin blockchain.
4. Alice checks Bob's transaction, verifying the details of the trade. If she does not agree then she does not need to do anything. After 48 hours, Bob can withdraw his funds.
5. Alice provides an allowance to the `AtomicSwapERC20` contract, using her ERC20 contract to do so.
6. Alice calls `open` using a unique `_swapID` that has been negotiated between both traders. She also uses the secret lock that was provided by Bob. The allowance will be checked and used to transfer Alice's ERC20 tokens to the `AtomicSwapERC20` contract.
7. Bob calls `check` to verify the details of the trade. If he does not agree, then he does not need to do anything. After 24 hours, Alice can call `expire`, getting a refund of her ERC20 tokens.
8. Bob calls `close`, which requires that he submits the secret key associated with the secret lock. If he has provided the correct secret key, it will transfer Alice's ERC20 tokens to Bob and store the secret key.
9. Alice calls `checkSecretKey`, acquiring the secret key.
10. Alice provides the secret key to Bob's Bitcoin Script, and receives his Bitcoin.

### Limitations

During a cross-chain atomic swap, funds are locked in contracts and scripts. If both traders participate faithfully in the trader then this will have no effect on either trader. The only latency in accessing funds is the latency of network communications, and blockchain confirmations.

However, if one trader is malicious then they are able to inconvenience the other trader by never agreeing to the trade. In this case, the funds will be locked for up to 48 hours. This number can be reduced to any value agreed upon by the traders but it should always be long enough that both traders have time to execute the atomic swap.

These cross-chain atomic swap contracts, and scripts, can be used by any traders but are ultimated designed to work with the Republic Protocol. The Republic Protocol provides economic incentivizes to discourage traders from not executing on matched orders. Orders on the Republic Protocol can not be staged prior to the atomic swap (this would reveal the order) and are most commonly large volumes that are traded once (a trader is unlikely to be continuously matched with a specific trader).

## Tests

Install all NPM modules and Truffle as a global command.

```
npm install --global truffle
npm install
```

Run the `ganache` script. This script needs to continue running in the background; either run it in a separate terminal, or append the `&` symbol.

```sh
./ganache
```

Run the Truffle test suite.

```sh
truffle test
```

## License

The Ethereum Atomic Swap library was developed by the Republic Protocol team and is available under the MIT license. For more information, see our website https://republicprotocol.com.
