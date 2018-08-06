// tslint:disable:max-line-length

const RenExBalances = artifacts.require("RenExBalances");
const RenExSettlement = artifacts.require("RenExSettlement");
const Orderbook = artifacts.require("Orderbook");
const RepublicToken = artifacts.require("RepublicToken");
const DarknodeRegistry = artifacts.require("DarknodeRegistry");
const DGXMock = artifacts.require("DGXMock");
const RenExTokens = artifacts.require("RenExTokens");
const DarknodeRewardVault = artifacts.require("DarknodeRewardVault");

// Two big number libraries are used - BigNumber decimal support
// while BN has better bitwise operations
import BigNumber from "bignumber.js";
import { BN } from "bn.js";

import * as testUtils from "./helper/testUtils";

import { submitMatch } from "./RenEx";

contract("Slasher", function (accounts: string[]) {

    const slasher = accounts[0];
    const buyer = accounts[1];
    const seller = accounts[2];
    const darknode = accounts[3];
    const broker = accounts[4];

    let tokenAddresses, orderbook, renExSettlement, renExBalances, darknodeRewardVault;
    let eth_address, eth_decimals;

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
        darknodeRewardVault = await DarknodeRewardVault.deployed();
        renExSettlement = await RenExSettlement.deployed();
        renExBalances = await RenExBalances.deployed();

        // Register extra token
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

        await renExSettlement.updateSlasher(slasher);

        eth_address = tokenAddresses[ETH].address;
        eth_decimals = new BigNumber(10).pow(tokenAddresses[ETH].decimals());
    });

    it("should correctly relocate fees", async () => {
        const tokens = market(BTC, ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* ETH */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ETH */ };

        let [btcAmount, ethAmount, buyOrderID, sellOrderID] = await submitMatch(
            buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, false, true
        );
        btcAmount.should.eql(0.975 /* BTC */);
        ethAmount.should.eql(1 /* ETH */);

        let guiltyOrderID = buyOrderID;
        let guiltyAddress = buyer;
        let innocentOrderID = sellOrderID;
        let innocentAddress = seller;
        (await orderbook.orderMatch(guiltyOrderID)).should.eql(innocentOrderID);
        (await orderbook.orderMatch(innocentOrderID)).should.eql(guiltyOrderID);

        let feeNum = await renExSettlement.DARKNODE_FEES_NUMERATOR();
        let feeDen = await renExSettlement.DARKNODE_FEES_DENOMINATOR();
        let weiAmount = eth_decimals.times(ethAmount);
        let fees = weiAmount / feeDen * feeNum;

        // Store the original balances
        let beforeBurntBalance = await darknodeRewardVault.darknodeBalances(0x0, eth_address);
        let [beforeGuiltyTokens, beforeGuiltyBalances] = await renExBalances.getBalances(guiltyAddress);
        let [beforeInnocentTokens, beforeInnocentBalances] = await renExBalances.getBalances(innocentAddress);
        let beforeGuiltyBalance = beforeGuiltyBalances[beforeGuiltyTokens.indexOf(eth_address)];
        let beforeInnocentBalance = beforeInnocentBalances[beforeInnocentTokens.indexOf(eth_address)];

        // Slash the fees
        await renExSettlement.slash(guiltyOrderID, { from: slasher });

        // Check the new balances
        let afterBurntBalance = await darknodeRewardVault.darknodeBalances(0x0, eth_address);
        let [afterGuiltyTokens, afterGuiltyBalances] = await renExBalances.getBalances(guiltyAddress);
        let [afterInnocentTokens, afterInnocentBalances] = await renExBalances.getBalances(innocentAddress);
        let afterGuiltyBalance = afterGuiltyBalances[afterGuiltyTokens.indexOf(eth_address)];
        let afterInnocentBalance = afterInnocentBalances[afterInnocentTokens.indexOf(eth_address)];

        // Make sure fees were reallocated correctly
        let burntBalanceDiff = afterBurntBalance - beforeBurntBalance;
        let innocentBalanceDiff = afterInnocentBalance - beforeInnocentBalance;
        let guiltyBalanceDiff = afterGuiltyBalance - beforeGuiltyBalance;
        // We expect the slasher to have gained fees
        burntBalanceDiff.should.eql(fees);
        // We expect the innocent trader to have gained fees
        innocentBalanceDiff.should.eql(fees);
        // We expect the guilty trader to have lost fees twice
        guiltyBalanceDiff.should.eql(-fees * 2);
    });

    it("should not slash bonds more than once", async () => {
        const tokens = market(BTC, ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* ETH */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ETH */ };

        let [, , buyOrderID, sellOrderID] = await submitMatch(
            buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, false, true
        );

        // Slash the fees
        await renExSettlement.slash(sellOrderID, { from: slasher });

        await renExSettlement.slash(sellOrderID, { from: slasher })
            .should.be.rejectedWith(null, /invalid order status/); // already slashed

        await renExSettlement.slash(buyOrderID, { from: slasher })
            .should.be.rejectedWith(null, /invalid order status/); // already slashed
    });

    it("should handle orders if ETH is the low token", async () => {
        const tokens = market(ETH, LTC);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* ETH */, minimumVolume: 1 /* LTC */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* LTC */ };

        let [, , buyOrderID, _] = await submitMatch(
            buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, false, true
        );

        // Slash the fees
        await renExSettlement.slash(buyOrderID, { from: slasher })
            .should.not.be.rejected;
    });

    it("should not slash non-ETH atomic swaps", async () => {
        const tokens = market(BTC, LTC);
        const buy = { settlement: 2, tokens, price: 1, volume: 1 /* BTC */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* LTC */ };

        let [, , buyOrderID, _] = await submitMatch(
            buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, false, true
        );

        // Slash the fees
        await renExSettlement.slash(buyOrderID, { from: slasher })
            .should.be.rejectedWith(null, /non-eth tokens/);
    });

    it("should not slash non-atomic swap orders", async () => {
        const tokens = market(ETH, REN);
        // Highest possible price, lowest possible volume
        const buy = { tokens, price: 1, volume: 2 /* DGX */ };
        const sell = { tokens, price: 0.95, volume: 1 /* REN */ };

        let [, , guiltyOrderID, _] = await submitMatch(
            buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, true, true
        );

        await renExSettlement.slash(guiltyOrderID, { from: slasher })
            .should.be.rejectedWith(null, /slashing non-atomic trade/);
    });

    it("should not slash if unauthorised to do so", async () => {
        const tokens = market(BTC, ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* ETH */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ETH */ };

        let [, , buyOrderID, sellOrderID] = await submitMatch(
            buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, false, true
        );
        let guiltyTrader = buyer;
        let innocentTrader = seller;

        // The guilty trader might try to dog the innocent trader
        await renExSettlement.slash(sellOrderID, { from: guiltyTrader })
            .should.be.rejectedWith(null, /unauthorised/);

        // The innocent trader might try to dog the guilty trader
        await renExSettlement.slash(buyOrderID, { from: innocentTrader })
            .should.be.rejectedWith(null, /unauthorised/);
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
 */

const BTC = 0x0;
const ETH = 0x1;
const LTC = 0x2;
const DGX = 0x100;
const REN = 0x10000;

const market = (low, high) => {
    return new BN(low).mul(new BN(2).pow(new BN(32))).add(new BN(high));
};
