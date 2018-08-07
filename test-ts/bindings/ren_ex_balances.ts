import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface RenExBalancesContract {
    brokerVerifierContract(options?: Tx): Promise<string>;
    rewardVaultContract(options?: Tx): Promise<string>;
    renounceOwnership(options?: Tx): Promise<Transaction>;
    owner(options?: Tx): Promise<string>;
    traderBalances(index_0: string, index_1: string, options?: Tx): Promise<number|string|BN>;
    SIGNAL_DELAY(options?: Tx): Promise<number|string|BN>;
    settlementContract(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): Promise<Transaction>;
    ETHEREUM(options?: Tx): Promise<string>;
    traderWithdrawalSignals(index_0: string, index_1: string, options?: Tx): Promise<number|string|BN>;
    updateRenExSettlementContract(_newSettlementContract: string, options?: Tx): Promise<Transaction>;
    updateRewardVaultContract(_newRewardVaultContract: string, options?: Tx): Promise<Transaction>;
    updateBrokerVerifierContract(_newBrokerVerifierContract: string, options?: Tx): Promise<Transaction>;
    transferBalanceWithFee(_traderFrom: string, _traderTo: string, _token: string, _value: number|string|BN, _fee: number|string|BN, _feePayee: string, options?: Tx): Promise<Transaction>;
    deposit(_token: string, _value: number|string|BN, options?: Tx): Promise<Transaction>;
    withdraw(_token: string, _value: number|string|BN, _signature: string, options?: Tx): Promise<Transaction>;
    signalBackupWithdraw(_token: string, options?: Tx): Promise<Transaction>;
    address: string;
}
// tslint:enable:max-line-length
