const fs = require("fs");

// Republic
const DarknodeRegistryStore = artifacts.require("DarknodeRegistryStore");
const DarknodeRegistry = artifacts.require("DarknodeRegistry");
const DarknodeRewardVault = artifacts.require("DarknodeRewardVault");
const Orderbook = artifacts.require("Orderbook");
const DarknodeSlasher = artifacts.require("DarknodeSlasher");
const SettlementRegistry = artifacts.require("SettlementRegistry");

// RenEx
const RenExBalances = artifacts.require("RenExBalances");
const RenExTokens = artifacts.require("RenExTokens");
const RenExSettlement = artifacts.require("RenExSettlement");
const RenExBrokerVerifier = artifacts.require("RenExBrokerVerifier");
const RenExAtomicSwapper = artifacts.require("RenExAtomicSwapper");

// Tokens
const RepublicToken = artifacts.require("RepublicToken");
const DGXToken = artifacts.require("DGXToken");
const OMGToken = artifacts.require("OMGToken");
const ZRXToken = artifacts.require("ZRXToken");
const TUSDToken = artifacts.require("TrueUSD");

module.exports = async function (deployer, network, accounts) {
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