# Atomic Swap

The Atomic Swap is an Ethereum smart contract used to swap tokens cross-chain.

For easier understanding of the concept of atomic swaps, let's look at an example. Assume that Alice has 100 Ether, and she wants to trade it for 10 Bitcoin, and Bob has 10 Bitcoin that he wants to trade for 100 Ether. They decide to do an atomic swap as they do not trust each other to hold their end of the bargain.

According to the priority order of the tokens defined by Republic Protocol(???), Bitcoin should go first.

1. Alice sends her Bitcoin Address to Bob, and Bob sends his ethereum address to Alice. 

2. Bob generates a secret, hashes it and uses the hash to initiate an atomic swap for 10 Bitcoin to Alice's Bitcoin Address. He sets the expiry to be around 48 hours.

3. Bob sends the transaction information to Alice.

4.  Alice audits the transaction, to check whether the redeemer address is correct, the number of bitcoins is as expected. 

5. If the audit is successful,  Alice initiates an atomic swap on ethereum for 100 Ether to Bob's ethereum address with the same hash and sets the expiry to be 24 hours.

6. Alice sends the transaction information to Bob.

7. Bob audits the transaction, to check whether the redeemer address is correct, the number of ether is as expected and the hash is the same as the one he used. 

8.  If the audit is successful,  Bob redeems the atomic swap on ethereum and get's the 100 ether releasing the secret.

9. Alice audits the secret on the ethereum blockchain and redeems the swap on the bitcoin blockchain getting 10 bitcoins.


Alternative executions:
* If Bob does not initiate in step 2, then the atomic swap will not happen.

* If Alice does not initiate in step 5, then Bob will be able to refund his bitcoins after the swap expires. 

* If Bob does not redeem in step 8, the Alice and Bob will be able to refund and get their tokens back after they expire.

As one can see, it is not possible to lose tokens in this process, the worst that could happen is that the swap does not go through, and the trader's tokens get locked up for a while.

Timeline:

**(1) Matched**
The orders of Alice and Bob are matched at this state, and the atomic swap process has not started yet, this is the *Matched* state of the atomic swap. From this point, Alice and Bob have 24 hours to send their information to the other party.

**(2) Information Sent**
The participants receive the information required to initiate an atomic swap, and the atomic swap goes into the *Information Sent* state. The participant sending the higher priority token has 24 hours to initiate the atomic swap on their blockchain.

**(3) Requestor Initiated**
The trader sending the higher priority token is called the requestor, and once the requestor gets all the information he needs, he initiates the atomic swap with an expiry of 48 hours on the requestor's blockchain. The atomic swap is now in the *Requestor Initiated* state.

**(4) Responder Initiated**
The trader sending the lower priority token is called the responder, and once he audits the atomic swap details of the requestor.  He initiates an atomic swap on the responder's blockchain. The atomic swap is now in the *Responder Initiated* state.

**(5) Requestor Redeemed**
The requestor audits the atomic swap initiated by the responder if the audit is successful then he redeems the atomic swap on the responder's blockchain using the secret he generated during the initiation process. The requestor gets the responder's tokens. The atomic swap enters the *Requestor Redeemed* state.

**(6) Responder Redeemed**
The responder audits the secret on the responder's blockchain and redeems the atomic swap on the requestor's blockchain. The responder successfully gets the requestor's tokens. The atomic swap enters the final state *Responder Redeemed* or *Completed*.

(Refund States ??)







