const atomicSwap = artifacts.require("./AtomicSwapEtherToERC20.sol");
const testERC20 = artifacts.require("./TestERC20.sol");

contract('Atomic swap between ether and erc20', (accounts) => {
  const alice = accounts[3];
  const bob = accounts[4];
  const swapID_swap = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";
  const swapID_expiry = "0xc3b89738306a66a399755e8535300c42b1423cac321938e7fe30b252abf8fe74";
  // Expected Trade:

  const etherValue = 50000;
  const erc20Value = 100000;

  it("Alice deposits ether into the contract", async () => {
    const swap = await atomicSwap.deployed();
    const token = await testERC20.deployed();  
    await swap.open(swapID_swap, erc20Value, bob, token.address, {from:alice, value: etherValue});
  });

  it("Bob checks the ether in the lock box", async () => {
    const swap = await atomicSwap.deployed();
    const token = await testERC20.deployed();
    const result  = await swap.check(swapID_swap);
    
    assert.equal(result[0].toNumber(),etherValue);
    assert.equal(result[1].toNumber(),erc20Value);
    assert.equal(result[2].toString(),bob);
    assert.equal(result[3].toString(),token.address);
  })

  it("Bob closes the swap", async() => {
    const swap = await atomicSwap.deployed();
    const token = await testERC20.deployed();
    await token.transfer(bob, 100000, {from: accounts[0]})
    await token.approve(swap.address, 100000, {from: bob});
    const allowance = await token.allowance(bob,swap.address);
    assert.equal(100000,allowance)
    await swap.close(swapID_swap);
  })
  
   it("Alice deposits ether into the contract", async () => {
    const swap = await atomicSwap.deployed();
    const token = await testERC20.deployed();
    await swap.open(swapID_expiry, bob, erc20Value, token.address, {from:alice, value: etherValue});
  });


  it("Alice withdraws after expiry", async () => {
    const swap = await atomicSwap.deployed();
    await swap.expire(swapID_expiry);
  })
});