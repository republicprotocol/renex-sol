import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface SettlementUtilsTestContract {
    orderDetails(index_0: string, options?: Tx): Promise<[string, number|string|BN, number|string|BN, number|string|BN, number|string|BN, number|string|BN]>;
    submitOrder(details: string, settlementID: number|string|BN, tokens: number|string|BN, price: number|string|BN, volume: number|string|BN, minimumVolume: number|string|BN, options?: Tx): TransactionObject<void>;
    hashOrder(details: string, settlementID: number|string|BN, tokens: number|string|BN, price: number|string|BN, volume: number|string|BN, minimumVolume: number|string|BN, options?: Tx): Promise<string>;
    verifyMatchDetails(_buyID: string, _sellID: string, options?: Tx): Promise<boolean>;
    address: string;
}
// tslint:enable:max-line-length
