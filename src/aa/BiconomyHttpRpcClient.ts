import { Bundler } from '@biconomy/bundler'
import { ethers } from 'ethers'
import { JsonRpcProvider } from '@ethersproject/providers'
import { UserOperation } from '@biconomy/core-types';
import { resolveProperties } from './utils'
import { UserOperationStruct } from '@account-abstraction/contracts';

export class BiconomyHttpRpcClient {
  private readonly userOpJsonRpcProvider: JsonRpcProvider
  private readonly biconomyBundler: Bundler;

  initializing: Promise<void>

  constructor (
    readonly bundlerUrl: string,
    readonly entryPointAddress: string,
    readonly chainId: number
  ) {
    this.userOpJsonRpcProvider = new ethers.providers.JsonRpcProvider(this.bundlerUrl, {
      name: 'Connected bundler network',
      chainId
    });
    this.initializing = this.validateChainId();

    this.biconomyBundler = new Bundler({
        bundlerUrl,      
        chainId,
        entryPointAddress,
    })
  }

  async validateChainId (): Promise<void> {
    // validate chainId is in sync with expected chainid
    const chain = await this.userOpJsonRpcProvider.send('eth_chainId', [])
    const bundlerChain = parseInt(chain)
    if (bundlerChain !== this.chainId) {
      throw new Error(`bundler ${this.bundlerUrl} is on chainId ${bundlerChain}, but provider is on chainId ${this.chainId}`)
    }
  }

  /**
   * send a UserOperation to the bundler
   * @param userOp1
   * @return userOpHash the id of this operation, for getUserOperationTransaction
   */
  async sendUserOpToBundler(userOp1: UserOperationStruct): Promise<string> {
    console.log("Biconomy Bundler");
    await this.initializing;
    const resolvedOp = await resolveProperties(userOp1);
    console.log(userOp1);
    const res = await this.biconomyBundler.sendUserOp(resolvedOp as any);

    return res.userOpHash;
  }

  /**
   * estimate gas requirements for UserOperation
   * @param userOp1
   * @returns latest gas suggestions made by the bundler.
   */
  async estimateUserOpGas(userOp1: Partial<UserOperationStruct>): Promise<{callGasLimit: number, preVerificationGas: number, verificationGasLimit: number}> {
    await this.initializing;

    const resolvedOp = await resolveProperties(userOp1);
    console.log(resolvedOp);

    // const userOp = {
    //     ...userOp1
    // }
    
    const res = await this.biconomyBundler.estimateUserOpGas(resolvedOp as any);

    return {
        callGasLimit: Number(res.callGasLimit),
        preVerificationGas: Number(res.preVerificationGas),
        verificationGasLimit: Number(res.verificationGasLimit)
    };
  }

  private async printUserOperation (method: string, [userOp1, entryPointAddress]: [UserOperation, string]): Promise<void> {
    // const userOp = await resolveProperties(userOp1)
    // debug('sending', method, {
    //     ...userOp
    //     // initCode: (userOp.initCode ?? '').length,
    //     // callData: (userOp.callData ?? '').length
    // }, entryPointAddress)
  }
}
