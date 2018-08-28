pragma solidity ^0.4.24;

/// @notice ApprovingBroker implements the BrokerVerifier interface, always
/// verifying signatures.
contract ApprovingBroker {
    event Verified(address _trader, bytes _signature, bytes32 _orderID);

    function verifyOpenSignature(
        address _trader,
        bytes _signature,
        bytes32 _orderID
    ) external returns (bool) {
        // Log emitted to easily avoid linters from complaining about the unused
        // parameters
        emit Verified(_trader, _signature, _orderID);
        return true;
    }
}