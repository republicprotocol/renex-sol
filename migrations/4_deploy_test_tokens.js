const BN = require("bn.js");

// Test tokens
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

    // Do not deploy test tokens on mainnet
    if (/mainnet/.test(network)) {
        return;
    }

    // Deploy mock tokens
    await deployer
        // DGX
        .then(() => deployer.deploy(DGXToken))

        // OMG
        .then(() => deployer.deploy(OMGToken))
        .then(async () => {
            const token = await OMGToken.at(OMGToken.address);
            const decimals = (await token.decimals()).toNumber();
            await token.mint(deployerAddress, toSmallestUnit(decimals, 140245398));
        })

        // ZRX
        .then(() => deployer.deploy(ZRXToken))

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
        });
}