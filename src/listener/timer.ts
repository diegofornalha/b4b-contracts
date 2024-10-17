export interface Timer {
    timeout(ms: number): Promise<void>;
}

export class ClockTimer implements Timer {
    async timeout(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
