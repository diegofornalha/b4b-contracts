import { ethers } from "ethers";
import { JsonRpcProvider, JsonRpcBatchProvider, InfuraProvider } from '@ethersproject/providers';

import { getContractsForChainOrThrow, ChainId, OrderType } from "../src";

require('dotenv').config();


async function generateOrders() {
    // const url = "https://aurora-testnet.infura.io/v3/39f6b87b938e4c6bb51e8691c17c0492";
    const url = "https://testnet.aurora.dev";
    const provider = new JsonRpcProvider(url);

    //________Create Order______________

    const brand = new ethers.Wallet(process.env.BRAND2_PRIVATE_KEY!, provider);
    const contracts = getContractsForChainOrThrow(ChainId.AuroraTestnet, brand);

    const txAprove = await contracts.usdcContract.approve(contracts.b4bContract.address, ethers.constants.MaxUint256);
    await txAprove.wait();

    // const nonce = await provider.getTransactionCount(brand.address);
    // console.log("🚀 ~ file: createWallet.ts ~ line 23 ~ generateOrders ~ nonce", nonce, brand.address);
    // Create 100 orders
    const helpedArray = Array.from(Array(1)).map((i, index) => index);
    for (const index of helpedArray) {
        // set price here in USDC
        const priceRaw = "100";
        const price = ethers.utils.parseUnits(priceRaw, "ether");

        // set influencer id
        // const INFLUENCER_ID = process.env.INFLUENCER2_UID || "2";
        const INFLUENCER_ID = "1000";

        // release date
        let releaseDate = new Date("2022-10-28T14:30:00.000Z").getTime();
        releaseDate = Math.floor(releaseDate / 1000);
        

        // get hash fro API here
        const hash = ethers.utils.sha256(ethers.utils.toUtf8Bytes("test_hash"));
        // const hash = `0x${hash_}`;
        const hashBuffer = ethers.utils.arrayify(hash);

        try {
            // create order in blockchain
            const txCreateOrder = await contracts.b4bContract.createOrder(
                INFLUENCER_ID, 
                OrderType.PostPin,
                releaseDate,
                price,
                hashBuffer,
                // {
                //     nonce: nonce + index
                // }
            );
            const receipt = await txCreateOrder.wait();
            console.log("orderId", receipt.events![0].args?.orderId.toHexString());
        } catch(err) {
            console.log(err);
        } 
    }
}

generateOrders()
    .then(() => {
        console.log("Finished");
    });