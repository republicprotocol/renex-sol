pragma solidity ^0.4.24;

/// @notice A token for retrieving the current time from the blockchain
contract Time {
    function currentTime() public view returns (uint256) {
        /* solium-disable-next-line security/no-block-members */
        return now;
    }
}