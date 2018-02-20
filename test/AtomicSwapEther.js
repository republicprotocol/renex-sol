const atomicSwap = artifacts.require("./AtomicSwapEther.sol");

contract('Cross Chain Atomic Swap with Ether', (accounts) => {

  const lock = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";
  const key = "0x42a990655bffe188c9823a2f914641a32dcbb1b28e8586bd29af291db7dcd4e8";
  const swapID_swap = "0x0505915948dcd6756a8f5169e9c539b69d87d9a4b8f57cbb40867d9f91790211";
  const swapID_expiry = "0xc3b89738306a66a399755e8535300c42b1423cac321938e7fe30b252abf8fe74";
  
  it("Deposit ether into the contract", async () => {
    const swap = await atomicSwap.deployed();
    const timeout = 100; // seconds
    await swap.open(swapID_swap, accounts[0], lock, timeout, {from: accounts[0], value: 50000})
  });

  it("Check the ether in the lock box", async () => {
    const swap = await atomicSwap.deployed();
    const result  = await swap.check(swapID_swap);

    assert.equal(result[1].toNumber(),50000);
    assert.equal(result[2].toString(),accounts[0]);
    assert.equal(result[3].toString(),lock);
  })

  it("Withdraw the ether from the lockbox", async () => {
    const swap = await atomicSwap.deployed();
    await swap.close(swapID_swap, key);
  })

  it("Get secret key from the contract", async () => {
    const swap = await atomicSwap.deployed();
    const secretkey = await swap.checkSecretKey(swapID_swap);
    assert.equal(secretkey.toString(), key);
  })

  it("Deposit ether into the contract", async () => {
    const swap = await atomicSwap.deployed();
    const timeout = 2; // seconds
    await swap.open(swapID_expiry, accounts[0], lock, timeout, {from: accounts[0], value: 50000})
  });

  it("Withdraw after expiry", async () => {
    await new Promise((resolve, reject) => setTimeout(async () => {
      try {
        const swap = await atomicSwap.deployed();
        await swap.expire(swapID_expiry, {from: accounts[0]});
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 2 * 1000));
  });

});
