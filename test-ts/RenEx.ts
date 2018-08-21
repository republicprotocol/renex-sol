import * as testUtils from "./helper/testUtils";
import { TokenCodes, market } from "./helper/testUtils";
import { settleOrders } from "./helper/settleOrders";
import { DarknodeRegistryContract } from "./bindings/darknode_registry";
import { OrderbookContract } from "./bindings/orderbook";
import { RenExSettlementContract } from "./bindings/ren_ex_settlement";
import { RenExBalancesContract } from "./bindings/ren_ex_balances";
import { RenExTokensContract } from "./bindings/ren_ex_tokens";
import { PreciseTokenContract } from "./bindings/precise_token";
import { RepublicTokenContract } from "./bindings/republic_token";
import { BN } from "bn.js";

contract("RenEx", function (accounts: string[]) {

    const buyer = accounts[0];
    const seller = accounts[1];
    let details;
    const VPT = 0x3;

    const DGX_REN = market(TokenCodes.DGX, TokenCodes.REN);
    const ETH_REN = market(TokenCodes.ETH, TokenCodes.REN);
    const ETH_VPT = market(TokenCodes.ETH, VPT);

    before(async function () {
        const dnr: DarknodeRegistryContract = await artifacts.require("DarknodeRegistry").deployed();
        const orderbook: OrderbookContract = await artifacts.require("Orderbook").deployed();
        // darknodeRewardVault = await artifacts.require("DarknodeRewardVault").deployed();
        const renExSettlement: RenExSettlementContract = await artifacts.require("RenExSettlement").deployed();
        const renExBalances: RenExBalancesContract = await artifacts.require("RenExBalances").deployed();
        const renExTokens: RenExTokensContract = await artifacts.require("RenExTokens").deployed();

        // PriceToken
        const preciseToken: PreciseTokenContract = await artifacts.require("PreciseToken").new();

        const ren: RepublicTokenContract = await artifacts.require("RepublicToken").deployed();
        const tokenAddresses = {
            [TokenCodes.BTC]: testUtils.MockBTC,
            [TokenCodes.ETH]: testUtils.MockETH,
            [TokenCodes.LTC]: testUtils.MockBTC,
            [TokenCodes.DGX]: await artifacts.require("DGXMock").deployed(),
            [TokenCodes.REN]: ren,
            [VPT]: preciseToken,
        };

        // Register LTC
        await renExTokens.registerToken(
            TokenCodes.LTC,
            tokenAddresses[TokenCodes.LTC].address,
            await tokenAddresses[TokenCodes.LTC].decimals()
        );

        // Register VPT
        await renExTokens.registerToken(
            VPT, tokenAddresses[VPT].address,
            new BN(await tokenAddresses[VPT].decimals())
        );

        // Register darknode
        const darknode = accounts[2];
        await ren.transfer(darknode, testUtils.MINIMUM_BOND);
        await ren.approve(dnr.address, testUtils.MINIMUM_BOND, { from: darknode });
        await dnr.register(darknode, testUtils.PUBK("1"), testUtils.MINIMUM_BOND, { from: darknode });
        await testUtils.waitForEpoch(dnr);

        const broker = accounts[3];

        details = [buyer, seller, darknode, broker, renExSettlement, renExBalances, tokenAddresses, orderbook];
    });

    it("order 1", async () => {
        const buy = { tokens: DGX_REN, price: 1, volume: 2 /* REN */, minimumVolume: 1 /* REN */ };
        const sell = { tokens: DGX_REN, price: 0.95, volume: 1 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.975 /* DGX */, 1 /* REN */]);
    });

    it("order 2", async () => {
        const buy = { tokens: DGX_REN, price: 1, volume: 1.025641025641 /* REN */ };
        const sell = { tokens: DGX_REN, price: 0.95, volume: 1.025641025641 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.999999999 /* DGX */, 1.025641025641 /* REN */]);
    });

    it("order 3", async () => {
        const buy = { tokens: DGX_REN, price: 0.5, volume: 4 /* REN */ };
        const sell = { tokens: DGX_REN, price: 0.5, volume: 2 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([1 /* DGX */, 2 /* REN */]);
    });

    it("order 4", async () => {
        const buy = { tokens: DGX_REN, price: 1, volume: 1.9999999999 /* REN */ };
        // More precise than the number of decimals DGX has
        const sell = { tokens: DGX_REN, price: 0.0000000001, volume: 1.9999999999 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([1 /* DGX */, 1.9999999999 /* REN */]);
    });

    it("order 5", async () => {
        const buy = { tokens: DGX_REN, price: 999.5, volume: 0.002001501126 /* REN */ };
        const sell = { tokens: DGX_REN, price: 999, volume: 0.002001501126 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([2 /* DGX */, 0.002001501126 /* REN */]);
    });

    it("order 6", async () => {
        const buy = { tokens: ETH_REN, price: 99950000, volume: "2.001e-9" /* REN */ };
        const sell = { tokens: ETH_REN, price: 99950000, volume: "2.001e-9" /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.19999995 /* ETH */, 2.001e-9 /* REN */]);
    });

    it("order 7", async () => {
        // Prices are at lowest precision possible, and mid-price is even more
        // precise. If the mid-price is rounded, this test will fail.
        const buy = { tokens: ETH_REN, price: 0.000000000002, volume: 1 /* REN */ };
        const sell = { tokens: ETH_REN, price: 0.000000000001, volume: 1 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([1.5e-12 /* ETH */, 1 /* REN */]);
    });

    it("atomic swap", async () => {
        const tokens = market(TokenCodes.BTC, TokenCodes.ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.975 /* DGX */, 1 /* REN */]);
    });

    it("atomic fees are paid in ethereum-based token", async () => {
        let tokens = market(TokenCodes.ETH, TokenCodes.LTC);
        let buy = { settlement: 2, tokens, price: 1, volume: 2 /* ETH */, minimumVolume: 1 /* LTC */ };
        let sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* LTC */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.975 /* ETH */, 1 /* LTC */]);
    });

    it("invalid orders should revert", async () => {
        const tokens = DGX_REN;

        // Seller volume too low
        let buy: any = { tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 2 /* REN */ };
        let sell: any = { tokens, price: 1, volume: 1 /* REN */ };
        await settleOrders.apply(this, [buy, sell, ...details])
            .should.be.rejectedWith(null, /incompatible orders/);

        // Buyer volume too low
        buy = { tokens, price: 1, volume: 1 /* DGX */ };
        sell = { tokens, price: 1, volume: 2 /* REN */, minimumVolume: 2 /* REN */ };
        await settleOrders.apply(this, [buy, sell, ...details])
            .should.be.rejectedWith(null, /incompatible orders/);

        // Prices don't match
        buy = { tokens, price: 1, volume: 1 /* DGX */ };
        sell = { tokens, price: 1.05, volume: 1 /* REN */, minimumVolume: 1 /* DGX */ };
        await settleOrders.apply(this, [buy, sell, ...details])
            .should.be.rejectedWith(null, /incompatible orders/);

        // Invalid tokens (should be DGX/REN, not REN/DGX)
        const REN_DGX = market(TokenCodes.REN, TokenCodes.DGX);
        buy = { tokens: REN_DGX, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { tokens: REN_DGX, price: 0.95, volume: 1 /* REN */ };
        await settleOrders.apply(this, [buy, sell, ...details])
            .should.be.rejectedWith(null, /incompatible orders/);

        // Orders opened by the same trader
        buy = { tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { tokens, price: 0.95, volume: 1 /* REN */, trader: buyer };
        await settleOrders.apply(this, [buy, sell, ...details])
            .should.be.rejectedWith(null, /orders from same trader/);

        // Unsupported settlement
        buy = { settlement: 3, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { settlement: 3, tokens, price: 0.95, volume: 1 /* REN */ };

        await settleOrders.apply(this, [buy, sell, ...details])
            .should.be.rejectedWith(null, /invalid settlement id/);

        // Token with too many decimals
        buy = { tokens: ETH_VPT, price: 1e-12, volume: 1e-12 /* VPT */ };
        sell = { tokens: ETH_VPT, price: 1e-12, volume: 1e-12 /* VPT */ };

        await settleOrders.apply(this, [buy, sell, ...details])
            .should.be.rejectedWith(null, /invalid opcode/);

        const BTC_LTC = market(TokenCodes.BTC, TokenCodes.LTC);
        buy = { settlement: 2, tokens: BTC_LTC, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* LTC */ };
        sell = { settlement: 2, tokens: BTC_LTC, price: 0.95, volume: 1 /* LTC */ };

        await settleOrders.apply(this, [buy, sell, ...details])
            .should.be.rejectedWith(null, /non-eth atomic swaps are not supported/);

    });
});
