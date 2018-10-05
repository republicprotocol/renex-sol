// Dependencies
const DarknodeRewardVault = artifacts.require("DarknodeRewardVault");
const Orderbook = artifacts.require("Orderbook");

// Contracts
const RenExBalances = artifacts.require("RenExBalances");
const RenExTokens = artifacts.require("RenExTokens");
const RenExSettlement = artifacts.require("RenExSettlement");
const RenExBrokerVerifier = artifacts.require("RenExBrokerVerifier");
const SettlementRegistry = artifacts.require("SettlementRegistry");

// Tokens
const RepublicToken = artifacts.require("RepublicToken");

const config = require("./config.js");

module.exports = async function (deployer, network) {
    // Network is "development", "nightly", "falcon" or "f0"

    const VERSION_STRING = `${network}-${config.VERSION}`;

    await deployer

        .then(() => deployer.deploy(
            RenExTokens,
            VERSION_STRING,
        ))

        .then(async () => {
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(0, "0x0000000000000000000000000000000000000000", 8);
            await renExTokens.registerToken(1, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", 18);
        })

        .then(() => deployer.deploy(
            RenExBrokerVerifier,
            VERSION_STRING,
        ))

        .then(() => deployer.deploy(
            RenExBalances,
            VERSION_STRING,
            DarknodeRewardVault.address,
            RenExBrokerVerifier.address,
        ))

        .then(async () => {
            const renExBrokerVerifier = await RenExBrokerVerifier.at(RenExBrokerVerifier.address);
            await renExBrokerVerifier.updateBalancesContract(RenExBalances.address);
        })

        .then(() => deployer.deploy(
            RenExSettlement,
            VERSION_STRING,
            Orderbook.address,
            RenExTokens.address,
            RenExBalances.address,
            config.SLASHER_ADDRESS,
            config.SUBMIT_ORDER_GAS_LIMIT,
        ))

        .then(async () => {
            const renExBalances = await RenExBalances.at(RenExBalances.address);
            await renExBalances.updateRewardVaultContract(DarknodeRewardVault.address);
            await renExBalances.updateRenExSettlementContract(RenExSettlement.address);
        })

        .then(async () => {
            const settlementRegistry = await SettlementRegistry.at(SettlementRegistry.address);
            // Register RenEx
            await settlementRegistry.registerSettlement(1, RenExSettlement.address, RenExBrokerVerifier.address);
            // Register RenExAtomic
            await settlementRegistry.registerSettlement(2, RenExSettlement.address, RenExBrokerVerifier.address);
        });
}