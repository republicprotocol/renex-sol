pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/// @notice RenExTokens is a registry of tokens that can be traded on RenEx.
contract RenExTokens is Ownable {

    struct TokenDetails {
        address addr;
        uint8 decimals;
        bool registered;
    }

    mapping(uint32 => TokenDetails) public tokens;
    mapping(uint32 => bool) private detailsSubmitted;

    event LogTokenRegistered(uint32 tokenCode, address tokenAddress, uint8 tokenDecimals);
    event LogTokenDeregistered(uint32 tokenCode);

    /// @notice Allows the owner to register and the details for a token.
    /// Once details have been submitted, they cannot be overwritten.
    ///
    /// @param _tokenCode A unique 32-bit token identifier.
    /// @param _tokenAddress The address of the token.
    /// @param _tokenDecimals The decimals to use for the token.
    function registerToken(uint32 _tokenCode, address _tokenAddress, uint8 _tokenDecimals) public onlyOwner {
        require(!tokens[_tokenCode].registered, "already registered");

        if (detailsSubmitted[_tokenCode]) {
            require(tokens[_tokenCode].addr == _tokenAddress, "different address");
            require(tokens[_tokenCode].decimals == _tokenDecimals, "different decimals");
        } else {
            detailsSubmitted[_tokenCode] = true;
        }

        tokens[_tokenCode] = TokenDetails({
            addr: _tokenAddress,
            decimals: _tokenDecimals,
            registered: true
        });

        emit LogTokenRegistered(_tokenCode, _tokenAddress, _tokenDecimals);
    }

    /// @notice Sets a token as being deregistered. The details are still stored
    /// to prevent the token from being reregistered with different details.
    ///
    /// @param _tokenCode The unique 32-bit token identifier.
    function deregisterToken(uint32 _tokenCode) external onlyOwner {
        require(tokens[_tokenCode].registered, "not registered");

        tokens[_tokenCode].registered = false;

        emit LogTokenDeregistered(_tokenCode);
    }
}