pragma solidity 0.4.24;

contract AtomWallet {

    struct Order {
        uint8 parity;
        uint8 orderType;
        uint64 expiry;
        uint64 tokens;        
        uint256 priceC; uint256 priceQ;
        uint256 volumeC; uint256 volumeQ;
        uint256 minimumVolumeC; uint256 minimumVolumeQ;
        uint256 nonceHash;
        address trader;
    }

    mapping (bytes32=>Order) public orders;
    mapping (bytes32=>bytes32) public matches;
    mapping (address=>uint256) public bonds;

    function() public payable {
        bonds[msg.sender] += msg.value;
    }

    function submitOrder(
        bytes32 _id,
        uint8 _orderType,
        uint8 _parity,
        uint64 _expiry,
        uint64 _tokens,
        uint16 _priceC, uint16 _priceQ,
        uint16 _volumeC, uint16 _volumeQ,
        uint16 _minimumVolumeC, uint16 _minimumVolumeQ,
        uint256 _nonceHash
    ) public {
        orders[_id] = Order({
            orderType: _orderType,
            parity: _parity,
            expiry: _expiry,
            tokens: _tokens,
            priceC: _priceC, priceQ: _priceQ,
            volumeC: _volumeC, volumeQ: _volumeQ,
            minimumVolumeC: _minimumVolumeC, minimumVolumeQ: _minimumVolumeQ,
            nonceHash: _nonceHash,
            trader: 0x0 
        });
    }

    function submitMatch(bytes32 _buy, bytes32 _sell) public {
        matches[_buy] = _sell;
        matches[_sell] = _buy;
    }

    function withdraw(uint256 _amount) public {
        require(_amount <= bonds[msg.sender]);
        bonds[msg.sender] -= _amount;
    }

}