import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface RenExBrokerVerifierContract {
    traderNonces(index_0: string, options?: Tx): Promise<number|string|BN>;
    brokers(index_0: string, options?: Tx): Promise<boolean>;
    renounceOwnership(options?: Tx): TransactionObject<void>;
    owner(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): TransactionObject<void>;
    registerBroker(_broker: string, options?: Tx): TransactionObject<void>;
    deregisterBroker(_broker: string, options?: Tx): TransactionObject<void>;
    verifyWithdrawSignature(_trader: string, _signature: string, options?: Tx): TransactionObject<void>;
    address: string;
}
// tslint:enable:max-line-length
