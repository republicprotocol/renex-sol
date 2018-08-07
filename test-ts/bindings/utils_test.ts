import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface UtilsTestContract {
    uintToBytes(_v: number|string|BN, options?: Tx): Promise<string>;
    addr(data: string, sig: string, options?: Tx): Promise<string>;
    address: string;
}
// tslint:enable:max-line-length
