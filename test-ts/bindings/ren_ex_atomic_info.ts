import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface RenExAtomicInfoContract {
    getOwnerAddress(index_0: string, options?: Tx): Promise<string>;
    ownerAddressTimestamp(index_0: string, options?: Tx): Promise<number|string|BN>;
    swapDetailsTimestamp(index_0: string, options?: Tx): Promise<number|string|BN>;
    renounceOwnership(options?: Tx): TransactionObject<void>;
    authorisedSwapper(index_0: string, index_1: string, options?: Tx): Promise<boolean>;
    owner(options?: Tx): Promise<string>;
    swapDetails(index_0: string, options?: Tx): Promise<string>;
    orderbookContract(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): TransactionObject<void>;
    updateOrderbook(_newOrderbookContract: string, options?: Tx): TransactionObject<void>;
    authoriseSwapper(_swapper: string, options?: Tx): TransactionObject<void>;
    deauthoriseSwapper(_swapper: string, options?: Tx): TransactionObject<void>;
    submitDetails(_orderID: string, _swapDetails: string, options?: Tx): TransactionObject<void>;
    setOwnerAddress(_orderID: string, _owner: string, options?: Tx): TransactionObject<void>;
    address: string;
}
// tslint:enable:max-line-length
