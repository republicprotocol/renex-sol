import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface RepublicTokenContract {
    name(options?: Tx): Promise<string>;
    approve(_spender: string, _value: number|string|BN, options?: Tx): TransactionObject<void>;
    totalSupply(options?: Tx): Promise<number|string|BN>;
    INITIAL_SUPPLY(options?: Tx): Promise<number|string|BN>;
    decimals(options?: Tx): Promise<number|string|BN>;
    unpause(options?: Tx): TransactionObject<void>;
    burn(_value: number|string|BN, options?: Tx): TransactionObject<void>;
    paused(options?: Tx): Promise<boolean>;
    decreaseApproval(_spender: string, _subtractedValue: number|string|BN, options?: Tx): TransactionObject<void>;
    balanceOf(_owner: string, options?: Tx): Promise<number|string|BN>;
    renounceOwnership(options?: Tx): TransactionObject<void>;
    pause(options?: Tx): TransactionObject<void>;
    owner(options?: Tx): Promise<string>;
    symbol(options?: Tx): Promise<string>;
    increaseApproval(_spender: string, _addedValue: number|string|BN, options?: Tx): TransactionObject<void>;
    allowance(_owner: string, _spender: string, options?: Tx): Promise<number|string|BN>;
    transferOwnership(_newOwner: string, options?: Tx): TransactionObject<void>;
    transferTokens(beneficiary: string, amount: number|string|BN, options?: Tx): TransactionObject<void>;
    transfer(_to: string, _value: number|string|BN, options?: Tx): TransactionObject<void>;
    transferFrom(_from: string, _to: string, _value: number|string|BN, options?: Tx): TransactionObject<void>;
    address: string;
}
// tslint:enable:max-line-length
