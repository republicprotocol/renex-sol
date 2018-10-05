import { BN } from "bn.js";

import * as testUtils from "./helper/testUtils";

import { settleOrders } from "./helper/settleOrders";
import { market, TOKEN_CODES } from "./helper/testUtils";

import { DGXTokenArtifact } from "./bindings/d_g_x_token";
import { DarknodeRegistryArtifact, DarknodeRegistryContract } from "./bindings/darknode_registry";
import { OrderbookArtifact, OrderbookContract } from "./bindings/orderbook";
import { RenExBalancesArtifact, RenExBalancesContract } from "./bindings/ren_ex_balances";
import { RenExBrokerVerifierArtifact, RenExBrokerVerifierContract } from "./bindings/ren_ex_broker_verifier";
import { RenExSettlementArtifact, RenExSettlementContract } from "./bindings/ren_ex_settlement";
import { RenExTokensArtifact, RenExTokensContract } from "./bindings/ren_ex_tokens";
import { RepublicTokenArtifact } from "./bindings/republic_token";

const RepublicToken = artifacts.require("RepublicToken") as RepublicTokenArtifact;
const DGXToken = artifacts.require("DGXToken") as DGXTokenArtifact;
const DarknodeRegistry = artifacts.require("DarknodeRegistry") as DarknodeRegistryArtifact;
const Orderbook = artifacts.require("Orderbook") as OrderbookArtifact;
const RenExSettlement = artifacts.require("RenExSettlement") as RenExSettlementArtifact;
const RenExBalances = artifacts.require("RenExBalances") as RenExBalancesArtifact;
const RenExTokens = artifacts.require("RenExTokens") as RenExTokensArtifact;
const RenExBrokerVerifier = artifacts.require("RenExBrokerVerifier") as RenExBrokerVerifierArtifact;

