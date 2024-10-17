import { BigNumber, Signer } from 'ethers';
import { Interface } from '@ethersproject/abi';
import { ErrorDescription } from '@ethersproject/abi/lib/interface';
import { CampaignStatus } from '../common/types';

class CustomError extends Error {
    readonly state: CampaignStatus;
    readonly campaignId: string;

    constructor(type: ErrorTypes, state: CampaignStatus, campaignId: string) {
        const message = `${type} for campaign ${campaignId} with state ${CampaignStatus[state]}`;
        super(message);
        this.state = state;
        this.campaignId = campaignId;
    }
}

export class UnauthorizedError extends Error {
    constructor() {
        super('Unauthorized access or Invalid campaignId');
    }
}

export class TimeError extends CustomError {
    constructor(state: CampaignStatus, campaignId: string) {
        super(ErrorTypes.TimeError, state, campaignId);
    }
}

export class InvalidStateError extends CustomError {
    constructor(state: CampaignStatus, campaignId: string) {
        super(ErrorTypes.InvalidStateError, state, campaignId);
    }
}

enum ErrorTypes {
    UnauthorizedError = 'UnauthorizedError',
    InvalidStateError = 'InvalidStateError',
    TimeError = 'TimeError',
}

type SendTransactionParameters = Parameters<Signer['sendTransaction']>;

function parseErrorAndThrow(err: any, contractInterface: Interface) {
    let parsedError: ErrorDescription;
    try {
        parsedError = contractInterface.parseError(err.error.data);
    } catch (error) {
        throw err;
    }

    const state = parsedError?.args?.current;
    const campaignId = (parsedError?.args?.campaignID as BigNumber)?.toString();
    switch (parsedError.name) {
        case ErrorTypes.TimeError:
            throw new TimeError(state, campaignId);

        case ErrorTypes.UnauthorizedError:
            throw new UnauthorizedError();

        case ErrorTypes.InvalidStateError:
            throw new InvalidStateError(state, campaignId);

        default:
            break;
    }

    throw err;
}

export function createProxySigner(signer: Signer, contractInterface: Interface) {
    const handler: ProxyHandler<Signer> = {
        get(target, prop, reciver) {
            if (prop == 'sendTransaction') {
                return async (...params: SendTransactionParameters) => {
                    try {
                        return await target.sendTransaction(...params);
                    } catch (err: any) {
                        parseErrorAndThrow(err, contractInterface);
                    }
                };
            }

            return Reflect.get(target, prop, reciver);
        },
    };

    return new Proxy<Signer>(signer, handler);
}
