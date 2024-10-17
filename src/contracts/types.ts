import { BigNumberish, BigNumber } from 'ethers';
import { IERC20 } from '../../typechain-types/@openzeppelin/contracts/token/ERC20/IERC20';
import { B4B } from '../../typechain-types/contracts/core/B4B';
import { UniqueIdentity } from '../../typechain-types/contracts/core/UniqueIdentity';
import { Campaign } from '../common/types';

export enum ChainId {
    GoerliTestnet = 5,
    GnosisTestnet = 10200,
    PolygonTestnet = 80001,
    LineaTestnet = 59140,
    CeloTestnet = 44787,
    NeonEVMTestnet = 245022926,
    LocalHardhat = 31337,
}

export interface ContractAddresses {
    B4B: string;
    UniqueIdentity: string;
    USDC: string;
}

export interface TokenDecimals {
    USDC: number;
}

export interface B4BExtended extends B4B {
    getCampaign(campaignId: BigNumberish): Promise<Campaign>;
}

interface IERC20ParseUnits {
    parseUnits(value: string): BigNumber;
    formatUnits(value: BigNumberish): string;
    formatUnitsWithDecimalPlaces(value: BigNumberish, decimalPlaces: number): string;
    getDecimals(): number;
}

export interface Contracts {
    b4bContract: B4BExtended;
    uniqueIdentityContract: UniqueIdentity;
    usdcContract: IERC20 & IERC20ParseUnits;
}
