pragma solidity ^0.4.24;

/// @notice The WithdrawalBlock contract is used for testing the RenExBalances contract
contract WithdrawBlock {
    function traderCanWithdraw(address _trader, address _token, uint256 amount) public pure returns (bool) {
        // Block all withdrawal requests
        return false;
    }
}