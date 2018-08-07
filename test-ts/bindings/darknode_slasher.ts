import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface DarknodeSlasherContract {
    trustedOrderbook(options?: Tx): Promise<string>;
    orderSubmitted(index_0: string, options?: Tx): Promise<boolean>;
    renounceOwnership(options?: Tx): TransactionObject<void>;
    challengeSubmitted(index_0: string, index_1: string, options?: Tx): Promise<boolean>;
    owner(options?: Tx): Promise<string>;
    orderDetails(index_0: string, options?: Tx): Promise<[string, number|string|BN, number|string|BN, number|string|BN, number|string|BN, number|string|BN]>;
    transferOwnership(_newOwner: string, options?: Tx): TransactionObject<void>;
    challengers(index_0: string, options?: Tx): Promise<string>;
    trustedDarknodeRegistry(options?: Tx): Promise<string>;
    submitChallengeOrder(details: string, settlementID: number|string|BN, tokens: number|string|BN, price: number|string|BN, volume: number|string|BN, minimumVolume: number|string|BN, options?: Tx): TransactionObject<void>;
    submitChallenge(_buyID: string, _sellID: string, options?: Tx): TransactionObject<void>;
    address: string;
}
// tslint:enable:max-line-length
