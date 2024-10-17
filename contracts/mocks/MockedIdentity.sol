// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import { UniqueIdentity } from "../core/UniqueIdentity.sol";

contract MockedIdentity is UniqueIdentity {
    constructor(string memory name_, string memory symbol_) {
        super.initialize(name_, symbol_, msg.sender);
    }

    function mintTo(address to, uint256 tokenId) external returns (uint256) {
        _mint(to, tokenId);

        return tokenId;
    }
}
