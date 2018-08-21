pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "republic-sol/contracts/DarknodeRewardVault.sol";

import "./RenExSettlement.sol";
import "./RenExBrokerVerifier.sol";

/// @notice RenExBalances is responsible for holding RenEx trader funds.
contract RenExBalances is Ownable {
    using SafeMath for uint256;

    RenExSettlement public settlementContract;
    RenExBrokerVerifier public brokerVerifierContract;
    DarknodeRewardVault public rewardVaultContract;

    /// @dev Should match the address in the DarknodeRewardVault
    address constant public ETHEREUM = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    
    // Delay between a trader calling `withdrawSignal` and being able to call
    // `withdraw` without a broker signature.
    uint256 constant public SIGNAL_DELAY = 48 hours;

    // Events
    event LogBalanceDecreased(address trader, ERC20 token, uint256 value);
    event LogBalanceIncreased(address trader, ERC20 token, uint256 value);
    event LogRenExSettlementContractUpdated(address previousRenExSettlementContract, address newRenExSettlementContract);
    event LogRewardVaultContractUpdated(address previousRewardVaultContract, address newRewardVaultContract);
    event LogBrokerVerifierContractUpdated(address previousBrokerVerifierContract, address newBrokerVerifierContract);

    // Storage
    mapping(address => mapping(address => uint256)) public traderBalances;
    mapping(address => mapping(address => uint256)) public traderWithdrawalSignals;

    /// @param _rewardVaultContract The address of the RewardVault contract.
    constructor(DarknodeRewardVault _rewardVaultContract, RenExBrokerVerifier _brokerVerifierContract) public {
        rewardVaultContract = _rewardVaultContract;
        brokerVerifierContract = _brokerVerifierContract;
    }

    /// @notice Restricts a function to only being called by the RenExSettlement
    /// contract.
    modifier onlyRenExSettlementContract() {
        require(msg.sender == address(settlementContract), "not authorized");
        _;
    }

    /// @notice Restricts trader withdrawing to be called if a signature from a
    /// RenEx broker is provided, or if a certain amount of time has passed
    /// since a trader has called `signalBackupWithdraw`.
    /// @dev If the trader is withdrawing after calling `signalBackupWithdraw`,
    /// this will reset the time to zero, writing to storage.
    modifier withBrokerSignatureOrSignal(address _token, bytes _signature) {
        address trader = msg.sender;
        if (brokerVerifierContract.verifyWithdrawSignature(trader, _signature)) {
            _;
        } else {
            bool hasSignalled = traderWithdrawalSignals[trader][_token] != 0;
            bool hasWaitedDelay = (now - traderWithdrawalSignals[trader][_token]) > SIGNAL_DELAY;
            require(hasSignalled && hasWaitedDelay, "not signalled");
            traderWithdrawalSignals[trader][_token] = 0;
            _;
        }
    }

    /// @notice Allows the owner of the contract to update the address of the
    /// RenExSettlement contract.
    ///
    /// @param _newSettlementContract the address of the new settlement contract
    function updateRenExSettlementContract(RenExSettlement _newSettlementContract) external onlyOwner {
        emit LogRenExSettlementContractUpdated(settlementContract, _newSettlementContract);
        settlementContract = _newSettlementContract;
    }

    /// @notice Allows the owner of the contract to update the address of the
    /// DarknodeRewardVault contract.
    ///
    /// @param _newRewardVaultContract the address of the new reward vault contract
    function updateRewardVaultContract(DarknodeRewardVault _newRewardVaultContract) external onlyOwner {
        emit LogRewardVaultContractUpdated(rewardVaultContract, _newRewardVaultContract);
        rewardVaultContract = _newRewardVaultContract;
    }

    /// @notice Allows the owner of the contract to update the address of the
    /// RenExBrokerVerifier contract.
    ///
    /// @param _newBrokerVerifierContract the address of the new broker verifier contract
    function updateBrokerVerifierContract(RenExBrokerVerifier _newBrokerVerifierContract) external onlyOwner {
        emit LogBrokerVerifierContractUpdated(brokerVerifierContract, _newBrokerVerifierContract);
        brokerVerifierContract = _newBrokerVerifierContract;
    }

    /// @notice Transfer a token value from one trader to another, transferring
    /// a fee to the RewardVault. Can only be called by the RenExSettlement
    /// contract.
    ///
    /// @param _traderFrom The address of the trader to decrement the balance of.
    /// @param _traderTo The address of the trader to increment the balance of.
    /// @param _token The token's address.
    /// @param _value The number of tokens to decrement the balance by (in the
    ///        token's smallest unit).
    /// @param _fee The fee amount to forward on to the RewardVault.
    /// @param _feePayee The recipient of the fee.
    function transferBalanceWithFee(address _traderFrom, address _traderTo, address _token, uint256 _value, uint256 _fee, address _feePayee)
    external onlyRenExSettlementContract {
        require(traderBalances[_traderFrom][_token] >= _fee, "insufficient funds for fee");

        if (address(_token) == ETHEREUM) {
            rewardVaultContract.deposit.value(_fee)(_feePayee, ERC20(_token), _fee);
        } else {
            ERC20(_token).approve(rewardVaultContract, _fee);
            rewardVaultContract.deposit(_feePayee, ERC20(_token), _fee);
        }
        privateDecrementBalance(_traderFrom, ERC20(_token), _value + _fee);
        if (_value > 0) {
            privateIncrementBalance(_traderTo, ERC20(_token), _value);
        }
    }

    /// @notice Deposits ETH or an ERC20 token into the contract.
    ///
    /// @param _token The token's address (must be a registered token).
    /// @param _value The amount to deposit in the token's smallest unit.
    function deposit(ERC20 _token, uint256 _value) external payable {
        address trader = msg.sender;

        if (address(_token) == ETHEREUM) {
            require(msg.value == _value, "mismatched value parameter and tx value");
        } else {
            require(msg.value == 0, "unexpected ether transfer");
            require(_token.transferFrom(trader, this, _value), "token transfer failed");
        }
        privateIncrementBalance(trader, _token, _value);
    }

    /// @notice Withdraws ETH or an ERC20 token from the contract. A broker
    /// signature is required to guarantee that the trader has a sufficient
    /// balance after accounting for open orders. As a trustless backup,
    /// traders can withdraw 48 hours after calling `signalBackupWithdraw`.
    ///
    /// @param _token The token's address.
    /// @param _value The amount to withdraw in the token's smallest unit.
    /// @param _signature The broker signature
    function withdraw(ERC20 _token, uint256 _value, bytes _signature) external withBrokerSignatureOrSignal(_token, _signature) {
        address trader = msg.sender;

        privateDecrementBalance(trader, _token, _value);
        if (address(_token) == ETHEREUM) {
            trader.transfer(_value);
        } else {
            require(_token.transfer(trader, _value), "token transfer failed");
        }
    }

    /// @notice A trader can withdraw without needing a broker signature if they
    /// first call `signalBackupWithdraw` for the token they want to withdraw.
    /// The trader can only withdraw the particular token once for each call to
    /// this function. Traders can signal the intent to withdraw multiple
    /// tokens.
    /// Once this function is called, brokers will not sign order-opens for the
    /// trader until the trader has withdrawn, guaranteeing that they won't have
    /// orders open for the particular token.
    function signalBackupWithdraw(address _token) external {
        traderWithdrawalSignals[msg.sender][_token] = now;
    }

    function privateIncrementBalance(address _trader, ERC20 _token, uint256 _value) private {
        traderBalances[_trader][_token] = traderBalances[_trader][_token].add(_value);

        emit LogBalanceIncreased(_trader, _token, _value);
    }

    function privateDecrementBalance(address _trader, ERC20 _token, uint256 _value) private {
        require(traderBalances[_trader][_token] >= _value, "insufficient funds");
        traderBalances[_trader][_token] = traderBalances[_trader][_token].sub(_value);

        emit LogBalanceDecreased(_trader, _token, _value);
    }
}