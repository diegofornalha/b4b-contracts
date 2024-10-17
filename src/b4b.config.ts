import { utils } from 'ethers';
import { ConfigInterface, ConfigScales, PartialConfigNumbers, Numbers, Scales } from './common/config';
import { getTokenDecimalsForChainOrThrow } from "./contracts/addresses";

const SECONDS_IN_HOUR = 60 * 60;

const commonConfigNumbers: PartialConfigNumbers = {
    //
    [Numbers.ReleasePeriodInSeconds]: 24 * SECONDS_IN_HOUR,
    //
    [Numbers.AcceptPeriodInSeconds]: 24 * SECONDS_IN_HOUR,
    //
    [Numbers.ClaimAfterInSeconds]: 24 * SECONDS_IN_HOUR,
    //
    [Numbers.AprovePeriodInSeconds]: 24 * SECONDS_IN_HOUR,
    // protocol fee = 15% (0.15)
    [Numbers.FeeNumerator]: 15,
    [Numbers.FeeDenumerator]: 100
};

const commonConfigScales: ConfigScales = {
    [Scales.AcceptOrderTime]: [
        // if (timestamp <= orderCreationDate + bound) reward += value
        {
            bound: 2 * SECONDS_IN_HOUR,
            value: 100,
        },
        {
            bound: 6 * SECONDS_IN_HOUR,
            value: 80,
        },
        {
            bound: 24 * SECONDS_IN_HOUR,
            value: 50,
        },
    ],
    [Scales.CompleteOrderTime]: [
        // if (timestamp <= releaseDate + bound) reward += value
        {
            bound: 22 * SECONDS_IN_HOUR,
            value: 100,
        },
        {
            bound: 24 * SECONDS_IN_HOUR,
            value: 50,
        },
    ],
    [Scales.ApproveResultsScore]: [
        // if (score >= bound) reward += value
        {
            bound: 450,
            value: 100,
        },
        {
            bound: 400,
            value: 80,
        },
        {
            bound: 350,
            value: 60,
        },
        {
            bound: 300,
            value: 40,
        },
    ],
};

export function getConfigsForChainIdOrThrow(chainId: number): ConfigInterface {
    const decimals = getTokenDecimalsForChainOrThrow(chainId);
    
    return {
        numbers: {
            ...commonConfigNumbers,
            // Min protocol fee == 3 USDC
            [Numbers.MinFeeInWei]: utils.parseUnits('3', decimals.USDC),
        },
        scales: commonConfigScales
    }
}