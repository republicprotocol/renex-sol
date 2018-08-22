pragma solidity ^0.4.24;

/// @notice ApprovingBroker implements the BrokerVerifier interface, always
/// verifying signatures.
contract ApprovingBroker {
    function verifyOpenSignature(
        address _trader,
        bytes _signature,
        bytes32 _orderID
    ) external pure returns (bool) {
        return true;
    }
}