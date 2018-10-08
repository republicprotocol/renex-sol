# Atomic Swap

The Atomic Swap is an Ethereum smart contract used to swap tokens cross-chain.

For easier understanding of the concept of atomic swaps, let's look at an example. Assume that Alice has 100 Ether, and she wants to trade it for 10 Bitcoin, and Bob has 10 Bitcoin that he wants to trade for 100 Ether. They decide to do an atomic swap as they do not trust each other to hold their end of the bargain.

At this point in time the match is found, Alice and Bob know each others' order ids.

**(1) Alice & Bob Communicate Information**
  Bob generates a secret, and the timelock (this should be 48 hours from this point in time). He sends the secret hash, timelock, his sendToAddress(Bitcoin) and receiveFromAddress(Ethereum) to Alice. Alice receives these details, and will send her sendToAddress(Ethereum) and receiveFromAddress(Bitcoin) to Alice. This communication happens via RenEx Ingress (this guarantees the KYC status of both the traders, if one of them acts maliciously at this step RenEx can 
  find the malicious party and punish him/her).

**(2) Bob Initiates**
  Bob uses the previously generated secret hash, time lock to initiate the atomic swap for 10 Bitcoin to Alice's sendToAddress on the Bitcoin Blockchain. He does this by creating a Bitcoin script, that can be redeemed by Alice to get the 10 Bitcoins or expires in 48 hours refunding his Bitcoins.

**(3) Alice Audits**
  Alice recreates the Bitcoin script with the information she received during the information communication process (secret hash, timelock, her sendToAddress, and Bob's receiveFromAddress). Then she derives the Bitcoin 
  script address of this script and checks whether this address' balance is as expected (10 Bitcoins).

**(4) Alice Initiates**
  If the audit is successful, Alice initiates an atomic swap on Ethereum for 100 Ether to Bob's sendToAddress with the hash she received during the initial information communication step, and sets the expiry to be 24 hours less than that of the timelock she received. Alice generates a swap ID which is deterministically generated from the secret hash and the timelock (abi encoded keccak256 hash) she received during the communication process in step 1. This makes sure that Alice will ever initiate one atomic swap for a corresponding atomic swap on the other Blockchain. Alice does this by calling `initiate(bytes32 _swapID, address _withdrawTrader, bytes32 _secretLock, uint256 _timelock)` and setting the value to be 100 Ether on the RenExAtomicSwapper contract. The RenExAtomicSwapper makes sure that only one swap can be generated for a single swap id.
  
**(5) Bob Audits Swap Details**
    Bob calculates the swap ID which is deterministically generated from the timelock and secret hash (abi encoded keccak256 hash) that he sent during the communication step. Bob audits the swap details by calling `audit(bytes32 _swapID)` on the RenExAtomicSwapper contract. 

**(6) Bob Redeems**
  If the audit is successful,  Bob redeems the atomic swap on Ethereum by calling `redeem(bytes32 _swapID, bytes32 _secret)` on the RenExAtomicSwapper contract. In the process exposing the secret, he generated during step 1 and gets 100 Ether.

**(7) Alice Audits Secret**
  Alice audits the secret on the Ethereum blockchain by calling `auditSecret(bytes32 _swapID)` on the RenExAtomicSwapper contract. 
  
**(8) Alice Redeems**
  Alice redeems the atomic swap on the Bitcoin blockchain, using the secret received from the RenExAtomicSwapper contract and receives 10 Bitcoins.

## Alternative Executions
* If Bob does not initiate in step 2, then the atomic swap will not happen.

* If Alice does not initiate in step 4, then Bob will be able to refund his Bitcoins after the swap expires(which is 48 hours in this case). 

* If Bob does not redeem in step 6, then Alice and Bob will be able to refund and get their tokens back after they expire(in 24 hours and 48 hours in this case).

As one can see, it is not possible to lose tokens in this process, the worst that could happen is that the swap does not go through, and the trader's tokens get locked up for a while.

## Timeline

**(1) Matched**
The orders of Alice and Bob are matched at this state, and the atomic swap process has not started yet, this is the *Matched* state of the atomic swap. From this point, Alice and Bob have 24 hours to send their information to the other party.

**(2) Information Communicated**
The participants receive the information required to initiate an atomic swap, and the atomic swap goes into the *Information Communicated* state. The participant sending the higher priority token has 24 hours to initiate the atomic swap on their blockchain.

**(3) Requestor Initiated**
The trader sending the higher priority token is called the requestor, and once the requestor gets all the information he needs, he initiates the atomic swap with an expiry of 48 hours on the requestor's blockchain. The atomic swap is now in the *Requestor Initiated* state.

**(4) Responder Initiated**
The trader sending the lower priority token is called the responder, and once he audits the atomic swap details of the requestor.  He initiates an atomic swap on the responder's blockchain. The atomic swap is now in the *Responder Initiated* state.

**(5) Requestor Redeemed**
The requestor audits the atomic swap initiated by the responder if the audit is successful then he redeems the atomic swap on the responder's blockchain using the secret he generated during the initiation process. The requestor gets the responder's tokens. The atomic swap enters the *Requestor Redeemed* state.

**(6) Responder Redeemed**
The responder audits the secret on the responder's blockchain and redeems the atomic swap on the requestor's blockchain. The responder successfully gets the requestor's tokens. The atomic swap enters the final state *Responder Redeemed* or *Completed*.


## Warning

* The requestor should initiate within 24 hours of receiving the swap information, failure to do so will result in a fine from RenEx and might result in black listing from the exchange. This will **not** result in loss of funds. 
* The responder should initiate as soon as possible, as the more delay they make the shorter is the time for the responder to redeem. This will **not** result in loss of funds. 
* The requestor should redeem the atomic swap before it expires (they should have around 24 hours to do so), failure to do so will result in a fine from RenEx and might result in black listing from the exchange. This will **not** result in loss of funds. 
* The responding trader should refund their atomic swap within 24 Hours of expiry. This may result in loss of funds.