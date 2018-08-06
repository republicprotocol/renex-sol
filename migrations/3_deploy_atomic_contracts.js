
const Orderbook = artifacts.require("Orderbook.sol");

const RenExAtomicInfo = artifacts.require("RenExAtomicInfo.sol");
const RenExAtomicSwapper = artifacts.require("RenExAtomicSwapper.sol");

module.exports = async function (deployer, network) {
    await deployer
        .then(() => deployer.deploy(
            RenExAtomicInfo,
            Orderbook.address,
        ))

        .then(() => deployer.deploy(
            RenExAtomicSwapper
        ))
        ;
};
