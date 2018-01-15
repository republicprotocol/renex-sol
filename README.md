# Ethereum Atomic Swap

The Ethereum Atomic Swap library is an official reference implementation of atomic swaps on Ethereum for the Republic Protocol, written in Solidity. This library supports atomic swaps between Ether and ERC20 pairs, as well as the Ether and ERC20 side of cross-chain atomic swaps.

## Smart contracts

The Ethereum Atomic Swap library is made up of several different smart contracts that work together to implement the required on-chain functionality. These smart contracts are used by off-chain miners and traders to provide secure decentralized order matching computations.

1. The Ren ERC20 contract implements the Republic Token, used to provide economic incentives.
2. The Miner Registrar contract implements miner registrations and epochs.
3. The Trader Registrar contract implements trader registrations.
4. The Order Book contract implements the opening, closing, and expiration of orders.

None of the contract expose orders, including the Order Book, which only holds order IDs. Orders are never passed to the Republic network under any circumstances, and order fragments are never passed to the blockchain.

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