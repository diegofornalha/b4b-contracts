import { expect } from 'chai';
import { ethers, run } from 'hardhat';
import { time, loadFixture, mine, takeSnapshot } from '@nomicfoundation/hardhat-network-helpers';

import { EventListener, ChainId, getContractsForChainOrThrow, OrderType, CampaignInfo, CampaignStatus } from '../src';

import { waitTx, MockedTimer } from './utils';
import { PatchSeries } from '../src/listener/eventListener';

import { OPTIONS } from '../src/listener/options';
import { BigNumber } from 'ethers';

import { createIdentityCertificate } from '../src';


describe('EventListener', function () {
    const SECONDS_IN_HOUR = 60 * 60;

    const INFLUENCER_ID = 1;

    const HASH = ethers.utils.id('UNIQUE_DATA');

    const CHAIN_ID = ChainId.LocalHardhat;

    let BLOCK_TO_MINE = 0;

    async function deployFixture() {
        const [owner, otherAccount, brand, influencer, influencer2] = await ethers.getSigners();
        const usdcContract = await run('deploy-mocked-usdc', { decimals: 6, silent: true });
        await run('deploy-and-configure', { usdcContractAddr: usdcContract.address, silent: true, create3: true });
        const contracts = getContractsForChainOrThrow(ChainId.LocalHardhat, owner);

        // Verify Influencer
        // await waitTx(contracts.uniqueIdentityContract.mint(influencer.address));

        BLOCK_TO_MINE = OPTIONS[ChainId.LocalHardhat]?.confirmations ?? 10 + 1;

        const MINTED_VALUE = ethers.utils.parseEther('10000');
        await waitTx(usdcContract.mint(brand.address, MINTED_VALUE));
        await waitTx(usdcContract.connect(brand).increaseAllowance(contracts.b4bContract.address, MINTED_VALUE));

        return { owner, otherAccount, contracts, brand, influencer, influencer2 };
    }

    it('should handle OrderCreated event', async function () {
        const { owner, otherAccount, contracts, brand, influencer } = await loadFixture(deployFixture);

        const provider = ethers.provider;

        const timer = new MockedTimer();
        const listener = new EventListener(ChainId.LocalHardhat, provider, timer);

        async function waitResult() {
            return new Promise((resolve) => {
                listener.once(resolve);
            });
        }

        await listener.start();

        const timestamp = (await time.latest()) + 25 * SECONDS_IN_HOUR;
        const price = ethers.utils.parseEther('1000.8');

        const certificate = await createIdentityCertificate(
            influencer.address,
            INFLUENCER_ID,
            owner
        );

        await waitTx(
            contracts.b4bContract.connect(brand).createOrderWithCertificate(OrderType.Post, timestamp, price, HASH, certificate),
        );

        const resultPromise = waitResult();

        await mine(BLOCK_TO_MINE);
        timer.tick();

        const result = (await resultPromise) as PatchSeries;

        expect(result.patches.length).to.equal(2);

        // TODO: add checks
    });

    // it('should handle Transfer event', async function () {
    //     const { owner, otherAccount, contracts, brand, influencer2 } = await loadFixture(deployFixture);

    //     const provider = ethers.provider;

    //     const timer = new MockedTimer();
    //     const listener = new EventListener(ChainId.LocalHardhat, provider, timer);

    //     async function waitResult() {
    //         return new Promise((resolve) => {
    //             listener.once(resolve);
    //         });
    //     }

    //     await listener.start();

    //     await waitTx(contracts.uniqueIdentityContract.mint(influencer2.address));

    //     const resultPromise = waitResult();

    //     await mine(BLOCK_TO_MINE);
    //     timer.tick();

    //     const result = (await resultPromise) as PatchSeries;

    //     expect(result.patches.length).to.equal(1);

    //     // TODO: add checks
    // });

    // // handle OrderCreated
    // // handle OrderUpdated - different states
    // // emit confirmed blocks
    // // emit delayed events

    it('should handle OrderUpdated', async function () {
        const { owner, otherAccount, contracts, brand, influencer } = await loadFixture(deployFixture);

        const provider = ethers.provider;

        const timer = new MockedTimer();
        const listener = new EventListener(ChainId.LocalHardhat, provider, timer);

        async function waitResult() {
            return new Promise((resolve) => {
                listener.once(resolve);
            });
        }

        await listener.start();

        const releaseDate = (await time.latest()) + 25 * SECONDS_IN_HOUR;
        const price = ethers.utils.parseEther('100');


        const certificate = await createIdentityCertificate(
            influencer.address,
            INFLUENCER_ID,
            owner
        );

        await waitTx(
            contracts.b4bContract.connect(brand).createOrderWithCertificate(OrderType.Post, releaseDate, price, HASH, certificate),
        );

        const resultPromise = waitResult();

        await mine(BLOCK_TO_MINE);
        timer.tick();

        const result = (await resultPromise) as PatchSeries;

        const orderId = (result.patches[1].data as CampaignInfo).orderId;

        // accept order
        await waitTx(contracts.b4bContract.connect(influencer).acceptOrder(orderId));

        const resultPromiseAccepted = waitResult();
        await mine(BLOCK_TO_MINE);
        timer.tick();

        const resultAccepted = (await resultPromiseAccepted) as PatchSeries;
        expect((resultAccepted.patches[0].data as CampaignInfo).status).to.equal(CampaignStatus.OrderAccepted);

        // complete order
        await time.increaseTo(releaseDate);

        await waitTx(contracts.b4bContract.connect(influencer).completeOrder(orderId));

        const resultPromiseComplete = waitResult();
        await mine(BLOCK_TO_MINE);
        timer.tick();

        const resultComplete = (await resultPromiseComplete) as PatchSeries;
        expect((resultComplete.patches[0].data as CampaignInfo).status).to.equal(CampaignStatus.OrderFilled);
    });

    // // query history blocks
    it('should query history', async function () {
        const { owner, otherAccount, contracts, brand, influencer } = await loadFixture(deployFixture);

        const provider = ethers.provider;

        const timer = new MockedTimer();
        const listener = new EventListener(ChainId.LocalHardhat, provider, timer);

        async function waitResult() {
            return new Promise((resolve) => {
                listener.once(resolve);
            });
        }

        await mine(100);

        const timestamp = (await time.latest()) + 25 * SECONDS_IN_HOUR;
        const price = ethers.utils.parseEther('100');
        const certificate = await createIdentityCertificate(
            influencer.address,
            INFLUENCER_ID,
            owner
        );

        await waitTx(
            contracts.b4bContract.connect(brand).createOrderWithCertificate(OrderType.Post, timestamp, price, HASH, certificate),
        );

        await mine(100);

        await listener.start(100);

        const result = (await waitResult()) as PatchSeries;

        expect(result.timestamp).to.be.greaterThan(100);
    });

    // handle block reorg
    // handle connection lost
});
