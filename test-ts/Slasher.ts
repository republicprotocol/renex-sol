const RenExTokens = artifacts.require("RenExTokens");
const RenExBalances = artifacts.require("RenExBalances");
const RenExSettlement = artifacts.require("RenExSettlement");
const RewardVault = artifacts.require("RewardVault");
const Orderbook = artifacts.require("Orderbook");
const RepublicToken = artifacts.require("RepublicToken");
const DarknodeRegistry = artifacts.require("DarknodeRegistry");
const BitcoinMock = artifacts.require("BitcoinMock");
const DGXMock = artifacts.require("DGXMock");

// Two big number libraries are used - BigNumber decimal support
// while BN has better bitwise operations
import BigNumber from "bignumber.js";
import { BN } from "bn.js";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
chai.should();

contract("Slasher", function (accounts) {

    const slasher = accounts[0];
    const buyer = accounts[1];
    const seller = accounts[2];
    const darknode = accounts[3];

    let tokenAddresses, orderbook, renExSettlement, renExBalances, rewardVault;
    let eth_address, eth_decimals;


    before(async function () {
        [tokenAddresses, orderbook, renExSettlement, renExBalances, rewardVault] = await setup(darknode, slasher);
        eth_address = tokenAddresses[ETH].address
        eth_decimals = new BigNumber(10).pow(tokenAddresses[ETH].decimals())
    });


    it("should correctly relocate fees", async () => {
        const tokens = market(BTC, ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* ETH */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ETH */ };

        let [btcAmount, ethAmount, buyOrderID, sellOrderID] = await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook, false);
        btcAmount.should.eql(0.975 /* BTC */);
        ethAmount.should.eql(1 /* ETH */);

        let guiltyOrderID = buyOrderID;
        let guiltyAddress = buyer;
        let innocentOrderID = sellOrderID;
        let innocentAddress = seller;
        (await orderbook.orderMatch(guiltyOrderID))[0].should.eql(innocentOrderID);
        (await orderbook.orderMatch(innocentOrderID))[0].should.eql(guiltyOrderID);

        let feeNum = await renExSettlement.DARKNODE_FEES_NUMERATOR();
        let feeDen = await renExSettlement.DARKNODE_FEES_DENOMINATOR();
        let weiAmount = eth_decimals.times(ethAmount);
        let fees = weiAmount / feeDen * feeNum

        // Store the original balances
        let beforeSlasherBalance = await rewardVault.darknodeBalances(slasher, eth_address);
        let [beforeGuiltyTokens, beforeGuiltyBalances] = await renExBalances.getBalances(guiltyAddress);
        let [beforeInnocentTokens, beforeInnocentBalances] = await renExBalances.getBalances(innocentAddress);
        let beforeGuiltyBalance = beforeGuiltyBalances[beforeGuiltyTokens.indexOf(eth_address)];
        let beforeInnocentBalance = beforeInnocentBalances[beforeInnocentTokens.indexOf(eth_address)];

        // Slash the fees
        await renExSettlement.slash(guiltyOrderID, { from: slasher });

        // Check the new balances
        let afterSlasherBalance = await rewardVault.darknodeBalances(slasher, eth_address);
        let [afterGuiltyTokens, afterGuiltyBalances] = await renExBalances.getBalances(guiltyAddress);
        let [afterInnocentTokens, afterInnocentBalances] = await renExBalances.getBalances(innocentAddress);
        let afterGuiltyBalance = afterGuiltyBalances[afterGuiltyTokens.indexOf(eth_address)];
        let afterInnocentBalance = afterInnocentBalances[afterInnocentTokens.indexOf(eth_address)];

        // Make sure fees were reallocated correctly
        let slasherBalanceDiff = afterSlasherBalance - beforeSlasherBalance;
        let innocentBalanceDiff = afterInnocentBalance - beforeInnocentBalance;
        let guiltyBalanceDiff = afterGuiltyBalance - beforeGuiltyBalance;
        // We expect the slasher to have +0.002% fees
        slasherBalanceDiff.should.eql(fees);
        // We expect the innocent trader to have +0.002% fees
        innocentBalanceDiff.should.eql(fees);
        // We expect the guilty trader to have -0.004% fees
        guiltyBalanceDiff.should.eql(-fees * 2);
    });

    it("should not slash bonds more than once", async () => {
        const tokens = market(BTC, ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* ETH */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ETH */ };

        let [, , buyOrderID, sellOrderID] = await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook, false);
        let guiltyOrderID = buyOrderID;
        let innocentOrderID = sellOrderID;

        // Slash the fees
        await renExSettlement.slash(guiltyOrderID, { from: slasher });

        await renExSettlement.slash(guiltyOrderID, { from: slasher })
            .should.be.rejectedWith(null, /match already slashed/); // already slashed

        await renExSettlement.slash(innocentOrderID, { from: slasher })
            .should.be.rejectedWith(null, /match already slashed/); // already slashed
    });

    it("should handle orders if ETH is the low token", async () => {
        const tokens = market(ETH, BTC);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* ETH */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ETH */ };

        let [, , buyOrderID,] = await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook, false);
        let guiltyOrderID = buyOrderID;

        // Slash the fees
        await renExSettlement.slash(guiltyOrderID, { from: slasher })
            .should.not.be.rejected;
    });

    it("should not slash non-ETH atomic swaps", async () => {
        const tokens = market(BTC, BTC);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* ETH */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ETH */ };

        let [, , buyOrderID,] = await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook, false);
        let guiltyOrderID = buyOrderID;

        // Slash the fees
        await renExSettlement.slash(guiltyOrderID, { from: slasher })
            .should.be.rejectedWith(null, /non-eth tokens/);
    });

    it("should not slash non-atomic swap orders", async () => {
        const tokens = market(ETH, REN);
        // Highest possible price, lowest possible volume
        const buy = { tokens, priceC: 1999, priceQ: 52, volumeC: 1, volumeQ: 13 /* ETH */, minimumVolumeC: 0, minimumVolumeQ: 0 };
        const sell = { tokens, priceC: 1999, priceQ: 52, volume: 1 /* REN */, minimumVolumeC: 0, minimumVolumeQ: 0 };

        let [ethAmount, renAmount, guiltyOrderID,] = await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook);
        ethAmount.should.eql(2 /* ETH */);
        renAmount.should.eql(2.001e-15 /* REN */);

        await renExSettlement.slash(guiltyOrderID, { from: slasher })
            .should.be.rejectedWith(null, /slashing non-atomic trade/);
    });
});













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
}


