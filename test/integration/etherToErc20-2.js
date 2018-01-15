var atomicSwap = artifacts.require("./AtomicSwapEtherToERC20.sol");
var testERC20 = artifacts.require("./TestERC20.sol");
const Web3 = require('web3');
const web3 = new Web3( new Web3.providers.HttpProvider("http://localhost:8545");

contract('Atomic swap between ether and erc20', (accounts) => {
  const alice = accounts[3];
  const bob = accounts[4];
  const matchID = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";
  const matchID_int = "0x42a990655bffe188c9823a2f914641a32dcbb1b28e8586bd29af291db7dcd4e8";
  // Expected Trade:

  const etherValue = 50000;
  const erc20Value = 100000;

  // it("Alice deposits ether into the contract", async () => {
  //   const swap = await atomicSwap.deployed();
  //   const token = await testERC20.deployed();
  //   await swap.open(matchID, bob, erc20Value, token.address, {from:alice, value: etherValue});
  // });

  // it("Bob checks the ether in the lock box", async () => {
  //   const swap = await atomicSwap.deployed();
  //   const token = await testERC20.deployed();
  //   const result  = await swap.check(matchID);
    
  //   assert.equal(result[0].toNumber(),etherValue);
  //   assert.equal(result[1].toNumber(),erc20Value);
  //   assert.equal(result[2].toString(),token.address);
  //   assert.equal(result[3].toString(),bob);
  // })

  // it("Bob closes the swap", async() => {
  //   const swap = await atomicSwap.deployed();
  //   const token = await testERC20.deployed();
  //   await token.transfer(bob, 100000, {from: accounts[0]})
  //   await token.approve(swap.address, 100000, {from: bob});
  //   var allowance = await token.allowance(bob,swap.address);
  //   assert.equal(100000,allowance)
  //   await swap.close(matchID);
  // })

  it("Swap is successful", async() => {
    const swap = await atomicSwap.deployed();
    const token = await testERC20.deployed();
    await token.transfer(bob, 100000, {from: accounts[0]})

    const aliceInitialEtherBalance = alice.balance;
    const bobInitialEtherBalance = bob.balance;
    const aliceErc20Balance = await token.balanceOf(alice);
    const aliceInitialErc20Balance = aliceErc20Balance.toNumber();
    const bobErc20Balance = await token.balanceOf(bob);
    const bobInitialErc20Balance = bobErc20Balance.toNumber();

    await swap.open(matchID_int, bob, erc20Value, token.address, {from:alice, value: etherValue});
    const result  = await swap.check(matchID_int);
    assert.equal(result[0].toNumber(),etherValue);
    assert.equal(result[1].toNumber(),erc20Value);
    assert.equal(result[2].toString(),token.address);
    assert.equal(result[3].toString(),bob);
    await token.approve(swap.address, 100000, {from: bob});
    await swap.close(matchID_int);
    
    const aliceFinalEtherBalance = alice.balance;
    const bobFinalEtherBalance = bob.balance;
    const aliceErc20Balance2 = await token.balanceOf(alice);
    const aliceFinalErc20Balance = aliceErc20Balance2.toNumber();
    const bobErc20Balance2 = await token.balanceOf(bob);
    const bobFinalErc20Balance = bobErc20Balance2.toNumber();

    // assert.equal(aliceInitialEtherBalance - aliceFinalEtherBalance, etherValue)
    // assert.equal(bobFinalEtherBalance - bobInitialEtherBalance, etherValue)
    assert.equal(bobInitialErc20Balance - bobFinalErc20Balance, erc20Value)
    assert.equal(aliceFinalErc20Balance - aliceInitialErc20Balance, erc20Value)


  })
});