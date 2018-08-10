import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface RenExTokensContract {
    renounceOwnership(options?: Tx): Promise<Transaction>;
    owner(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): Promise<Transaction>;
    tokens(index_0: number | BN, options?: Tx): Promise<{ addr: string, decimals: number | string | BN, registered: boolean }>;
    registerToken(_tokenCode: number | BN, _tokenAddress: string, _tokenDecimals: number | BN, options?: Tx): Promise<Transaction>;
    deregisterToken(_tokenCode: number | BN, options?: Tx): Promise<Transaction>;
    address: string;
}
// tslint:enable:max-line-length
