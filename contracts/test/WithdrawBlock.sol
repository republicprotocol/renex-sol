pragma solidity ^0.4.24;

/**
@title The WithdrawalBlock contract is used for testing the RenExBalances contract
@author Republic Protocol
*/
contract WithdrawBlock {
    function traderCanWithdraw(address _trader, address _token, uint256 amount) public pure returns (bool) {
        // Block all withdrawal requests
        return false;
    }
}