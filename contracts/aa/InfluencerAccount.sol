// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.9;

// pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */
/* solhint-disable reason-string */

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// import {SimpleAccount} from "@account-abstraction/contracts/samples/SimpleAccount.sol";
import {BaseAccount} from "@account-abstraction/contracts/core/BaseAccount.sol";
import {IEntryPoint, UserOperation} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {B4B} from "../core/B4B.sol";
import {Bytecode} from "./utils/Bytecode.sol";

// import "./callback/TokenCallbackHandler.sol";

/**
 * minimal account.
 *  this is sample minimal account.
 *  has execute, eth handling methods
 *  has a single signer that can send requests through the entryPoint.
 */
contract InfluencerAccount is BaseAccount {
    using ECDSA for bytes32;

    // IEntryPoint private immutable _entryPoint;

    // event SimpleAccountInitialized(IEntryPoint indexed entryPoint);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view virtual override returns (IEntryPoint) {
        uint256 length = address(this).code.length;
        address entryPointAddr = abi.decode(
            Bytecode.codeAt(address(this), length - 0x60, length - 0x40),
                (address)
        );

        return IEntryPoint(entryPointAddr);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}


    function _onlyOwner() internal view {
        //directly from EOA owner, or through the account itself (which gets redirected through execute())
        require(msg.sender == owner() || msg.sender == address(this), "only owner");
    }

    function token()
        external
        view
        returns (
            address owner_,
            uint256 tokenId
        )
    {
        uint256 length = address(this).code.length;
        return
            abi.decode(
                Bytecode.codeAt(address(this), length - 0x40, length),
                (address, uint256)
            );
    }

    function owner() public view returns (address) {
        (address owner_, ) = this.token();

        return owner_;
    }

    /**
     * execute a transaction (called directly from owner, or by entryPoint)
     */
    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPointOrOwner();
        _call(dest, value, func);
    }

    /**
     * execute a sequence of transactions
     */
    function executeBatch(address[] calldata dest, bytes[] calldata func) external {
        _requireFromEntryPointOrOwner();
        require(dest.length == func.length, "wrong array lengths");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }

    // Require the function call went through EntryPoint or owner
    function _requireFromEntryPointOrOwner() internal view {
        require(
            msg.sender == address(entryPoint()) || owner() == msg.sender,
            "account: not Owner or EntryPoint"
        );
    }

    /// implement template method of BaseAccount
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner() != hash.recover(userOp.signature)) return SIG_VALIDATION_FAILED;
        return 0;
    }

    function _payPrefund(uint256 missingAccountFunds) internal virtual override(BaseAccount) {
        // transfer from 
        if (missingAccountFunds != 0) {
            (bool success,) = payable(msg.sender).call{value : missingAccountFunds, gas : type(uint256).max}("");
            (success);
            //ignore failure (its EntryPoint's job to verify, not account.)
        }
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /**
     * check current account deposit in the entryPoint
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }

    /**
     * deposit more funds for this account in the entryPoint
     */
    function addDeposit() public payable {
        entryPoint().depositTo{value: msg.value}(address(this));
    }

    /**
     * withdraw value from the account's deposit
     * @param withdrawAddress target to send to
     * @param amount to withdraw
     */
    function withdrawDepositTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }
}
