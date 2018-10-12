/*

These tokens are for testing that the RenEx contracts are compatible with a wide variety of token contracts.

*/

import * as testUtils from "./helper/testUtils";

import { settleOrders } from "./helper/settleOrders";
import { market, TOKEN_CODES } from "./helper/testUtils";

import { DarknodeRegistryContract } from "./bindings/darknode_registry";
import { OrderbookContract } from "./bindings/orderbook";
import { RenExBalancesContract } from "./bindings/ren_ex_balances";
import { RenExBrokerVerifierContract } from "./bindings/ren_ex_broker_verifier";
import { RenExSettlementContract } from "./bindings/ren_ex_settlement";
import { RepublicTokenContract } from "./bindings/republic_token";

const {
    DarknodeRegistry,
    Orderbook,
    RenExSettlement,
    RenExBalances,
    RepublicToken,
    RenExBrokerVerifier,

    OMGToken,
    ZRXToken,
    TUSDToken,
} = testUtils.contracts;

contract("Top Tokens", function (accounts: string[]) {

    const buyer = accounts[0];
    const seller = accounts[1];
    let details: any[];

    const ETH_TUSD = market(TOKEN_CODES.ETH, TOKEN_CODES.TUSD);
    const ETH_ZRX = market(TOKEN_CODES.ETH, TOKEN_CODES.ZRX);
    const ETH_OMG = market(TOKEN_CODES.ETH, TOKEN_CODES.OMG);

    before(async function () {
        const dnr: DarknodeRegistryContract = await DarknodeRegistry.deployed();
        const orderbook: OrderbookContract = await Orderbook.deployed();
        const renExSettlement: RenExSettlementContract = await RenExSettlement.deployed();
        const renExBalances: RenExBalancesContract = await RenExBalances.deployed();

        const ren: RepublicTokenContract = await RepublicToken.deployed();
        const tokenAddresses = new Map<number, testUtils.BasicERC20>()
            .set(TOKEN_CODES.ETH, testUtils.MockETH)
            .set(TOKEN_CODES.REN, ren)
            .set(TOKEN_CODES.TUSD, await TUSDToken.deployed())
            .set(TOKEN_CODES.ZRX, await ZRXToken.deployed())
            .set(TOKEN_CODES.OMG, await OMGToken.deployed())
            ;

        // Register darknode
        const darknode = accounts[2];
        await ren.transfer(darknode, testUtils.minimumBond);
        await ren.approve(dnr.address, testUtils.minimumBond, { from: darknode });
        await dnr.register(darknode, testUtils.PUBK("1"), { from: darknode });
        await testUtils.waitForEpoch(dnr);

        const broker = accounts[3];

        // Register broker
        const renExBrokerVerifier: RenExBrokerVerifierContract =
            await RenExBrokerVerifier.deployed();
        await renExBrokerVerifier.registerBroker(broker);

        details = [
            buyer, seller, darknode, broker, renExSettlement, renExBalances,
            tokenAddresses, orderbook, renExBrokerVerifier,
        ];
    });

    it("TUSD", async () => {
        const buy = { tokens: ETH_TUSD, price: 0.00513832, volume: 195 /* TUSD */ };
        const sell = { tokens: ETH_TUSD, price: 0.00513832, volume: 195 /* TUSD */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([1.0019724 /* ETH */, 195 /* TUSD */]);
    });

    it("ZRX", async () => {
        const buy = { tokens: ETH_ZRX, price: 0.00261046, volume: 384 /* ZRX */ };
        const sell = { tokens: ETH_ZRX, price: 0.00261046, volume: 384 /* ZRX */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([1.00241664 /* ETH */, 384 /* ZRX */]);
    });

    it("OMG", async () => {
        const buy = { tokens: ETH_OMG, price: 0.01574430, volume: 64 /* OMG */ };
        const sell = { tokens: ETH_OMG, price: 0.01574430, volume: 64 /* OMG */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([1.0076352 /* ETH */, 64 /* OMG */]);
    });

});
