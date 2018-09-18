const Orderbook = artifacts.require("Orderbook");

const RenExAtomicInfo = artifacts.require("RenExAtomicInfo");
const RenExAtomicSwapper = artifacts.require("RenExAtomicSwapper");

const config = require("./config.js");

module.exports = async function (deployer, network) {

    const VERSION_STRING = `${network}-${config.VERSION}`;

    await deployer
        .then(() => deployer.deploy(
            RenExAtomicInfo,
            VERSION_STRING,
            Orderbook.address,
        ))

        .then(() => deployer.deploy(
            RenExAtomicSwapper,
            VERSION_STRING,
        ));
}