import { Tx, TransactionReceipt, Log } from "web3/types";
import { BN } from "bn.js";

export interface Transaction { receipt: TransactionReceipt; tx: string; logs: Log[]; }

// tslint:disable:max-line-length
export interface OrderbookContract {
    renounceOwnership(options?: Tx): Promise<Transaction>;
    orderOpeningFee(options?: Tx): Promise<number|string|BN>;
    ren(options?: Tx): Promise<string>;
    owner(options?: Tx): Promise<string>;
    darknodeRegistry(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): Promise<Transaction>;
    updateFee(_newOrderOpeningFee: number|string|BN, options?: Tx): Promise<Transaction>;
    updateDarknodeRegistry(_newDarknodeRegistry: string, options?: Tx): Promise<Transaction>;
    openBuyOrder(_signature: string, _orderID: string, options?: Tx): Promise<Transaction>;
    openSellOrder(_signature: string, _orderID: string, options?: Tx): Promise<Transaction>;
    confirmOrder(_orderID: string, _matchedOrderID: string, options?: Tx): Promise<Transaction>;
    cancelOrder(_signature: string, _orderID: string, options?: Tx): Promise<Transaction>;
    buyOrderAtIndex(_index: number|string|BN, options?: Tx): Promise<string>;
    sellOrderAtIndex(_index: number|string|BN, options?: Tx): Promise<string>;
    orderState(_orderID: string, options?: Tx): Promise<number|string|BN>;
    orderMatch(_orderID: string, options?: Tx): Promise<string>;
    orderPriority(_orderID: string, options?: Tx): Promise<number|string|BN>;
    orderTrader(_orderID: string, options?: Tx): Promise<string>;
    orderBroker(_orderID: string, options?: Tx): Promise<string>;
    orderConfirmer(_orderID: string, options?: Tx): Promise<string>;
    orderBlockNumber(_orderID: string, options?: Tx): Promise<number|string|BN>;
    orderDepth(_orderID: string, options?: Tx): Promise<number|string|BN>;
    ordersCount(options?: Tx): Promise<number|string|BN>;
    orderAtIndex(_index: number|string|BN, options?: Tx): Promise<string>;
    getOrders(_offset: number|string|BN, _limit: number|string|BN, options?: Tx): Promise<[string[], string[], number|string|BN[]]>;
    address: string;
}
// tslint:enable:max-line-length
