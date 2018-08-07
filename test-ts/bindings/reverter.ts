import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface ReverterContract {
    register(dnr: string, ren: string, _darknodeID: string, _publicKey: string, _bond: number|string|BN, options?: Tx): Promise<Transaction>;
    address: string;
}
// tslint:enable:max-line-length
