import { task, types } from 'hardhat/config';
import { DeployedContract } from "./types"

task('deploy-and-configure', 'Deploys B4B main contracts')
    .addParam("usdcContractAddr", "USDc contract address", undefined, types.string)
    .addParam("entryPoint", "EntryPoint", undefined, types.string)
    .addFlag("silent")
    .setAction(async ({ usdcContractAddr, silent, entryPoint } , { ethers, run }) => {
        const deployment = await run('deploy', { usdcContractAddr, silent, entryPoint });
        await run('update-configs', { deployment });
    })