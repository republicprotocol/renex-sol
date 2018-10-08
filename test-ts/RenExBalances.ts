import { BN } from "bn.js";

import * as testUtils from "./helper/testUtils";

import { DGXTokenArtifact } from "./bindings/d_g_x_token";
import { DarknodeRewardVaultArtifact, DarknodeRewardVaultContract } from "./bindings/darknode_reward_vault";
import { DisapprovingTokenArtifact } from "./bindings/disapproving_token";
import { PausableTokenContract } from "./bindings/pausable_token";
import { RenExBalancesArtifact, RenExBalancesContract } from "./bindings/ren_ex_balances";
import { RenExBrokerVerifierArtifact, RenExBrokerVerifierContract } from "./bindings/ren_ex_broker_verifier";
import { RenExSettlementArtifact, RenExSettlementContract } from "./bindings/ren_ex_settlement";
import { RepublicTokenArtifact } from "./bindings/republic_token";
import { StandardTokenContract } from "./bindings/standard_token";
import { TrueUSDArtifact } from "./bindings/true_u_s_d";
import { VersionedContractArtifact } from "./bindings/versioned_contract";

const RepublicToken = artifacts.require("RepublicToken") as RepublicTokenArtifact;
const DGXToken = artifacts.require("DGXToken") as DGXTokenArtifact;
const DarknodeRewardVault = artifacts.require("DarknodeRewardVault") as DarknodeRewardVaultArtifact;
const RenExBalances = artifacts.require("RenExBalances") as RenExBalancesArtifact;
const RenExSettlement = artifacts.require("RenExSettlement") as RenExSettlementArtifact;
const VersionedContract = artifacts.require("VersionedContract") as VersionedContractArtifact;
const RenExBrokerVerifier = artifacts.require("RenExBrokerVerifier") as RenExBrokerVerifierArtifact;
const DisapprovingToken = artifacts.require("DisapprovingToken") as DisapprovingTokenArtifact;
const TUSDToken = artifacts.require("TrueUSD") as TrueUSDArtifact;

