import * as testUtils from "./helper/testUtils";

import { buyMarket, sellMarket, TOKEN_CODES } from "./helper/testUtils";

import { DGXTokenArtifact } from "./bindings/d_g_x_token";
import { DarknodeRegistryArtifact } from "./bindings/darknode_registry";
import { OrderbookArtifact, OrderbookContract } from "./bindings/orderbook";
import { RenExBalancesArtifact, RenExBalancesContract } from "./bindings/ren_ex_balances";
import { RenExBrokerVerifierArtifact, RenExBrokerVerifierContract } from "./bindings/ren_ex_broker_verifier";
import { RenExSettlementArtifact, RenExSettlementContract } from "./bindings/ren_ex_settlement";
import { RenExTokensArtifact, RenExTokensContract } from "./bindings/ren_ex_tokens";
import { RepublicTokenArtifact } from "./bindings/republic_token";

const RepublicToken = artifacts.require("RepublicToken") as RepublicTokenArtifact;
const DGXToken = artifacts.require("DGXToken") as DGXTokenArtifact;
const DarknodeRegistry = artifacts.require("DarknodeRegistry") as DarknodeRegistryArtifact;
const Orderbook = artifacts.require("Orderbook") as OrderbookArtifact;
const RenExTokens = artifacts.require("RenExTokens") as RenExTokensArtifact;
const RenExSettlement = artifacts.require("RenExSettlement") as RenExSettlementArtifact;
const RenExBalances = artifacts.require("RenExBalances") as RenExBalancesArtifact;
const RenExBrokerVerifier = artifacts.require("RenExBrokerVerifier") as RenExBrokerVerifierArtifact;

