module.exports = {
    skipFiles: [
        // Contract for building bindings
        "Bindings.sol",

        // Migration contract
        "migrations/Migrations.sol",

        // Contracts for assisting the tests
        "test/ApprovingBroker.sol",
        "test/DisapprovingToken.sol",
        "test/Time.sol",
        "test/VersionedContract.sol",
        "test/PreciseToken.sol",

        // Source code for tokens supported on RenEx
        "test/tokens/DGXToken.sol",
        "test/tokens/OMGToken.sol",
        "test/tokens/TUSDToken.sol",
        "test/tokens/ZRXToken.sol",
    ],
};