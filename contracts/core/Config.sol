// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {ConfigOptions} from "./ConfigOptions.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IUniqueIdentity} from "../interfaces/IUniqueIdentity.sol";
import {IERC6551RegistryLike} from "../aa/interfaces/IERC6551Registry.sol";

contract B4BConfig is AccessControlUpgradeable {
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    struct Value {
        uint32 _bound;
        uint224 _value;
    }

    mapping(uint256 => address) public addresses;
    mapping(uint256 => uint256) public numbers;
    mapping(uint256 => Value[]) public scales;

    event AddressUpdated(ConfigOptions.Addresses, address oldValue, address newValue);
    event NumberUpdated(ConfigOptions.Numbers numberType, uint256 oldValue, uint256 newValue);

    function initialize(address adminAccount) public initializer {
        __B4BConfig_init_unchained(adminAccount);
    }

    function __B4BConfig_init_unchained(address adminAccount) internal onlyInitializing {
        _setupRole(DEFAULT_ADMIN_ROLE, adminAccount);
        _setupRole(OWNER_ROLE, adminAccount);
    }

    function setAddress(ConfigOptions.Addresses addressType, address addr)
        public
        onlyRole(OWNER_ROLE)
    {
        uint256 key = uint256(addressType);
        emit AddressUpdated(addressType, addresses[key], addr);
        addresses[key] = addr;
    }

    function setNumber(ConfigOptions.Numbers numberType, uint256 number)
        public
        onlyRole(OWNER_ROLE)
    {
        uint256 key = uint256(numberType);
        emit NumberUpdated(numberType, numbers[key], number);
        numbers[key] = number;
    }

    function setAddresses(ConfigOptions.Addresses[] calldata addressTypes_, address[] calldata addresses_)
        public
        onlyRole(OWNER_ROLE)
    {
        require(addressTypes_.length == addresses_.length, "Length mismatch!");
        for (uint256 i = 0; i < addressTypes_.length; i++) {
            setAddress(addressTypes_[i], addresses_[i]);
        }
    }

    function setNumbers(ConfigOptions.Numbers[] calldata numberTypes_, uint256[] calldata numbers_)
        public
        onlyRole(OWNER_ROLE)
    {
        require(numberTypes_.length == numbers_.length, "Length mismatch!");
        for (uint256 i = 0; i < numberTypes_.length; i++) {
            setNumber(numberTypes_[i], numbers_[i]);
        }
    }

    function setScale(ConfigOptions.Scales scaleType, Value[] calldata scale_)
        public
        onlyRole(OWNER_ROLE)
    {
        require(scale_.length > 0 && scale_.length <= 10, "Too many items!");

        uint256 key = uint256(scaleType);

        if (scales[key].length > 0) {
            delete scales[key];
        }

        for (uint256 i = 0; i < scale_.length; i++) {
            scales[key].push(Value({_bound: scale_[i]._bound, _value: scale_[i]._value}));
        }
    }

    function setAcceptOrderTimeRewardScale(Value[] calldata scale_) public onlyRole(OWNER_ROLE) {
        setScale(ConfigOptions.Scales.AcceptOrderTime, scale_);
    }

    function getAddress(ConfigOptions.Addresses addressType) public view returns (address) {
        uint256 key = uint256(addressType);
        return addresses[key];
    }

    function getNumber(ConfigOptions.Numbers numberType) public view returns (uint256) {
        uint256 key = uint256(numberType);
        return numbers[key];
    }

    function getScale(ConfigOptions.Scales scaleType) public view returns (Value[] memory) {
        uint256 key = uint256(scaleType);
        return scales[key];
    }

    function getAcceptOrderTimeRewardScale() public view returns (Value[] memory) {
        return getScale(ConfigOptions.Scales.AcceptOrderTime);
    }

    function getCompleteOrderTimeRewardScale() public view returns (Value[] memory) {
        return getScale(ConfigOptions.Scales.CompleteOrderTime);
    }

    function getApproveResultsScoreRewardScale() public view returns (Value[] memory) {
        return getScale(ConfigOptions.Scales.ApproveResultsScore);
    }

    /// Number

    function getReleasePeriod() public view returns (uint256) {
        return getNumber(ConfigOptions.Numbers.ReleasePeriodInSeconds);
    }

    function getAcceptPeriod() public view returns (uint256) {
        return getNumber(ConfigOptions.Numbers.AcceptPeriodInSeconds);
    }

    function getClaimPeriod() public view returns (uint256) {
        return getNumber(ConfigOptions.Numbers.ClaimAfterInSeconds);
    }

    function getAprovePeriod() public view returns (uint256) {
        return getNumber(ConfigOptions.Numbers.AprovePeriodInSeconds);
    }

    function getFeeNumerator() public view returns (uint256) {
        return getNumber(ConfigOptions.Numbers.FeeNumerator);
    }

    function getFeeDenumerator() public view returns (uint256) {
        return getNumber(ConfigOptions.Numbers.FeeDenumerator);
    }

    function getMinFeeInWei() public view returns (uint256) {
        return getNumber(ConfigOptions.Numbers.MinFeeInWei);
    }


    /// Addresses

    function getUSDC() public view returns (IERC20Upgradeable) {
        return IERC20Upgradeable(getAddress(ConfigOptions.Addresses.USDC));
    }

    function getUniqueIdentity() public view returns (IUniqueIdentity) {
        return IUniqueIdentity(getAddress(ConfigOptions.Addresses.UniqueIdentity));
    }

    function getAccountRegistry() public view returns (IERC6551RegistryLike) {
        return IERC6551RegistryLike(getAddress(ConfigOptions.Addresses.AccountRegistry));
    }
}
