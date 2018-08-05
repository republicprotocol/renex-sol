// tslint:disable:max-line-length

const RenExTokens = artifacts.require("RenExTokens");
const RenExBalances = artifacts.require("RenExBalances");
const RenExSettlement = artifacts.require("RenExSettlement");
const DarknodeRewardVault = artifacts.require("DarknodeRewardVault");
const Orderbook = artifacts.require("Orderbook");
const RepublicToken = artifacts.require("RepublicToken");
const DarknodeRegistryStore = artifacts.require("DarknodeRegistryStore");
const DarknodeRegistry = artifacts.require("DarknodeRegistry");
const DGXMock = artifacts.require("DGXMock");

// Two big number libraries are used - BigNumber decimal support
// while BN has better bitwise operations
import BigNumber from "bignumber.js";
import { BN } from "bn.js";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
chai.should();

contract.skip("RenEx", function (accounts: string[]) {

    const buyer = accounts[0];
    const seller = accounts[1];
    const darknode = accounts[2];
    let tokenAddresses, orderbook, renExSettlement, renExBalances;

    before(async function () {
        ({ tokenAddresses, orderbook, renExSettlement, renExBalances } = await setupContracts(darknode, 0x0, 0x0));
    });

    it("order 1", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        const sell = { tokens, price: 0.95, volume: 1 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([0.975 /* DGX */, 1 /* REN */]);
    });

    it("order 2", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 1, volume: 1 /* DGX */ };
        const sell = { tokens, price: 0.95, volume: 2 /* REN */, minimumVolume: 1 /* DGX */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([1 /* DGX */, 1.0256410256410258 /* REN */]);
    });

    it("order 3", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 0.5, volume: 1 /* DGX */ };
        const sell = { tokens, price: 0.5, volume: 2 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([1 /* DGX */, 2 /* REN */]);
    });

    it("order 4", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 1, volume: 1 /* DGX */ };
        // More precise than the number of decimals DGX has
        const sell = { tokens, price: 0.0000000001, volume: 2 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([1 /* DGX */, 1.9999999998 /* REN */]);
    });

    it("order 5", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, priceC: 1999, priceQ: 40, volume: 2 /* DGX */ };
        const sell = { tokens, priceC: 1998, priceQ: 40, volume: 1 /* REN */, minimumVolume: 2 /* DGX */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([2 /* DGX */, 0.002001501125844383 /* REN */]);
    });

    it("order 6", async () => {
        const tokens = market(ETH, REN);
        // Highest possible price, lowest possible volume
        const buy = { tokens, priceC: 1999, priceQ: 52, volumeC: 1, volumeQ: 13 /* ETH */, minimumVolumeC: 0, minimumVolumeQ: 0 };
        const sell = { tokens, priceC: 1999, priceQ: 52, volume: 1 /* REN */, minimumVolumeC: 0, minimumVolumeQ: 0 };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([2 /* ETH */, 2.001e-15 /* REN */]);
    });

    // it("order 6", async () => {
    //     const tokens = market(ETH, REN);
    //     const buy = { tokens, priceC: 200, priceQ: 40, volumeC: 1, volumeQ: 0 /* ETH */, minimumVolumeC: 0, minimumVolumeQ: 0 };
    //     const sell = { tokens, priceC: 200, priceQ: 40, volume: 1 /* REN */, minimumVolumeC: 0, minimumVolumeQ: 0 };

    //     (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
    //         .should.eql([2e-13 /* ETH */, 2e-15 /* REN */]);
    // });

    // it("order 7", async () => {
    //     const tokens = market(ETH, REN);
    //     // Highest possible price, lowest possible volume
    //     const buy = { tokens, priceC: 1999, priceQ: 52, volumeC: 1, volumeQ: 0 /* ETH */, minimumVolumeC: 0, minimumVolumeQ: 0 };
    //     const sell = { tokens, priceC: 1999, priceQ: 52, volumeC: 1, volumeQ: 0 /* REN */, minimumVolumeC: 0, minimumVolumeQ: 0 };

    //     (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
    //         .should.eql([2e-13 /* ETH */, 0 /* REN */]);
    // });

    it("atomic swap", async () => {
        const tokens = market(BTC, ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook, false))
            .should.eql([0.975 /* DGX */, 1 /* REN */]);
    });

    it("invalid orders should revert", async () => {
        const tokens = market(DGX, REN);
        let buy: any = { tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 2 /* REN */ };
        let sell: any = { tokens, price: 1, volume: 1 /* REN */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /incompatible orders/);

        buy = { tokens, price: 1, volume: 1 /* DGX */ };
        sell = { tokens, price: 1, volume: 2 /* REN */, minimumVolume: 2 /* REN */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /incompatible orders/);

        buy = { tokens, price: 1, volume: 1 /* DGX */ };
        sell = { tokens, price: 1.05, volume: 1 /* REN */, minimumVolume: 1 /* DGX */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /incompatible orders/);

        buy = { tokens, priceC: 200, priceQ: 38, volume: 1 /* DGX */ };
        sell = { tokens, priceC: 200, priceQ: 39, volume: 1 /* REN */, minimumVolume: 1 /* DGX */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /incompatible orders/);

        // // Invalid price (c component)
        // buy = { tokens, priceC: 2000, priceQ: 38, volume: 1 /* DGX */ };
        // sell = { tokens, priceC: 200, priceQ: 39, volume: 1 /* REN */, minimumVolume: 1 /* DGX */ };

        // await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
        //     .should.be.rejectedWith(null, /invalid order price coefficient/);

        // // Invalid price (q component)
        // buy = { tokens, priceC: 200, priceQ: 53, volume: 1 /* DGX */, minimumVolume: 1 };
        // sell = { tokens, priceC: 200, priceQ: 39, volume: 1 /* REN */, minimumVolume: 1 /* DGX */ };

        // await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
        //     .should.be.rejectedWith(null, /invalid order price exponent/);

        // // Invalid volume (c component)
        // buy = { tokens, price: 1, volumeC: 50, volumeQ: 12 /* DGX */ };
        // sell = { tokens, price: 1, volume: 1 /* REN */ };

        // await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
        //     .should.be.rejectedWith(null, /invalid order volume coefficient/);

        // // Invalid volume (q component)
        // buy = { tokens, price: 1, volumeC: 0, volumeQ: 53 /* DGX */, minimumVolumeC: 0, minimumVolumeQ: 0 };
        // sell = { tokens, price: 1, volume: 1 /* REN */ };

        // await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
        //     .should.be.rejectedWith(null, /invalid order volume exponent/);

        // // Invalid minimum volume (c component)
        // buy = { tokens, price: 1, volume: 1, minimumVolumeC: 50, minimumVolumeQ: 12 /* DGX */ };
        // sell = { tokens, price: 1, volume: 1 /* REN */ };

        // await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
        //     .should.be.rejectedWith(null, /invalid order minimum volume coefficient/);

        // // Invalid minimum volume (q component)
        // buy = { tokens, price: 1, volume: 1, minimumVolumeC: 5, minimumVolumeQ: 53 /* DGX */ };
        // sell = { tokens, price: 1, volume: 1 /* REN */ };

        // await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
        //     .should.be.rejectedWith(null, /invalid order minimum volume exponent/);

        // Unsupported settlement
        buy = { settlement: 3, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { settlement: 3, tokens, price: 0.95, volume: 1 /* REN */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejectedWith(null, /invalid settlement id/);
    });

    it("atomic fees are paid in ethereum-based token", async () => {
        let tokens = market(ETH, BTC);
        let buy = { settlement: 2, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        let sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook, false))
            .should.eql([0.975 /* DGX */, 1 /* REN */]);

        tokens = market(BTC, BTC);
        buy = { settlement: 2, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook, false))
            .should.eql([0.975 /* DGX */, 1 /* REN */]);
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

// function parseOutput(scraped: string) {
//     return {
//         // orderID: '0x' + getLine(scraped, 0).toArrayLike(Buffer, "be", 32).toString('hex'),
//         parity: getLine(scraped, 1).toNumber(),
//         expiry: getLine(scraped, 2).toNumber(),
//         tokens: getLine(scraped, 3),
//         priceC: getLine(scraped, 4).toNumber(),
//         priceQ: getLine(scraped, 5).toNumber(),
//         volumeC: getLine(scraped, 6).toNumber(),
//         volumeQ: getLine(scraped, 7).toNumber(),
//         minimumVolumeC: getLine(scraped, 8).toNumber(),
//         minimumVolumeQ: getLine(scraped, 9).toNumber(),
//         nonceHash: "0x" + getLine(scraped, 10).toArrayLike(Buffer, "be", 32).toString("hex"),
//     };
// }
// function getLine(scraped: string, lineno: number) {
//     const re = new RegExp("\\n\\[" + lineno + "\\]:\\s*([0-9a-f]*)");
//     return new BN(scraped.match(re)[1], 16);
// }

export async function submitMatch(
    buy: any, sell: any, buyer: string, seller: string,
    darknode: string, renExSettlement: any, renExBalances: any, tokenAddresses: any, orderbook: any,
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
        if (order.price === undefined) {
            order.price = tupleToPrice({ c: order.priceC, q: order.priceQ });
        }
        if (order.volume === undefined) {
            order.volume = tupleToVolume({ c: order.volumeC, q: order.volumeQ }).toFixed();
        }

        if (order.minimumVolume === undefined) {
            if (order.minimumVolumeC !== undefined) {
                order.minimumVolume = tupleToVolume({ c: order.minimumVolumeC, q: order.minimumVolumeQ });
            } else {
                order.minimumVolume = new BigNumber(0);
            }
        }
        if (order.minimumVolume === undefined) {
            order.minimumVolume = tupleToVolume({ c: order.minimumVolumeC, q: order.minimumVolumeQ });
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

    const lowTokenInstance = tokenAddresses[lowToken];
    const highTokenInstance = tokenAddresses[highToken];

    buy.expiry = buy.expiry || 1641026487;
    buy.type = 1;
    buy.tokens = `0x${tokens.toString("hex")}`;
    if (buy.orderID !== undefined) {
        buy.orderID.should.equal(getOrderID(buy));
    } else {
        buy.orderID = getOrderID(buy);
    }
    let buyHash = prefix + buy.orderID.slice(2);
    buy.signature = await web3.eth.sign(buyHash, buyer);

    sell.type = 1; // type
    sell.expiry = sell.expiry || 1641026487; // FIXME: expiry
    sell.tokens = `0x${tokens.toString("hex")}`; // tokens
    if (sell.orderID !== undefined) {
        sell.orderID.should.equal(getOrderID(sell));
    } else {
        sell.orderID = getOrderID(sell);
    }
    let sellHash = prefix + sell.orderID.slice(2);
    const sellSignature = await web3.eth.sign(sellHash, seller);

    const highDecimals = new BigNumber(await highTokenInstance.decimals()).toNumber();
    const lowDecimals = new BigNumber(await lowTokenInstance.decimals()).toNumber();

    // Approve and deposit
    const highDeposit = sell.volume.multipliedBy(10 ** highDecimals);
    const lowDeposit = buy.volume.multipliedBy(10 ** lowDecimals);

    if (lowToken !== ETH && lowToken !== BTC) {
        await lowTokenInstance.transfer(buyer, lowDeposit);
        await lowTokenInstance.approve(renExBalances.address, lowDeposit, { from: buyer });
        await renExBalances.deposit(lowTokenInstance.address, lowDeposit, { from: buyer });
    } else {
        const deposit = lowToken === BTC ? highDeposit : lowDeposit;
        await renExBalances.deposit(tokenAddresses[ETH].address, deposit, { from: buyer, value: deposit });
    }

    if (highToken !== ETH && highToken !== BTC) {
        await highTokenInstance.transfer(seller, highDeposit);
        await highTokenInstance.approve(renExBalances.address, highDeposit, { from: seller });
        await renExBalances.deposit(highTokenInstance.address, highDeposit, { from: seller });
    } else {
        const deposit = highToken === BTC ? lowDeposit : highDeposit;
        await renExBalances.deposit(tokenAddresses[ETH].address, deposit, { from: seller, value: deposit });
    }

    await orderbook.openBuyOrder(buy.signature, buy.orderID, { from: buyer }).should.not.be.rejected;

    await orderbook.openSellOrder(sellSignature, sell.orderID, { from: seller }).should.not.be.rejected;

    (await orderbook.orderTrader(buy.orderID)).should.equal(buyer);
    (await orderbook.orderTrader(sell.orderID)).should.equal(seller);

    await orderbook.confirmOrder(buy.orderID, [sell.orderID], { from: darknode }).should.not.be.rejected;

    await renExSettlement.submitOrder(buy.settlement, buy.type, buy.parity, buy.expiry, buy.tokens, buy.price.multipliedBy(10 ** 12), buy.volume.multipliedBy(10 ** 12), buy.minimumVolume.multipliedBy(10 ** 12), buy.nonceHash);
    await renExSettlement.submitOrder(sell.settlement, sell.type, sell.parity, sell.expiry, sell.tokens, sell.price.multipliedBy(10 ** 12), sell.volume.multipliedBy(10 ** 12), sell.minimumVolume.multipliedBy(10 ** 12), sell.nonceHash);

    const buyerLowBefore = new BigNumber(await renExBalances.traderBalances(buyer, lowTokenInstance.address));
    // const buyerHighBefore = new BigNumber(await renExBalances.traderBalances(buyer, highTokenInstance.address));
    // const sellerLowBefore = new BigNumber(await renExBalances.traderBalances(seller, lowTokenInstance.address));
    const sellerHighBefore = new BigNumber(await renExBalances.traderBalances(seller, highTokenInstance.address));

    await renExSettlement.submitMatch(buy.orderID, sell.orderID)
        .should.not.be.rejected;

    const buyMatch = await renExSettlement.getMatchDetails(buy.orderID);
    const highSum = new BigNumber(buyMatch[2]);
    const lowSum = new BigNumber(buyMatch[3]);

    if (verify) {
        const sellMatch = await renExSettlement.getMatchDetails(sell.orderID);
        buyMatch[0].toString().should.equal(buy.orderID.toString());
        buyMatch[1].toString().should.equal(sell.orderID.toString());
        sellMatch[0].toString().should.equal(sell.orderID.toString());
        sellMatch[1].toString().should.equal(buy.orderID.toString());
        buyMatch[2].toString().should.equal(sellMatch[3].toString());
        buyMatch[3].toString().should.equal(sellMatch[2].toString());
        buyMatch[4].toString().should.equal(sellMatch[5].toString());
        buyMatch[5].toString().should.equal(sellMatch[4].toString());

        const buyerLowAfter = new BigNumber(await renExBalances.traderBalances(buyer, lowTokenInstance.address));
        // const buyerHighAfter = new BigNumber(await renExBalances.traderBalances(buyer, highTokenInstance.address));
        // const sellerLowAfter = new BigNumber(await renExBalances.traderBalances(seller, lowTokenInstance.address));
        const sellerHighAfter = new BigNumber(await renExBalances.traderBalances(seller, highTokenInstance.address));

        buyerLowBefore.minus(lowSum).toFixed().should.equal(buyerLowAfter.toFixed());
        // buyerHighBefore.plus(highMatched).toFixed().should.equal(buyerHighAfter.toFixed());
        // sellerLowBefore.plus(lowMatched).toFixed().should.equal(sellerLowAfter.toFixed());
        sellerHighBefore.minus(highSum).toFixed().should.equal(sellerHighAfter.toFixed());

        // const expectedLowFees = lowSum
        //     .multipliedBy(2)
        //     .dividedBy(1000)
        //     .integerValue(BigNumber.ROUND_CEIL);
        // const expectedHighFees = highSum
        //     .multipliedBy(2)
        //     .dividedBy(1000)
        //     .integerValue(BigNumber.ROUND_CEIL);

        // lowFee.toFixed().should.equal(expectedLowFees.toFixed());
        // highFee.toFixed().should.equal(expectedHighFees.toFixed());
    }

    const lowRet = lowSum.toNumber() / 10 ** lowDecimals;
    const highRet = highSum.toNumber() / 10 ** highDecimals;

    if (returnIDs) {
        return [
            lowRet, highRet,
            buy.orderID,
            sell.orderID
        ];
    } else {
        return [lowRet, highRet];
    }
}

export async function setupContracts(darknode: string | number, slasherAddress: string | number, broker: string | number) {
    const tokenAddresses = {
        [BTC]: { address: "0x0000000000000000000000000000000000000000", decimals: () => new BigNumber(8), approve: () => null },
        [ETH]: { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: () => new BigNumber(18), approve: () => null },
        [DGX]: await DGXMock.new(),
        [REN]: await RepublicToken.new(),
    };

    const dnrStore = await DarknodeRegistryStore.new(tokenAddresses[REN].address.address);
    const dnr = await DarknodeRegistry.new(
        tokenAddresses[REN].address,
        dnrStore.address,
        0,
        1,
        0
    );
    dnr.updateSlasher(0x0);
    dnrStore.transferOwnership(dnr.address);

    const orderbook = await Orderbook.new(0, tokenAddresses[REN].address, dnr.address);
    const darknodeRewardVault = await DarknodeRewardVault.new(dnr.address);
    const renExBalances = await RenExBalances.new(darknodeRewardVault.address);
    const renExTokens = await RenExTokens.new();
    const GWEI = 1000000000;
    const renExSettlement = await RenExSettlement.new(orderbook.address, renExTokens.address, renExBalances.address, 100 * GWEI, slasherAddress);
    await renExBalances.updateRenExSettlementContract(renExSettlement.address);

    await renExTokens.registerToken(BTC, tokenAddresses[BTC].address, 8);
    await renExTokens.registerToken(ETH, tokenAddresses[ETH].address, 18);
    await renExTokens.registerToken(DGX, tokenAddresses[DGX].address, (await tokenAddresses[DGX].decimals()));
    await renExTokens.registerToken(REN, tokenAddresses[REN].address, (await tokenAddresses[REN].decimals()));

    // Register darknode
    await dnr.register(darknode, "0x00", 0, { from: darknode });
    await dnr.epoch();

    if (broker !== 0x0) {
        await tokenAddresses[REN].approve(orderbook.address, 100 * 1e18, { from: broker });
    }

    return { tokenAddresses, orderbook, renExSettlement, renExBalances, darknodeRewardVault, renExTokens };
}

const PRIME = new BN("17012364981921935471");
function randomNonce() {
    let nonce = PRIME;
    while (nonce.gte(PRIME)) {
        nonce = new BN(Math.floor(Math.random() * 10000000));
    }
    return nonce.toString("hex");
}

function getOrderID(order: any) {
    const bytes = Buffer.concat([
        new BN(order.type).toArrayLike(Buffer, "be", 1),
        new BN(order.parity).toArrayLike(Buffer, "be", 1),
        new BN(order.settlement).toArrayLike(Buffer, "be", 4), // RENEX
        new BN(order.expiry).toArrayLike(Buffer, "be", 8),
        new BN(order.tokens.slice(2), "hex").toArrayLike(Buffer, "be", 8),
        new BN(order.price.multipliedBy(10 ** 12).toFixed()).toArrayLike(Buffer, "be", 32),
        new BN(order.volume.multipliedBy(10 ** 12).toFixed()).toArrayLike(Buffer, "be", 32),
        new BN(order.minimumVolume.multipliedBy(10 ** 12).toFixed()).toArrayLike(Buffer, "be", 32),
        new Buffer(order.nonceHash.slice(2), "hex"),
    ]);
    return (web3.utils.sha3 as any)("0x" + bytes.toString("hex"), { encoding: "hex" });
}

/**
 * Calculate price tuple from a decimal string
 *
 * https://github.com/republicprotocol/republic-go/blob/smpc/docs/orders-and-order-fragments.md
 *
 */
function priceToTuple(priceI: number) {
    const price = new BigNumber(priceI);
    const shift = 10 ** 12;
    const exponentOffset = 26;
    const step = 0.005;
    const tuple = floatToTuple(shift, exponentOffset, step, price, 1999);
    console.assert(0 <= tuple.c && tuple.c <= 1999, `Expected c (${tuple.c}) to be in [1,1999] in priceToTuple(${price})`);
    console.assert(0 <= tuple.q && tuple.q <= 52, `Expected q (${tuple.q}) to be in [0,52] in priceToTuple(${price})`);
    return tuple;
}

const tupleToPrice = (t) => {
    const e = new BigNumber(10).pow(t.q - 26 - 12 - 3);
    return new BigNumber(t.c).times(5).times(e);
};

function volumeToTuple(volumeI: number) {
    const volume = new BigNumber(volumeI);
    const shift = 10 ** 12;
    const exponentOffset = 0;
    const step = 0.2;
    const tuple = floatToTuple(shift, exponentOffset, step, volume, 49);
    console.assert(0 <= tuple.c && tuple.c <= 49, `Expected c (${tuple.c}) to be in [1,49] in volumeToTuple(${volume})`);
    console.assert(0 <= tuple.q && tuple.q <= 52, `Expected q (${tuple.q}) to be in [0,52] in volumeToTuple(${volume})`);
    return tuple;
}

const tupleToVolume = (t) => {
    const e = new BigNumber(10).pow(t.q - 12);
    return new BigNumber(t.c).times(0.2).times(e);
};

function floatToTuple(shift: number, exponentOffset: number, step: number, value: BigNumber, max: number) {
    const shifted = value.times(shift);

    const digits = -Math.floor(Math.log10(step)) + 1;
    const stepInt = step * 10 ** (digits - 1);

    // CALCULATE tuple
    let [c, exp] = significantDigits(shifted.toNumber(), digits, false);
    c = (c - (c % stepInt)) / step;

    // Simplify again if possible - e.g. [1910,32] becomes [191,33]
    let expAdd;
    [c, expAdd] = significantDigits(c, digits, false);
    exp += expAdd;

    // TODO: Fixme
    while (c > max) {
        c /= 10;
        exp++;
    }

    const q = exponentOffset + exp;

    return { c, q };
}

function significantDigits(n: number, digits: number, simplify: boolean = false) {
    if (n === 0) {
        return [0, 0];
    }
    let exp = Math.floor(Math.log10(n)) - (digits - 1);
    let c = Math.floor((n) / (10 ** exp));

    if (simplify) {
        while (c % 10 === 0 && c !== 0) {
            c = c / 10;
            exp++;
        }
    }

    return [c, exp];
}
