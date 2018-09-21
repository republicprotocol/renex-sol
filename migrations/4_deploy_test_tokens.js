/*

These tokens are for testing that the RenEx contracts are compatible with a wide variety of token contracts.

*/

const BN = require("bn.js");

// Contracts
const RenExTokens = artifacts.require("RenExTokens");

// Test tokens
const RepublicToken = artifacts.require("RepublicToken");
const DGXToken = artifacts.require("DGXToken");
const OMGToken = artifacts.require("OMGToken");
const ZRXToken = artifacts.require("ZRXToken");
const TUSDToken = artifacts.require("TrueUSD");
const TUSD_BalanceSheet = artifacts.require("TUSD_BalanceSheet");
const TUSD_AllowanceSheet = artifacts.require("TUSD_AllowanceSheet");
const TUSD_AddressList = artifacts.require("TUSD_AddressList");

const toSmallestUnit = (decimals, value) => {
    return new BN(value).mul(new BN(10).pow(new BN(decimals))).toString()
}

module.exports = async function (deployer, network, accounts) {
    // Network is "development", "nightly", "f0" or "mainnet"

    const deployerAddress = accounts[0];

    const DGX_CODE = 0x100;
    const TUSD_CODE = 0x101;
    const REN_CODE = 0x10000;
    const ZRX_CODE = 0x10001;
    const OMG_CODE = 0x10002;

    if (network === "mainnet") {
        DGXToken.address = "0x4f3AfEC4E5a3F2A6a1A411DEF7D7dFe50eE057bF";
        RepublicToken.address = "0x408e41876cCCDC0F92210600ef50372656052a38";
        TUSDToken.address = "0x8dd5fbCe2F6a956C3022bA3663759011Dd51e73E";
        ZRXToken.address = "0xE41d2489571d322189246DaFA5ebDe1F4699F498";
        OMGToken.address = "0xd26114cd6EE289AccF82350c8d8487fedB8A0C07";
    }

    await deployer
        // DGX
        .then(() => deployer.deploy(DGXToken))
        .then(async () => {
            const token = await DGXToken.at(DGXToken.address);
            const decimals = (await token.decimals()).toNumber();
            console.assert(decimals === 9);
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(DGX_CODE, DGXToken.address, decimals);
        })

        // REN
        // .then(() => deployer.deploy(RepublicToken))
        .then(async () => {
            const token = await RepublicToken.at(RepublicToken.address);
            const decimals = (await token.decimals()).toNumber();
            console.assert(decimals === 18);
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(REN_CODE, RepublicToken.address, decimals);
        })

        // OMG
        .then(() => deployer.deploy(OMGToken))
        .then(async () => {
            const token = await OMGToken.at(OMGToken.address);
            const decimals = (await token.decimals()).toNumber();
            await token.mint(deployerAddress, toSmallestUnit(decimals, 140245398));
        })
        .then(async () => {
            const token = await OMGToken.at(OMGToken.address);
            const decimals = (await token.decimals()).toNumber();
            console.assert(decimals === 18);
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(OMG_CODE, token.address, decimals);
        })


        // ZRX
        .then(() => deployer.deploy(ZRXToken))
        .then(async () => {
            const token = await ZRXToken.at(ZRXToken.address);
            const decimals = (await token.decimals()).toNumber();
            console.assert(decimals === 18);
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(ZRX_CODE, token.address, decimals);
        })


        // TUSD
        .then(() => deployer.deploy(TUSD_BalanceSheet))
        .then(() => deployer.deploy(TUSD_AllowanceSheet))
        // .then(() => deployer.deploy(TUSD_AddressList, "WITH", false))
        // .then(() => deployer.deploy(TUSD_AddressList, "WITHOUT", false))
        .then(() => deployer.deploy(TUSDToken))
        .then(async () => {
            const balances = await TUSD_BalanceSheet.at(TUSD_BalanceSheet.address);
            const allowances = await TUSD_AllowanceSheet.at(TUSD_AllowanceSheet.address);
            const addressListWithDeployer = await deployer.deploy(TUSD_AddressList, "WITH", false);
            const addressListWithoutDeployer = await deployer.deploy(TUSD_AddressList, "WITHOUT", false);

            const token = await TUSDToken.at(TUSDToken.address);
            await addressListWithDeployer.changeList(deployerAddress, true);
            await token.setLists(
                addressListWithDeployer.address, // mint whitelist
                addressListWithDeployer.address, // burn whitelist
                addressListWithoutDeployer.address, // transfer blacklist
                addressListWithoutDeployer.address, // no-fees list
            );
            await balances.transferOwnership(token.address)
            await allowances.transferOwnership(token.address)
            await token.setBalanceSheet(balances.address);
            await token.setAllowanceSheet(allowances.address);
            const decimals = (await token.decimals()).toNumber();
            await token.mint(deployerAddress, toSmallestUnit(decimals, 91259614));
        })
        .then(async () => {
            const token = await TUSDToken.at(TUSDToken.address);
            const decimals = (await token.decimals()).toNumber();
            console.assert(decimals === 18);
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(TUSD_CODE, token.address, decimals);
        });
}