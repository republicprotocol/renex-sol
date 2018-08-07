pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "republic-sol/contracts/libraries/Utils.sol";
import "republic-sol/contracts/BrokerVerifier.sol";

import "./RenExSettlement.sol";

/// @notice RenExBrokerVerifier implements the BrokerVerifier contract,
/// verifying broker signatures for order opening and fund withdrawal.
contract RenExBrokerVerifier is Ownable {

    // Events
    event LogBrokerRegistered(address broker);
    event LogBrokerDeregistered(address broker);

    // Storage
    mapping(address => bool) public brokers;
    mapping(address => uint256) public traderNonces;
    
    function registerBroker(address _broker) external onlyOwner {
        require(!brokers[_broker], "already registered");
        brokers[_broker] = true;
        emit LogBrokerRegistered(_broker);
    }

    function deregisterBroker(address _broker) external onlyOwner {
        require(brokers[_broker], "not registered");
        brokers[_broker] = false;
        emit LogBrokerDeregistered(_broker);
    }

    function verifyWithdrawSignature(address _trader, bytes _signature) external returns (bool) {
        bytes memory data = abi.encodePacked("Republic Protocol: withdraw: ", _trader, traderNonces[_trader]);
        address signer = Utils.addr(data, _signature);
        if (brokers[signer]) {
            traderNonces[_trader] += 1;
            return true;
        }
        return false;
    }
}