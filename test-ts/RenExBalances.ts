import { RenExBalancesContract } from "./bindings/ren_ex_balances";
import { RenExSettlementContract } from "./bindings/ren_ex_settlement";
import { DarknodeRewardVaultContract } from "./bindings/darknode_reward_vault";
import { RenExBrokerVerifierContract } from "./bindings/ren_ex_broker_verifier";

import * as testUtils from "./helper/testUtils";
import { BN } from "bn.js";
import { PausableTokenContract } from "./bindings/pausable_token";

contract("RenExBalances", function (accounts: string[]) {

    let renExBalances: RenExBalancesContract;
    let renExSettlement: RenExSettlementContract;
    let rewardVault: DarknodeRewardVaultContract;
    let renExBrokerVerifier: RenExBrokerVerifierContract;
    let ETH: testUtils.BasicERC20;
    let REN: testUtils.BasicERC20;
    let TOKEN1: PausableTokenContract;
    let TOKEN2: PausableTokenContract;
    const broker = accounts[9];

    before(async function () {
        ETH = testUtils.MockETH;
        REN = await artifacts.require("RepublicToken").deployed();
        TOKEN1 = await artifacts.require("RepublicToken").new();
        TOKEN2 = await artifacts.require("ABCToken").deployed();
        rewardVault = await artifacts.require("DarknodeRewardVault").deployed();
        renExBalances = await artifacts.require("RenExBalances").deployed();
        renExSettlement = await artifacts.require("RenExSettlement").deployed();

        // Register broker
        renExBrokerVerifier = await artifacts.require("RenExBrokerVerifier").deployed();
        await renExBrokerVerifier.registerBroker(broker);
    });

    it("can update Reward Vault address", async () => {
        await renExBalances.updateRewardVaultContract(testUtils.NULL);
        (await renExBalances.rewardVaultContract()).should.equal(testUtils.Ox0);
        await renExBalances.updateRewardVaultContract(rewardVault.address, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner
        await renExBalances.updateRewardVaultContract(rewardVault.address);
        (await renExBalances.rewardVaultContract()).should.equal(rewardVault.address);
    });

    it("can update Broker Verifier address", async () => {
        await renExBalances.updateBrokerVerifierContract(testUtils.NULL);
        (await renExBalances.brokerVerifierContract()).should.equal(testUtils.Ox0);
        await renExBalances.updateBrokerVerifierContract(renExBrokerVerifier.address, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner
        await renExBalances.updateBrokerVerifierContract(renExBrokerVerifier.address);
        (await renExBalances.brokerVerifierContract()).should.equal(renExBrokerVerifier.address);
    });

    it("can hold tokens for a trader", async () => {
        const deposit1 = new BN(100);
        const deposit2 = new BN(50);

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
        let sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0]);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] });
        sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0]);
        await renExBalances.withdraw(TOKEN2.address, deposit2, sig, { from: accounts[0] });

        // Check that the tokens have been returned
        (await TOKEN1.balanceOf(accounts[0])).should.bignumber.equal(previous1);
        (await TOKEN2.balanceOf(accounts[0])).should.bignumber.equal(previous2);

        // Check that balance in renExBalances is zeroed
        (await renExBalances.traderBalances(accounts[0], TOKEN1.address)).should.bignumber.equal(0);
        (await renExBalances.traderBalances(accounts[0], TOKEN2.address)).should.bignumber.equal(0);
    });

    it("can hold tokens for multiple traders", async () => {
        const deposit1 = new BN(100);
        const deposit2 = new BN(50);

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
        const sigA = await testUtils.signWithdrawal(renExBrokerVerifier, broker, TRADER_A);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sigA, { from: TRADER_A });
        const sigB = await testUtils.signWithdrawal(renExBrokerVerifier, broker, TRADER_B);
        await renExBalances.withdraw(TOKEN1.address, deposit2, sigB, { from: TRADER_B });

        // Check that the tokens have been returned
        (await TOKEN1.balanceOf(TRADER_A)).should.bignumber.equal(previous1);
        (await TOKEN1.balanceOf(TRADER_B)).should.bignumber.equal(previous2);
    });

    it("throws for invalid withdrawal", async () => {
        const deposit1 = 100;

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: accounts[0] });

        // Withdraw more than deposited amount
        let sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0]);
        await renExBalances.withdraw(TOKEN1.address, deposit1 * 2, sig, { from: accounts[0] })
            .should.be.rejectedWith(null, /insufficient funds/);

        // Token transfer fails
        await TOKEN1.pause();
        sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0]);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] })
            .should.be.rejectedWith(null, /revert/); // ERC20 transfer fails
        await TOKEN1.unpause();

        // Withdraw
        sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0]);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] });

        // Withdraw again
        sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0]);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] })
            .should.be.rejectedWith(null, /insufficient funds/);
    });

    it("can deposit and withdraw multiple times", async () => {
        const deposit1 = 100;
        const deposit2 = 50;

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1 + deposit2, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit2, { from: accounts[0] });

        // Withdraw
        let sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0]);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] });
        sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0]);
        await renExBalances.withdraw(TOKEN1.address, deposit2, sig, { from: accounts[0] });
    });

    it("can hold ether for a trader", async () => {
        const deposit1 = new BN(1);

        const previous = new BN(await web3.eth.getBalance(accounts[0]));

        // Approve and deposit
        const fee1 = await testUtils.getFee(
            renExBalances.deposit(ETH.address, deposit1, { from: accounts[0], value: deposit1.toString() })
        );

        // Balance should be (previous - fee1 - deposit1)
        const after = (await web3.eth.getBalance(accounts[0]));
        after.should.bignumber.equal(previous.sub(fee1).sub(deposit1));

        // Withdraw
        let sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0]);
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

    it("decrementBalance reverts for invalid withdrawals", async () => {
        const auth = accounts[8];
        await renExBalances.updateRenExSettlementContract(auth);

        const deposit = 10;
        await renExBalances.deposit(ETH.address, deposit, { from: accounts[0], value: deposit });

        // Insufficient balance for fee
        await renExBalances.transferBalanceWithFee(
            accounts[0], accounts[1], ETH.address, 0, 20, accounts[0], { from: auth }
        ).should.be.rejectedWith(null, /insufficient funds for fee/);

        // Insufficient balance for fee
        await renExBalances.transferBalanceWithFee(
            accounts[0], accounts[1], ETH.address, 20, 0, accounts[0], { from: auth }
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
        const deposit1 = 100;

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: accounts[0] });

        // Withdraw
        await renExBalances.withdraw(TOKEN1.address, deposit1, testUtils.NULL, { from: accounts[0] })
            .should.be.rejectedWith(null, /not signalled/);
    });

    it("trade can wait 48 hours", async () => {
        const deposit1 = 100;

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1 * 2, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1 * 2, { from: accounts[0] });

        let i = 0;
        await renExBalances.withdraw(TOKEN1.address, deposit1, testUtils.NULL, { from: accounts[0] })
            .should.be.rejectedWith(null, /not signalled/);

        await renExBalances.signalBackupWithdraw(TOKEN1.address, { from: accounts[0] });

        await renExBalances.withdraw(TOKEN1.address, deposit1, testUtils.NULL, { from: accounts[0] })
            .should.be.rejectedWith(null, /not signalled/);

        // Increase time by 47 hours
        const hour = 60 * 60;
        testUtils.increaseTime(47 * hour);

        await renExBalances.withdraw(TOKEN1.address, deposit1, testUtils.NULL, { from: accounts[0] })
            .should.be.rejectedWith(null, /not signalled/);

        // Increase time by another hour
        testUtils.increaseTime(1 * hour + 10);

        // Still can't withdraw other tokens
        await renExBalances.withdraw(TOKEN2.address, deposit1, testUtils.NULL, { from: accounts[0] })
            .should.be.rejectedWith(null, /not signalled/);

        // Other traders can't withdraw token
        await renExBalances.withdraw(TOKEN1.address, deposit1, testUtils.NULL, { from: accounts[1] })
            .should.be.rejectedWith(null, /not signalled/);

        // Can now withdraw without signature
        await renExBalances.withdraw(TOKEN1.address, deposit1, testUtils.NULL, { from: accounts[0] });

        // Can only withdraw once
        await renExBalances.withdraw(TOKEN1.address, deposit1, testUtils.NULL, { from: accounts[0] })
            .should.be.rejectedWith(null, /not signalled/);

        // Can withdraw normally
        let sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0]);
        await renExBalances.withdraw(TOKEN1.address, deposit1, sig, { from: accounts[0] });
    });

});
