import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface RenExTokensContract {
    renounceOwnership(options?: Tx): TransactionObject<void>;
    owner(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): TransactionObject<void>;
    tokens(index_0: number|BN, options?: Tx): Promise<{ addr: string, decimals: number|string|BN, registered: boolean} >;
    registerToken(_tokenCode: number|BN, _tokenAddress: string, _tokenDecimals: number|BN, options?: Tx): TransactionObject<void>;
    deregisterToken(_tokenCode: number|BN, options?: Tx): TransactionObject<void>;
    address: string;
}
// tslint:enable:max-line-length
