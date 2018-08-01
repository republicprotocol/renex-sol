
import { Suite, SuiteFunction } from "mocha";
import Web3 from "web3";

/**
 * Define the type for the `contract` Mocha/Truffle suite function
 */

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

/**
 * Define the Artifacts interface for importing contracts
 */

interface Artifacts {
    require(name: string): Contract<any>,
}

/**
 * Declare the global values provided by Truffle
 */

declare global {
    let contract: ContractFunction;
    let artifacts: Artifacts;
    let web3: Web3;
}
