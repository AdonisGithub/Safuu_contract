const { expect } = require("chai");
const { ethers } = require("hardhat");
const { TASK_COMPILE_SOLIDITY_HANDLE_COMPILATION_JOBS_FAILURES } = require("hardhat/builtin-tasks/task-names.js");
const {delay, toBigNum, fromBigNum } = require("./utils.js");

var ERC20ABI = artifacts.readArtifactSync("contracts/FakeUsdt.sol:IERC20").abi;
var pairContract;
var exchangeRouter;
var exchangeFactory;
var wBNB;

var safuu;
var lpstaking;

var owner;
var user1;
var user2;
var user3;
var lpReceiver;



describe("Create Account and wallet", () => {

    it("Create Wallet", async () => {
    [owner, user1, user2, user3] = await ethers.getSigners();

    lpReceiver = ethers.Wallet.createRandom();
    lpReceiver = lpReceiver.connect(ethers.provider);

    var provider = ethers.provider;
    console.log("owner wBNB balance", fromBigNum(await provider.getBalance(owner.address), 18));
    console.log("user1 wBNB balance", fromBigNum(await provider.getBalance(user1.address), 18));
    console.log("user2 wBNB balance", fromBigNum(await provider.getBalance(user2.address), 18));
    console.log("user3 wBNB balance", fromBigNum(await provider.getBalance(user3.address), 18));

    });

  });

describe("Contracts deploy", () => {

  it("Factory deploy", async () => {
    const Factory = await ethers.getContractFactory("PancakeFactory");
    exchangeFactory = await Factory.deploy(owner.address);
    await exchangeFactory.deployed();
    console.log(await exchangeFactory.INIT_CODE_PAIR_HASH());
  });

  it("wBNB deploy", async () => {
    const WBNB = await ethers.getContractFactory("WBNB");
    wBNB = await WBNB.deploy();
    await wBNB.deployed();
  });

  it("Router deploy", async () => {
    const Router = await ethers.getContractFactory("PancakeRouter");
    exchangeRouter = await Router.deploy(
      exchangeFactory.address,
      wBNB.address
    );
    await exchangeRouter.deployed();
  });

  it("Safuu deploy", async () => {
    const Safuu = await ethers.getContractFactory("Safuu");
    safuu = await Safuu.deploy(exchangeRouter.address);
    await safuu.deployed();

    //set pair contract
    var pairAddress = await safuu.pair();
    pairContract = new ethers.Contract(pairAddress,ERC20ABI,owner);
  });

  it("LPStaking contract deploy", async () => {
    const LPstaking = await ethers.getContractFactory("FurioLPStaking");
    lpstaking = await LPstaking.deploy();
    await lpstaking.deployed();

    var tx = await lpstaking.setInitialAddresses(pairContract.address, lpReceiver.address);
		await tx.wait();
    // console.log("LP contract address", pairContract.address);
  });

})

describe("constract prepare", () => {

  it("approve", async () => {
    var tx = await safuu.approve(
      exchangeRouter.address,
      ethers.utils.parseUnits("100000", 5)
    );
    await tx.wait();
  });

  it("add liquidity ", async () => {
    var tx = await exchangeRouter.addLiquidityETH(
      safuu.address,
      ethers.utils.parseUnits("5000", 5),
      0,
      0,
      owner.address,
      "1234325432314321",
      { value: ethers.utils.parseUnits("5000", 18) }
    )
    await tx.wait();
    console.log("owner LP balance",fromBigNum(await pairContract.balanceOf(owner.address), 18));
  });

});

