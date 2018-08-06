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

contract.only("RenEx", function (accounts: string[]) {

    const buyer = accounts[0];
    const seller = accounts[1];
    const darknode = accounts[2];
    const broker = accounts[3];
    let tokenAddresses, orderbook, renExSettlement, renExBalances;

    before(async function () {
        const ren = await RepublicToken.deployed();

        tokenAddresses = {
            [BTC]: { address: "0x0000000000000000000000000000000000000000", decimals: () => new BigNumber(8), approve: () => null },
            [ETH]: { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: () => new BigNumber(18), approve: () => null },
            [LTC]: { address: "0x0000000000000000000000000000000000000000", decimals: () => new BigNumber(8), approve: () => null },
            [DGX]: await DGXMock.deployed(),
            [REN]: ren,
        };

        let dnr = await DarknodeRegistry.deployed();
        orderbook = await Orderbook.deployed();
        // darknodeRewardVault = await DarknodeRewardVault.deployed();
        renExSettlement = await RenExSettlement.deployed();
        renExBalances = await RenExBalances.deployed();

        const renExTokens = await RenExTokens.deployed();
        renExTokens.registerToken(LTC, tokenAddresses[LTC].address, await tokenAddresses[LTC].decimals());

        // Broker
        await ren.transfer(broker, testUtils.INGRESS_FEE * 100);
        await ren.approve(orderbook.address, testUtils.INGRESS_FEE * 100, { from: broker });

        // Register darknode
        await ren.transfer(darknode, testUtils.MINIMUM_BOND);
        await ren.approve(dnr.address, testUtils.MINIMUM_BOND, { from: darknode });
        await dnr.register(darknode, testUtils.PUBK("1"), testUtils.MINIMUM_BOND, { from: darknode });
        await testUtils.waitForEpoch(dnr);

        await tokenAddresses[REN].approve(orderbook.address, 100 * 1e18, { from: broker });
    });

    it("order 1", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 1, volume: 2 /* REN */, minimumVolume: 1 /* REN */ };
        const sell = { tokens, price: 0.95, volume: 1 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([0.975 /* DGX */, 1 /* REN */]);
    });

    it("order 2", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 1, volume: 1.025641025641 /* REN */ };
        const sell = { tokens, price: 0.95, volume: 1.025641025641 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([0.999999999 /* DGX */, 1.025641025641 /* REN */]);
    });

    it("order 3", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 0.5, volume: 4 /* REN */ };
        const sell = { tokens, price: 0.5, volume: 2 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([1 /* DGX */, 2 /* REN */]);
    });

    it("order 4", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 1, volume: 1.9999999999 /* REN */ };
        // More precise than the number of decimals DGX has
        const sell = { tokens, price: 0.0000000001, volume: 1.9999999999 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([1 /* DGX */, 1.9999999999 /* REN */]);
    });

    it("order 5", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 999.5, volume: 0.002001501126 /* REN */ };
        const sell = { tokens, price: 999, volume: 0.002001501126 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([2 /* DGX */, 0.002001501126 /* REN */]);
    });

    it("order 6", async () => {
        const tokens = market(ETH, REN);
        const buy = { tokens, price: 99950000, volume: "2.001e-9" /* REN */ };
        const sell = { tokens, price: 99950000, volume: "2.001e-9" /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([0.19999995 /* ETH */, 2.001e-9 /* REN */]);
    });

    it.only("order 7", async () => {
        // Prices are at lowest precision possible, and midprice is even more
        // precise. If the midprice is rounded, this test will fail.
        const tokens = market(ETH, REN);
        const buy = { tokens, price: 0.000000000002, volume: 1 /* REN */ };
        const sell = { tokens, price: 0.000000000001, volume: 1 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([1.5e-12 /* ETH */, 1 /* REN */]);
    });

    // TODO: Test extremes of price/volume/minimum volume

    // it("order 7", async () => {
    //     const tokens = market(ETH, REN);
    //     const buy = { tokens, priceC: 200, priceQ: 40, volumeC: 1, volumeQ: 0 /* ETH */, minimumVolumeC: 0, minimumVolumeQ: 0 };
    //     const sell = { tokens, priceC: 200, priceQ: 40, volume: 1 /* REN */, minimumVolumeC: 0, minimumVolumeQ: 0 };

    //     (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
    //         .should.eql([2e-13 /* ETH */, 2e-15 /* REN */]);
    // });

    // it("order 8", async () => {
    //     const tokens = market(ETH, REN);
    //     // Highest possible price, lowest possible volume
    //     const buy = { tokens, priceC: 1999, priceQ: 52, volumeC: 1, volumeQ: 0 /* ETH */, minimumVolumeC: 0, minimumVolumeQ: 0 };
    //     const sell = { tokens, priceC: 1999, priceQ: 52, volumeC: 1, volumeQ: 0 /* REN */, minimumVolumeC: 0, minimumVolumeQ: 0 };

    //     (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook))
    //         .should.eql([2e-13 /* ETH */, 0 /* REN */]);
    // });

    it("atomic swap", async () => {
        const tokens = market(BTC, ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, false))
            .should.eql([0.975 /* DGX */, 1 /* REN */]);
    });

    it("invalid orders should revert", async () => {
        const tokens = market(DGX, REN);

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

        // // Prices don't match
        // buy = { tokens, priceC: 200, priceQ: 38, volume: 1 /* DGX */ };
        // sell = { tokens, priceC: 200, priceQ: 39, volume: 1 /* REN */, minimumVolume: 1 /* DGX */ };
        // await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook)
        //     .should.be.rejectedWith(null, /incompatible orders/);

        // Orders opened by the same trader
        buy = { tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { tokens, price: 0.95, volume: 1 /* REN */ };
        await submitMatch(buy, sell, buyer, buyer, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /orders from same trader/);

        // Invalid tokens
        buy = { tokens: market(REN, DGX), price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { tokens: market(REN, DGX), price: 0.95, volume: 1 /* REN */ };
        await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /not a buy order/);

        // Unsupported settlement
        buy = { settlement: 3, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { settlement: 3, tokens, price: 0.95, volume: 1 /* REN */ };

        await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /invalid settlement id/);
    });

    it("atomic fees are paid in ethereum-based token", async () => {
        let tokens = market(ETH, LTC);
        let buy = { settlement: 2, tokens, price: 1, volume: 2 /* ETH */, minimumVolume: 1 /* LTC */ };
        let sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* LTC */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, false))
            .should.eql([0.975 /* ETH */, 1 /* LTC */]);

        tokens = market(BTC, LTC);
        buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* LTC */ };
        sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* LTC */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, false))
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

