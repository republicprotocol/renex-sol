pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

/// @notice A test ERC20 token with 110 decimals.
contract PreciseToken is StandardToken {

    string public constant name = "Very Price Token"; // solium-disable-line uppercase
    string public constant symbol = "VPT"; // solium-disable-line uppercase
    uint8 public constant decimals = 110; // solium-disable-line uppercase

    uint256 public constant INITIAL_SUPPLY = 1 * (10 ** uint256(77));

    /**
    * @dev Constructor that gives msg.sender all of existing tokens.
    */
    constructor() public {
        totalSupply_ = INITIAL_SUPPLY;
        balances[msg.sender] = INITIAL_SUPPLY;
        emit Transfer(0x0, msg.sender, INITIAL_SUPPLY);
    }

}