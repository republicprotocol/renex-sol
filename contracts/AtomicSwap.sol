pragma solidity 0.4.24;

contract AtomicSwap {

    /********** STRUCTS *****************************************************/
    struct Swap {
        uint256 timelock;
        uint256 value;
        address ethTrader;
        address withdrawTrader;
        bytes32 secretLock;
        bytes32 secretKey;
    }

    /********** ENUMS *****************************************************/
    enum States {
        INVALID,
        OPEN,
        CLOSED,
        EXPIRED
    }

    /********** Storage *****************************************************/
    mapping (bytes32 => Swap) private swaps;
    mapping (bytes32 => States) private swapStates;
    mapping (bytes32 => bytes) public swapDetails;

    /********** Events *****************************************************/
    event Open(bytes32 _swapID, address _withdrawTrader, bytes32 _secretLock);
    event Expire(bytes32 _swapID);
    event Close(bytes32 _swapID, bytes _secretKey);

    /********** MODIFIERS *****************************************************/                    
    /**
    @notice Throws if the swap is not invalid 
    */
    modifier onlyInvalidSwaps(bytes32 _swapID) {
        require(swapStates[_swapID] == States.INVALID);
        _;
    }

    /**
    @notice Throws if the swap is not open 
    */
    modifier onlyOpenSwaps(bytes32 _swapID) {
        require(swapStates[_swapID] == States.OPEN);
        _;
    }

    /**
    @notice Throws if the swap is not closed 
    */
    modifier onlyClosedSwaps(bytes32 _swapID) {
        require(swapStates[_swapID] == States.CLOSED);
        _;
    }

    /**
    @notice Throws if the swap is not expirable 
    */
    modifier onlyExpirableSwaps(bytes32 _swapID) {
        require(now >= swaps[_swapID].timelock);
        _;
    }
    
    /**
    @notice Throws if the secret key is not valid
    */
    modifier onlyWithSecretKey(bytes32 _swapID, bytes32 _secretKey) {
        require(swaps[_swapID].secretLock == sha256(abi.encodePacked(_secretKey)));
        _;
    }

    /********** FUNCTIONS *****************************************************/                    
    /**
      * @notice Initiates the atomic swap
      *
      * @param _swapID The unique atomic swap id.
      * @param _withdrawTrader The address of the withdrawing trader.
      * @param _secretLock The hash of the secret (Hash Lock).
      * @param _timelock The unix timestamp when the swap expires.
    */
    function initiate(bytes32 _swapID, address _withdrawTrader, bytes32 _secretLock, uint256 _timelock) public onlyInvalidSwaps(_swapID) payable {
        // Store the details of the swap.
        Swap memory swap = Swap({
            timelock: _timelock,
            value: msg.value,
            ethTrader: msg.sender,
            withdrawTrader: _withdrawTrader,
            secretLock: _secretLock,
            secretKey: bytes32(0)
        });
        swaps[_swapID] = swap;
        swapStates[_swapID] = States.OPEN;
    }

    /**
      * @notice Redeems an atomic swap
      *
      * @param _swapID The unique atomic swap id.
      * @param _secretKey The secret of the atomic swap.
    */
    function redeem(bytes32 _swapID, bytes32 _secretKey) public onlyOpenSwaps(_swapID) onlyWithSecretKey(_swapID, _secretKey) {
        // Close the swap.
        Swap memory swap = swaps[_swapID];
        swaps[_swapID].secretKey = _secretKey;
        swapStates[_swapID] = States.CLOSED;

        // Transfer the ETH funds from this contract to the withdrawing trader.
        swap.withdrawTrader.transfer(swap.value);
    }

    /**
      * @notice Refunds an atomic swap
      *
      * @param _swapID The unique atomic swap id.
    */
    function refund(bytes32 _swapID) public onlyOpenSwaps(_swapID) onlyExpirableSwaps(_swapID) {
        // Expire the swap.
        Swap memory swap = swaps[_swapID];
        swapStates[_swapID] = States.EXPIRED;

        // Transfer the ETH value from this contract back to the ETH trader.
        swap.ethTrader.transfer(swap.value);
    }

    /**
      * @notice Audits an atomic swap
      *
      * @param _swapID The unique atomic swap id.
    */
    function audit(bytes32 _swapID) public view returns (uint256 timelock, uint256 value, address to, address from, bytes32 secretLock) {
        Swap memory swap = swaps[_swapID];
        return (swap.timelock, swap.value, swap.withdrawTrader, swap.ethTrader, swap.secretLock);
    }

    /**
      * @notice Audits the secret of an atomic swap
      *
      * @param _swapID The unique atomic swap id.
    */
    function auditSecret(bytes32 _swapID) public view onlyClosedSwaps(_swapID) returns (bytes32 secretKey) {
        Swap memory swap = swaps[_swapID];
        return swap.secretKey;
    }

    /**
      * @notice Checks whether a swap is refundable or not.
      *
      * @param _swapID The unique atomic swap id.
    */
    function refundable(bytes32 _swapID) public view returns (bool) {
        return (now >= swaps[_swapID].timelock && swapStates[_swapID] == States.OPEN);
    }

    /**
      * @notice Checks whether a swap is initiatable or not.
      *
      * @param _swapID The unique atomic swap id.
    */
    function initiatable(bytes32 _swapID) public view returns (bool) {
        return (swapStates[_swapID] == States.INVALID);
    }

    /**
      * @notice Checks whether a swap is redeemable or not.
      *
      * @param _swapID The unique atomic swap id.
    */
    function redeemable(bytes32 _swapID) public view returns (bool) {
        return (swapStates[_swapID] == States.OPEN);
    }
}