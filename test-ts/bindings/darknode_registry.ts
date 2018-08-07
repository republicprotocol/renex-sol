import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface DarknodeRegistryContract {
    numDarknodesNextEpoch(options?: Tx): Promise<number|string|BN>;
    numDarknodes(options?: Tx): Promise<number|string|BN>;
    nextSlasher(options?: Tx): Promise<string>;
    nextMinimumEpochInterval(options?: Tx): Promise<number|string|BN>;
    minimumEpochInterval(options?: Tx): Promise<number|string|BN>;
    previousEpoch(options?: Tx): Promise<[number|string|BN, number|string|BN]>;
    nextMinimumBond(options?: Tx): Promise<number|string|BN>;
    nextMinimumPodSize(options?: Tx): Promise<number|string|BN>;
    renounceOwnership(options?: Tx): TransactionObject<void>;
    numDarknodesPreviousEpoch(options?: Tx): Promise<number|string|BN>;
    currentEpoch(options?: Tx): Promise<[number|string|BN, number|string|BN]>;
    ren(options?: Tx): Promise<string>;
    owner(options?: Tx): Promise<string>;
    store(options?: Tx): Promise<string>;
    minimumBond(options?: Tx): Promise<number|string|BN>;
    slasher(options?: Tx): Promise<string>;
    minimumPodSize(options?: Tx): Promise<number|string|BN>;
    transferOwnership(_newOwner: string, options?: Tx): TransactionObject<void>;
    register(_darknodeID: string, _publicKey: string, _bond: number|string|BN, options?: Tx): TransactionObject<void>;
    deregister(_darknodeID: string, options?: Tx): TransactionObject<void>;
    epoch(options?: Tx): TransactionObject<void>;
    transferStoreOwnership(_newOwner: string, options?: Tx): TransactionObject<void>;
    updateMinimumBond(_nextMinimumBond: number|string|BN, options?: Tx): TransactionObject<void>;
    updateMinimumPodSize(_nextMinimumPodSize: number|string|BN, options?: Tx): TransactionObject<void>;
    updateMinimumEpochInterval(_nextMinimumEpochInterval: number|string|BN, options?: Tx): TransactionObject<void>;
    updateSlasher(_slasher: string, options?: Tx): TransactionObject<void>;
    slash(_prover: string, _challenger1: string, _challenger2: string, options?: Tx): TransactionObject<void>;
    refund(_darknodeID: string, options?: Tx): TransactionObject<void>;
    getDarknodeOwner(_darknodeID: string, options?: Tx): Promise<string>;
    getDarknodeBond(_darknodeID: string, options?: Tx): Promise<number|string|BN>;
    getDarknodePublicKey(_darknodeID: string, options?: Tx): Promise<string>;
    getDarknodes(_start: string, _count: number|string|BN, options?: Tx): Promise<string[]>;
    getPreviousDarknodes(_start: string, _count: number|string|BN, options?: Tx): Promise<string[]>;
    isPendingRegistration(_darknodeID: string, options?: Tx): Promise<boolean>;
    isPendingDeregistration(_darknodeID: string, options?: Tx): Promise<boolean>;
    isDeregistered(_darknodeID: string, options?: Tx): Promise<boolean>;
    isDeregisterable(_darknodeID: string, options?: Tx): Promise<boolean>;
    isRefunded(_darknodeID: string, options?: Tx): Promise<boolean>;
    isRefundable(_darknodeID: string, options?: Tx): Promise<boolean>;
    isRegistered(_darknodeID: string, options?: Tx): Promise<boolean>;
    isRegisteredInPreviousEpoch(_darknodeID: string, options?: Tx): Promise<boolean>;
    address: string;
}
// tslint:enable:max-line-length
