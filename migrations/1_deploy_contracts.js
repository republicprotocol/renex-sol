
var DarknodeRegistry = artifacts.require("DarknodeRegistry.sol");
var Orderbook = artifacts.require("Orderbook.sol");
var RenExBalances = artifacts.require("RenExBalances.sol");
var RewardVault = artifacts.require("RewardVault.sol");
var RenExTokens = artifacts.require("RenExTokens.sol");
var RenExSettlement = artifacts.require("RenExSettlement.sol");

var AtomicInfo = artifacts.require("AtomicInfo.sol");
var AtomicSwap = artifacts.require("AtomicSwap.sol");

var RepublicToken = artifacts.require("RepublicToken.sol");
var DGXMock = artifacts.require("DGXMock.sol");
// var ABCToken = artifacts.require("ABCToken.sol");
// var XYZToken = artifacts.require("XYZToken.sol");
const ABCToken = {};
const XYZToken = {};

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

    // Nightly
    RepublicToken.address = `0x15f692d6b9ba8cec643c7d16909e8acdec431bf6`;
    DGXMock.address = `0x092ece29781777604afac04887af30042c3bc5df`;
    ABCToken.address = `0x49fa7a3b9705fa8deb135b7ba64c2ab00ab915a1`;
    XYZToken.address = `0x6662449d05312afe0ca147db6eb155641077883f`;

    DarknodeRegistry.address = `0xb3972e45d16b0942ed34943fdde413190cf5b12a`;
    Orderbook.address = `0x8356e57aa32547685149a859293ad83c144b800c`;
    RewardVault.address = `0x7214c4584ab01e61355244e2325ab3f40aca4d85`;
    RenExTokens.address = `0x3672b60236b76d30b64455515efa38e06f64e3df`;
    RenExBalances.address = `0xc2c126e1eb32e6ad50c611fb92d009b4b4518b00`;
    RenExSettlement.address = `0xaa14f741b8dc7fc9166807144d881b016f0ee92f`;


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
            DarknodeRegistry,
            RepublicToken.address,
            BOND, // Bond
            POD_SIZE, // Pod
            EPOCH_BLOCKS, // Epoch
        ))

        .then(() => deployer.deploy(
            Orderbook,
            INGRESS_FEE, // Fee
            RepublicToken.address,
            DarknodeRegistry.address,
        ))

        .then(() => deployer.deploy(
            RewardVault, DarknodeRegistry.address
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
            RenExBalances, RewardVault.address,
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
            );
        })

        .then(async () => {
            const renExBalances = RenExBalances.at(RenExBalances.address);
            await renExBalances.updateRewardVault(RewardVault.address);
            await renExBalances.setRenExSettlementContract(RenExSettlement.address);
        })

        .then(() => deployer.deploy(
            AtomicInfo,
            Orderbook.address,
        ))

        .then(() => deployer.deploy(
            AtomicSwap
        ))
        ;
};

migration = async (deployer, network) => { }

module.exports = (deployer, network) => {
    migration(deployer, network).catch((err) => { console.error(err); throw err; });
};