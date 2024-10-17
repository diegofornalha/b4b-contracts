import { Log } from '@ethersproject/abstract-provider';

import { OrderCreatedEventObject, OrderUpdatedEventObject } from '../../typechain-types/contracts/core/B4B';
import { TransferEventObject } from '../../typechain-types/contracts/core/UniqueIdentity';
import { Campaign, CampaignStatus } from '../common/types';
import { Contracts } from '../contracts/types';

export enum PatchType {
    B4B,
    UniqueIdentity,
}

export interface CampaignInfo extends Partial<Campaign> {
    orderId: string;
}

export interface TransferInfo {
    from: string;
    to: string;
    tokenId: string;
}

export interface Patch {
    type: PatchType;
    data: CampaignInfo | TransferInfo;
}

export class LogParser {
    readonly contracts: Contracts;

    constructor(contracts: Contracts) {
        this.contracts = contracts;
    }

    public parse(log: Log): Patch {
        let patch: Patch;
        switch (log.topics[0]) {
            // B4B.OrderCreated
            case this.contracts.b4bContract.filters.OrderCreated().topics![0]:
                {
                    const parsedLog = this.contracts.b4bContract.interface.parseLog(log);
                    const args = parsedLog.args as unknown;
                    patch = this._parseOrderCreated(args as OrderCreatedEventObject);
                }
                break;

            // B4B.OrderUpdated
            case this.contracts.b4bContract.filters.OrderUpdated().topics![0]:
                {
                    const parsedLog = this.contracts.b4bContract.interface.parseLog(log);
                    const args = parsedLog.args as unknown;
                    patch = this._parseOrderUpdated(args as OrderUpdatedEventObject);
                }
                break;

            // UniqueIdentity.Transfer
            case this.contracts.uniqueIdentityContract.filters.Transfer().topics![0]:
                {
                    const parsedLog = this.contracts.uniqueIdentityContract.interface.parseLog(log);
                    const args = parsedLog.args as unknown;
                    patch = this._parseTransfer(args as TransferEventObject);
                }
                break;

            default:
                throw Error();
        }

        return patch;
    }

    private _parseOrderCreated(event: OrderCreatedEventObject): Patch {
        const order = event.order;

        const patch: Patch = {
            type: PatchType.B4B,
            data: {
                orderId: event.orderId.toHexString(),
                brandAddr: order.brandAddr,
                influencerId: order.influencerID.toString(),
                releaseDate: order.releaseDate.toNumber(),
                orderCreationDate: order.orderCreationTime.toNumber(),
                orderType: order.orderType,
                price: parseFloat(this.contracts.usdcContract.formatUnits(order.price)),
                fee: parseFloat(this.contracts.usdcContract.formatUnits(order.fee)),
                status: order.status,
                data: order.data,
            },
        };

        console.info(`[OrderCreated]: order ${(patch.data as CampaignInfo).orderId}`);

        return patch;
    }

    private _parseOrderUpdated(event: OrderUpdatedEventObject): Patch {
        const status = event.status;

        const patch: Patch = {
            type: PatchType.B4B,
            data: {
                orderId: event.orderId.toHexString(),
                rating: event.rating.toNumber(),
                status: event.status,
            },
        };

        if (status == CampaignStatus.OrderFilled) {
            patch.data = {
                ...patch.data,
                orderCompletionDate: event.arg0.toNumber(),
            };
        }

        console.info(
            `[OrderUpdated]: order ${(patch.data as CampaignInfo).orderId} with status ${CampaignStatus[status]}`,
        );

        return patch;
    }

    private _parseTransfer(event: TransferEventObject): Patch {
        const patch: Patch = {
            type: PatchType.UniqueIdentity,
            data: {
                from: event.from,
                to: event.to,
                tokenId: event.tokenId.toString(),
            } as TransferInfo,
        };

        return patch;
    }

    public getLogFilter() {
        return {
            address: [this.contracts.b4bContract.address, this.contracts.uniqueIdentityContract.address],
            topics: [
                // topics[0]
                [
                    this.contracts.b4bContract.filters.OrderCreated().topics![0],
                    this.contracts.b4bContract.filters.OrderUpdated().topics![0],
                    this.contracts.uniqueIdentityContract.filters.Transfer().topics![0],
                ],
            ],
        };
    }
}
