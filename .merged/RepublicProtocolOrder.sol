pragma solidity 0.4.24;

library RepublicProtocolOrder {
    
    struct Order {
        uint8 parity;
        uint8 orderType;
        uint64 expiry;
        uint64 tokens;        
        uint64 priceC; uint64 priceQ;
        uint64 volumeC; uint64 volumeQ;
        uint64 minimumVolumeC; uint64 minimumVolumeQ;
        uint256 nonceHash;
        address trader;
        address submitter;
    }

    function newOrder(
        uint8 _orderType,
        uint8 _parity,
        uint64 _expiry,
        uint64 _tokens,
        uint16 _priceC, uint16 _priceQ,
        uint16 _volumeC, uint16 _volumeQ,
        uint16 _minimumVolumeC, uint16 _minimumVolumeQ,
        uint256 _nonceHash,
        address _trader,
        address _submitter
    ) private pure returns (Order) {
        Order memory order = Order({
            orderType: _orderType,
            parity: _parity,
            expiry: _expiry,
            tokens: _tokens,
            priceC: _priceC, priceQ: _priceQ,
            volumeC: _volumeC, volumeQ: _volumeQ,
            minimumVolumeC: _minimumVolumeC, minimumVolumeQ: _minimumVolumeQ,
            nonceHash: _nonceHash,
            trader: _trader,
            submitter: _submitter
        });
        return order;
    }

    function priceMidPoint(Order _buy, Order _sell) private pure returns (uint256, int256) {
        uint256 norm = _buy.priceC * 10 ** uint256(_buy.priceQ - _sell.priceQ);
        int256 q = int256(_sell.priceQ);
        uint256 sum = (_sell.priceC + norm);
        if (sum % 2 == 0) {
            return (sum / 2, q);
        } else {
            return (sum * (10 / 2), q - 1);
        }
    }
    
    function minimumVolume(Order _buy, Order _sell, uint256 _priceC, int256 _priceQ) private pure returns (uint256, int256, uint256) {        
        uint256 buyV = tupleToVolume(_buy.volumeC, int256(_buy.volumeQ), 1, 12);
        uint256 sellV = tupleToScaledVolume(_sell.volumeC, int256(_sell.volumeQ), _priceC, _priceQ, 1, 12);
        if (buyV < sellV) {
            return (_buy.volumeC * 200, int256(_buy.volumeQ + 26 + 12) - _priceQ, _priceC);
        } else {
            return (_sell.volumeC, int256(_sell.volumeQ), 1);
        }
    }

    function getMidPrice(Order _buy, Order _sell) private pure returns (uint256) {
        (uint256 midPriceC, int256 midPriceQ) = priceMidPoint(_buy, _sell);
        uint32 sellToken = uint32(_sell.tokens >> 32);
        uint32 sellTokenDecimals = renExTokensContract.tokenDecimals(sellToken);
        return tupleToPrice(midPriceC, midPriceQ, sellTokenDecimals);
    }

    function verifyMatch(Order _buy, Order _sell) private pure returns (uint32, uint32) {
        require(_buy.parity == uint8(OrderParity.Buy));
        require(_sell.parity == uint8(OrderParity.Sell));
        uint32 buyToken = uint32(_sell.tokens);
        uint32 sellToken = uint32(_sell.tokens >> 32);
        return (buyToken, sellToken);
        // TODO: Compare prices and volumes/minimum volumes
    }

    function tupleToScaledVolume(uint256 volC, int256 volQ, uint256 priceC, int256 priceQ, uint256 divideC, uint256 decimals) private pure returns (uint256) {
        uint256 c = volC * 5 * priceC * 2;
        int256 e = int256(decimals) + volQ + priceQ - (26 + 12 + 3 + 12 + 1);
        uint256 value;
        if (e >= 0) {
            value = c * 10 ** uint256(e);
        } else {
            value = c / 10 ** uint256(-e);            
        }
        value = value / divideC;
        return value;
    }

    function tupleToPrice(uint256 priceC, int256 priceQ, uint256 decimals) private pure returns (uint256) {
        uint256 c = priceC * 5;
        int256 e = int256(decimals) + priceQ - (26 + 12 + 3);
        uint256 value;
        if (e >= 0) {
            value = c * 10 ** uint256(e);
        } else {
            value = c / 10 ** uint256(-e);            
        }
        return value;
    }

    function tupleToVolume(uint256 volC, int256 volQ, uint256 divideC, uint256 decimals) private pure returns (uint256) {
        uint256 c = 2 * volC;
        uint256 ep = decimals;
        uint256 en = 12 + 1;
        if (volQ < 0) {
            en += uint256(-volQ);
        } else {
            ep += uint256(volQ);
        }
        uint256 value;              
        if (ep >= en) {
            value = c * 10 ** (ep - en);
        } else {
            value = c / 10 ** (en - ep);
        }
        value = value / divideC;
        return value;
    }

    /**
        @notice Calculates the ID of the order
        @param order the order to hash
    */
    function hashOrder(Order order) private pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                order.orderType,
                order.parity,
                SETTLEMENT_IDENTIFIER,
                order.expiry,
                order.tokens,
                order.priceC, order.priceQ,
                order.volumeC, order.volumeQ,
                order.minimumVolumeC, order.minimumVolumeQ,
                order.nonceHash
            )
        );
    }

    function settlementDetails(
        Order _buy,
        Order _sell,
        uint32 _buyToken,
        uint32 _sellToken
    ) private pure returns (uint256, uint256) {
        uint32 buyTokenDecimals = renExTokensContract.tokenDecimals(_buyToken);
        uint32 sellTokenDecimals = renExTokensContract.tokenDecimals(_sellToken);
        // Price midpoint
        (uint256 midPriceC, int256 midPriceQ) = priceMidPoint(_buy, _sell);
        (uint256 minVolC, int256 minVolQ, uint256 divideC) = minimumVolume(_buy, _sell, midPriceC, midPriceQ);
        uint256 lowTokenValue = tupleToScaledVolume(minVolC, minVolQ, midPriceC, midPriceQ, divideC, sellTokenDecimals);
        uint256 highTokenValue = tupleToVolume(minVolC, minVolQ, divideC, buyTokenDecimals);
        return (lowTokenValue, highTokenValue);
    }

    function getSettlementDetails(Order _buy, Order _sell) private pure returns (uint256, uint256, uint256, uint256, uint256) {
        uint32 buyToken = uint32(_sell.tokens);
        uint32 sellToken = uint32(_sell.tokens >> 32);
        (uint256 lowTokenValue, uint256 highTokenValue) = settlementDetails(
            _buy,
            _sell,
            buyToken,
            sellToken
        );
        uint256 lowTokenValueFinal = (lowTokenValue * (FEES_DENOMINATOR - FEES_NUMERATOR)) / FEES_DENOMINATOR;
        uint256 highTokenValueFinal = (highTokenValue * (FEES_DENOMINATOR - FEES_NUMERATOR)) / FEES_DENOMINATOR;
        uint256 midPrice = getMidPrice(_buyID, _sellID);
        return (midPrice, lowTokenValueFinal, highTokenValueFinal, lowTokenValue - lowTokenValueFinal, highTokenValue - highTokenValueFinal);
    }
}