const Swap = artifacts.require("AtomicSwap");

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
chai.should();

import * as SHA256 from "crypto-js/sha256";

contract("AtomicSwap", function (accounts) {

  let swap, swapRefund, secretLock;
  const swapID = `0x${SHA256(Math.random().toString()).toString()}`;
  const alice = accounts[0];
  const bob = accounts[1];
  const secret = `0x${SHA256('Secret').toString()}`;

  before(async function () {
    swap = await Swap.new();
    swapRefund = await Swap.new();
    secretLock = secretLock = `0x${SHA256(SHA256('Secret')).toString()}`;
  });

  it("can initiate an atomic swap", async () => {
    var ts = Math.round((new Date()).getTime() / 1000) + 10000;
    await swap.initiate(swapID, bob, secretLock, ts, { from: alice, value: 100000 }).should.not.be.rejected;
  });

  it("can audit an atomic swap", async () => {
    await swap.audit(swapID).should.not.be.rejected;
  });

  it("can redeem an atomic swap", async () => {
    await swap.redeem(swapID, secret, { from: bob }).should.not.be.rejected;
  });

  it("can audit secret of an atomic swap", async () => {
    await swap.auditSecret(swapID).should.not.be.rejected;
  });

  it("can refund an atomic swap", async () => {
    await swapRefund.initiate(swapID, bob, secretLock, 0, { from: alice, value: 100000 }).should.not.be.rejected;
    await swapRefund.refund(swapID, { from: alice }).should.not.be.rejected;
  });

});