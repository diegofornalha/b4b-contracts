import { task, types } from 'hardhat/config';
import { DeployedContract } from './types';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

task('update-configs', 'Write the deployed addresses')
    .addParam('deployment', 'Contract objects from the deployment', undefined, types.json)
    .setAction(async ({ deployment }, { ethers } ) => {
        const contracts: Record<string, string> = {};

        (deployment as DeployedContract[])
            .forEach(contract => {
                contracts[contract.name] = contract.address;
            })

        const { chainId } = await ethers.provider.getNetwork();

        // Update addresses
        const addressesPath = join(__dirname, '../src/addresses.json');
        const addresses = JSON.parse(readFileSync(addressesPath, 'utf8'));


        addresses[chainId] = {
            ...addresses[chainId],
            ...contracts
        };

        writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    });