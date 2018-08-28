const BN = require("bn.js");

const GWEI = 1000000000;

module.exports = {
    VERSION: "0.1.0",
    MINIMUM_BOND: new BN(100000).mul(new BN(10).pow(new BN(18))),
    MINIMUM_POD_SIZE: 3, // 24 in production
    MINIMUM_EPOCH_INTERVAL: 1, // 14400 in production
    SUBMIT_ORDER_GAS_LIMIT: 100 * GWEI,
    SLASHER_ADDRESS: "0x565839E16bAC459884b0F0D7377Ac04e04Be150d",
}

/*

    const BOND = (new BN(100000)).mul(new BN(10).pow(new BN(18)));
    const SLASHER_ADDRESS = 0x0;

    let POD_SIZE = 3;
    let EPOCH_BLOCKS = 1;
    switch (network) {
        case "nightly":
            POD_SIZE = 3;
            EPOCH_BLOCKS = 50;
            break;
        case "falcon":
            POD_SIZE = 6;
            EPOCH_BLOCKS = 600;
            break;
        case "f0":
            POD_SIZE = 9;
            EPOCH_BLOCKS = 50; // 14400;
            break;
    }

*/