contract("RenExBalances", function (accounts: string[]) {

    let renExBalances: RenExBalancesContract;
    let renExSettlement: RenExSettlementContract;
    let rewardVault: DarknodeRewardVaultContract;
    let renExBrokerVerifier: RenExBrokerVerifierContract;
    let ETH: testUtils.BasicERC20;
    let REN: testUtils.BasicERC20;
    let TOKEN1: PausableTokenContract;
    let TOKEN2: StandardTokenContract;
    const broker = accounts[9];

    before(async function () {
        ETH = testUtils.MockETH;
        REN = await RepublicToken.deployed();
        TOKEN1 = await RepublicToken.new();
        TOKEN2 = await DGXToken.new();
        rewardVault = await DarknodeRewardVault.deployed();
        renExBalances = await RenExBalances.deployed();
        renExSettlement = await RenExSettlement.deployed();

        // Register broker
        renExBrokerVerifier = await RenExBrokerVerifier.deployed();
        await renExBrokerVerifier.registerBroker(broker);
    });

    it("can update Reward Vault address", async () => {
        const previousRewardVault = await renExBalances.rewardVaultContract();

        // [CHECK] The function validates the new reward vault
        await renExBalances.updateRewardVaultContract(testUtils.NULL)
            .should.be.rejectedWith(null, /revert/);

        // [ACTION] Update the reward vault to another address
        await renExBalances.updateRewardVaultContract(renExBalances.address);
        // [CHECK] Verify the reward vault address has been updated
        (await renExBalances.rewardVaultContract()).should.equal(renExBalances.address);

        // [CHECK] Only the owner can update the reward vault
        await renExBalances.updateRewardVaultContract(previousRewardVault, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner

        // [RESET] Reset the reward vault to the previous address
        await renExBalances.updateRewardVaultContract(previousRewardVault);
        (await renExBalances.rewardVaultContract()).should.equal(previousRewardVault);
    });

    it("can update Broker Verifier address", async () => {
        const previousBrokerVerifier = await renExBalances.brokerVerifierContract();

        // [CHECK] The function validates the new broker verifier
        await renExBalances.updateBrokerVerifierContract(testUtils.NULL)
            .should.be.rejectedWith(null, /revert/);

        // [ACTION] Update the broker verifier to another address
        await renExBalances.updateBrokerVerifierContract(renExBalances.address);
        // [CHECK] Verify the broker verifier address has been updated
        (await renExBalances.brokerVerifierContract()).should.equal(renExBalances.address);

        // [CHECK] Only the owner can update the broker verifier
        await renExBalances.updateBrokerVerifierContract(previousBrokerVerifier, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner

        // [RESET] Reset the broker verifier to the previous address
        await renExBalances.updateBrokerVerifierContract(previousBrokerVerifier);
        (await renExBalances.brokerVerifierContract()).should.equal(previousBrokerVerifier);
    });

    it("can update RenEx Settlement address", async () => {
        const previousSettlementContract = await renExBalances.settlementContract();

        // [CHECK] The function validates the new settlement contract
        await renExBalances.updateRenExSettlementContract(testUtils.NULL)
            .should.be.rejectedWith(null, /revert/);

        // [ACTION] Update the settlement contract to another address
        await renExBalances.updateRenExSettlementContract(renExBalances.address);
        // [CHECK] Verify the settlement contract address has been updated
        (await renExBalances.settlementContract()).should.equal(renExBalances.address);

        // [CHECK] Only the owner can update the settlement contract
        await renExBalances.updateRenExSettlementContract(previousSettlementContract, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner

        // [RESET] Reset the settlement contract to the previous address
        await renExBalances.updateRenExSettlementContract(previousSettlementContract);
        (await renExBalances.settlementContract()).should.equal(previousSettlementContract);
    });

    it("can hold tokens for a trader", async () => {
        const deposit1 = new BN("100000000000000000");
        const deposit2 = new BN("50000000000000000");

        // Get ERC20 balance for tokens
        const previous1 = new BN(await TOKEN1.balanceOf(accounts[0]));
        const previous2 = new BN(await TOKEN2.balanceOf(accounts[0]));

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: accounts[0] });
        await TOKEN2.approve(renExBalances.address, deposit2, { from: accounts[0] });
        await renExBalances.deposit(TOKEN2.address, deposit2, { from: accounts[0] });

        // Check that balance in renExBalances is updated
        (await renExBalances.traderBalances(accounts[0], TOKEN1.address)).should.bignumber.equal(deposit1);
        (await renExBalances.traderBalances(accounts[0], TOKEN2.address)).should.bignumber.equal(deposit2);

        // Check that the correct amount of tokens has been withdrawn
        (await TOKEN1.balanceOf(accounts[0])).should.bignumber.equal(previous1.sub(deposit1));
        (await TOKEN2.balanceOf(accounts[0])).should.bignumber.equal(previous2.sub(deposit2));

        // Withdraw
        let sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0], TOKEN1.address);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] });
        sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0], TOKEN2.address);
        await renExBalances.withdraw(TOKEN2.address, deposit2, sig, { from: accounts[0] });

        // Check that the tokens have been returned
        (await TOKEN1.balanceOf(accounts[0])).should.bignumber.equal(previous1);
        (await TOKEN2.balanceOf(accounts[0])).should.bignumber.equal(previous2);

        // Check that balance in renExBalances is zeroed
        (await renExBalances.traderBalances(accounts[0], TOKEN1.address)).should.bignumber.equal(0);
        (await renExBalances.traderBalances(accounts[0], TOKEN2.address)).should.bignumber.equal(0);
    });

    it("can hold tokens for multiple traders", async () => {
        const deposit1 = new BN("100000000000000000");
        const deposit2 = new BN("50000000000000000");

        const TRADER_A = accounts[2];
        const TRADER_B = accounts[3];

        // Give accounts[1] some tokens
        await TOKEN1.transfer(TRADER_A, deposit1);
        await TOKEN1.transfer(TRADER_B, deposit2);

        // Get ERC20 balance for TOKEN1 and TOKEN2
        const previous1 = new BN(await TOKEN1.balanceOf(TRADER_A));
        const previous2 = new BN(await TOKEN1.balanceOf(TRADER_B));

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1, { from: TRADER_A });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: TRADER_A });
        await TOKEN1.approve(renExBalances.address, deposit2, { from: TRADER_B });
        await renExBalances.deposit(TOKEN1.address, deposit2, { from: TRADER_B });

        // Check that balance in renExBalances is updated
        (await renExBalances.traderBalances(TRADER_A, TOKEN1.address)).should.bignumber.equal(deposit1);

        (await renExBalances.traderBalances(TRADER_B, TOKEN1.address)).should.bignumber.equal(deposit2);

        // Check that the correct amount of tokens has been withdrawn
        (await TOKEN1.balanceOf(TRADER_A)).should.bignumber.equal(previous1.sub(deposit1));
        (await TOKEN1.balanceOf(TRADER_B)).should.bignumber.equal(previous2.sub(deposit2));

        // Withdraw
        const sigA = await testUtils.signWithdrawal(renExBrokerVerifier, broker, TRADER_A, TOKEN1.address);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sigA, { from: TRADER_A });
        const sigB = await testUtils.signWithdrawal(renExBrokerVerifier, broker, TRADER_B, TOKEN1.address);
        await renExBalances.withdraw(TOKEN1.address, deposit2, sigB, { from: TRADER_B });

        // Check that the tokens have been returned
        (await TOKEN1.balanceOf(TRADER_A)).should.bignumber.equal(previous1);
        (await TOKEN1.balanceOf(TRADER_B)).should.bignumber.equal(previous2);
    });

    it("throws for invalid withdrawal", async () => {
        const deposit1 = new BN("100000000000000000");

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: accounts[0] });

        // Withdraw more than deposited amount
        let sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0], TOKEN1.address);
        await renExBalances.withdraw(TOKEN1.address, deposit1.mul(new BN(2)), sig, { from: accounts[0] })
            .should.be.rejectedWith(null, /insufficient funds/);

        // Token transfer fails
        await TOKEN1.pause();
        sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0], TOKEN1.address);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] })
            .should.be.rejectedWith(null, /revert/); // ERC20 transfer fails
        await TOKEN1.unpause();

        // Withdraw
        sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0], TOKEN1.address);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] });

        // Withdraw again
        sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0], TOKEN1.address);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] })
            .should.be.rejectedWith(null, /insufficient funds/);
    });

    it("can deposit and withdraw multiple times", async () => {
        const deposit1 = new BN("100000000000000000");
        const deposit2 = new BN("50000000000000000");

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1.add(deposit2), { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit2, { from: accounts[0] });

        // Withdraw
        let sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0], TOKEN1.address);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] });
        sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0], TOKEN1.address);
        await renExBalances.withdraw(TOKEN1.address, deposit2, sig, { from: accounts[0] });
    });

    it("can hold ether for a trader", async () => {
        const deposit1 = new BN("100000000000000000");

        const previous = new BN(await web3.eth.getBalance(accounts[0]));

        // Approve and deposit
        const fee1 = await testUtils.getFee(
            renExBalances.deposit(ETH.address, deposit1, { from: accounts[0], value: deposit1.toString() })
        );

        // Balance should be (previous - fee1 - deposit1)
        const after = (await web3.eth.getBalance(accounts[0]));
        after.should.bignumber.equal(previous.sub(fee1).sub(deposit1));

        // Withdraw
        let sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0], ETH.address);
        const fee2 = await testUtils.getFee(renExBalances.withdraw(ETH.address, deposit1, sig, { from: accounts[0] }));

        // Balance should be (previous - fee1 - fee2)
        (await web3.eth.getBalance(accounts[0])).should.bignumber.equal(previous.sub(fee1).sub(fee2));
    });

    it("only the settlement contract can call `transferBalanceWithFee`", async () => {
        await renExBalances.transferBalanceWithFee(
            accounts[1],
            accounts[2],
            REN.address,
            1,
            0,
            testUtils.NULL,
            { from: accounts[1] }
        ).should.be.rejectedWith(null, /not authorized/);
    });

    it("deposits validates the transfer", async () => {
        // Token
        await TOKEN1.approve(renExBalances.address, 1, { from: accounts[1] });
        await renExBalances.deposit(TOKEN1.address, 2, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // ERC20 transfer fails

        // ETH
        await renExBalances.deposit(ETH.address, 2, { from: accounts[1], value: 1 })
            .should.be.rejectedWith(null, /mismatched value parameter and tx value/);
    });

    it("transfer validates the fee approval", async () => {
        const mockSettlement = await VersionedContract.new("VERSION", renExBalances.address);
        await renExBalances.updateRenExSettlementContract(mockSettlement.address);

        const token = await DisapprovingToken.new();

        await mockSettlement.transferBalanceWithFee(
            accounts[1],
            accounts[2],
            token.address,
            0,
            0,
            testUtils.NULL, // fails to approve to 0x0
        ).should.be.rejectedWith(null, /approve failed/);

        // Revert change
        await renExBalances.updateRenExSettlementContract(renExSettlement.address);
    });

    it("decrementBalance reverts for invalid withdrawals", async () => {
        const mockSettlement = await VersionedContract.new("VERSION", renExBalances.address);
        await renExBalances.updateRenExSettlementContract(mockSettlement.address);

        const deposit = new BN("10000000000000000");
        const doubleDeposit = deposit.mul(new BN(2));
        await renExBalances.deposit(ETH.address, deposit, { from: accounts[0], value: deposit.toString() });

        // Insufficient balance for fee
        await mockSettlement.transferBalanceWithFee(
            accounts[0], accounts[1], ETH.address, 0, doubleDeposit, accounts[0],
        ).should.be.rejectedWith(null, /insufficient funds for fee/);

        // Insufficient balance for fee
        await mockSettlement.transferBalanceWithFee(
            accounts[0], accounts[1], ETH.address, doubleDeposit, 0, accounts[0],
        ).should.be.rejectedWith(null, /insufficient funds/);

        // Revert change
        await renExBalances.updateRenExSettlementContract(renExSettlement.address);
    });

    it("cannot transfer ether and erc20 in a single transaction", async () => {
        await TOKEN1.approve(renExBalances.address, 2);
        await renExBalances.deposit(TOKEN1.address, 2, { value: 2 })
            .should.be.rejectedWith(null, /unexpected ether transfer/);
    });

    it("trade is blocked without broker signature", async () => {
        const deposit1 = new BN("100000000000000000");

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: accounts[0] });

        // Withdraw with null signature
        await renExBalances.withdraw(TOKEN1.address, deposit1, testUtils.NULL, { from: accounts[0] })
            .should.be.rejectedWith(null, /invalid signature/);

        // Withdraw with invalid signature
        let invalidSig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[1], ETH.address);
        await renExBalances.withdraw(ETH.address, deposit1, invalidSig, { from: accounts[0] })
            .should.be.rejectedWith(null, /invalid signature/);

        // Withdraw with no signature
        await renExBalances.withdraw(TOKEN1.address, deposit1, "0x", { from: accounts[0] })
            .should.be.rejectedWith(null, /not signalled/);
    });

    it("trade can wait 48 hours", async () => {
        const deposit1 = new BN("100000000000000000");

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1.mul(new BN(2)), { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1.mul(new BN(2)), { from: accounts[0] });

        let i = 0;
        await renExBalances.withdraw(TOKEN1.address, deposit1, testUtils.NULL, { from: accounts[0] })
            .should.be.rejectedWith(null, /invalid signature/);

        await renExBalances.withdraw(TOKEN1.address, deposit1, "0x", { from: accounts[0] })
            .should.be.rejectedWith(null, /not signalled/);

        await renExBalances.signalBackupWithdraw(TOKEN1.address, { from: accounts[0] });

        await renExBalances.withdraw(TOKEN1.address, deposit1, "0x", { from: accounts[0] })
            .should.be.rejectedWith(null, /signal time remaining/);

        // Increase time by 47 hours
        const hour = 60 * 60;
        testUtils.increaseTime(47 * hour);

        await renExBalances.withdraw(TOKEN1.address, deposit1, "0x", { from: accounts[0] })
            .should.be.rejectedWith(null, /signal time remaining/);

        // Increase time by another hour
        testUtils.increaseTime(1 * hour + 10);

        // Still can't withdraw other tokens
        await renExBalances.withdraw(TOKEN2.address, deposit1, "0x", { from: accounts[0] })
            .should.be.rejectedWith(null, /not signalled/);

        // Other traders can't withdraw token
        await renExBalances.withdraw(TOKEN1.address, deposit1, "0x", { from: accounts[1] })
            .should.be.rejectedWith(null, /not signalled/);

        // Can now withdraw without signature
        await renExBalances.withdraw(TOKEN1.address, deposit1, "0x", { from: accounts[0] });

        // Can only withdraw once
        await renExBalances.withdraw(TOKEN1.address, deposit1, "0x", { from: accounts[0] })
            .should.be.rejectedWith(null, /not signalled/);

        // Can withdraw normally
        let sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0], TOKEN1.address);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] });
    });

    it("can subtract transfer fees paid in tokens", async () => {
        const TUSD = await TUSDToken.deployed();
        const fee = new BN(7);
        const base = new BN(10000);
        const trader = accounts[1];
        const deposit1 = new BN("1000000000000000000");

        const fee1 = deposit1.mul(fee).div(base);

        // [SETUP] Transfer tokens to trader (enough such that it equals deposit1 after fees)
        await TUSD.transfer(trader, deposit1.mul(base).div(base.sub(fee)).add(new BN(1)), { from: accounts[0] });

        // [CHECK] Get ERC20 balance for tokens
        const previous1 = new BN(await TUSD.balanceOf(trader));

        // [ACTION] Approve and deposit
        await TUSD.approve(renExBalances.address, deposit1, { from: trader });
        await renExBalances.deposit(TUSD.address, deposit1, { from: trader });

        // [CHECK] Check that balance in renExBalances is updated
        (await renExBalances.traderBalances(trader, TUSD.address)).should.bignumber.equal(deposit1.sub(fee1));

        // [CHECK] Check that the correct amount of tokens has been withdrawn
        (await TUSD.balanceOf(trader)).should.bignumber.equal(previous1.sub(deposit1));

        // [ACTION] Withdraw - and calculate the second transfer fee
        let sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, trader, TUSD.address);
        await renExBalances.withdraw(TUSD.address, deposit1.sub(fee1), sig, { from: trader });
        const fee2 = (deposit1.sub(fee1)).mul(fee).div(base);

        // [CHECK] Check that the tokens have been returned (minus the fees)
        (await TUSD.balanceOf(trader)).should.bignumber.equal(previous1.sub(fee1).sub(fee2));

        // [CHECK] Check that balance in renExBalances is zeroed
        (await renExBalances.traderBalances(trader, TUSD.address)).should.bignumber.equal(0);
    });

    it("withdraw can't be blocked by malicious contract owner", async () => {
        const deposit1 = new BN("100000000000000000");
        const versionedContract = await VersionedContract.new("VERSION", testUtils.NULL);

        // [SETUP] Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: accounts[0] });

        // [SETUP]
        const previousSettlementContract = await renExBalances.settlementContract();
        const previousRenExBrokerVerifier = await renExBalances.brokerVerifierContract();
        const previousDarknodeRewardVault = await renExBalances.rewardVaultContract();
        await renExBalances.updateRenExSettlementContract(versionedContract.address);
        await renExBalances.updateRewardVaultContract(versionedContract.address);
        await renExBalances.updateBrokerVerifierContract(versionedContract.address);

        // [CHECK] Can't withdraw normally
        const sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0], TOKEN1.address);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] })
            .should.be.rejectedWith(null, /revert/);

        // [ACTION] The trader can still withdraw after signalling
        await renExBalances.signalBackupWithdraw(TOKEN1.address, { from: accounts[0] });
        // Increase time by 47 hours
        const hour = 60 * 60;
        testUtils.increaseTime(48 * hour + 10);
        await renExBalances.withdraw(TOKEN1.address, deposit1, "0x", { from: accounts[0] })
            .should.not.be.rejected;

        // [RESET] Reset the contract addresses to the previous addresses
        await renExBalances.updateRenExSettlementContract(previousSettlementContract);
        await renExBalances.updateRewardVaultContract(previousRenExBrokerVerifier);
        await renExBalances.updateBrokerVerifierContract(previousDarknodeRewardVault);
    });

});
