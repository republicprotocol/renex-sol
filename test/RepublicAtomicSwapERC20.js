var RASERC20 = artifacts.require("./RepublicAtomicSwapERC20.sol");
var testERC20 = artifacts.require("./TestERC20.sol");

var contractAddress = "0x026950f443feb8be15bf0a3b878ba1fe23e0ab61";
var RASERAddress = "0x8bc790a583789367f72c9c59678ff85a00a5e5d0";

contract('RepublicAtomicSwapERC20', (accounts) => {

  const lock = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";
  const key = "0x42a990655bffe188c9823a2f914641a32dcbb1b28e8586bd29af291db7dcd4e8";

  it("Should create and check a new trade", async () => {
    const raser = await RASERC20.deployed();
    const token = await testERC20.deployed();
    await token.approve(raser.address, 1000, {from: accounts[0]});
    var allowance = await token.allowance(accounts[0],raser.address);
    assert.equal(1000,allowance)
    await raser.deposit(accounts[1],lock,token.address);
    var status = await raser.status(lock);
    assert.equal(status,true);
    var result = await raser.checkValue(lock);
    assert.equal(result[0].toNumber(),1000);
    assert.equal(result[1].toString(),token.address);
  });

  it("Should be able to withdraw tokens", async () => {
    const raser = await RASERC20.deployed();
    const token = await testERC20.deployed();
    const initialBalance = await token.balanceOf(accounts[1]);
    await raser.withdraw(key);
    const finalBalance = await token.balanceOf(accounts[1]);
    assert.equal(finalBalance.toNumber()-initialBalance.toNumber(), 1000)
  });
  // it("Should create and check a new trade", (done) => {
  //   RASERC20.deployed().then(instance => {
  //     console.log(contractAddress)
  //     return instance.testDeposit(contractAddress,{from: accounts[1]});
  //    //  return instance.checkValue(lock,{from: accounts[1]});
  //   }).then((res) => {
  //     assert.equal(res.toNumber(),10000);
  //     done();
  //   })
  //   .catch((err) => {
  //     done(err);
  //   })
  // });

  // it("Should be able to check the status of transaction", (done) => {
  //   RASERC20.deployed().then(instance => {
  //     return instance.status.call(lock);
  //     }
  //   ).then((res) => {
  //     assert.equal(res, true);
  //     done();
  //   }).catch((err) => {
  //     done(err);
  //   })
  // });

  // it("Should be able to withdraw ether", (done) => {
  //   RASERC20.deployed().then(instance => {
  //     instance.withdraw(key,{from: accounts[1]});
  //     return instance.status.call(lock);
  //     }
  //   ).then((res) => {
  //     assert.equal(res, false);
  //     done();
  //   }).catch((err) => {
  //     done(err);
  //   })
  // });

  // it("Should be able to check the signature of transaction", (done) => {
  //   RASERC20.deployed().then(instance => {
  //     return instance.checkSecretKey.call(lock,{from: accounts[1]});
  //     }
  //   ).then((res) => {
  //     assert.equal(res.toString(), key);
  //     done();
  //   }).catch((err) => {
  //     done(err);
  //   })
  // });
});

// contract('RepublicAtomicSwapERC20', (accounts) => {
//   it("Succesfully deployed the RASERC20 contract", (done) => {
//     testERC20.deployed().then(instance => {
//       return instance.balanceOf(RASERAddress);
//     }).then((res) => {
//       console.log(res.toNumber())
//       done();
//     }).catch((err) => {
//       done(err);
//     })
//   });
// })
