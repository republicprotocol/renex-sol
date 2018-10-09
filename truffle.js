const config = require(`./config/${process.env.NETWORK}.js`);

module.exports = {
    solc: {
        version: "native",
        optimizer: {
            enabled: true,
            runs: 200
        }
    },
    networks: {
        [process.env.NETWORK]: config.network,
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
        forbidOnly: (process.env.CI == true)
    },
};