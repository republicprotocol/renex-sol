const RepublicToken = artifacts.require("RepublicToken");
const DarknodeRegistryStore = artifacts.require("DarknodeRegistryStore");
const DarknodeRegistry = artifacts.require("DarknodeRegistry");
const DarknodeSlasher = artifacts.require("DarknodeSlasher");
const Orderbook = artifacts.require("Orderbook");
const DarknodeRewardVault = artifacts.require("DarknodeRewardVault");
const SettlementRegistry = artifacts.require("SettlementRegistry");

const config = require("./config.js");

module.exports = async function (deployer, network) {

    const VERSION_STRING = `${network}-${config.VERSION}`;

    await deployer
        .deploy(
            RepublicToken, {
                overwrite: network === "development"
            }
        )
        .then(() => deployer.deploy(
            DarknodeRegistryStore,
            VERSION_STRING,
            RepublicToken.address,
        ))
        .then(() => deployer.deploy(
            DarknodeRegistry,
            VERSION_STRING,
            RepublicToken.address,
            DarknodeRegistryStore.address,
            config.MINIMUM_BOND,
            config.MINIMUM_POD_SIZE,
            config.MINIMUM_EPOCH_INTERVAL
        ))
        .then(() => deployer.deploy(
            SettlementRegistry,
            VERSION_STRING,
        ))
        .then(() => deployer.deploy(
            Orderbook,
            VERSION_STRING,
            RepublicToken.address,
            DarknodeRegistry.address,
            SettlementRegistry.address,
        ))
        .then(() => deployer.deploy(
            DarknodeRewardVault,
            VERSION_STRING,
            DarknodeRegistry.address
        ))
        .then(async () => {
            const darknodeRegistryStore = await DarknodeRegistryStore.at(DarknodeRegistryStore.address);
            await darknodeRegistryStore.transferOwnership(DarknodeRegistry.address);
        })
        .then(() => deployer.deploy(
            DarknodeSlasher,
            VERSION_STRING,
            DarknodeRegistry.address,
            Orderbook.address,
        ))
        .then(async () => {
            const darknodeRegistry = await DarknodeRegistry.at(DarknodeRegistry.address);
            await darknodeRegistry.updateSlasher(DarknodeSlasher.address);
        });
}