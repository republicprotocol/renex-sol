const Swap = artifacts.require("AtomicSwap");

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
chai.should();

import { SHA256 } from "crypto-js";
import * as HEX from "crypto-js/enc-hex";

const random32Bytes = () => {
    return `0x${SHA256(Math.random().toString()).toString()}`;
}

const secondsFromNow = (seconds: number) => {
    return Math.round((new Date()).getTime() / 1000) + seconds;
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export const second = 1000;

contract("AtomicSwap", function (accounts) {

    let swap;
    const alice = accounts[1];
    const bob = accounts[2];
    const eve = accounts[3];

    before(async function () {
        swap = await Swap.new();
    });

    it("can perform atomic swap", async () => {
        const swapID = random32Bytes(), secret = random32Bytes();
        const secretLock = `0x${SHA256(HEX.parse(secret.slice(2))).toString()}`;

        await swap.initiate(swapID, bob, secretLock, secondsFromNow(60 * 60 * 24), { from: alice, value: 100000 });

        await swap.audit(swapID);

        await swap.redeem(swapID, secret, { from: bob });

        await swap.auditSecret(swapID);
    });

    it("can refund an atomic swap", async () => {
        const swapID = random32Bytes(), secret = random32Bytes();
        const secretLock = `0x${SHA256(HEX.parse(secret.slice(2))).toString()}`;

        await swap.initiate(swapID, bob, secretLock, 0, { from: alice, value: 100000 });
        await swap.refund(swapID, { from: alice });
    });

    it("operations check order status", async () => {
        const swapID = random32Bytes(), secret = random32Bytes();
        const secretLock = `0x${SHA256(HEX.parse(secret.slice(2))).toString()}`;

        // Can only initiate for INVALID swaps
        await swap.initiate(swapID, bob, secretLock, secondsFromNow(1), { from: alice, value: 100000 });
        await swap.initiate(swapID, bob, secretLock, secondsFromNow(1), { from: alice, value: 100000 })
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
        const swapID = random32Bytes(), secret = random32Bytes();
        const secretLock = `0x${SHA256(HEX.parse(secret.slice(2))).toString()}`;

        // Before initiating
        (await swap.initiatable(swapID)).should.equal(true);
        (await swap.refundable(swapID)).should.equal(false);
        (await swap.redeemable(swapID)).should.equal(false);

        await swap.initiate(swapID, bob, secretLock, secondsFromNow(1), { from: alice, value: 100000 });

        (await swap.initiatable(swapID)).should.equal(false);
        (await swap.refundable(swapID)).should.equal(false);
        (await swap.redeemable(swapID)).should.equal(true);

        await sleep(2 * second);

        (await swap.initiatable(swapID)).should.equal(false);
        (await swap.refundable(swapID)).should.equal(true);
        (await swap.redeemable(swapID)).should.equal(true);

        await swap.redeem(swapID, secret, { from: bob });

        (await swap.initiatable(swapID)).should.equal(false);
        (await swap.refundable(swapID)).should.equal(false);
        (await swap.redeemable(swapID)).should.equal(false);

    })
});