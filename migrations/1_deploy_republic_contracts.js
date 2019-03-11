module.exports = async function (deployer, network) {

    const {
        RepublicToken,
        DarknodeRegistryStore,
        DarknodeRegistry,
        DarknodeSlasher,
        Orderbook,
        DarknodeRewardVault,
        SettlementRegistry,
    } = require("./artifacts")(network, artifacts);

    const config = require("./config.js")(network);

    const VERSION_STRING = `${network}-${config.version}`;

    await deployer
        .deploy(RepublicToken)
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
            config.settings.republic.minimumBond,
            config.settings.republic.minimumPodSize,
            config.settings.republic.minimumEpochInterval,
        ))
        .then(() => deployer.deploy(
            SettlementRegistry,
            VERSION_STRING,
        ))
        .then(() => deployer.deploy(
            Orderbook,
            VERSION_STRING,
            DarknodeRegistry.address,
            SettlementRegistry.address,
        ))
        .then(() => deployer.deploy(
            DarknodeRewardVault,
            VERSION_STRING,
            DarknodeRegistry.address
        ))
        .then(async () => {
            // Initiate ownership transfer of DNR store 
            const darknodeRegistryStore = await DarknodeRegistryStore.at(DarknodeRegistryStore.address);
            await darknodeRegistryStore.transferOwnership(DarknodeRegistry.address);

            // Claim ownership
            const darknodeRegistry = await DarknodeRegistry.at(DarknodeRegistry.address);
            await darknodeRegistry.claimStoreOwnership();
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