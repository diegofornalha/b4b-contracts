export enum CampaignStatus {
    NotExist = 0,
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
    ResultAprovedAdmin,
}

export enum OrderType {
    Post = 0,
    Repost,
    PostPin,
}

export interface Campaign {
    brandAddr: string;
    influencerId: string;
    releaseDate: number; // unix timestamp / 1000
    orderCreationDate: number;
    orderCompletionDate: number;
    orderType: OrderType;
    price: number;
    fee: number;
    rating: number;
    status: CampaignStatus;
    data: string;
}
