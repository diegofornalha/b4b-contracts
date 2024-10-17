import { BigNumber } from 'ethers';

export enum Numbers {
    ReleasePeriodInSeconds = 0,
    AcceptPeriodInSeconds,
    ClaimAfterInSeconds,
    AprovePeriodInSeconds,
    FeeNumerator,
    FeeDenumerator,
    MinFeeInWei,
}

export enum Scales {
    AcceptOrderTime = 0,
    CompleteOrderTime,
    ApproveResultsScore,
}

export enum Addresses {
    UniqueIdentity = 0,
    B4BConfig,
    USDC,
    B4B,
    AccountRegistry
}

export type ConfigNumbers = {
    [key in Numbers]: number | BigNumber;
}

export type PartialConfigNumbers = Omit<ConfigNumbers, Numbers.MinFeeInWei>;

export type ConfigScales = {
    [key in Scales]: { bound: number; value: number }[];
}

export type ConfigInterface = {
    numbers: ConfigNumbers,
    scales: ConfigScales,
};