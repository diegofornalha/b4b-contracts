import { Contract, Signer, BigNumber, BigNumberish, utils } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import { defineReadOnly } from '@ethersproject/properties';
import { getContractAddressesForChainOrThrow, getTokenDecimalsForChainOrThrow } from './addresses';

import { default as B4B_ABI } from '../../abi/B4B.json';
import { default as UniqueIdentity_ABI } from '../../abi/UniqueIdentity.json';
import { default as IERC20_ABI } from '../../abi/IERC20.json';

import { B4BExtended, Contracts } from './types';
import { createProxySigner } from './errors';
import { Campaign } from '../common/types';

function defineParseUnits(contract: Contract, decimals: number) {
    defineReadOnly(contract, 'parseUnits', (value: string) => {
        return utils.parseUnits(value, decimals);
    });

    defineReadOnly(contract, 'formatUnits', (value: BigNumberish) => {
        return utils.formatUnits(value, decimals);
    });

    defineReadOnly(contract, 'formatUnitsWithDecimalPlaces', (value: BigNumberish, decimalPlaces: number) => {
        const valueBN = BigNumber.from(value);
        const exponent = decimals - decimalPlaces;
        const remainder = exponent > 0 ? valueBN.mod(BigNumber.from(10).pow(exponent)) : 0;
        return utils.formatUnits(valueBN.sub(remainder), decimals);
    });

    defineReadOnly(contract, 'getDecimals', () => {
        return decimals;
    });
}

/**
 * Get contract instances that target the Aurora mainnet
 * or a supported testnet. Throws if there are no known contracts
 * deployed on the corresponding chain.
 * @param chainId The desired chain id
 * @param signerOrProvider The ethers v5 signer or provider
 */
export function getContractsForChainOrThrow(chainId: number, signerOrProvider: Signer | Provider) {
    const addresses = getContractAddressesForChainOrThrow(chainId);
    const decimals = getTokenDecimalsForChainOrThrow(chainId);

    const b4bContract = new Contract(
        addresses.B4B,
        B4B_ABI,
        createProxySigner(signerOrProvider as Signer, Contract.getInterface(B4B_ABI)),
    );

    const usdcContract = new Contract(addresses.USDC, IERC20_ABI, signerOrProvider as Signer | Provider);
    defineParseUnits(usdcContract, decimals.USDC);

    defineReadOnly(b4bContract, 'getCampaign', async (campaignId: BigNumberish) => {
        const order = await (b4bContract as B4BExtended).campaigns(campaignId);

        return {
            brandAddr: order.brandAddr,
            influencerId: order.influencerID.toString(),
            releaseDate: order.releaseDate.toNumber(),
            orderCreationDate: order.orderCreationTime.toNumber(),
            orderType: order.orderType,
            price: parseFloat(utils.formatUnits(order.price, decimals.USDC)),
            fee: parseFloat(utils.formatUnits(order.fee, decimals.USDC)),
            status: order.status,
            data: order.data,
        } as Campaign;
    });

    const uniqueIdentityContract = new Contract(
        addresses.UniqueIdentity,
        UniqueIdentity_ABI,
        signerOrProvider as Signer | Provider,
    );

    return {
        b4bContract,
        uniqueIdentityContract,
        usdcContract,
    } as Contracts;
}

export function getB4BContractReadOnly(chainId: number, provider: Provider) {
    const addresses = getContractAddressesForChainOrThrow(chainId);

    const b4bContract = new Contract(
        addresses.B4B,
        B4B_ABI,
        provider
    );

    return b4bContract;
}
