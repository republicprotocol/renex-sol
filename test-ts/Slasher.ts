// tslint:disable:max-line-length

// Two big number libraries are used - BigNumber decimal support
// while BN has better bitwise operations
import BigNumber from "bignumber.js";
import { BN } from "bn.js";

import "./helper/testUtils";

import { submitMatch } from "./RenEx";

contract.skip("Slasher", function (accounts: string[]) {

    const slasher = accounts[0];
    const buyer = accounts[1];
    const seller = accounts[2];
    const darknode = accounts[3];
    const broker = accounts[4];

    let tokenAddresses, orderbook, renExSettlement, renExBalances, darknodeRewardVault;
    let eth_address, eth_decimals;

    before(async function () {
        // ({
        //     tokenAddresses, orderbook, renExSettlement, renExBalances, darknodeRewardVault
        // } = await setupContracts(darknode, slasher, 0x0));
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
        (await orderbook.orderMatch(guiltyOrderID))[0].should.eql(innocentOrderID);
        (await orderbook.orderMatch(innocentOrderID))[0].should.eql(guiltyOrderID);

        let feeNum = await renExSettlement.DARKNODE_FEES_NUMERATOR();
        let feeDen = await renExSettlement.DARKNODE_FEES_DENOMINATOR();
        let weiAmount = eth_decimals.times(ethAmount);
        let fees = weiAmount / feeDen * feeNum;

        // Store the original balances
        let beforeSlasherBalance = await darknodeRewardVault.darknodeBalances(slasher, eth_address);
        let [beforeGuiltyTokens, beforeGuiltyBalances] = await renExBalances.getBalances(guiltyAddress);
        let [beforeInnocentTokens, beforeInnocentBalances] = await renExBalances.getBalances(innocentAddress);
        let beforeGuiltyBalance = beforeGuiltyBalances[beforeGuiltyTokens.indexOf(eth_address)];
        let beforeInnocentBalance = beforeInnocentBalances[beforeInnocentTokens.indexOf(eth_address)];

        // Slash the fees
        await renExSettlement.slash(guiltyOrderID, { from: slasher });

        // Check the new balances
        let afterSlasherBalance = await darknodeRewardVault.darknodeBalances(slasher, eth_address);
        let [afterGuiltyTokens, afterGuiltyBalances] = await renExBalances.getBalances(guiltyAddress);
        let [afterInnocentTokens, afterInnocentBalances] = await renExBalances.getBalances(innocentAddress);
        let afterGuiltyBalance = afterGuiltyBalances[afterGuiltyTokens.indexOf(eth_address)];
        let afterInnocentBalance = afterInnocentBalances[afterInnocentTokens.indexOf(eth_address)];

        // Make sure fees were reallocated correctly
        let slasherBalanceDiff = afterSlasherBalance - beforeSlasherBalance;
        let innocentBalanceDiff = afterInnocentBalance - beforeInnocentBalance;
        let guiltyBalanceDiff = afterGuiltyBalance - beforeGuiltyBalance;
        // We expect the slasher to have gained fees
        slasherBalanceDiff.should.eql(fees);
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

        let [, , buyOrderID, _] = await submitMatch(
            buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, false, true
        );
        let guiltyOrderID = buyOrderID;

        // Slash the fees
        await renExSettlement.slash(guiltyOrderID, { from: slasher })
            .should.not.be.rejected;
    });

    it("should not slash non-ETH atomic swaps", async () => {
        const tokens = market(BTC, BTC);
        const buy = { settlement: 2, tokens, price: 1, volume: 1 /* BTC */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* BTC */ };

        let [, , buyOrderID, _] = await submitMatch(
            buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, false, true
        );
        let guiltyOrderID = buyOrderID;

        // Slash the fees
        await renExSettlement.slash(guiltyOrderID, { from: slasher })
            .should.be.rejectedWith(null, /non-eth tokens/);
    });

    it("should not slash non-atomic swap orders", async () => {
        const tokens = market(ETH, REN);
        // Highest possible price, lowest possible volume
        const buy = { tokens, price: 1, volume: 2 /* DGX */ };
        const sell = { tokens, price: 0.95, volume: 1 /* REN */ };

        let [ethAmount, renAmount, guiltyOrderID, _] = await submitMatch(
            buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, true, true
        );

        await renExSettlement.slash(guiltyOrderID, { from: slasher })
            .should.be.rejectedWith(null, /slashing non-atomic trade/);
    });

    it("should not slash if unauthorised to do so", async () => {
        const tokens = market(ETH, BTC);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* ETH */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ETH */ };

        let [, , buyOrderID, sellerOrderID] = await submitMatch(
            buy, sell, buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook, false, true
        );
        let guiltyTrader = buyer;
        let guiltyOrderID = buyOrderID;
        let innocentTrader = seller;
        let innocentOrderID = sellerOrderID;

        // The guilty trader might try to dog the innocent trader
        await renExSettlement.slash(innocentOrderID, { from: guiltyTrader })
            .should.be.rejectedWith(null, /unauthorised/);

        // The innocent trader might try to dog the guilty trader
        await renExSettlement.slash(guiltyOrderID, { from: innocentTrader })
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
