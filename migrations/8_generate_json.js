const fs = require("fs");

module.exports = async function (deployer, network, accounts) {
    const {
        // Republic
        DarknodeRegistryStore,
        DarknodeRegistry,
        DarknodeRewardVault,
        Orderbook,
        DarknodeSlasher,
        SettlementRegistry,

        // RenEx
        RenExBalances,
        RenExTokens,
        RenExSettlement,
        RenExBrokerVerifier,
        RenExAtomicSwapper,

        // Tokens
        RepublicToken,
        DGXToken,
        OMGToken,
        ZRXToken,
        TUSDToken,
    } = require("./artifacts")(network, artifacts);

    const addresses = {
        RepublicToken: RepublicToken.address,
        DarknodeRegistryStore: DarknodeRegistryStore.address,
        DarknodeRegistry: DarknodeRegistry.address,
        SettlementRegistry: SettlementRegistry.address,
        Orderbook: Orderbook.address,
        DarknodeRewardVault: DarknodeRewardVault.address,
        DarknodeSlasher: DarknodeSlasher.address,
        RenExTokens: RenExTokens.address,
        RenExBrokerVerifier: RenExBrokerVerifier.address,
        RenExBalances: RenExBalances.address,
        RenExSettlement: RenExSettlement.address,
        RenExAtomicSwapper: RenExAtomicSwapper.address,
        DGXToken: DGXToken.address,
        OMGToken: OMGToken.address,
        ZRXToken: ZRXToken.address,
        TUSDToken: TUSDToken.address,
    };

    console.log(JSON.stringify(addresses, null, "    "));

    fs.writeFile(`./build/${network}.json`, JSON.stringify(addresses, null, "    "), console.error);
};