var ERC20 = artifacts.require("./ERC20.sol");
var RASERC20 = artifacts.require("./RepublicAtomicSwapERC20.sol");
var RASEther = artifacts.require("./RepublicAtomicSwapEther.sol");

module.exports = function(deployer) {
//   deployer.deploy(ERC20);
  deployer.deploy(RASEther);
//   deployer.link(ERC20, RASERC20);
  deployer.deploy(RASERC20);
};
