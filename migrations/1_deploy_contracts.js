
const DarknodeRegistryStore = artifacts.require("DarknodeRegistryStore.sol");
const DarknodeRegistry = artifacts.require("DarknodeRegistry.sol");
const Orderbook = artifacts.require("Orderbook.sol");
const RenExBalances = artifacts.require("RenExBalances.sol");
const DarknodeRewardVault = artifacts.require("DarknodeRewardVault.sol");
const RenExTokens = artifacts.require("RenExTokens.sol");
const RenExSettlement = artifacts.require("RenExSettlement.sol");

const AtomicInfo = artifacts.require("AtomicInfo.sol");
const RenExAtomicSwapper = artifacts.require("RenExAtomicSwapper.sol");

const RepublicToken = artifacts.require("RepublicToken.sol");
const DGXMock = artifacts.require("DGXMock.sol");
const ABCToken = artifacts.require("ABCToken.sol");
const XYZToken = artifacts.require("XYZToken.sol");
// const ABCToken = {};
// const XYZToken = {};

let migration = async function (deployer, network) {
    // Network is "development", "nightly", "falcon" or "f0"
    if (network === "develop") {
        return;
    }

    const BOND = 100000 * 1e18;
    const INGRESS_FEE = 0;

    let POD_SIZE = 3;
    let EPOCH_BLOCKS = 1;
    switch (network) {
        case "nightly":
            POD_SIZE = 3;
            EPOCH_BLOCKS = 50;
            break;
        case "falcon":
            POD_SIZE = 6;
            EPOCH_BLOCKS = 600;
            break;
        case "f0":
            POD_SIZE = 9;
            EPOCH_BLOCKS = 50; // 14400;
            break;
    }

    console.log(`Using ${POD_SIZE} nodes per pod, ${EPOCH_BLOCKS} blocks per epoch, ${BOND / 1e18} REN bond and ${INGRESS_FEE / 1e18} REN ingress fee`)

    // REN
    await deployer
        .deploy(
            RepublicToken, { overwrite: network !== "f0" }
        )
        .then(() => deployer.deploy(
            DGXMock, { overwrite: network !== "f0" })
        )
        .then(() => deployer.deploy(
            ABCToken, { overwrite: network !== "f0" })
        )
        .then(() => deployer.deploy(
            XYZToken, { overwrite: network !== "f0" })
        )

        .then(() => deployer.deploy(
            DarknodeRegistryStore,
            RepublicToken.address,
        ))

        .then(() => deployer.deploy(
            DarknodeRegistry,
            RepublicToken.address,
            DarknodeRegistryStore.address,
            BOND, // Bond
            POD_SIZE, // Pod
            EPOCH_BLOCKS, // Epoch
        ))

        .then(async () => {
            const darknodeRegistryStore = DarknodeRegistryStore.at(DarknodeRegistryStore.address);
            await darknodeRegistryStore.transferOwnership(DarknodeRegistry.address);
        })

        .then(() => deployer.deploy(
            Orderbook,
            INGRESS_FEE, // Fee
            RepublicToken.address,
            DarknodeRegistry.address,
        ))

        .then(() => deployer.deploy(
            DarknodeRewardVault, DarknodeRegistry.address
        ))

        .then(() => deployer.deploy(
            RenExTokens,
            { overwrite: network !== "f0" },
        ))

        .then(async () => {
            const renExTokens = RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(0, "0x0000000000000000000000000000000000000000", 8);
            await renExTokens.registerToken(1, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", 18);
            await renExTokens.registerToken(0x100, DGXMock.address, 9);
            await renExTokens.registerToken(0x10000, RepublicToken.address, 18);
            await renExTokens.registerToken(0x10001, ABCToken.address, 12);
            await renExTokens.registerToken(0x10002, XYZToken.address, 18);
        })

        .then(() => deployer.deploy(
            RenExBalances, DarknodeRewardVault.address,
            { overwrite: network !== "f0" },
        ))

        .then(() => {
            const GWEI = 1000000000;
            return deployer.deploy(
                RenExSettlement,
                Orderbook.address,
                RenExTokens.address,
                RenExBalances.address,
                100 * GWEI,
                SlasherAddress,
            );
        })

        .then(async () => {
            const renExBalances = RenExBalances.at(RenExBalances.address);
            await renExBalances.updateRewardVault(DarknodeRewardVault.address);
            await renExBalances.updateRenExSettlementContract(RenExSettlement.address);
        })

        .then(() => deployer.deploy(
            AtomicInfo,
            Orderbook.address,
        ))

        .then(() => deployer.deploy(
            RenExAtomicSwapper
        ))
        ;
};

// migration = async (deployer, network) => { }

module.exports = (deployer, network) => {
    migration(deployer, network).catch((err) => { console.error(err); throw err; });
};