import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface UtilsTestContract {
    uintToBytes(_v: number|string|BN, options?: Tx): Promise<string>;
    addr(data: string, sig: string, options?: Tx): Promise<string>;
    address: string;
}
// tslint:enable:max-line-length
