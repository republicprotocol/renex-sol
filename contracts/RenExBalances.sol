pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "./RenExSettlement.sol";
import "republic-sol/contracts/DarknodeRewardVault.sol";

/// @notice RenExBalances is responsible for holding RenEx trader funds.
contract RenExBalances is Ownable {
    using SafeMath for uint256;

    RenExSettlement public settlementContract;
    DarknodeRewardVault public rewardVaultContract;

    /// @dev Should match the address in the DarknodeRewardVault
    address constant public ETHEREUM = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    // Events
    event LogBalanceDecreased(address trader, ERC20 token, uint256 value);
    event LogBalanceIncreased(address trader, ERC20 token, uint256 value);
    event LogRenExSettlementContractUpdated(address indexed newRenExSettlementContract);
    event LogRewardVaultContractUpdated(address indexed newRewardVaultContract);

    // Storage
    mapping(address => address[]) public traderTokens;
    mapping(address => mapping(address => uint256)) public traderBalances;
    mapping(address => mapping(address => bool)) private activeTraderToken;

    /// @param _rewardVaultContract The address of the RewardVault contract.
    constructor(DarknodeRewardVault _rewardVaultContract) public {
        rewardVaultContract = _rewardVaultContract;
    }

    /// @notice Restricts a function to only being called by the RenExSettlement
    /// contract.
    modifier onlyRenExSettlementContract() {
        require(msg.sender == address(settlementContract), "not authorised");
        _;
    }

    /// @notice Allows the owner of the contract to update the address of the
    /// RenExSettlement contract.
    ///
    /// @param _newSettlementContract the address of the new settlement contract
    function updateRenExSettlementContract(RenExSettlement _newSettlementContract) external onlyOwner {
        emit LogRenExSettlementContractUpdated(_newSettlementContract);
        settlementContract = _newSettlementContract;
    }

    /// @notice Allows the owner of the contract to update the address of the
    /// DarknodeRewardVault contract.
    ///
    /// @param _newRewardVaultContract the address of the new reward vault contract
    function updateRewardVault(DarknodeRewardVault _newRewardVaultContract) external onlyOwner {
        emit LogRewardVaultContractUpdated(_newRewardVaultContract);
        rewardVaultContract = _newRewardVaultContract;
    }

    /// @notice Transfer a token value from one trader to another, transferring
    /// a fee to the RewardVault.
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
            require(_token.transferFrom(trader, this, _value), "token trasfer failed");
        }
        privateIncrementBalance(trader, _token, _value);
    }

    /// @notice Withdraws ETH or an ERC20 token from the contract. In the future,
    /// a broker signature will be required to prove that the trader has a
    /// sufficient balance after accounting for open orders.
    ///
    /// @param _token The token's address.
    /// @param _value The amount to withdraw in the token's smallest unit.
    function withdraw(ERC20 _token, uint256 _value) external {
        address trader = msg.sender;

        require(traderBalances[trader][_token] >= _value, "insufficient balance");

        privateDecrementBalance(trader, _token, _value);
        if (address(_token) == ETHEREUM) {
            trader.transfer(_value);
        } else {
            require(_token.transfer(trader, _value), "token transfer failed");
        }
    }

    /// @notice Retrieves the list of token addresses that the trader has
    /// previously had balances for and a list of the corresponding token
    /// balances.
    ///
    /// @param _trader The address of the trader.
    /// @return [
    ///     The array of token addresses,
    ///     The array of token balances in tokens' smallest units
    /// ]
    function getBalances(address _trader) public view returns (address[], uint256[]) {
        address[] memory tokens = traderTokens[_trader];
        uint256[] memory tokenBalances = new uint256[](tokens.length);

        for (uint256 i = 0; i < tokens.length; i++) {
            tokenBalances[i] = traderBalances[_trader][tokens[i]];
        }

        return (tokens, tokenBalances);
    }

    function privateIncrementBalance(address _trader, ERC20 _token, uint256 _value) private {
        // Check if it's the first time the trader
        if (!activeTraderToken[_trader][_token]) {
            activeTraderToken[_trader][_token] = true;
            traderTokens[_trader].push(_token);
        }

        traderBalances[_trader][_token] = traderBalances[_trader][_token].add(_value);

        emit LogBalanceIncreased(_trader, _token, _value);
    }

    function privateDecrementBalance(address _trader, ERC20 _token, uint256 _value) private {
        require(traderBalances[_trader][_token] >= _value, "insufficient funds");
        traderBalances[_trader][_token] = traderBalances[_trader][_token].sub(_value);

        emit LogBalanceDecreased(_trader, _token, _value);
    }
}