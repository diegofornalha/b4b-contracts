# ETH GLOBAL

During this hackathon we added Smart Accounts bounded to ID tokens of influencers that follows ERC-4337. 
You can find them here
```
contracts/aa
```

All wrappers and function to use them:
```
src/aa
```

We deployed our contracts to Base, Goerli, Linea Testnet, Mumbai, Chiado

Addresses of all deployed contracts can be found here:
```
src/addresses.json
```

## Biconomy 

We used Biconomy Bundeler to send UserOperations and Paymaster to cover gas for influencers' transactions to B4B protocol.

Name of our dapp on Biconomy Dashboard (https://dashboard.biconomy.io/) - B4BGoerli


# B4B Project

Install package:
```shell
npm i @b4b-world/b4b-contracts
```

Get ```Signer``` from ```ethers``` package (frontend):
```typescript
const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
await provider.send("eth_requestAccounts", []);
const signer = provider.getSigner();
```

Get ```Signer``` on backend (example for Aurora testnet):
```typescript
const url = "https://testnet.aurora.dev";
const provider = new JsonRpcProvider(url);
const privateKey = process.env.PRIVATE_KEY;

const signer = new ethers.Wallet(privateKey, provider);
```

Get contracts for given network:

```typescript
import { getContractsForChainOrThrow,  ChainId } from "@b4b-world/b4b-contracts";

const contracts = getContractsForChainOrThrow(ChainId.AuroraTestnet, signer)
```

```B4B``` is a main protocol contract, it creates ad campaigns, approves bookings and etc.

It is needed to increase allowance of USDC token for B4B contract.


[Caller - Brand] Create order:
```typescript
const priceRaw = "100";
const price = ethers.utils.parseUnits(priceRaw, "ether");
const priceWithFee = previewPriceWithFee(price);
const txAprove = await contracts.usdcContract.approve(contracts.b4bContract.address, priceWithFee);
await txAprove.wait();


let validReleaseDate = new Date("2022-10-23T00:00:00.000Z").getTime();
validReleaseDate = Math.floor(releaseDate / 1000); // timestamp in seconds
const hashBytes = ethers.utils.arrayify(hash_as_hex_string_with_0x_prefix);
const tx = await contracts.b4bContract.createOrder(INFLUENCER_ID, OrderType.Post, validReleaseDate, hashBytes);
await tx.wait();
```

[Caller - Influencer] Accept order:
```typescript
const tx = await contracts.b4bContract.acceptOrder(ORDER_TYPE_0_ID);
await tx.wait();
```

[Caller - Influencer] Reject order:
```typescript
const tx = await contracts.b4bContract.rejectOrder(ORDER_TYPE_0_ID);
await tx.wait();
```

[Caller - Influencer] Reject order:
```typescript
const tx = await contracts.b4bContract.completeOrder(ORDER_TYPE_0_ID);
await tx.wait();
```

[Caller - Brand] Reject order:
```typescript
const tx = await contracts.b4bContract.aproveResult(ORDER_TYPE_0_ID, score);
await tx.wait();
```

```UniqueIdentity``` - NFT identity of influencer

[Caller - admin] Mint identity to influencer with address ```influencerAddr```
```typescript
const tx = await contracts.uniqueIdentityContract.mint(influencerAddr);
await tx.wait();
```


```B4BCoin``` - ERC20 token that can be changed to USDC

Swap B4B Coins to USDC (Burn B4B Coins + Redeem)
```typescript
const tx = await contracts.b4bCoinContract.redeem(coinsToRedeem, userAddress, userAddress);
await tx.wait();
```

Swap USDC to B4B Coins (Burn B4B Coins + Redeem)
```typescript
const tx = await contracts.b4bCoinContract.withdraw(assets, userAddress, userAddress);
await tx.wait();
```

Preview number of USDC tokens that user will get in exchange for ```coinsToRedeem``` B4BCoins:
```typescript
const assets = await contracts.b4bCoinContract.previewRedeem(sharcoinsToRedeem);
```

Preview number of B4BCoins that user will get in exchange for ```assets``` USDC tokens:
```typescript
const assets = await contracts.b4bCoinContract.previewWithdraw(assets);
```

```CoinsController``` - ERC20 token that can be changed to USDC
Get number of B4BCoin on the user's wallet:
 ```typescript
const assets = await contracts.b4bCoin.balanceOf(userAddress);
```

Preview number of B4BCoins that influencer with unique id ```uid``` can claim:
 ```typescript
const assets = await contracts.b4bContract.previewCoinsOf(uid);
```

Claim B4B Coins for the influencer with unique id ```uid```:
[Caller - Influencer]
 ```typescript
const tx = await contracts.b4bContract.claimCoins(uid);
await tx.wait()
```
