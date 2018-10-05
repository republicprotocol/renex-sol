const BN = require("bn.js");

const GWEI = 1000000000;

module.exports = {
    VERSION: "1.0.2",
    MINIMUM_BOND: new BN(100000).mul(new BN(10).pow(new BN(18))),
    MINIMUM_POD_SIZE: 24, // 24 in production
    MINIMUM_EPOCH_INTERVAL: 1, // 14400 in production
    SUBMIT_ORDER_GAS_LIMIT: 10 * GWEI,
    SLASHER_ADDRESS: "0x565839E16bAC459884b0F0D7377Ac04e04Be150d",
    OWNER_ADDRESS: "0x64874e2F77AA6fC629eed6d6F02c62910e69DC5b",
    TOKEN_CODES: {
        BTC: 0x0,
        ETH: 0x1,
        DGX: 0x100,
        TUSD: 0x101,
        REN: 0x10000,
        ZRX: 0x10001,
        OMG: 0x10002,
    }
}