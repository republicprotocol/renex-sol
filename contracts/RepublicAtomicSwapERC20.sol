// pragma solidity ^0.4.18;

// import "./ERC20.sol";

// contract RepublicAtomicSwapERC20 {

//   struct Swap {
//     address to;
//     address from;
//     uint value;
//     uint time;
//     bytes32 secretKey;
//     address contractAddress;
//   }

//   enum states { FIRST_DEPOSIT, SECOND_DEPOSIT, FIRST_WITHDRAWAL, SECOND_WITHDRAWAL, CLOSED }
//   mapping (bytes32 => states) status;
//   mapping (bytes32 => Swap) lockbox;

//   function deposit(address to, bytes32 secretLock, address contractAddress, uint value, bool interContract) public {
//     require(status[secretLock] == states.FIRST_DEPOSIT || status[secretLock] == states.SECOND_DEPOSIT);
//     bytes32 swapHash = sha256(to, secretLock);

//     ERC20 erc20 = ERC20(contractAddress);
//     require(value <= erc20.allowance(msg.sender, address(this)));
//     require(erc20.transferFrom(msg.sender, address(this), value));
    
//     lockbox[swapHash].to = to;
//     lockbox[swapHash].from = msg.sender;
//     lockbox[swapHash].value = value;
//     lockbox[swapHash].time = now;
//     lockbox[swapHash].secretKey = 0x0;
//     lockbox[swapHash].contractAddress = contractAddress;
//     if (status[secretLock] == states.SECOND_DEPOSIT || interContract) {
//       status[secretLock] = states.FIRST_WITHDRAWAL;
//     } else {
//       status[secretLock] = states.SECOND_DEPOSIT;
//     }
//     return;
//   } 

//   function testStates() public view returns (bool) {
//     return status[sha256(msg.sender)] == states.FIRST_DEPOSIT;
//   }

//   function peek(bytes32 secretLock) public constant returns (address, address, uint, uint, address) {
//     bytes32 swapHash = sha256(msg.sender, secretLock);
//     return (lockbox[swapHash].to, lockbox[swapHash].from, lockbox[swapHash].value, lockbox[swapHash].time - now, lockbox[swapHash].contractAddress);
//   }

//   function peekSecretKey(bytes32 secretLock) public constant returns (bytes32) {
//    bytes32 swapHash = sha256(msg.sender, secretLock);
//    return lockbox[swapHash].secretKey;
//   }


//   function withdraw(bytes32 secretKey) public {
//     bytes32 secretLock = sha256(secretKey);
//     require(status[secretLock] == 1 || status[secretLock] == 2);
//     bytes32 swapHash = sha256(msg.sender, secretLock);
//     Swap memory swap = lockbox[swapHash];
//     ERC20 erc20 = ERC20(swap.contractAddress);
//     require(erc20.transfer(swap.to, swap.value));
//     bytes32 withdrawerSwapHash = sha256(swap.from, secretLock);
//     lockbox[swapHash].value = 0;
//     lockbox[withdrawerSwapHash].secretKey = secretKey;
//     status[secretLock]++;
//   }


//   function expire(bytes32 secretLock, address to) public {
//     require(status[secretLock] == 1);
//     require(now - lockbox[secretLock].time >= 1 minutes);
//     Swap memory swapID;
//     swapID.secretLock = secretLock;
//     swapID.to = to;
//     bytes32 swapHash = sha256(swapID);
//     Swap memory swap = lockbox[swapHash];
//     ERC20 erc20 = ERC20(swap.contractAddress);
//     require(erc20.transfer(swap.from, swap.value));
//     lockbox[swapHash].value = 0;
//     // status[secretLock] = 4;
//   }

// }
