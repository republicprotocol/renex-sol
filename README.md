RenEx Contracts
===============


[![Build Status](https://travis-ci.org/republicprotocol/renex-sol.svg?branch=master)](https://travis-ci.org/republicprotocol/renex-sol)
[![Coverage Status](https://coveralls.io/repos/github/republicprotocol/renex-sol/badge.svg?branch=master)](https://coveralls.io/github/republicprotocol/renex-sol?branch=master)

RenEx Sol is a Solidity implementation of the RenEx smart contracts.

RenEx (Ren Exchange) is the official Republic Protocol dark pool.


Dependencies
------------

RenEx Sol depends on the [OpenZeppelin Solidity library](https://github.com/OpenZeppelin/openzeppelin-solidity) and the [Republic Protocol Solidity library](https://github.com/republicprotocol/republic-sol).


Tests
-----

Install Truffle and Ganache commands, and the required node modules.

```
npm install --global truffle ganache-cli
npm install
```

Run the `ganache-cli` or an alternate Ethereum test RPC server on port 8545.

```sh
ganache-cli
```

Run the Truffle test suite.

```sh
truffle test
```
