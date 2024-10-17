import { JsonRpcProvider } from '@ethersproject/providers';
import { EventListener, ChainId } from "../src";

async function main() {
    // const url = "https://rpc.chiadochain.net/";
    // const url = "https://mainnet.aurora.dev";
    // const url = "https://data-seed-prebsc-1-s1.binance.org:8545";
    // const url = "https://rpc.gnosischain.com/";
    // const url = "https://eth.bd.evmos.dev:8545";
    // const url = "https://arb1.arbitrum.io/rpc";
    // const url = "https://arbitrum-goerli.publicnode.com";
    const url = "https://rpc.testnet.fantom.network/";
    const provider = new JsonRpcProvider(url);

    // const blkFinal = await provider.getBlock('finalized');
    // const blkLatest = await provider.getBlock('finalized');
    // const blkSafe = await provider.getBlock('safe');
    // console.log(blkLatest.number);

    // console.log(blkFinal.number, blkSafe.number, blkLatest.number);

    // const listener = new EventListener(ChainId.BNBSmartChainTestnet, provider)

    // listener.on(patch => {
    //     console.log(patch.timestamp);
    // });

    // //103640700 - 0x0141
    // // 0x0147
    // listener.start();

    // const filter_ = {
    //     fromBlock: 103640770,
    //     toBlock: 103640790,
    //     // blockHash: "0x38614339ee00abfd5e5f253479dd660eb301791271fae5b83f8cda8288fbab24",
    //     address: "0x81cdf3501e7dac007d795c9c32eb9f62a864e489"
    // };

    // const logs = await provider.getLogs(filter_);

    // console.log(logs);

    // const hash = "0x69151f001b104cbfc5b1d46ed1ca38146ec110b378c3daeb17e5018cea4ba4e0";
    // const receipt = await provider.getTransactionReceipt(hash);

    // console.log(receipt.logs);
}


main()
    .then(() => {
        console.log("Finished");
    });