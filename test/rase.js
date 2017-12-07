var RASEther = artifacts.require("./RepublicAtomicSwapEther.sol");


contract('RepublicAtomicSwapEther', function() {
  it("Should create a new trade", function(){
    return RASEther.deployed().then()(function(instance){
      return instance.depositEther(accounts[0],"42a990655bffe188c9823a2f914641a32dcbb1b28e8586bd29af291db7dcd4e8",{from: accounts[0], gas: 3000000, value: 10000});
      }
    ).then((res) => {
      console.log(res)
    }).catch((err) => {
      console.error(err);
    })
  }) 
});


