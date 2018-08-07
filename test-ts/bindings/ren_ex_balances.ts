import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface RenExBalancesContract {
    brokerVerifierContract(options?: Tx): Promise<string>;
    rewardVaultContract(options?: Tx): Promise<string>;
    renounceOwnership(options?: Tx): TransactionObject<void>;
    owner(options?: Tx): Promise<string>;
    traderBalances(index_0: string, index_1: string, options?: Tx): Promise<number|string|BN>;
    SIGNAL_DELAY(options?: Tx): Promise<number|string|BN>;
    settlementContract(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): TransactionObject<void>;
    ETHEREUM(options?: Tx): Promise<string>;
    traderWithdrawalSignals(index_0: string, index_1: string, options?: Tx): Promise<number|string|BN>;
    updateRenExSettlementContract(_newSettlementContract: string, options?: Tx): TransactionObject<void>;
    updateRewardVaultContract(_newRewardVaultContract: string, options?: Tx): TransactionObject<void>;
    updateBrokerVerifierContract(_newBrokerVerifierContract: string, options?: Tx): TransactionObject<void>;
    transferBalanceWithFee(_traderFrom: string, _traderTo: string, _token: string, _value: number|string|BN, _fee: number|string|BN, _feePayee: string, options?: Tx): TransactionObject<void>;
    deposit(_token: string, _value: number|string|BN, options?: Tx): TransactionObject<void>;
    withdraw(_token: string, _value: number|string|BN, _signature: string, options?: Tx): TransactionObject<void>;
    signalBackupWithdraw(_token: string, options?: Tx): TransactionObject<void>;
    address: string;
}
// tslint:enable:max-line-length
