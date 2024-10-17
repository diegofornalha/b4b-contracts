// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {B4BConfig} from "./Config.sol";
import {IB4B} from "../interfaces/IB4B.sol";
import {BasePausableUpgradeable} from "./BasePausableUpgradeable.sol";

/// @title B4B Protocol main contract
contract B4B is BasePausableUpgradeable, IB4B {
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    uint256 public constant ARG0_PLACEHOLDER = 0;

    using CountersUpgradeable for CountersUpgradeable.Counter;

    B4BConfig public config;
    uint256 public totalFee;

     /// @notice Campaign ID => Campaign
    mapping(uint256 => Campaign) public campaigns;
    CountersUpgradeable.Counter private _campaignsCounter;

    /**** INITIALIZER ****/

    function initialize(address config_, address adminAccount_) public initializer {
        // __B4BRating_init_unchained(B4BConfig(config_));
        config = B4BConfig(config_);
        __BasePausableUpgradeable_init(adminAccount_);
        __B4B_init_unchained(adminAccount_);
    }

    function __B4B_init_unchained(address adminAccount_) internal onlyInitializing {
        _setupRole(ARBITRATOR_ROLE, adminAccount_);
    }

    /**** MODIFIERS ****/

    modifier onlyVerified(uint256 influencerID) {
        try config.getUniqueIdentity().ownerOf(influencerID) returns (address) {} catch {
            revert UnauthorizedError();
        }
        _;
    }

    modifier onlyBrand(uint256 campaignID) {
        if (!(_checkCampaign(campaignID) && campaigns[campaignID].brandAddr == _msgSender()))
            revert UnauthorizedError();
        _;
    }

    modifier onlyInfluencer(uint256 campaignID) {
        if (!(_checkCampaign(campaignID) && _checkIdentity(campaigns[campaignID].influencerID)))
            revert UnauthorizedError();
        _;
    }

    /**** INTERNAL ****/

    function _checkCampaign(uint256 campaignID) internal view returns (bool) {
        return campaigns[campaignID].status != CampaignStatus.NotExist;
    }

    function _checkIdentity(uint256 influencerID) internal view returns (bool) {
        return msg.sender == this.getInfluencerAccount(influencerID);
    }

    function _validateScore(uint256 score) internal pure returns (bool) {
        return score >= 0 && score <= 500;
    }


    function _addRatingGain(Campaign memory c) internal returns (uint256) {
        uint256 rating = c.rating;

        return rating;
    }

    function previewFee(uint256 value) public view returns (uint256) {
        uint256 fee = (value * config.getFeeNumerator()) / config.getFeeDenumerator();
        uint256 minFee = config.getMinFeeInWei();

        return fee > minFee ? fee : minFee;
    }

    function getInfluencerAccount(uint256 id) public view returns (address) {
        return config.getAccountRegistry().account(
            address(config.getUniqueIdentity()),
            id,
            uint160(address(this))
        );
    }

    function _collectProtocolFee(uint256 protocolFee) internal {
        totalFee += protocolFee;
    }

    /**** EXTERNAL ****/

    function createOrderWithCertificate(
        OrderType orderType,
        uint256 releaseDate,
        uint256 price,
        bytes32 dataHash,
        bytes calldata certificate
    ) external whenNotPaused {
        (address account, uint256 id, bytes memory signature) = abi.decode(
            certificate,
            (address, uint256, bytes)
        );

        config.getUniqueIdentity().mint(account, id, signature);
        config.getAccountRegistry().createAccount(
            address(config.getUniqueIdentity()),
            id,
            uint160(address(this))
        );

        _createOrder(id, orderType, releaseDate, price, dataHash);
    }

    /**
     * @notice Creates order for ad campaign
     * - caller: brand
     * @param influencerID influencer's token id from UniqueIdentity contract
     * @param orderType type of order (post, repost, post+pin)
     * @param releaseDate plan date of ad integration (unix timestamp / 1000)
     * @param dataHash hash of off-chain order's data
     */
    function createOrder(
        uint256 influencerID,
        OrderType orderType,
        uint256 releaseDate,
        uint256 price,
        bytes32 dataHash
    ) external whenNotPaused {
        try config.getUniqueIdentity().ownerOf(influencerID) returns (address) {} catch {
            revert UnauthorizedError();
        }

        _createOrder(influencerID, orderType, releaseDate, price, dataHash);
    }

    function _createOrder(
        uint256 influencerID,
        OrderType orderType,
        uint256 releaseDate,
        uint256 price,
        bytes32 data
    ) internal {
        // timezone should be handled on back-end
        // require(
        //     releaseDate >= block.timestamp + config.getReleasePeriod(),
        //     "B4B: release must be at least 24 hours after"
        // );

        require(releaseDate >= block.timestamp, "B4B: release must be in the future");

        // TODO: check release date upper bound

        require(price > 0, "B4B: zero price");

        uint256 fee = previewFee(price);

        _campaignsCounter.increment();
        uint256 campaignID = _campaignsCounter.current();

        campaigns[campaignID] = Campaign({
            brandAddr: msg.sender,
            influencerID: influencerID,
            releaseDate: releaseDate,
            orderCreationTime: block.timestamp,
            orderComplitionTime: 0,
            orderType: orderType,
            price: price,
            fee: fee,
            rating: 0,
            status: CampaignStatus.OrderCreated,
            data: data
        });

        emit OrderCreated(campaignID, campaigns[campaignID]);

        SafeERC20Upgradeable.safeTransferFrom(
            config.getUSDC(),
            msg.sender,
            address(this),
            price + fee
        );
    }

    /**
     * @notice Accepts order
     *  - caller: influencer
     * @param campaignID id of the campaign
     */
    function acceptOrder(uint256 campaignID) public onlyInfluencer(campaignID) {
        Campaign storage c = campaigns[campaignID];

        if (c.status != CampaignStatus.OrderCreated) revert InvalidStateError(campaignID, c.status);

        // B4BConfig.Value[] memory rewardScale = config.getAcceptOrderTimeRewardScale();
        // for (uint256 i = 0; i < rewardScale.length; i++) {
        //     if (block.timestamp <= c.orderCreationTime + rewardScale[i]._bound) {
        //         c.rating += rewardScale[i]._value;
        //         break;
        //     }
        // }

        c.status = CampaignStatus.OrderAccepted;

        emit OrderUpdated(campaignID, c.status, c.rating, ARG0_PLACEHOLDER);
    }

    /**
     * @notice Rejects order if it's not refunded
     *  - caller: influencer
     * @param campaignID id of the campaign
     */
    function rejectOrder(uint256 campaignID) public onlyInfluencer(campaignID) {
        Campaign storage c = campaigns[campaignID];

        if (c.status != CampaignStatus.OrderCreated) revert InvalidStateError(campaignID, c.status);
        // time check ??

        c.status = CampaignStatus.OrderRejected;

        emit OrderUpdated(campaignID, c.status, c.rating, ARG0_PLACEHOLDER);

        SafeERC20Upgradeable.safeTransfer(config.getUSDC(), c.brandAddr, c.price + c.fee);
    }

    /**
     * @notice Returns money to the brand if order is rejected or time is up
     *  - caller: brand
     * @param campaignID id of the campaign
     */
    function claimOrder(uint256 campaignID) public onlyBrand(campaignID) {
        Campaign storage c = campaigns[campaignID];

        if (c.status == CampaignStatus.OrderCreated) {
            if (block.timestamp < c.orderCreationTime + config.getClaimPeriod())
                revert TimeError(campaignID, c.status);
        } else if (c.status != CampaignStatus.OrderRejected) {
            revert InvalidStateError(campaignID, c.status);
        }

        c.status = CampaignStatus.OrderRefunded;
        emit OrderUpdated(campaignID, c.status, c.rating, ARG0_PLACEHOLDER);

        SafeERC20Upgradeable.safeTransfer(config.getUSDC(), c.brandAddr, c.price + c.fee);
    }

    /**
     * @notice Marks order as completed and accrues rating points
     *  - caller: influencer
     * @param campaignID id of the campaign
     */
    function completeOrder(uint256 campaignID) public onlyInfluencer(campaignID) {
        Campaign storage c = campaigns[campaignID];

        if (c.status != CampaignStatus.OrderAccepted)
            revert InvalidStateError(campaignID, c.status);

        // TODO: AA: validAfter releaseDat
        // if (block.timestamp < c.releaseDate) revert TimeError(campaignID, c.status);

        c.status = CampaignStatus.OrderFilled;
        c.orderComplitionTime = block.timestamp;

        B4BConfig.Value[] memory rewardScale = config.getCompleteOrderTimeRewardScale();
        for (uint256 i = 0; i < rewardScale.length; i++) {
            if (block.timestamp <= c.releaseDate + rewardScale[i]._bound) {
                c.rating += rewardScale[i]._value;
                break;
            }
        }

        emit OrderUpdated(campaignID, c.status, c.rating, c.orderComplitionTime);
    }

    /**
     * @notice Returns money to the brand if order is not completed in time
     *  - caller: brand
     * @param campaignID id of the campaign
     */
    function claimDelayedOrder(uint256 campaignID) public onlyBrand(campaignID) whenNotPaused {
        Campaign storage c = campaigns[campaignID];

        if (c.status != CampaignStatus.OrderAccepted)
            revert InvalidStateError(campaignID, c.status);

        // TODO: AA: validUntil
        if (block.timestamp < c.releaseDate + config.getClaimPeriod())
            revert TimeError(campaignID, c.status);

        c.status = CampaignStatus.OrderDelayedRefunded;
        emit OrderUpdated(campaignID, c.status, c.rating, ARG0_PLACEHOLDER);

        SafeERC20Upgradeable.safeTransfer(config.getUSDC(), c.brandAddr, c.price + c.fee);
    }

    /**
     * @notice Aproves result of ad campaign
     *  - caller: brand
     * @param campaignID id of the campaign
     */
    function aproveResult(uint256 campaignID, uint256 score) public onlyBrand(campaignID) {
        Campaign storage c = campaigns[campaignID];

        if (c.status != CampaignStatus.OrderFilled) revert InvalidStateError(campaignID, c.status);

        require(_validateScore(score), "B4B: invalid value for score");

        // B4BConfig.Value[] memory rewardScale = config.getApproveResultsScoreRewardScale();
        // for (uint256 i = 0; i < rewardScale.length; i++) {
        //     if (score >= rewardScale[i]._bound) {
        //         c.rating += rewardScale[i]._value;
        //         break;
        //     }
        // }

        c.status = CampaignStatus.ResultAproved;

        // c.rating = _addRatingGain(c);
        _collectProtocolFee(c.fee);

        emit OrderUpdated(campaignID, c.status, c.rating, ARG0_PLACEHOLDER);

        SafeERC20Upgradeable.safeTransfer(
            config.getUSDC(),
            config.getUniqueIdentity().ownerOf(c.influencerID),
            c.price
        );
    }

    /**
     * @notice Claims rewards for ad campaign
     *  - caller: influencer
     * @param campaignID id of the campaign
     */
    function claimAutoApprovedPayment(
        uint256 campaignID
    ) public onlyInfluencer(campaignID) whenNotPaused {
        Campaign storage c = campaigns[campaignID];

        if (c.status != CampaignStatus.OrderFilled) revert InvalidStateError(campaignID, c.status);

        // TODO: AA: validUntil
        // if (block.timestamp < c.orderComplitionTime + config.getAprovePeriod())
        //     revert TimeError(campaignID, c.status);

        c.status = CampaignStatus.ResultAutoAproved;
        // c.rating += 100; // why 100?

        // c.rating = _addRatingGain(c);
        _collectProtocolFee(c.fee);

        emit OrderUpdated(campaignID, c.status, c.rating, ARG0_PLACEHOLDER);

        SafeERC20Upgradeable.safeTransfer(
            config.getUSDC(),
            config.getUniqueIdentity().ownerOf(c.influencerID),
            c.price
        );
    }

    //rejectAds, then admin can manage Smart Contract and send funds to influencer/business
    function rejectResult(uint256 campaignID) public onlyBrand(campaignID) {
        Campaign storage c = campaigns[campaignID];

        if (c.status != CampaignStatus.OrderFilled) revert InvalidStateError(campaignID, c.status);

        c.status = CampaignStatus.ResultRejected;
        emit OrderUpdated(campaignID, c.status, c.rating, ARG0_PLACEHOLDER);
    }

    /**
     * @notice
     */
    function approveResultAdmin(uint256 campaignID) external onlyRole(ARBITRATOR_ROLE) {
        Campaign storage c = campaigns[campaignID];

        if (c.status != CampaignStatus.ResultRejected)
            revert InvalidStateError(campaignID, c.status);

        c.status = CampaignStatus.ResultAprovedAdmin;
        c.rating += 100; // why 100?

        c.rating = _addRatingGain(c);
        _collectProtocolFee(c.fee);

        emit OrderUpdated(campaignID, c.status, c.rating, ARG0_PLACEHOLDER);

        SafeERC20Upgradeable.safeTransfer(
            config.getUSDC(),
            config.getUniqueIdentity().ownerOf(c.influencerID),
            c.price
        );
    }

    /**
     * @notice
     */
    function rejectResultAdmin(uint256 campaignID) external onlyRole(ARBITRATOR_ROLE) {
        Campaign storage c = campaigns[campaignID];

        if (c.status != CampaignStatus.ResultRejected)
            revert InvalidStateError(campaignID, c.status);

        c.status = CampaignStatus.ResultRejectedAdmin;
        emit OrderUpdated(campaignID, c.status, c.rating, ARG0_PLACEHOLDER);

        SafeERC20Upgradeable.safeTransfer(config.getUSDC(), c.brandAddr, c.price + c.fee);
    }

    function withdrawServiceFee(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 serviceFee = totalFee;
        totalFee = 0;
        SafeERC20Upgradeable.safeTransfer(config.getUSDC(), account, serviceFee);
    }
}
