import { task, types } from 'hardhat/config';
import { Logger } from "./utils/utils";
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

task('grant-signer-role', 'Grants signer role to the address')
    .addFlag("silent")
    .addParam("to", "Grant role to...", undefined, types.string)
    .setAction(async (args, { ethers }) => {
        const logger = new Logger(args.silent);

        const [deployer] = await ethers.getSigners();
        logger.log(`Deployer address ${deployer.address}`);

        const { chainId } = await ethers.provider.getNetwork();

        const addressesPath = join(__dirname, '../src/addresses.json');
        const addresses = JSON.parse(readFileSync(addressesPath, 'utf8'));

        const Identity = await ethers.getContractFactory("UniqueIdentity");
        const identity = Identity.attach(addresses[chainId].UniqueIdentity);

        // _____Grant SIGNER role___________

        const signerRole = await identity.SIGNER_ROLE();
        const tx = await identity.grantRole(signerRole, args.to);
        await tx.wait();

        logger.log(`Role ${signerRole} granted to ${args.to}`);
    });