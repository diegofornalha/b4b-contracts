// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Create2.sol";
import {IERC6551RegistryLike} from "./interfaces/IERC6551Registry.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract AccountRegistry is IERC6551RegistryLike {
    error InitializationFailed();

    address private immutable _entryPointAddress;
    address private immutable _b4bContractAddress;
    address private immutable _implementationAddress;

    constructor(address entryPointAddress, address b4bContractAddress, address implementation) {
        _entryPointAddress = entryPointAddress;
        _b4bContractAddress = b4bContractAddress;
        _implementationAddress = implementation;
    }

    function createAccount(
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    ) external returns (address) {
        address owner_ = IERC721(tokenContract).ownerOf(tokenId);

        bytes memory code = _creationCode(
            _implementationAddress,
            tokenContract,
            tokenId,
            salt,
            _entryPointAddress,
            owner_
        );

        address _account = Create2.computeAddress(bytes32(salt), keccak256(code));

        if (_account.code.length != 0) return _account;

        _account = Create2.deploy(0, bytes32(salt), code);

        emit AccountCreated(_account, _implementationAddress, tokenContract, tokenId, salt);

        return _account;
    }

    function account(
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    ) external view returns (address) {
        address owner_ = IERC721(tokenContract).ownerOf(tokenId);

        bytes32 bytecodeHash = keccak256(
            _creationCode(_implementationAddress, tokenContract, tokenId, salt, _entryPointAddress, owner_)
        );

        return Create2.computeAddress(bytes32(salt), bytecodeHash);
    }

    function _creationCode(
        address implementation_,
        address tokenContract_,
        uint256 tokenId_,
        uint256 salt_,
        address entryPoint_,
        address owner_
    ) internal pure returns (bytes memory) {
        return
            abi.encodePacked(
                hex"3d60ad80600a3d3981f3363d3d373d3d3d363d73",
                implementation_,
                hex"5af43d82803e903d91602b57fd5bf3",
                abi.encode(salt_, entryPoint_, owner_, tokenId_)
            );
    }
}
