const RenExTokens = artifacts.require("RenExTokens");
const RenExBalances = artifacts.require("RenExBalances");
const RenExSettlement = artifacts.require("RenExSettlement");
const RewardVault = artifacts.require("RewardVault");
const Orderbook = artifacts.require("Orderbook");
const RepublicToken = artifacts.require("RepublicToken");
const DarknodeRegistry = artifacts.require("DarknodeRegistry");
const BitcoinMock = artifacts.require("BitcoinMock");
const DGXMock = artifacts.require("DGXMock");

const BigNumber = require("bignumber.js");

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
chai.should();

const GWEI = 1000000000;

contract("RenExSettlement", function (accounts) {

    const darknode = accounts[2];
    const broker = accounts[3];
    let tokenAddresses, orderbook, renExSettlement, renExBalances, renExTokens;
    let buyID_1, sellID_1;
    let buyID_2, sellID_2;
    let buyID_3;

    before(async function () {
        [tokenAddresses, orderbook, renExSettlement, renExBalances, renExTokens] = await setup(darknode, broker);

        buyID_1 = "0x309a5df8e76da11abee911c97709a9b891dce6d2694d3161b59f36fe8529cbc0";
        await orderbook.openBuyOrder("0x32d455737ebe67b1ac9da90cd1095efa9761273e609462f04fca158a179498744ec86813f55462e600ecdb267f1f7ce0b1d31e12bc5bae1038f1f83b8196e8ff01", buyID_1, { from: broker });
        sellID_1 = "0x552f5b31734e6acf2f7808cd8b1be9bb61d33c216a106e1e91bb5fdb220108e0";
        await orderbook.openSellOrder("0x08d0731acb2d9e0bc6cd426c44d4b04775b2f467bfa9efcda1a508acb67308b41579bbbd4cf79aa15f02f52a58d11a429a9726d6c4a2fafc601a32f7f541268300", sellID_1, { from: broker });
        await orderbook.confirmOrder(buyID_1, [sellID_1], { from: darknode });

        buyID_2 = "0x9f04727e60fb1cf26bbb5e899df82ba24f191fb2b5ae4e864bb54aa1efa9e667";
        await orderbook.openBuyOrder("0xd2f07c5ed1dac9500066844fe89b9a57882004f72be216624090ce5570eb8cdf6f261d8ce518e6625872739074ae722d701e09be0fca565f1c9f7d079283e9b601", buyID_2, { from: broker });
        sellID_2 = "0x74bc6713b59b03a9037f267cbecfa202729c249eba6cf0767870d6c6c33e0148";
        await orderbook.openSellOrder("0xd9b460b2553f5f9404578167f817ad0edfa0efbe5a7a46ebdeeecef77a246153616483186300ecdf61bcccde90f0626ac3e18a868cac38435849ee5c24661fc800", sellID_2, { from: broker });
        await orderbook.confirmOrder(buyID_2, [sellID_2], { from: darknode });

        buyID_3 = "0xfdfe3a9515260199d49d82619f02f144be694e0daf04b1372525f4d623a4f7dd";
        await orderbook.openBuyOrder("0x8c3600cecec60ad3d6fef0eaccdff07afc23ae1403852124a774142bb8d61df80489708bd0988a3c7d0b0ddc4c7b2b0ded7afc0f0baca83bfe41b86531f048f801", buyID_3, { from: broker });
    });

    it("can update orderbook", async () => {
        await renExSettlement.updateOrderbook(0x0);
        (await renExSettlement.orderbookContract()).should.equal("0x0000000000000000000000000000000000000000");
        await renExSettlement.updateOrderbook(orderbook.address, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner
        await renExSettlement.updateOrderbook(orderbook.address);
        (await renExSettlement.orderbookContract()).should.equal(orderbook.address);
    })

    it("can update renex balances", async () => {
        await renExSettlement.updateRenExBalances(0x0);
        (await renExSettlement.renExBalancesContract()).should.equal("0x0000000000000000000000000000000000000000");
        await renExSettlement.updateRenExBalances(renExBalances.address, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner
        await renExSettlement.updateRenExBalances(renExBalances.address);
        (await renExSettlement.renExBalancesContract()).should.equal(renExBalances.address);
    })

    it("can update submission gas price limit", async () => {
        await renExSettlement.updateSubmissionGasPriceLimit(0x0);
        (await renExSettlement.submissionGasPriceLimit()).should.equal("0");
        await renExSettlement.updateSubmissionGasPriceLimit(100 * GWEI, { from: accounts[1] })
            .should.be.rejectedWith(null, /revert/); // not owner
        await renExSettlement.updateSubmissionGasPriceLimit(100 * GWEI);
        (await renExSettlement.submissionGasPriceLimit()).should.equal((100 * GWEI).toString());
    })

    it("submitOrder", async () => {
        // sellID_1?
        await renExSettlement.submitOrder(
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x000000000000000000000000000000000000000000000000000000005b2a43a2",
            "0x0000000000000000000000000000000000000000000000000000000100010001",
            "0x00000000000000000000000000000000000000000000000000000000000000e6",
            "0x0000000000000000000000000000000000000000000000000000000000000023",
            "0x0000000000000000000000000000000000000000000000000000000000000005",
            "0x000000000000000000000000000000000000000000000000000000000000000f",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x8d981922c65b85a257f457ba3c29831aa4c3b1bd45dc3b280590fd5c89c69dc2",
        );

        // buyID_1?
        await renExSettlement.submitOrder(
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000000000000000000000005b2ae1b5",
            "0x0000000000000000000000000000000000000000000000000000000100010001",
            "0x00000000000000000000000000000000000000000000000000000000000000eb",
            "0x0000000000000000000000000000000000000000000000000000000000000023",
            "0x000000000000000000000000000000000000000000000000000000000000000a",
            "0x000000000000000000000000000000000000000000000000000000000000000b",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x242efbba437ce0c8b22392130c3f688ca01492792a3a04899d66dce0ffa31b72",
        );

        // sellID_2?
        await renExSettlement.submitOrder(
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x000000000000000000000000000000000000000000000000000000005b298e47",
            "0x0000000000000000000000000000000000000000000000000000000100000100",
            "0x0000000000000000000000000000000000000000000000000000000000000640",
            "0x0000000000000000000000000000000000000000000000000000000000000024",
            "0x0000000000000000000000000000000000000000000000000000000000000007",
            "0x000000000000000000000000000000000000000000000000000000000000000d",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0xccd3dd4361d50a9df13af30388e2574b5e9e875c638bdfd15efb47395686ac3d",
        );

        // buyID_2?
        await renExSettlement.submitOrder(
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000000000000000000000005b2a2706",
            "0x0000000000000000000000000000000000000000000000000000000100000100",
            "0x0000000000000000000000000000000000000000000000000000000000000653",
            "0x0000000000000000000000000000000000000000000000000000000000000024",
            "0x0000000000000000000000000000000000000000000000000000000000000019",
            "0x000000000000000000000000000000000000000000000000000000000000000b",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x799f3c0f186049d0e59e51bd145d23b30a6a7657ef591ce345ab6f89ef9cbad7",
        );
    });

    it("submitOrder (rejected)", async () => {
        // Can't submit order twice:
        await renExSettlement.submitOrder(
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000000000000000000000005b2ae1b5",
            "0x0000000000000000000000000000000000000000000000000000000100010001",
            "0x00000000000000000000000000000000000000000000000000000000000000eb",
            "0x0000000000000000000000000000000000000000000000000000000000000023",
            "0x000000000000000000000000000000000000000000000000000000000000000a",
            "0x000000000000000000000000000000000000000000000000000000000000000b",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x242efbba437ce0c8b22392130c3f688ca01492792a3a04899d66dce0ffa31b72",
        ).should.be.rejectedWith(null, /order already submitted/);

        // Can't submit order that's not in orderbook (different timestamp):
        await renExSettlement.submitOrder(
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000000000000000000000005b2ae1b6",
            "0x0000000000000000000000000000000000000000000000000000000100010001",
            "0x00000000000000000000000000000000000000000000000000000000000000eb",
            "0x0000000000000000000000000000000000000000000000000000000000000023",
            "0x000000000000000000000000000000000000000000000000000000000000000a",
            "0x000000000000000000000000000000000000000000000000000000000000000b",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x242efbba437ce0c8b22392130c3f688ca01492792a3a04899d66dce0ffa31b72",
        ).should.be.rejectedWith(null, /uncofirmed order/);

        // Can't submit order that's not confirmed
        await renExSettlement.submitOrder(
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000000000000000000000005b29a423",
            "0x0000000000000000000000000000000000000000000000000000000100010000",
            "0x0000000000000000000000000000000000000000000000000000000000000140",
            "0x0000000000000000000000000000000000000000000000000000000000000022",
            "0x0000000000000000000000000000000000000000000000000000000000000005",
            "0x000000000000000000000000000000000000000000000000000000000000000c",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0a9e48cc69067083dabadb12d0ffeda12e1e9a014f9b3ad0277157f5d0b9d7e2",
        ).should.be.rejectedWith(null, /uncofirmed order/);
    });

    // it("verifyOrder", async () => {
    //     // await settlementTest.verifyOrder(buyID_1.replace("a", "b"))
    //     //     .should.be.rejectedWith(null, /revert/); //
    //     // await settlementTest.verifyOrder(sellID_1.replace("a", "b"))
    //     //     .should.be.rejectedWith(null, /revert/); //
    // });

    it("submitMatch", async () => {
        await renExSettlement.submitMatch(
            randomID(),
            sellID_1,
        ).should.be.rejectedWith(null, /invalid buy status/);

        await renExSettlement.submitMatch(
            buyID_1,
            randomID(),
        ).should.be.rejectedWith(null, /invalid sell status/);

        // Two buys
        await renExSettlement.submitMatch(
            buyID_1,
            buyID_1,
        ).should.be.rejectedWith(null, /invalid sell parity/);

        // Two sells
        await renExSettlement.submitMatch(
            sellID_1,
            sellID_1,
        ).should.be.rejectedWith(null, /invalid buy parity/);

        // Orders that aren't matched to one another
        await renExSettlement.submitMatch(
            buyID_2,
            sellID_1,
        ).should.be.rejectedWith(null, /invalid order pair/);

        // Buy token that is not registered
        await renExSettlement.submitMatch(
            buyID_1,
            sellID_1,
        ).should.be.rejectedWith(null, /unregistered buy token/);

        await renExTokens.deregisterToken(ETH);
        await renExSettlement.submitMatch(
            buyID_2,
            sellID_2,
        ).should.be.rejectedWith(null, /unregistered sell token/);
        await renExTokens.registerToken(ETH, tokenAddresses[ETH].address, 18);
    });

    it("should fail for excessive gas price", async () => {
        const _renExSettlement = await RenExSettlement.new(orderbook.address, renExTokens.address, renExBalances.address, 0);
        await _renExSettlement.submitOrder(
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x000000000000000000000000000000000000000000000000000000005b2a43a2",
            "0x0000000000000000000000000000000000000000000000000000000100010001",
            "0x00000000000000000000000000000000000000000000000000000000000000e6",
            "0x0000000000000000000000000000000000000000000000000000000000000023",
            "0x0000000000000000000000000000000000000000000000000000000000000005",
            "0x000000000000000000000000000000000000000000000000000000000000000f",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x8d981922c65b85a257f457ba3c29831aa4c3b1bd45dc3b280590fd5c89c69dc2",
        ).should.be.rejectedWith(null, /gas price too high/)
    });
});










const randomID = () => {
    return web3.utils.sha3(Math.random().toString());
}

const BTC = 0x0;
const ETH = 0x1;
const DGX = 0x100;
const REN = 0x10000;

async function setup(darknode, broker) {
    const tokenAddresses = {
        [BTC]: await BitcoinMock.new(),
        [ETH]: { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: () => new BigNumber(18), approve: () => null },
        [DGX]: await DGXMock.new(),
        [REN]: await RepublicToken.new(),
    };

    const dnr = await DarknodeRegistry.new(
        tokenAddresses[REN].address,
        0,
        1,
        0
    );
    const orderbook = await Orderbook.new(0, tokenAddresses[REN].address, dnr.address);
    const rewardVault = await RewardVault.new(dnr.address);
    const renExBalances = await RenExBalances.new(rewardVault.address);
    const renExTokens = await RenExTokens.new();
    const renExSettlement = await RenExSettlement.new(orderbook.address, renExTokens.address, renExBalances.address, 100 * GWEI);
    await renExBalances.setRenExSettlementContract(renExSettlement.address);

    await renExTokens.registerToken(ETH, tokenAddresses[ETH].address, 18);
    await renExTokens.registerToken(BTC, tokenAddresses[BTC].address, (await tokenAddresses[BTC].decimals()));
    await renExTokens.registerToken(DGX, tokenAddresses[DGX].address, (await tokenAddresses[DGX].decimals()));
    await renExTokens.registerToken(REN, tokenAddresses[REN].address, (await tokenAddresses[REN].decimals()));

    // Register darknode
    await dnr.register(darknode, "0x", 0, { from: darknode });
    await dnr.epoch();

    await tokenAddresses[REN].approve(orderbook.address, 100 * 1e18, { from: broker });

    return [tokenAddresses, orderbook, renExSettlement, renExBalances, renExTokens];
}