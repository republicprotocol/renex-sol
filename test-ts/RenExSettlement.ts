// tslint:disable:max-line-length

const RenExSettlement = artifacts.require("RenExSettlement");

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { setupContracts } from "./RenEx";
chai.use(chaiAsPromised);
chai.should();

const GWEI = 1000000000;

contract.only("RenExSettlement", function (accounts: string[]) {

    const darknode = accounts[2];
    const broker = accounts[3];
    let tokenAddresses, orderbook, renExSettlement, renExBalances, renExTokens;
    let buyID_1, sellID_1;
    let buyID_2, sellID_2;
    let buyID_3, sellID_3;
    let buyID_4;

    before(async function () {
        ({ tokenAddresses, orderbook, renExSettlement, renExBalances, renExTokens } = await setupContracts(darknode, 0x0, broker));
        sellID_1 = await renExSettlement.hashOrder(web3.utils.sha3("0"), 1, "0x700000003", 10, 1000, 0); 
        buyID_1 = await renExSettlement.hashOrder(web3.utils.sha3("0"), 1, "0x300000007", 10, 10000, 0); 

        sellID_2 = await renExSettlement.hashOrder(web3.utils.sha3("0"), 1, "0x100000000", 12, 1000, 0); 
        buyID_2 = await renExSettlement.hashOrder(web3.utils.sha3("0"), 1, "0x1", 12, 10000, 0); 

        sellID_3 = await renExSettlement.hashOrder(web3.utils.sha3("0"), 1, "0x100000000", 12, 10000, 0);
        buyID_3 = await renExSettlement.hashOrder(web3.utils.sha3("0"), 1, "0x1", 15, 10000, 0);


        buyID_4 = await renExSettlement.hashOrder(web3.utils.sha3("0"), 1, "0x1", 17, 10000, 0);

        await steps.openBuyOrder(orderbook, broker, accounts[5], buyID_1);
        await steps.openBuyOrder(orderbook, broker, accounts[6], buyID_2);
        await steps.openBuyOrder(orderbook, broker, accounts[7], buyID_3);
        await steps.openBuyOrder(orderbook, broker, accounts[8], buyID_4);

        await steps.openSellOrder(orderbook, broker, accounts[6], sellID_1);
        await steps.openSellOrder(orderbook, broker, accounts[5], sellID_2);
        await steps.openSellOrder(orderbook, broker, accounts[8], sellID_3);

        await orderbook.confirmOrder(buyID_1, [sellID_1], { from: darknode });
        await orderbook.confirmOrder(buyID_2, [sellID_2], { from: darknode });
        await orderbook.confirmOrder(buyID_3, [sellID_3], { from: darknode });
    });

    it("can update orderbook", async () => {
        await renExSettlement.updateOrderbook(0x0);
        (await renExSettlement.orderbookContract()).should.equal("0x0000000000000000000000000000000000000000");
        await renExSettlement.updateOrderbook(orderbook.address, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner
        await renExSettlement.updateOrderbook(orderbook.address);
        (await renExSettlement.orderbookContract()).should.equal(orderbook.address);
    });

    it("can update renex balances", async () => {
        await renExSettlement.updateRenExBalances(0x0);
        (await renExSettlement.renExBalancesContract()).should.equal("0x0000000000000000000000000000000000000000");
        await renExSettlement.updateRenExBalances(renExBalances.address, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner
        await renExSettlement.updateRenExBalances(renExBalances.address);
        (await renExSettlement.renExBalancesContract()).should.equal(renExBalances.address);
    });

    it("can update submission gas price limit", async () => {
        await renExSettlement.updateSubmissionGasPriceLimit(0x0);
        (await renExSettlement.submissionGasPriceLimit()).toString().should.equal("0");
        await renExSettlement.updateSubmissionGasPriceLimit(100 * GWEI, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner
        await renExSettlement.updateSubmissionGasPriceLimit(100 * GWEI);
        (await renExSettlement.submissionGasPriceLimit()).toString().should.equal((100 * GWEI).toString());
    });

    it("submitOrder", async () => {
         // sellID_1?
         await renExSettlement.submitOrder(web3.utils.sha3("0"), 1, "0x700000003", 10, 1000, 0);

         // buyID_1?
         await renExSettlement.submitOrder(web3.utils.sha3("0"), 1, "0x300000007", 10, 10000, 0);
 
         // sellID_2?
         await renExSettlement.submitOrder(web3.utils.sha3("0"), 1, "0x100000000", 12, 1000, 0);
 
         // buyID_2?
         await renExSettlement.submitOrder(web3.utils.sha3("0"), 1, "0x1", 12, 10000, 0);

          // sellID_3?
          await renExSettlement.submitOrder(web3.utils.sha3("0"), 1, "0x100000000", 12, 10000, 0);
 
          // buyID_3?
          await renExSettlement.submitOrder(web3.utils.sha3("0"), 1, "0x1", 15, 10000, 0);
    });

    it("submitOrder (rejected)", async () => {
        // Can't submit order twice:
        await renExSettlement.submitOrder(web3.utils.sha3("0"), 1, "0x100000000", 12, 1000, 0).should.be.rejectedWith(null, /order already submitted/);

        // Can't submit order that's not in orderbook (different order details):
        await renExSettlement.submitOrder(web3.utils.sha3("1"), 1, "0x100000000", 12, 1000, 0).should.be.rejectedWith(null, /uncofirmed order/);

        // Can't submit order that's not confirmed
        await renExSettlement.submitOrder(web3.utils.sha3("0"), 1, "0x1", 17, 10000, 0).should.be.rejectedWith(null, /uncofirmed order/);
    });

    // it("verifyOrder", async () => {
    //     // await settlementTest.verifyOrder(buyID_1.replace("a", "b"))
    //     //     .should.be.rejectedWith(null, /revert/); //
    //     // await settlementTest.verifyOrder(sellID_1.replace("a", "b"))
    //     //     .should.be.rejectedWith(null, /revert/); //
    // });

    it("submitMatch", async () => {
        await renExSettlement.submitMatch(
            randomID(),
            sellID_1,
        ).should.be.rejectedWith(null, /invalid buy status/);

        await renExSettlement.submitMatch(
            buyID_1,
            randomID(),
        ).should.be.rejectedWith(null, /invalid sell status/);

        // Two buys
        await renExSettlement.submitMatch(
            buyID_1,
            buyID_1,
        ).should.be.rejectedWith(null, /incompatible orders/);

        // Two sells
        await renExSettlement.submitMatch(
            sellID_1,
            sellID_1,
        ).should.be.rejectedWith(null, /incompatible orders/);

        // Orders that aren't matched to one another
        await renExSettlement.submitMatch(
            sellID_3,
            buyID_2,
        ).should.be.rejectedWith(null, /invalid order pair/);

        // Buy token that is not registered
        await renExSettlement.submitMatch(
            buyID_1,
            sellID_1,
        ).should.be.rejectedWith(null, /unregistered buy token/);

        await renExTokens.deregisterToken(ETH);
        await renExSettlement.submitMatch(
            buyID_2,
            sellID_2,
        ).should.be.rejectedWith(null, /unregistered sell token/);
        await renExTokens.registerToken(ETH, tokenAddresses[ETH].address, 18);
    });

    it("should fail for excessive gas price", async () => {
        const _renExSettlement = await RenExSettlement.deployed();
        await _renExSettlement.submitOrder(web3.utils.sha3("0"), 2, "0x100000000", 10, 1000, 0).should.be.rejectedWith(null, /gas price too high/);
    });
});

const randomID = () => {
    return web3.utils.sha3(Math.random().toString());
};

const openPrefix = web3.utils.toHex("Republic Protocol: open: ");
const closePrefix = web3.utils.toHex("Republic Protocol: cancel: ");

const steps = {
    openBuyOrder: async (orderbook, broker, account, orderID) => {
        let hash = openPrefix + orderID.slice(2);
        let signature = await web3.eth.sign(hash, account);
        await orderbook.openBuyOrder(signature, orderID, { from: broker });
        return orderID;
    },

    openSellOrder: async (orderbook, broker, account, orderID) => {
        let hash = openPrefix + orderID.slice(2);
        let signature = await web3.eth.sign(hash, account);
        await orderbook.openSellOrder(signature, orderID, { from: broker });
        return orderID;
    },

    cancelOrder: async (orderbook, broker, account, orderID) => {
        const hash = closePrefix + orderID.slice(2);
        const signature = await web3.eth.sign(hash, account);
        await orderbook.cancelOrder(signature, orderID, { from: broker });
    }
};

const ETH = 0x1;
