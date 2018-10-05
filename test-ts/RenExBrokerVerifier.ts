import * as testUtils from "./helper/testUtils";

import { RenExBrokerVerifierArtifact, RenExBrokerVerifierContract } from "./bindings/ren_ex_broker_verifier";

const RenExBrokerVerifier = artifacts.require("RenExBrokerVerifier") as RenExBrokerVerifierArtifact;

contract("RenExBalances", function (accounts: string[]) {

    let renExBrokerVerifier: RenExBrokerVerifierContract;

    before(async function () {
        renExBrokerVerifier = await RenExBrokerVerifier.deployed();
    });

    it("can register and deregister brokers", async () => {
        const broker1 = accounts[8];
        const broker2 = accounts[9];

        (await renExBrokerVerifier.brokers(broker1)).should.be.false;
        (await renExBrokerVerifier.brokers(broker2)).should.be.false;

        // Register first broker
        await renExBrokerVerifier.registerBroker(broker1);
        await renExBrokerVerifier.registerBroker(broker1)
            .should.be.rejectedWith(null, /already registered/);

        (await renExBrokerVerifier.brokers(broker1)).should.be.true;
        (await renExBrokerVerifier.brokers(broker2)).should.be.false;

        // Register second broker
        await renExBrokerVerifier.registerBroker(broker2);

        (await renExBrokerVerifier.brokers(broker1)).should.be.true;
        (await renExBrokerVerifier.brokers(broker2)).should.be.true;

        // Deregister first broker
        await renExBrokerVerifier.deregisterBroker(broker1);
        await renExBrokerVerifier.deregisterBroker(broker1)
            .should.be.rejectedWith(null, /not registered/);

        (await renExBrokerVerifier.brokers(broker1)).should.be.false;
        (await renExBrokerVerifier.brokers(broker2)).should.be.true;

        // Deregister second broker
        await renExBrokerVerifier.deregisterBroker(broker2);

        (await renExBrokerVerifier.brokers(broker1)).should.be.false;
        (await renExBrokerVerifier.brokers(broker2)).should.be.false;
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

        const trader = accounts[0];
        const notBalances = accounts[1]; // Not authorized to call `verifyWithdrawSignature`
        const broker = accounts[8];
        const notBroker = accounts[9];
        let previousBalancesContract: string;

        before(async () => {

            previousBalancesContract = await renExBrokerVerifier.balancesContract();
            await renExBrokerVerifier.updateBalancesContract(accounts[0]);

            await renExBrokerVerifier.registerBroker(broker);

            // Nonce should be 0
            (await renExBrokerVerifier.traderNonces(trader)).should.bignumber.equal(0);
        });

        after(async () => {
            await renExBrokerVerifier.deregisterBroker(broker);
            await renExBrokerVerifier.updateBalancesContract(previousBalancesContract);
        });

        it("only the balances contract can update the nonce", async () => {
            let goodSig1 = await testUtils.signWithdrawal(renExBrokerVerifier, broker, trader);
            await renExBrokerVerifier.verifyWithdrawSignature(trader, goodSig1, { from: notBalances })
                .should.be.rejectedWith(null, /not authorized/);

            // Nonce should still be 0
            (await renExBrokerVerifier.traderNonces(trader)).should.bignumber.equal(0);
        });

        it("returns false for an invalid signature", async () => {
            let badSig = await testUtils.signWithdrawal(renExBrokerVerifier, notBroker, trader);
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader, badSig]))
                .should.be.false;

            // Nonce should still be 0
            (await renExBrokerVerifier.traderNonces(trader)).should.bignumber.equal(0);
        });

        let goodSig2: string;
        it("returns true and increments the nonce for a valid signature", async () => {
            goodSig2 = await testUtils.signWithdrawal(renExBrokerVerifier, broker, trader);
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader, goodSig2]))
                .should.be.true;

            // Nonce should be 1
            (await renExBrokerVerifier.traderNonces(trader)).should.bignumber.equal(1);
        });

        it("returns false for an already-used signature", async () => {
            // Attempt to verify with already-used signature
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader, goodSig2]))
                .should.be.false;

            // Nonce should be 1
            (await renExBrokerVerifier.traderNonces(trader)).should.bignumber.equal(1);
        });

        it("can verify a trader's second signature", async () => {
            let goodSig3 = await testUtils.signWithdrawal(renExBrokerVerifier, broker, trader);
            (await callAndSend(renExBrokerVerifier.verifyWithdrawSignature, [trader, goodSig3]))
                .should.be.true;

            // Nonce should be 2
            (await renExBrokerVerifier.traderNonces(trader)).should.bignumber.equal(2);
        });
    });

});
