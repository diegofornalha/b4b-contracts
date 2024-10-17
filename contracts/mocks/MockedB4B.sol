// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "../core/B4B.sol";
import "../core/ConfigOptions.sol";

contract MockedB4B is B4B {
    constructor(address config_) {
        super.initialize(config_, msg.sender);
    }

    function createOrderManually(Campaign calldata order, uint256 campaignID) public {
        campaigns[campaignID] = order;
    }
}
