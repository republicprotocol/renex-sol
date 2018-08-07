import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface DarknodeSlasherContract {
    trustedOrderbook(options?: Tx): Promise<string>;
    orderSubmitted(index_0: string, options?: Tx): Promise<boolean>;
    renounceOwnership(options?: Tx): Promise<Transaction>;
    challengeSubmitted(index_0: string, index_1: string, options?: Tx): Promise<boolean>;
    owner(options?: Tx): Promise<string>;
    orderDetails(index_0: string, options?: Tx): Promise<[string, number|string|BN, number|string|BN, number|string|BN, number|string|BN, number|string|BN]>;
    transferOwnership(_newOwner: string, options?: Tx): Promise<Transaction>;
    challengers(index_0: string, options?: Tx): Promise<string>;
    trustedDarknodeRegistry(options?: Tx): Promise<string>;
    submitChallengeOrder(details: string, settlementID: number|string|BN, tokens: number|string|BN, price: number|string|BN, volume: number|string|BN, minimumVolume: number|string|BN, options?: Tx): Promise<Transaction>;
    submitChallenge(_buyID: string, _sellID: string, options?: Tx): Promise<Transaction>;
    address: string;
}
// tslint:enable:max-line-length
