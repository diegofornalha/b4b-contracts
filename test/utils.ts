import { ContractTransaction } from 'ethers';
import { Timer } from '../src/listener/timer';

export async function waitTx(txPromise: Promise<ContractTransaction>) {
    const tx = await txPromise;
    return await tx.wait();
}

export class MockedTimer implements Timer {
    private resolver: Function | undefined;

    async timeout(ms: number): Promise<void> {
        if (ms > 0) {
            return new Promise((resolve) => {
                this.resolver = resolve;
            });
        }

        return;
    }

    tick(): void {
        if (this.resolver) {
            this.resolver();
        }
    }
}
