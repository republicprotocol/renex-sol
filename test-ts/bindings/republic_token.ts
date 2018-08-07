import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface RepublicTokenContract {
    name(options?: Tx): Promise<string>;
    approve(_spender: string, _value: number|string|BN, options?: Tx): Promise<Transaction>;
    totalSupply(options?: Tx): Promise<number|string|BN>;
    INITIAL_SUPPLY(options?: Tx): Promise<number|string|BN>;
    decimals(options?: Tx): Promise<number|string|BN>;
    unpause(options?: Tx): Promise<Transaction>;
    burn(_value: number|string|BN, options?: Tx): Promise<Transaction>;
    paused(options?: Tx): Promise<boolean>;
    decreaseApproval(_spender: string, _subtractedValue: number|string|BN, options?: Tx): Promise<Transaction>;
    balanceOf(_owner: string, options?: Tx): Promise<number|string|BN>;
    renounceOwnership(options?: Tx): Promise<Transaction>;
    pause(options?: Tx): Promise<Transaction>;
    owner(options?: Tx): Promise<string>;
    symbol(options?: Tx): Promise<string>;
    increaseApproval(_spender: string, _addedValue: number|string|BN, options?: Tx): Promise<Transaction>;
    allowance(_owner: string, _spender: string, options?: Tx): Promise<number|string|BN>;
    transferOwnership(_newOwner: string, options?: Tx): Promise<Transaction>;
    transferTokens(beneficiary: string, amount: number|string|BN, options?: Tx): Promise<Transaction>;
    transfer(_to: string, _value: number|string|BN, options?: Tx): Promise<Transaction>;
    transferFrom(_from: string, _to: string, _value: number|string|BN, options?: Tx): Promise<Transaction>;
    address: string;
}
// tslint:enable:max-line-length
