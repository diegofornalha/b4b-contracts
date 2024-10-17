// import { wrapProvider, ClientConfig } from '@account-abstraction/sdk'
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { getContractsForChainOrThrow, createIdentityCertificate, OrderType } from "../src";

require('dotenv').config();

async function main() {
    const ORDER_ID = 0xffff00;
    const HASH = ethers.utils.id('UNIQUE_DATA');
    const [brand] = await ethers.getSigners();
    const chainId = await brand.getChainId();
    
    const contracts = await getContractsForChainOrThrow(chainId, brand);

    const inflAccount = process.env.INFLUENCER_ADDRESS!;

    const certificate = await createIdentityCertificate(
        inflAccount,
        ORDER_ID,
        brand
    );

    console.log(certificate);
    console.log(HASH);
    console.log(Math.floor(Date.now() / 1000) + 5 * 60);

    const gasPrice = await ethers.provider.getGasPrice();
    console.log(gasPrice);

    const tx_ = await contracts.usdcContract.approve(
        contracts.b4bContract.address,
        ethers.utils.parseUnits('115', 6)
    );
    await tx_.wait();

    const tx = await contracts.b4bContract.createOrderWithCertificate(
        OrderType.Post,
        Math.floor(Date.now() / 1000) + 5 * 60,
        ethers.utils.parseUnits('100', 6),
        HASH,
        certificate
    );

    const res = await tx.wait();
    console.log(res.events);
}

main()
    .then(() => {
        console.log("Finished!");
    })