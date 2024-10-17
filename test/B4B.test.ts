import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { B4B, MockedB4B, MockedUSDC, B4BConfig } from '../typechain-types';
import { ContractTransaction } from 'ethers';
import { BigNumber } from 'ethers';
import { CampaignStatus } from '../src/common/types';
import { Numbers, createIdentityCertificate } from '../src';

// TODO: is it a right import?
import { setupConfigContract, setupConfigContractAddressesOrThrow } from '../tasks/utils/helpers';

interface CampaignStruct {
    brandAddr: string;
    influencerID: number | BigNumber;
    releaseDate: number;
    orderCreationTime: number;
    orderComplitionTime: number;
    orderType: number;
    price: BigNumber;
    fee: number | BigNumber;
    rating: number | BigNumber;
    status: number;
    data: string;
}

describe('B4BMain', function () {
    const SECONDS_IN_HOUR = 60 * 60;
    const INFLUENCER_ID = 0xffff;
    const OTHER_INFLUENCER_ID = 0xfffa;
    const INVALID_INFLUENCER_ID = 0xaaaa;

    const ORDER_TYPE_0 = 0;
    const ORDER_TYPE_1 = 1;

    const ORDER_TYPE_0_ID = 0xfff0;
    const ORDER_TYPE_1_ID = 0xfff1;

    const ARG0_PLACEHOLDER = 0;

    // const HASH = ethers.utils.sha256("UNIQUE_DATA");
    const HASH = ethers.utils.id('UNIQUE_DATA');

    function generateCampaignStruct(
        brandAddr: string,
        timestamp: number,
        status: number,
        otherFields?: Partial<CampaignStruct>,
    ) {
        return {
            brandAddr: brandAddr,
            influencerID: INFLUENCER_ID,
            releaseDate: timestamp + 24 * SECONDS_IN_HOUR,
            orderCreationTime: timestamp,
            orderComplitionTime: timestamp + 34 * SECONDS_IN_HOUR,
            orderType: ORDER_TYPE_0,
            price: ethers.utils.parseEther('1000'),
            fee: ethers.utils.parseEther('30'),
            rating: 0,
            status: status,
            data: HASH,
            ...otherFields,
        } as CampaignStruct;
    }

    async function deployOrder(order: CampaignStruct, b4b: MockedB4B, usdc: MockedUSDC, orderId?: number) {
        await waitTx(b4b.createOrderManually(order, orderId ?? ORDER_TYPE_0_ID));

        const price = BigNumber.from(order.price);
        const fee = BigNumber.from(order.fee);

        // Mint tokens
        await waitTx(usdc.mint(b4b.address, price.add(fee)));
    }

    async function waitTx(txPromise: Promise<ContractTransaction>) {
        const tx = await txPromise;
        return await tx.wait();
    }

    async function deployFixture() {
        const [owner, brand, influencer, otherBrand, unverifiedInfluencer] = await ethers.getSigners();

        const USDC = await ethers.getContractFactory('MockedUSDC');
        const Identity = await ethers.getContractFactory('MockedIdentity');
        const B4B = await ethers.getContractFactory('MockedB4B');
        const Config = await ethers.getContractFactory('B4BConfig');

        const usdcContract = (await USDC.deploy('USDC', 'USDC', 18)) as MockedUSDC;
        const identity = await Identity.deploy('UID', 'UID');

        const config = await upgrades.deployProxy(Config, [owner.address]);
        await setupConfigContract(config as B4BConfig);

        const deployments = [
            {
                name: 'USDC',
                address: usdcContract.address,
            },
            {
                name: 'UniqueIdentity',
                address: identity.address,
            },
            // {
            //     name: 'B4BCoin',
            //     address: coinsContract.address,
            // },
            // {
            //     name: 'Booster',
            //     address: boosterContract.address,
            // },
        ];

        await setupConfigContractAddressesOrThrow(config as B4BConfig, deployments);

        const b4bContract = (await B4B.deploy(config.address)) as MockedB4B;

        const MINTED_VALUE = ethers.utils.parseEther('10000');
        await waitTx(usdcContract.mint(brand.address, MINTED_VALUE));
        await waitTx(usdcContract.connect(brand).increaseAllowance(b4bContract.address, MINTED_VALUE));

        // Verify Influencer
        await waitTx(identity.mintTo(influencer.address, INFLUENCER_ID));

        return { b4bContract, owner, brand, influencer, identity, usdcContract, otherBrand, unverifiedInfluencer };
    }

    describe('Create Order', function () {
        it('should create order and transfer tokens with valid params', async function () {
            const { b4bContract, owner, brand, influencer, identity, usdcContract } = await loadFixture(deployFixture);

            const PRICE_TYPE_0 = ethers.utils.parseEther('100');

            const FEE_TYPE_0 = await b4bContract.previewFee(PRICE_TYPE_0);

            const validReleaseDate = (await time.latest()) + 25 * SECONDS_IN_HOUR;
            await waitTx(
                b4bContract
                    .connect(brand)
                    .createOrder(INFLUENCER_ID, ORDER_TYPE_0, validReleaseDate, PRICE_TYPE_0, HASH),
            );

            const balance = await usdcContract.balanceOf(b4bContract.address);

            expect(balance).to.equal(PRICE_TYPE_0.add(FEE_TYPE_0));
        });

        it('should fail with invalid influencer id', async function () {
            const { b4bContract, brand } = await loadFixture(deployFixture);

            const PRICE_TYPE_0 = ethers.utils.parseEther('100');
            const validReleaseDate = (await time.latest()) + 25 * SECONDS_IN_HOUR;
            await expect(
                b4bContract
                    .connect(brand)
                    .createOrder(INVALID_INFLUENCER_ID, ORDER_TYPE_0, validReleaseDate, PRICE_TYPE_0, HASH),
            ).to.be.revertedWithCustomError(b4bContract, 'UnauthorizedError');
        });

        it('should fail with invalid release date', async function () {
            const { b4bContract, brand } = await loadFixture(deployFixture);

            const PRICE_TYPE_0 = ethers.utils.parseEther('100');
            const invalidReleaseDate = (await time.latest()) + 23 * SECONDS_IN_HOUR;
            await expect(
                b4bContract
                    .connect(brand)
                    .createOrder(INFLUENCER_ID, ORDER_TYPE_0, invalidReleaseDate, PRICE_TYPE_0, HASH),
            ).to.be.reverted;
        });

        it('should create order with valid certificate', async function () {
            const { b4bContract, owner, brand, identity, usdcContract, unverifiedInfluencer } = await loadFixture(deployFixture);

            const PRICE_TYPE_0 = ethers.utils.parseEther('100');
            const FEE_TYPE_0 = await b4bContract.previewFee(PRICE_TYPE_0);

            const expiresAt = await time.latest() + SECONDS_IN_HOUR;
            const validReleaseDate = (await time.latest()) + 25 * SECONDS_IN_HOUR;
            const certificate = await createIdentityCertificate(
                unverifiedInfluencer.address,
                OTHER_INFLUENCER_ID,
                owner,
                identity.address
            );

            await waitTx(
                b4bContract
                    .connect(brand)
                    .createOrderWithCertificate(ORDER_TYPE_0, validReleaseDate, PRICE_TYPE_0, HASH, certificate),
            );

            const balance = await usdcContract.balanceOf(b4bContract.address);
            expect(balance).to.equal(PRICE_TYPE_0.add(FEE_TYPE_0));

            const balanceId = await identity.balanceOf(unverifiedInfluencer.address);
            expect(balanceId).to.equal(1);
        });
    });

    describe('Accept Order', function () {
        // accept order
        // - only valid state transition
        // - time logic + rating

        it('should add 100 rating if order is accepted before 2 hours', async function () {
            const { b4bContract, owner, brand, influencer, identity, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
            await deployOrder(order, b4bContract, usdcContract);

            await time.increaseTo(timestamp + SECONDS_IN_HOUR); // TODO: check this

            await expect(b4bContract.connect(influencer).acceptOrder(ORDER_TYPE_0_ID))
                .to.emit(b4bContract, 'OrderUpdated')
                .withArgs(ORDER_TYPE_0_ID, CampaignStatus.OrderAccepted, 100, ARG0_PLACEHOLDER);

            const campaign = await b4bContract.campaigns(ORDER_TYPE_0_ID);
            expect(campaign.rating).to.equal('100');
        });

        // it("6h - 80", async function () {

        // });

        // it("24h - 50", async function () {

        // });

        it('should fail with invalid influencer id', async function () {
            const { b4bContract, brand, usdcContract, unverifiedInfluencer } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
            await deployOrder(order, b4bContract, usdcContract);

            await time.increaseTo(timestamp + SECONDS_IN_HOUR);

            await expect(
                b4bContract.connect(unverifiedInfluencer).acceptOrder(ORDER_TYPE_0_ID),
            ).to.be.revertedWithCustomError(b4bContract, 'UnauthorizedError');
        });

        it('should fail with invalid campaign id', async function () {
            const { b4bContract, brand, usdcContract, influencer } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
            await deployOrder(order, b4bContract, usdcContract);

            await time.increaseTo(timestamp + SECONDS_IN_HOUR);

            await expect(b4bContract.connect(influencer).acceptOrder(ORDER_TYPE_1_ID)).to.be.reverted;
        });

        it('should fail if called after claimOrder', async function () {
            const { b4bContract, brand, usdcContract, influencer } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
            await deployOrder(order, b4bContract, usdcContract);

            await time.increaseTo(timestamp + 25 * SECONDS_IN_HOUR);

            await waitTx(b4bContract.connect(brand).claimOrder(ORDER_TYPE_0_ID));

            await expect(b4bContract.connect(influencer).acceptOrder(ORDER_TYPE_0_ID)).to.be.revertedWithCustomError(
                b4bContract,
                'InvalidStateError',
            );
        });
    });

    describe('Reject Order', function () {
        it('should emit event with valid args', async function () {
            const { b4bContract, brand, usdcContract, influencer } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
            await deployOrder(order, b4bContract, usdcContract);

            await expect(b4bContract.connect(influencer).rejectOrder(ORDER_TYPE_0_ID))
                .to.emit(b4bContract, 'OrderUpdated')
                .withArgs(ORDER_TYPE_0_ID, CampaignStatus.OrderRejected, order.rating, ARG0_PLACEHOLDER);
        });

        it('should return tokens to brand', async function () {
            const { b4bContract, brand, usdcContract, influencer } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
            await deployOrder(order, b4bContract, usdcContract);

            await expect(b4bContract.connect(influencer).rejectOrder(ORDER_TYPE_0_ID)).to.changeTokenBalance(
                usdcContract,
                brand.address,
                order.price.add(order.fee),
            );
        });

        it('should fail if called by invalid influencer', async function () {
            const { b4bContract, brand, usdcContract, unverifiedInfluencer } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
            await deployOrder(order, b4bContract, usdcContract);

            await expect(
                b4bContract.connect(unverifiedInfluencer).rejectOrder(ORDER_TYPE_0_ID),
            ).to.be.revertedWithCustomError(b4bContract, 'UnauthorizedError');
        });

        it('should fail with invalid campaign id', async function () {
            const { b4bContract, brand, usdcContract, influencer } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
            await deployOrder(order, b4bContract, usdcContract);

            const invalidOrderId = ORDER_TYPE_1_ID;
            await expect(b4bContract.connect(influencer).rejectOrder(invalidOrderId)).to.be.revertedWithCustomError(
                b4bContract,
                'UnauthorizedError',
            );
        });

        it('should fail if state is other then OrderCreated', async function () {
            const { b4bContract, brand, usdcContract, influencer } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderAccepted);
            await deployOrder(order, b4bContract, usdcContract);

            await expect(b4bContract.connect(influencer).rejectOrder(ORDER_TYPE_0_ID)).to.be.revertedWithCustomError(
                b4bContract,
                'InvalidStateError',
            );
        });
    });

    describe('Claim Order', function () {
        it('should fail if time is not up ', async function () {
            const { b4bContract, brand, usdcContract, influencer } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
            await deployOrder(order, b4bContract, usdcContract);

            await time.increaseTo(timestamp + 22 * SECONDS_IN_HOUR);

            await expect(b4bContract.connect(brand).claimOrder(ORDER_TYPE_0_ID)).to.be.revertedWithCustomError(
                b4bContract,
                'TimeError',
            );
        });

        it('should return money to brand if order is rejected', async function () {
            const { b4bContract, brand, usdcContract, influencer } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderRejected);
            await deployOrder(order, b4bContract, usdcContract);

            const expectedBalanceChange = order.price.add(order.fee);
            // balances
            await expect(b4bContract.connect(brand).claimOrder(ORDER_TYPE_0_ID)).to.changeTokenBalances(
                usdcContract,
                [brand, b4bContract],
                [expectedBalanceChange, expectedBalanceChange.mul(-1)],
            );
        });

        it('should return money to brand if time is up', async function () {
            const { b4bContract, brand, usdcContract, influencer } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
            await deployOrder(order, b4bContract, usdcContract);

            await time.increaseTo(timestamp + 25 * SECONDS_IN_HOUR);

            const expectedBalanceChange = order.price.add(order.fee);
            // balances
            await expect(b4bContract.connect(brand).claimOrder(ORDER_TYPE_0_ID)).to.changeTokenBalances(
                usdcContract,
                [brand, b4bContract],
                [expectedBalanceChange, expectedBalanceChange.mul(-1)],
            );
        });
    });

    describe('Complete Order', function () {
        // complete order
        // - time logic + rating

        it('should add 100 rating if completed before 22 hours', async function () {
            const { b4bContract, owner, brand, influencer, identity, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, 2);
            await deployOrder(order, b4bContract, usdcContract);

            await time.increaseTo(order.releaseDate + SECONDS_IN_HOUR);

            const expectedRating = 100;
            await expect(b4bContract.connect(influencer).completeOrder(ORDER_TYPE_0_ID))
                .to.emit(b4bContract, 'OrderUpdated')
                .withArgs(ORDER_TYPE_0_ID, CampaignStatus.OrderFilled, expectedRating, anyValue);
        });

        it('should add 50 rating if completed between 22 and 24 hours', async function () {
            const { b4bContract, owner, brand, influencer, identity, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, 2);
            await deployOrder(order, b4bContract, usdcContract);

            await time.increaseTo(order.releaseDate + 23 * SECONDS_IN_HOUR);

            const expectedRating = 50;
            await expect(b4bContract.connect(influencer).completeOrder(ORDER_TYPE_0_ID))
                .to.emit(b4bContract, 'OrderUpdated')
                .withArgs(ORDER_TYPE_0_ID, CampaignStatus.OrderFilled, expectedRating, anyValue);
        });

        it('should fail for invalid influencer', async function () {
            const { b4bContract, brand, unverifiedInfluencer, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, 2);
            await deployOrder(order, b4bContract, usdcContract);

            await expect(
                b4bContract.connect(unverifiedInfluencer).completeOrder(ORDER_TYPE_0_ID),
            ).to.be.revertedWithCustomError(b4bContract, 'UnauthorizedError');
        });

        it('should fail for invalid campaign id', async function () {
            const { b4bContract, brand, influencer, usdcContract } = await loadFixture(deployFixture);

            await expect(b4bContract.connect(influencer).completeOrder(ORDER_TYPE_1_ID)).to.be.revertedWithCustomError(
                b4bContract,
                'UnauthorizedError',
            );
        });

        it('should fail if state is not accepted', async function () {
            const { b4bContract, brand, influencer, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
            await deployOrder(order, b4bContract, usdcContract);

            await expect(b4bContract.connect(influencer).completeOrder(ORDER_TYPE_0_ID)).to.be.revertedWithCustomError(
                b4bContract,
                'InvalidStateError',
            );
        });
    });

    describe('Claim delayed Order', function () {
        // claim delayed order
        // - time logic + balances
        // - only brand

        it('should return assets to brand after 24 hours expired', async function () {
            const { b4bContract, owner, brand, influencer, identity, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderAccepted);
            await deployOrder(order, b4bContract, usdcContract);

            // time logic
            await time.increaseTo(order.releaseDate + 24 * SECONDS_IN_HOUR);

            const expectedBalanceChange = order.price.add(order.fee);
            await expect(b4bContract.connect(brand).claimDelayedOrder(ORDER_TYPE_0_ID)).to.changeTokenBalance(
                usdcContract,
                brand,
                expectedBalanceChange,
            );
        });

        it('should fail for invalid influencer', async function () {
            const { b4bContract, owner, brand, unverifiedInfluencer, usdcContract } = await loadFixture(deployFixture);
            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderAccepted);
            await deployOrder(order, b4bContract, usdcContract);

            await expect(b4bContract.connect(unverifiedInfluencer).claimDelayedOrder(ORDER_TYPE_0_ID)).to.be.reverted;
        });

        it('should fail for invalid campaign id', async function () {
            const { b4bContract, brand, influencer, usdcContract } = await loadFixture(deployFixture);

            await expect(b4bContract.connect(influencer).claimDelayedOrder(ORDER_TYPE_1_ID)).to.be.reverted;
        });
    });

    describe('Approve Results', function () {
        // approve result
        // - time logic
        // - balance change
        // - rating change
        // - only brand

        it('should change balance and rating', async function () {
            const { b4bContract, owner, brand, influencer, identity, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderFilled);
            await deployOrder(order, b4bContract, usdcContract);

            // time logic
            await time.increaseTo(order.orderComplitionTime + 12 * SECONDS_IN_HOUR);

            const score = 500;
            const expectedRating = 100;

            // balances
            await expect(b4bContract.connect(brand).aproveResult(ORDER_TYPE_0_ID, score)).to.changeTokenBalances(
                usdcContract,
                [influencer, b4bContract],
                [order.price, order.price.mul(-1)],
            );

            // rating
            // const rating = await b4bContract.ratingOf(order.influencerID);
            // expect(rating).to.equal(expectedRating);
        });

        it('should double rating for repeat ad campaign', async function () {
            const { b4bContract, owner, brand, influencer, identity, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderFilled);
            await deployOrder(order, b4bContract, usdcContract);

            // time logic
            await time.increaseTo(order.orderComplitionTime + 12 * SECONDS_IN_HOUR);

            // first ad campaign
            await waitTx(b4bContract.connect(brand).aproveResult(ORDER_TYPE_0_ID, 500));

            // repeat ad campaign
            order.orderType = ORDER_TYPE_1;
            await deployOrder(order, b4bContract, usdcContract, ORDER_TYPE_1_ID);

            // rating
            const expectedRating = 100 * 2;
            await expect(b4bContract.connect(brand).aproveResult(ORDER_TYPE_1_ID, 500))
                .to.emit(b4bContract, "OrderUpdated")
                .withArgs(ORDER_TYPE_1_ID, CampaignStatus.ResultAproved, expectedRating, anyValue);
        });
    });

    describe('Claim Payment', function () {
        it('rating and balance change', async function () {
            const { b4bContract, owner, brand, influencer, identity, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderFilled);
            await deployOrder(order, b4bContract, usdcContract);

            // time logic
            await time.increaseTo(order.orderComplitionTime + 25 * SECONDS_IN_HOUR);

            const expectedRating = 100;

            // balances
            await expect(
                b4bContract.connect(influencer).claimAutoApprovedPayment(ORDER_TYPE_0_ID),
            ).to.changeTokenBalances(usdcContract, [influencer, b4bContract], [order.price, order.price.mul(-1)]);
        });
    });

    describe('Approve Result Admin', function() {
        it('should fail if state is not ResultRejected', async function () {
            const { owner, b4bContract, brand, influencer, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderFilled);
            await deployOrder(order, b4bContract, usdcContract);

            await expect(b4bContract.connect(owner).approveResultAdmin(ORDER_TYPE_0_ID)).to.be.revertedWithCustomError(
                b4bContract,
                'InvalidStateError',
            );
        });

        it('should send assets to influencer and increase rating', async function () {
            const { b4bContract, owner, brand, influencer, identity, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.ResultRejected);
            await deployOrder(order, b4bContract, usdcContract);


            const expectedRating = 100;
            // balances
            await expect(b4bContract.connect(owner).approveResultAdmin(ORDER_TYPE_0_ID)).to.changeTokenBalances(
                usdcContract,
                [influencer, b4bContract],
                [order.price, order.price.mul(-1)],
            );

            // ratring
            // const rating = await b4bContract.ratingOf(order.influencerID);
            // expect(rating).to.equal(expectedRating);
        });
    });

    describe('Reject Result Admin', function() {
        it('should fail if state is not ResultRejected', async function () {
            const { owner, b4bContract, brand, influencer, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderFilled);
            await deployOrder(order, b4bContract, usdcContract);

            await expect(b4bContract.connect(owner).rejectResultAdmin(ORDER_TYPE_0_ID)).to.be.revertedWithCustomError(
                b4bContract,
                'InvalidStateError',
            );
        });

        it('should return assets to brand', async function () {
            const { b4bContract, owner, brand, influencer, identity, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.ResultRejected);
            await deployOrder(order, b4bContract, usdcContract);

            const assets = order.price.add(order.fee);
            await expect(b4bContract.connect(owner).rejectResultAdmin(ORDER_TYPE_0_ID)).to.changeTokenBalances(
                usdcContract,
                [brand, b4bContract],
                [assets, assets.mul(-1)],
            );
        });
    });

    describe('Collect Protocol Fee', function() {
        it('should collect service fee', async function () {
            const { b4bContract, brand, usdcContract } = await loadFixture(deployFixture);

            const timestamp = await time.latest();
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderFilled);
            await deployOrder(order, b4bContract, usdcContract);

            // time logic
            await time.increaseTo(order.orderComplitionTime + 12 * SECONDS_IN_HOUR);

            const score = 500;

            // balances
            await waitTx(b4bContract.connect(brand).aproveResult(ORDER_TYPE_0_ID, score));

            const serviceFee = await b4bContract.totalFee();
            expect(serviceFee).to.equal(order.fee);
        });

    });
});
