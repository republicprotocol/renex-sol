import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface ABCTokenContract {
    name(options?: Tx): Promise<string>;
    approve(_spender: string, _value: number|string|BN, options?: Tx): TransactionObject<void>;
    totalSupply(options?: Tx): Promise<number|string|BN>;
    transferFrom(_from: string, _to: string, _value: number|string|BN, options?: Tx): TransactionObject<void>;
    INITIAL_SUPPLY(options?: Tx): Promise<number|string|BN>;
    decimals(options?: Tx): Promise<number|string|BN>;
    decreaseApproval(_spender: string, _subtractedValue: number|string|BN, options?: Tx): TransactionObject<void>;
    balanceOf(_owner: string, options?: Tx): Promise<number|string|BN>;
    symbol(options?: Tx): Promise<string>;
    transfer(_to: string, _value: number|string|BN, options?: Tx): TransactionObject<void>;
    increaseApproval(_spender: string, _addedValue: number|string|BN, options?: Tx): TransactionObject<void>;
    allowance(_owner: string, _spender: string, options?: Tx): Promise<number|string|BN>;
    address: string;
}
// tslint:enable:max-line-length
