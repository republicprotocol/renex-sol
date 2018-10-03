pragma solidity ^0.4.24;

/// @notice A token for retrieving the current time from the blockchain
contract Time {
    bool state;

    function newBlock() public {
        state = !state;
    }

    function currentTime() public view returns (uint256) {
        /* solium-disable-next-line security/no-block-members */
        return now;
    }
}