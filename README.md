# Ethereum Atomic Swap

The Ethereum Atomic Swap library is an official reference implementation of atomic swaps on Ethereum for the Republic Protocol, written in Solidity. This library supports Ether and ERC20 atomic swaps, cross-chain Ether atomic swaps, and cross-chain ERC20 atomic swaps. Currently, the Republic Protocol only provides support for cross-chain trading with Bitcoin.

## Smart contracts

The Ethereum Atomic Swap library is made up of several different smart contracts that work together to implement atomic swaps. These smart contracts are used by traders after the Republic Protocol has successfully matched their orders.

1. The Ether contract implements cross-chain atomic swaps where Ether is being used.
2. The ERC20 contract implements cross-chain atomic swaps where an ERC20 token is being used.
3. The EtherToERC20 contract implements atomic swaps between Ether and an ERC20 token.
4. The ERC20ToERC20 contract implements atomic swaps between two ERC20 tokens.

None of the contract expose orders. Orders are never passed to the Republic network under any circumstances, and order fragments are never passed to the blockchain. The `_swapID` used by the contracts are only for identifying the swap, and is negotiated between traders. This maintains privacy between traders that have matched on the order book, and atomic swaps that have been executed.

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