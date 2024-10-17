import { JsonRpcProvider } from '@ethersproject/providers'
import { EntryPoint__factory, SimpleAccountFactory__factory } from "@account-abstraction/contracts";

import {ClientConfig, HttpRpcClient, ERC4337EthersProvider, SimpleAccountAPI} from "@account-abstraction/sdk";
import {Signer} from "ethers";

type GetPreVerificationGasParams = Parameters<SimpleAccountAPI['getPreVerificationGas']>;

export function createProxyAccountApi(smartAccountAPI: SimpleAccountAPI) {
    const handler: ProxyHandler<SimpleAccountAPI> = {
        get(target, prop, reciver) {
            if (prop == 'getPreVerificationGas') {
                return async (...params: GetPreVerificationGasParams) => {
                    const gas = await target.getPreVerificationGas(...params);

                    const gasString = gas.toString();
                    const num = Number(gasString.slice(0,1)) + 1;
                    const newGas = num * (10 ** (gasString.length - 1));


                    return newGas;
                };
            }

            return Reflect.get(target, prop, reciver);
        },
    };

    return new Proxy<SimpleAccountAPI>(smartAccountAPI, handler);
}

/**
 * wrap an existing provider to tunnel requests through Account Abstraction.
 * @param originalProvider the normal provider
 * @param config see ClientConfig for more info
 * @param originalSigner use this signer as the owner. of this wallet. By default, use the provider's signer
 */
export async function wrapProvider (
  originalProvider: JsonRpcProvider,
  config: ClientConfig,
  originalSigner: Signer = originalProvider.getSigner()
): Promise<ERC4337EthersProvider> {
    const entryPoint = EntryPoint__factory.connect(config.entryPointAddress, originalProvider)
    // Initial SimpleAccount instance is not deployed and exists just for the interface
    //   const detDeployer = new DeterministicDeployer(originalProvider)
    //   const SimpleAccountFactory = await detDeployer.deterministicDeploy(new SimpleAccountFactory__factory(), 0, [entryPoint.address])
    const smartAccountAPI = new SimpleAccountAPI({
        provider: originalProvider,
        entryPointAddress: entryPoint.address,
        owner: originalSigner,
        accountAddress: config.walletAddress,
        paymasterAPI: config.paymasterAPI
    });

    const proxyAccountApi = createProxyAccountApi(smartAccountAPI);

    const chainId = await originalProvider.getNetwork().then(net => net.chainId);
    const httpRpcClient = new HttpRpcClient(config.bundlerUrl, config.entryPointAddress, chainId);
    return await new ERC4337EthersProvider(
        chainId,
        config,
        originalSigner,
        originalProvider,
        httpRpcClient as any,
        entryPoint,
        proxyAccountApi
    ).init();
}
