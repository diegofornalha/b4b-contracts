// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/// @title B4B Protocol main contract
interface IB4B {
    enum CampaignStatus {
        NotExist,
        OrderCreated,
        OrderAccepted,
        OrderRejected,
        OrderRefunded,
        OrderFilled,
        OrderDelayedRefunded,
        ResultAproved,
        ResultRejected,
        ResultAutoAproved,
        ResultRejectedAdmin,
        ResultAprovedAdmin
    }

    /// @dev MAX number of enum's key == 10
    enum OrderType {
        Post,
        Repost,
        PostPin
    }

    struct Campaign {
        address brandAddr; // brand address to book campaign
        uint256 influencerID; // influencer address to book campaign
        uint256 releaseDate; //dateAds for booking ads campaign (the 1st second of the dateAds)
        uint256 orderCreationTime; //time when the order is created
        uint256 orderComplitionTime; //time when the ads was completed by influencer
        OrderType orderType; // 1 - post, 2 - repost, 3 - post+pin24
        uint256 price; //how much paid in total by brand in USDC
        uint256 fee;
        uint256 rating; //sum points which influencer is receiving during the campaign
        bytes32 data;
        CampaignStatus status;
    }

    /**** ERRORS ****/
    error TimeError(uint256 campaignID, CampaignStatus status);
    error UnauthorizedError();
    error InvalidStateError(uint256 campaignID, CampaignStatus current);

    /**** EVENTS ****/

    event OrderCreated(uint256 orderId, Campaign order);
    event OrderUpdated(uint256 orderId, CampaignStatus status, uint256 rating, uint256 arg0);
    event PriceUpdated(uint256 influencerID, uint64[] orderTypes, uint256[] prices);

    function previewFee(uint256 value) external view returns (uint256);

    function createOrderWithCertificate(
        OrderType orderType,
        uint256 releaseDate,
        uint256 price,
        bytes32 dataHash,
        bytes calldata certificate
    ) external;

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
    ) external;

    /**
     * @notice Accepts order
     *  - caller: influencer
     * @param campaignID id of the campaign
     */
    function acceptOrder(uint256 campaignID) external;

    /**
     * @notice Rejects order if it's not refunded
     *  - caller: influencer
     * @param campaignID id of the campaign
     */
    function rejectOrder(uint256 campaignID) external;

    /**
     * @notice Returns money to the brand if order is rejected or time is up
     *  - caller: brand
     * @param campaignID id of the campaign
     */
    function claimOrder(uint256 campaignID) external;

    /**
     * @notice Marks order as completed and accrues rating points
     *  - caller: influencer
     * @param campaignID id of the campaign
     */
    function completeOrder(uint256 campaignID) external;

    /**
     * @notice Returns money to the brand if order is not completed in time
     *  - caller: brand
     * @param campaignID id of the campaign
     */
    function claimDelayedOrder(uint256 campaignID) external;

    /**
     * @notice Aproves result of ad campaign
     *  - caller: brand
     * @param campaignID id of the campaign
     */
    function aproveResult(uint256 campaignID, uint256 score) external;

    /**
     * @notice Claims rewards for ad campaign
     *  - caller: influencer
     * @param campaignID id of the campaign
     */
    function claimAutoApprovedPayment(uint256 campaignID) external;

    //rejectAds, then admin can manage Smart Contract and send funds to influencer/business
    function rejectResult(uint256 campaignID) external;

    /**
     * @notice
     */
    function approveResultAdmin(uint256 campaignID) external;

    /**
     * @notice
     */
    function rejectResultAdmin(uint256 campaignID) external;

    function withdrawServiceFee(address account) external;
}
