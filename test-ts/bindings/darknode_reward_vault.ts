import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface DarknodeRewardVaultContract {
    darknodeBalances(index_0: string, index_1: string, options?: Tx): Promise<number|string|BN>;
    renounceOwnership(options?: Tx): Promise<Transaction>;
    owner(options?: Tx): Promise<string>;
    darknodeRegistry(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): Promise<Transaction>;
    ETHEREUM(options?: Tx): Promise<string>;
    updateDarknodeRegistry(_newDarknodeRegistry: string, options?: Tx): Promise<Transaction>;
    deposit(_darknode: string, _token: string, _value: number|string|BN, options?: Tx): Promise<Transaction>;
    withdraw(_darknode: string, _token: string, options?: Tx): Promise<Transaction>;
    address: string;
}
// tslint:enable:max-line-length
