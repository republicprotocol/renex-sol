import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface RenExBrokerVerifierContract {
    traderNonces(index_0: string, options?: Tx): Promise<number|string|BN>;
    brokers(index_0: string, options?: Tx): Promise<boolean>;
    renounceOwnership(options?: Tx): Promise<Transaction>;
    owner(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): Promise<Transaction>;
    registerBroker(_broker: string, options?: Tx): Promise<Transaction>;
    deregisterBroker(_broker: string, options?: Tx): Promise<Transaction>;
    verifyWithdrawSignature(_trader: string, _signature: string, options?: Tx): Promise<Transaction>;
    address: string;
}
// tslint:enable:max-line-length
