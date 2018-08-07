import { TransactionObject, Tx } from "web3/types";
import { BN } from "bn.js";

// tslint:disable:max-line-length
export interface OrderbookContract {
    renounceOwnership(options?: Tx): TransactionObject<void>;
    orderOpeningFee(options?: Tx): Promise<number|string|BN>;
    ren(options?: Tx): Promise<string>;
    owner(options?: Tx): Promise<string>;
    darknodeRegistry(options?: Tx): Promise<string>;
    transferOwnership(_newOwner: string, options?: Tx): TransactionObject<void>;
    updateFee(_newOrderOpeningFee: number|string|BN, options?: Tx): TransactionObject<void>;
    updateDarknodeRegistry(_newDarknodeRegistry: string, options?: Tx): TransactionObject<void>;
    openBuyOrder(_signature: string, _orderID: string, options?: Tx): TransactionObject<void>;
    openSellOrder(_signature: string, _orderID: string, options?: Tx): TransactionObject<void>;
    confirmOrder(_orderID: string, _matchedOrderID: string, options?: Tx): TransactionObject<void>;
    cancelOrder(_signature: string, _orderID: string, options?: Tx): TransactionObject<void>;
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
