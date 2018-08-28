// Dependencies
const DarknodeRegistryStore = artifacts.require("DarknodeRegistryStore.sol");
const DarknodeRegistry = artifacts.require("DarknodeRegistry.sol");
const DarknodeRewardVault = artifacts.require("DarknodeRewardVault.sol");
const Orderbook = artifacts.require("Orderbook.sol");
const DarknodeSlasher = artifacts.require("DarknodeSlasher.sol");

// Contracts
const RenExBalances = artifacts.require("RenExBalances.sol");
const RenExTokens = artifacts.require("RenExTokens.sol");
const RenExSettlement = artifacts.require("RenExSettlement.sol");
const RenExBrokerVerifier = artifacts.require("RenExBrokerVerifier");
const SettlementRegistry = artifacts.require("SettlementRegistry");

// Tokens
const RepublicToken = artifacts.require("RepublicToken.sol");
const DGXMock = artifacts.require("DGXMock.sol");
const ABCToken = artifacts.require("ABCToken.sol");
const XYZToken = artifacts.require("XYZToken.sol");

const RenExAtomicInfo = artifacts.require("RenExAtomicInfo.sol");
const RenExAtomicSwapper = artifacts.require("RenExAtomicSwapper.sol");

const config = require("./config.js");

module.exports = async function (deployer, network) {
    // Network is "development", "nightly", "falcon" or "f0"

    const darknodeRegistryStore = await DarknodeRegistryStore.at(DarknodeRegistryStore.address);
    const darknodeRegistry = await DarknodeRegistry.at(DarknodeRegistry.address);
    const settlementRegistry = await SettlementRegistry.at(SettlementRegistry.address);
    const orderbook = await Orderbook.at(Orderbook.address);
    const darknodeRewardVault = await DarknodeRewardVault.at(DarknodeRewardVault.address);
    const darknodeSlasher = await DarknodeSlasher.at(DarknodeSlasher.address);
    const renExTokens = await RenExTokens.at(RenExTokens.address);
    const renExBrokerVerifier = await RenExBrokerVerifier.at(RenExBrokerVerifier.address);
    const renExBalances = await RenExBalances.at(RenExBalances.address);
    const renExSettlement = await RenExSettlement.at(RenExSettlement.address);
    const renExAtomicInfo = await RenExAtomicInfo.at(RenExAtomicInfo.address);
    const renExAtomicSwapper = await RenExAtomicSwapper.at(RenExAtomicSwapper.address);

    // TODO: Does deployer expose the address it is using?
    const owner = await darknodeRegistry.owner();

    // DarknodeRegistryStore
    console.assert((await darknodeRegistryStore.VERSION()).match(network));
    console.assert(await darknodeRegistryStore.owner() === DarknodeRegistry.address);
    console.assert((await darknodeRegistryStore.ren()) === RepublicToken.address);

    // DarknodeRegistry
    console.assert((await darknodeRegistry.VERSION()).match(network));
    console.assert((await darknodeRegistry.ren()) === RepublicToken.address);
    console.assert((await darknodeRegistry.store()) === DarknodeRegistryStore.address);
    console.assert((await darknodeRegistry.owner()) === owner);

    // SettlementRegistry
    console.assert((await settlementRegistry.VERSION()).match(network));
    console.assert((await settlementRegistry.owner()) === owner);

    // Orderbook
    console.assert((await orderbook.VERSION()).match(network));
    console.assert((await orderbook.owner()) === owner);
    console.assert((await orderbook.darknodeRegistry()) === DarknodeRegistry.address);
    console.assert((await orderbook.settlementRegistry()) === SettlementRegistry.address);

    // DarknodeRewardVault
    console.assert((await darknodeRewardVault.VERSION()).match(network));
    console.assert((await darknodeRewardVault.owner()) === owner);
    console.assert((await darknodeRewardVault.darknodeRegistry()) === DarknodeRegistry.address);

    // DarknodeSlasher
    console.assert((await darknodeSlasher.VERSION()).match(network));
    console.assert((await darknodeSlasher.owner()) === owner);
    console.assert((await darknodeSlasher.trustedDarknodeRegistry()) === DarknodeRegistry.address);
    console.assert((await darknodeSlasher.trustedOrderbook()) === Orderbook.address);

    // RenExTokens
    console.assert((await renExTokens.VERSION()).match(network));
    console.assert((await renExTokens.owner()) === owner);

    // RenExBrokerVerifier
    console.assert((await renExBrokerVerifier.VERSION()).match(network));
    console.assert((await renExBrokerVerifier.owner()) === owner);
    console.assert((await renExBrokerVerifier.balancesContract()) === RenExBalances.address);

    // RenExBalances
    console.assert((await renExBalances.VERSION()).match(network));
    console.assert((await renExBalances.owner()) === owner);
    console.assert((await renExBalances.settlementContract()) === RenExSettlement.address);
    console.assert((await renExBalances.brokerVerifierContract()) === RenExBrokerVerifier.address);
    console.assert((await renExBalances.rewardVaultContract()) === DarknodeRewardVault.address);

    // RenExSettlement
    console.assert((await renExSettlement.VERSION()).match(network));
    console.assert((await renExSettlement.owner()) === owner);
    console.assert((await renExSettlement.orderbookContract()) === Orderbook.address);
    console.assert((await renExSettlement.renExTokensContract()) === RenExTokens.address);
    console.assert((await renExSettlement.renExBalancesContract()) === RenExBalances.address);
    console.assert((await renExSettlement.slasherAddress()) === config.SLASHER_ADDRESS.toLowerCase());
    // console.assert((await renExSettlement.submissionGasPriceLimit()) === owner);

    // RenExAtomicInfo
    console.assert((await renExAtomicInfo.VERSION()).match(network));
    console.assert((await renExAtomicInfo.owner()) === owner);
    console.assert((await renExAtomicInfo.orderbookContract()) === Orderbook.address);

    // RenExAtomicSwapper
    console.assert((await renExAtomicSwapper.VERSION()).match(network));
    // console.assert((await renExAtomicSwapper.owner()) === owner);
    
};