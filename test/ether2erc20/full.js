var atomicSwap = artifacts.require("./AtomicSwapEtherToERC20.sol");
var testERC20 = artifacts.require("./TestERC20.sol");
const Web3 = require('web3');
const web3 = new Web3( new Web3.providers.HttpProvider("http://localhost:8545"));

contract('Atomic swap between ether and erc20 FULL SWAP', (accounts) => {
  const alice = accounts[3];
  const bob = accounts[4];
  const matchID = "0x42a990655bffe188c9823a2f914641a32dcbb1b28e8586bd29af291db7dcd4e8";
  // Expected Trade:

  const etherValue = 5000000;
  const erc20Value = 100000;

  it("Swap is successful", async() => {
    const swap = await atomicSwap.deployed();
    const token = await testERC20.deployed();
    await token.transfer(bob, 100000, {from: accounts[0]})

    const aliceInitialEtherBalance = await web3.eth.getBalance(alice);
    const bobInitialEtherBalance = await web3.eth.getBalance(bob);
    const aliceErc20Balance = await token.balanceOf(alice);
    const aliceInitialErc20Balance = aliceErc20Balance.toNumber();
    const bobErc20Balance = await token.balanceOf(bob);
    const bobInitialErc20Balance = bobErc20Balance.toNumber();

    await swap.open(matchID, bob, erc20Value, token.address, {from:alice, value: etherValue});
    const result  = await swap.check(matchID);
    assert.equal(result[0].toNumber(),etherValue);
    assert.equal(result[1].toNumber(),erc20Value);
    assert.equal(result[2].toString(),token.address);
    assert.equal(result[3].toString(),bob);
    await token.approve(swap.address, 100000, {from: bob});
    await swap.close(matchID);
    
    const aliceFinalEtherBalance = await web3.eth.getBalance(alice);
    const bobFinalEtherBalance = await web3.eth.getBalance(bob);
    const aliceErc20Balance2 = await token.balanceOf(alice);
    const aliceFinalErc20Balance = aliceErc20Balance2.toNumber();
    const bobErc20Balance2 = await token.balanceOf(bob);
    const bobFinalErc20Balance = bobErc20Balance2.toNumber();

    // Ether values cannot be asserted as we have gas value.
    // assert(aliceInitialEtherBalance - aliceFinalEtherBalance, etherValue)
    // assert(bobFinalEtherBalance - bobInitialEtherBalance, etherValue)
    assert.equal(bobInitialErc20Balance - bobFinalErc20Balance, erc20Value)
    assert.equal(aliceFinalErc20Balance - aliceInitialErc20Balance, erc20Value)

  })
});