
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as chaiBigNumber from "chai-bignumber";

import BigNumber from "bignumber.js";
import { TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

chai.use(chaiAsPromised);
chai.use(chaiBigNumber(BigNumber));
chai.should();

const config = require("../../migrations/config.js");
export const { MINIMUM_BOND, INGRESS_FEE, MINIMUM_POD_SIZE, MINIMUM_EPOCH_INTERVAL } = config;

export const NULL = "0x0000000000000000000000000000000000000000";
export const Ox0 = NULL;

export const GWEI = 1000000000;

export enum Settlements {
    RenEx = 1,
    RenExAtomic = 2,
}

// Tokens used for testing only. These tokens do not represent the tokens that
// will be supported by RenEx.
export enum TokenCodes {
    BTC = 0x0,
    ETH = 0x1,
    LTC = 0x2,
    DGX = 0x100,
    REN = 0x10000,
}

export const MockBTC = {
    address: Ox0,
    decimals: () => new BN(8),
    approve: () => null
};

export const MockETH = {
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    decimals: () => new BN(18),
    approve: () => null
};

// Makes a public key for a darknode
export function PUBK(i: string) {
    return web3.utils.sha3(i);
}

export const secondsFromNow = (seconds: number) => {
    return Math.round((new Date()).getTime() / 1000) + seconds;
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export const second = 1000;

export async function waitForEpoch(dnr: any) {
    const timeout = MINIMUM_EPOCH_INTERVAL * 0.1;
    while (true) {
        // Must be an on-chain call, or the time won't be updated
        try {
            const tx = await dnr.epoch();
            return;
        } catch (err) {
            // epoch reverted, epoch interval hasn't passed
        }
        // Sleep for `timeout` seconds
        await new Promise(resolve => setTimeout(resolve, timeout * 1000));
    }
}

export const market = (low, high) => {
    return new BN(low).mul(new BN(2).pow(new BN(32))).add(new BN(high));
};
export const buyMarket = market;
export const sellMarket = (high, low) => {
    return new BN(low).mul(new BN(2).pow(new BN(32))).add(new BN(high));
};

export const randomID = () => {
    return web3.utils.sha3(Math.random().toString());
};

export const openPrefix = web3.utils.toHex("Republic Protocol: open: ");
export const closePrefix = web3.utils.toHex("Republic Protocol: cancel: ");
export const withdrawPrefix = web3.utils.toHex("Republic Protocol: withdraw: ");

export const openBuyOrder = async (orderbook, broker, account, orderID?) => {
    if (!orderID) {
        orderID = randomID();
    }

    let bytes = openPrefix + orderID.slice(2);
    let signature = await web3.eth.sign(bytes, account);
    await orderbook.openBuyOrder(signature, orderID, { from: broker });

    return orderID;
};

export const openSellOrder = async (orderbook, broker, account, orderID?) => {
    if (!orderID) {
        orderID = randomID();
    }

    let bytes = openPrefix + orderID.slice(2);
    let signature = await web3.eth.sign(bytes, account);
    await orderbook.openSellOrder(signature, orderID, { from: broker });

    return orderID;
};

export const cancelOrder = async (orderbook, broker, account, orderID) => {
    // Cancel canceled order
    const bytes = closePrefix + orderID.slice(2);
    const signature = await web3.eth.sign(bytes, account);
    await orderbook.cancelOrder(signature, orderID, { from: broker });
};

export async function getFee(txP: Promise<{ receipt: TransactionReceipt, tx: string; logs: Log[] }>) {
    const tx = await txP;
    const gasAmount = new BN(tx.receipt.gasUsed);
    const gasPrice = new BN((await web3.eth.getTransaction(tx.tx)).gasPrice);
    return gasPrice.mul(gasAmount);
}

const PRIME = new BN("17012364981921935471");
export function randomNonce() {
    let nonce = PRIME;
    while (nonce.gte(PRIME)) {
        nonce = new BN(Math.floor(Math.random() * 10000000));
    }
    return nonce.toString("hex");
}

export async function signWithdrawal(brokerVerifier: any, broker: string, trader: string): Promise<string> {
    // Get nonce and format as 256bit hex string
    const nonce = new BN(await brokerVerifier.traderNonces(trader)).toArrayLike(Buffer, "be", 32).toString("hex");
    let bytes = withdrawPrefix + trader.slice(2) + nonce;
    let signature = await web3.eth.sign(bytes, broker);
    return signature;
}