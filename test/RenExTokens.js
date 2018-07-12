const RepublicToken = artifacts.require("RepublicToken");
const BitcoinMock = artifacts.require("BitcoinMock");
const DGXMock = artifacts.require("DGXMock");
const RenExTokens = artifacts.require("RenExTokens");

const chai = require("chai");
chai.use(require("chai-as-promised"));
chai.should();

contract("RenExTokens", function (accounts) {

    const BTC = 0x0;
    const ETH = 0x1;
    const DGX = 0x100;
    const REN = 0x10000;
    const tokens = [BTC, ETH, DGX, REN];

    let renExTokens, tokenInstances;

    beforeEach(async function () {
        tokenInstances = {
            [BTC]: await BitcoinMock.new(),
            [ETH]: { address: 0x0, decimals: () => Promise.resolve(18) },
            [DGX]: await DGXMock.new(),
            [REN]: await RepublicToken.new(),
        }

        renExTokens = await RenExTokens.new();
    });

    it("owner can register and deregister tokens", async () => {
        for (const token of tokens) {
            await renExTokens.registerToken(token, tokenInstances[token].address, await tokenInstances[token].decimals());
        }
        for (const token of tokens) {
            await renExTokens.deregisterToken(token);
        }
    })

    it("only the owner can register and deregister", async () => {
        for (const token of tokens) {
            await renExTokens.registerToken(
                token,
                tokenInstances[token].address,
                await tokenInstances[token].decimals(),
                { from: accounts[1] }
            ).should.be.rejected;
        }

        for (const token of tokens) {
            await renExTokens.deregisterToken(
                token,
                { from: accounts[1] }
            ).should.be.rejected;
        }
    })
});