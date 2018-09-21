const RenExAtomicSwapper = artifacts.require("RenExAtomicSwapper");

const config = require("./config.js");

module.exports = async function (deployer, network) {

    const VERSION_STRING = `${network}-${config.VERSION}`;

    await deployer
        .then(() => deployer.deploy(
            RenExAtomicSwapper,
            VERSION_STRING,
        ));
}