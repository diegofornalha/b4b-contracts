import { task, types } from 'hardhat/config';
import { DeployedContract } from "./types"
import { Logger } from "./utils/utils";
import { setupConfigContract, setupConfigContractAddressesOrThrow } from "./utils/helpers";
import { makeDeployProxyCreate3 } from "./utils/deploy-helpers";
// import { B4BConfig } from '../typechain-types';

task('deploy', 'Deploys B4B main contracts')
    .addParam("usdcContractAddr", "USDc contract address", undefined, types.string)
    .addParam("entryPoint", "EntryPoint", undefined, types.string)
    .addFlag("silent")
    .setAction(async ({ usdcContractAddr, silent, entryPoint } , hre) => {
        const logger = new Logger(silent);
        const { ethers, upgrades } = hre;

        const deployment: DeployedContract[] = [];

        const [deployer] = await ethers.getSigners();
        logger.log(`Deployer address ${deployer.address}`);

        const UniqueIdentity = await ethers.getContractFactory("UniqueIdentity");
        const B4B = await ethers.getContractFactory("B4B");
        const Config = await ethers.getContractFactory("B4BConfig");


        // logger.log(`Create3Deployer deployed to ${create3Deployer.address}`);

        // const deployProxyCreate3 = makeDeployProxyCreate3(hre, create3Deployer);


        ///------ UniqueIdentity

        const uniqueIdentity = await upgrades.deployProxy(
            UniqueIdentity,
            ["B4B Influencer Identity", "B4BID", deployer.address]
        );
        await uniqueIdentity.deployed();

        // const uniqueIdentity = UniqueIdentity.attach("0xDB9B2B18aFBe40f9B865fAbE066eFc8bd7747793");

        deployment.push({
            name: "UniqueIdentity",
            address: uniqueIdentity.address
        });
    
        logger.log(`UniqueIdentity deployed to ${uniqueIdentity.address}`);
    

        ///------ B4B Config

        /// Deploy config
        const config = await upgrades.deployProxy(Config, [deployer.address]);
        await config.deployed();

        // const config = Config.attach("0x927C9bdc8De628594503930fd4e967377E261693");

        logger.log(`B4BConfig deployed to ${config.address}`);

        deployment.push({
            name: "B4BConfig",
            address: config.address
        });
    
        await setupConfigContract(config);

        ///------ B4B Main Contract

        const b4b = await upgrades.deployProxy(B4B, [config.address, deployer.address]);
        await b4b.deployed();
        // const b4b = B4B.attach("0x043b6169eBb6aA9Dffb52ECae70Ed368Dc112274");

        deployment.push({
            name: "B4B",
            address: b4b.address
        });

        logger.log(`B4B deployed to ${b4b.address}`);

        ///-------- Account Registry

        const InfluencerAccount = await ethers.getContractFactory('InfluencerAccount');
        const influencer = await InfluencerAccount.deploy();
        // const influencer = await InfluencerAccount.attach("0x42b245e5a20230006B2868D32446346780E0E052");
        
        logger.log(`InfluencerAccount deployed to ${influencer.address}`);

        const AccountRegistry = await ethers.getContractFactory('AccountRegistry');
        const accountRegistry = await AccountRegistry.deploy(entryPoint, b4b.address, influencer.address);
        // const accountRegistry = await AccountRegistry.attach("0x5D11698FE74fC337B018cD4f7588Df8F12CD3c94");

        deployment.push({
            name: "AccountRegistry",
            address: accountRegistry.address
        });

        logger.log(`AccountRegistry deployed to ${accountRegistry.address}`);

        ///-------- USDC address

        deployment.push({
            name: "USDC",
            address: usdcContractAddr
        });

        // // // _____Grant SIGNER role___________

        // // const minterRole = await uniqueIdentity.SIGNER_ROLE();
        // // const tx = await uniqueIdentity.grantRole(minterRole, );
        // // await tx.wait();

        // // logger.log(`Role ${minterRole} granted to ${b4b.address}`);


        // // ///_______Set B4B Config address ____

        // // const tx_ = await uniqueIdentity.setB4BContract(b4b.address);
        // // await tx_.wait();

        // ///______________________________________________

        await setupConfigContractAddressesOrThrow(config, deployment);

        return deployment;
    })
