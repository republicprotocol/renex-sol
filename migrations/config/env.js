const HDWalletProvider = require("truffle-hdwallet-provider");
const {
    withDefaults,
    INFURA_KEY
} = require("./defaults.js");

const {
    MNEMONIC,
    ETH_NETWORK,
    ETH_NETWORK_ID,
    MINIMUM_POD_SIZE,
    MINIMUM_EPOCH_INTERVAL,
    WATCHDOG_ADDRESS,
    INGRESS_ADDRESS,
} = process.env;

const GWEI = 1000000000;

module.exports = withDefaults({
    network: {
        provider: function () {
            return new HDWalletProvider(MNEMONIC, `https://${ETH_NETWORK}.infura.io/${INFURA_KEY}`);
        },
        network_id: parseInt(ETH_NETWORK_ID, 10),
        gas: 6721975,
        gasPrice: 10 * GWEI,
    },
    settings: {
        republic: {
            minimumPodSize: MINIMUM_POD_SIZE ? parseInt(MINIMUM_POD_SIZE, 10) : undefined,
            minimumEpochInterval: MINIMUM_POD_SIZE ? parseInt(MINIMUM_EPOCH_INTERVAL, 10) : undefined,
        },
        renex: {
            watchdogAddress: WATCHDOG_ADDRESS,
            ingressAddress: INGRESS_ADDRESS,
        }
    }
});