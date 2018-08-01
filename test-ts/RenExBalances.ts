const RepublicToken = artifacts.require("RepublicToken");
const DarknodeRewardVault = artifacts.require("DarknodeRewardVault");
const RenExSettlement = artifacts.require("RenExSettlement");
const RenExBalances = artifacts.require("RenExBalances");
const WithdrawBlock = artifacts.require("WithdrawBlock");

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import BigNumber from "bignumber.js";
chai.use(chaiAsPromised);
chai.should();

contract("RenExBalances", function (accounts: string[]) {

    let renExBalances, renExSettlement, rewardVault;
    let ETH, REN, TOKEN1, TOKEN2;

    beforeEach(async function () {
        ETH = { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" };
        REN = await RepublicToken.new();
        TOKEN1 = await RepublicToken.new();
        TOKEN2 = await RepublicToken.new();

        rewardVault = await DarknodeRewardVault.new(0x0);
        renExBalances = await RenExBalances.new(rewardVault.address);
        const GWEI = 1000000000;
        renExSettlement = await RenExSettlement.new(0x0, 0x0, renExBalances.address, 100 * GWEI, 0x0);
        await renExBalances.updateRenExSettlementContract(renExSettlement.address);
    });

    it("can update Reward Vault address", async () => {
        await renExBalances.updateRewardVault(0x0);
        (await renExBalances.rewardVaultContract()).should.equal("0x0000000000000000000000000000000000000000");
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

        // Give accounts[1] some tokens
        await TOKEN1.transfer(accounts[1], deposit2 * 2);

        // Get ERC20 balance for TOKEN1 and TOKEN2
        const previous1 = new BigNumber(await TOKEN1.balanceOf(accounts[0]));
        const previous2 = new BigNumber(await TOKEN1.balanceOf(accounts[1]));

        // Approve and deposit
        await TOKEN1.approve(renExBalances.address, deposit1, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit1, { from: accounts[0] });
        await TOKEN1.approve(renExBalances.address, deposit2, { from: accounts[1] });
        await renExBalances.deposit(TOKEN1.address, deposit2, { from: accounts[1] });

        // Check that balance in renExBalances is updated
        const { 0: tokens1, 1: balances1 } = await renExBalances.getBalances(accounts[0]);
        tokens1[0].should.equal(TOKEN1.address);
        balances1[0].toString().should.equal(deposit1.toFixed());

        const { 0: tokens2, 1: balances2 } = await renExBalances.getBalances(accounts[1]);
        tokens2[0].should.equal(TOKEN1.address);
        balances2[0].toString().should.equal(deposit2.toFixed());

        // Check that the correct amount of tokens has been withdrawn
        (await TOKEN1.balanceOf(accounts[0])).toString().should.equal(previous1.minus(deposit1).toFixed());
        (await TOKEN1.balanceOf(accounts[1])).toString().should.equal(previous2.minus(deposit2).toFixed());

        // Withdraw
        await renExBalances.withdraw(TOKEN1.address, deposit1, { from: accounts[0] });
        await renExBalances.withdraw(TOKEN1.address, deposit2, { from: accounts[1] });

        // Check that the tokens have been returned
        (await TOKEN1.balanceOf(accounts[0])).toString().should.equal(previous1.toFixed());
        (await TOKEN1.balanceOf(accounts[1])).toString().should.equal(previous2.toFixed());
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
        const fee1 = await getFee(renExBalances.deposit(ETH.address, deposit1, { from: accounts[0], value: deposit1 }));

        // Balance should be (previous - fee1 - deposit1)
        const after = (await web3.eth.getBalance(accounts[0]));
        after.toString().should.equal(previous.minus(fee1).minus(deposit1).toFixed());

        // Withdraw
        const fee2 = await getFee(renExBalances.withdraw(ETH.address, deposit1, { from: accounts[0] }));

        // Balance should be (previous - fee1 - fee2)
        (await web3.eth.getBalance(accounts[0])).should.equal(previous.minus(fee1).minus(fee2).toFixed());
    });

    it("only the settlement contract can call `incrementBalance` and `decrementBalance`", async () => {
        await renExBalances.incrementBalance(
            accounts[1],
            REN.address,
            1,
            { from: accounts[1] }
        ).should.be.rejectedWith(null, /not authorised/);

        await renExBalances.decrementBalanceWithFee(
            accounts[1],
            REN.address,
            0,
            0,
            accounts[1],
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

    it("the RenExSettlement contract can approve and reject withdrawals", async () => {
        const renExSettlementAlt = await WithdrawBlock.new();
        await renExBalances.updateRenExSettlementContract(renExSettlementAlt.address);

        const deposit = 10;
        await TOKEN1.approve(renExBalances.address, deposit, { from: accounts[0] });
        await renExBalances.deposit(TOKEN1.address, deposit, { from: accounts[0] });

        // Withdrawal should not go through
        await renExBalances.withdraw(TOKEN1.address, deposit, { from: accounts[0] })
            .should.be.rejectedWith(null, /withdraw blocked/);

        // Can withdraw after reverting settlement contract update
        await renExBalances.updateRenExSettlementContract(renExSettlement.address);
        await renExBalances.withdraw(TOKEN1.address, deposit, { from: accounts[0] });
    });

    it("decrementBalance reverts for invalid withdrawals", async () => {
        const auth = accounts[8];
        await renExBalances.updateRenExSettlementContract(auth);

        const deposit = 10;
        await renExBalances.deposit(ETH.address, deposit, { from: accounts[0], value: deposit });

        // Insufficient balance for fee
        await renExBalances.decrementBalanceWithFee(accounts[0], ETH.address, 0, 20, accounts[0], { from: auth })
            .should.be.rejectedWith(null, /insufficient funds for fee/);

        // Insufficient balance for fee
        await renExBalances.decrementBalanceWithFee(accounts[0], ETH.address, 20, 0, accounts[0], { from: auth })
            .should.be.rejectedWith(null, /insufficient funds/);

        // Revert change
        await renExBalances.updateRenExSettlementContract(renExSettlement.address);
    });
});

async function getFee(txP: any) { // TODO: Use web3 transaction type
    const tx = await txP;
    const gasAmount = new BigNumber(tx.receipt.gasUsed);
    const gasPrice = new BigNumber((await web3.eth.getTransaction(tx.tx)).gasPrice);
    return gasPrice.multipliedBy(gasAmount);
}