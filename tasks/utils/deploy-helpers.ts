import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';
import { Manifest, ProxyDeployment, Deployment } from '@openzeppelin/upgrades-core';
// import { Create3Deployer } from '../../typechain-types';
import { concat, hexlify } from "@ethersproject/bytes";
import { utils } from "ethers";

import { getTransparentUpgradeableProxyFactory, getInitializerData, DeployProxyOptions, DeployTransaction, deployProxyImpl } from '@openzeppelin/hardhat-upgrades/dist/utils';
  
function getCreationBytecode(factory: ContractFactory, ...args: unknown[]) {
    const factoryBytecode = factory.bytecode;
    const constructorData = factory.interface.encodeDeploy(args);
    const creationBytecode = hexlify(concat([factoryBytecode, constructorData]));

    return creationBytecode;
}

async function deployCreate3(
    deployer: Contract,
    factory: ContractFactory,
    salt: string,
    ...args: unknown[]
): Promise<Required<Deployment & DeployTransaction>> {
    const creationBytecode = getCreationBytecode(factory, ...args);
    let value = utils.formatBytes32String(salt);
    const tx = await deployer.deploy(creationBytecode, value);
    await tx.wait();
    const sender = await deployer.signer.getAddress();

    const address = await deployer.deployedAddress(sender, value);

    const deployTransaction = tx;

    const txHash = tx.hash;
    return { address, txHash, deployTransaction };
}

export function makeDeployProxyCreate3(hre: HardhatRuntimeEnvironment, create3Deployer: Contract) {
    return async function deployProxy(
        ImplFactory: ContractFactory,
        salt: string,
        args: unknown[] | DeployProxyOptions = [],
        opts: DeployProxyOptions = {},
    ) {
        if (!Array.isArray(args)) {
            opts = args;
            args = [];
        }
    
        const { provider } = hre.network;
        const manifest = await Manifest.forNetwork(provider);
    
        const { impl, kind } = await deployProxyImpl(hre, ImplFactory, opts);
        const contractInterface = ImplFactory.interface;
        const data = getInitializerData(contractInterface, args, opts.initializer);
    
        let proxyDeployment: Required<ProxyDeployment & DeployTransaction>;

        const adminAddress = await hre.upgrades.deployProxyAdmin(ImplFactory.signer, opts);
        const TransparentUpgradeableProxyFactory = await getTransparentUpgradeableProxyFactory(hre, ImplFactory.signer);
        proxyDeployment = Object.assign(
            { kind },
            await deployCreate3(create3Deployer, TransparentUpgradeableProxyFactory, salt, impl, adminAddress, data),
        );
  
        await manifest.addProxy(proxyDeployment);
    
        const inst = ImplFactory.attach(proxyDeployment.address);
        // @ts-ignore Won't be readonly because inst was created through attach.
        inst.deployTransaction = proxyDeployment.deployTransaction;
        return inst;
    };
}