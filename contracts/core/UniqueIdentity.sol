// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {BasePausableUpgradeable} from "./BasePausableUpgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

contract UniqueIdentity is ERC721Upgradeable, BasePausableUpgradeable {
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    /// @dev We include a nonce in every hashed message to prevent replay attacks, i.e. the reuse of a signature.
    mapping(address => uint256) public nonces;

    function initialize(string memory name_, string memory symbol_, address adminAccount_) public initializer {
        __BasePausableUpgradeable_init(adminAccount_);
        __ERC721_init_unchained(name_, symbol_);
        __UniqueIdentity_init_unchained(adminAccount_);
    }

    function __UniqueIdentity_init_unchained(address signerAccount_) internal onlyInitializing {
        _setupRole(SIGNER_ROLE, signerAccount_);
    }

    function mint(
        address to,
        uint256 id,
        bytes calldata signature
    ) public onlySigner(to, id, signature) incrementNonce(_msgSender()) {
        if (balanceOf(to) != 0) return;
        _mint(to, id);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721Upgradeable, AccessControlEnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721Upgradeable) {
        require(
            (from == address(0) && to != address(0)) || (from != address(0) && to == address(0)),
            "Only mint or burn transfers are allowed"
        );
        super._beforeTokenTransfer(from, to, firstTokenId,batchSize);
    }

    modifier onlySigner(
        address account,
        uint256 id,
        bytes calldata signature
    ) {
        bytes32 hash = keccak256(
            abi.encodePacked(account, id, nonces[account])
        );
        bytes32 ethSignedMessage = ECDSAUpgradeable.toEthSignedMessageHash(hash);
        address signer = ECDSAUpgradeable.recover(ethSignedMessage, signature);
        require(
            hasRole(SIGNER_ROLE, ECDSAUpgradeable.recover(ethSignedMessage, signature)),
            "Invalid signer"
        );
        _;
    }

    modifier incrementNonce(address account) {
        nonces[account] += 1;
        _;
    }
}
