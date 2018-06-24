pragma solidity 0.4.24;

contract AtomWallet {

    struct Match {
        bytes32 buyID;
        bytes32 sellID;
        uint32 buyToken;
        uint32 sellToken;
        uint256 lowTokenValue;
        uint256 highTokenValue;
    }

    mapping (bytes32=>Match) getSettlementDetails;

    function setSettlementDetails(bytes32 _buyID, bytes32 _sellID, uint32 _buyToken, uint32 _sellToken, uint256 _lowTokenValue, uint32 _highTokenValue) public {
        getSettlementDetails[_buyID] = Match({
            buyID: _buyID,
            sellID: _sellID,
            buyToken: _buyToken,
            sellToken: _sellToken,
            lowTokenValue: _lowTokenValue,
            highTokenValue: _highTokenValue
        });

        getSettlementDetails[_sellID] = Match({
            buyID: _buyID,
            sellID: _sellID,
            buyToken: _buyToken,
            sellToken: _sellToken,
            lowTokenValue: _lowTokenValue,
            highTokenValue: _highTokenValue
        });
    }

}