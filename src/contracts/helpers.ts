import { BigNumber } from 'ethers';
import { getConfigsForChainIdOrThrow } from '../b4b.config';
import { Numbers } from '../common/config';
// import { getContractAddressesForChainOrThrow } from './addresses';
import { Signer, utils } from 'ethers';

export function previewPriceWithFee(price: BigNumber, chainId: number): BigNumber {
    const config = getConfigsForChainIdOrThrow(chainId);
    const numerator = config.numbers[Numbers.FeeNumerator];
    const denumerator = config.numbers[Numbers.FeeDenumerator];
    const minFee = BigNumber.from(config.numbers[Numbers.MinFeeInWei]);

    const fee = price.mul(numerator).div(denumerator);

    return fee.gt(minFee) ? price.add(fee) : price.add(minFee);
}

export async function createIdentityCertificate(
    account: string,
    tokenId: number,
    authority: Signer,
    identityAddress?: string,
) {
    const nonce = 0;
    const typesSig = ['address', 'uint256', 'uint256'];
    // const identityAddr = identityAddress ?? (await getContractAddressesForChainOrThrow(chainId).UniqueIdentity);
    const valuesSig = [account, tokenId, nonce];
    const hash = utils.arrayify(utils.solidityKeccak256(typesSig, valuesSig));
    const signature = await authority.signMessage(hash);

    const types = ['address', 'uint256', 'bytes'];
    const values = [account, tokenId, signature];
    const certificate = utils.defaultAbiCoder.encode(types, values);

    return certificate;
}
