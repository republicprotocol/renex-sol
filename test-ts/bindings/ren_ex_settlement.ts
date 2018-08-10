import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface RenExSettlementContract {
    orderStatus(index_0: string, options?: Tx): Promise<number | string | BN>;
    renExTokensContract(options?: Tx): Promise<string>;
    submissionGasPriceLimit(options?: Tx): Promise<number | string | BN>;
    DARKNODE_FEES_DENOMINATOR(options?: Tx): Promise<number | string | BN>;
    renounceOwnership(options?: Tx): Promise<Transaction>;
    orderSubmitter(index_0: string, options?: Tx): Promise<string>;
    owner(options?: Tx): Promise<string>;
    RENEX_ATOMIC_SETTLEMENT_ID(options?: Tx): Promise<number | string | BN>;
    orderDetails(index_0: string, options?: Tx): Promise<[number | string | BN, number | string | BN, number | string | BN, number | string | BN, number | string | BN]>;
    matchTimestamp(index_0: string, index_1: string, options?: Tx): Promise<number | string | BN>;
    DARKNODE_FEES_NUMERATOR(options?: Tx): Promise<number | string | BN>;
    orderbookContract(options?: Tx): Promise<string>;
    RENEX_SETTLEMENT_ID(options?: Tx): Promise<number | string | BN>;
    slasherAddress(options?: Tx): Promise<string>;
    renExBalancesContract(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): Promise<Transaction>;
    updateOrderbook(_newOrderbookContract: string, options?: Tx): Promise<Transaction>;
    updateRenExTokens(_newRenExTokensContract: string, options?: Tx): Promise<Transaction>;
    updateRenExBalances(_newRenExBalancesContract: string, options?: Tx): Promise<Transaction>;
    updateSubmissionGasPriceLimit(_newSubmissionGasPriceLimit: number | string | BN, options?: Tx): Promise<Transaction>;
    updateSlasher(_newSlasherAddress: string, options?: Tx): Promise<Transaction>;
    submitOrder(_prefix: string, _settlementID: number | string | BN, _tokens: number | string | BN, _price: number | string | BN, _volume: number | string | BN, _minimumVolume: number | string | BN, options?: Tx): Promise<Transaction>;
    settle(_buyID: string, _sellID: string, options?: Tx): Promise<Transaction>;
    slash(_guiltyOrderID: string, options?: Tx): Promise<Transaction>;
    hashOrder(_prefix: string, _settlementID: number | string | BN, _tokens: number | string | BN, _price: number | string | BN, _volume: number | string | BN, _minimumVolume: number | string | BN, options?: Tx): Promise<string>;
    getMatchDetails(_orderID: string, options?: Tx): Promise<[boolean, number | string | BN, number | string | BN, number | string | BN, number | string | BN, string, string]>;
    address: string;
}
// tslint:enable:max-line-length