contract("Atomic Bond Slashing", function (accounts: string[]) {

    const slasher = accounts[0];
    const buyer = accounts[1];
    const seller = accounts[2];
    const darknode = accounts[3];
    const broker = accounts[4];

    let dnr: DarknodeRegistryContract;
    let orderbook: OrderbookContract;
    let renExSettlement: RenExSettlementContract;
    let renExBalances: RenExBalancesContract;
    let renExTokens: RenExTokensContract;
    let renExBrokerVerifier: RenExBrokerVerifierContract;
    let eth_address: string;
    let details: any[];

    before(async function () {
        const ren = await RepublicToken.deployed();

        const tokenInstances = new Map<number, testUtils.BasicERC20>()
            .set(TOKEN_CODES.BTC, testUtils.MockBTC)
            .set(TOKEN_CODES.ETH, testUtils.MockETH)
            .set(TOKEN_CODES.ALTBTC, testUtils.MockBTC)
            .set(TOKEN_CODES.DGX, await DGXToken.deployed())
            .set(TOKEN_CODES.REN, ren);

        dnr = await DarknodeRegistry.deployed();
        orderbook = await Orderbook.deployed();
        renExSettlement = await RenExSettlement.deployed();
        renExBalances = await RenExBalances.deployed();
        // Register extra token
        renExTokens = await RenExTokens.deployed();
        renExTokens.registerToken(
            TOKEN_CODES.ALTBTC,
            tokenInstances.get(TOKEN_CODES.ALTBTC).address,
            new BN(await tokenInstances.get(TOKEN_CODES.ALTBTC).decimals())
        );

        // Register darknode
        await ren.transfer(darknode, testUtils.MINIMUM_BOND);
        await ren.approve(dnr.address, testUtils.MINIMUM_BOND, { from: darknode });
        await dnr.register(darknode, testUtils.PUBK("1"), testUtils.MINIMUM_BOND, { from: darknode });
        await testUtils.waitForEpoch(dnr);

        // Register broker
        renExBrokerVerifier = await RenExBrokerVerifier.deployed();
        await renExBrokerVerifier.registerBroker(broker);

        await renExSettlement.updateSlasher(slasher);

        eth_address = tokenInstances.get(TOKEN_CODES.ETH).address;

        details = [
            buyer, seller, darknode, broker, renExSettlement, renExBalances,
            tokenInstances, orderbook, renExBrokerVerifier, true,
        ];
    });

    it("should correctly relocate fees", async () => {
        const tokens = market(TOKEN_CODES.BTC, TOKEN_CODES.ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* ETH */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ETH */ };

        let [btcAmount, ethAmount, buyOrderID, _] = await settleOrders.apply(this, [buy, sell, ...details]);
        btcAmount.should.equal(0.975 /* BTC */);
        ethAmount.should.equal(1 /* ETH */);

        let guiltyOrderID = buyOrderID;
        let guiltyAddress = buyer;
        let innocentAddress = seller;

        let feeNum = new BN(await renExSettlement.DARKNODE_FEES_NUMERATOR());
        let feeDen = new BN(await renExSettlement.DARKNODE_FEES_DENOMINATOR());
        let fees = new BN(web3.utils.toWei(feeNum, "ether")).div(feeDen);

        // Store the original balances
        let beforeBurntBalance = new BN(await renExBalances.traderBalances(slasher, eth_address));
        let beforeGuiltyBalance = new BN(await renExBalances.traderBalances(guiltyAddress, eth_address));
        let beforeInnocentBalance = new BN(await renExBalances.traderBalances(innocentAddress, eth_address));

        // Slash the fees
        await renExSettlement.slash(guiltyOrderID, { from: slasher });

        // Check the new balances
        let afterBurntBalance = new BN(await renExBalances.traderBalances(slasher, eth_address));
        let afterGuiltyBalance = new BN(await renExBalances.traderBalances(guiltyAddress, eth_address));
        let afterInnocentBalance = new BN(await renExBalances.traderBalances(innocentAddress, eth_address));

        // Make sure fees were reallocated correctly
        let burntBalanceDiff = afterBurntBalance.sub(beforeBurntBalance);
        let innocentBalanceDiff = afterInnocentBalance.sub(beforeInnocentBalance);
        let guiltyBalanceDiff = afterGuiltyBalance.sub(beforeGuiltyBalance);
        // We expect the slasher to have gained fees

        burntBalanceDiff.should.bignumber.equal(fees);
        // We expect the innocent trader to have gained fees
        innocentBalanceDiff.should.bignumber.equal(fees);
        // We expect the guilty trader to have lost fees twice
        guiltyBalanceDiff.should.bignumber.equal(-fees * 2);

        // Withdraw fees and check new ETH balance
        const beforeEthBalance = new BN(await web3.eth.getBalance(slasher));
        let sig = await testUtils.signWithdrawal(renExBrokerVerifier, broker, accounts[0]);
        const gasFee = await testUtils.getFee(renExBalances.withdraw(eth_address, afterBurntBalance, sig));
        const afterEthBalance = new BN(await web3.eth.getBalance(slasher));
        afterEthBalance.should.bignumber.equal(beforeEthBalance.sub(gasFee).add(fees));
    });

    it("should not slash bonds more than once", async () => {
        const tokens = market(TOKEN_CODES.BTC, TOKEN_CODES.ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* ETH */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ETH */ };

        let [, , buyOrderID, sellOrderID] = await settleOrders.apply(this, [buy, sell, ...details]);

        // Slash the fees
        await renExSettlement.slash(sellOrderID, { from: slasher });

        await renExSettlement.slash(sellOrderID, { from: slasher })
            .should.be.rejectedWith(null, /invalid order status/); // already slashed

        await renExSettlement.slash(buyOrderID, { from: slasher })
            .should.be.rejectedWith(null, /invalid order status/); // already slashed
    });

    it("should handle orders if ETH is the low token", async () => {
        const tokens = market(TOKEN_CODES.ETH, TOKEN_CODES.ALTBTC);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* ETH */, minimumVolume: 1 /* ALTBTC */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ALTBTC */ };

        let [, , buyOrderID, _] = await settleOrders.apply(this, [buy, sell, ...details]);

        // Slash the fees
        await renExSettlement.slash(buyOrderID, { from: slasher })
            .should.not.be.rejected;
    });

    it("should not slash non-atomic swap orders", async () => {
        const tokens = market(TOKEN_CODES.ETH, TOKEN_CODES.REN);
        // Highest possible price, lowest possible volume
        const buy = { tokens, price: 1, volume: 2 /* DGX */ };
        const sell = { tokens, price: 0.95, volume: 1 /* REN */ };

        let [, , guiltyOrderID, _] = await settleOrders.apply(this, [buy, sell, ...details]);

        await renExSettlement.slash(guiltyOrderID, { from: slasher })
            .should.be.rejectedWith(null, /slashing non-atomic trade/);
    });

    it("should not slash if unauthorized to do so", async () => {
        const tokens = market(TOKEN_CODES.BTC, TOKEN_CODES.ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* ETH */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ETH */ };

        let [, , buyOrderID, sellOrderID] = await settleOrders.apply(this, [buy, sell, ...details]);
        let guiltyTrader = buyer;
        let innocentTrader = seller;

        // The guilty trader might try to dog the innocent trader
        await renExSettlement.slash(sellOrderID, { from: guiltyTrader })
            .should.be.rejectedWith(null, /unauthorized/);

        // The innocent trader might try to dog the guilty trader
        await renExSettlement.slash(buyOrderID, { from: innocentTrader })
            .should.be.rejectedWith(null, /unauthorized/);
    });
});
