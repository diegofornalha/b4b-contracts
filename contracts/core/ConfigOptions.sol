// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title ConfigOptions
 * @notice A central place for enumerating the configurable options of B4BConfig contract
 */
library ConfigOptions {
    enum Numbers {
        ReleasePeriodInSeconds,
        AcceptPeriodInSeconds,
        ClaimAfterInSeconds,
        AprovePeriodInSeconds,
        FeeNumerator,
        FeeDenumerator,
        MinFeeInWei
    }

    enum Scales {
        AcceptOrderTime,
        CompleteOrderTime,
        ApproveResultsScore
    }

    enum Addresses {
        UniqueIdentity,
        B4BConfig,
        USDC,
        B4B,
        AccountRegistry
    }
}
