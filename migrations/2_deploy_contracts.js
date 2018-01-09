var RASERC20 = artifacts.require("./RepublicAtomicSwapERC20.sol");
var RASEther = artifacts.require("./RepublicAtomicSwapEther.sol");
var RASERC721 = artifacts.require("./RepublicAtomicSwapERC721.sol");
var TestERC20 = artifacts.require("./TestERC20.sol");
var den = artifacts.require("./den.sol");
var TestERC721 = artifacts.require("./TestERC721.sol");
module.exports = function(deployer) {
  deployer.deploy(RASEther);
  deployer.deploy(RASERC20);
  deployer.deploy(den);
  deployer.deploy(RASERC721);
  deployer.deploy(TestERC20);
  deployer.deploy(TestERC721);
};
