import { task, types } from 'hardhat/config';
import { readFileSync } from 'fs';
import { join } from 'path';

task('upgrade', 'Upgrade contract')
    .addParam("contractName", "Contract Name", undefined, types.string)
    .setAction(async ({ contractName } , { ethers, upgrades }) => {
        const { chainId } = await ethers.provider.getNetwork();

        const addressesPath = join(__dirname, '../src/addresses.json');
        const addresses = JSON.parse(readFileSync(addressesPath, 'utf8'));

        const contractAddr = addresses[chainId][contractName];

        if (contractAddr) {
            const contractFactory = await ethers.getContractFactory(contractName) as any;

            await upgrades.upgradeProxy(contractAddr, contractFactory);
        } else {
            console.error("Error: invalid contract");
        }
    });