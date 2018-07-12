pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "republic-sol/contracts/Orderbook.sol";
import "republic-sol/contracts/Settlement.sol";
import "republic-sol/contracts/SettlementUtils.sol";

import "./RenExBalances.sol";
import "./RenExTokens.sol";

/**
@title The contract responsible for holding trader funds and settling matched
order values
@author Republic Protocol
*/
contract RenExSettlement is Ownable, Settlement {
    using SafeMath for uint256;

    /**
      * @notice Fees are in RenEx are 0.2% and to represent this in integers it
      * is broken into a numerator and denominator.
      */
    uint256 constant public DARKNODE_FEES_NUMERATOR = 2;
    uint256 constant public DARKNODE_FEES_DENOMINATOR = 1000;

    uint32 constant public RENEX_SETTLEMENT_ID = 1;
    uint32 constant public RENEX_ATOMIC_SETTLEMENT_ID = 2;

    Orderbook public orderbookContract;
    RenExTokens public renExTokensContract;
    RenExBalances public renExBalancesContract;

    uint256 public submissionGasPriceLimit;

    enum OrderType {Midpoint, Limit}
    enum OrderParity {Buy, Sell}
    enum OrderStatus {None, Submitted, Matched}

    struct MatchDetails {
        uint256 lowTokenVolume;
        uint256 highTokenVolume;
        uint32 lowToken;
        uint32 highToken;
        address lowTokenAddress;
        address highTokenAddress;
    }

    // Events
    event Transfer(address from, address to, uint32 token, uint256 value);
    event OrderbookUpdates(Orderbook previousOrderbook, Orderbook nextOrderbook);
    event RenExBalancesUpdates(RenExBalances previousRenExBalances, RenExBalances nextRenExBalances);
    event SubmissionGasPriceLimitUpdates(uint256 previousSubmissionGasPriceLimit, uint256 nextSubmissionGasPriceLimit);

    // Order Storage
    mapping(bytes32 => SettlementUtils.OrderDetails) public orderDetails;
    mapping(bytes32 => OrderStatus) public orderStatus;
    mapping(bytes32 => address) public orderTrader;
    mapping(bytes32 => address) public orderSubmitter;
    // Match storage
    mapping(bytes32 => MatchDetails) public matchDetails;


    /**
      * @notice constructor
      *
      * @param _orderbookContract The address of the Orderbook contract.
      * @param _renExBalancesContract The address of the RenExBalances
      *                               contract.
      * @param _renExTokensContract The address of the RenExTokens contract.
      */
    constructor(
        Orderbook _orderbookContract,
        RenExTokens _renExTokensContract,
        RenExBalances _renExBalancesContract,
        uint256 _submissionGasPriceLimit
    ) public {
        orderbookContract = _orderbookContract;
        renExTokensContract = _renExTokensContract;
        renExBalancesContract = _renExBalancesContract;
        submissionGasPriceLimit = _submissionGasPriceLimit;
    }

    /********** UPDATER FUNCTIONS *********************************************/

    function updateOrderbook(Orderbook _newOrderbookContract) public onlyOwner {
        emit OrderbookUpdates(orderbookContract, _newOrderbookContract);
        orderbookContract = _newOrderbookContract;
    }

    function updateRenExBalances(RenExBalances _newRenExBalancesContract) public onlyOwner {
        emit RenExBalancesUpdates(renExBalancesContract, _newRenExBalancesContract);
        renExBalancesContract = _newRenExBalancesContract;
    }

    function updateSubmissionGasPriceLimit(uint256 _newSubmissionGasPriceLimit) public onlyOwner {
        emit SubmissionGasPriceLimitUpdates(submissionGasPriceLimit, _newSubmissionGasPriceLimit);
        submissionGasPriceLimit = _newSubmissionGasPriceLimit;
    }

    /********** MODIFIERS *****************************************************/

    modifier withGasPriceLimit(uint256 gasPriceLimit) {
        require(tx.gasprice <= gasPriceLimit, "gas price too high");
        _;
    }

    /********** WITHDRAWAL FUNCTIONS ******************************************/

    function traderCanWithdraw(address _trader, address _token, uint256 amount) public returns (bool) {
        // In the future, this will return false (i.e. invalid withdrawal) if the
        // trader has open orders for that token
        return true;
    }


   /**
      * @notice Stores the details of an order
      * @param _orderType one of Midpoint or Limit
      * @param _parity one of Buy or Sell
      * @param _expiry the expiry date of the order in seconds since Unix epoch
      * @param _tokens two 32-bit token codes concatenated (with the lowest first)
      * @param _priceC the constant in the price tuple
      * @param _priceQ the exponent in the price tuple
      * @param _volumeC the constant in the volume tuple
      * @param _volumeQ the exponent in the volume tuple
      * @param _minimumVolumeC the constant in the minimum-volume tuple
      * @param _minimumVolumeQ the exponent in the minimum-volume tuple
      * @param _nonceHash the keccak256 hash of a random 32 byte value
      */
    function submitOrder(
        uint32 _settlementID,
        uint8 _orderType,
        uint8 _parity,
        uint64 _expiry,
        uint64 _tokens,
        uint16 _priceC, uint16 _priceQ,
        uint16 _volumeC, uint16 _volumeQ,
        uint16 _minimumVolumeC, uint16 _minimumVolumeQ,
        uint256 _nonceHash
    ) public withGasPriceLimit(submissionGasPriceLimit) {
        SettlementUtils.OrderDetails memory order = SettlementUtils.OrderDetails({
            settlementID: _settlementID,
            orderType: _orderType,
            parity: _parity,
            expiry: _expiry,
            tokens: _tokens,
            priceC: _priceC, priceQ: _priceQ,
            volumeC: _volumeC, volumeQ: _volumeQ,
            minimumVolumeC: _minimumVolumeC, minimumVolumeQ: _minimumVolumeQ,
            nonceHash: _nonceHash
        });

        storeOrder(order);
    }

    function storeOrder(SettlementUtils.OrderDetails order) internal {
        bytes32 orderID = SettlementUtils.hashOrder(order);

        orderSubmitter[orderID] = msg.sender;

        require(orderStatus[orderID] == OrderStatus.None, "order already submitted");
        orderStatus[orderID] = OrderStatus.Submitted;

        require(orderbookContract.orderState(orderID) == 2, "uncofirmed order");

        orderTrader[orderID] = orderbookContract.orderTrader(orderID);

        // (not needed? - orderbookContract.orderState can't be 2 if it fails)
        // require(order.trader != 0x0, "null order trader");

        orderDetails[orderID] = order;
    }

    /**
      * @notice Settles two orders that are matched. `submitOrder` must have been
      * called for each order before this function is called.
      *
      * @param _buyID the 32 byte ID of the buy order
      * @param _sellID the 32 byte ID of the sell order
      */
    function submitMatch(bytes32 _buyID, bytes32 _sellID) public {
        require(orderStatus[_buyID] == OrderStatus.Submitted, "invalid buy status");
        require(orderStatus[_sellID] == OrderStatus.Submitted, "invalid sell status");

        // Verify details
        SettlementUtils.verifyOrder(orderDetails[_buyID]);
        SettlementUtils.verifyOrder(orderDetails[_sellID]);
        SettlementUtils.verifyMatch(orderDetails[_buyID], orderDetails[_sellID]);

        require(orderbookContract.orderMatch(_buyID)[0] == _sellID, "invalid order pair");

        uint32 buyToken = uint32(orderDetails[_sellID].tokens);
        uint32 sellToken = uint32(orderDetails[_sellID].tokens >> 32);

        require(renExTokensContract.tokenIsRegistered(buyToken), "unregistered buy token");
        require(renExTokensContract.tokenIsRegistered(sellToken), "unregistered sell token");

        (uint256 lowTokenVolume, uint256 highTokenVolume) = SettlementUtils.settlementDetails(
            orderDetails[_buyID],
            orderDetails[_sellID],
            renExTokensContract.tokenDecimals(buyToken),
            renExTokensContract.tokenDecimals(sellToken)
        );

        address highTokenAddress = renExTokensContract.tokenAddresses(buyToken);
        address lowTokenAddress = renExTokensContract.tokenAddresses(sellToken);

        bytes32 matchID = keccak256(abi.encodePacked(_buyID, _sellID));
        matchDetails[matchID] = MatchDetails({
            lowTokenVolume: lowTokenVolume,
            highTokenVolume: highTokenVolume,
            lowToken: sellToken,
            highToken: buyToken,
            lowTokenAddress: lowTokenAddress,
            highTokenAddress: highTokenAddress
        });

        // Note: verifyMatch checks that the buy and sell settlement IDs match
        uint32 settlementID = orderDetails[_buyID].settlementID;
        if (settlementID == RENEX_ATOMIC_SETTLEMENT_ID) {
            // Pay darknode fees
            payFees(_buyID, _sellID);
        } else if (settlementID == RENEX_SETTLEMENT_ID) {
            // Settle funds
            settleFunds(_buyID, _sellID);
        } else {
            revert("invalid settlement id");
        }

        orderStatus[_buyID] = OrderStatus.Matched;
        orderStatus[_sellID] = OrderStatus.Matched;
    }

    function payFees(
        bytes32 _buyID, bytes32 _sellID
    ) private {
        bytes32 matchID = keccak256(abi.encodePacked(_buyID, _sellID));

        uint256 fee;
        address tokenAddress;
        if (isEthereumBased(matchDetails[matchID].highTokenAddress)) {
            tokenAddress = matchDetails[matchID].highTokenAddress;
            (,fee) = subtractDarknodeFee(matchDetails[matchID].highTokenVolume);
        } else if (isEthereumBased(matchDetails[matchID].lowTokenAddress)) {
            tokenAddress = matchDetails[matchID].lowTokenAddress;
            (,fee) = subtractDarknodeFee(matchDetails[matchID].lowTokenVolume);
        } else {
            return;
        }
        renExBalancesContract.decrementBalanceWithFee(orderTrader[_buyID], tokenAddress, 0, fee, orderSubmitter[_buyID]);
        renExBalancesContract.decrementBalanceWithFee(orderTrader[_sellID], tokenAddress, 0, fee, orderSubmitter[_sellID]);
    }

    /**
     * @notice (private) Calls the RenExBalances contract to update the balances
     */
    function settleFunds(
        bytes32 _buyID, bytes32 _sellID
    ) private {
        bytes32 matchID = keccak256(abi.encodePacked(_buyID, _sellID));

        (uint256 lowTokenFinal, uint256 lowTokenFee) = subtractDarknodeFee(matchDetails[matchID].lowTokenVolume);
        (uint256 highTokenFinal, uint256 highTokenFee) = subtractDarknodeFee(matchDetails[matchID].highTokenVolume);

        // Subtract values
        renExBalancesContract.decrementBalanceWithFee(
            orderTrader[_buyID], matchDetails[matchID].lowTokenAddress, lowTokenFinal, lowTokenFee, orderSubmitter[_buyID]
        );
        renExBalancesContract.decrementBalanceWithFee(
            orderTrader[_sellID], matchDetails[matchID].highTokenAddress, highTokenFinal, highTokenFee, orderSubmitter[_sellID]
        );

        // Add values
        renExBalancesContract.incrementBalance(orderTrader[_sellID], matchDetails[matchID].lowTokenAddress, lowTokenFinal);
        renExBalancesContract.incrementBalance(orderTrader[_buyID], matchDetails[matchID].highTokenAddress, highTokenFinal);
    }

    function getTokenAddress(uint32 _token) private view returns (address) {
        return renExTokensContract.tokenAddresses(_token);
    }

    function isEthereumBased(address _tokenAddress) private pure returns (bool) {
        return (_tokenAddress != address(0x0));
    }

    function subtractDarknodeFee(uint256 value) internal pure returns (uint256, uint256) {
        uint256 newValue = (value * (DARKNODE_FEES_DENOMINATOR - DARKNODE_FEES_NUMERATOR)) / DARKNODE_FEES_DENOMINATOR;
        return (newValue, value - newValue);
    }
}