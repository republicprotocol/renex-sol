import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface ABCTokenContract {
    name(options?: Tx): Promise<string>;
    approve(_spender: string, _value: number|string|BN, options?: Tx): Promise<Transaction>;
    totalSupply(options?: Tx): Promise<number|string|BN>;
    transferFrom(_from: string, _to: string, _value: number|string|BN, options?: Tx): Promise<Transaction>;
    INITIAL_SUPPLY(options?: Tx): Promise<number|string|BN>;
    decimals(options?: Tx): Promise<number|string|BN>;
    decreaseApproval(_spender: string, _subtractedValue: number|string|BN, options?: Tx): Promise<Transaction>;
    balanceOf(_owner: string, options?: Tx): Promise<number|string|BN>;
    symbol(options?: Tx): Promise<string>;
    transfer(_to: string, _value: number|string|BN, options?: Tx): Promise<Transaction>;
    increaseApproval(_spender: string, _addedValue: number|string|BN, options?: Tx): Promise<Transaction>;
    allowance(_owner: string, _spender: string, options?: Tx): Promise<number|string|BN>;
    address: string;
}
// tslint:enable:max-line-length
