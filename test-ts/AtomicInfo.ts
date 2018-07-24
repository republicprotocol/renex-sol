
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
chai.should();

const Info = artifacts.require("AtomicInfo");

context("AtomicInfo", function () {

    // let info, id, swap, addr;

    // before(async function () {
    //     info = await Info.new();
    // });

    // it("can submit and retreive swap details", async () => {
    //     id = "0x1234";
    //     swap = "0x567890";
    //     await info.submitDetails(id, swap);
    //     (await info.swapDetails(id)).should.equal(swap);
    // });

    // it("can submit and retreive addresses", async () => {
    //     id = "0x1234";
    //     addr = "0x567890";
    //     await info.setOwnerAddress(id, addr);
    //     (await info.getOwnerAddress(id)).should.equal(addr);
    // });

});
