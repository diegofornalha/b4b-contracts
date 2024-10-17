import { task, types } from 'hardhat/config';
import { readFileSync } from 'fs';
import { join } from 'path';

task('verify-etherscan', 'Verifies contracts on etherscan')
    .addParam("contractName", "Contract Name", undefined, types.string)
    .setAction(async ({ contractName } , { ethers, run }) => {
        const { chainId } = await ethers.provider.getNetwork();

        const addressesPath = join(__dirname, '../src/addresses.json');
        const addresses = JSON.parse(readFileSync(addressesPath, 'utf8'));

        const contractAddr = addresses[chainId][contractName];

        await run("verify:verify", {
            address: contractAddr
        });
    });