// import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { B4B, MockedB4B, MockedUSDC, B4BConfig, AccountRegistry } from '../typechain-types';
import { ContractTransaction, Wallet } from 'ethers';
import { BigNumber } from 'ethers';
import { CampaignStatus } from '../src/common/types';
import { Numbers, createIdentityCertificate, wrapProvider } from '../src';

import { ClientConfig } from "@account-abstraction/sdk";
import { SimpleAccount__factory } from '@account-abstraction/contracts';

// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers";

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

describe('AA', function () {
    const SECONDS_IN_HOUR = 60 * 60;
    const INFLUENCER_ID = 0xffff;
    const OTHER_INFLUENCER_ID = 0xfffa;
    const INVALID_INFLUENCER_ID = 0xaaaa;

    const ORDER_TYPE_0 = 0;
    const ORDER_TYPE_1 = 1;

    const ORDER_TYPE_0_ID = 0xfff0;
    const ORDER_TYPE_1_ID = 0xfff1;

    const ARG0_PLACEHOLDER = 0;

    const ENTRY_POINTS_ADDRESS = "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789";

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
        // const [owner, brand, influencer, otherBrand, unverifiedInfluencer] = await ethers.getSigners();
        const [owner] = await ethers.getSigners();
        const brand = owner;
        const influencer = Wallet.createRandom().connect(ethers.provider);

        const USDC = await ethers.getContractFactory('MockedUSDC');
        const Identity = await ethers.getContractFactory('MockedIdentity');
        const B4B = await ethers.getContractFactory('MockedB4B');
        const Config = await ethers.getContractFactory('B4BConfig');
        const AccountRegistry = await ethers.getContractFactory('AccountRegistry');
        const InfluencerAccount = await ethers.getContractFactory('InfluencerAccount');


        const usdcContract = (await USDC.deploy('USDC', 'USDC', 18)) as MockedUSDC;
        const identity = await Identity.deploy('UID', 'UID');

        const inflAccount = await InfluencerAccount.deploy();
        // const aaRegistry = AccountRegistry.deploy();

        const config = await upgrades.deployProxy(Config, [owner.address]);
        await setupConfigContract(config as B4BConfig);

        const b4bContract = (await B4B.deploy(config.address)) as MockedB4B;
        const aaRegistry = (await AccountRegistry.deploy(ENTRY_POINTS_ADDRESS, b4bContract.address, inflAccount.address) as AccountRegistry);

        const deployments = [
            {
                name: 'USDC',
                address: usdcContract.address,
            },
            {
                name: 'UniqueIdentity',
                address: identity.address,
            },
            {
                name: 'AccountRegistry',
                address: aaRegistry.address,
            }
        ];

        await setupConfigContractAddressesOrThrow(config as B4BConfig, deployments);

        const MINTED_VALUE = ethers.utils.parseEther('10000');
        await waitTx(usdcContract.mint(brand.address, MINTED_VALUE));
        await waitTx(usdcContract.connect(brand).increaseAllowance(b4bContract.address, MINTED_VALUE));

        // Verify Influencer
        await waitTx(identity.mintTo(influencer.address, INFLUENCER_ID));
        await waitTx(aaRegistry.createAccount(
            identity.address,
            INFLUENCER_ID,
            BigNumber.from(b4bContract.address)
        ));

        return { b4bContract, owner, brand, influencer, identity, usdcContract };
    }

    // describe.only('Create Order', function () {
    //     it('should create order with valid certificate', async function () {
    //         const { b4bContract, owner, brand, identity, usdcContract, influencer } = await deployFixture();

    //         const PRICE_TYPE_0 = ethers.utils.parseEther('100');
    //         const FEE_TYPE_0 = await b4bContract.previewFee(PRICE_TYPE_0);

    //         const validReleaseDate =  Math.floor(Date.now() / 1000) + 25 * SECONDS_IN_HOUR;
    //         const certificate = await createIdentityCertificate(
    //             influencer.address,
    //             INFLUENCER_ID,
    //             owner,
    //             identity.address
    //         );

    //         await waitTx(
    //             b4bContract
    //                 .connect(brand)
    //                 .createOrderWithCertificate(ORDER_TYPE_0, validReleaseDate, PRICE_TYPE_0, HASH, certificate),
    //         );

    //         const balance = await usdcContract.balanceOf(b4bContract.address);
    //         expect(balance).to.equal(PRICE_TYPE_0.add(FEE_TYPE_0));

    //         const balanceId = await identity.balanceOf(influencer.address);
    //         expect(balanceId).to.equal(1);

    //         const infAccount = await b4bContract.getInfluencerAccount(INFLUENCER_ID);
            
    //         const InfluencerAccount = await ethers.getContractFactory('InfluencerAccount');
    //         const account = InfluencerAccount.attach(infAccount);

    //         const entryPoint = await account.entryPoint();
    //         const tokenId = await account.token();
    //         console.log(influencer.address, entryPoint, tokenId);
    //     });
    // });


    describe('Accept Order', function () {
        // accept order
        // - only valid state transition
        // - time logic + rating

        // it.only('should deploy SA for Influencer', async function () {
        //     const { b4bContract, identity } = await loadFixture(deployFixture);

        //     const entryPointAddress = "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789";

        //     const AccountRegistry = await ethers.getContractFactory('AccountRegistry');
        //     const InfluencerAccount = await ethers.getContractFactory('InfluencerAccount');
        //     const inflAccount = await InfluencerAccount.deploy();
        //     const aaRegistry = (await AccountRegistry.deploy(entryPointAddress, b4bContract.address, inflAccount.address) as AccountRegistry);

        //     const network = await ethers.provider.getNetwork();
        //     console.log(inflAccount.address, network.chainId);

        //     const tx = await aaRegistry.createAccount(
        //         identity.address,
        //         1,
        //         1
        //     );

        //     await tx.wait();

        //     const addr = await aaRegistry.account(identity.address, 1, 1);
        //     console.log(addr);

        //     const account = InfluencerAccount.attach(addr);

        //     const entryPoint = await account.entryPoint();
        //     const tokenId = await account.token();
        //     console.log(entryPoint, tokenId, identity.address);
        // });

        it('should add 100 rating if order is accepted before 2 hours', async function () {
            // const { b4bContract, owner, brand, influencer, identity, usdcContract } = await loadFixture(deployFixture);
            const { b4bContract, owner, brand, influencer, identity, usdcContract } = await deployFixture();


            const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545/");

            // const timestamp = await time.latest();
            const timestamp = Math.floor(Date.now() / 1000);
            const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
            await deployOrder(order, b4bContract, usdcContract);

            const campaignBefore = await b4bContract.campaigns(ORDER_TYPE_0_ID);
            console.log(campaignBefore);

            // await time.increaseTo(timestamp + SECONDS_IN_HOUR); // TODO: check this

            const entryPointAddress = ENTRY_POINTS_ADDRESS;
            const config: ClientConfig = {
                entryPointAddress,
                bundlerUrl: 'http://localhost:3000/rpc',
                walletAddress: await b4bContract.getInfluencerAccount(INFLUENCER_ID)
            };

            const aaProvider = await wrapProvider(provider, config, influencer);
            const aaSigner = aaProvider.getSigner();
            const walletAddress = await aaProvider.getSigner().getAddress();
            const influencerAccount = SimpleAccount__factory.connect(walletAddress, influencer);

            console.log("Wallet address", walletAddress);

            console.log("here", await owner.getBalance());

            const tx = await influencerAccount.connect(owner).addDeposit({
                value: ethers.utils.parseEther("1")
            });
            await tx.wait();

            const gasPrice = await aaProvider.getGasPrice();
            console.log("gas price", gasPrice);

            // let txInfo = {
            //     to: "0xd21934eD8eAf27a67f0A70042Af50A1D6d195E81",
            //     // Convert currency unit from ether to wei
            //     value: ethers.utils.parseEther("0.1")
            // }
            // Send a transaction
            // const t = await brand.sendTransaction(txInfo);
            // await t.wait();

            // console.log("Balance", await influencer.getBalance());


            const tx2 = await b4bContract.connect(aaSigner).acceptOrder(ORDER_TYPE_0_ID, {
                gasLimit: 80000
            });
            // console.log(tx2);
            await tx2.wait();
            // console.log(gas);

            // await expect(b4bContract.connect(aaSigner).acceptOrder(ORDER_TYPE_0_ID))
            //     .to.emit(b4bContract, 'OrderUpdated')
            //     .withArgs(ORDER_TYPE_0_ID, CampaignStatus.OrderAccepted, 100, ARG0_PLACEHOLDER);

            const campaign = await b4bContract.campaigns(ORDER_TYPE_0_ID);
            expect(campaign.status).to.equal(2);
            // console.log(campaign);

            const gas = await b4bContract.connect(aaSigner).estimateGas.completeOrder(ORDER_TYPE_0_ID);
            console.log(gas);

            await waitTx(
                b4bContract.connect(aaSigner).completeOrder(ORDER_TYPE_0_ID, {
                    gasLimit: 100000
                })
            );

            const campaign2 = await b4bContract.campaigns(ORDER_TYPE_0_ID);
            expect(campaign2.status).to.equal(5);

            await waitTx(
                b4bContract.connect(brand).aproveResult(ORDER_TYPE_0_ID, 500)
            );

            const campaign3 = await b4bContract.campaigns(ORDER_TYPE_0_ID);
            expect(campaign3.status).to.equal(6);
        });

        // it("6h - 80", async function () {

        // });

        // it("24h - 50", async function () {

        // });

        // it('should fail with invalid influencer id', async function () {
        //     const { b4bContract, brand, usdcContract, unverifiedInfluencer } = await loadFixture(deployFixture);

        //     const timestamp = await time.latest();
        //     const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
        //     await deployOrder(order, b4bContract, usdcContract);

        //     await time.increaseTo(timestamp + SECONDS_IN_HOUR);

        //     await expect(
        //         b4bContract.connect(unverifiedInfluencer).acceptOrder(ORDER_TYPE_0_ID),
        //     ).to.be.revertedWithCustomError(b4bContract, 'UnauthorizedError');
        // });

        // it('should fail with invalid campaign id', async function () {
        //     const { b4bContract, brand, usdcContract, influencer } = await loadFixture(deployFixture);

        //     const timestamp = await time.latest();
        //     const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
        //     await deployOrder(order, b4bContract, usdcContract);

        //     await time.increaseTo(timestamp + SECONDS_IN_HOUR);

        //     await expect(b4bContract.connect(influencer).acceptOrder(ORDER_TYPE_1_ID)).to.be.reverted;
        // });

        // it('should fail if called after claimOrder', async function () {
        //     const { b4bContract, brand, usdcContract, influencer } = await loadFixture(deployFixture);

        //     const timestamp = await time.latest();
        //     const order = generateCampaignStruct(brand.address, timestamp, CampaignStatus.OrderCreated);
        //     await deployOrder(order, b4bContract, usdcContract);

        //     await time.increaseTo(timestamp + 25 * SECONDS_IN_HOUR);

        //     await waitTx(b4bContract.connect(brand).claimOrder(ORDER_TYPE_0_ID));

        //     await expect(b4bContract.connect(influencer).acceptOrder(ORDER_TYPE_0_ID)).to.be.revertedWithCustomError(
        //         b4bContract,
        //         'InvalidStateError',
        //     );
        // });
    });


});
