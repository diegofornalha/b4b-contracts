// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.9;

interface IInfluencerAccount {
    function token()
        external
        view
        returns (
            address,
            uint256
        );

    function owner() external view returns (address);

    /**
     * execute a transaction (called directly from owner, or by entryPoint)
     */
    function execute(address dest, uint256 value, bytes calldata func) external;
    function executeBatch(address[] calldata dest, bytes[] calldata func) external;
}
