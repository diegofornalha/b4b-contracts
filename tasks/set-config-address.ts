import { task, types } from 'hardhat/config';
// import { config } from '../src/b4b.config';
import { Addresses } from '../src/common/config';
import { readFileSync } from 'fs';
import { join } from 'path';

task('set-config-address', 'Verifies contracts on etherscan')
    .addParam("name", "name", undefined, types.string)
    .addParam("addr", "address", undefined, types.string)
    .setAction(async ({ name, addr } , { ethers, run }) => {
        const keyRaw = Addresses[name];

        if (keyRaw === undefined) {
            throw Error("Invalid Address");
        }

        const key = (keyRaw as unknown) as Addresses;
        // const value = config.numbers[key];

        const { chainId } = await ethers.provider.getNetwork();

        const addressesPath = join(__dirname, '../src/addresses.json');
        const addresses = JSON.parse(readFileSync(addressesPath, 'utf8'));
        const configAddr = addresses[chainId]["B4BConfig"];

        console.log(`Config address ${configAddr}`);

        const [deployer] = await ethers.getSigners();

        const Config = await ethers.getContractFactory("B4BConfig");
        const configContract = Config.attach(configAddr);

        // console.log(key);
        const tx = await configContract.connect(deployer).setAddress(key, addr);
        await tx.wait();

        console.log(`For chain ${chainId} set ${Addresses[key]} to ${addr}`);
    });