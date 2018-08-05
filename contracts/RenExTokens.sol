pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/// @notice A registry of tokens that can be traded on RenEx.
contract RenExTokens is Ownable {
    using SafeMath for uint256;

    // Once a token is registered, its address and tokens can't be changed
    // If an ERC20 token's contract is upgraded with a new address, a new token
    // code should be used
    enum TokenStatus {
        NeverRegistered,
        Registered,
        Deregistered
    }

    struct TokenDetails {
        address addr;
        uint8 decimals;
        TokenStatus status;
    }

    mapping(uint32 => TokenDetails) public tokens;

    event TokenRegistered(uint32 tokenCode, ERC20 tokenAddress, uint8 tokenDecimals);
    event TokenDeregistered(uint32 tokenCode);

    /// @notice Allows the owner to register and the details for a token.
    /// Once details have been submitted, they cannot be overwritten.
    ///
    /// @param _tokenCode a unique 32-bit token identifier
    /// @param _tokenAddress the address of the ERC20-compatible token
    /// @param _tokenDecimals the decimals to use for the token
    function registerToken(uint32 _tokenCode, ERC20 _tokenAddress, uint8 _tokenDecimals) public onlyOwner {
        TokenStatus previousStatus = tokens[_tokenCode].status;
        require(previousStatus != TokenStatus.Registered, "already registered");

        tokens[_tokenCode].status = TokenStatus.Registered;

        if (previousStatus == TokenStatus.NeverRegistered) {
            tokens[_tokenCode].addr = _tokenAddress;
            tokens[_tokenCode].decimals = _tokenDecimals;
        }

        emit TokenRegistered(_tokenCode, _tokenAddress, _tokenDecimals);
    }

    /// @notice Sets a token as being deregistered
    ///
    /// @param _tokenCode the unique 32-bit token identifier
    function deregisterToken(uint32 _tokenCode) public onlyOwner {
        require (tokens[_tokenCode].status == TokenStatus.Registered, "not registered");

        tokens[_tokenCode].status = TokenStatus.Deregistered;

        emit TokenDeregistered(_tokenCode);
    }
}