const BTC = 0x0;
const ETH = 0x1;
const LTC = 0x2;
const DGX = 0x100;
const REN = 0x10000;
const OrderParity = {
    BUY: 0,
    SELL: 1,
};
let prefix = web3.utils.toHex("Republic Protocol: open: ");

const market = (low, high) => {
    return new BN(low).mul(new BN(2).pow(new BN(32))).add(new BN(high));
};

export async function submitMatch(
    buy: any, sell: any, buyer: string, seller: string,
    darknode: string, broker: string,
    renExSettlement: any, renExBalances: any, tokenAddresses: any, orderbook: any,
    verify: boolean = true, returnIDs: boolean = false,
) {
    (sell.parity === undefined || sell.parity !== buy.parity).should.be.true;
    if (buy.parity === 1) {
        const tmp = sell;
        sell = buy;
        buy = tmp;
        // sell, buy = buy, sell;
    }
    buy.parity = OrderParity.BUY;
    sell.parity = OrderParity.SELL;

    buy.settlement = buy.settlement !== undefined ? buy.settlement : 1;
    sell.settlement = sell.settlement !== undefined ? sell.settlement : 1;

    for (const order of [buy, sell]) {
        if (order.minimumVolume === undefined) {
            order.minimumVolume = 0;
        }

        order.price = new BigNumber(order.price);
        order.volume = new BigNumber(order.volume);
        order.minimumVolume = new BigNumber(order.minimumVolume);

        if (order.nonceHash === undefined) {
            if (order.nonce === undefined) {
                order.nonce = randomNonce();
            }
            order.nonceHash = (web3.utils.sha3 as any)(order.nonce, { encoding: "hex" });
        }
    }

    new BN(buy.tokens).eq(new BN(sell.tokens)).should.be.true;
    const tokens = new BN(buy.tokens);

    const lowToken = new BN(tokens.toArrayLike(Buffer, "be", 8).slice(0, 4)).toNumber();
    const highToken = new BN(tokens.toArrayLike(Buffer, "be", 8).slice(4, 8)).toNumber();

    const sellTokens = market(highToken, lowToken);

    const lowTokenInstance = tokenAddresses[lowToken];
    const highTokenInstance = tokenAddresses[highToken];

    buy.expiry = buy.expiry || 1641026487;
    buy.type = 1;
    buy.tokens = `0x${tokens.toString("hex")}`;
    const expectedBuyID = await renExSettlement.hashOrder(getPreBytes(buy), buy.settlement, buy.tokens, buy.price.multipliedBy(10 ** 12), buy.volume.multipliedBy(10 ** 12), buy.minimumVolume.multipliedBy(10 ** 12));
    if (buy.orderID !== undefined) {
        buy.orderID.should.equal(expectedBuyID);
    } else {
        buy.orderID = expectedBuyID;
    }
    let buyHash = prefix + buy.orderID.slice(2);
    buy.signature = await web3.eth.sign(buyHash, buyer);

    sell.type = 1; // type
    sell.expiry = sell.expiry || 1641026487; // FIXME: expiry
    sell.tokens = `0x${sellTokens.toString("hex")}`; // tokens
    const expectedSellID = await renExSettlement.hashOrder(getPreBytes(sell), sell.settlement, sell.tokens, sell.price.multipliedBy(10 ** 12), sell.volume.multipliedBy(10 ** 12), sell.minimumVolume.multipliedBy(10 ** 12));
    if (sell.orderID !== undefined) {
        sell.orderID.should.equal(expectedSellID);
    } else {
        sell.orderID = expectedSellID;
    }
    let sellHash = prefix + sell.orderID.slice(2);
    const sellSignature = await web3.eth.sign(sellHash, seller);

    const highDecimals = new BigNumber(await highTokenInstance.decimals()).toNumber();
    const lowDecimals = new BigNumber(await lowTokenInstance.decimals()).toNumber();

    // Approve and deposit
    const highDeposit = sell.volume.multipliedBy(10 ** highDecimals);
    const lowDeposit = buy.volume.multipliedBy(buy.price).multipliedBy(10 ** lowDecimals).integerValue(BigNumber.ROUND_CEIL);

    if (lowToken !== ETH && lowToken !== BTC && lowToken !== LTC) {
        await lowTokenInstance.transfer(buyer, lowDeposit);
        await lowTokenInstance.approve(renExBalances.address, lowDeposit, { from: buyer });
        await renExBalances.deposit(lowTokenInstance.address, lowDeposit, { from: buyer });
    } else {
        const deposit = lowToken === ETH ? lowDeposit : highDeposit;
        await renExBalances.deposit(tokenAddresses[ETH].address, deposit, { from: buyer, value: deposit });
    }

    if (highToken !== ETH && highToken !== BTC && highToken !== LTC) {
        await highTokenInstance.transfer(seller, highDeposit);
        await highTokenInstance.approve(renExBalances.address, highDeposit, { from: seller });
        await renExBalances.deposit(highTokenInstance.address, highDeposit, { from: seller });
    } else {
        const deposit = highToken === ETH ? highDeposit : lowDeposit;
        await renExBalances.deposit(tokenAddresses[ETH].address, deposit, { from: seller, value: deposit });
    }

    // await tokenAddresses[REN].approve(orderbook.address, testUtils.INGRESS_FEE * 4, { from: broker });
    await orderbook.openBuyOrder(buy.signature, buy.orderID, { from: broker }).should.not.be.rejected;
    await orderbook.openSellOrder(sellSignature, sell.orderID, { from: broker }).should.not.be.rejected;

    (await orderbook.orderTrader(buy.orderID)).should.equal(buyer);
    (await orderbook.orderTrader(sell.orderID)).should.equal(seller);

    await orderbook.confirmOrder(buy.orderID, sell.orderID, { from: darknode }).should.not.be.rejected;

    await renExSettlement.submitOrder(getPreBytes(buy), buy.settlement, buy.tokens, buy.price.multipliedBy(10 ** 12), buy.volume.multipliedBy(10 ** 12), buy.minimumVolume.multipliedBy(10 ** 12));
    await renExSettlement.submitOrder(getPreBytes(sell), sell.settlement, sell.tokens, sell.price.multipliedBy(10 ** 12), sell.volume.multipliedBy(10 ** 12), sell.minimumVolume.multipliedBy(10 ** 12));

    const buyerLowBefore = new BigNumber(await renExBalances.traderBalances(buyer, lowTokenInstance.address));
    // const buyerHighBefore = new BigNumber(await renExBalances.traderBalances(buyer, highTokenInstance.address));
    // const sellerLowBefore = new BigNumber(await renExBalances.traderBalances(seller, lowTokenInstance.address));
    const sellerHighBefore = new BigNumber(await renExBalances.traderBalances(seller, highTokenInstance.address));

    await renExSettlement.submitMatch(buy.orderID, sell.orderID)
        .should.not.be.rejected;

    const buyMatch = await renExSettlement.matchDetails(buy.orderID, sell.orderID);

    const priorityTokenVolume = new BigNumber(buyMatch[0]);
    const secondTokenVolume = new BigNumber(buyMatch[1]);

    // if (verify) {
    //     // buyMatch[0].toString().should.equal(buy.orderID.toString());
    //     // buyMatch[1].toString().should.equal(sell.orderID.toString());
    //     // sellMatch[0].toString().should.equal(sell.orderID.toString());
    //     // sellMatch[1].toString().should.equal(buy.orderID.toString());
    //     // buyMatch[2].toString().should.equal(sellMatch[3].toString());
    //     // buyMatch[3].toString().should.equal(sellMatch[2].toString());
    //     // buyMatch[4].toString().should.equal(sellMatch[5].toString());
    //     // buyMatch[5].toString().should.equal(sellMatch[4].toString());

    //     const buyerLowAfter = new BigNumber(await renExBalances.traderBalances(buyer, lowTokenInstance.address));
    //     // const buyerHighAfter = new BigNumber(await renExBalances.traderBalances(buyer, highTokenInstance.address));
    //     // const sellerLowAfter = new BigNumber(await renExBalances.traderBalances(seller, lowTokenInstance.address));
    //     const sellerHighAfter = new BigNumber(await renExBalances.traderBalances(seller, highTokenInstance.address));

    //     buyerLowBefore.minus(lowSum).toFixed().should.equal(buyerLowAfter.toFixed());
    //     // buyerHighBefore.plus(highMatched).toFixed().should.equal(buyerHighAfter.toFixed());
    //     // sellerLowBefore.plus(lowMatched).toFixed().should.equal(sellerLowAfter.toFixed());
    //     sellerHighBefore.minus(highSum).toFixed().should.equal(sellerHighAfter.toFixed());

    //     // const expectedLowFees = lowSum
    //     //     .multipliedBy(2)
    //     //     .dividedBy(1000)
    //     //     .integerValue(BigNumber.ROUND_CEIL);
    //     // const expectedHighFees = highSum
    //     //     .multipliedBy(2)
    //     //     .dividedBy(1000)
    //     //     .integerValue(BigNumber.ROUND_CEIL);

    //     // lowFee.toFixed().should.equal(expectedLowFees.toFixed());
    //     // highFee.toFixed().should.equal(expectedHighFees.toFixed());
    // }

    const priorityRet = priorityTokenVolume.toNumber() / 10 ** lowDecimals;
    const secondRet = secondTokenVolume.toNumber() / 10 ** highDecimals;

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

const PRIME = new BN("17012364981921935471");
function randomNonce() {
    let nonce = PRIME;
    while (nonce.gte(PRIME)) {
        nonce = new BN(Math.floor(Math.random() * 10000000));
    }
    return nonce.toString("hex");
}

function getPreBytes(order: any) {
    const bytes = Buffer.concat([
        new BN(order.type).toArrayLike(Buffer, "be", 1),
        new BN(order.expiry).toArrayLike(Buffer, "be", 8),
        new Buffer(order.nonceHash.slice(2), "hex"),
    ]);
    return "0x" + bytes.toString("hex");
}
