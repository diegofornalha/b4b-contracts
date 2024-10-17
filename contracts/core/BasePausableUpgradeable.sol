// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

contract BasePausableUpgradeable is PausableUpgradeable, AccessControlEnumerableUpgradeable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    function __BasePausableUpgradeable_init(address adminAccount) internal onlyInitializing {
         __Pausable_init_unchained();
         __BasePausableUpgradeable_init_unchained(adminAccount);
    }

    function __BasePausableUpgradeable_init_unchained(address adminAccount) internal onlyInitializing {
        _setupRole(DEFAULT_ADMIN_ROLE, adminAccount);
        _setupRole(PAUSER_ROLE, adminAccount);
    }

    modifier onlyPauserRole() {
        require(hasRole(PAUSER_ROLE, _msgSender()), "Must have pauser role to perform this action");
        _;
    }

    /**
     * @dev Pauses all functions guarded by Pause
     * Requirements:
     * - the caller must have the PAUSER_ROLE.
     */

    function pause() public onlyPauserRole {
        _pause();
    }

    /**
     * @dev Unpauses the contract
     * Requirements:
     * - the caller must have the Pauser role
     */
    function unpause() public onlyPauserRole {
        _unpause();
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap1;
    uint256[50] private __gap2;
}