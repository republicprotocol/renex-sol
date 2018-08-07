import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface LinkedListTestContract {
    isInList(node: string, options?: Tx): Promise<boolean>;
    next(node: string, options?: Tx): Promise<string>;
    previous(node: string, options?: Tx): Promise<string>;
    begin(options?: Tx): Promise<string>;
    end(options?: Tx): Promise<string>;
    insertBefore(target: string, newNode: string, options?: Tx): TransactionObject<void>;
    insertAfter(target: string, newNode: string, options?: Tx): TransactionObject<void>;
    remove(node: string, options?: Tx): TransactionObject<void>;
    prepend(newNode: string, options?: Tx): TransactionObject<void>;
    append(newNode: string, options?: Tx): TransactionObject<void>;
    swap(node1: string, node2: string, options?: Tx): TransactionObject<void>;
    address: string;
}
// tslint:enable:max-line-length
