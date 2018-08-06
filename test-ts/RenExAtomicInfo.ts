
import * as chai from "chai";
import * as testUtils from "./helper/testUtils";

const RenExAtomicInfo = artifacts.require("RenExAtomicInfo");
const RepublicToken = artifacts.require("RepublicToken");
const DarknodeRegistry = artifacts.require("DarknodeRegistry");
const Orderbook = artifacts.require("Orderbook");

contract("RenExAtomicInfo", function (accounts: string[]) {

    let info, swap, addr, orderbook;
    const darknode = accounts[0];
    const trader = accounts[1];
    const box = accounts[2];
    const attacker = accounts[3];
    const broker = accounts[4];

    before(async function () {
        const ren = await RepublicToken.deployed();
        const dnr = await DarknodeRegistry.deployed();
        orderbook = await Orderbook.deployed();

        // Broker
        await ren.transfer(broker, testUtils.INGRESS_FEE * 10);
        await ren.approve(orderbook.address, testUtils.INGRESS_FEE * 10, { from: broker });

        // Register darknode
        await ren.transfer(darknode, testUtils.MINIMUM_BOND);
        await ren.approve(dnr.address, testUtils.MINIMUM_BOND, { from: darknode });
        await dnr.register(darknode, testUtils.PUBK("1"), testUtils.MINIMUM_BOND, { from: darknode });
        await testUtils.waitForEpoch(dnr);

        info = await RenExAtomicInfo.deployed();
    });

    it("can submit and retrieve swap details", async () => {
        const orderID = await testUtils.openBuyOrder(orderbook, broker, trader);

        swap = testUtils.randomID();
        await info.submitDetails(orderID, swap, { from: trader });
        (await info.swapDetails(orderID)).should.equal(swap);
    });

    it("details can only be submitted once", async () => {
        const orderID = await testUtils.openBuyOrder(orderbook, broker, trader);

        swap = testUtils.randomID();
        await info.submitDetails(orderID, swap, { from: trader });
        await info.submitDetails(orderID, swap, { from: trader })
            .should.be.rejectedWith(null, /already submitted/);
    });

    it("can submit and retrieve addresses", async () => {
        const orderID = await testUtils.openBuyOrder(orderbook, broker, trader);

        addr = testUtils.randomID();
        await info.setOwnerAddress(orderID, addr, { from: trader });
        (await info.getOwnerAddress(orderID)).should.equal(addr, { from: trader });
    });

    it("address can only set once", async () => {
        const orderID = await testUtils.openBuyOrder(orderbook, broker, trader);

        addr = testUtils.randomID();
        await info.setOwnerAddress(orderID, addr, { from: trader });
        await info.setOwnerAddress(orderID, trader, { from: trader })
            .should.be.rejectedWith(null, /already set/);
    });

    it("can authorise another address to submit details", async () => {
        const orderID = await testUtils.openBuyOrder(orderbook, broker, trader);
        await info.authoriseSwapper(box, { from: trader });

        swap = testUtils.randomID();
        await info.submitDetails(orderID, swap, { from: box });
        (await info.swapDetails(orderID)).should.equal(swap);
    });

    it("can deauthorise another address to submit details", async () => {
        const orderID = await testUtils.openBuyOrder(orderbook, broker, trader);
        await info.authoriseSwapper(box, { from: trader });
        await info.deauthoriseSwapper(box, { from: trader });

        swap = testUtils.randomID();
        await info.submitDetails(orderID, swap, { from: box })
            .should.be.rejectedWith(null, /not authorised/);

        chai.expect(await info.swapDetails(orderID)).to.be.null;
    });

    it("non-authorised address can't submit details", async () => {
        const orderID = await testUtils.openBuyOrder(orderbook, broker, trader);

        swap = testUtils.randomID();
        await info.submitDetails(orderID, swap, { from: attacker })
            .should.be.rejectedWith(null, /not authorised/);

        chai.expect(await info.swapDetails(orderID)).to.be.null;
    });

    it("owner can update orderbook address", async () => {
        await info.updateOrderbook(info.address, { from: attacker })
            .should.be.rejectedWith(null, /revert/); // not owner

        await info.updateOrderbook(info.address, { from: accounts[0] });
        await info.updateOrderbook(orderbook.address, { from: accounts[0] });
    });

});
