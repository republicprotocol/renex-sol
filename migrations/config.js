let previousConfig;
let previousNetwork;

module.exports = (network) => {
    // If no network is provided, or the same network as before is being used,
    // use the previously loaded config.
    if (!network || network === previousNetwork) {
        return previousConfig;
    }

    previousNetwork = network;
    previousConfig = require(`../config/${network}.js`);
    return previousConfig;
}