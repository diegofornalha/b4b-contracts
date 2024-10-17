import { Wallet } from "ethers";
import { JsonRpcProvider } from '@ethersproject/providers';
import { ethers } from "hardhat";

import { getContractAddressesForChainOrThrow, getContractsForChainOrThrow, ChainId, previewPriceWithFee, OrderType } from "../src";

require('dotenv').config();

async function main() {
    // const url = "https://testnet.aurora.dev";
    const provider = new JsonRpcProvider(process.env.AURORA_PLUS_MINTER_URL);
    const privateKey = process.env.AURORA_MINTER_PRIVATE_KEY!;
    const wallet = new ethers.Wallet(privateKey, provider);

    // const [deployer] = await ethers.getSigners();

    // _________Mint Unique Identity_____

    const addresses = getContractAddressesForChainOrThrow(ChainId.AuroraMainnet);
    const UniqueIdentity = await ethers.getContractFactory("UniqueIdentity");
    const identityContract = UniqueIdentity.attach(addresses.UniqueIdentity);

    const mintToAddr = "0x60053174d35B342614C9C978023599EdF65203a1";
    const tx = await identityContract.connect(wallet).mint(mintToAddr);
    const receipt = await tx.wait();

    console.log(receipt.events![0].args, mintToAddr);
}

main()
    .then(() => {
        console.log("Finished");
    });