function parseOutput(scraped) {
    return {
        // orderID: '0x' + getLine(scraped, 0).toArrayLike(Buffer, "be", 32).toString('hex'),
        parity: getLine(scraped, 1).toNumber(),
        expiry: getLine(scraped, 2).toNumber(),
        tokens: getLine(scraped, 3),
        priceC: getLine(scraped, 4).toNumber(),
        priceQ: getLine(scraped, 5).toNumber(),
        volumeC: getLine(scraped, 6).toNumber(),
        volumeQ: getLine(scraped, 7).toNumber(),
        minimumVolumeC: getLine(scraped, 8).toNumber(),
        minimumVolumeQ: getLine(scraped, 9).toNumber(),
        nonceHash: '0x' + getLine(scraped, 10).toArrayLike(Buffer, "be", 32).toString('hex'),
    }
}
function getLine(scraped, lineno) {
    const re = new RegExp("\\n\\[" + lineno + "\\]:\\s*([0-9a-f]*)");
    return new BN(scraped.match(re)[1], 16);
}




async function submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook, verify = true) {
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
        if (order.price !== undefined) {
            const price = priceToTuple(order.price);
            order.priceC = price.c, order.priceQ = price.q;
        } else {
            order.price = tupleToPrice({ c: order.priceC, q: order.priceQ });
        }
        if (order.volume !== undefined) {
            const volume = volumeToTuple(order.volume);
            order.volumeC = volume.c, order.volumeQ = volume.q;
        } else {
            order.volume = tupleToVolume({ c: order.volumeC, q: order.volumeQ }).toFixed();
        }

        if (order.minimumVolumeC === undefined || order.minimumVolumeQ === undefined) {
            if (order.minimumVolume !== undefined) {
                const minimumVolume = volumeToTuple(order.minimumVolume);
                order.minimumVolumeC = minimumVolume.c, order.minimumVolumeQ = minimumVolume.q;
            } else {
                let minV = (order.parity === OrderParity.BUY) ?
                    volumeToTuple(order.volume / order.price) :
                    volumeToTuple(order.volume * order.price);

                order.minimumVolumeC = minV.c, order.minimumVolumeQ = minV.q;
            }
        }

        if (order.nonceHash === undefined) {
            if (order.nonce === undefined) {
                order.nonce = randomNonce();
            }
            order.nonceHash = (web3.utils.sha3 as any)(order.nonce, { encoding: 'hex' });
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
    buy.tokens = `0x${tokens.toString('hex')}`;
    if (buy.orderID !== undefined) {
        buy.orderID.should.equal(getOrderID(buy));
    } else {
        buy.orderID = getOrderID(buy);
    }
    let buyHash = prefix + buy.orderID.slice(2);
    buy.signature = await web3.eth.sign(buyHash, buyer);

    sell.type = 1; // type
    sell.expiry = sell.expiry || 1641026487; // FIXME: expiry
    sell.tokens = `0x${tokens.toString('hex')}`; // tokens
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
    const highDeposit = sell.volume * (10 ** highDecimals);
    const lowDeposit = buy.volume * (10 ** lowDecimals);

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

    await renExSettlement.submitOrder(buy.settlement, buy.type, buy.parity, buy.expiry, buy.tokens, buy.priceC, buy.priceQ, buy.volumeC, buy.volumeQ, buy.minimumVolumeC, buy.minimumVolumeQ, buy.nonceHash);
    await renExSettlement.submitOrder(sell.settlement, sell.type, sell.parity, sell.expiry, sell.tokens, sell.priceC, sell.priceQ, sell.volumeC, sell.volumeQ, sell.minimumVolumeC, sell.minimumVolumeQ, sell.nonceHash);

    const buyerLowBefore = new BigNumber(await renExBalances.traderBalances(buyer, lowTokenInstance.address));
    const buyerHighBefore = new BigNumber(await renExBalances.traderBalances(buyer, highTokenInstance.address));
    const sellerLowBefore = new BigNumber(await renExBalances.traderBalances(seller, lowTokenInstance.address));
    const sellerHighBefore = new BigNumber(await renExBalances.traderBalances(seller, highTokenInstance.address));

    await renExSettlement.submitMatch(buy.orderID, sell.orderID);

    const buyMatch = await renExSettlement.getMatchDetails(buy.orderID);
    const highSum = new BigNumber(buyMatch[2]);
    const lowSum = new BigNumber(buyMatch[3]);

    if (verify) {
        const sellMatch = await renExSettlement.getMatchDetails(sell.orderID);
        buyMatch[0].should.equal(buy.orderID);
        buyMatch[1].should.equal(sell.orderID);
        sellMatch[0].should.equal(sell.orderID);
        sellMatch[1].should.equal(buy.orderID);
        buyMatch[2].should.equal(sellMatch[3]);
        buyMatch[3].should.equal(sellMatch[2]);
        buyMatch[4].should.equal(sellMatch[5]);
        buyMatch[5].should.equal(sellMatch[4]);

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

    return [
        lowSum.toNumber() / 10 ** lowDecimals,
        highSum.toNumber() / 10 ** highDecimals,
        buy.orderID,
        sell.orderID
    ];
}

async function setup(darknode, slasherAddress) {
    const tokenAddresses = {
        [BTC]: { address: "0x0000000000000000000000000000000000000000", decimals: () => new BigNumber(8), approve: () => null },
        [ETH]: { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: () => new BigNumber(18), approve: () => null },
        [DGX]: await DGXMock.new(),
        [REN]: await RepublicToken.new(),
    };

    const dnr = await DarknodeRegistry.new(
        tokenAddresses[REN].address,
        0,
        1,
        0
    );
    const orderbook = await Orderbook.new(0, tokenAddresses[REN].address, dnr.address);
    const rewardVault = await RewardVault.new(dnr.address);
    const renExBalances = await RenExBalances.new(rewardVault.address);
    const renExTokens = await RenExTokens.new();
    const GWEI = 1000000000;
    const renExSettlement = await RenExSettlement.new(orderbook.address, renExTokens.address, renExBalances.address, 100 * GWEI, slasherAddress);
    await renExBalances.setRenExSettlementContract(renExSettlement.address);

    await renExTokens.registerToken(BTC, tokenAddresses[BTC].address, 8);
    await renExTokens.registerToken(ETH, tokenAddresses[ETH].address, 18);
    await renExTokens.registerToken(DGX, tokenAddresses[DGX].address, (await tokenAddresses[DGX].decimals()));
    await renExTokens.registerToken(REN, tokenAddresses[REN].address, (await tokenAddresses[REN].decimals()));

    // Register darknode
    await dnr.register(darknode, "0x00", 0, { from: darknode });
    await dnr.epoch();

    return [tokenAddresses, orderbook, renExSettlement, renExBalances, rewardVault];
}


const PRIME = new BN('17012364981921935471');
function randomNonce() {
    let nonce = PRIME;
    while (nonce.gte(PRIME)) {
        nonce = new BN(Math.floor(Math.random() * 10000000));
    }
    return nonce.toString('hex');
}



function getOrderID(order) {
    const bytes = Buffer.concat([
        new BN(order.type).toArrayLike(Buffer, "be", 1),
        new BN(order.parity).toArrayLike(Buffer, "be", 1),
        new BN(order.settlement).toArrayLike(Buffer, "be", 4), // RENEX
        new BN(order.expiry).toArrayLike(Buffer, "be", 8),
        new BN(order.tokens.slice(2), 'hex').toArrayLike(Buffer, "be", 8),
        new BN(order.priceC).toArrayLike(Buffer, "be", 8),
        new BN(order.priceQ).toArrayLike(Buffer, "be", 8),
        new BN(order.volumeC).toArrayLike(Buffer, "be", 8),
        new BN(order.volumeQ).toArrayLike(Buffer, "be", 8),
        new BN(order.minimumVolumeC).toArrayLike(Buffer, "be", 8),
        new BN(order.minimumVolumeQ).toArrayLike(Buffer, "be", 8),
        new Buffer(order.nonceHash.slice(2), 'hex'),
    ]);
    return (web3.utils.sha3 as any)('0x' + bytes.toString('hex'), { encoding: 'hex' });
}






/**
 * Calculate price tuple from a decimal string
 *
 * https://github.com/republicprotocol/republic-go/blob/smpc/docs/orders-and-order-fragments.md
 *
 */
function priceToTuple(priceI) {
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
}

function volumeToTuple(volumeI) {
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
}

function floatToTuple(shift, exponentOffset, step, value, max) {
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


function significantDigits(n, digits, simplify = false) {
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
