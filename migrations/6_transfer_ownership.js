// Dependencies
const DarknodeRegistry = artifacts.require("DarknodeRegistry");
const DarknodeRewardVault = artifacts.require("DarknodeRewardVault");
const Orderbook = artifacts.require("Orderbook");
const DarknodeSlasher = artifacts.require("DarknodeSlasher");

// Contracts
const RenExBalances = artifacts.require("RenExBalances");
const RenExTokens = artifacts.require("RenExTokens");
const RenExSettlement = artifacts.require("RenExSettlement");
const RenExBrokerVerifier = artifacts.require("RenExBrokerVerifier");
const SettlementRegistry = artifacts.require("SettlementRegistry");

const config = require("./config.js");

module.exports = async function (deployer, network, accounts) {
    // Network is "development", "nightly", "falcon" or "f0"

    await deployer.then(async () => {

        const darknodeRegistry = await DarknodeRegistry.at(DarknodeRegistry.address);
        const settlementRegistry = await SettlementRegistry.at(SettlementRegistry.address);
        const orderbook = await Orderbook.at(Orderbook.address);
        const darknodeRewardVault = await DarknodeRewardVault.at(DarknodeRewardVault.address);
        const darknodeSlasher = await DarknodeSlasher.at(DarknodeSlasher.address);
        const renExTokens = await RenExTokens.at(RenExTokens.address);
        const renExBrokerVerifier = await RenExBrokerVerifier.at(RenExBrokerVerifier.address);
        const renExBalances = await RenExBalances.at(RenExBalances.address);
        const renExSettlement = await RenExSettlement.at(RenExSettlement.address);

        let newOwner = accounts[0];
        if (/mainnet/.test(network)) {
            newOwner = config.OWNER_ADDRESS;
        }

        console.assert(!!newOwner);

        await darknodeRegistry.transferOwnership(newOwner);
        await settlementRegistry.transferOwnership(newOwner);
        await orderbook.transferOwnership(newOwner);
        await darknodeRewardVault.transferOwnership(newOwner);
        await darknodeSlasher.transferOwnership(newOwner);
        await renExTokens.transferOwnership(newOwner);
        await renExBrokerVerifier.transferOwnership(newOwner);
        await renExBalances.transferOwnership(newOwner);
        await renExSettlement.transferOwnership(newOwner);
    });
};