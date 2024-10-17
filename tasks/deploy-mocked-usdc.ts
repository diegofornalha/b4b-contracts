import { task, types } from 'hardhat/config';
import { Logger } from "./utils/utils";
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

task('deploy-mocked-usdc', 'Deploys MockedUSDC for testing purposes')
    .addParam("decimals", "decimals", undefined, types.int)
    .addFlag("silent")
    .setAction(async (args, { ethers }) => {
        const logger = new Logger(args.silent);

        const [deployer] = await ethers.getSigners();
        logger.log(`Deployer address ${deployer.address}`);

        /// Mocked USDC
        const USDC = await ethers.getContractFactory("MockedUSDC");
        const usdc = await USDC.deploy("Mocked USDC", "MUSDC", args.decimals);
        await usdc.deployed();
    
        logger.log(`Mocked USDC deployed to ${usdc.address}`);
        //-----------------

        const { chainId } = await ethers.provider.getNetwork();

        // Update addresses
        const addressesPath = join(__dirname, '../src/addresses.json');
        const addresses = JSON.parse(readFileSync(addressesPath, 'utf8'));


        addresses[chainId] = {
            ...addresses[chainId],
            USDC: usdc.address
        };

        writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

        return usdc;
    });