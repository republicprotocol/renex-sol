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

    mapping (bytes32=>Match) Matches;

    function setSettlementDetails(bytes32 _buyID, bytes32 _sellID, uint32 _buyToken, uint32 _sellToken, uint256 _buyValue, uint256 _sellValue) public {
        Matches[_buyID] = Match({
            buyID: _buyID,
            sellID: _sellID,
            buyToken: _buyToken,
            sellToken: _sellToken,
            buyValue: _buyValue,
            sellValue: _sellValue
        });

        Matches[_sellID] = Match({
            buyID: _sellID,
            sellID: _buyID,
            buyToken: _sellToken,
            sellToken: _buyToken,
            buyValue: _sellValue,
            sellValue: _buyValue
        });
    }

    function getSettlementDetails(bytes32 orderID) public view returns(bytes32, bytes32, uint32, uint32, uint256, uint256) {
        return (Matches[orderID].buyID, Matches[orderID].sellID, Matches[orderID].buyToken, Matches[orderID].sellToken, Matches[orderID].buyValue, Matches[orderID].sellValue);
    }
}