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

    // @dev TODO: Use same constant instance across all contracts
    address constant public ETHEREUM = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    event BalanceDecreased(address trader, ERC20 token, uint256 value);
    event BalanceIncreased(address trader, ERC20 token, uint256 value);
    event RenExSettlementContractUpdated(address indexed newRenExSettlementContract);
    event RewardVaultContractUpdated(address indexed newRewardVaultContract);

    mapping(address => address[]) public traderTokens;
    mapping(address => mapping(address => uint256)) public traderBalances;
    mapping(address => mapping(address => bool)) private activeTraderToken;

    /// @notice Constructor 
    constructor(DarknodeRewardVault _rewardVaultContract) public {
        rewardVaultContract = _rewardVaultContract;
    }

    /// @notice Throws if called by any account other than the RenExSettlement contract
    modifier onlyRenExSettlementContract() {
        require(msg.sender == address(settlementContract), "not authorised");
        _;
    }

    /// @notice Updates the address of the settlement contract (can only be called
    /// by the owner of the contract)
    ///
    /// @param _newSettlementContract the address of the new settlement contract
    function updateRenExSettlementContract(RenExSettlement _newSettlementContract) external onlyOwner {
        emit RenExSettlementContractUpdated(_newSettlementContract);
        settlementContract = _newSettlementContract;
    }

    /// @notice Updates the address of the reward vault contract (can only be called
    /// by the owner of the contract)
    ///
    /// @param _newRewardVaultContract the address of the new reward vault contract
    function updateRewardVault(DarknodeRewardVault _newRewardVaultContract) external onlyOwner {
        emit RewardVaultContractUpdated(_newRewardVaultContract);
        rewardVaultContract = _newRewardVaultContract;
    }

    /// @notice Increments a trader's balance of a token - can only be called by the
    /// owner, intended to be the RenEx settlement contract
    ///
    /// @param _trader the address of the trader
    /// @param _token the token's address
    /// @param _value the number of tokens to increment the balance by (in the token's smallest unit)
    function incrementBalance(address _trader, address _token, uint256 _value) external onlyRenExSettlementContract {
        privateIncrementBalance(_trader, ERC20(_token), _value);
    }

    /// @notice Decrements a trader's balance of a token - can only be called by the
    /// owner, intended to be the RenEx settlement contract
    ///
    /// @param _trader the address of the trader
    /// @param _token the token's address
    /// @param _value the number of tokens to decrement the balance by (in the token's smallest unit)
    function decrementBalanceWithFee(address _trader, address _token, uint256 _value, uint256 _fee, address feePayee)
    external onlyRenExSettlementContract {
        require(traderBalances[_trader][_token] >= _fee, "insufficient funds for fee");

        if (address(_token) == ETHEREUM) {
            rewardVaultContract.deposit.value(_fee)(feePayee, ERC20(_token), _fee);
        } else {
            ERC20(_token).approve(rewardVaultContract, _fee);
            rewardVaultContract.deposit(feePayee, ERC20(_token), _fee);
        }
        privateDecrementBalance(_trader, ERC20(_token), _value + _fee);
    }

    /// @notice Deposits ETH or an ERC20 token into the contract
    ///
    /// @param _token the token's address (must be a registered token)
    /// @param _value the amount to deposit in the token's smallest unit
    function deposit(ERC20 _token, uint256 _value) external payable {
        address trader = msg.sender;

        if (address(_token) == ETHEREUM) {
            require(msg.value == _value, "mismatched value parameter and tx value");
        } else {
            require(_token.transferFrom(trader, this, _value), "token trasfer failed");
        }
        privateIncrementBalance(trader, _token, _value);
    }

    /// @notice Withdraws ETH or an ERC20 token from the contract
    /// @dev TODO: Check if the account has any open orders first
    /// @param _token the token's address.
    /// @param _value the amount to withdraw in the token's smallest unit.
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

    /// @notice Retrieves the list of token addresses that the trader has previously
    /// had balances for and a list of the corresponding token balances
    /// @param _trader the address of the trader
    /// @return [
    ///     the array of token addresses,
    ///     the array of token balances in tokens' smallest units
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

        emit BalanceIncreased(_trader, _token, _value);
    }

    function privateDecrementBalance(address _trader, ERC20 _token, uint256 _value) private {
        require(traderBalances[_trader][_token] >= _value, "insufficient funds");
        traderBalances[_trader][_token] = traderBalances[_trader][_token].sub(_value);

        emit BalanceDecreased(_trader, _token, _value);
    }
}