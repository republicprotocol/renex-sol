pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/// @notice RenExTokens is a registry of tokens that can be traded on RenEx.
contract RenExTokens is Ownable {

    struct TokenDetails {
        address addr;
        uint8 decimals;
        bool registered;
    }

    // Storage
    mapping(uint32 => TokenDetails) public tokens;
    mapping(uint32 => bool) private detailsSubmitted;

    // Events
    event LogTokenRegistered(uint32 tokenCode, address tokenAddress, uint8 tokenDecimals);
    event LogTokenDeregistered(uint32 tokenCode);

    /// @notice Allows the owner to register and the details for a token.
    /// Once details have been submitted, they cannot be overwritten.
    /// To reregister the same token with different details (e.g. if the address
    /// has changed), a different token identifier should be used and the
    /// previous token identifier should be deregistered.
    /// If a token is not Ethereum-based, the address will be set to 0x0.
    ///
    /// @param _tokenCode A unique 32-bit token identifier.
    /// @param _tokenAddress The address of the token.
    /// @param _tokenDecimals The decimals to use for the token.
    function registerToken(uint32 _tokenCode, address _tokenAddress, uint8 _tokenDecimals) public onlyOwner {
        require(!tokens[_tokenCode].registered, "already registered");

        // If a token is being reregistered, the same details must be provided.
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