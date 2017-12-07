var RASERC20 = artifacts.require("./RepublicAtomicSwapERC20.sol");
var RASEther = artifacts.require("./RepublicAtomicSwapEther.sol");
var RASERC721 = artifacts.require("./RepublicAtomicSwapERC721.sol");

module.exports = function(deployer) {
  deployer.deploy(RASEther);
  deployer.deploy(RASERC20);
  deployer.deploy(RASERC721);
};
