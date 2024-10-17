import { UserOperationStruct } from '@account-abstraction/contracts';
import { ethers, BigNumber } from "ethers";
import { resolveProperties } from "./utils";

export class PimlicoPaymasterAPI {
    constructor(readonly entryPoint: string, readonly url: string) {}

  /**
     * @param userOp a partially-filled UserOperation (without signature and paymasterAndData
     *  note that the "preVerificationGas" is incomplete: it can't account for the
     *  paymasterAndData value, which will only be returned by this method..
     * @returns the value to put into the PaymasterAndData, undefined to leave it empty
     */
    async getPaymasterAndData(userOp: Partial<UserOperationStruct>): Promise<string | undefined> {
        const pimlicoEndpoint = this.url;

        console.log(pimlicoEndpoint);
        
        const userOperation = await resolveProperties(userOp);

        const parsedUserOp = {
            ...userOperation,
            nonce: BigNumber.from(userOperation.nonce!).toHexString(),
            callGasLimit: BigNumber.from(userOperation.callGasLimit!).toHexString(),
            verificationGasLimit: BigNumber.from(userOperation.verificationGasLimit!).toHexString(),
            maxPriorityFeePerGas: BigNumber.from(userOperation.maxPriorityFeePerGas!).toHexString(),
            maxFeePerGas: BigNumber.from(userOperation.maxFeePerGas!).toHexString(),
            // preVerificationGas: ethers.utils.hexlify(46036),
            paymasterAndData: "0x",
            signature: "0x"
        };

        // delete parsedUserOp.preVerificationGas;
        console.log(parsedUserOp);
        
        const pimlicoProvider = new ethers.providers.StaticJsonRpcProvider(pimlicoEndpoint);
        
        const result = await pimlicoProvider.send(
            "pm_sponsorUserOperation", 
            [parsedUserOp, { entryPoint: this.entryPoint }]
        );
        const paymasterAndData = result.paymasterAndData;

        // console.log(paymasterAndData);

        return paymasterAndData;
    }
}
