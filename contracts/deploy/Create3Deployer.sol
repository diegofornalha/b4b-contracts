// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CREATE3} from "solmate/src/utils/CREATE3.sol";

/// @title Factory for deploying contracts to deterministic addresses via CREATE3
/// @author Modified from Axelar (https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/main/contracts/deploy/Create3Deployer.sol)
contract Create3Deployer {
    error FailedInit();

    event Deployed(
        bytes32 indexed bytecodeHash,
        bytes32 indexed salt,
        address indexed deployedAddress
    );

    /**
     * @dev Deploys a contract using `CREATE3`. The address where the contract
     * will be deployed can be known in advance via {deployedAddress}.
     *
     * The bytecode for a contract can be obtained from Solidity with
     * `type(contractName).creationCode`.
     *
     * Requirements:
     *
     * - `bytecode` must not be empty.
     * - `salt` must not have been used already by the same `msg.sender`.
     */
    function deploy(
        bytes calldata bytecode,
        bytes32 salt
    ) external payable returns (address deployedAddress_) {
        bytes32 deploySalt = keccak256(abi.encode(msg.sender, salt));
        deployedAddress_ = CREATE3.deploy(deploySalt, bytecode, msg.value);

        emit Deployed(keccak256(bytecode), salt, deployedAddress_);
    }

    /**
     * @dev Returns the address where a contract will be stored if deployed via {deploy} or {deployAndInit} by `sender`.
     * Any change in `salt` or `sender` will result in a new destination address.
     */
    function deployedAddress(address sender, bytes32 salt) external view returns (address) {
        bytes32 deploySalt = keccak256(abi.encode(sender, salt));
        return CREATE3.getDeployed(deploySalt);
    }
}
