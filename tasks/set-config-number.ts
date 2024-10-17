import { task, types } from 'hardhat/config';
import { getConfigsForChainIdOrThrow } from '../src/b4b.config';
import { Numbers } from '../src/common/config';
import { readFileSync } from 'fs';
import { join } from 'path';

task('set-config-number', 'Verifies contracts on etherscan')
    .addParam("numberName", "number's name", undefined, types.string)
    .setAction(async ({ numberName } , { ethers, run }) => {
        const keyRaw = Numbers[numberName];

        if (keyRaw === undefined) {
            throw Error("Invalid Number");
        }

        const { chainId } = await ethers.provider.getNetwork();
        const config = getConfigsForChainIdOrThrow(chainId);

        const key= (keyRaw as unknown) as Numbers
        const value = config.numbers[key];

        const addressesPath = join(__dirname, '../src/addresses.json');
        const addresses = JSON.parse(readFileSync(addressesPath, 'utf8'));
        const configAddr = addresses[chainId]["B4BConfig"];

        console.log(`Config address ${configAddr}`);

        const [deployer] = await ethers.getSigners();

        const Config = await ethers.getContractFactory("B4BConfig");
        const configContract = Config.attach(configAddr);

        // console.log(key);
        const tx = await configContract.connect(deployer).setNumber(key, value);
        await tx.wait();

        console.log(`For chain ${chainId} set ${Numbers[key]} to ${value.toString()}`);
    });