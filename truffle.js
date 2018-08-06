require('dotenv').config()

const HDWalletProvider = require("truffle-hdwallet-provider");

const KOVAN = (MNEMONIC) => ({
    provider: function () {
        return new HDWalletProvider(MNEMONIC, `https://kovan.infura.io/${process.env.INFURA_TOKEN}`);
    },
    network_id: 42,
    gas: 6721975,
    gasPrice: 10000000000,
});

module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 8545,
            network_id: "*",
            gas: 6721975,
        },
        f0: KOVAN(process.env.MNEMONIC_F0),
        falcon: KOVAN(process.env.MNEMONIC_FALCON),
        nightly: KOVAN(process.env.MNEMONIC_NIGHTLY),
    },
    mocha: {
        // // Use with `npm run test`, not with `npm run coverage`
        // reporter: 'eth-gas-reporter',
        // reporterOptions: {
        //     currency: 'USD',
        //     gasPrice: 21
        // },
        useColors: true,
        bail: true,
    },
};