contract("RenExSettlement", function (accounts: string[]) {

    const darknode = accounts[2];
    const broker = accounts[3];
    let tokenAddresses: Map<number, testUtils.BasicERC20>;
    let orderbook: OrderbookContract;
    let renExSettlement: RenExSettlementContract;
    let renExBalances: RenExBalancesContract;
    let renExTokens: RenExTokensContract;
    let buyID_1: string, sellID_1: string;
    let buyID_2: string, sellID_2: string;
    let buyID_3, sellID_3: string;
    let buyID_4;

    const BUY1 = [web3.utils.sha3("0"), 1, buyMarket("0x3", "0x7"), 10, 10000, 0];
    const SELL1 = [web3.utils.sha3("1"), 1, sellMarket("0x3", "0x7"), 10, 1000, 0];
    const BUY2 = [web3.utils.sha3("2"), 1, buyMarket(TOKEN_CODES.BTC, TOKEN_CODES.ETH), 12, 10000, 0];
    const SELL2 = [web3.utils.sha3("3"), 1, sellMarket(TOKEN_CODES.BTC, TOKEN_CODES.ETH), 12, 1000, 0];
    const BUY3 = [web3.utils.sha3("4"), 1, buyMarket(TOKEN_CODES.BTC, TOKEN_CODES.ETH), 15, 10000, 0];
    const SELL3 = [web3.utils.sha3("5"), 1, sellMarket(TOKEN_CODES.BTC, TOKEN_CODES.ETH), 12, 10000, 0];
    const BUY4 = [web3.utils.sha3("6"), 1, buyMarket(TOKEN_CODES.BTC, TOKEN_CODES.ETH), 17, 10000, 0];
    const SELL4 = [web3.utils.sha3("7"), 1, sellMarket(TOKEN_CODES.BTC, TOKEN_CODES.ETH), 12, 1000, 0];
    const SELL5 = [web3.utils.sha3("8"), 2, sellMarket(TOKEN_CODES.BTC, TOKEN_CODES.ETH), 10, 1000, 0];

    const renexID = testUtils.Settlements.RenEx;

    before(async function () {
        const ren = await RepublicToken.deployed();

        tokenAddresses = new Map()
            .set(TOKEN_CODES.BTC, testUtils.MockBTC)
            .set(TOKEN_CODES.ETH, testUtils.MockETH)
            .set(TOKEN_CODES.DGX, await DGXToken.deployed())
            .set(TOKEN_CODES.REN, ren);

        let dnr = await DarknodeRegistry.deployed();
        orderbook = await Orderbook.deployed();
        renExTokens = await RenExTokens.deployed();
        renExSettlement = await RenExSettlement.deployed();
        renExBalances = await RenExBalances.deployed();

        // Register darknode
        await ren.transfer(darknode, testUtils.MINIMUM_BOND);
        await ren.approve(dnr.address, testUtils.MINIMUM_BOND, { from: darknode });
        await dnr.register(darknode, testUtils.PUBK("1"), testUtils.MINIMUM_BOND, { from: darknode });
        await testUtils.waitForEpoch(dnr);

        // Register broker
        const renExBrokerVerifier: RenExBrokerVerifierContract =
            await RenExBrokerVerifier.deployed();
        await renExBrokerVerifier.registerBroker(broker);

        buyID_1 = await renExSettlement.hashOrder.apply(this, [...BUY1]);
        sellID_1 = await renExSettlement.hashOrder.apply(this, [...SELL1]);

        buyID_2 = await renExSettlement.hashOrder.apply(this, [...BUY2]);
        sellID_2 = await renExSettlement.hashOrder.apply(this, [...SELL2]);

        buyID_3 = await renExSettlement.hashOrder.apply(this, [...BUY3]);
        sellID_3 = await renExSettlement.hashOrder.apply(this, [...SELL3]);

        buyID_4 = await renExSettlement.hashOrder.apply(this, [...BUY4]);

        // Buys
        await testUtils.openOrder(orderbook, renexID, broker, accounts[5], buyID_1);
        await testUtils.openOrder(orderbook, renexID, broker, accounts[6], buyID_2);
        await testUtils.openOrder(orderbook, renexID, broker, accounts[7], buyID_3);
        await testUtils.openOrder(orderbook, renexID, broker, accounts[8], buyID_4);

        // Sells
        await testUtils.openOrder(orderbook, renexID, broker, accounts[6], sellID_1);
        await testUtils.openOrder(orderbook, renexID, broker, accounts[5], sellID_2);
        await testUtils.openOrder(orderbook, renexID, broker, accounts[8], sellID_3);

        await orderbook.confirmOrder(buyID_1, sellID_1, { from: darknode });
        await orderbook.confirmOrder(buyID_2, sellID_2, { from: darknode });
        await orderbook.confirmOrder(buyID_3, sellID_3, { from: darknode });
    });

    it("can update orderbook", async () => {
        const previousOrderbook = await renExSettlement.orderbookContract();

        // [CHECK] The function validates the new orderbook
        await renExSettlement.updateOrderbook(testUtils.NULL)
            .should.be.rejectedWith(null, /revert/);

        // [ACTION] Update the orderbook to another address
        await renExSettlement.updateOrderbook(renExSettlement.address);
        // [CHECK] Verify the orderbook address has been updated
        (await renExSettlement.orderbookContract()).should.equal(renExSettlement.address);

        // [CHECK] Only the owner can update the orderbook
        await renExSettlement.updateOrderbook(previousOrderbook, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner

        // [RESET] Reset the orderbook to the previous address
        await renExSettlement.updateOrderbook(previousOrderbook);
        (await renExSettlement.orderbookContract()).should.equal(previousOrderbook);
    });

    it("can update renex tokens", async () => {
        const previousRenExTokens = await renExSettlement.renExTokensContract();

        // [CHECK] The function validates the new renex tokens
        await renExSettlement.updateRenExTokens(testUtils.NULL)
            .should.be.rejectedWith(null, /revert/);

        // [ACTION] Update the renex tokens to another address
        await renExSettlement.updateRenExTokens(renExSettlement.address);
        // [CHECK] Verify the renex tokens address has been updated
        (await renExSettlement.renExTokensContract()).should.equal(renExSettlement.address);

        // [CHECK] Only the owner can update the renex tokens
        await renExSettlement.updateRenExTokens(previousRenExTokens, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner

        // [RESET] Reset the renex tokens to the previous address
        await renExSettlement.updateRenExTokens(previousRenExTokens);
        (await renExSettlement.renExTokensContract()).should.equal(previousRenExTokens);
    });

    it("can update renex balances", async () => {
        const previousRenExBalances = await renExSettlement.renExBalancesContract();

        // [CHECK] The function validates the new renex balances
        await renExSettlement.updateRenExBalances(testUtils.NULL)
            .should.be.rejectedWith(null, /revert/);

        // [ACTION] Update the renex balances to another address
        await renExSettlement.updateRenExBalances(renExSettlement.address);
        // [CHECK] Verify the renex balances address has been updated
        (await renExSettlement.renExBalancesContract()).should.equal(renExSettlement.address);

        // [CHECK] Only the owner can update the renex balances
        await renExSettlement.updateRenExBalances(previousRenExBalances, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner

        // [RESET] Reset the renex balances to the previous address
        await renExSettlement.updateRenExBalances(previousRenExBalances);
        (await renExSettlement.renExBalancesContract()).should.equal(previousRenExBalances);
    });

    it("can update submission gas price limit", async () => {
        const previousGasPriceLimit = await renExSettlement.submissionGasPriceLimit();

        // [ACTION] Update to 0.1 GWEI
        await renExSettlement.updateSubmissionGasPriceLimit(0.1 * testUtils.GWEI);

        // [CHECK] Should now be 0.1 GWEI
        (await renExSettlement.submissionGasPriceLimit()).should.be.bignumber.equal(0.1 * testUtils.GWEI);

        // [CHECK] Non-owner can't update
        await renExSettlement.updateSubmissionGasPriceLimit(100 * testUtils.GWEI, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner

        // [CHECK] Owner can't set to less than 0.1 GWEI
        await renExSettlement.updateSubmissionGasPriceLimit(0.01 * testUtils.GWEI)
            .should.be.rejectedWith(null, /invalid new submission gas price limit/);

        // [SETUP] Reset
        await renExSettlement.updateSubmissionGasPriceLimit(previousGasPriceLimit);
        (await renExSettlement.submissionGasPriceLimit()).should.be.bignumber.equal(previousGasPriceLimit);
    });

    it("submitOrder", async () => {
        // sellID_1?
        await renExSettlement.submitOrder.apply(this, [...SELL1]);

        // buyID_1?
        await renExSettlement.submitOrder.apply(this, [...BUY1]);

        // sellID_2?
        await renExSettlement.submitOrder.apply(this, [...SELL2]);

        // buyID_2?
        await renExSettlement.submitOrder.apply(this, [...BUY2]);

        // sellID_3?
        await renExSettlement.submitOrder.apply(this, [...SELL3]);

        // buyID_3?
        await renExSettlement.submitOrder.apply(this, [...BUY3]);
    });

    it("submitOrder (rejected)", async () => {
        // Can't submit order twice:
        await renExSettlement.submitOrder.apply(this, [...SELL2])
            .should.be.rejectedWith(null, /order already submitted/);

        // Can't submit order that's not in orderbook (different order details):
        await renExSettlement.submitOrder.apply(this, [...SELL4])
            .should.be.rejectedWith(null, /unconfirmed order/);

        // Can't submit order that's not confirmed
        await renExSettlement.submitOrder.apply(this, [...BUY4])
            .should.be.rejectedWith(null, /unconfirmed order/);
    });

    it("settle checks the buy order status", async () => {
        await renExSettlement.settle(
            testUtils.randomID(),
            sellID_1,
        ).should.be.rejectedWith(null, /invalid buy status/);
    });

    it("settle checks the sell order status", async () => {
        await renExSettlement.settle(
            buyID_1,
            testUtils.randomID(),
        ).should.be.rejectedWith(null, /invalid sell status/);
    });

    it("settle checks that the orders are compatible", async () => {
        // Two buys
        await renExSettlement.settle(
            buyID_1,
            buyID_1,
        ).should.be.rejectedWith(null, /incompatible orders/);

        // Two sells
        await renExSettlement.settle(
            sellID_1,
            sellID_1,
        ).should.be.rejectedWith(null, /incompatible orders/);

        // Orders that aren't matched to one another
        await renExSettlement.settle(
            buyID_2,
            sellID_3,
        ).should.be.rejectedWith(null, /unconfirmed orders/);
    });

    it("settle checks the token registration", async () => {
        // Buy token that is not registered
        await renExSettlement.settle(
            buyID_1,
            sellID_1,
        ).should.be.rejectedWith(null, /unregistered priority token/);

        // Sell token that is not registered
        await renExTokens.deregisterToken(TOKEN_CODES.ETH);
        await renExSettlement.settle(
            buyID_2,
            sellID_2,
        ).should.be.rejectedWith(null, /unregistered secondary token/);
        await renExTokens.registerToken(TOKEN_CODES.ETH, tokenAddresses.get(TOKEN_CODES.ETH).address, 18);
    });

    it("should fail for excessive gas price", async () => {
        // [SETUP] Set gas price limit to 0.1 GWEI
        const previousGasPriceLimit = await renExSettlement.submissionGasPriceLimit();
        const LOW_GAS = 100000000;
        await renExSettlement.updateSubmissionGasPriceLimit(LOW_GAS);

        // [CHECK] Calling submitOrder with a higher gas will fail
        await renExSettlement.submitOrder.apply(this, [...SELL5, { gasPrice: LOW_GAS + 1 }])
            .should.be.rejectedWith(null, /gas price too high/);

        // [SETUP] Reset gas price limit
        await renExSettlement.updateSubmissionGasPriceLimit(previousGasPriceLimit);
    });
});