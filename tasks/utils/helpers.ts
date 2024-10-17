import { BigNumber, Contract } from 'ethers';
import { getConfigsForChainIdOrThrow } from '../../src/b4b.config';
import { Numbers, Scales, Addresses } from '../../src/common/config';
import { DeployedContract } from '../types';

export async function setupConfigContractNumbers(configContract: Contract) {
    const keys: number[] = [];
    const values: any[] = [];

    const config = getConfigsForChainIdOrThrow(await configContract.signer.getChainId());

    for (const key in Numbers) {
        const parsedKey = Number(key);
        if (isNaN(parsedKey)) {
            continue;
        }

        const setedValue = await configContract.getNumber(parsedKey);
        const value = config.numbers[parsedKey as Numbers];

        if (!BigNumber.from(setedValue).eq(value)) {
            keys.push(parsedKey);
            values.push(value);

            console.log(`[B4BConfig]: Number ${Numbers[parsedKey]} updated from ${setedValue} to ${value}`);
        }
    }

    const tx = await configContract.setNumbers(keys, values);
    await tx.wait();
}

export async function setupConfigContractScales(configContract: Contract) {
    for (const key in Scales) {
        const parsedKey = Number(key);
        if (isNaN(parsedKey)) {
            continue;
        }

        const config = getConfigsForChainIdOrThrow(await configContract.signer.getChainId());

        const scale = config.scales[parsedKey as Scales];
        if (scale.length == 0) {
            continue;
        }

        const values = scale.map((pair) => {
            return {
                _bound: pair.bound,
                _value: pair.value,
            };
        });

        const tx = await configContract.setScale(parsedKey, values);
        await tx.wait();
    }
}

export async function setupConfigContract(configContract: Contract) {
    await setupConfigContractScales(configContract);
    await setupConfigContractNumbers(configContract);
}

export async function setupConfigContractAddressesOrThrow(configContract: Contract, contracts: DeployedContract[]) {
    const types: string[] = [];
    const addresses: string[] = [];
    for (const deployment of contracts) {
        const key = Addresses[deployment.name as any];

        if (key === undefined) {
            throw Error('Invalid contract name!');
        }

        types.push(key);
        addresses.push(deployment.address);
    }

    const tx = await configContract.setAddresses(types, addresses);
    await tx.wait();
}
