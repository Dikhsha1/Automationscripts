// createDipikaReferrals.mjs
//
// Creates fresh wallets, registers each under referrer "dipika" via regUser(),
// funding every new wallet with native gas + USDT (registrationFee) from the
// sponsor wallet first, since a brand-new wallet has zero balance of either.
//
// Run:  node createDipikaReferrals.mjs
// Config: .env (see .env.example in this folder)

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  formatEther,
  formatUnits,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import "dotenv/config";
import fs from "fs";
import { userRegistryAbi } from "./userRegistryAbi.mjs";

// ============================================================
// ENV
// ============================================================

const RPC_URL = process.env.RPC_URL;
const SPONSOR_PRIVATE_KEY = process.env.PRIVATE_KEY;
const USER_REGISTRY_ADDRESS = process.env.USER_REGISTRY_ADDRESS;

// Referrer whose direct-referral count we're growing
const REFERRER = process.env.REFERRER || "dipika";

// Current referral count shown in UI (used only for console math/logging;
// the script re-reads the real on-chain count before deciding to stop)
const CURRENT_REFERRALS = Number(process.env.CURRENT_REFERRALS || 8);

// Target total direct referrals for REFERRER
const TARGET_REFERRALS = Number(process.env.TARGET_REFERRALS || 50);

// Username configuration — usernames must be unique on-chain
const USERNAME_BASE = process.env.USERNAME_BASE || "dipikaQA";

// How much native gas token to send each new wallet (covers a few txs)
const NATIVE_FUND_AMOUNT = process.env.NATIVE_FUND_AMOUNT || "0.01"; // in ETH-like units

// Chain id for custom chain definition (optional, only needed if your RPC
// requires an explicit chain — leave unset to let viem infer from RPC where possible)
const CHAIN_ID = process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : undefined;

// ============================================================
// VALIDATION
// ============================================================

if (!RPC_URL) throw new Error("RPC_URL missing in .env");
if (!SPONSOR_PRIVATE_KEY) throw new Error("PRIVATE_KEY missing in .env");
if (!USER_REGISTRY_ADDRESS) throw new Error("USER_REGISTRY_ADDRESS missing in .env");
if (!/^0x[a-fA-F0-9]{64}$/.test(SPONSOR_PRIVATE_KEY)) {
  throw new Error("PRIVATE_KEY must be a 32-byte hex private key starting with 0x");
}

const TOTAL_USERS = Math.max(0, TARGET_REFERRALS - CURRENT_REFERRALS);

// ============================================================
// ERC20 ABI (for USDT funding + approval)
// ============================================================

const erc20Abi = parseAbi([
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
]);

// ============================================================
// CLIENTS
// ============================================================

const chainConfig = CHAIN_ID
  ? {
      id: CHAIN_ID,
      name: "custom",
      nativeCurrency: { name: "Token", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } },
    }
  : undefined;

const sponsorAccount = privateKeyToAccount(SPONSOR_PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: chainConfig,
  transport: http(RPC_URL),
});

const sponsorWallet = createWalletClient({
  account: sponsorAccount,
  chain: chainConfig,
  transport: http(RPC_URL),
});

// ============================================================
// HELPERS
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getReferrerInfo() {
  const [userId, active] = await publicClient.readContract({
    address: USER_REGISTRY_ADDRESS,
    abi: userRegistryAbi,
    functionName: "referralCodeToUserId",
    args: [REFERRER],
  });

  if (!active || userId === 0n) {
    throw new Error(`Referral code "${REFERRER}" was not found or is inactive`);
  }

  // getUserById returns ONE struct object (named fields), not an array
  const user = await publicClient.readContract({
    address: USER_REGISTRY_ADDRESS,
    abi: userRegistryAbi,
    functionName: "getUserById",
    args: [userId],
  });

  const count = await publicClient.readContract({
    address: USER_REGISTRY_ADDRESS,
    abi: userRegistryAbi,
    functionName: "directReferralsCount",
    args: [userId],
  });

  return {
    userId,
    username: user.username,
    wallet: user.userAddress,
    referralCode: user.referralCode,
    directReferrals: count,
  };
}

async function checkNameAvailable(name) {
  const taken = await publicClient.readContract({
    address: USER_REGISTRY_ADDRESS,
    abi: userRegistryAbi,
    functionName: "isNameTaken",
    args: [name],
  });
  return !taken;
}

