import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface DarknodeRegistryStoreContract {
    renounceOwnership(options?: Tx): TransactionObject<void>;
    ren(options?: Tx): Promise<string>;
    owner(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): TransactionObject<void>;
    appendDarknode(_darknodeID: string, _darknodeOwner: string, _bond: number|string|BN, _publicKey: string, _registeredAt: number|string|BN, _deregisteredAt: number|string|BN, options?: Tx): TransactionObject<void>;
    begin(options?: Tx): Promise<string>;
    next(darknodeID: string, options?: Tx): Promise<string>;
    removeDarknode(darknodeID: string, options?: Tx): TransactionObject<void>;
    updateDarknodeBond(darknodeID: string, bond: number|string|BN, options?: Tx): TransactionObject<void>;
    updateDarknodeDeregisteredAt(darknodeID: string, deregisteredAt: number|string|BN, options?: Tx): TransactionObject<void>;
    darknodeOwner(darknodeID: string, options?: Tx): Promise<string>;
    darknodeBond(darknodeID: string, options?: Tx): Promise<number|string|BN>;
    darknodeRegisteredAt(darknodeID: string, options?: Tx): Promise<number|string|BN>;
    darknodeDeregisteredAt(darknodeID: string, options?: Tx): Promise<number|string|BN>;
    darknodePublicKey(darknodeID: string, options?: Tx): Promise<string>;
    address: string;
}
// tslint:enable:max-line-length
