pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "republic-sol/contracts/libraries/Utils.sol";

/// @notice RenExBrokerVerifier implements the BrokerVerifier contract,
/// verifying broker signatures for order opening and fund withdrawal.
contract RenExBrokerVerifier is Ownable {
    string public VERSION; // Passed in as a constructor parameter.

    // Events
    event LogBalancesContractUpdated(address previousBalancesContract, address nextBalancesContract);
    event LogBrokerRegistered(address broker);
    event LogBrokerDeregistered(address broker);

    // Storage
    mapping(address => bool) public brokers;
    mapping(address => uint256) public traderNonces;

    address public balancesContract;

    modifier onlyBalancesContract() {
        require(msg.sender == balancesContract, "not authorized");
        _;
    }

    /// @notice The contract constructor.
    ///
    /// @param _VERSION A string defining the contract version.
    constructor(string _VERSION) public {
        VERSION = _VERSION;
    }

    /// @notice Allows the owner of the contract to update the address of the
    /// RenExBalances contract.
    ///
    /// @param _balancesContract The address of the new balances contract
    function updateBalancesContract(address _balancesContract) external onlyOwner {
        emit LogBalancesContractUpdated(balancesContract, _balancesContract);

        balancesContract = _balancesContract;
    }

    /// @notice Approved an address to sign order-opening and withdrawals.
    /// @param _broker The address of the broker.
    function registerBroker(address _broker) external onlyOwner {
        require(!brokers[_broker], "already registered");
        brokers[_broker] = true;
        emit LogBrokerRegistered(_broker);
    }

    /// @notice Reverts the a broker's registration.
    /// @param _broker The address of the broker.
    function deregisterBroker(address _broker) external onlyOwner {
        require(brokers[_broker], "not registered");
        brokers[_broker] = false;
        emit LogBrokerDeregistered(_broker);
    }

    /// @notice Verifies a broker's signature for an order opening.
    /// The data signed by the broker is a prefixed message and the order ID.
    ///
    /// @param _trader The trader requesting the withdrawal.
    /// @param _signature The 65-byte signature from the broker.
    /// @param _orderID The 32-byte order ID.
    /// @return True if the signature is valid, false otherwise.
    function verifyOpenSignature(
        address _trader,
        bytes _signature,
        bytes32 _orderID
    ) external view returns (bool) {
        bytes memory data = abi.encodePacked("Republic Protocol: open: ", _trader, _orderID);
        address signer = Utils.addr(data, _signature);
        return (brokers[signer] == true);
    }

    /// @notice Verifies a broker's signature for a trader withdrawal.
    /// The data signed by the broker is a prefixed message, the trader address
    /// and a 256-bit trader nonce, which is incremented every time a valid
    /// signature is checked.
    ///
    /// @param _trader The trader requesting the withdrawal.
    /// @param _signature 65-byte signature from the broker.
    /// @return True if the signature is valid, false otherwise.
    function verifyWithdrawSignature(
        address _trader,
        bytes _signature
    ) external onlyBalancesContract returns (bool) {
        bytes memory data = abi.encodePacked("Republic Protocol: withdraw: ", _trader, traderNonces[_trader]);
        address signer = Utils.addr(data, _signature);
        if (brokers[signer]) {
            traderNonces[_trader] += 1;
            return true;
        }
        return false;
    }
}