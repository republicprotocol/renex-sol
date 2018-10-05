// Two big number libraries are used - BigNumber has decimal support
// while BN has better bitwise operations and is used by web3 1.0
import BigNumber from "bignumber.js";
import { BN } from "bn.js";

import * as testUtils from "./testUtils";
import { market, TOKEN_CODES } from "./testUtils";

import { OrderbookContract } from "../bindings/orderbook";
import { RenExBalancesContract } from "../bindings/ren_ex_balances";
import { RenExBrokerVerifierContract } from "../bindings/ren_ex_broker_verifier";
import { RenExSettlementContract } from "../bindings/ren_ex_settlement";

/// Submits and matches two orders, going through all the necessary steps first,
/// and verifying the funds have been transferred.
export async function settleOrders(
    buy: any, sell: any, buyer: string, seller: string,
    darknode: string, broker: string,
    renExSettlement: RenExSettlementContract,
    renExBalances: RenExBalancesContract,
    tokenInstances: Map<number, testUtils.BasicERC20>,
    orderbook: OrderbookContract,
    renExBrokerVerifier: RenExBrokerVerifierContract,
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
    buy.trader = buy.trader || buyer;
    sell.trader = sell.trader || seller;
    buy.fromToken = lowToken;
    sell.fromToken = highToken;

    const lowTokenInstance = tokenInstances.get(lowToken);
    const highTokenInstance = tokenInstances.get(highToken);

    const highDecimals = new BN(await highTokenInstance.decimals()).toNumber();
    const lowDecimals = new BN(await lowTokenInstance.decimals()).toNumber();

    for (const order of [buy, sell]) {
        order.settlement = order.settlement !== undefined ? order.settlement : testUtils.Settlements.RenEx;

        order.price = new BigNumber(order.price);
        order.volume = new BigNumber(order.volume);
        order.minimumVolume = order.minimumVolume ? new BigNumber(order.minimumVolume) : new BigNumber(0);

        order.nonceHash = order.nonceHash || (order.nonce ?
            (web3.utils.sha3 as any)(order.nonce, { encoding: "hex" }) :
            testUtils.randomNonce());

        order.expiry = 10000000000; // order.expiry || testUtils.secondsFromNow(1000);
        order.tokens = `0x${order.tokens.toString("hex")}`;

        const expectedID = await renExSettlement.hashOrder(
            getPreBytes(order),
            order.settlement,
            order.tokens,
            order.price.multipliedBy(10 ** 12),
            order.volume.multipliedBy(10 ** 12),
            order.minimumVolume.multipliedBy(10 ** 12)
        );
        if (order.orderID !== undefined) {
            order.orderID.should.equal(expectedID);
        } else {
            order.orderID = expectedID;
        }
    }

    // Approve and deposit
    sell.deposit = sell.volume.multipliedBy(10 ** highDecimals);
    buy.deposit = buy.volume.multipliedBy(buy.price).multipliedBy(10 ** lowDecimals).integerValue(BigNumber.ROUND_CEIL);
    sell.opposite = buy.deposit; buy.opposite = sell.deposit;

    for (const order of [buy, sell]) {
        if (order.fromToken !== TOKEN_CODES.ETH &&
            order.fromToken !== TOKEN_CODES.BTC &&
            order.fromToken !== TOKEN_CODES.ALTBTC) {
            // TODO: Remove hard-coded value
            const fee = order.fromToken === 0x101 ? new BN(3) : new BN(0);

            const deposit = new BN(order.deposit.multipliedBy(1.01).toFixed());
            await tokenInstances.get(order.fromToken).transfer(order.trader, deposit);
            const newDeposit = deposit.sub(deposit.mul(fee).div(new BN(1000)));
            await tokenInstances.get(order.fromToken).approve(
                renExBalances.address, newDeposit, { from: order.trader }
            );
            await renExBalances.deposit(
                tokenInstances.get(order.fromToken).address, newDeposit, { from: order.trader }
            );
        } else {
            const deposit = order.fromToken === TOKEN_CODES.ETH ? order.deposit : order.opposite;
            await renExBalances.deposit(
                tokenInstances.get(TOKEN_CODES.ETH).address,
                deposit,
                { from: order.trader, value: deposit }
            );
        }
    }

    // Open orders
    await testUtils.openOrder(orderbook, buy.settlement, broker, buy.trader, buy.orderID).should.not.be.rejected;
    await testUtils.openOrder(orderbook, sell.settlement, broker, sell.trader, sell.orderID).should.not.be.rejected;

    // Confirm the order traders are
    for (const order of [buy, sell]) {
        (await orderbook.orderTrader(order.orderID)).should.equal(order.trader);
    }

    // Submit order confirmation
    await orderbook.confirmOrder(buy.orderID, sell.orderID, { from: darknode }).should.not.be.rejected;

    // Submit details for each order, store the current balances
    for (const order of [buy, sell]) {
        await renExSettlement.submitOrder(
            getPreBytes(order),
            order.settlement,
            order.tokens,
            order.price.multipliedBy(10 ** 12),
            order.volume.multipliedBy(10 ** 12),
            order.minimumVolume.multipliedBy(10 ** 12)
        );

        // tslint:disable:max-line-length
        order.lowBefore = new BigNumber(await renExBalances.traderBalances(order.trader, lowTokenInstance.address) as any);
        order.highBefore = new BigNumber(await renExBalances.traderBalances(order.trader, highTokenInstance.address) as any);
    }

    // Submit the match
    await renExSettlement.settle(buy.orderID, sell.orderID)
        .should.not.be.rejected;

    // Verify match details
    const buyMatch = await renExSettlement.getMatchDetails(buy.orderID);
    const settled: boolean = buyMatch.settled;
    const priorityTokenFinal = new BigNumber(buyMatch.priorityVolume as any);
    const secondaryTokenFinal = new BigNumber(buyMatch.secondaryVolume as any);
    const priorityTokenFee = new BigNumber(buyMatch.priorityFee as any);
    const secondaryTokenFee = new BigNumber(buyMatch.secondaryFee as any);
    const priorityTokenAddress = buyMatch.priorityToken;
    const secondaryTokenAddress = buyMatch.secondaryToken;
    const priorityTokenVolume = priorityTokenFinal.plus(priorityTokenFee);
    const secondaryTokenVolume = secondaryTokenFinal.plus(secondaryTokenFee);

    settled.should.be.true;

    // (buyMatch.priorityToken).should.bignumber.equal(lowToken);
    // buyMatch.secondaryToken.should.bignumber.equal(highToken);
    // buyMatch.priorityTokenAddress.should.equal(lowTokenInstance.address);
    // buyMatch.secondaryTokenAddress.should.equal(highTokenInstance.address);

    // Get balances after trade
    const buyerLowAfter = new BigNumber(await renExBalances.traderBalances(buy.trader, lowTokenInstance.address) as any);
    const sellerLowAfter = new BigNumber(await renExBalances.traderBalances(sell.trader, lowTokenInstance.address) as any);
    const buyerHighAfter = new BigNumber(await renExBalances.traderBalances(buy.trader, highTokenInstance.address) as any);
    const sellerHighAfter = new BigNumber(await renExBalances.traderBalances(sell.trader, highTokenInstance.address) as any);

    // Withdraw balances (except for Atomic swaps)
    if (buy.settlement === testUtils.Settlements.RenEx) {
        // TODO: Remove hard-coded checks
        if (buy.fromToken !== 0x101 && sell.fromToken !== 0x101) {
            let sig1 = await testUtils.signWithdrawal(renExBrokerVerifier, broker, buy.trader);
            await renExBalances.withdraw(lowTokenInstance.address, buyerLowAfter.toFixed(), sig1, { from: buy.trader });
            let sig2 = await testUtils.signWithdrawal(renExBrokerVerifier, broker, sell.trader);
            await renExBalances.withdraw(lowTokenInstance.address, sellerLowAfter.toFixed(), sig2, { from: sell.trader });
            let sig3 = await testUtils.signWithdrawal(renExBrokerVerifier, broker, buy.trader);
            await renExBalances.withdraw(highTokenInstance.address, buyerHighAfter.toFixed(), sig3, { from: buy.trader });
            let sig4 = await testUtils.signWithdrawal(renExBrokerVerifier, broker, sell.trader);
            await renExBalances.withdraw(highTokenInstance.address, sellerHighAfter.toFixed(), sig4, { from: sell.trader });
        }
    }

    let feeNum = await renExSettlement.DARKNODE_FEES_NUMERATOR();
    let feeDen = await renExSettlement.DARKNODE_FEES_DENOMINATOR();

    // // Calculate fees (0.2%)
    // const priorityFee = new BigNumber(buyMatch.priorityTokenVolume)
    //     .multipliedBy(feeNum)
    //     .dividedBy(feeDen)
    //     .integerValue(BigNumber.ROUND_CEIL);
    // const secondFee = new BigNumber(buyMatch.secondaryTokenVolume)
    //     .multipliedBy(feeNum)
    //     .dividedBy(feeDen)
    //     .integerValue(BigNumber.ROUND_CEIL);

    // Verify the correct transfer of funds occurred
    if (buy.settlement === testUtils.Settlements.RenEx) {
        // Low token
        buy.lowBefore.minus(priorityTokenVolume).should.bignumber.equal(buyerLowAfter);
        sell.lowBefore.plus(priorityTokenVolume).minus(priorityTokenFee).should.bignumber.equal(sellerLowAfter);
        // High token
        buy.highBefore.plus(secondaryTokenVolume).minus(secondaryTokenFee).should.bignumber.equal(buyerHighAfter);
        sell.highBefore.minus(secondaryTokenVolume).should.bignumber.equal(sellerHighAfter);
    } else {
        if (highTokenInstance.address !== testUtils.NULL) {
            buy.lowBefore.should.bignumber.equal(buyerLowAfter);
            sell.lowBefore.should.bignumber.equal(sellerLowAfter);
            buy.highBefore.minus(secondaryTokenFee).should.bignumber.equal(buyerHighAfter);
            sell.highBefore.minus(secondaryTokenFee).should.bignumber.equal(sellerHighAfter);
        } else if (lowTokenInstance.address !== testUtils.NULL) {
            buy.lowBefore.minus(priorityTokenFee).should.bignumber.equal(buyerLowAfter);
            sell.lowBefore.minus(priorityTokenFee).should.bignumber.equal(sellerLowAfter);
            buy.highBefore.should.bignumber.equal(buyerHighAfter);
            sell.highBefore.should.bignumber.equal(sellerHighAfter);
        }
    }

    const priorityRet = new BigNumber(priorityTokenVolume).dividedBy(10 ** lowDecimals).toNumber();
    const secondRet = new BigNumber(secondaryTokenVolume).dividedBy(10 ** highDecimals).toNumber();

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
    return `0x${bytes.toString("hex")}`;
}
