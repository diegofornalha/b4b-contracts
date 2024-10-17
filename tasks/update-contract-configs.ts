import { task, types } from 'hardhat/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { setupConfigContractNumbers, setupConfigContractAddressesOrThrow } from './utils/helpers';

task('update-contract-configs', 'updates configs')
    .setAction(async ({}, { ethers, run }) => {
        const { chainId } = await ethers.provider.getNetwork();

        const addressesPath = join(__dirname, '../src/addresses.json');
        const addresses = JSON.parse(readFileSync(addressesPath, 'utf8'));
        const configAddr = addresses[chainId]["B4BConfig"];

        const Config = await ethers.getContractFactory("B4BConfig");
        const configContract = Config.attach(configAddr);
        const [deployer] = await ethers.getSigners();
        await setupConfigContractNumbers(configContract.connect(deployer));

        // Scales ?

        // Addresses ?
    });