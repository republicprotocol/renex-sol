pragma solidity ^0.4.25;

import "../RenExBalances.sol";

/// @notice Forwards calls to `transferBalanceWithFee` on to RenExBalances.
contract VersionedContract {
    string public VERSION;

    RenExBalances public renExBalancesContract;

    /// @notice The contract constructor.
    ///
    /// @param _VERSION A string defining the contract version.
    /// @param _renExBalancesContract The address of the RenExBalances
    ///        contract.
    constructor(
        string _VERSION,
        RenExBalances _renExBalancesContract
    ) public {
        VERSION = _VERSION;
        renExBalancesContract = _renExBalancesContract;
    }

    function transferBalanceWithFee(address _traderFrom, address _traderTo, address _token, uint256 _value, uint256 _fee, address _feePayee)
    external {
        renExBalancesContract.transferBalanceWithFee(_traderFrom, _traderTo, _token, _value, _fee, _feePayee);
    }

}