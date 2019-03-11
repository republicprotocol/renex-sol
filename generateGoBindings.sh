#!/bin/sh
set -e

# Setup
sed -i.bak -e 's/"openzeppelin-solidity\/contracts\//".\/openzeppelin-solidity\/contracts\//' contracts/*.sol
sed -i.bak -e 's/"openzeppelin-solidity\/contracts\//"..\/openzeppelin-solidity\/contracts\//' contracts/*/*.sol
sed -i.bak -e 's/"republic-sol\/contracts\//".\/republic-sol\/contracts\//' contracts/*.sol
mkdir -p ./contracts/openzeppelin-solidity
mkdir -p ./contracts/republic-sol
cp -r ./node_modules/openzeppelin-solidity/contracts ./contracts/openzeppelin-solidity/contracts
cp -r ./node_modules/republic-sol/contracts ./contracts/republic-sol/contracts

cd contracts/republic-sol
sed -i.bak -e 's/"openzeppelin-solidity\/contracts\//"..\/..\/openzeppelin-solidity\/contracts\//' contracts/*.sol
sed -i.bak -e 's/"openzeppelin-solidity\/contracts\//"..\/..\/..\/openzeppelin-solidity\/contracts\//' contracts/*/*.sol
mkdir ./contracts/openzeppelin-solidity
cp -r ../../node_modules/openzeppelin-solidity/contracts ./contracts/openzeppelin-solidity/contracts
cd ../..

# Generate bindings
abigen --sol ./contracts/Bindings.sol -pkg bindings --out bindings.go

# Revert setup
sed -i.bak -e 's/".\/openzeppelin-solidity\/contracts\//"openzeppelin-solidity\/contracts\//' contracts/*.sol
sed -i.bak -e 's/"..\/openzeppelin-solidity\/contracts\//"openzeppelin-solidity\/contracts\//' contracts/*/*.sol
sed -i.bak -e 's/".\/republic-sol\/contracts\//"republic-sol\/contracts\//' contracts/*.sol
rm -r ./contracts/openzeppelin-solidity
rm -r ./contracts/republic-sol

rm contracts/*/*.bak
rm contracts/*.bak
