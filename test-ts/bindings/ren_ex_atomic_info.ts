import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface RenExAtomicInfoContract {
    getOwnerAddress(index_0: string, options?: Tx): Promise<string>;
    ownerAddressTimestamp(index_0: string, options?: Tx): Promise<number | string | BN>;
    swapDetailsTimestamp(index_0: string, options?: Tx): Promise<number | string | BN>;
    renounceOwnership(options?: Tx): Promise<Transaction>;
    authorizedSwapper(index_0: string, index_1: string, options?: Tx): Promise<boolean>;
    owner(options?: Tx): Promise<string>;
    swapDetails(index_0: string, options?: Tx): Promise<string>;
    orderbookContract(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): Promise<Transaction>;
    updateOrderbook(_newOrderbookContract: string, options?: Tx): Promise<Transaction>;
    authorizeSwapper(_swapper: string, options?: Tx): Promise<Transaction>;
    deauthorizeSwapper(_swapper: string, options?: Tx): Promise<Transaction>;
    submitDetails(_orderID: string, _swapDetails: string, options?: Tx): Promise<Transaction>;
    setOwnerAddress(_orderID: string, _owner: string, options?: Tx): Promise<Transaction>;
    address: string;
}
// tslint:enable:max-line-length
