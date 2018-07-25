
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { randomBytes } from "crypto";
chai.use(chaiAsPromised);
chai.should();

const AtomicInfo = artifacts.require("AtomicInfo");
const RepublicToken = artifacts.require("RepublicToken");
const DarknodeRegistry = artifacts.require("DarknodeRegistry");
const Orderbook = artifacts.require("Orderbook");

let openPrefix = web3.utils.toHex("Republic Protocol: open: ");

const openOrder = async (orderbook, trader) => {
    const orderID = "0x" + randomBytes(32).toString("hex");
    let buyHash = openPrefix + orderID.slice(2);
    const signature = await web3.eth.sign(buyHash, trader);
    await orderbook.openBuyOrder(signature, orderID, { from: trader });
    return orderID;
}

contract("AtomicInfo", function (accounts: string[]) {

    let info, swap, addr, orderbook;
    const darknode = accounts[0];
    const trader = accounts[1];
    const box = accounts[2];
    const attacker = accounts[3];

    before(async function () {
        const ren = await RepublicToken.new();
        const dnr = await DarknodeRegistry.new(
            ren.address,
            0,
            1,
            0
        );

        orderbook = await Orderbook.new(0, ren.address, dnr.address);

        // Register darknode
        await dnr.register(darknode, "0x00", 0, { from: darknode });
        await dnr.epoch();

        info = await AtomicInfo.new(orderbook.address);
    });

    it("can submit and retrieve swap details", async () => {
        const orderID = await openOrder(orderbook, trader);

        swap = "0x567890";
        await info.submitDetails(orderID, swap, { from: trader });
        (await info.swapDetails(orderID)).should.equal(swap);
    });

    it("can submit and retrieve addresses", async () => {
        const orderID = await openOrder(orderbook, trader);

        addr = "0x567890";
        await info.setOwnerAddress(orderID, addr, { from: trader });
        (await info.getOwnerAddress(orderID)).should.equal(addr, { from: trader });
    });

    it("can authorise another address to submit details", async () => {
        const orderID = await openOrder(orderbook, trader);
        await info.authoriseSwapper(box, { from: trader });

        swap = "0x567890";
        await info.submitDetails(orderID, swap, { from: box });
        (await info.swapDetails(orderID)).should.equal(swap);
    });

    it("non-authorised address can't submit details", async () => {
        const orderID = await openOrder(orderbook, trader);

        swap = "0x567890";
        await info.submitDetails(orderID, swap, { from: attacker })
            .should.be.rejectedWith(null, /not authorised/);
        chai.assert(await info.swapDetails(orderID) === null, "expected swap details to be null");
    });

});
