import * as chai from "chai";

import * as testUtils from "./helper/testUtils";

import { DarknodeRegistryArtifact } from "./bindings/darknode_registry";
import { OrderbookArtifact, OrderbookContract } from "./bindings/orderbook";
import { RenExAtomicInfoArtifact, RenExAtomicInfoContract } from "./bindings/ren_ex_atomic_info";
import { RenExBrokerVerifierArtifact, RenExBrokerVerifierContract } from "./bindings/ren_ex_broker_verifier";
import { RepublicTokenArtifact } from "./bindings/republic_token";

const RepublicToken = artifacts.require("RepublicToken") as RepublicTokenArtifact;
const DarknodeRegistry = artifacts.require("DarknodeRegistry") as DarknodeRegistryArtifact;
const Orderbook = artifacts.require("Orderbook") as OrderbookArtifact;
const RenExBrokerVerifier = artifacts.require("RenExBrokerVerifier") as RenExBrokerVerifierArtifact;
const RenExAtomicInfo = artifacts.require("RenExAtomicInfo") as RenExAtomicInfoArtifact;

contract("RenExAtomicInfo", function (accounts: string[]) {

    let info: RenExAtomicInfoContract;
    let orderbook: OrderbookContract;
    const darknode = accounts[0];
    const trader = accounts[1];
    const box = accounts[2];
    const attacker = accounts[3];
    const broker = accounts[4];
    const RenExID = testUtils.Settlements.RenEx;

    before(async function () {
        const ren = await RepublicToken.deployed();
        const dnr = await DarknodeRegistry.deployed();
        orderbook = await Orderbook.deployed();

        // Register darknode
        await ren.transfer(darknode, testUtils.MINIMUM_BOND);
        await ren.approve(dnr.address, testUtils.MINIMUM_BOND, { from: darknode });
        await dnr.register(darknode, testUtils.PUBK("1"), testUtils.MINIMUM_BOND, { from: darknode });
        await testUtils.waitForEpoch(dnr);

        // Register broker
        const renExBrokerVerifier: RenExBrokerVerifierContract =
            await RenExBrokerVerifier.deployed();
        await renExBrokerVerifier.registerBroker(broker);

        info = await RenExAtomicInfo.deployed();
    });

    it("can submit and retrieve swap details", async () => {
        const orderID = await testUtils.openOrder(orderbook, RenExID, broker, trader);

        const swap = testUtils.randomID();
        await info.submitDetails(orderID, swap, { from: trader });
        (await info.swapDetails(orderID)).should.equal(swap);
    });

    it("details can only be submitted once", async () => {
        const orderID = await testUtils.openOrder(orderbook, RenExID, broker, trader);

        const swap = testUtils.randomID();
        await info.submitDetails(orderID, swap, { from: trader });
        await info.submitDetails(orderID, swap, { from: trader })
            .should.be.rejectedWith(null, /already submitted/);
    });

    it("can submit and retrieve addresses", async () => {
        const orderID = await testUtils.openOrder(orderbook, RenExID, broker, trader);

        const addr = testUtils.randomID();
        await info.setOwnerAddress(orderID, addr, { from: trader });
        (await info.getOwnerAddress(orderID)).should.equal(addr);
    });

    it("address can only set once", async () => {
        const orderID = await testUtils.openOrder(orderbook, RenExID, broker, trader);

        const addr = testUtils.randomID();
        await info.setOwnerAddress(orderID, addr, { from: trader });
        await info.setOwnerAddress(orderID, trader, { from: trader })
            .should.be.rejectedWith(null, /already set/);
    });

    it("can authorize another address to submit details", async () => {
        const orderID = await testUtils.openOrder(orderbook, RenExID, broker, trader);
        await info.authorizeSwapper(box, { from: trader });

        const swap = testUtils.randomID();
        await info.submitDetails(orderID, swap, { from: box });
        (await info.swapDetails(orderID)).should.equal(swap);
    });

    it("can deauthorize another address to submit details", async () => {
        const orderID = await testUtils.openOrder(orderbook, RenExID, broker, trader);
        await info.authorizeSwapper(box, { from: trader });
        await info.deauthorizeSwapper(box, { from: trader });

        const swap = testUtils.randomID();
        await info.submitDetails(orderID, swap, { from: box })
            .should.be.rejectedWith(null, /not authorized/);

        chai.expect(await info.swapDetails(orderID)).to.be.null;
    });

    it("non-authorized address can't submit details", async () => {
        const orderID = await testUtils.openOrder(orderbook, RenExID, broker, trader);

        const swap = testUtils.randomID();
        await info.submitDetails(orderID, swap, { from: attacker })
            .should.be.rejectedWith(null, /not authorized/);

        chai.expect(await info.swapDetails(orderID)).to.be.null;
    });

    it("owner can update orderbook address", async () => {
        await info.updateOrderbook(info.address, { from: attacker })
            .should.be.rejectedWith(null, /revert/); // not owner

        await info.updateOrderbook(info.address, { from: accounts[0] });
        await info.updateOrderbook(orderbook.address, { from: accounts[0] });
    });

});
