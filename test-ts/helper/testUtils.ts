
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as chaiBigNumber from "chai-bignumber";

import BigNumber from "bignumber.js";
import { TransactionReceipt, Log, Tx } from "web3/types";
import { BN } from "bn.js";
import { OrderbookContract } from "../bindings/orderbook";

chai.use(chaiAsPromised);
chai.use(chaiBigNumber(BigNumber));
chai.should();

const config = require("../../migrations/config.js");
export const { MINIMUM_BOND, MINIMUM_POD_SIZE, MINIMUM_EPOCH_INTERVAL } = config;

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

interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

export interface BasicERC20 {
    address: string;
    decimals(): Promise<BN | number | string>;
    approve(_spender: string, _value: number | string | BN, options?: Tx): Promise<Transaction>;
    transfer(_to: string, _value: number | string | BN, options?: Tx): Promise<Transaction>;
}

export const MockBTC: BasicERC20 = {
    address: Ox0,
    decimals: async () => new BN(8),
    approve: async () => null,
    transfer: async () => null,
};

export const MockETH: BasicERC20 = {
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    decimals: async () => new BN(18),
    approve: async () => null,
    transfer: async () => null,
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

export const increaseTime = async (seconds: number) => {
    await new Promise((resolve, reject) => {
        web3.currentProvider.send(
            { jsonrpc: "2.0", method: "evm_increaseTime", params: [seconds], id: 0 },
            (err, value) => {
                if (err) {
                    reject(err);
                }
                resolve(value);
            }
        );
    });
};

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

export const market = (low: TokenCodes | string, high: TokenCodes | string) => {
    return new BN(low).mul(new BN(2).pow(new BN(32))).add(new BN(high));
};
export const buyMarket = market;
export const sellMarket = (high: TokenCodes | string, low: TokenCodes | string) => {
    return new BN(low).mul(new BN(2).pow(new BN(32))).add(new BN(high));
};

export const randomID = () => {
    return web3.utils.sha3(random().toString());
};

var seed = 1;
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

export const openPrefix = web3.utils.toHex("Republic Protocol: open: ");
export const closePrefix = web3.utils.toHex("Republic Protocol: cancel: ");
export const withdrawPrefix = web3.utils.toHex("Republic Protocol: withdraw: ");

export const openOrder = async (
    orderbook: OrderbookContract,
    settlementID: number,
    broker: string,
    trader: string,
    orderID?: string
) => {
    if (!orderID) {
        orderID = randomID();
    }

    let bytes = openPrefix + trader.slice(2) + orderID.slice(2);
    let signature = await web3.eth.sign(bytes, broker);
    await orderbook.openOrder(settlementID, signature, orderID, { from: trader });

    return orderID;
};

export const cancelOrder = async (orderbook: OrderbookContract, account: string, orderID: string) => {
    await orderbook.cancelOrder(orderID, { from: account });
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
        nonce = new BN(Math.floor(random() * 10000000));
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