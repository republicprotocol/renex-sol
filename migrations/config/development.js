const {
    withDefaults
} = require("./defaults.js");

const GWEI = 1000000000;

module.exports = withDefaults({
    network: {
        host: "localhost",
        port: 8545,
        network_id: "*",
        gas: 6721975,
        gasPrice: 10 * GWEI,
    },
    settings: {
        republic: {
            minimumPodSize: 6,
            minimumEpochInterval: 50
        },
        renex: {
            watchdogAddress: "0x565839e16bac459884b0f0d7377ac04e04be150d"
        }
    }
});