// tslint:disable:max-line-length

const RenExBalances = artifacts.require("RenExBalances");
const RenExSettlement = artifacts.require("RenExSettlement");
const Orderbook = artifacts.require("Orderbook");
const RepublicToken = artifacts.require("RepublicToken");
const DarknodeRegistry = artifacts.require("DarknodeRegistry");
const DGXMock = artifacts.require("DGXMock");
const RenExTokens = artifacts.require("RenExTokens");

// Two big number libraries are used - BigNumber decimal support
// while BN has better bitwise operations
import BigNumber from "bignumber.js";
import { BN } from "bn.js";

import * as testUtils from "./helper/testUtils";
import { TokenCodes, market } from "./helper/testUtils";

contract("RenEx", function (accounts: string[]) {

    const buyer = accounts[0];
    const seller = accounts[1];
    const darknode = accounts[2];
    const broker = accounts[3];
    let tokenAddresses, orderbook, renExSettlement, renExBalances;

    before(async function () {
        const ren = await RepublicToken.deployed();

        tokenAddresses = {
            [TokenCodes.BTC]: { address: testUtils.Ox0, decimals: () => new BigNumber(8), approve: () => null },
            [TokenCodes.ETH]: { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: () => new BigNumber(18), approve: () => null },
            [TokenCodes.LTC]: { address: testUtils.Ox0, decimals: () => new BigNumber(8), approve: () => null },
            [TokenCodes.DGX]: await DGXMock.deployed(),
            [TokenCodes.REN]: ren,
        };

        let dnr = await DarknodeRegistry.deployed();
        orderbook = await Orderbook.deployed();
        // darknodeRewardVault = await DarknodeRewardVault.deployed();
        renExSettlement = await RenExSettlement.deployed();
        renExBalances = await RenExBalances.deployed();

        const renExTokens = await RenExTokens.deployed();
        renExTokens.registerToken(TokenCodes.LTC, tokenAddresses[TokenCodes.LTC].address, await tokenAddresses[TokenCodes.LTC].decimals());

        // Register darknode
        await ren.transfer(darknode, testUtils.MINIMUM_BOND);
        await ren.approve(dnr.address, testUtils.MINIMUM_BOND, { from: darknode });
        await dnr.register(darknode, testUtils.PUBK("1"), testUtils.MINIMUM_BOND, { from: darknode });
        await testUtils.waitForEpoch(dnr);

        await tokenAddresses[TokenCodes.REN].approve(orderbook.address, 100 * 1e18, { from: broker });
    });

    it("order 1", async () => {
        const tokens = market(TokenCodes.DGX, TokenCodes.REN);
        const buy = { tokens, price: 1, volume: 2 /* REN */, minimumVolume: 1 /* REN */ };
        const sell = { tokens, price: 0.95, volume: 1 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([0.975 /* DGX */, 1 /* REN */]);
    });

    it("order 2", async () => {
        const tokens = market(TokenCodes.DGX, TokenCodes.REN);
        const buy = { tokens, price: 1, volume: 1.025641025641 /* REN */ };
        const sell = { tokens, price: 0.95, volume: 1.025641025641 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([0.999999999 /* DGX */, 1.025641025641 /* REN */]);
    });

    it("order 3", async () => {
        const tokens = market(TokenCodes.DGX, TokenCodes.REN);
        const buy = { tokens, price: 0.5, volume: 4 /* REN */ };
        const sell = { tokens, price: 0.5, volume: 2 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([1 /* DGX */, 2 /* REN */]);
    });

    it("order 4", async () => {
        const tokens = market(TokenCodes.DGX, TokenCodes.REN);
        const buy = { tokens, price: 1, volume: 1.9999999999 /* REN */ };
        // More precise than the number of decimals DGX has
        const sell = { tokens, price: 0.0000000001, volume: 1.9999999999 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([1 /* DGX */, 1.9999999999 /* REN */]);
    });

    it("order 5", async () => {
        const tokens = market(TokenCodes.DGX, TokenCodes.REN);
        const buy = { tokens, price: 999.5, volume: 0.002001501126 /* REN */ };
        const sell = { tokens, price: 999, volume: 0.002001501126 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([2 /* DGX */, 0.002001501126 /* REN */]);
    });

    it("order 6", async () => {
        const tokens = market(TokenCodes.ETH, TokenCodes.REN);
        const buy = { tokens, price: 99950000, volume: "2.001e-9" /* REN */ };
        const sell = { tokens, price: 99950000, volume: "2.001e-9" /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([0.19999995 /* ETH */, 2.001e-9 /* REN */]);
    });

    it("order 7", async () => {
        // Prices are at lowest precision possible, and midprice is even more
        // precise. If the midprice is rounded, this test will fail.
        const tokens = market(TokenCodes.ETH, TokenCodes.REN);
        const buy = { tokens, price: 0.000000000002, volume: 1 /* REN */ };
        const sell = { tokens, price: 0.000000000001, volume: 1 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([1.5e-12 /* ETH */, 1 /* REN */]);
    });

    it("atomic swap", async () => {
        const tokens = market(TokenCodes.BTC, TokenCodes.ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([0.975 /* DGX */, 1 /* REN */]);
    });

    it("invalid orders should revert", async () => {
        const tokens = market(TokenCodes.DGX, TokenCodes.REN);

        // Seller volume too low
        let buy: any = { tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 2 /* REN */ };
        let sell: any = { tokens, price: 1, volume: 1 /* REN */ };
        await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /incompatible orders/);

        // Buyer volume too low
        buy = { tokens, price: 1, volume: 1 /* DGX */ };
        sell = { tokens, price: 1, volume: 2 /* REN */, minimumVolume: 2 /* REN */ };
        await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /incompatible orders/);

        // Prices don't match
        buy = { tokens, price: 1, volume: 1 /* DGX */ };
        sell = { tokens, price: 1.05, volume: 1 /* REN */, minimumVolume: 1 /* DGX */ };
        await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /incompatible orders/);

        // Orders opened by the same trader
        buy = { tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { tokens, price: 0.95, volume: 1 /* REN */ };
        await submitMatch(buy, sell, buyer, buyer, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /orders from same trader/);

        // Invalid tokens
        buy = { tokens: market(TokenCodes.REN, TokenCodes.DGX), price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { tokens: market(TokenCodes.REN, TokenCodes.DGX), price: 0.95, volume: 1 /* REN */ };
        await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /first order is not a buy/);

        // Unsupported settlement
        buy = { settlement: 3, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { settlement: 3, tokens, price: 0.95, volume: 1 /* REN */ };

        await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /invalid settlement id/);
    });

    it("atomic fees are paid in ethereum-based token", async () => {
        let tokens = market(TokenCodes.ETH, TokenCodes.LTC);
        let buy = { settlement: 2, tokens, price: 1, volume: 2 /* ETH */, minimumVolume: 1 /* LTC */ };
        let sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* LTC */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([0.975 /* ETH */, 1 /* LTC */]);

        tokens = market(TokenCodes.BTC, TokenCodes.LTC);
        buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* LTC */ };
        sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* LTC */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([0.975 /* BTC */, 1 /* LTC */]);
    });
});

/**
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */

/// Submits and matches two orders, going through all the necessary steps first,
/// and verifying the funds have been transferred.
export async function submitMatch(
    buy: any, sell: any, buyer: string, seller: string,
    darknode: string, broker: string,
    renExSettlement: any, renExBalances: any, tokenAddresses: any, orderbook: any,
    returnIDs: boolean = false,
) {
    // Tokens should be the same
    new BN(buy.tokens).eq(new BN(sell.tokens)).should.be.true;
    const tokens = new BN(buy.tokens);

    const lowToken = new BN(tokens.toArrayLike(Buffer, "be", 8).slice(0, 4)).toNumber();
    const highToken = new BN(tokens.toArrayLike(Buffer, "be", 8).slice(4, 8)).toNumber();

    // Flip sell tokens
    sell.tokens = market(highToken, lowToken);

    // Set details for setup
    buy.trader = buyer;
    sell.trader = seller;
    buy.fromToken = lowToken;
    sell.fromToken = highToken;

    const lowTokenInstance = tokenAddresses[lowToken];
    const highTokenInstance = tokenAddresses[highToken];

    const highDecimals = new BigNumber(await highTokenInstance.decimals()).toNumber();
    const lowDecimals = new BigNumber(await lowTokenInstance.decimals()).toNumber();

    for (const order of [buy, sell]) {
        order.settlement = order.settlement !== undefined ? order.settlement : testUtils.Settlements.RenEx;

        order.price = new BigNumber(order.price);
        order.volume = new BigNumber(order.volume);
        order.minimumVolume = order.minimumVolume ? new BigNumber(order.minimumVolume) : new BigNumber(0);

        order.nonceHash = order.nonceHash || (order.nonce ?
            (web3.utils.sha3 as any)(order.nonce, { encoding: "hex" }) :
            testUtils.randomNonce());

        order.expiry = order.expiry || testUtils.secondsFromNow(1000);
        order.tokens = `0x${order.tokens.toString("hex")}`;

        const expectedID = await renExSettlement.hashOrder(getPreBytes(order), order.settlement, order.tokens, order.price.multipliedBy(10 ** 12), order.volume.multipliedBy(10 ** 12), order.minimumVolume.multipliedBy(10 ** 12));
        if (order.orderID !== undefined) {
            order.orderID.should.equal(expectedID);
        } else {
            order.orderID = expectedID;
        }
        let orderHash = testUtils.openPrefix + order.orderID.slice(2);
        order.signature = await web3.eth.sign(orderHash, order.trader);
    }

    // Approve and deposit
    sell.deposit = sell.volume.multipliedBy(10 ** highDecimals);
    buy.deposit = buy.volume.multipliedBy(buy.price).multipliedBy(10 ** lowDecimals).integerValue(BigNumber.ROUND_CEIL);
    sell.opposit = buy.deposit; buy.opposit = sell.deposit;

    for (const order of [buy, sell]) {
        if (order.fromToken !== TokenCodes.ETH && order.fromToken !== TokenCodes.BTC && order.fromToken !== TokenCodes.LTC) {
            await tokenAddresses[order.fromToken].transfer(order.trader, order.deposit);
            await tokenAddresses[order.fromToken].approve(renExBalances.address, order.deposit, { from: order.trader });
            await renExBalances.deposit(tokenAddresses[order.fromToken].address, order.deposit, { from: order.trader });
        } else {
            const deposit = order.fromToken === TokenCodes.ETH ? order.deposit : order.opposit;
            await renExBalances.deposit(tokenAddresses[TokenCodes.ETH].address, deposit, { from: order.trader, value: deposit });
        }
    }

    // Approve broker fees
    await tokenAddresses[TokenCodes.REN].transfer(broker, testUtils.INGRESS_FEE * 2);
    await tokenAddresses[TokenCodes.REN].approve(orderbook.address, testUtils.INGRESS_FEE * 2, { from: broker });

    // Open orders
    await orderbook.openBuyOrder(buy.signature, buy.orderID, { from: broker }).should.not.be.rejected;
    await orderbook.openSellOrder(sell.signature, sell.orderID, { from: broker }).should.not.be.rejected;

    // Confirm the order traders are
    for (const order of [buy, sell]) {
        (await orderbook.orderTrader(order.orderID)).should.equal(order.trader);
    }

    // Submit oredr confirmation
    await orderbook.confirmOrder(buy.orderID, sell.orderID, { from: darknode }).should.not.be.rejected;

    // Submit details for each order, store the current balances
    for (const order of [buy, sell]) {
        await renExSettlement.submitOrder(getPreBytes(order), order.settlement, order.tokens, order.price.multipliedBy(10 ** 12), order.volume.multipliedBy(10 ** 12), order.minimumVolume.multipliedBy(10 ** 12));

        order.lowBefore = new BigNumber(await renExBalances.traderBalances(order.trader, lowTokenInstance.address));
        order.highBefore = new BigNumber(await renExBalances.traderBalances(order.trader, highTokenInstance.address));
    }

    // Submit the match
    await renExSettlement.submitMatch(buy.orderID, sell.orderID)
        .should.not.be.rejected;

    // Verify match details
    const buyMatch = await renExSettlement.matchDetails(buy.orderID, sell.orderID);
    buyMatch.priorityToken.should.bignumber.equal(lowToken);
    buyMatch.secondaryToken.should.bignumber.equal(highToken);
    buyMatch.priorityTokenAddress.should.equal(lowTokenInstance.address);
    buyMatch.secondaryTokenAddress.should.equal(highTokenInstance.address);

    // Get balances after trade
    const buyerLowAfter = new BigNumber(await renExBalances.traderBalances(buyer, lowTokenInstance.address));
    const sellerLowAfter = new BigNumber(await renExBalances.traderBalances(seller, lowTokenInstance.address));
    const buyerHighAfter = new BigNumber(await renExBalances.traderBalances(buyer, highTokenInstance.address));
    const sellerHighAfter = new BigNumber(await renExBalances.traderBalances(seller, highTokenInstance.address));

    // Calculate fees (0.2%)
    const priorityFee = new BigNumber(buyMatch.priorityTokenVolume)
        .multipliedBy(2)
        .dividedBy(1000)
        .integerValue(BigNumber.ROUND_CEIL);
    const secondFee = new BigNumber(buyMatch.secondaryTokenVolume)
        .multipliedBy(2)
        .dividedBy(1000)
        .integerValue(BigNumber.ROUND_CEIL);

    // Verify the correct transfer of funds occured
    if (buy.settlement === testUtils.Settlements.RenEx) {
        // Low token
        buy.lowBefore.minus(buyMatch.priorityTokenVolume).should.bignumber.equal(buyerLowAfter);
        sell.lowBefore.plus(buyMatch.priorityTokenVolume).minus(priorityFee).should.bignumber.equal(sellerLowAfter);
        // High token
        buy.highBefore.plus(buyMatch.secondaryTokenVolume).minus(secondFee).should.bignumber.equal(buyerHighAfter);
        sell.highBefore.minus(buyMatch.secondaryTokenVolume).should.bignumber.equal(sellerHighAfter);
    } else {
        if (highTokenInstance.address !== testUtils.NULL) {
            buy.lowBefore.should.bignumber.equal(buyerLowAfter);
            sell.lowBefore.should.bignumber.equal(sellerLowAfter);
            buy.highBefore.minus(secondFee).should.bignumber.equal(buyerHighAfter);
            sell.highBefore.minus(secondFee).should.bignumber.equal(sellerHighAfter);
        } else if (lowTokenInstance.address !== testUtils.NULL) {
            buy.lowBefore.minus(priorityFee).should.bignumber.equal(buyerLowAfter);
            sell.lowBefore.minus(priorityFee).should.bignumber.equal(sellerLowAfter);
            buy.highBefore.should.bignumber.equal(buyerHighAfter);
            sell.highBefore.should.bignumber.equal(sellerHighAfter);
        }
    }

    const priorityRet = new BigNumber(buyMatch.priorityTokenVolume).dividedBy(10 ** lowDecimals).toNumber();
    const secondRet = new BigNumber(buyMatch.secondaryTokenVolume).dividedBy(10 ** highDecimals).toNumber();

    if (returnIDs) {
        return [
            priorityRet, secondRet,
            buy.orderID,
            sell.orderID
        ];
    } else {
        return [priorityRet, secondRet];
    }
}

function getPreBytes(order: any) {
    const bytes = Buffer.concat([
        new BN(order.type).toArrayLike(Buffer, "be", 1),
        new BN(order.expiry).toArrayLike(Buffer, "be", 8),
        new Buffer(order.nonceHash.slice(2), "hex"),
    ]);
    return "0x" + bytes.toString("hex");
}
