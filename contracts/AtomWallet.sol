pragma solidity 0.4.24;

contract AtomWallet {

    struct Match {
        bytes32 buyID;
        bytes32 sellID;
        uint32 buyToken;
        uint32 sellToken;
        uint256 buyValue;
        uint256 sellValue;
    }

    mapping (bytes32=>Match) public getSettlementDetails;

    function setSettlementDetails(bytes32 _buyID, bytes32 _sellID, uint32 _buyToken, uint32 _sellToken, uint256 _buyValue, uint32 _sellValue) public {
        getSettlementDetails[_buyID] = Match({
            buyID: _buyID,
            sellID: _sellID,
            buyToken: _buyToken,
            sellToken: _sellToken,
            buyValue: _buyValue,
            sellValue: _sellValue
        });

        getSettlementDetails[_sellID] = Match({
            buyID: _sellID,
            sellID: _buyID,
            buyToken: _sellToken,
            sellToken: _buyToken,
            buyValue: _sellValue,
            sellValue: _buyValue
        });
    }

}