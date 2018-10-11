const HDWalletProvider = require("truffle-hdwallet-provider");
const {
    withDefaults,
    INFURA_KEY
} = require("./defaults.js");

const MNEMONIC = "";
const GWEI = 1000000000;

module.exports = withDefaults({
    owner: "0x5e2603499eddc325153d96445a6c44487f0d1859",
    network: {
        provider: function () {
            return new HDWalletProvider(MNEMONIC, `https://kovan.infura.io/${INFURA_KEY}`);
        },
        network_id: 42,
        gas: 6721975,
        gasPrice: 10 * GWEI,
    },
    settings: {
        republic: {
            minimumPodSize: 6,
            minimumEpochInterval: 50,
        },
        renex: {
            watchdogAddress: "0x565839e16bac459884b0f0d7377ac04e04be150d",
        }
    }
});