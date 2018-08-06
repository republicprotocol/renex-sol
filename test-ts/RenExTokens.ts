const RepublicToken = artifacts.require("RepublicToken");
const RenExTokens = artifacts.require("RenExTokens");

import "./helper/testUtils";

contract("RenExTokens", function (accounts: string[]) {

    const ETH = 0x1;
    const REN = 0x10000;
    const tokens = [ETH, REN];

    let renExTokens, tokenInstances;

    beforeEach(async function () {
        tokenInstances = {
            [ETH]: { address: "0x0000000000000000000000000000000000000000", decimals: () => Promise.resolve(18) },
            [REN]: await RepublicToken.new(),
        };

        renExTokens = await RenExTokens.new();
    });

    it("owner can register and deregister tokens", async () => {
        for (const token of tokens) {
            const tokenDetails = await renExTokens.tokens(token);
            (tokenDetails.registered).should.be.false;
        }

        for (const token of tokens) {
            const address = tokenInstances[token].address;
            const decimals = await tokenInstances[token].decimals();

            // Register
            await renExTokens.registerToken(
                token,
                address,
                decimals
            );

            const tokenDetails = await renExTokens.tokens(token);
            (tokenDetails.addr).should.equal(address);
            (tokenDetails.decimals.toString()).should.equal(decimals.toString());
            (tokenDetails.registered).should.be.true;
        }
        for (const token of tokens) {
            const address = tokenInstances[token].address;
            const decimals = await tokenInstances[token].decimals();

            // Deregister
            await renExTokens.deregisterToken(token);

            const tokenDetails = await renExTokens.tokens(token);
            (tokenDetails.addr).should.equal(address);
            (tokenDetails.decimals.toString()).should.equal(decimals.toString());
            (tokenDetails.registered).should.be.false;
        }
    });

    it("only the owner can register and deregister", async () => {
        for (const token of tokens) {
            await renExTokens.registerToken(
                token,
                tokenInstances[token].address,
                await tokenInstances[token].decimals(),
                { from: accounts[1] }
            ).should.be.rejectedWith(null, /revert/); // not owner
        }

        for (const token of tokens) {
            await renExTokens.deregisterToken(
                token,
                { from: accounts[1] }
            ).should.be.rejectedWith(null, /revert/); // not owner
        }
    });

    it("can't register already registered token (as with deregistration)", async () => {
        const token = tokens[0];
        const address = tokenInstances[token].address;
        const decimals = await tokenInstances[token].decimals();

        // Never registered - can't deregister
        await renExTokens.deregisterToken(token)
            .should.be.rejectedWith(null, /not registered/);

        // Register
        await renExTokens.registerToken(token, address, decimals);

        // Already registered - can't register
        await renExTokens.registerToken(token, address, decimals)
            .should.be.rejectedWith(null, /already registered/);

        // Deregister
        await renExTokens.deregisterToken(token);

        // Already deregistered - can't deregister again
        await renExTokens.deregisterToken(token)
            .should.be.rejectedWith(null, /not registered/);
    });

    it("can't change details", async () => {
        const token1 = tokens[0];
        const address1 = tokenInstances[token1].address;
        const decimals1 = await tokenInstances[token1].decimals();

        // Register
        await renExTokens.registerToken(token1, address1, decimals1);

        // Deregister
        await renExTokens.deregisterToken(token1);

        // Attempt to reregister with different details
        await renExTokens.registerToken(token1, tokenInstances[tokens[1]].address, decimals1)
            .should.be.rejectedWith(null, /different address/);
        await renExTokens.registerToken(token1, address1, 1)
            .should.be.rejectedWith(null, /different decimals/);

        // Can reregister with the same details
        await renExTokens.registerToken(token1, address1, decimals1);

        const tokenDetails = await renExTokens.tokens(token1);
        (tokenDetails.addr).should.equal(address1);
        (tokenDetails.decimals.toString()).should.equal(decimals1.toString());
        (tokenDetails.registered).should.be.true;
    });
});