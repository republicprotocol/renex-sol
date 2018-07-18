pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
@title A registry of tokens that can be traded on RenEx
@author Republic Protocol
*/
contract RenExTokens is Ownable {
    using SafeMath for uint256;

    mapping(uint32 => ERC20) public tokenAddresses;
    mapping(uint32 => uint8) public tokenDecimals;
    mapping(uint32 => bool) public tokenIsRegistered;

    event TokenRegistered(uint32 tokenCode, ERC20 tokenAddress, uint8 tokenDecimals);
    event TokenDeregistered(uint32 tokenCode);

    /**
    @notice constructor
    */
    constructor() public {
    }


    /**
    @notice Sets a token as being registered and stores its details (only-owner)
    @param _tokenCode a unique 32-bit token identifier
    @param _tokenAddress the address of the ERC20-compatible token
    @param _tokenDecimals the decimals to use for the token
    */
    function registerToken(uint32 _tokenCode, ERC20 _tokenAddress, uint8 _tokenDecimals) public onlyOwner {
        tokenAddresses[_tokenCode] = _tokenAddress;
        tokenDecimals[_tokenCode] = _tokenDecimals;
        tokenIsRegistered[_tokenCode] = true;

        emit TokenRegistered(_tokenCode, _tokenAddress, _tokenDecimals);
    }

    /**
    @notice Sets a token as being deregistered
    @param _tokenCode the unique 32-bit token identifier
    */
    function deregisterToken(uint32 _tokenCode) public onlyOwner {
        tokenIsRegistered[_tokenCode] = false;

        emit TokenDeregistered(_tokenCode);
    }
}