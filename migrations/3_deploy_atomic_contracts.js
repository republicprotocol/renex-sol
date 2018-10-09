const RenExAtomicSwapper = artifacts.require("RenExAtomicSwapper");

module.exports = async function (deployer, network) {

    const config = require("./config.js")(network);

    const VERSION_STRING = `${network}-${config.version}`;

    await deployer
        .then(() => deployer.deploy(
            RenExAtomicSwapper,
            VERSION_STRING,
        ));
}