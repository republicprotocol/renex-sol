
import { Suite, SuiteFunction } from "mocha";
import Web3 from "web3";

// Borrowed from https://github.com/biern/truffle-typescript-example (No License)

declare type _contractTest = (accounts: string[]) => void;

// (name: string, test: _contractTest): void;
declare interface TransactionMeta {
    from: string,
}

interface ContractFunction {
    (title: string, fn: (this: Suite, accounts?: string[]) => void): Suite;
    (title: string): Suite;
    only: ExclusiveContractFunction;
    skip: PendingContractFunction;
}

interface ExclusiveContractFunction {
    (title: string, fn: (this: Suite, accounts?: string[]) => void): Suite;
    (title: string): Suite;
}

interface PendingContractFunction {
    (title: string, fn: (this: Suite, accounts?: string[]) => void): Suite | void;
}

interface Contract<T> {
    "new"(...args): Promise<T>,
    deployed(): Promise<T>,
    at(address: string): T,
    address: string,
}

interface Artifacts {
    require(name: string): Contract<any>,
}

declare global {
    var contract: ContractFunction;
    var artifacts: Artifacts;
    var web3: Web3;
    var assert: any; // Fix
}
