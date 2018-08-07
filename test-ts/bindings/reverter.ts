import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface ReverterContract {
    register(dnr: string, ren: string, _darknodeID: string, _publicKey: string, _bond: number|string|BN, options?: Tx): TransactionObject<void>;
    address: string;
}
// tslint:enable:max-line-length
