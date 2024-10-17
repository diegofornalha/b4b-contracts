// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IUniqueIdentity {
    // function exists(uint256 uid) external view returns (bool);
    function balanceOf(address account) external view returns (uint256);

    function ownerOf(uint256 uid) external view returns (address);

    function mint(address to, uint256 id, bytes calldata signature) external;
}
