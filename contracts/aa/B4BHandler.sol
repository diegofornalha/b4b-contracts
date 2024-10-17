// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.12;

import {IEntryPoint, UserOperation} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {IB4B} from "../interfaces/IB4B.sol";

library LibB4BHandler {

    function validateB4BOp(
        bytes calldata _data
    ) external view returns (uint256 validationResult) {
        require(_data.length >= 4, "Calldata mast be longer than 4 bytes");

        bytes4 inputSelector = bytes4(_data[:4]);

        if (inputSelector == IB4B.acceptOrder.selector) {
            // as is
        } else if (inputSelector == IB4B.completeOrder.selector) {
            // validAfter
        } else if (inputSelector == IB4B.claimAutoApprovedPayment.selector) {
            // validAfter
        }
    }
}