async function getUserAfterRegistration(address) {
  const userIds = await publicClient.readContract({
    address: USER_REGISTRY_ADDRESS,
    abi: userRegistryAbi,
    functionName: "getUserIdsByAddress",
    args: [address],
  });

  if (!userIds || userIds.length === 0) return null;

  const userId = userIds[userIds.length - 1];

  const user = await publicClient.readContract({
    address: USER_REGISTRY_ADDRESS,
    abi: userRegistryAbi,
    functionName: "getUserById",
    args: [userId],
  });

  return {
    userId,
    userAddress: user.userAddress,
    nftId: user.nftId,
    fuel: user.fuel,
    username: user.username,
    referredBy: user.referredBy,
    referralCode: user.referralCode,
    nftMintTime: user.nftMintTime,
  };
}

// Reads the USDT token address wired into the registry, the registration
// fee, and decimals — returns null usdtAddress if the fee is 0 (no funding needed).
async function getFeeInfo() {
  const fee = await publicClient.readContract({
    address: USER_REGISTRY_ADDRESS,
    abi: userRegistryAbi,
    functionName: "registrationFee",
  });

  if (fee === 0n) {
    return { fee: 0n, usdtAddress: null, decimals: 0 };
  }

  const usdtAddress = await publicClient.readContract({
    address: USER_REGISTRY_ADDRESS,
    abi: userRegistryAbi,
    functionName: "usdt",
  });

  const decimals = await publicClient.readContract({
    address: usdtAddress,
    abi: erc20Abi,
    functionName: "decimals",
  });

  return { fee, usdtAddress, decimals };
}

