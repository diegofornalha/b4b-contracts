import { expect } from 'chai';
import * as hre from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

import { makeDeployProxyCreate3 } from '../tasks/utils/deploy-helpers';
import { B4BConfig } from '../typechain-types';

describe('Create3', function () {
    async function deployFixture() {
        const [owner, otherAccount, brand, influencer, influencer2] = await hre.ethers.getSigners();

        const Create3Deployer = await hre.ethers.getContractFactory("Create3Deployer");
        const create3Deployer = await Create3Deployer.deploy();
        const deployProxyCreate3 = makeDeployProxyCreate3(hre, create3Deployer);

        return { owner, deployProxyCreate3 };
    }

    it('should deploy contract with right admin', async function () {
        const { owner, deployProxyCreate3 } = await loadFixture(deployFixture);

        const Config = await hre.ethers.getContractFactory("B4BConfig");
        const config = await deployProxyCreate3(Config, "B4BConfig", [owner.address]) as B4BConfig;

        const adminRole = await config.DEFAULT_ADMIN_ROLE();
        const isRoleOwner = await config.hasRole(adminRole, owner.address);
        expect(isRoleOwner).to.be.true;
    });

    it('should upgrade contract', async function () {
        const { owner, deployProxyCreate3 } = await loadFixture(deployFixture);

        const Config = await hre.ethers.getContractFactory("B4BConfig");
        const config = await deployProxyCreate3(Config, "B4BConfig", [owner.address]);

        const MockedConfig = await hre.ethers.getContractFactory("MockedB4BConfig");

        const admin = await hre.upgrades.admin.getInstance();

        const adminBefore = await hre.upgrades.erc1967.getAdminAddress(config.address);
        const instanceBefore = await hre.upgrades.erc1967.getImplementationAddress(config.address);
        expect(adminBefore).to.equal(admin.address);

        const configAfter = await hre.upgrades.upgradeProxy(config.address, MockedConfig);
        const instanceAfter = await hre.upgrades.erc1967.getImplementationAddress(config.address);
        const adminAfter = await hre.upgrades.erc1967.getAdminAddress(config.address);
        expect(adminAfter).to.equal(admin.address);
        
        expect(configAfter.address).to.equal(config.address);
        expect(instanceBefore).to.not.equal(instanceAfter);
    });
});