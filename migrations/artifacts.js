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
        RenExAtomicSwapper: artifacts.require("RenExAtomicSwapper"),

        // Token contracts
        DGXToken: artifacts.require("DigixGoldToken"),
        DGX_BalanceSheet: artifacts.require("DGX_BalanceSheet"),
        DGX_AllowanceSheet: artifacts.require("DGX_AllowanceSheet"),
        DGX_AddressList: artifacts.require("DGX_AddressList"),
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