// Sends native gas + (if needed) USDT from the sponsor to a fresh wallet,
// then approves the registry to pull the registration fee from that wallet.
async function fundAndApprove(newAccount, feeInfo) {
  // 1. Native gas
  const nativeAmount = BigInt(Math.floor(Number(NATIVE_FUND_AMOUNT) * 1e18));
  const nativeTx = await sponsorWallet.sendTransaction({
    to: newAccount.address,
    value: nativeAmount,
  });
  await publicClient.waitForTransactionReceipt({ hash: nativeTx });
  console.log(`   Funded native gas: ${NATIVE_FUND_AMOUNT} (tx ${nativeTx})`);

  if (feeInfo.fee === 0n) {
    console.log("   Registration fee is 0 — skipping USDT funding/approval.");
    return;
  }

  // 2. USDT funding
  const usdtTransferTx = await sponsorWallet.writeContract({
    address: feeInfo.usdtAddress,
    abi: erc20Abi,
    functionName: "transfer",
    args: [newAccount.address, feeInfo.fee],
  });
  await publicClient.waitForTransactionReceipt({ hash: usdtTransferTx });
  console.log(
    `   Funded ${formatUnits(feeInfo.fee, feeInfo.decimals)} USDT (tx ${usdtTransferTx})`
  );

  // 3. New wallet approves registry to pull the fee
  const newUserWallet = createWalletClient({
    account: newAccount,
    chain: chainConfig,
    transport: http(RPC_URL),
  });

  const approveTx = await newUserWallet.writeContract({
    address: feeInfo.usdtAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [USER_REGISTRY_ADDRESS, feeInfo.fee],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log(`   Approved registry to spend USDT (tx ${approveTx})`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("\n==============================================");
  console.log(" ARDEN - DIPIKA REFERRAL TEST DATA CREATOR");
  console.log("==============================================\n");

  console.log("Sponsor wallet:", sponsorAccount.address);
  console.log("Referrer:", REFERRER);
  console.log("Configured current referrals:", CURRENT_REFERRALS);
  console.log("Target referrals:", TARGET_REFERRALS);
  console.log("Users to create (estimate):", TOTAL_USERS);
  console.log();

  const sponsorBalance = await publicClient.getBalance({ address: sponsorAccount.address });
  console.log("Sponsor native balance:", formatEther(sponsorBalance));

  let referrerInfo = await getReferrerInfo();
  console.log("\nReferrer on-chain information:");
  console.log("User ID:", referrerInfo.userId.toString());
  console.log("Username:", referrerInfo.username);
  console.log("Referral code:", referrerInfo.referralCode);
  console.log("Direct referrals (live):", referrerInfo.directReferrals.toString());

  if (referrerInfo.directReferrals >= BigInt(TARGET_REFERRALS)) {
    console.log("\nAlready reached target. Nothing to do.");
    return;
  }

  const feeInfo = await getFeeInfo();
  console.log(
    "\nRegistration fee:",
    feeInfo.fee === 0n ? "0 (free registration)" : formatUnits(feeInfo.fee, feeInfo.decimals) + " USDT"
  );

  if (feeInfo.fee > 0n) {
    const sponsorUsdtBalance = await publicClient.readContract({
      address: feeInfo.usdtAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [sponsorAccount.address],
    });
    console.log("Sponsor USDT balance:", formatUnits(sponsorUsdtBalance, feeInfo.decimals));

    const remaining = BigInt(TARGET_REFERRALS) - referrerInfo.directReferrals;
    const totalNeeded = feeInfo.fee * remaining;
    if (sponsorUsdtBalance < totalNeeded) {
      console.warn(
        `\n⚠️  Sponsor may not have enough USDT for all ${remaining} registrations ` +
          `(needs ~${formatUnits(totalNeeded, feeInfo.decimals)}, has ${formatUnits(sponsorUsdtBalance, feeInfo.decimals)}). ` +
          `Script will proceed and fail cleanly per-user if funds run out.`
      );
    }
  }

  const createdUsers = [];
  const remainingToCreate = Number(BigInt(TARGET_REFERRALS) - referrerInfo.directReferrals);

  for (let i = 1; i <= remainingToCreate; i++) {
    console.log("\n----------------------------------------------");
    console.log(`Creating referral ${i}/${remainingToCreate}`);
    console.log("----------------------------------------------");

    const newPrivateKey = generatePrivateKey();
    const newAccount = privateKeyToAccount(newPrivateKey);

    const username = `${USERNAME_BASE}_${Date.now()}_${i}`;

    console.log("Username:", username);
    console.log("Wallet:", newAccount.address);

    const available = await checkNameAvailable(username);
    if (!available) {
      console.log("Username already exists. Skipping:", username);
      continue;
    }

    try {
      console.log("Funding and approving new wallet...");
      await fundAndApprove(newAccount, feeInfo);

      const newUserWallet = createWalletClient({
        account: newAccount,
        chain: chainConfig,
        transport: http(RPC_URL),
      });

      // Simulate first to catch reverts before spending gas on a real tx
      await publicClient.simulateContract({
        address: USER_REGISTRY_ADDRESS,
        abi: userRegistryAbi,
        functionName: "regUser",
        args: [REFERRER, username],
        account: newAccount,
      });

      const hash = await newUserWallet.writeContract({
        address: USER_REGISTRY_ADDRESS,
        abi: userRegistryAbi,
        functionName: "regUser",
        args: [REFERRER, username],
      });

      console.log("TX:", hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("Confirmed in block:", receipt.blockNumber.toString());

      const user = await getUserAfterRegistration(newAccount.address);
      if (!user) throw new Error("Transaction succeeded but user could not be read");

      console.log("\nUSER CREATED:");
      console.log("User ID:", user.userId.toString());
      console.log("Username:", user.username);
      console.log("Wallet:", user.userAddress);
      console.log("NFT ID:", user.nftId.toString());
      console.log("Fuel:", user.fuel.toString());
      console.log("Referred By:", user.referredBy.toString());
      console.log("Referral Code:", user.referralCode);

      createdUsers.push({
        index: i,
        username,
        address: newAccount.address,
        privateKey: newPrivateKey,
        userId: user.userId.toString(),
        nftId: user.nftId.toString(),
        referredBy: user.referredBy.toString(),
        referralCode: user.referralCode,
        transactionHash: hash,
      });

      referrerInfo = await getReferrerInfo();
      console.log("\nReferrer direct referral count:", referrerInfo.directReferrals.toString(), "/", TARGET_REFERRALS);

      if (referrerInfo.directReferrals >= BigInt(TARGET_REFERRALS)) {
        console.log("\nTARGET REACHED!");
        break;
      }

      await sleep(1000);
    } catch (error) {
      console.error("\nFAILED:", error.shortMessage || error.details || error.message);
      console.log("Wallet was:", newAccount.address);
      console.log("Private key:", newPrivateKey);
      console.log("This wallet was NOT added to created-users.json.");
      console.log("Continuing with next user...");
    }
  }

  referrerInfo = await getReferrerInfo();

  console.log("\n==============================================");
  console.log(" FINAL RESULT");
  console.log("==============================================");
  console.log("Referrer direct referrals:", referrerInfo.directReferrals.toString(), "/", TARGET_REFERRALS);
  console.log("Users successfully created:", createdUsers.length);

  if (referrerInfo.directReferrals >= BigInt(TARGET_REFERRALS)) {
    console.log("\n✅ SUCCESS: target reached.");
  } else {
    console.log("\n⚠️ Target not reached.");
    console.log("Remaining:", (BigInt(TARGET_REFERRALS) - referrerInfo.directReferrals).toString());
  }

  fs.writeFileSync(
    "created-users.json",
    JSON.stringify(
      {
        referrer: REFERRER,
        target: TARGET_REFERRALS,
        finalReferralCount: referrerInfo.directReferrals.toString(),
        users: createdUsers,
      },
      null,
      2
    )
  );

  console.log("\nSaved generated wallets to created-users.json");
  console.log("⚠️  This file contains PRIVATE KEYS — keep it out of version control.");
}

main().catch((error) => {
  console.error("\nFATAL ERROR:");
  console.error(error.shortMessage || error.details || error.message);
  process.exit(1);
});
