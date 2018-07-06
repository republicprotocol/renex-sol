const Info = artifacts.require("AtomicInfo");
const chai = require("chai");
chai.use(require("chai-as-promised"));
chai.should();

contract("AtomicInfo", function () {

  let info;

  before(async function () {
    info = await Info.new();
  });

  it("can submit and retreive swap details", async () => {
    id = 0x1234
    swap = 0x567890
    await info.submitDetails(id, swap)
    assert.equal((await info.swapDetails(id)), swap);
  });

  it("can submit and retreive addresses", async () => {
    id = 0x1234
    addr = 0x567890
    await info.setOwnerAddress(id, addr)
    assert.equal((await info.getOwnerAddress(id)), addr);
  });
 
});