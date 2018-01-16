var atomicSwap = artifacts.require("./AtomicSwapEtherToERC20.sol");
var testERC20 = artifacts.require("./TestERC20.sol");
const Web3 = require('web3');
const web3 = new Web3( new Web3.providers.HttpProvider("http://localhost:8545"));

contract('Atomic swap between ether and erc20', (accounts) => {
  const alice = accounts[3];
  const bob = accounts[4];
  const matchID = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";
  // Expected Trade:

  const etherValue = 50000;
  const erc20Value = 100000;

  it("Alice deposits ether into the contract", async () => {
    const swap = await atomicSwap.deployed();
    const token = await testERC20.deployed();
    await swap.open(matchID, bob, erc20Value, token.address, {from:alice, value: etherValue});
  });

  it("Bob checks the ether in the lock box", async () => {
    const swap = await atomicSwap.deployed();
    const token = await testERC20.deployed();
    const result  = await swap.check(matchID);
    
    assert.equal(result[0].toNumber(),etherValue);
    assert.equal(result[1].toNumber(),erc20Value);
    assert.equal(result[2].toString(),token.address);
    assert.equal(result[3].toString(),bob);
  })

  it("Bob closes the swap", async() => {
    const swap = await atomicSwap.deployed();
    const token = await testERC20.deployed();
    await token.transfer(bob, 100000, {from: accounts[0]})
    await token.approve(swap.address, 100000, {from: bob});
    var allowance = await token.allowance(bob,swap.address);
    assert.equal(100000,allowance)
    await swap.close(matchID);
  })
  
});