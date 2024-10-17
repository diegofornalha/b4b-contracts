import { ChainId } from '../contracts/types';

export interface IListenerOptions {
    pollInterval: number;
    backoff: number;
    confirmations: number;
    finalityTag: "finalized" | "safe" | "latest";
    chunkSize: number;
}

export const OPTIONS: Partial<Record<ChainId, IListenerOptions>> = {
    [ChainId.GoerliTestnet]: {
        pollInterval: 10000,
        backoff: 10000,
        finalityTag: "latest",
        confirmations: 2,
        chunkSize: 1000,
    },
    [ChainId.PolygonTestnet]: {
        pollInterval: 10000,
        backoff: 10000,
        finalityTag: "latest",
        confirmations: 5,
        chunkSize: 1000,
    },
    [ChainId.GnosisTestnet]: {
        pollInterval: 30000,
        backoff: 10000,
        finalityTag: "latest",
        confirmations: 5,
        chunkSize: 1000,
    },
    [ChainId.LineaTestnet]: {
        pollInterval: 30000,
        backoff: 10000,
        finalityTag: "latest",
        confirmations: 2,
        chunkSize: 1000,
    },
    [ChainId.CeloTestnet]: {
        pollInterval: 30000,
        backoff: 10000,
        finalityTag: "latest",
        confirmations: 5,
        chunkSize: 1000,
    },
    [ChainId.LocalHardhat]: {
        pollInterval: 25000,
        backoff: 10000,
        finalityTag: "latest",
        confirmations: 8,
        chunkSize: 1000,
    },
};
