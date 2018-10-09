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

module.exports = async function (deployer, network, accounts) {
    // Network is "development", "nightly", "testnet" or "mainnet"

    const config = require("./config.js")(network);

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

        let contractOwnerAddress = config.owner || accounts[0];

        console.assert(!!contractOwnerAddress);

        await darknodeRegistry.transferOwnership(contractOwnerAddress);
        await settlementRegistry.transferOwnership(contractOwnerAddress);
        await orderbook.transferOwnership(contractOwnerAddress);
        await darknodeRewardVault.transferOwnership(contractOwnerAddress);
        await darknodeSlasher.transferOwnership(contractOwnerAddress);
        await renExTokens.transferOwnership(contractOwnerAddress);
        await renExBrokerVerifier.transferOwnership(contractOwnerAddress);
        await renExBalances.transferOwnership(contractOwnerAddress);
        await renExSettlement.transferOwnership(contractOwnerAddress);
    });
};