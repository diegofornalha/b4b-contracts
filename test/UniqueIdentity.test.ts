import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { Contract, ContractTransaction, Signer } from 'ethers';
import { UniqueIdentity } from '../typechain-types';

const DAY_IN_SECONDS = 24 * 60 * 60;
const MONTH_IN_SECONDS = 30 * DAY_IN_SECONDS;

async function signMessage(identity: Contract, account: string, tokenId: number, owner: Signer) {
    const nonce = await identity.nonces(account);
    const types = ["address", "uint256", "uint256"];
    const values = [account, tokenId, nonce];
    const hash = ethers.utils.arrayify(ethers.utils.solidityKeccak256(types, values));
    const signature = await owner.signMessage(hash);

    return signature;
}

describe('UniqueIdentity', function () {
    async function waitTx(txPromise: Promise<ContractTransaction>) {
        const tx = await txPromise;
        return await tx.wait();
    }

    async function deployFixture() {
        const [owner, otherAccount] = await ethers.getSigners();

        const Identity = await ethers.getContractFactory('UniqueIdentity');
        const identity = await upgrades.deployProxy(Identity, ['UID', 'UID', owner.address]) as UniqueIdentity;

        return { identity, owner, otherAccount };
    }

    it('should mint token', async function () {
        const { identity, owner, otherAccount } = await loadFixture(deployFixture);

        const timestamp = await time.latest() + 60 * 60;

        const tokenId = 1;
        const signature = await signMessage(identity, otherAccount.address, tokenId, owner);

        const tx = identity.mint(
            otherAccount.address,
            tokenId,
            signature
        );

        await waitTx(tx);

        const balance = await identity.balanceOf(otherAccount.address);
        expect(balance).to.equal(1);
    });

    it('should not mint token if signature is invalid', async function () {
        const { identity, owner, otherAccount } = await loadFixture(deployFixture);

        const timestamp = await time.latest() + 60 * 60;

        const tokenId = 1;
        const signature = await signMessage(identity, otherAccount.address, tokenId, otherAccount);

        const tx = identity.mint(
            otherAccount.address,
            tokenId,
            signature
        );

        await expect(tx).to.be.revertedWith('Invalid signer');
    });


    it('should not mint token twice', async function () {
        const { identity, owner, otherAccount } = await loadFixture(deployFixture);

        const timestamp = await time.latest() + 60 * 60;

        const tokenId = 1;
        const signature = await signMessage(identity, otherAccount.address, tokenId, owner);

        const tx = identity.mint(
            otherAccount.address,
            tokenId,
            signature
        );

        await waitTx(tx);

        const tx2 = identity.mint(
            otherAccount.address,
            tokenId,
            signature
        );

        await waitTx(tx2);

        const balance = await identity.balanceOf(otherAccount.address);
        expect(balance).to.equal(1);
    });


    it('should disable transfer', async function () {
        const { identity, owner, otherAccount } = await loadFixture(deployFixture);

        const timestamp = await time.latest() + 60 * 60;

        const tokenId = 1;
        const signature = await signMessage(identity, otherAccount.address, tokenId, owner);

        const tx = identity.mint(
            otherAccount.address,
            tokenId,
            signature
        );

        await waitTx(tx);

        const txTransfer = identity.connect(otherAccount).transferFrom(otherAccount.address, owner.address, tokenId);
        await expect(txTransfer).to.be.reverted;
    });
});