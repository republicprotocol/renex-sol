
const Orderbook = artifacts.require("Orderbook.sol");

const AtomicInfo = artifacts.require("AtomicInfo.sol");
const RenExAtomicSwapper = artifacts.require("RenExAtomicSwapper.sol");

module.exports = async function (deployer, network) {
    await deployer
        .then(() => deployer.deploy(
            AtomicInfo,
            Orderbook.address,
        ))

        .then(() => deployer.deploy(
            RenExAtomicSwapper
        ))
        ;
};
