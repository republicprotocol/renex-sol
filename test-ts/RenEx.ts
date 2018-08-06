const RenExBalances = artifacts.require("RenExBalances");
const RenExSettlement = artifacts.require("RenExSettlement");
const Orderbook = artifacts.require("Orderbook");
const RepublicToken = artifacts.require("RepublicToken");
const DarknodeRegistry = artifacts.require("DarknodeRegistry");
const DGXMock = artifacts.require("DGXMock");
const RenExTokens = artifacts.require("RenExTokens");

import * as testUtils from "./helper/testUtils";
import { TokenCodes, market } from "./helper/testUtils";
import { settleOrders } from "./helper/settleOrders";

contract("RenEx", function (accounts: string[]) {

    const buyer = accounts[0];
    const seller = accounts[1];
    let details;

    const DGXREN = market(TokenCodes.DGX, TokenCodes.REN);
    const ETHREN = market(TokenCodes.ETH, TokenCodes.REN);

    before(async function () {
        const ren = await RepublicToken.deployed();
        const tokenAddresses = {
            [TokenCodes.BTC]: testUtils.MockBTC,
            [TokenCodes.ETH]: testUtils.MockETH,
            [TokenCodes.LTC]: testUtils.MockBTC,
            [TokenCodes.DGX]: await DGXMock.deployed(),
            [TokenCodes.REN]: ren,
        };

        let dnr = await DarknodeRegistry.deployed();
        const orderbook = await Orderbook.deployed();
        // darknodeRewardVault = await DarknodeRewardVault.deployed();
        const renExSettlement = await RenExSettlement.deployed();
        const renExBalances = await RenExBalances.deployed();

        const renExTokens = await RenExTokens.deployed();
        renExTokens.registerToken(
            TokenCodes.LTC,
            tokenAddresses[TokenCodes.LTC].address,
            await tokenAddresses[TokenCodes.LTC].decimals()
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
        const buy = { tokens: DGXREN, price: 1, volume: 2 /* REN */, minimumVolume: 1 /* REN */ };
        const sell = { tokens: DGXREN, price: 0.95, volume: 1 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.975 /* DGX */, 1 /* REN */]);
    });

    it("order 2", async () => {
        const buy = { tokens: DGXREN, price: 1, volume: 1.025641025641 /* REN */ };
        const sell = { tokens: DGXREN, price: 0.95, volume: 1.025641025641 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.999999999 /* DGX */, 1.025641025641 /* REN */]);
    });

    it("order 3", async () => {
        const buy = { tokens: DGXREN, price: 0.5, volume: 4 /* REN */ };
        const sell = { tokens: DGXREN, price: 0.5, volume: 2 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([1 /* DGX */, 2 /* REN */]);
    });

    it("order 4", async () => {
        const buy = { tokens: DGXREN, price: 1, volume: 1.9999999999 /* REN */ };
        // More precise than the number of decimals DGX has
        const sell = { tokens: DGXREN, price: 0.0000000001, volume: 1.9999999999 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([1 /* DGX */, 1.9999999999 /* REN */]);
    });

    it("order 5", async () => {
        const buy = { tokens: DGXREN, price: 999.5, volume: 0.002001501126 /* REN */ };
        const sell = { tokens: DGXREN, price: 999, volume: 0.002001501126 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([2 /* DGX */, 0.002001501126 /* REN */]);
    });

    it("order 6", async () => {
        const buy = { tokens: ETHREN, price: 99950000, volume: "2.001e-9" /* REN */ };
        const sell = { tokens: ETHREN, price: 99950000, volume: "2.001e-9" /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.19999995 /* ETH */, 2.001e-9 /* REN */]);
    });

    it("order 7", async () => {
        // Prices are at lowest precision possible, and midprice is even more
        // precise. If the midprice is rounded, this test will fail.
        const buy = { tokens: ETHREN, price: 0.000000000002, volume: 1 /* REN */ };
        const sell = { tokens: ETHREN, price: 0.000000000001, volume: 1 /* REN */ };

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

        tokens = market(TokenCodes.BTC, TokenCodes.LTC);
        buy = { settlement: 2, tokens, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* LTC */ };
        sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* LTC */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.975 /* BTC */, 1 /* LTC */]);
    });

    it("invalid orders should revert", async () => {
        const tokens = DGXREN;

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

        // Orders opened by the same trader
        buy = { tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { tokens, price: 0.95, volume: 1 /* REN */, trader: buyer };
        await settleOrders.apply(this, [buy, sell, ...details])
            .should.be.rejectedWith(null, /orders from same trader/);

        // Invalid tokens
        const RENDGX = market(TokenCodes.REN, TokenCodes.DGX);
        buy = { tokens: RENDGX, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { tokens: RENDGX, price: 0.95, volume: 1 /* REN */ };
        await settleOrders.apply(this, [buy, sell, ...details])
            .should.be.rejectedWith(null, /first order is not a buy/);

        // Unsupported settlement
        buy = { settlement: 3, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        sell = { settlement: 3, tokens, price: 0.95, volume: 1 /* REN */ };

        await settleOrders.apply(this, [buy, sell, ...details])
            .should.be.rejectedWith(null, /invalid settlement id/);
    });
});
