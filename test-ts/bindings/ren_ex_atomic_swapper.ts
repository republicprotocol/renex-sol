import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface RenExAtomicSwapperContract {
    redeemedAt(index_0: string, options?: Tx): Promise<number|string|BN>;
    initiate(_swapID: string, _withdrawTrader: string, _secretLock: string, _timelock: number|string|BN, options?: Tx): TransactionObject<void>;
    redeem(_swapID: string, _secretKey: string, options?: Tx): TransactionObject<void>;
    refund(_swapID: string, options?: Tx): TransactionObject<void>;
    audit(_swapID: string, options?: Tx): Promise<[number|string|BN, number|string|BN, string, string, string]>;
    auditSecret(_swapID: string, options?: Tx): Promise<string>;
    refundable(_swapID: string, options?: Tx): Promise<boolean>;
    initiatable(_swapID: string, options?: Tx): Promise<boolean>;
    redeemable(_swapID: string, options?: Tx): Promise<boolean>;
    address: string;
}
// tslint:enable:max-line-length
