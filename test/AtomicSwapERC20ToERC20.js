const atomicSwap = artifacts.require("./AtomicSwapERC20ToERC20.sol");
const openTestERC20 = artifacts.require("./TestERC20.sol");
const closeTestERC20 = artifacts.require("./Test2ERC20.sol");
const Web3 = require('web3');
const web3 = new Web3( new Web3.providers.HttpProvider("http://localhost:8545"));

contract('Atomic swap between ether and erc20', (accounts) => {
  const alice = accounts[0];
  const bob = accounts[1];
  const swapID_swap = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";
  const swapID_expiry = "0xc3b89738306a66a399755e8535300c42b1423cac321938e7fe30b252abf8fe74";
  // Expected Trade:

  const openValue = 50000;
  const closeValue = 100000;
  
  it("Alice deposits ether into the contract", async () => {
    const swap = await atomicSwap.deployed();
    const openToken = await openTestERC20.deployed();  
    const closeToken = await closeTestERC20.deployed();  
    await openToken.approve(swap.address, openValue);
    await swap.open(swapID_swap, openValue, openToken.address, closeValue, bob, closeToken.address, {from:alice});
  });

  it("Bob checks the ether in the lock box", async () => {
    const swap = await atomicSwap.deployed();
    const openToken = await openTestERC20.deployed();  
    const closeToken = await closeTestERC20.deployed();  
    const result  = await swap.check(swapID_swap);
    
    assert.equal(result[0].toNumber(),openValue);
    assert.equal(result[1].toString(),openToken.address);
    assert.equal(result[2].toNumber(),closeValue);
    assert.equal(result[3].toString(),bob);
    assert.equal(result[4].toString(),closeToken.address);
  })

  it("Bob closes the swap", async() => {
    const swap = await atomicSwap.deployed();
    const openToken = await openTestERC20.deployed();  
    const closeToken = await closeTestERC20.deployed();  
    await closeToken.transfer(bob, 100000, {from: alice})
    await closeToken.approve(swap.address, 100000, {from: bob});
    const allowance = await closeToken.allowance(bob,swap.address);
    assert.equal(100000,allowance)
    await swap.close(swapID_swap);
  })
  
  it("Alice deposits ether into the contract", async () => {
    const swap = await atomicSwap.deployed();
    const openToken = await openTestERC20.deployed();  
    const closeToken = await closeTestERC20.deployed();  
    await openToken.approve(swap.address, openValue);
    await swap.open(swapID_expiry, openValue, openToken.address, closeValue, bob, closeToken.address, {from:alice});
  });

  it("Alice withdraws after expiry", async () => {
    const swap = await atomicSwap.deployed();
    await swap.expire(swapID_expiry);
  })
});