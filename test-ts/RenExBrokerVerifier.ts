import { BN } from "bn.js";

import * as testUtils from "./helper/testUtils";

import { RenExBrokerVerifierContract } from "./bindings/ren_ex_broker_verifier";

const {
    RenExBrokerVerifier,
} = testUtils.contracts;

contract("RenExBalances", function (accounts: string[]) {

    let renExBrokerVerifier: RenExBrokerVerifierContract;

    before(async function () {
        renExBrokerVerifier = await RenExBrokerVerifier.deployed();
    });

    it("can register and deregister brokers", async () => {
        const broker1 = accounts[8];
        const broker2 = accounts[9];

        (await renExBrokerVerifier.brokerRegistered(broker1)).should.be.false;
        (await renExBrokerVerifier.brokerRegistered(broker2)).should.be.false;

        // Register first broker
        await renExBrokerVerifier.registerBroker(broker1);
        await renExBrokerVerifier.registerBroker(broker1)
            .should.be.rejectedWith(null, /already registered/);

        (await renExBrokerVerifier.brokerRegistered(broker1)).should.be.true;
        (await renExBrokerVerifier.brokerRegistered(broker2)).should.be.false;

        // Register second broker
        await renExBrokerVerifier.registerBroker(broker2);

        (await renExBrokerVerifier.brokerRegistered(broker1)).should.be.true;
        (await renExBrokerVerifier.brokerRegistered(broker2)).should.be.true;

        // Deregister first broker
        await renExBrokerVerifier.deregisterBroker(broker1);
        await renExBrokerVerifier.deregisterBroker(broker1)
            .should.be.rejectedWith(null, /not registered/);

        (await renExBrokerVerifier.brokerRegistered(broker1)).should.be.false;
        (await renExBrokerVerifier.brokerRegistered(broker2)).should.be.true;

        // Deregister second broker
        await renExBrokerVerifier.deregisterBroker(broker2);

        (await renExBrokerVerifier.brokerRegistered(broker1)).should.be.false;
        (await renExBrokerVerifier.brokerRegistered(broker2)).should.be.false;
    });

    // Gets return value of transaction by doing a .call first
    const callAndSend = async (
        fn: { (...params: any[]): Promise<testUtils.Transaction>, call: (...params: any[]) => any },
        params: any[]
    ): Promise<any> => {
        const ret = (fn as any).call(...params);
        await fn(...params);
        return ret;
    };

    context("can verify withdraw signatures", async () => {

        const trader1 = accounts[0];
        const trader2 = accounts[3];
        const trader3 = accounts[4];
        const trader4 = accounts[5];
        const notBalances = accounts[1]; // Not authorized to call `verifyWithdrawSignature`
        const broker = accounts[8];
        const notBroker = accounts[9];
        let previousBalancesContract: string;
        const token1 = testUtils.randomAddress();
        const token2 = testUtils.randomAddress();

        before(async () => {
            previousBalancesContract = await renExBrokerVerifier.balancesContract();
            await renExBrokerVerifier.updateBalancesContract(accounts[0]);

            await renExBrokerVerifier.registerBroker(broker);

            // Nonces should all be 0
            (await renExBrokerVerifier.traderTokenNonce(trader1, token1)).should.bignumber.equal(0);
            (await renExBrokerVerifier.traderTokenNonce(trader1, token2)).should.bignumber.equal(0);
            (await renExBrokerVerifier.traderTokenNonce(trader2, token1)).should.bignumber.equal(0);
            (await renExBrokerVerifier.traderTokenNonce(trader2, token2)).should.bignumber.equal(0);
        });

        after(async () => {
            await renExBrokerVerifier.deregisterBroker(broker);
            await renExBrokerVerifier.updateBalancesContract(previousBalancesContract);
        });

        it("can update RenEx Balances address", async () => {
            const previousBalancesAddress = await renExBrokerVerifier.balancesContract();

            // [CHECK] The function validates the new balances contract
            await renExBrokerVerifier.updateBalancesContract(testUtils.NULL)
                .should.be.rejectedWith(null, /revert/);

            // [ACTION] Update the balances contract to another address
            await renExBrokerVerifier.updateBalancesContract(renExBrokerVerifier.address);
            // [CHECK] Verify the balances contract address has been updated
            (await renExBrokerVerifier.balancesContract()).should.equal(renExBrokerVerifier.address);

            // [CHECK] Only the owner can update the balances contract
            await renExBrokerVerifier.updateBalancesContract(previousBalancesAddress, { from: accounts[1] })
                .should.be.rejectedWith(null, /revert/); // not owner

            // [RESET] Reset the balances contract to the previous address
            await renExBrokerVerifier.updateBalancesContract(previousBalancesAddress);
            (await renExBrokerVerifier.balancesContract()).should.equal(previousBalancesAddress);
        });

        it("only the balances contract can update the nonce", async () => {
            const previousNonce = new BN(await renExBrokerVerifier.traderTokenNonce(trader1, token1));

            // [ACTION] Attempt to verify signature
            let signature = await testUtils.signWithdrawal(renExBrokerVerifier, broker, trader1, token1);
            await renExBrokerVerifier.verifyWithdrawSignature(trader1, token1, signature, { from: notBalances })
                .should.be.rejectedWith(null, /not authorized/);

            // [CHECK] Nonce should not have increased
            (await renExBrokerVerifier.traderTokenNonce(trader1, token1))
                .should.bignumber.equal(previousNonce);
        });

        it("returns false for an invalid signature", async () => {
            const previousNonce = new BN(await renExBrokerVerifier.traderTokenNonce(trader1, token1));

            // [ACTION] Verify signature
            let badSignature = await testUtils.signWithdrawal(renExBrokerVerifier, notBroker, trader1, token1);
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader1, token1, badSignature]))
                .should.be.false;

            // [CHECK] Nonce should not have increased
            (await renExBrokerVerifier.traderTokenNonce(trader1, token1))
                .should.bignumber.equal(previousNonce);
        });

        it("returns true and increments the nonce for a valid signature", async () => {
            const previousNonce = new BN(await renExBrokerVerifier.traderTokenNonce(trader1, token1));
            const previousNonceOtherToken = new BN(await renExBrokerVerifier.traderTokenNonce(trader1, token2));
            const previousNonceOtherTrader = new BN(await renExBrokerVerifier.traderTokenNonce(trader2, token1));

            // [ACTION] Verify signature
            const fistSignature = await testUtils.signWithdrawal(renExBrokerVerifier, broker, trader1, token1);
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader1, token1, fistSignature]))
                .should.be.true;

            // [CHECK] trader1's nonce for token1 should have been incremented
            (await renExBrokerVerifier.traderTokenNonce(trader1, token1))
                .should.bignumber.equal(previousNonce.add(new BN(1)));

            // [ACTION] Verify signature again
            const secondSignature = await testUtils.signWithdrawal(renExBrokerVerifier, broker, trader1, token1);
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader1, token1, secondSignature]))
                .should.be.true;

            // [CHECK] trader1's nonce for token1 should have been incremented
            (await renExBrokerVerifier.traderTokenNonce(trader1, token1))
                .should.bignumber.equal(previousNonce.add(new BN(2)));

            // [CHECK] Other nonces should not have changed
            (await renExBrokerVerifier.traderTokenNonce(trader1, token2))
                .should.bignumber.equal(previousNonceOtherToken);
            (await renExBrokerVerifier.traderTokenNonce(trader2, token1))
                .should.bignumber.equal(previousNonceOtherTrader);
        });

        it("returns false for an already-used signature", async () => {
            // [SETUP] Create and use a signature
            const signature = await testUtils.signWithdrawal(renExBrokerVerifier, broker, trader1, token1);
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader1, token1, signature]))
                .should.be.true;

            const previousNonce = new BN(await renExBrokerVerifier.traderTokenNonce(trader1, token1));

            // [ACTION] Attempt to verify with already-used signature
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader1, token1, signature]))
                .should.be.false;

            // [CHECK] Nonce should be 1
            (await renExBrokerVerifier.traderTokenNonce(trader1, token1))
                .should.bignumber.equal(previousNonce);
        });

        it("can verify a second token", async () => {
            const previousNonce = new BN(await renExBrokerVerifier.traderTokenNonce(trader1, token1));
            const previousNonceOtherToken = new BN(await renExBrokerVerifier.traderTokenNonce(trader1, token2));

            // [ACTION] Verify signature
            let signature = await testUtils.signWithdrawal(renExBrokerVerifier, broker, trader1, token2);
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader1, token2, signature]))
                .should.be.true;

            // [CHECK] Nonce for first token should not have changed
            (await renExBrokerVerifier.traderTokenNonce(trader1, token1))
                .should.bignumber.equal(previousNonce);

            // [CHECK] Nonce for the other token should have been incremented
            (await renExBrokerVerifier.traderTokenNonce(trader1, token2))
                .should.bignumber.equal(previousNonceOtherToken.add(new BN(1)));
        });

        it("can verify a second trader", async () => {
            const previousNonce = new BN(await renExBrokerVerifier.traderTokenNonce(trader1, token1));
            const previousNonceOtherTrader = new BN(await renExBrokerVerifier.traderTokenNonce(trader2, token1));

            // [ACTION] Verify signature
            let signature = await testUtils.signWithdrawal(renExBrokerVerifier, broker, trader2, token1);
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader2, token1, signature]))
                .should.be.true;

            // [CHECK] Nonce for first token should not have changed
            (await renExBrokerVerifier.traderTokenNonce(trader1, token1))
                .should.bignumber.equal(previousNonce);

            // [CHECK] Nonce for the other token should have been incremented
            (await renExBrokerVerifier.traderTokenNonce(trader2, token1))
                .should.bignumber.equal(previousNonceOtherTrader.add(new BN(1)));
        });

        it("rejects a another trader's signature", async () => {
            const previousNonce = new BN(await renExBrokerVerifier.traderTokenNonce(trader1, token1));
            const previousNonceOtherTrader = new BN(await renExBrokerVerifier.traderTokenNonce(trader4, token1));

            // [ACTION] Attempt to verify signature
            let signature = await testUtils.signWithdrawal(renExBrokerVerifier, broker, trader4, token1);
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader3, token1, signature]))
                .should.be.false;

            // [CHECK] Neither nonce should have changed
            (await renExBrokerVerifier.traderTokenNonce(trader1, token1))
                .should.bignumber.equal(previousNonce);
            (await renExBrokerVerifier.traderTokenNonce(trader4, token1))
                .should.bignumber.equal(previousNonceOtherTrader);
        });

        it("rejects a another token's signature", async () => {
            const previousNonce = new BN(await renExBrokerVerifier.traderTokenNonce(trader1, token1));
            const previousNonceOtherToken = new BN(await renExBrokerVerifier.traderTokenNonce(trader1, token2));

            // [ACTION] Attempt to verify signature
            let signature = await testUtils.signWithdrawal(renExBrokerVerifier, broker, trader1, token1);
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader1, token2, signature]))
                .should.be.false;

            // [CHECK] Neither nonce should have changed
            (await renExBrokerVerifier.traderTokenNonce(trader1, token1))
                .should.bignumber.equal(previousNonce);
            (await renExBrokerVerifier.traderTokenNonce(trader1, token2))
                .should.bignumber.equal(previousNonceOtherToken);
        });
    });

});
