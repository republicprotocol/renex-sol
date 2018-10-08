import * as HEX from "crypto-js/enc-hex";

import { SHA256 } from "crypto-js";

import { randomID, second, secondsFromNow, sleep } from "./helper/testUtils";

import { RenExAtomicSwapperArtifact, RenExAtomicSwapperContract } from "./bindings/ren_ex_atomic_swapper";

const RenExAtomicSwapper = artifacts.require("RenExAtomicSwapper") as RenExAtomicSwapperArtifact;

contract("RenExAtomicSwapper", function (accounts: string[]) {

    let swap: RenExAtomicSwapperContract;
    const alice = accounts[1];
    const bob = accounts[2];

    before(async function () {
        swap = await RenExAtomicSwapper.deployed();
    });

    it("can perform atomic swap", async () => {
        const swapID = randomID(), secret = randomID();
        const secretLock = `0x${SHA256(HEX.parse(secret.slice(2))).toString()}`;

        await swap.initiate(
            swapID, bob, secretLock, await secondsFromNow(60 * 60 * 24), { from: alice, value: 100000 }
        );

        await swap.audit(swapID);

        await swap.redeem(swapID, secret, { from: bob });

        await swap.auditSecret(swapID);
    });

    it("can refund an atomic swap", async () => {
        const swapID = randomID(), secret = randomID();
        const secretLock = `0x${SHA256(HEX.parse(secret.slice(2))).toString()}`;

        await swap.initiate(swapID, bob, secretLock, 0, { from: alice, value: 100000 });
        await swap.refund(swapID, { from: alice });
    });

    it("operations check order status", async () => {
        const swapID = randomID(), secret = randomID();
        const secretLock = `0x${SHA256(HEX.parse(secret.slice(2))).toString()}`;

        // Can only initiate for INVALID swaps
        await swap.initiate(swapID, bob, secretLock, await secondsFromNow(2), { from: alice, value: 100000 });
        await swap.initiate(swapID, bob, secretLock, await secondsFromNow(2), { from: alice, value: 100000 })
            .should.be.rejectedWith(null, /swap opened previously/);

        await swap.auditSecret(swapID)
            .should.be.rejectedWith(null, /revert/);

        await swap.refund(swapID, { from: alice })
            .should.be.rejectedWith(null, /swap not expirable/);

        // Can only redeem for OPEN swaps and with valid key
        await swap.redeem(swapID, secretLock, { from: bob })
            .should.be.rejectedWith(null, /invalid secret/);
        await swap.redeem(swapID, secret, { from: bob });
        await swap.redeem(swapID, secret, { from: bob })
            .should.be.rejectedWith(null, /swap not open/);
    });

    it("can return details", async () => {
        const swapID = randomID(), secret = randomID();
        const secretLock = `0x${SHA256(HEX.parse(secret.slice(2))).toString()}`;

        // Before initiating
        (await swap.initiatable(swapID)).should.be.true;
        (await swap.refundable(swapID)).should.be.false;
        (await swap.redeemable(swapID)).should.be.false;

        await swap.initiate(swapID, bob, secretLock, await secondsFromNow(2), { from: alice, value: 100000 });

        (await swap.initiatable(swapID)).should.be.false;
        (await swap.refundable(swapID)).should.be.false;
        (await swap.redeemable(swapID)).should.be.true;

        await sleep(3 * second);

        (await swap.initiatable(swapID)).should.be.false;
        (await swap.refundable(swapID)).should.be.true;
        (await swap.redeemable(swapID)).should.be.true;

        await swap.redeem(swapID, secret, { from: bob });

        (await swap.initiatable(swapID)).should.be.false;
        (await swap.refundable(swapID)).should.be.false;
        (await swap.redeemable(swapID)).should.be.false;
    });

    it("can calculate swap ID", async () => {
        const secretLock = "0x" + new Buffer("7qZH4ImQZLl2/fALTtuioAaVlstJ0BE2La/Kd6wuihM=", "base64").toString("hex");
        const swapID = "0x" + new Buffer("qOl6NlnL/1M1AdmJ5CV8Bk1slTJT+N7STKwWFtSYoic=", "base64").toString("hex");

        (await swap.swapID("0x6A7A4957a63B01ABdA0afcCe3312D1aC3e0CDb76", secretLock, 1538810051))
            .should.equal(swapID);
    });
});