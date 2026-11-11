#!/usr/bin/env node

/**
 * ARDEN Wallet NFT, Referrer & Rewards Inspector Script
 * 
 * Usage:
 *   node scripts/get-wallet-nfts-info.js <wallet_address> [--env uat|dev] [--json]
 * 
 * Example:
 *   node scripts/get-wallet-nfts-info.js 0xd712868Cc2faDa3E930b3E844101EFBBD0DFA5E8
 */

import { createPublicClient, http, parseAbi, getAddress, formatUnits } from 'viem';
import fs from 'fs';

// --- Default Contract Configurations ---
const CONFIGS = {
  uat: {
    rpcUrl: 'https://chain.sotto.li',
    userRegistry: '0x373194370D4E6D4364e45140dcD8FB2A30fA8CfD',
    rewardRouter: '0xB46d7B9c6944201D1f7488F174210A1a4B5B12fa',
    liquidityGuard: '0x2245116AF09D41c5D0108C79e2Cab530a7D7Ec17',
    stakingEngine: '0x43A158473a6BD19A199aD369300f285358c0da0f',
    presale: '0xbcaA71066c0F403E1F4fc07A37d0B337189d15F1',
  },
  dev: {
    rpcUrl: 'https://chain.sotto.li',
    userRegistry: '0x6955af7cE14e21d6635630e86e07d1A2F76eB42A',
    rewardRouter: '0x3b71e590052EA15F409628548fdD2B4fE16B6bC2',
    liquidityGuard: '0xD52A7aFdDbBBF580D61AF0Af7a47FBa128475154',
    stakingEngine: '0xC3E9b327BB4Ce8d92F06c224E9f32a85290eD3A0',
    presale: '0xd96ff57a67eA8d45019358A2c9b862507c8883f5',
  }
};

// Contract ABIs
const ABIS = {
  userRegistry: parseAbi([
    'function getUserIdsByAddress(address user) external view returns (uint256[])',
    'function getUserById(uint256 userId) external view returns ((uint256 userId, address userAddress, uint256 nftId, uint256 fuel, string username, uint256 referredBy, string referralCode, uint256 nftMintTime))',
  ]),
  rewardRouter: parseAbi([
    'function viewNetworkRewards(uint256 nftId) external view returns (uint256 directReward, uint256 stratumReward, uint256 biomeReward, uint256 stratumYield, uint256 ecosystemYield, uint256 pooledEcoYield, uint256 totalClaimedAmount, uint256 totalPending, uint256 totalEarned)',
    'function viewPreSaleRewards(uint256 userId) external view returns (uint256 totalPending, uint256 positionCount)'
  ]),
  liquidityGuard: parseAbi([
    'function getPosition(uint256 nftId) external view returns (uint256 valueUSDT, uint256 capUSDT, uint256 claimedUSDT, uint256 claimedDAGR, uint256 rewardDebt, bool isAbsorbed, uint256 lastInteractionBlock, uint256 pendingDAGR, uint256 pendingUSDT, uint256 remainingUSDT, uint64 openedAt)',
    'function pendingRewards(uint256 nftId) external view returns (uint256)'
  ]),
  stakingEngine: parseAbi([
    'function stakedByNft(uint256 nftId) external view returns (uint256)',
    'function previewTotalAccrued(uint256 nftId) external view returns (uint256)',
    'function claimedByNft(uint256 nftId) external view returns (uint256)'
  ])
};

// Helper: Format bigints safely to numbers / fixed strings
function fmt(val, decimals = 18) {
  if (val === undefined || val === null) return '0.000';
  const num = Number(formatUnits(BigInt(val), decimals));
  return num.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function parseArgs() {
  const args = process.argv.slice(2);
  let address = null;
  let envType = 'uat';
  let jsonOutput = false;
let csvOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env' && args[i + 1]) {
      envType = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === '--json') {
      jsonOutput = true;
      } else if (args[i] === '--csv') {
  csvOutput = true;
    } else if (!address && args[i].startsWith('0x')) {
      address = args[i];
    }
  }

 return {
  address,
  envType,
  jsonOutput,
  csvOutput
};
}
function escapeCsv(value) {
  if (value === undefined || value === null) {
    return '';
  }

  const str = String(value);

  // Escape double quotes
  const escaped = str.replace(/"/g, '""');

  // Wrap values containing comma, quote, or newline
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${escaped}"`;
  }

  return escaped;
}


