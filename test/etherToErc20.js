var rasETH = artifacts.require("./RepublicAtomicSwapEther.sol");
var rasERC20 = artifacts.require("./RepublicAtomicSwapERC20.sol");
var testERC20 = artifacts.require("./TestERC20.sol");
const Web3 = require('web3');

contract('Atomic swap between ether and erc20', (accounts) => {
  const alice = accounts[3];
  const bob = accounts[4];
  const lock = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";
  const key = "0x42a990655bffe188c9823a2f914641a32dcbb1b28e8586bd29af291db7dcd4e8";


  it("Alice deposits ether into the contract", async () => {
    const rase = await rasETH.deployed();
    await rase.deposit(bob,lock, {from:alice, value: 50000});
  });

  it("Bob checks the ether in the lock box", async () => {
    const rase = await rasETH.deployed();
    var status = await rase.status(lock);
    assert.equal(status,true);
    var result = await rase.checkValue(lock,{from:bob});
    assert.equal(result.toNumber(),50000);
  })

  it("Bob deposits erc20 tokens to the contract", async() => {
    const rase = await rasERC20.deployed();
    const token = await testERC20.deployed();
    await token.transfer(bob, 100000, {from: accounts[0]})
    await token.approve(rase.address, 100000, {from: bob});
    var allowance = await token.allowance(bob,rase.address);
    assert.equal(100000,allowance)
    await rase.deposit(alice,lock,token.address,{from:bob});
  })

  it("Alice checks the erc20 tokens in the lock box", async () => {
    const token = await testERC20.deployed();
    const raser = await rasERC20.deployed();
    var status = await raser.status(lock);
    assert.equal(status,true);
    var result = await raser.checkValue(lock,{from:alice});
    assert.equal(result[0].toNumber(),100000);
    assert.equal(result[1].toString(),token.address);
  })

  it("Alice withdraws her tokens revealing the secret", async () => {
    const raser = await rasERC20.deployed();
    const token = await testERC20.deployed();
    const initialBalance = await token.balanceOf(alice);
    await raser.withdraw(key);
    const finalBalance = await token.balanceOf(alice);
    assert.equal(finalBalance.toNumber()-initialBalance.toNumber(), 100000)
  });

  it("Bob withdraws his ether after knowing the secret", async () => {

    const rase = await rasETH.deployed();
    const initialBalance = bob.balance;
    await rase.withdraw(key);
    const finalBalance = bob.balance;
    // assert.equal(finalBalance-initialBalance, 50000)
  });

});