const Orderbook = artifacts.require("Orderbook.sol");
const RenExBalances = artifacts.require("RenExBalances.sol");
const DarknodeRewardVault = artifacts.require("DarknodeRewardVault.sol");
const RenExTokens = artifacts.require("RenExTokens.sol");
const RenExSettlement = artifacts.require("RenExSettlement.sol");

const RepublicToken = artifacts.require("RepublicToken.sol");
const DGXMock = artifacts.require("DGXMock.sol");
const ABCToken = artifacts.require("ABCToken.sol");
const XYZToken = artifacts.require("XYZToken.sol");

const config = require("./config.js");

module.exports = async function (deployer, network) {
    // Network is "development", "nightly", "falcon" or "f0"

    await deployer
        .then(() => deployer.deploy(DGXMock))
        .then(() => deployer.deploy(ABCToken))
        .then(() => deployer.deploy(XYZToken))

        .then(() => deployer.deploy(RenExTokens))

        .then(async () => {
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(0, "0x0000000000000000000000000000000000000000", 8);
            await renExTokens.registerToken(1, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", 18);
            await renExTokens.registerToken(0x100, DGXMock.address, 9);
            await renExTokens.registerToken(0x10000, RepublicToken.address, 18);
            await renExTokens.registerToken(0x10001, ABCToken.address, 12);
            await renExTokens.registerToken(0x10002, XYZToken.address, 18);
        })

        .then(() => deployer.deploy(RenExBalances, DarknodeRewardVault.address))

        .then(() => {
            return deployer.deploy(
                RenExSettlement,
                Orderbook.address,
                RenExTokens.address,
                RenExBalances.address,
                config.SLASHER_ADDRESS,
                config.SUBMIT_ORDER_GAS_LIMIT,
            );
        })

        .then(async () => {
            const renExBalances = await RenExBalances.at(RenExBalances.address);
            await renExBalances.updateRewardVault(DarknodeRewardVault.address);
            await renExBalances.updateRenExSettlementContract(RenExSettlement.address);
        })
        ;
};