function generateCsv(results, walletAddress, environment) {

  const headers = [
    'Environment',
    'Wallet Address',

    // User
    'User ID',
    'NFT ID',
    'Username',
    'Referral Code',
    'Fuel',

    // Mint
    'Mint Time',
    'Mint Time Raw',

    // Referrer
    'Referrer User ID',
    'Referrer NFT ID',
    'Referrer Username',
    'Referrer Wallet',
    'Referrer Code',
    'Is Root',

    // Network Rewards
    'Direct Referral Reward',
    'Stratum Reward',
    'Biome Reward',
    'Stratum Yield',
    'Ecosystem Yield',
    'Pooled Eco Yield',
    'Total Claimed Network',
    'Total Pending Network',
    'Total Earned Network',

    // Liquidity Rewards
    'LP Position Value USDT',
    'LP Cap USDT',
    'LP Claimed USDT',
    'LP Claimed DAGR',
    'LP Pending DAGR',
    'LP Position Absorbed',
    'LP Has Position',

    // Staking
    'Total Staked',
    'Pending Staking Accrued',
    'Total Claimed Staking',

    // Presale
    'Presale Position Count',
    'Presale Total Pending'
  ];


  const rows = results.map(item => [

    environment,
    walletAddress,

    // User
    item.userId,
    item.nftId,
    item.username,
    item.referralCode,
    item.fuel,

    // Mint
    item.mintTime,
    item.mintTimeRaw,

    // Referrer
    item.referrer.referredByUserId,
    item.referrer.referrerNftId,
    item.referrer.referrerUsername,
    item.referrer.referrerAddress,
    item.referrer.referrerCode,
    item.referrer.isRoot,

    // Network Rewards
    item.rewards.network.directReward,
    item.rewards.network.stratumReward,
    item.rewards.network.biomeReward,
    item.rewards.network.stratumYield,
    item.rewards.network.ecosystemYield,
    item.rewards.network.pooledEcoYield,
    item.rewards.network.totalClaimedAmount,
    item.rewards.network.totalPending,
    item.rewards.network.totalEarned,

    // Liquidity
    item.rewards.liquidity.valueUSDT,
    item.rewards.liquidity.capUSDT,
    item.rewards.liquidity.claimedUSDT,
    item.rewards.liquidity.claimedDAGR,
    item.rewards.liquidity.pendingDAGR,
    item.rewards.liquidity.isAbsorbed,
    item.rewards.liquidity.hasPosition,

    // Staking
    item.rewards.staking.stakedAmount,
    item.rewards.staking.pendingAccrued,
    item.rewards.staking.claimedAmount,

    // Presale
    item.rewards.presale.positionCount,
    item.rewards.presale.totalPending
  ]);


  const csvLines = [];

  // Header
  csvLines.push(
    headers.map(escapeCsv).join(',')
  );

  // Data
  for (const row of rows) {
    csvLines.push(
      row.map(escapeCsv).join(',')
    );
  }

  const csvContent = csvLines.join('\n');

  const filename =
    `wallet-nft-report-${environment}-${walletAddress.toLowerCase()}.csv`;

  fs.writeFileSync(
    filename,
    csvContent,
    'utf8'
  );

  console.log(
    `\x1b[32mCSV Report saved to:\x1b[0m ${filename}`
  );

  console.log(
    `\x1b[36mCSV Records:\x1b[0m ${results.length}`
  );
}
async function main() {
  const { address: inputAddress, envType, jsonOutput, csvOutput } = parseArgs();

  if (!inputAddress) {
    console.log(`
\x1b[36m========================================================================\x1b[0m
\x1b[1m\x1b[33m ARDEN NFT, REFERRER & REWARDS INSPECTOR SCRIPT\x1b[0m
\x1b[36m========================================================================\x1b[0m
\x1b[31mError: Missing target wallet address.\x1b[0m

\x1b[1mUsage:\x1b[0m
  node scripts/get-wallet-nfts-info.js <wallet_address> [--env uat|dev] [--json]

\x1b[1mExamples:\x1b[0m
  node scripts/get-wallet-nfts-info.js 0xd712868Cc2faDa3E930b3E844101EFBBD0DFA5E8
  node scripts/get-wallet-nfts-info.js 0xd712868Cc2faDa3E930b3E844101EFBBD0DFA5E8 --env dev --json
`);
    process.exit(1);
  }

  let formattedAddress;
  try {
    formattedAddress = getAddress(inputAddress);
  } catch (err) {
    console.error(`\x1b[31mInvalid Ethereum wallet address:\x1b[0m ${inputAddress}`);
    process.exit(1);
  }

  const cfg = CONFIGS[envType] || CONFIGS.uat;
  const client = createPublicClient({ transport: http(cfg.rpcUrl) });

  console.log(`\n\x1b[36m========================================================================\x1b[0m`);
  console.log(` \x1b[1m\x1b[32mARDEN WALLET NFT REPORT\x1b[0m`);
  console.log(` Target Wallet : \x1b[33m${formattedAddress}\x1b[0m`);
  console.log(` Environment   : \x1b[35m${envType.toUpperCase()}\x1b[0m (${cfg.rpcUrl})`);
  console.log(`\x1b[36m========================================================================\x1b[0m\n`);

  // 1. Get all User IDs for the address
  let userIds = [];
  try {
    userIds = await client.readContract({
      address: cfg.userRegistry,
      abi: ABIS.userRegistry,
      functionName: 'getUserIdsByAddress',
      args: [formattedAddress]
    });
  } catch (err) {
    console.error(`\x1b[31mError fetching User IDs from UserRegistry:\x1b[0m`, err.message);
    process.exit(1);
  }

  if (!userIds || userIds.length === 0) {
    console.log(`\x1b[33mNo NFTs or User Registrations found for wallet:\x1b[0m ${formattedAddress}\n`);
    process.exit(0);
  }

  console.log(`Found \x1b[1m\x1b[32m${userIds.length}\x1b[0m registered NFT / User position(s) for this wallet.\n`);

  const results = await Promise.all(
    userIds.map(async (uId) => {
      // A. Fetch User & NFT details from UserRegistry
      let userData = null;
      try {
        userData = await client.readContract({
          address: cfg.userRegistry,
          abi: ABIS.userRegistry,
          functionName: 'getUserById',
          args: [uId]
        });
      } catch (e) {
        console.error(`Failed to fetch user details for User ID ${uId}:`, e.message);
        return null;
      }

      const nftId = userData.nftId;
      const referredByUserId = userData.referredBy;

      // Parallelize child queries for referrer and rewards
      const [refRes, netRes, posRes, pendRes, staked, pendingAcc, claimedAcc, psRes] = await Promise.all([
        referredByUserId > 0n
          ? client.readContract({
              address: cfg.userRegistry,
              abi: ABIS.userRegistry,
              functionName: 'getUserById',
              args: [referredByUserId]
            }).catch(() => null)
          : Promise.resolve(null),

        client.readContract({
          address: cfg.rewardRouter,
          abi: ABIS.rewardRouter,
          functionName: 'viewNetworkRewards',
          args: [nftId]
        }).catch(() => null),

        client.readContract({
          address: cfg.liquidityGuard,
          abi: ABIS.liquidityGuard,
          functionName: 'getPosition',
          args: [nftId]
        }).catch(() => null),

        client.readContract({
          address: cfg.liquidityGuard,
          abi: ABIS.liquidityGuard,
          functionName: 'pendingRewards',
          args: [nftId]
        }).catch(() => 0n),

        client.readContract({
          address: cfg.stakingEngine,
          abi: ABIS.stakingEngine,
          functionName: 'stakedByNft',
          args: [nftId]
        }).catch(() => 0n),

        client.readContract({
          address: cfg.stakingEngine,
          abi: ABIS.stakingEngine,
          functionName: 'previewTotalAccrued',
          args: [nftId]
        }).catch(() => 0n),

        client.readContract({
          address: cfg.stakingEngine,
          abi: ABIS.stakingEngine,
          functionName: 'claimedByNft',
          args: [nftId]
        }).catch(() => 0n),

        client.readContract({
          address: cfg.rewardRouter,
          abi: ABIS.rewardRouter,
          functionName: 'viewPreSaleRewards',
          args: [uId]
        }).catch(() => null)
      ]);

      // Referrer Info
      let referrerInfo = {
        referredByUserId: Number(referredByUserId),
        isRoot: referredByUserId === 0n,
        referrerNftId: 'N/A',
        referrerAddress: 'N/A',
        referrerUsername: 'N/A',
        referrerCode: 'N/A'
      };

      if (refRes) {
        referrerInfo = {
          referredByUserId: Number(referredByUserId),
          isRoot: false,
          referrerNftId: refRes.nftId.toString(),
          referrerAddress: refRes.userAddress,
          referrerUsername: refRes.username || 'N/A',
          referrerCode: refRes.referralCode || 'N/A'
        };
      }

      // Network Rewards
      let networkRewards = {
        directReward: '0.000',
        stratumReward: '0.000',
        biomeReward: '0.000',
        stratumYield: '0.000',
        ecosystemYield: '0.000',
        pooledEcoYield: '0.000',
        totalClaimedAmount: '0.000',
        totalPending: '0.000',
        totalEarned: '0.000'
      };

      if (netRes) {
        const resArr = Array.isArray(netRes) ? netRes : [
          netRes.directReward, netRes.stratumReward, netRes.biomeReward,
          netRes.stratumYield, netRes.ecosystemYield, netRes.pooledEcoYield,
          netRes.totalClaimedAmount, netRes.totalPending, netRes.totalEarned
        ];
        networkRewards = {
          directReward: fmt(resArr[0]),
          stratumReward: fmt(resArr[1]),
          biomeReward: fmt(resArr[2]),
          stratumYield: fmt(resArr[3]),
          ecosystemYield: fmt(resArr[4]),
          pooledEcoYield: fmt(resArr[5]),
          totalClaimedAmount: fmt(resArr[6]),
          totalPending: fmt(resArr[7]),
          totalEarned: fmt(resArr[8])
        };
      }

      // LP Rewards
      let lpRewards = {
        valueUSDT: '0.000',
        capUSDT: '0.000',
        claimedUSDT: '0.000',
        claimedDAGR: '0.000',
        pendingDAGR: '0.000',
        isAbsorbed: false,
        hasPosition: false
      };

      if (posRes) {
        const valUsdt = posRes[0] || (posRes.valueUSDT ?? 0n);
        const capUsdt = posRes[1] || (posRes.capUSDT ?? 0n);
        const clUsdt = posRes[2] || (posRes.claimedUSDT ?? 0n);
        const clDagr = posRes[3] || (posRes.claimedDAGR ?? 0n);
        const abs = Boolean(posRes[5] ?? posRes.isAbsorbed);

        lpRewards = {
          valueUSDT: fmt(valUsdt, 6),
          capUSDT: fmt(capUsdt, 6),
          claimedUSDT: fmt(clUsdt, 6),
          claimedDAGR: fmt(clDagr, 18),
          pendingDAGR: fmt(pendRes, 18),
          isAbsorbed: abs,
          hasPosition: valUsdt > 0n
        };
      }

      // Staking Rewards
      const stakingRewards = {
        stakedAmount: fmt(staked, 18),
        pendingAccrued: fmt(pendingAcc, 18),
        claimedAmount: fmt(claimedAcc, 18)
      };

      // Presale Rewards
      let presaleRewards = {
        positionCount: 0,
        totalPending: '0.000'
      };

      if (psRes) {
        const psArr = Array.isArray(psRes) ? psRes : [psRes.totalPending, psRes.positionCount];
        presaleRewards = {
          totalPending: fmt(psArr[0], 18),
          positionCount: Number(psArr[1] || 0)
        };
      }

      return {
        userId: Number(uId),
        nftId: nftId.toString(),
        username: userData.username || 'Unassigned',
        referralCode: userData.referralCode || 'N/A',
        fuel: Number(userData.fuel),
        mintTime: new Date(Number(userData.nftMintTime) * 1000).toISOString(),
        mintTimeRaw: Number(userData.nftMintTime),
        referrer: referrerInfo,
        rewards: {
          network: networkRewards,
          liquidity: lpRewards,
          staking: stakingRewards,
          presale: presaleRewards
        }
      };
    })
  );

  const validResults = results.filter((r) => r !== null);

  for (const item of validResults) {
    // Render formatted CLI card for this NFT
    console.log(`\x1b[34m------------------------------------------------------------------------\x1b[0m`);
    console.log(`\x1b[1m\x1b[33m📌 NFT ID: ${item.nftId}\x1b[0m (User ID: \x1b[36m${item.userId}\x1b[0m | Username: \x1b[32m"${item.username}"\x1b[0m | Fuel: \x1b[35m${item.fuel}\x1b[0m)`);
    console.log(`   Mint Date   : ${new Date(item.mintTimeRaw * 1000).toLocaleString()}`);
    console.log(`   Ref Code    : ${item.referralCode}`);
    console.log(`\x1b[34m------------------------------------------------------------------------\x1b[0m`);

    // Referrer Section
    console.log(`\n \x1b[1m\x1b[36m👥 REFERRER ("refeer") INFORMATION:\x1b[0m`);
    if (item.referrer.isRoot) {
      console.log(`    Status            : \x1b[33mRoot / Direct Registration (No Referrer)\x1b[0m`);
    } else {
      console.log(`    Referrer User ID  : \x1b[1m${item.referrer.referredByUserId}\x1b[0m`);
      console.log(`    Referrer NFT ID   : \x1b[1m${item.referrer.referrerNftId}\x1b[0m`);
      console.log(`    Referrer Username : \x1b[32m${item.referrer.referrerUsername}\x1b[0m (Code: ${item.referrer.referrerCode})`);
      console.log(`    Referrer Wallet   : ${item.referrer.referrerAddress}`);
    }

    // Rewards Section in Separated Categories
    console.log(`\n \x1b[1m\x1b[32m🎁 REWARDS (SEPARATED CATEGORIES):\x1b[0m`);
    
    // Category 1: Network Rewards
    console.log(`\n   \x1b[1m\x1b[35m[Category 1: Network Rewards]\x1b[0m`);
    console.log(`    • Direct Referral Reward : ${item.rewards.network.directReward} ARDE`);
    console.log(`    • Level / Stratum Reward  : ${item.rewards.network.stratumReward} ARDE`);
    console.log(`    • Biome / Binary Reward   : ${item.rewards.network.biomeReward} ARDE`);
    console.log(`    • Stratum Yield           : ${item.rewards.network.stratumYield} ARDE`);
    console.log(`    • Ecosystem Yield         : ${item.rewards.network.ecosystemYield} ARDE`);
    console.log(`    • Pooled Eco Yield        : ${item.rewards.network.pooledEcoYield} ARDE`);
    console.log(`    ---------------------------------------------`);
    console.log(`    • Total Claimed Network   : \x1b[32m${item.rewards.network.totalClaimedAmount} ARDE\x1b[0m`);
    console.log(`    • Total Pending Network   : \x1b[33m${item.rewards.network.totalPending} ARDE\x1b[0m`);
    console.log(`    • Total Earned Network    : \x1b[1m${item.rewards.network.totalEarned} ARDE\x1b[0m`);

    // Category 2: LP Rewards
    console.log(`\n   \x1b[1m\x1b[35m[Category 2: LP / Liquidity Rewards]\x1b[0m`);
    console.log(`    • Position Value (USDT)   : $${item.rewards.liquidity.valueUSDT} (Cap: $${item.rewards.liquidity.capUSDT})`);
    console.log(`    • Pending LP Rewards      : \x1b[33m${item.rewards.liquidity.pendingDAGR} ARDE/DAGR\x1b[0m`);
    console.log(`    • Claimed LP (USDT/DAGR)  : $${item.rewards.liquidity.claimedUSDT} USDT / ${item.rewards.liquidity.claimedDAGR} DAGR`);
    console.log(`    • Position Absorbed       : ${item.rewards.liquidity.isAbsorbed ? '\x1b[31mYes\x1b[0m' : '\x1b[32mNo\x1b[0m'}`);

    // Category 3: Staking Rewards
    console.log(`\n   \x1b[1m\x1b[35m[Category 3: Staking Rewards]\x1b[0m`);
    console.log(`    • Total Staked            : ${item.rewards.staking.stakedAmount} ARDE/DAGR`);
    console.log(`    • Pending Staking Accrued : \x1b[33m${item.rewards.staking.pendingAccrued} ARDE\x1b[0m`);
    console.log(`    • Total Claimed Staking   : \x1b[32m${item.rewards.staking.claimedAmount} ARDE\x1b[0m`);

    // Category 4: Presale Rewards
    console.log(`\n   \x1b[1m\x1b[35m[Category 4: Presale Rewards]\x1b[0m`);
    console.log(`    • Presale Positions Count : ${item.rewards.presale.positionCount}`);
    console.log(`    • Total Pending Presale   : \x1b[33m${item.rewards.presale.totalPending} ARDE\x1b[0m`);

    console.log(`\n`);
  }

  console.log(`\x1b[36m========================================================================\x1b[0m`);
  console.log(` \x1b[1m\x1b[32mSUMMARY FOR WALLET: ${formattedAddress}\x1b[0m`);
  console.log(` Total Registered NFTs / User IDs : \x1b[1m${results.length}\x1b[0m`);
  console.log(`\x1b[36m========================================================================\x1b[0m\n`);


    if (jsonOutput) {
  const filename = `wallet-nft-report-${formattedAddress.toLowerCase()}.json`;

  const jsonStr = JSON.stringify(
    { walletAddress: formattedAddress, environment: envType, results },
    (key, value) => (typeof value === 'bigint' ? value.toString() : value),
    2
  );

  fs.writeFileSync(filename, jsonStr);

  console.log(`\x1b[32mJSON Report saved to:\x1b[0m ${filename}\n`);
}



// ============================================================
// CSV OUTPUT
// ============================================================

if (csvOutput) {
  generateCsv(
    validResults,
    formattedAddress,
    envType
  );
}
}


// ============================================================
// ERROR HANDLER
// ============================================================

main().catch((err) => {
  console.error('\x1b[31mUnhandled Error:\x1b[0m', err);
  process.exit(1);
});