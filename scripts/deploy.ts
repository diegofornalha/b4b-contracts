import { ethers } from "hardhat";

async function main() {
    const UniqueIdentity = await ethers.getContractFactory("UniqueIdentity");
    const Booster = await ethers.getContractFactory("Booster");
    const B4BCoin = await ethers.getContractFactory("B4BCoin");
    const B4B = await ethers.getContractFactory("B4B");


    const uniqueIdentity = await UniqueIdentity.deploy("B4B Influencer Identity", "B4BID");
    await uniqueIdentity.deployed();

    console.log(`UniqueIdentity deployed to ${uniqueIdentity.address}`);

    const uri = "test_uri";
    const booster = await Booster.deploy(uri);
    await booster.deployed();

    console.log(`Booster deployed to ${booster.address}`);


    /// Mocked USDC
    const USDC = await ethers.getContractFactory("MockedUSDC");
    const usdc = await USDC.deploy("Mocked USDC", "MUSDC");
    await usdc.deployed();

    console.log(`Mocked USDC deployed to ${usdc.address}`);
    //-----------------

    const usdcAddress = usdc.address;
    const coin = await B4BCoin.deploy("B4B Coin", "B4BC", usdcAddress);
    await coin.deployed();

    console.log(`B4BCoin deployed to ${coin.address}`);

    const b4b = await B4B.deploy(usdcAddress, coin.address, uniqueIdentity.address, booster.address);
    await b4b.deployed();

    console.log(`B4B deployed to ${coin.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