describe("test", () => {

  it("send some LP token to user1", async () => {
    var tx = await pairContract.transfer(user1.address, toBigNum("0.0003", 18));
    await tx.wait();
  });

  it("send some LP token to user2", async () => {
    var tx = await pairContract.transfer(user2.address, toBigNum("0.0002", 18));
    await tx.wait();
  });

  it("send some LP token to user3", async () => {
    var tx = await pairContract.transfer(user3.address, toBigNum("0.0001", 18));
    await tx.wait();
  });

  it("check all users LP balance", async () => {
    checkUsersWalletLPBalance();
  });

  it("owner LP approve", async () => {
    var tx = await pairContract.approve(
      lpstaking.address,
      pairContract.balanceOf(owner.address)
    );
    await tx.wait();
  });

  it("owner LP stake", async () => {
    var tx = await lpstaking.stake(toBigNum("0.0009", 18));
    await tx.wait();
  });

  it("user3 LP Reflection Reward first claim", async () => {
    var tx = await lpstaking.connect(user3).claimReflectionRewards();
    await tx.wait();
  });

  it("user1 LP approve", async () => {
    var tx = await pairContract.connect(user1).approve(
      lpstaking.address,
      pairContract.balanceOf(user1.address)
    );
    await tx.wait();
  });

  it("user1 LP stake", async () => {
    var tx = await lpstaking.connect(user1).stake(pairContract.balanceOf(user1.address));
    await tx.wait();
  });

  it("user2 LP approve", async () => {
    var tx = await pairContract.connect(user2).approve(
      lpstaking.address,
      pairContract.balanceOf(user2.address)
    );
    await tx.wait();
  });

  it("user2 LP stake", async () => {
    var tx = await lpstaking.connect(user2).stake(pairContract.balanceOf(user2.address));
    await tx.wait();
  });

  it("check all users LP balance", async () => {
    checkUsersWalletLPBalance();
  });

  it("check  pending rewards", async () => {
    checkUsersPendingRewards();
  });

  it("owner LP Reward claim", async () => {
    var tx = await lpstaking.claimRewards();
    await tx.wait();
  });

  it("user1 LP Reward claim", async () => {
    var tx = await lpstaking.connect(user1).claimRewards();
    await tx.wait();
  });

  it("check Reflection pending rewards", async () => {
    checkUsersPendingReflectionRewards();
  });

  it("user2 LP Reward claim", async () => {
    var tx = await lpstaking.connect(user2).claimRewards();
    await tx.wait();
  });

  it("check all users LP balance", async () => {
    checkUsersWalletLPBalance();
  });



  it("user3 LP Reflection Reward claim", async () => {
    var tx = await lpstaking.connect(user3).claimReflectionRewards();
    await tx.wait();
  });

  it("check all users LP balance", async () => {
    checkUsersWalletLPBalance();
  });

  it("user1 LP unstake", async () => {
    var tx = await lpstaking.connect(user1).unstake();
    await tx.wait();
  });

  it("user2 LP unstake", async () => {
    var tx = await lpstaking.connect(user2).unstake();
    await tx.wait();
  });

  it("check all users LP balance", async () => {
    checkUsersWalletLPBalance();
  });

});

const checkUsersWalletLPBalance = async () => {
  console.log("owner LP balance", fromBigNum(await pairContract.balanceOf(owner.address), 18));
  console.log("user1 LP balance", fromBigNum(await pairContract.balanceOf(user1.address), 18));
  console.log("user2 LP balance", fromBigNum(await pairContract.balanceOf(user2.address), 18));
  console.log("user3 LP balance", fromBigNum(await pairContract.balanceOf(user3.address), 18));
}

const checkStakingContractLPBalances =  async () =>{
  // console.log("staking contract LP balance", fromBigNum(await pairContract.balanceOf(lpstaking.address), 18));
  console.log("staking contract LP totalStaking amount", fromBigNum(await lpstaking.totalStakingAmount(), 18));
  console.log("lpReceiver LP balance", fromBigNum(await pairContract.balanceOf(lpReceiver.address), 18));
  console.log("staking contract LP RewardPool balance", fromBigNum(await lpstaking.totalReward(), 18));
  console.log("staking contract LP ReflectionPool balance", fromBigNum(await lpstaking.totalReflection(), 18));
}

const checkLPRewardPerShare = async () => {
  console.log("accLPReflectionPerShare", fromBigNum(await lpstaking.accLPReflectionPerShare(), 18));
  console.log("accLPPerShare", fromBigNum(await lpstaking.accLPPerShare(), 18));
}

const checkUsersPendingRewards = async () => {
  console.log("owner pending reward", fromBigNum(await lpstaking.pendingReward(owner.address)));
  console.log("user1 pending reward", fromBigNum(await lpstaking.pendingReward(user1.address)));
  console.log("user2 pending reward", fromBigNum(await lpstaking.pendingReward(user2.address)));
  // console.log("user3 pending reward", fromBigNum(await lpstaking.pendingReward(user3.address)));
  
}

const checkUsersPendingReflectionRewards = async () => {
  console.log("owner pending Reflection reward", fromBigNum(await lpstaking.pendingReflectionReward(owner.address)));
  console.log("user1 pending Reflection reward", fromBigNum(await lpstaking.pendingReflectionReward(user1.address)));
  console.log("user2 pending Reflection reward", fromBigNum(await lpstaking.pendingReflectionReward(user2.address)));
  console.log("user3 pending Reflection reward", fromBigNum(await lpstaking.pendingReflectionReward(user3.address)));
  
}