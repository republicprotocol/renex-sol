// Contracts
const RenExTokens = artifacts.require("RenExTokens");

// Token contracts
const RepublicToken = artifacts.require("RepublicToken");
const DGXToken = artifacts.require("DGXToken");
const OMGToken = artifacts.require("OMGToken");
const ZRXToken = artifacts.require("ZRXToken");
const TUSDToken = artifacts.require("TrueUSD");

const config = require("./config.js");

module.exports = async function (deployer, network, accounts) {
    // Network is "development", "nightly", "testnet" or "mainnet"

    if (/mainnet/.test(network)) {
        DGXToken.address = "0x4f3AfEC4E5a3F2A6a1A411DEF7D7dFe50eE057bF";
        RepublicToken.address = "0x408e41876cCCDC0F92210600ef50372656052a38";
        TUSDToken.address = "0x8dd5fbCe2F6a956C3022bA3663759011Dd51e73E";
        ZRXToken.address = "0xE41d2489571d322189246DaFA5ebDe1F4699F498";
        OMGToken.address = "0xd26114cd6EE289AccF82350c8d8487fedB8A0C07";
    }

    // Register tokens with RenExTokens
    await deployer
        // ETH and BTC
        .then(async () => {
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(config.TOKEN_CODES.BTC, "0x0000000000000000000000000000000000000000", 8);
            await renExTokens.registerToken(config.TOKEN_CODES.ETH, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", 18);
        })
        // DGXToken
        .then(async () => {
            const token = await DGXToken.at(DGXToken.address);
            const decimals = (await token.decimals()).toNumber();
            console.assert(decimals === 9);
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(config.TOKEN_CODES.DGX, DGXToken.address, decimals);
        })
        // RepublicToken
        .then(async () => {
            const token = await RepublicToken.at(RepublicToken.address);
            const decimals = (await token.decimals()).toNumber();
            console.assert(decimals === 18);
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(config.TOKEN_CODES.REN, RepublicToken.address, decimals);
        })
        // OMGToken
        .then(async () => {
            const token = await OMGToken.at(OMGToken.address);
            const decimals = (await token.decimals()).toNumber();
            console.assert(decimals === 18);
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(config.TOKEN_CODES.OMG, token.address, decimals);
        })
        // ZRXToken
        .then(async () => {
            const token = await ZRXToken.at(ZRXToken.address);
            const decimals = (await token.decimals()).toNumber();
            console.assert(decimals === 18);
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(config.TOKEN_CODES.ZRX, token.address, decimals);
        })
        // TUSDToken
        .then(async () => {
            const token = await TUSDToken.at(TUSDToken.address);
            const decimals = (await token.decimals()).toNumber();
            console.assert(decimals === 18);
            const renExTokens = await RenExTokens.at(RenExTokens.address);
            await renExTokens.registerToken(config.TOKEN_CODES.TUSD, token.address, decimals);
        });
}