// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {B4BConfig} from "../core/Config.sol";

contract MockedB4BConfig is B4BConfig {
    function dummyFunction() external pure returns(uint256) {
        return 0;
    }
}