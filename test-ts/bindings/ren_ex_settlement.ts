import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface RenExSettlementContract {
    matchDetails(index_0: string, index_1: string, options?: Tx): Promise<[number|string|BN, number|string|BN, number|string|BN, number|string|BN, string, string, number|string|BN]>;
    orderStatus(index_0: string, options?: Tx): Promise<number|string|BN>;
    renExTokensContract(options?: Tx): Promise<string>;
    submissionGasPriceLimit(options?: Tx): Promise<number|string|BN>;
    DARKNODE_FEES_DENOMINATOR(options?: Tx): Promise<number|string|BN>;
    renounceOwnership(options?: Tx): TransactionObject<void>;
    orderSubmitter(index_0: string, options?: Tx): Promise<string>;
    owner(options?: Tx): Promise<string>;
    RENEX_ATOMIC_SETTLEMENT_ID(options?: Tx): Promise<number|string|BN>;
    orderDetails(index_0: string, options?: Tx): Promise<[string, number|string|BN, number|string|BN, number|string|BN, number|string|BN, number|string|BN]>;
    DARKNODE_FEES_NUMERATOR(options?: Tx): Promise<number|string|BN>;
    orderTrader(index_0: string, options?: Tx): Promise<string>;
    orderbookContract(options?: Tx): Promise<string>;
    RENEX_SETTLEMENT_ID(options?: Tx): Promise<number|string|BN>;
    slasherAddress(options?: Tx): Promise<string>;
    renExBalancesContract(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): TransactionObject<void>;
    updateOrderbook(_newOrderbookContract: string, options?: Tx): TransactionObject<void>;
    updateRenExTokens(_newRenExTokensContract: string, options?: Tx): TransactionObject<void>;
    updateRenExBalances(_newRenExBalancesContract: string, options?: Tx): TransactionObject<void>;
    updateSubmissionGasPriceLimit(_newSubmissionGasPriceLimit: number|string|BN, options?: Tx): TransactionObject<void>;
    updateSlasher(_newSlasherAddress: string, options?: Tx): TransactionObject<void>;
    submitOrder(_prefix: string, _settlementID: number|string|BN, _tokens: number|string|BN, _price: number|string|BN, _volume: number|string|BN, _minimumVolume: number|string|BN, options?: Tx): TransactionObject<void>;
    submitMatch(_buyID: string, _sellID: string, options?: Tx): TransactionObject<void>;
    slash(_guiltyOrderID: string, options?: Tx): TransactionObject<void>;
    hashOrder(_prefix: string, _settlementID: number|string|BN, _tokens: number|string|BN, _price: number|string|BN, _volume: number|string|BN, _minimumVolume: number|string|BN, options?: Tx): Promise<string>;
    address: string;
}
// tslint:enable:max-line-length
