let previousContractArtifacts = null;
let previousNetwork;

module.exports = (network, artifacts) => {
    if (previousContractArtifacts && (network === null || network === previousNetwork)) {
        return previousContractArtifacts;
    }

    previousNetwork = network;
    previousContractArtifacts = {
        // Republic
        RepublicToken: artifacts.require("RepublicToken"),
        DarknodeRegistryStore: artifacts.require("DarknodeRegistryStore"),
        DarknodeRegistry: artifacts.require("DarknodeRegistry"),
        DarknodeSlasher: artifacts.require("DarknodeSlasher"),
        Orderbook: artifacts.require("Orderbook"),
        DarknodeRewardVault: artifacts.require("DarknodeRewardVault"),
        SettlementRegistry: artifacts.require("SettlementRegistry"),

        // RenEx
        RenExBalances: artifacts.require("RenExBalances"),
        RenExTokens: artifacts.require("RenExTokens"),
        RenExSettlement: artifacts.require("RenExSettlement"),
        RenExBrokerVerifier: artifacts.require("RenExBrokerVerifier"),
        SettlementRegistry: artifacts.require("SettlementRegistry"),
        RenExAtomicSwapper: artifacts.require("RenExAtomicSwapper"),

        // Token contracts
        RepublicToken: artifacts.require("RepublicToken"),
        DGXToken: artifacts.require("DGXToken"),
        OMGToken: artifacts.require("OMGToken"),
        ZRXToken: artifacts.require("ZRXToken"),
        TUSDToken: artifacts.require("TrueUSD"),
        TUSD_BalanceSheet: artifacts.require("TUSD_BalanceSheet"),
        TUSD_AllowanceSheet: artifacts.require("TUSD_AllowanceSheet"),
        TUSD_AddressList: artifacts.require("TUSD_AddressList"),

        // Test contracts
        PreciseToken: artifacts.require("PreciseToken"),
        ApprovingBroker: artifacts.require("ApprovingBroker"),
        Time: artifacts.require("Time"),
        DisapprovingToken: artifacts.require("DisapprovingToken"),
        VersionedContract: artifacts.require("VersionedContract"),
    };
    return previousContractArtifacts;
}