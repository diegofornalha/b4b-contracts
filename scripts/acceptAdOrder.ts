// import { wrapProvider, ClientConfig } from '@account-abstraction/sdk'
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import { getContractsForChainOrThrow, createIdentityCertificate, OrderType, wrapProvider, getB4BContractReadOnly, PimlicoPaymasterAPI, BiconomyPaymasterAPI } from "../src";
import { SimpleAccount__factory} from "@account-abstraction/contracts";

require('dotenv').config();

async function main() {
    const [deployer] = await ethers.getSigners();

    const INFLUENCER_ID = 0xffff00;
    const ENTRY_POINTS_ADDRESS = "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789"

    const provider = ethers.provider;

    const influencer = new Wallet(process.env.INFLUENCER_PRIVATE_KEY!, provider);
    console.log(influencer.address);

    const chainId = await influencer.getChainId();
    console.log("ChainId ", chainId);

    const b4bContractReadOnly = getB4BContractReadOnly(chainId, provider);

    const pimlicoApiKey = "bae3522a-c50e-4a69-9d51-314045898744";
    const chain = "base-goerli";
    const pimlicoEndpoint = `https://api.pimlico.io/v1/${chain}/rpc?apikey=${pimlicoApiKey}`;
    const paymaster = new PimlicoPaymasterAPI(ENTRY_POINTS_ADDRESS, pimlicoEndpoint);

    // const paymasterURL = `https://paymaster.biconomy.io/api/v1/${chainId}/${process.env.BICONOMY_PAYMASTER_KEY}`;
    // const paymasterURL = `https://paymaster.biconomy.io/api/v1/59140/DUkKFm3Ub.9e6ef52e-07f2-4b8d-aa66-a4eb3813a41f`;
    // const paymasterURL = "https://paymaster.biconomy.io/api/v1/80001/V2oRiB5Z0.c6036d82-274e-4a9d-bd27-ed798db713ed";

    // const paymaster = new BiconomyPaymasterAPI(paymasterURL);

    const config = {
        entryPointAddress: ENTRY_POINTS_ADDRESS,
        // bundlerUrl: `https://bundler.biconomy.io/api/v2/${chainId}/abc`,
        bundlerUrl: pimlicoEndpoint,
        walletAddress: await b4bContractReadOnly.getInfluencerAccount(INFLUENCER_ID),
        paymasterAPI: paymaster
    };

    console.log(config.walletAddress);
    
    const aaInfluencer = await wrapProvider(provider, config, influencer);
    const contracts = getContractsForChainOrThrow(chainId, aaInfluencer.getSigner());

    const ORDER_ID = 1;

    const campaign = await contracts.b4bContract.getCampaign(ORDER_ID);
    console.log(campaign);

    // const gas = await contracts.b4bContract.estimateGas.completeOrder(ORDER_ID);
    // console.log(gas);

    // const gasPrice = await provider.getGasPrice();
    // console.log(gasPrice);

    // console.log("Here");
    // try {
    //     const tx = await contracts.b4bContract.completeOrder(ORDER_ID, {
    //         gasLimit: gas.mul(2),
    //         gasPrice
    //     });
    //     console.log("Tx", tx);
    //     const res = await aaInfluencer.waitForTransaction(tx.hash, 2, 100000);
    //     console.log(res);
    // } catch(err) {
    //     console.log("Err", err);
    // }
}

main()
    .then(() => {
        console.log("Finished!");
    });