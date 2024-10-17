import { getContractsForChainOrThrow } from '../contracts/contracts';
import { getTokenDecimalsForChainOrThrow } from '../contracts/addresses';
import { ChainId, Contracts, TokenDecimals } from '../contracts/types';

import { JsonRpcProvider, Filter } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { Log } from '@ethersproject/abstract-provider';
import { LogParser, Patch } from './parser';
import { OPTIONS } from './options';
import { Timer, ClockTimer } from './timer';

import { EventEmitter } from 'node:events';

export interface PatchSeries {
    chainId: ChainId;
    timestamp: number;
    patches: Patch[];
}

export type BlockCallback = (patchSeries: PatchSeries) => void | Promise<void>;

export class EventListener {
    private provider: JsonRpcProvider;
    private chainId: ChainId;
    private parser: LogParser;
    private contracts: Contracts;
    private decimals: TokenDecimals;

    private running = false;
    private emitter: EventEmitter;
    private timer: Timer;

    constructor(chainId: ChainId, provider: JsonRpcProvider, timer?: Timer) {
        this.provider = provider;
        this.chainId = chainId;
        this.contracts = getContractsForChainOrThrow(this.chainId, this.provider);
        this.decimals = getTokenDecimalsForChainOrThrow(this.chainId);
        this.parser = new LogParser(this.contracts);
        this.emitter = new EventEmitter();
        this.timer = timer ?? new ClockTimer();
    }

    async _poll(fromBlock?: number) {
        let latestQueriedBlock: number | null = null;
        let historyRequest = true;

        const contractsFilter = this.parser.getLogFilter();

        const options = OPTIONS[this.chainId];
        if (!options) throw new Error(`No options for chain ${this.chainId}`);

        // TODO: handle repetetive errors
        while (this.running) {
            try {
                let block;
                block = await this.provider.getBlock(options.finalityTag);

                while (latestQueriedBlock == block.number && !historyRequest) {
                    await this.timer.timeout(options.pollInterval);
                    block = await this.provider.getBlock(options.finalityTag);
                }

                const latestBlock: number = block.number;
                const timestamp = block.timestamp;

                const latestConfirmedBlock = latestBlock - options.confirmations;

                fromBlock = fromBlock || latestBlock;

                const toBlock = Math.min(fromBlock + options.chunkSize - 1, latestConfirmedBlock);
                const nextBlock = toBlock + 1;

                if (toBlock <= fromBlock) {
                    await this.timer.timeout(options.pollInterval);
                    continue;
                }

                const filter = {
                    fromBlock: '0x' + fromBlock.toString(16),
                    toBlock: '0x' + toBlock.toString(16),
                };

                const patches = await this._getEvents({ ...filter, ...contractsFilter });

                if (patches.length != 0) {
                    this.emitter.emit('block', {
                        chainId: this.chainId,
                        timestamp: toBlock,
                        patches,
                    });
                }

                latestQueriedBlock = block.number;
                historyRequest = toBlock !== latestConfirmedBlock;
                fromBlock = nextBlock;

                const delay = historyRequest ? 0 : options.pollInterval;
                await this.timer.timeout(delay);
            } catch (err) {
                console.error('Error', err);
                await this.timer.timeout(options.backoff);
            }
        }
    }

    private async _getEvents(filter: any): Promise<Patch[]> {
        const logs: Log[] = await this.provider.send('eth_getLogs', [filter]);

        const newLogs = logs.filter((log) => !log.removed);

        const patches = newLogs.map((log) => {
            return this.parser.parse(log);
        });

        return patches;
    }

    public stop() {
        this.running = false;
    }

    async start(startBlock?: number) {
        this.running = true;

        try {
            this._poll(startBlock);
        } catch (err) {
            console.log(err);
        }
    }

    public on(callback: BlockCallback) {
        this.emitter.on('block', callback);
    }

    public once(callback: BlockCallback) {
        this.emitter.once('block', callback);
    }
}
