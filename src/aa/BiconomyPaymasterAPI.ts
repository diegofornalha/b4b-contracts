// import {  } from '@account-abstraction/sdk';
import { BiconomyPaymaster, PaymasterMode } from '@biconomy/paymaster';
import { UserOperation } from '@biconomy/core-types';
import { resolveProperties } from './utils'
import { UserOperationStruct } from '@account-abstraction/contracts'

/**
 * an API to external a UserOperation with paymaster info
 */
export class BiconomyPaymasterAPI {
    readonly paymaster: BiconomyPaymaster;

    constructor(url: string) {
        this.paymaster = new BiconomyPaymaster({
            paymasterUrl: url
        });
    };

    async getPaymasterAndData(userOp: Partial<UserOperation>): Promise<string | undefined> {
        const resolvedOp = await resolveProperties(userOp);

        const op = {
            ...resolvedOp,
            paymasterAndData: "0x",
            signature: "0x"
        };

        console.log("Biconomy Paymaster", op);

        const res = await this.paymaster.getPaymasterAndData(op, {
            mode: PaymasterMode.SPONSORED
        });

        console.log(res);
        
        return res.paymasterAndData;
    }
}
