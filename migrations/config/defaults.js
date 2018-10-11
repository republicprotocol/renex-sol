module.exports = {
    // Default values
    VERSION: "1.0.2",
    INFURA_KEY: "UfvZz8hxsGtWmiC3JEbX", // can be committed
    MINIMUM_BOND: "100000000000000000000000",
    SUBMIT_ORDER_GAS_LIMIT: "10000000000",
    WATCHDOG_ADDRESS: "0x565839e16bac459884b0f0d7377ac04e04be150d",
    MINIMUM_POD_SIZE: 6,
    MINIMUM_EPOCH_INTERVAL: 50,
    TOKENS: {
        BTC: 0x0,
        ETH: 0x1,
        DGX: 0x100,
        TUSD: 0x101,
        REN: 0x10000,
        ZRX: 0x10001,
        OMG: 0x10002
    },
}

const or = (value, defaultValue) => value && value !== undefined ? value : defaultValue;

module.exports.withDefaults = (config) => {
    // Structure
    config.network = or(config.network, {});
    config.settings = or(config.settings, {});
    config.settings.republic = or(config.settings.republic, {});
    config.settings.renex = or(config.settings.renex, {});

    // Populate with defaults for keys that haven't been set
    config.version = or(config.version, module.exports.VERSION);
    config.infuraKey = or(config.network.infuraKey, module.exports.INFURA_KEY);
    config.settings.republic.minimumBond = or(config.settings.republic.minimumBond, module.exports.MINIMUM_BOND);
    config.settings.republic.minimumPodSize = or(config.settings.republic.minimumPodSize, module.exports.MINIMUM_POD_SIZE);
    config.settings.republic.minimumEpochInterval = or(config.settings.republic.minimumEpochInterval, module.exports.MINIMUM_EPOCH_INTERVAL);
    config.settings.renex.submitOrderGasLimit = or(config.settings.renex.submitOrderGasLimit, module.exports.SUBMIT_ORDER_GAS_LIMIT);
    config.settings.renex.watchdogAddress = or(config.settings.renex.watchdogAddress, module.exports.WATCHDOG_ADDRESS);
    config.settings.renex.tokens = or(config.settings.renex.tokens, module.exports.TOKENS);

    return config;
};