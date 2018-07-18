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
const BigNumber = require("bignumber.js");
const BN = require('bn.js');

const chai = require("chai");
chai.use(require("chai-as-promised"));
chai.should();

contract("RenExSettlement", function (accounts) {

    const buyer = accounts[0];
    const seller = accounts[1];
    const darknode = accounts[2];
    let tokenAddresses, orderbook, renExSettlement, renExBalances;

    before(async function () {
        [tokenAddresses, orderbook, renExSettlement, renExBalances] = await setup(darknode);
    });

    it("order 1", async () => {

        const sell = parseOutput(`
[0]:  0000000000000000000000000000000000000000000000000000000000000001
[1]:  0000000000000000000000000000000000000000000000000000000000000001
[2]:  000000000000000000000000000000000000000000000000000000005a758820
[3]:  0000000000000000000000000000000000000000000000000000000100010000
[4]:  0000000000000000000000000000000000000000000000000000000000000001
[5]:  0000000000000000000000000000000000000000000000000000000000000002
[6]:  0000000000000000000000000000000000000000000000000000000000000001
[7]:  0000000000000000000000000000000000000000000000000000000000000003
[8]:  0000000000000000000000000000000000000000000000000000000000000001
[9]:  0000000000000000000000000000000000000000000000000000000000000003
[10]: fda940ba5250d10bd3c701ef3e627a7b0bd0fd5143c45a35981f247fa1db3812
        `);

        const buy = parseOutput(`
[0]:  0000000000000000000000000000000000000000000000000000000000000001
[1]:  0000000000000000000000000000000000000000000000000000000000000000
[2]:  000000000000000000000000000000000000000000000000000000005a758820
[3]:  0000000000000000000000000000000000000000000000000000000100010000
[4]:  0000000000000000000000000000000000000000000000000000000000000001
[5]:  0000000000000000000000000000000000000000000000000000000000000002
[6]:  0000000000000000000000000000000000000000000000000000000000000001
[7]:  0000000000000000000000000000000000000000000000000000000000000003
[8]:  0000000000000000000000000000000000000000000000000000000000000001
[9]:  0000000000000000000000000000000000000000000000000000000000000003
[10]: fda940ba5250d10bd3c701ef3e627a7b0bd0fd5143c45a35981f247fa1db3812
`)

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook);
    });



    it("order 2", async () => {

        const sell = parseOutput(`
[0]:  0000000000000000000000000000000000000000000000000000000000000001
[1]:  0000000000000000000000000000000000000000000000000000000000000001
[2]:  000000000000000000000000000000000000000000000000000000005b1b2867
[3]:  0000000000000000000000000000000000000000000000000000000100000100
[4]:  000000000000000000000000000000000000000000000000000000000000014f
[5]:  0000000000000000000000000000000000000000000000000000000000000022
[6]:  0000000000000000000000000000000000000000000000000000000000000005
[7]:  000000000000000000000000000000000000000000000000000000000000000e
[8]:  0000000000000000000000000000000000000000000000000000000000000008
[9]:  0000000000000000000000000000000000000000000000000000000000000008
[10]: 0000000000000000000000000000000000000000000000000000000000000000
        `);

        const buy = parseOutput(`
[0]:  0000000000000000000000000000000000000000000000000000000000000001
[1]:  0000000000000000000000000000000000000000000000000000000000000000
[2]:  000000000000000000000000000000000000000000000000000000005b1b3144
[3]:  0000000000000000000000000000000000000000000000000000000100000100
[4]:  000000000000000000000000000000000000000000000000000000000000014f
[5]:  0000000000000000000000000000000000000000000000000000000000000022
[6]:  0000000000000000000000000000000000000000000000000000000000000005
[7]:  000000000000000000000000000000000000000000000000000000000000000c
[8]:  0000000000000000000000000000000000000000000000000000000000000008
[9]:  0000000000000000000000000000000000000000000000000000000000000008
[10]: 0000000000000000000000000000000000000000000000000000000000000000
`)

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook);
    });


    it("order 3", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        const sell = { tokens, price: 0.95, volume: 1 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([0.975 /* DGX */, 1 /* REN */]);
    });

    it("order 4", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 1, volume: 1 /* DGX */ };
        const sell = { tokens, price: 0.95, volume: 2 /* REN */, minimumVolume: 1 /* DGX */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([1 /* DGX */, 1.0256410256410258 /* REN */]);
    });

    it("order 5", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 0.5, volume: 1 /* DGX */ };
        const sell = { tokens, price: 0.5, volume: 2 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([1 /* DGX */, 2 /* REN */]);
    });

    it("order 6", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, price: 1, volume: 1 /* DGX */ };
        // More precise than the number of decimals DGX has
        const sell = { tokens, price: 0.0000000001, volume: 2 /* REN */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([1 /* DGX */, 1.9999999998 /* REN */]);
    });

    it("order 7", async () => {
        const tokens = market(DGX, REN);
        const buy = { tokens, priceC: 1999, priceQ: 40, volume: 2 /* DGX */ };
        const sell = { tokens, priceC: 1998, priceQ: 40, volume: 1 /* REN */, minimumVolume: 2 /* DGX */ };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([2 /* DGX */, 0.002001501125844383 /* REN */]);
    });

    it("order 8", async () => {
        const tokens = market(ETH, REN);
        const buy = { tokens, priceC: 200, priceQ: 40, volumeC: 1, volumeQ: 0 /* ETH */, minimumVolumeC: 0, minimumVolumeQ: 0 };
        const sell = { tokens, priceC: 200, priceQ: 40, volume: 1 /* REN */, minimumVolumeC: 0, minimumVolumeQ: 0 };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([2e-13 /* ETH */, 2e-15 /* REN */]);
    });

    it("order 9", async () => {
        const tokens = market(ETH, REN);
        // Highest possible price, lowest possible volume
        const buy = { tokens, priceC: 1999, priceQ: 52, volumeC: 1, volumeQ: 0 /* ETH */, minimumVolumeC: 0, minimumVolumeQ: 0 };
        const sell = { tokens, priceC: 1999, priceQ: 52, volumeC: 1, volumeQ: 0 /* REN */, minimumVolumeC: 0, minimumVolumeQ: 0 };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([2e-13 /* ETH */, 0 /* REN */]);
    });

    it("order 10", async () => {
        const tokens = market(ETH, REN);
        // Highest possible price, lowest possible volume
        const buy = { tokens, priceC: 1999, priceQ: 52, volumeC: 1, volumeQ: 13 /* ETH */, minimumVolumeC: 0, minimumVolumeQ: 0 };
        const sell = { tokens, priceC: 1999, priceQ: 52, volume: 1 /* REN */, minimumVolumeC: 0, minimumVolumeQ: 0 };

        (await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook))
            .should.eql([2 /* ETH */, 2.001e-15 /* REN */]);
    });

    it("invalid orders should revert", async () => {
        const tokens = market(DGX, REN);
        let buy = { tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 2 /* REN */ };
        let sell = { tokens, price: 1, volume: 1 /* REN */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejected;

        buy = { tokens, price: 1, volume: 1 /* DGX */ };
        sell = { tokens, price: 1, volume: 2 /* REN */, minimumVolume: 2 /* REN */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejected;

        buy = { tokens, price: 1, volume: 1 /* DGX */ };
        sell = { tokens, price: 1.05, volume: 1 /* REN */, minimumVolume: 1 /* DGX */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejected;

        buy = { tokens, priceC: 200, priceQ: 38, volume: 1 /* DGX */ };
        sell = { tokens, priceC: 200, priceQ: 39, volume: 1 /* REN */, minimumVolume: 1 /* DGX */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejected;

        // Invalid price (c component)
        buy = { tokens, priceC: 2000, priceQ: 38, volume: 1 /* DGX */ };
        sell = { tokens, priceC: 200, priceQ: 39, volume: 1 /* REN */, minimumVolume: 1 /* DGX */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejected;

        // Invalid price (q component)
        buy = { tokens, priceC: 200, priceQ: 53, volume: 1 /* DGX */, minimumVolume: 1 };
        sell = { tokens, priceC: 200, priceQ: 39, volume: 1 /* REN */, minimumVolume: 1 /* DGX */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejected;

        // Invalid volume (c component)
        buy = { tokens, price: 1, volumeC: 50, volumeQ: 12 /* DGX */ };
        sell = { tokens, price: 1, volume: 1 /* REN */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejected;

        // Invalid volume (q component)
        buy = { tokens, price: 1, volumeC: 0, volumeQ: 53 /* DGX */, minimumVolumeC: 0, minimumVolumeQ: 0 };
        sell = { tokens, price: 1, volume: 1 /* REN */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejected;

        // Invalid minimum volume (c component)
        buy = { tokens, price: 1, volume: 1, minimumVolumeC: 50, minimumVolumeQ: 12 /* DGX */ };
        sell = { tokens, price: 1, volume: 1 /* REN */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejected;

        // Invalid minimum volume (q component)
        buy = { tokens, price: 1, volume: 1, minimumVolumeC: 5, minimumVolumeQ: 53 /* DGX */ };
        sell = { tokens, price: 1, volume: 1 /* REN */ };

        await submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook)
            .should.be.rejected;

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
let prefix = web3.toHex("Republic Protocol: open: ");

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




async function submitMatch(buy, sell, buyer, seller, darknode, renExSettlement, renExBalances, tokenAddresses, orderbook) {

    (sell.parity === undefined || sell.parity !== buy.parity).should.be.true;
    if (buy.parity === 1) {
        sell, buy = buy, sell;
    }
    buy.parity = OrderParity.BUY;
    sell.parity = OrderParity.SELL;

    for (const order of [buy, sell]) {
        if (order.price !== undefined) {
            price = priceToTuple(order.price);
            order.priceC = price.c, order.priceQ = price.q;
        } else {
            order.price = tupleToPrice({ c: order.priceC, q: order.priceQ });
        }
        if (order.volume !== undefined) {
            volume = volumeToTuple(order.volume);
            order.volumeC = volume.c, order.volumeQ = volume.q;
        } else {
            order.volume = tupleToVolume({ c: order.volumeC, q: order.volumeQ }).toFixed();
        }

        if (order.minimumVolumeC === undefined || order.minimumVolumeQ === undefined) {
            if (order.minimumVolume !== undefined) {
                minimumVolume = volumeToTuple(order.minimumVolume);
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
            order.nonceHash = web3.sha3(order.nonce, { encoding: 'hex' });
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
    buy.signature = await web3.eth.sign(buyer, buyHash);


    sell.type = 1; // type
    sell.expiry = sell.expiry || 1641026487; // FIXME: expiry
    sell.tokens = `0x${tokens.toString('hex')}`; // tokens
    if (sell.orderID !== undefined) {
        sell.orderID.should.equal(getOrderID(sell));
    } else {
        sell.orderID = getOrderID(sell);
    }
    let sellHash = prefix + sell.orderID.slice(2);
    const sellSignature = await web3.eth.sign(seller, sellHash);

    const highDecimals = (await highTokenInstance.decimals()).toNumber();
    const lowDecimals = (await lowTokenInstance.decimals()).toNumber();

    // Approve and deposit
    const highDeposit = sell.volume * (10 ** highDecimals);
    const lowDeposit = buy.volume * (10 ** lowDecimals);

    if (lowToken !== ETH) {
        await lowTokenInstance.transfer(buyer, lowDeposit);
        await lowTokenInstance.approve(renExBalances.address, lowDeposit, { from: buyer });
        await renExBalances.deposit(lowTokenInstance.address, lowDeposit, { from: buyer });
    } else {
        await renExBalances.deposit(lowTokenInstance.address, lowDeposit, { from: buyer, value: lowDeposit });
    }

    if (highToken !== ETH) {
        await highTokenInstance.transfer(seller, highDeposit);
        await highTokenInstance.approve(renExBalances.address, highDeposit, { from: seller });
        await renExBalances.deposit(highTokenInstance.address, highDeposit, { from: seller });
    } else {
        await renExBalances.deposit(highTokenInstance.address, highDeposit, { from: seller, value: highDeposit });
    }


    await orderbook.openBuyOrder(buy.signature, buy.orderID, { from: buyer });

    await orderbook.openSellOrder(sellSignature, sell.orderID, { from: seller });

    (await orderbook.orderTrader(buy.orderID)).should.equal(buyer);
    (await orderbook.orderTrader(sell.orderID)).should.equal(seller);

    await orderbook.confirmOrder(buy.orderID, [sell.orderID], { from: darknode });

    await renExSettlement.submitOrder(1, buy.type, buy.parity, buy.expiry, buy.tokens, buy.priceC, buy.priceQ, buy.volumeC, buy.volumeQ, buy.minimumVolumeC, buy.minimumVolumeQ, buy.nonceHash);
    await renExSettlement.submitOrder(1, sell.type, sell.parity, sell.expiry, sell.tokens, sell.priceC, sell.priceQ, sell.volumeC, sell.volumeQ, sell.minimumVolumeC, sell.minimumVolumeQ, sell.nonceHash);

    const buyerLowBefore = await renExBalances.traderBalances(buyer, lowTokenInstance.address);
    const buyerHighBefore = await renExBalances.traderBalances(buyer, highTokenInstance.address);
    const sellerLowBefore = await renExBalances.traderBalances(seller, lowTokenInstance.address);
    const sellerHighBefore = await renExBalances.traderBalances(seller, highTokenInstance.address);

    await renExSettlement.submitMatch(buy.orderID, sell.orderID);

    // const matchID = web3.sha3(buy.orderID + sell.orderID.slice(2), { encoding: 'hex' });
    const match = await renExSettlement.getMatchDetails(buy.orderID);
    const highSum = new BigNumber(match[2]);
    const lowSum = new BigNumber(match[3]);

    const buyerLowAfter = await renExBalances.traderBalances(buyer, lowTokenInstance.address);
    const buyerHighAfter = await renExBalances.traderBalances(buyer, highTokenInstance.address);
    const sellerLowAfter = await renExBalances.traderBalances(seller, lowTokenInstance.address);
    const sellerHighAfter = await renExBalances.traderBalances(seller, highTokenInstance.address);

    buyerLowBefore.sub(lowSum).toFixed().should.equal(buyerLowAfter.toFixed());
    // buyerHighBefore.add(highMatched).toFixed().should.equal(buyerHighAfter.toFixed());
    // sellerLowBefore.add(lowMatched).toFixed().should.equal(sellerLowAfter.toFixed());
    sellerHighBefore.sub(highSum).toFixed().should.equal(sellerHighAfter.toFixed());

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

    return [
        lowSum.toNumber() / 10 ** lowDecimals,
        highSum.toNumber() / 10 ** highDecimals,
    ];
}

async function setup(darknode) {
    const tokenAddresses = {
        [BTC]: await BitcoinMock.new(),
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
    const renExSettlement = await RenExSettlement.new(orderbook.address, renExTokens.address, renExBalances.address, 100 * GWEI);
    await renExBalances.updateRenExSettlementContract(renExSettlement.address);

    await renExTokens.registerToken(ETH, tokenAddresses[ETH].address, 18);
    await renExTokens.registerToken(BTC, tokenAddresses[BTC].address, (await tokenAddresses[BTC].decimals()).toNumber());
    await renExTokens.registerToken(DGX, tokenAddresses[DGX].address, (await tokenAddresses[DGX].decimals()).toNumber());
    await renExTokens.registerToken(REN, tokenAddresses[REN].address, (await tokenAddresses[REN].decimals()).toNumber());

    // Register darknode
    await dnr.register(darknode, "", 0, { from: darknode });
    await dnr.epoch();

    return [tokenAddresses, orderbook, renExSettlement, renExBalances];
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
        new BN(1).toArrayLike(Buffer, "be", 4), // RENEX
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
    return web3.sha3('0x' + bytes.toString('hex'), { encoding: 'hex' });
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
