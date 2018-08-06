const RepublicToken = artifacts.require("RepublicToken");
const ABCToken = artifacts.require("ABCToken");
const DarknodeRewardVault = artifacts.require("DarknodeRewardVault");
const RenExSettlement = artifacts.require("RenExSettlement");
const RenExBalances = artifacts.require("RenExBalances");

import BigNumber from "bignumber.js";

import * as testUtils from "./helper/testUtils";

contract("RenExBalances", function (accounts: string[]) {

    let renExBalances, renExSettlement, rewardVault;
    let ETH, REN, TOKEN1, TOKEN2;

    beforeEach(async function () {
        ETH = testUtils.MockETH;
        REN = await RepublicToken.deployed();
        TOKEN1 = await RepublicToken.new();
        TOKEN2 = await ABCToken.deployed();
        rewardVault = await DarknodeRewardVault.deployed();
        renExBalances = await RenExBalances.deployed();
        renExSettlement = await RenExSettlement.deployed();
    });

    it("can update Reward Vault address", async () => {
        await renExBalances.updateRewardVault(0x0);
        (await renExBalances.rewardVaultContract()).should.equal(testUtils.Ox0);
        await renExBalances.updateRewardVault(rewardVault.address, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner
        await renExBalances.updateRewardVault(rewardVault.address);
        (await renExBalances.rewardVaultContract()).should.equal(rewardVault.address);
    });

    it("can hold tokens for a trader", async () => {
        const deposit1 = 100;
        const deposit2 = 50;

        // Get ERC20 balance for tokens
        const previous1 = new BigNumber(await TOKEN1.balanceOf(accounts[0]));
        const previous2 = new BigNumber(await TOKEN2.balanceOf(accounts[0]));

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: accounts[0] });
        await TOKEN2.approve(renExBalances.address, deposit2, { from: accounts[0] });
        await renExBalances.deposit(TOKEN2.address, deposit2, { from: accounts[0] });

        // Check that balance in renExBalances is updated
        const { 0: tokens, 1: balances } = await renExBalances.getBalances.call(accounts[0]);
        tokens[0].should.equal(TOKEN1.address);
        tokens[1].should.equal(TOKEN2.address);
        balances[0].toString().should.equal(deposit1.toFixed());
        balances[1].toString().should.equal(deposit2.toFixed());

        // Check that the correct amount of tokens has been withdrawn
        (await TOKEN1.balanceOf(accounts[0])).toString().should.equal(previous1.minus(deposit1).toFixed());
        (await TOKEN2.balanceOf(accounts[0])).toString().should.equal(previous2.minus(deposit2).toFixed());

        // Withdraw
        await renExBalances.withdraw(TOKEN1.address, deposit1, { from: accounts[0] });
        await renExBalances.withdraw(TOKEN2.address, deposit2, { from: accounts[0] });

        // Check that the tokens have been returned
        (await TOKEN1.balanceOf(accounts[0])).toString().should.equal(previous1.toFixed());
        (await TOKEN2.balanceOf(accounts[0])).toString().should.equal(previous2.toFixed());
    });

    it("can hold tokens for multiple traders", async () => {
        const deposit1 = 100;
        const deposit2 = 50;

        const TRADER_A = accounts[2];
        const TRADER_B = accounts[3];

        // Give accounts[1] some tokens
        await TOKEN1.transfer(TRADER_A, deposit1);
        await TOKEN1.transfer(TRADER_B, deposit2);

        // Get ERC20 balance for TOKEN1 and TOKEN2
        const previous1 = new BigNumber(await TOKEN1.balanceOf(TRADER_A));
        const previous2 = new BigNumber(await TOKEN1.balanceOf(TRADER_B));

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1, { from: TRADER_A });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: TRADER_A });
        await TOKEN1.approve(renExBalances.address, deposit2, { from: TRADER_B });
        await renExBalances.deposit(TOKEN1.address, deposit2, { from: TRADER_B });

        // Check that balance in renExBalances is updated
        const { 0: tokens1, 1: balances1 } = await renExBalances.getBalances(TRADER_A);
        tokens1[0].should.equal(TOKEN1.address);
        balances1[0].toString().should.equal(deposit1.toFixed());

        const { 0: tokens2, 1: balances2 } = await renExBalances.getBalances(TRADER_B);
        tokens2[0].should.equal(TOKEN1.address);
        balances2[0].toString().should.equal(deposit2.toFixed());

        // Check that the correct amount of tokens has been withdrawn
        (await TOKEN1.balanceOf(TRADER_A)).toString().should.equal(previous1.minus(deposit1).toFixed());
        (await TOKEN1.balanceOf(TRADER_B)).toString().should.equal(previous2.minus(deposit2).toFixed());

        // Withdraw
        await renExBalances.withdraw(TOKEN1.address, deposit1, { from: TRADER_A });
        await renExBalances.withdraw(TOKEN1.address, deposit2, { from: TRADER_B });

        // Check that the tokens have been returned
        (await TOKEN1.balanceOf(TRADER_A)).toString().should.equal(previous1.toFixed());
        (await TOKEN1.balanceOf(TRADER_B)).toString().should.equal(previous2.toFixed());
    });

    it("throws for invalid withdrawal", async () => {
        const deposit1 = 100;

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: accounts[0] });

        // Withdraw more than deposited amount
        await renExBalances.withdraw(TOKEN1.address, deposit1 * 2, { from: accounts[0] })
            .should.be.rejectedWith(null, /insufficient balance/);

        // Token transfer fails
        await TOKEN1.pause();
        await renExBalances.withdraw(TOKEN1.address, deposit1, { from: accounts[0] })
            .should.be.rejectedWith(null, /revert/); // ERC20 transfer fails
        await TOKEN1.unpause();

        // Withdraw
        await renExBalances.withdraw(TOKEN1.address, deposit1, { from: accounts[0] });

        // Withdraw again
        await renExBalances.withdraw(TOKEN1.address, deposit1, { from: accounts[0] })
            .should.be.rejectedWith(null, /insufficient balance/);
    });

    it("can deposit and withdraw multiple times", async () => {
        const deposit1 = 100;
        const deposit2 = 50;

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1 + deposit2, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit2, { from: accounts[0] });

        // Withdraw
        await renExBalances.withdraw(TOKEN1.address, deposit1, { from: accounts[0] });
        await renExBalances.withdraw(TOKEN1.address, deposit2, { from: accounts[0] });
    });

    it("can hold ether for a trader", async () => {
        const deposit1 = 1;

        const previous = new BigNumber(await web3.eth.getBalance(accounts[0]));

        // Approve and deposit
        const fee1 = await testUtils.getFee(
            renExBalances.deposit(ETH.address, deposit1, { from: accounts[0], value: deposit1 })
        );

        // Balance should be (previous - fee1 - deposit1)
        const after = (await web3.eth.getBalance(accounts[0]));
        after.toString().should.equal(previous.minus(fee1).minus(deposit1).toFixed());

        // Withdraw
        const fee2 = await testUtils.getFee(renExBalances.withdraw(ETH.address, deposit1, { from: accounts[0] }));

        // Balance should be (previous - fee1 - fee2)
        (await web3.eth.getBalance(accounts[0])).should.equal(previous.minus(fee1).minus(fee2).toFixed());
    });

    it("only the settlement contract can call `transferBalanceWithFee`", async () => {
        await renExBalances.transferBalanceWithFee(
            accounts[1],
            accounts[2],
            REN.address,
            1,
            0,
            0x0,
            { from: accounts[1] }
        ).should.be.rejectedWith(null, /not authorised/);
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

});
