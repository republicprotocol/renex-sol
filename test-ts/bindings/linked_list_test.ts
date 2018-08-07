import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface LinkedListTestContract {
    isInList(node: string, options?: Tx): Promise<boolean>;
    next(node: string, options?: Tx): Promise<string>;
    previous(node: string, options?: Tx): Promise<string>;
    begin(options?: Tx): Promise<string>;
    end(options?: Tx): Promise<string>;
    insertBefore(target: string, newNode: string, options?: Tx): Promise<Transaction>;
    insertAfter(target: string, newNode: string, options?: Tx): Promise<Transaction>;
    remove(node: string, options?: Tx): Promise<Transaction>;
    prepend(newNode: string, options?: Tx): Promise<Transaction>;
    append(newNode: string, options?: Tx): Promise<Transaction>;
    swap(node1: string, node2: string, options?: Tx): Promise<Transaction>;
    address: string;
}
// tslint:enable:max-line-length
