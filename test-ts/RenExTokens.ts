import { BN } from "bn.js";

import * as testUtils from "./helper/testUtils";

import { RenExTokensArtifact, RenExTokensContract } from "./bindings/ren_ex_tokens";
import { RepublicTokenArtifact } from "./bindings/republic_token";

const RepublicToken = artifacts.require("RepublicToken") as RepublicTokenArtifact;
const RenExTokens = artifacts.require("RenExTokens") as RenExTokensArtifact;

contract("RenExTokens", function (accounts: string[]) {

    const tokens = [testUtils.TOKEN_CODES.ETH, testUtils.TOKEN_CODES.REN];

    let renExTokens: RenExTokensContract;
    let tokenInstances: Map<number, testUtils.BasicERC20>;

    before(async function () {
        tokenInstances = new Map()
            .set(testUtils.TOKEN_CODES.ETH, { address: testUtils.Ox0, decimals: () => Promise.resolve(18) })
            .set(testUtils.TOKEN_CODES.REN, await RepublicToken.new());

        renExTokens = await RenExTokens.new("VERSION");
    });

    it("owner can register and deregister tokens", async () => {
        for (const token of tokens) {
            const tokenDetails = await renExTokens.tokens(token);
            (tokenDetails.registered).should.be.false;
        }

        for (const token of tokens) {
            const address = tokenInstances.get(token).address;
            const decimals = new BN(await tokenInstances.get(token).decimals());

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
            const address = tokenInstances.get(token).address;
            const decimals = new BN(await tokenInstances.get(token).decimals());

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
                tokenInstances.get(token).address,
                new BN(await tokenInstances.get(token).decimals()),
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
        const address = tokenInstances.get(token).address;
        const decimals = await tokenInstances.get(token).decimals();

        // Never registered - can't deregister
        await renExTokens.deregisterToken(token)
            .should.be.rejectedWith(null, /not registered/);

        // Register
        await renExTokens.registerToken(token, address, new BN(decimals));

        // Already registered - can't register
        await renExTokens.registerToken(token, address, new BN(decimals))
            .should.be.rejectedWith(null, /already registered/);

        // Deregister
        await renExTokens.deregisterToken(token);

        // Already deregistered - can't deregister again
        await renExTokens.deregisterToken(token)
            .should.be.rejectedWith(null, /not registered/);
    });

    it("can't change details", async () => {
        const token1 = tokens[0];
        const address1 = tokenInstances.get(token1).address;
        const decimals1 = new BN(await tokenInstances.get(token1).decimals());

        // Register
        await renExTokens.registerToken(token1, address1, decimals1);

        // Deregister
        await renExTokens.deregisterToken(token1);

        // Attempt to re-register with different details
        await renExTokens.registerToken(token1, tokenInstances.get(tokens[1]).address, decimals1)
            .should.be.rejectedWith(null, /different address/);
        await renExTokens.registerToken(token1, address1, 1)
            .should.be.rejectedWith(null, /different decimals/);

        // Can re-register with the same details
        await renExTokens.registerToken(token1, address1, decimals1);

        const tokenDetails = await renExTokens.tokens(token1);
        (tokenDetails.addr).should.equal(address1);
        (tokenDetails.decimals.toString()).should.equal(decimals1.toString());
        (tokenDetails.registered).should.be.true;
    });
});