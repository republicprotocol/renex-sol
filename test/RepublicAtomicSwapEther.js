var RASEther = artifacts.require("./RepublicAtomicSwapEther.sol");


contract('RepublicAtomicSwapEther', () => {

  const lock = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";
  const key = "0x42a990655bffe188c9823a2f914641a32dcbb1b28e8586bd29af291db7dcd4e8";
  
  it("Should create and check a new trade", (done) => {
    RASEther.deployed().then(instance => {
      instance.deposit(accounts[1],lock,{from: accounts[0], gas: 3000000, value: 50000});
      return instance.checkValue.call(lock,{from: accounts[1]});
    }).then((res) => {
      assert.equal(res.toNumber(), 50000);
      done();
    }).catch((err) => {
      done(err);
    })
  });

  it("Should be able to check the status of transaction", (done) => {
    RASEther.deployed().then(instance => {
      return instance.status.call(lock);
      }
    ).then((res) => {
      assert.equal(res, true);
      done();
    }).catch((err) => {
      done(err);
    })
  });

  it("Should be able to withdraw ether", (done) => {
    RASEther.deployed().then(instance => {
      instance.withdraw(key,{from: accounts[1]});
      return instance.status.call(lock);
      }
    ).then((res) => {
      assert.equal(res, false);
      done();
    }).catch((err) => {
      done(err);
    })
  });

  it("Should be able to check the signature of transaction", (done) => {
    RASEther.deployed().then(instance => {
      return instance.checkSecretKey.call(lock,{from: accounts[1]});
      }
    ).then((res) => {
      assert.equal(res.toString(), key);
      done();
    }).catch((err) => {
      done(err);
    })
  });
});
