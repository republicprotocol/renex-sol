module.exports = async function (deployer, network) {

    const {
        RenExAtomicSwapper,
    } = require("./artifacts")(network, artifacts);

    const config = require("./config.js")(network);

    const VERSION_STRING = `${network}-${config.version}`;

    await deployer
        .then(() => deployer.deploy(
            RenExAtomicSwapper,
            VERSION_STRING,
        ));
}