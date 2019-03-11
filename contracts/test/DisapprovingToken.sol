pragma solidity ^0.4.25;

/// @notice A test ERC20 token with 110 decimals.
contract DisapprovingToken {
    function approve(address spender, uint256 value) public returns (bool) {
        return false;
    }
}
