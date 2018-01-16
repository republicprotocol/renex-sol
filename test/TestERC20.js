var Token = artifacts.require("./TestERC20.sol");

contract("Token", function(accounts) {
	it("should return the initial balances", async function() {
		var token = await Token.deployed();
		var initial = 100000 * 10 ** 18;
		var owner_balance = (await token.balanceOf.call(accounts[0])).toNumber();
		var rest_balance = (await token.balanceOf.call(accounts[1])).toNumber();

		// Check for initial balances
		assert.equal(owner_balance, initial, "accounts[0] balance is incorrect");
		assert.equal(rest_balance, 0, "accounts[1] balance is incorrect");
	});

	it("should return the initial allowances", async function() {
		var token = await Token.deployed();
		var initial = (await token.allowance.call(accounts[0], accounts[1])).toNumber();
		assert.equal(initial, 0, "allowance is incorrect");
	});

	it("should transfer from one account to another", async function() {
		var token = await Token.deployed();
		var initial = (await token.balanceOf.call(accounts[0])).toNumber();
		var amount = 500 * 10 ** 18;
		// Transfer from accounts[0] to accounts[1]
		await token.transfer(accounts[1], amount, {from: accounts[0]});
		var sender_balance = (await token.balanceOf.call(accounts[0])).toNumber();
		var receiver_balance = (await token.balanceOf.call(accounts[1])).toNumber();
		assert.equal(sender_balance, initial - amount, "amount was not deducted from sender account");
		assert.equal(receiver_balance, amount, "amount was not added to receiver account");
	});

	it("should not allow transfer with insufficient funds", async function() {
		var token = await Token.deployed();
		var sender_initial = (await token.balanceOf.call(accounts[0])).toNumber();
		var receiver_initial = (await token.balanceOf.call(accounts[1])).toNumber();
		var amount = sender_initial * 2; // Transfer value greater than intiial amount

		// Try transferring with insufficient funds
		try {
			await token.transfer(accounts[1], amount, {from: accounts[0]});
		} catch(error) {
			var sender_final = (await token.balanceOf.call(accounts[0])).toNumber();
			var receiver_final = (await token.balanceOf.call(accounts[1])).toNumber();
			assert.equal(sender_final, sender_initial, "transfer was sent");
			assert.equal(receiver_final, receiver_final, "transfer was received");
		}
	});

	it("should transfer with allowance", async function() {
		var token = await Token.deployed();
		var sender_initial = (await token.balanceOf.call(accounts[0])).toNumber();
		var receiver_initial = (await token.balanceOf.call("0x8bc790a583789367f72c9c59678ff85a00a5e5d0")).toNumber();
		var amount = 500 * 10 ** 18;

		// First approve accounts[1] from accounts[0]
		await token.approve("0x8bc790a583789367f72c9c59678ff85a00a5e5d0", amount, {from: accounts[0]});
		var approval = (await token.allowance.call(accounts[0], "0x8bc790a583789367f72c9c59678ff85a00a5e5d0")).toNumber();
		assert.equal(approval, amount, "amount was not approved");
	});

	it("should not allow transfer without allowance", async function() {
		var token = await Token.deployed();
		var sender_initial = (await token.balanceOf.call(accounts[1])).toNumber();
		var receiver_initial = (await token.balanceOf.call(accounts[2])).toNumber();
		var amount = 500 * 10 ** 18;

		// Try transferring from accounts[1] to accounts[2] without allowance
		try {
			await token.transferFrom(accounts[1], accounts[2], amount, {from: accounts[0]});
		} catch(error) {
			var sender_final = (await token.balanceOf.call(accounts[1])).toNumber();
			var receiver_final = (await token.balanceOf.call(accounts[2])).toNumber();
			assert.equal(sender_final, sender_initial, "transfer was sent");
			assert.equal(receiver_final, receiver_final, "transfer was received");
		}
	});

	it("should not allow transfer of negative value", async function() {
		var token = await Token.deployed();
		var sender_initial = (await token.balanceOf.call(accounts[0])).toNumber();
		var receiver_initial = (await token.balanceOf.call(accounts[1])).toNumber();
		var amount = 500 * 10 ** 18;

		// Try transferring negative amount
		try {
			await token.transfer(accounts[1], amount);
		} catch(error) {
			// Check balance has not changed
			var sender_final = (await token.balanceOf.call(accounts[0])).toNumber();
			var receiver_final = (await token.balanceOf.call(accounts[1])).toNumber();
			assert.equal(sender_final, sender_initial, "transfer was sent");
			assert.equal(receiver_final, receiver_final, "transfer was received");
		}
	});

	it("should burn valid amount", async function() {
		var token = await Token.deployed();
		var initial = (await token.balanceOf.call(accounts[0])).toNumber();

		// Burn from accounts[0]'s balance
		await token.burn(initial, {from: accounts[0]});
		var balance = (await token.balanceOf.call(accounts[0])).toNumber();
		assert.equal(balance, 0, "balance was not burned");
	});

	it("should not allow burn without allowance", async function() {
		var token = await Token.deployed();
		var initial = (await token.balanceOf.call(accounts[1])).toNumber();
		var amount = 500 * 10 ** 18;

		// Try burning accounts[1]'s balance without allowance
		try {
			await token.burnFrom(accounts[1], amount);
		} catch(error) {
			// Check accounts[1]'s balance has not changed
			var balance = (await token.balanceOf.call(accounts[1])).toNumber();
			assert.equal(balance, initial, "balance was burned");
		}
	});

	it("should not burn negative amount", async function() {
		var token = await Token.deployed();
		var initial = (await token.balanceOf.call(accounts[0])).toNumber();

		// Try burning negative amount
		try {
			await token.burn(initial * -1);
		} catch(error) {
			// Check accounts[0]'s balance has not changed
			var balance = (await token.balanceOf.call(accounts[0])).toNumber();
			assert.equal(balance, initial, "negative amount was burned");
		}
	});
});