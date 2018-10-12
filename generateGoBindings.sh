#!/bin/sh
set -e

# Setup
sed -i -e 's/"openzeppelin-solidity\/contracts\//".\/openzeppelin-solidity\/contracts\//' contracts/*.sol
sed -i -e 's/"openzeppelin-solidity\/contracts\//"..\/openzeppelin-solidity\/contracts\//' contracts/*/*.sol
sed -i -e 's/"republic-sol\/contracts\//".\/republic-sol\/contracts\//' contracts/*.sol
mkdir ./contracts/openzeppelin-solidity
mkdir ./contracts/republic-sol
cp -r ./node_modules/openzeppelin-solidity/contracts ./contracts/openzeppelin-solidity/contracts
cp -r ./node_modules/republic-sol/contracts ./contracts/republic-sol/contracts

cd contracts/republic-sol
sed -i -e 's/"openzeppelin-solidity\/contracts\//"..\/..\/openzeppelin-solidity\/contracts\//' contracts/*.sol
sed -i -e 's/"openzeppelin-solidity\/contracts\//"..\/..\/..\/openzeppelin-solidity\/contracts\//' contracts/*/*.sol
mkdir ./contracts/openzeppelin-solidity
cp -r ../../node_modules/openzeppelin-solidity/contracts ./contracts/openzeppelin-solidity/contracts
cd ../..

# Generate bindings
abigen --sol ./contracts/Bindings.sol -pkg bindings --out bindings.go

# Revert setup
sed -i -e 's/".\/openzeppelin-solidity\/contracts\//"openzeppelin-solidity\/contracts\//' contracts/*.sol
sed -i -e 's/"..\/openzeppelin-solidity\/contracts\//"openzeppelin-solidity\/contracts\//' contracts/*/*.sol
sed -i -e 's/".\/republic-sol\/contracts\//"republic-sol\/contracts\//' contracts/*.sol
rm -r ./contracts/openzeppelin-solidity
rm -r ./contracts/republic-sol
