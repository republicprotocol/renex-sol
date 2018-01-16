var rasERC20 = artifacts.require("./RepublicAtomicSwapERC20.sol");
var Token1 = artifacts.require("./TestERC20.sol");
var Token2 = artifacts.require("./Den.sol");

contract('Atomic swap between erc20 and erc20', (accounts) => {
  const alice = accounts[3];
  const bob = accounts[4];
  const lock = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";
  const key = "0x42a990655bffe188c9823a2f914641a32dcbb1b28e8586bd29af291db7dcd4e8";

  it("Alice deposits erc20 into the contract", async () => {
    const rase = await rasERC20.deployed();
    const token = await Token1.deployed();
    await token.transfer(alice, 100000, {from: accounts[0]})
    await token.approve(rase.address, 100000, {from: alice});
    var allowance = await token.allowance(alice,rase.address);
    assert.equal(100000,allowance.toNumber())
    const initialBalance = await token.balanceOf(rase.address);
    await rase.deposit(bob,lock,token.address,100000,{from:alice});
    const finalBalance = await token.balanceOf(rase.address);
    assert.equal(100000, finalBalance.toNumber() - initialBalance.toNumber() )
  });

  it("Bob deposits erc20 tokens to the contract", async() => {
    const rase = await rasERC20.deployed();
    const token = await Token2.deployed();
    await token.transfer(bob, 99999, {from: accounts[0]})
    await token.approve(rase.address, 99999, {from: bob});
    var allowance = await token.allowance.call(bob,rase.address);
    assert.equal(99999,allowance.toNumber())
    const initialBalance = await token.balanceOf.call(rase.address);
    await rase.deposit(alice,lock,token.address,99999,{from:bob});
    const finalBalance = await token.balanceOf.call(rase.address);
    assert.equal(99999, finalBalance.toNumber() - initialBalance.toNumber())
  })


  it("Bob checks the erc20 in the lock box", async () => {
    const token = await Token1.deployed();
    const raser = await rasERC20.deployed();
    // var status = await raser.status(lock);
    // assert.equal(status,1);
    var result = await raser.peek(lock,{from:bob});
    // assert.equal(result[2].toNumber(),100000);
    assert.equal(result[4].toString(),token.address);

  })

  it("Alice checks the erc20 tokens in the lock box", async () => {
    const token = await Token2.deployed();
    const raser = await rasERC20.deployed();
    // var status = await raser.status(lock);
    // assert.equal(status,1);
    var result = await raser.peek.call(lock,{from:alice});
    assert.equal(result[2].toNumber(),99999);
    // assert.equal(result[4].toString(),token.address);
  })

    it("Alice withdraws her erc20 tokens revealing the secret", async () => {
      const raser = await rasERC20.deployed();
      const token = await Token2.deployed();
      const initialBalance = await token.balanceOf(alice);
      await raser.withdraw(key,{from:alice});
      const finalBalance = await token.balanceOf(alice);
      assert.equal(finalBalance.toNumber()-initialBalance.toNumber(), 99999)
    });
  
  
    it("Bob withdraws his erc20 after knowing the secret", async () => {
    const tokenTest = await Token1.deployed();
    const raserTest = await rasERC20.deployed();
    const secretKey = await raserTest.peekSecretKey(lock, {from:bob});
    assert.equal(key, secretKey);
    const initialBalanceTest = await tokenTest.balanceOf(bob);
    await raserTest.withdraw(key,{from:bob});
    const finalBalanceTest = await tokenTest.balanceOf(bob);
    assert.equal(finalBalanceTest.toNumber()-initialBalanceTest.toNumber(), 100000)

    });
});

