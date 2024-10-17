// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.13;

interface IERC6551RegistryLike {
    /// @dev The registry SHALL emit the AccountCreated event upon successful account creation
    event AccountCreated(
        address account,
        address implementation,
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    );

    /// @dev Creates a token bound account for an ERC-721 token.
    ///
    /// If account has already been created, returns the account address without calling create2.
    ///
    /// If initData is not empty and account has not yet been created, calls account with
    /// provided initData after creation.
    ///
    /// Emits AccountCreated event.
    ///
    /// @return the address of the account
    function createAccount(
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    ) external returns (address);

    /// @dev Returns the computed address of a token bound account
    ///
    /// @return The computed address of the account
    function account(
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    ) external view returns (address);
}