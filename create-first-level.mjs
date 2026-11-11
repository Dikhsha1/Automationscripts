#!/usr/bin/env node

import dotenv from "dotenv";

import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  getAddress,
  parseUnits,
  formatUnits,
  maxUint256,
} from "viem";

import { privateKeyToAccount } from "viem/accounts";

// ============================================================
// LOAD ENV
// ============================================================

dotenv.config({ path: ".env.dev" });

// ============================================================
// CONFIG
// ============================================================

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const USER_REGISTRY_ADDRESS = process.env.USER_REGISTRY_ADDRESS;

// ============================================================
// ROOT USER
// ============================================================

const ROOT_USER_ID = 236;
const ROOT_NAME = "ravneet6";
const ROOT_REFERRAL_CODE = "ravneet6";

// ============================================================
// TREE CONFIGURATION
// ============================================================

// Total levels to create BELOW root.
//
// Level 1:
// ravneet7 + ravneet8
//
// Level 2:
// 4 users
//
// Level 3:
// 8 users
//
// ...
//
// Level 7:
// 128 users
//
const TOTAL_LEVELS = 7;

// Two children for every parent.
const CHILDREN_PER_PARENT = 2;

// ============================================================
// USERNAME CONFIGURATION
// ============================================================
//
// Example:
//
// Level 1:
// ravneet7
// ravneet8
//
// Level 2:
//
// ravneet7_1
// ravneet7_2
// ravneet8_1
// ravneet8_2
//
// Level 3:
//
// ravneet7_1_1
// ravneet7_1_2
// ...
//
// This makes the hierarchy easy to identify.
// ============================================================

function generateChildName(parentName, childNumber) {
  return `${parentName}_${childNumber}`;
}

// ============================================================
// REGISTRATION CONFIG
// ============================================================

const EXPECTED_REGISTRATION_FEE_USDT =
  process.env.REGISTRATION_FEE_USDT || "10";

const DAGR_AMOUNT =
  process.env.DAGR_AMOUNT || "0";

// ============================================================
// VALIDATION
// ============================================================

if (!RPC_URL) {
  throw new Error("RPC_URL is missing in .env.dev");
}

if (!PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY is missing in .env.dev");
}

if (!USER_REGISTRY_ADDRESS) {
  throw new Error(
    "USER_REGISTRY_ADDRESS is missing in .env.dev"
  );
}

// ============================================================
// USER REGISTRY ABI
// ============================================================
//
// Taken from the ABI supplied by you.
// ============================================================

const USER_REGISTRY_ABI = parseAbi([
  // ----------------------------------------------------------
  // Registration
  // ----------------------------------------------------------

  "function regUser(string referrer, string name) external",

  "function regUserV2(string referrer, string name, uint256 dagrAmountToUse) external",

  // ----------------------------------------------------------
  // User information
  // ----------------------------------------------------------

  "function getUserById(uint256 userId) external view returns ((uint256 userId,address userAddress,uint256 nftId,uint256 fuel,string username,uint256 referredBy,string referralCode,uint256 nftMintTime))",

  "function users(uint256 userId) external view returns (uint256 userId,address userAddress,uint256 nftId,uint256 fuel,string username,uint256 referredBy,string referralCode,uint256 nftMintTime)",

  // ----------------------------------------------------------
  // Referral
  // ----------------------------------------------------------

  "function getUserByReferralCode(string code) external view returns (bool)",

  "function referralCodeToUserId(string code) external view returns (uint256 userId,bool active)",

  "function getReferralChain(uint256 userId) external view returns ((uint256 userId,address userAddress)[])",

  "function getReferrerDetails(uint256 userId) external view returns (uint256,address)",

  "function directReferralsCount(uint256 userId) external view returns (uint256)",

  // ----------------------------------------------------------
  // Name
  // ----------------------------------------------------------

  "function isNameTaken(string name) external view returns (bool)",

  // ----------------------------------------------------------
  // Registration fee
  // ----------------------------------------------------------

  "function registrationFee() external view returns (uint256)",

  // ----------------------------------------------------------
  // USDT
  // ----------------------------------------------------------

  "function usdt() external view returns (address)",

  // ----------------------------------------------------------
  // Counter
  // ----------------------------------------------------------

  "function userCounter() external view returns (uint256)",

  // ----------------------------------------------------------
  // Address
  // ----------------------------------------------------------

  "function getUserIdsByAddress(address user) external view returns (uint256[])",

  // ----------------------------------------------------------
  // Fuel
  // ----------------------------------------------------------

  "function getCurrentFuel(uint256 userId) external view returns (uint256)",
]);

// ============================================================
// ERC20 ABI
// ============================================================

const ERC20_ABI = parseAbi([
  "function balanceOf(address account) external view returns (uint256)",

  "function allowance(address owner,address spender) external view returns (uint256)",

  "function approve(address spender,uint256 amount) external returns (bool)",

  "function decimals() external view returns (uint8)",

  "function symbol() external view returns (string)",
]);

// ============================================================
// CONTRACT
// ============================================================

const USER_REGISTRY = getAddress(
  USER_REGISTRY_ADDRESS
);

// ============================================================
// ACCOUNT
// ============================================================

const account =
  privateKeyToAccount(PRIVATE_KEY);

// ============================================================
// CLIENTS
// ============================================================

const publicClient =
  createPublicClient({
    transport: http(RPC_URL),
  });

const walletClient =
  createWalletClient({
    account,
    transport: http(RPC_URL),
  });

// ============================================================
// UTILITY
// ============================================================

function sleep(ms) {
  return new Promise(
    (resolve) => setTimeout(resolve, ms)
  );
}

// ============================================================
// GET USER
// ============================================================

async function getUserById(userId) {
  return await publicClient.readContract({
    address: USER_REGISTRY,
    abi: USER_REGISTRY_ABI,
    functionName: "getUserById",
    args: [BigInt(userId)],
  });
}

// ============================================================
// CHECK ROOT
// ============================================================

async function checkRoot() {

  console.log("\n");
  console.log("==============================================");
  console.log("CHECKING ROOT USER");
  console.log("==============================================");

  const root =
    await getUserById(ROOT_USER_ID);

  console.log(
    "User ID       :",
    root.userId.toString()
  );

  console.log(
    "Username      :",
    root.username
  );

  console.log(
    "Wallet        :",
    root.userAddress
  );

  console.log(
    "NFT ID        :",
    root.nftId.toString()
  );

  console.log(
    "Referral Code :",
    root.referralCode
  );

  console.log(
    "Referred By   :",
    root.referredBy.toString()
  );

  if (root.username !== ROOT_NAME) {
    throw new Error(
      `Root username mismatch. Expected ${ROOT_NAME}, found ${root.username}`
    );
  }

  if (
    root.referralCode !==
    ROOT_REFERRAL_CODE
  ) {
    throw new Error(
      `Root referral code mismatch. Expected ${ROOT_REFERRAL_CODE}, found ${root.referralCode}`
    );
  }

  console.log(
    "\n✅ Root validation PASSED"
  );

  return root;
}

// ============================================================
// CHECK REFERRER
// ============================================================

async function getReferrerByCode(
  referralCode
) {

  const exists =
    await publicClient.readContract({
      address: USER_REGISTRY,
      abi: USER_REGISTRY_ABI,
      functionName:
        "getUserByReferralCode",
      args: [referralCode],
    });

  if (!exists) {
    throw new Error(
      `Referral code does not exist: ${referralCode}`
    );
  }

  const mapping =
    await publicClient.readContract({
      address: USER_REGISTRY,
      abi: USER_REGISTRY_ABI,
      functionName:
        "referralCodeToUserId",
      args: [referralCode],
    });

  const userId = mapping[0];
  const active = mapping[1];

  if (!active) {
    throw new Error(
      `Referral code is inactive: ${referralCode}`
    );
  }

  const user =
    await getUserById(userId);

  return user;
}

// ============================================================
// CHECK NAME
// ============================================================

async function isNameTaken(name) {

  return await publicClient.readContract({
    address: USER_REGISTRY,
    abi: USER_REGISTRY_ABI,
    functionName: "isNameTaken",
    args: [name],
  });
}

// ============================================================
// GET REGISTRATION FEE
// ============================================================

async function getRegistrationFee() {

  return await publicClient.readContract({
    address: USER_REGISTRY,
    abi: USER_REGISTRY_ABI,
    functionName: "registrationFee",
  });
}

// ============================================================
// CHECK USDT
// ============================================================

async function checkUSDT() {

  console.log("\n");
  console.log("==============================================");
  console.log("CHECKING USDT");
  console.log("==============================================");

  const usdtAddress =
    await publicClient.readContract({
      address: USER_REGISTRY,
      abi: USER_REGISTRY_ABI,
      functionName: "usdt",
    });

  const USDT =
    getAddress(usdtAddress);

  const decimals =
    await publicClient.readContract({
      address: USDT,
      abi: ERC20_ABI,
      functionName: "decimals",
    });

  const symbol =
    await publicClient.readContract({
      address: USDT,
      abi: ERC20_ABI,
      functionName: "symbol",
    });

  const balance =
    await publicClient.readContract({
      address: USDT,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });

  const fee =
    await getRegistrationFee();

  console.log(
    "USDT Contract :",
    USDT
  );

  console.log(
    "Symbol        :",
    symbol
  );

  console.log(
    "Decimals      :",
    decimals
  );

  console.log(
    "Wallet        :",
    account.address
  );

  console.log(
    "USDT Balance  :",
    formatUnits(
      balance,
      decimals
    ),
    symbol
  );

  console.log(
    "Registration Fee:",
    formatUnits(
      fee,
      decimals
    ),
    symbol
  );

  if (balance < fee) {

    throw new Error(
      `Insufficient USDT. Required ${formatUnits(
        fee,
        decimals
      )}, available ${formatUnits(
        balance,
        decimals
      )}`
    );
  }

  console.log(
    "\n✅ USDT balance validation PASSED"
  );

  return {
    address: USDT,
    decimals,
    symbol,
    fee,
  };
}

// ============================================================
// APPROVE USDT
// ============================================================

async function approveUSDTIfRequired(
  usdt
) {

  console.log("\n");
  console.log("==============================================");
  console.log("CHECKING USDT ALLOWANCE");
  console.log("==============================================");

  const allowance =
    await publicClient.readContract({
      address: usdt.address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [
        account.address,
        USER_REGISTRY,
      ],
    });

  console.log(
    "Current allowance:",
    formatUnits(
      allowance,
      usdt.decimals
    )
  );

  console.log(
    "Required:",
    formatUnits(
      usdt.fee,
      usdt.decimals
    )
  );

  if (allowance >= usdt.fee) {

    console.log(
      "✅ Allowance sufficient"
    );

    return;
  }

  console.log(
    "\nApproving USDT..."
  );

  const hash =
    await walletClient.writeContract({
      address: usdt.address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [
        USER_REGISTRY,
        maxUint256,
      ],
    });

  console.log(
    "Approval TX:",
    hash
  );

  const receipt =
    await publicClient.waitForTransactionReceipt({
      hash,
    });

  if (
    receipt.status !==
    "success"
  ) {
    throw new Error(
      "USDT approval failed"
    );
  }

  console.log(
    "✅ USDT approval successful"
  );
}

// ============================================================
// REGISTER USER
// ============================================================

async function registerUser(
  parent,
  childName,
  usdt
) {

  console.log("\n");
  console.log("==============================================");
  console.log(
    `REGISTERING ${childName}`
  );
  console.log("==============================================");

  console.log(
    "Parent User ID:",
    parent.userId.toString()
  );

  console.log(
    "Parent Name:",
    parent.username
  );

  console.log(
    "Parent Referral Code:",
    parent.referralCode
  );

  console.log(
    "Child:",
    childName
  );

  // ----------------------------------------------------------
  // Name check
  // ----------------------------------------------------------

  const exists =
    await isNameTaken(childName);

  if (exists) {

    console.log(
      `⚠️ ${childName} already exists`
    );

    console.log(
      "Searching its referral-code mapping..."
    );

    return await findExistingUser(
      childName
    );
  }

  // ----------------------------------------------------------
  // Register
  // ----------------------------------------------------------

  console.log(
    "\nCalling regUserV2..."
  );

  const hash =
    await walletClient.writeContract({
      address: USER_REGISTRY,
      abi: USER_REGISTRY_ABI,
      functionName: "regUserV2",
      args: [
        parent.referralCode,
        childName,
        parseUnits(
          DAGR_AMOUNT,
          18
        ),
      ],
    });

  console.log(
    "Transaction:",
    hash
  );

  console.log(
    "Waiting for confirmation..."
  );

  const receipt =
    await publicClient.waitForTransactionReceipt({
      hash,
    });

  console.log(
    "Block:",
    receipt.blockNumber.toString()
  );

  console.log(
    "Status:",
    receipt.status
  );

  if (
    receipt.status !==
    "success"
  ) {
    throw new Error(
      `Registration failed for ${childName}`
    );
  }

  console.log(
    `✅ ${childName} registration successful`
  );

  // ----------------------------------------------------------
  // IMPORTANT
  // ----------------------------------------------------------
  // Do NOT scan all user IDs.
  //
  // Instead wait briefly and use the latest counter.
  // ----------------------------------------------------------

  await sleep(1000);

  return await findExistingUser(
    childName
  );
}

// ============================================================
// FIND EXISTING USER
// ============================================================
//
// IMPORTANT:
//
// Previous script scanned 1 -> userCounter for every user.
//
// That becomes extremely slow:
//
// 255 users × 255 RPC calls
// 500 users × 500 RPC calls
// etc.
//
// This function searches only the most recent users first.
// ============================================================

async function findExistingUser(
  name
) {

  const counter =
    await publicClient.readContract({
      address: USER_REGISTRY,
      abi: USER_REGISTRY_ABI,
      functionName: "userCounter",
    });

  // Search newest users first.
  //
  // Maximum 50 IDs.
  //
  // This prevents the script from appearing stuck.

  const SEARCH_LIMIT = 50n;

  let start =
    counter;

  let end =
    counter > SEARCH_LIMIT
      ? counter - SEARCH_LIMIT + 1n
      : 1n;

  for (
    let id = start;
    id >= end;
    id--
  ) {

    try {

      const user =
        await getUserById(id);

      if (
        user.username ===
        name
      ) {

        return user;
      }

    } catch {
      // Ignore invalid ID
    }
  }

  // ----------------------------------------------------------
  // Fallback:
  // If the user is older than 50 IDs,
  // perform a full scan only once.
  // ----------------------------------------------------------

  console.log(
    `User ${name} not found in latest ${SEARCH_LIMIT} users.`
  );

  console.log(
    "Performing one fallback search..."
  );

  for (
    let id = 1n;
    id <= counter;
    id++
  ) {

    try {

      const user =
        await getUserById(id);

      if (
        user.username ===
        name
      ) {

        return user;
      }

    } catch {
      // Ignore invalid IDs
    }
  }

  return null;
}

// ============================================================
// VERIFY USER
// ============================================================

async function verifyUser(
  user,
  expectedParent
) {

  console.log("\n");
  console.log("----------------------------------------------");
  console.log(
    `VERIFYING ${user.username}`
  );
  console.log("----------------------------------------------");

  console.log(
    "User ID:",
    user.userId.toString()
  );

  console.log(
    "Username:",
    user.username
  );

  console.log(
    "Referral Code:",
    user.referralCode
  );

  console.log(
    "Referred By:",
    user.referredBy.toString()
  );

  console.log(
    "Expected Parent:",
    expectedParent.userId.toString()
  );

  // ----------------------------------------------------------
  // Parent check
  // ----------------------------------------------------------

  if (
    user.referredBy !==
    expectedParent.userId
  ) {

    console.log(
      "❌ Parent relationship FAILED"
    );

    console.log(
      "Expected:",
      expectedParent.userId.toString()
    );

    console.log(
      "Actual:",
      user.referredBy.toString()
    );

    return false;
  }

  console.log(
    "✅ Parent relationship PASSED"
  );

  // ----------------------------------------------------------
  // Referral code check
  // ----------------------------------------------------------

  const mapping =
    await publicClient.readContract({
      address: USER_REGISTRY,
      abi: USER_REGISTRY_ABI,
      functionName:
        "referralCodeToUserId",
      args: [
        user.referralCode,
      ],
    });

  if (
    mapping[0] !==
    user.userId
  ) {

    console.log(
      "❌ Referral code mapping FAILED"
    );

    return false;
  }

  if (!mapping[1]) {

    console.log(
      "❌ Referral code inactive"
    );

    return false;
  }

  console.log(
    "✅ Referral code mapping PASSED"
  );

  return true;
}

// ============================================================
// GET CHILDREN USING REFERRAL CHAIN / DIRECT COUNT
// ============================================================
//
// UserRegistry ABI does not expose:
//
// leftChild
// rightChild
//
// Therefore this script verifies:
//
// referredBy
// directReferralsCount
//
// It does NOT claim LEFT/RIGHT placement.
// ============================================================

async function verifyChildren(
  parent,
  expectedChildren
) {

  console.log("\n");
  console.log("==============================================");
  console.log(
    `VERIFYING CHILDREN OF ${parent.username}`
  );
  console.log("==============================================");

  const count =
    await publicClient.readContract({
      address: USER_REGISTRY,
      abi: USER_REGISTRY_ABI,
      functionName:
        "directReferralsCount",
      args: [
        parent.userId,
      ],
    });

  console.log(
    "Direct referral count:",
    count.toString()
  );

  if (
    count <
    BigInt(expectedChildren.length)
  ) {

    console.log(
      `⚠️ Expected at least ${expectedChildren.length} children`
    );

  } else {

    console.log(
      "✅ Direct referral count PASSED"
    );
  }

  let passed = 0;

  for (
    const child of expectedChildren
  ) {

    const result =
      await verifyUser(
        child,
        parent
      );

    if (result) {
      passed++;
    }
  }

  console.log(
    `Children verified: ${passed}/${expectedChildren.length}`
  );

  return passed ===
    expectedChildren.length;
}

// ============================================================
// VERIFY REFERRAL CHAIN
// ============================================================

async function verifyReferralChain(
  user,
  expectedAncestors
) {

  console.log("\n");
  console.log("----------------------------------------------");
  console.log(
    `REFERRAL CHAIN FOR ${user.username}`
  );
  console.log("----------------------------------------------");

  const chain =
    await publicClient.readContract({
      address: USER_REGISTRY,
      abi: USER_REGISTRY_ABI,
      functionName:
        "getReferralChain",
      args: [
        user.userId,
      ],
    });

  console.log(
    "Chain length:",
    chain.length
  );

  for (
    let i = 0;
    i < chain.length;
    i++
  ) {

    console.log(
      `${i + 1}. User ID ${chain[i].userId.toString()}`
    );
  }

  // ----------------------------------------------------------
  // Verify expected ancestors
  // ----------------------------------------------------------

  for (
    const ancestor of expectedAncestors
  ) {

    const found =
      chain.some(
        item =>
          item.userId ===
          ancestor.userId
      );

    if (!found) {

      console.log(
        `❌ Missing ancestor: ${ancestor.username}`
      );

      return false;
    }

    console.log(
      `✅ Ancestor found: ${ancestor.username}`
    );
  }

  return true;
}

// ============================================================
// BUILD LEVEL
// ============================================================

async function processLevel(
  parents,
  level,
  usdt
) {

  console.log("\n\n");
  console.log("################################################");
  console.log(
    `LEVEL ${level}`
  );
  console.log("################################################");

  console.log(
    "Parents at this level:",
    parents.length
  );

  const nextLevel = [];

  // ----------------------------------------------------------
  // Process every parent
  // ----------------------------------------------------------

  for (
    let parentIndex = 0;
    parentIndex < parents.length;
    parentIndex++
  ) {

    const parent =
      parents[parentIndex];

    console.log("\n");
    console.log(
      `Parent ${parentIndex + 1}/${parents.length}`
    );

    console.log(
      "Parent Name:",
      parent.username
    );

    console.log(
      "Parent ID:",
      parent.userId.toString()
    );

    console.log(
      "Parent Referral:",
      parent.referralCode
    );

    const children = [];

    // --------------------------------------------------------
    // Create exactly two children
    // --------------------------------------------------------

    for (
      let childNumber = 1;
      childNumber <=
      CHILDREN_PER_PARENT;
      childNumber++
    ) {

      const childName =
        generateChildName(
          parent.username,
          childNumber
        );

      console.log("\n");
      console.log(
        `Creating child ${childNumber}/${CHILDREN_PER_PARENT}: ${childName}`
      );

      const child =
        await registerUser(
          parent,
          childName,
          usdt
        );

      if (!child) {

        console.log(
          `❌ Could not find ${childName}`
        );

        continue;
      }

      // ------------------------------------------------------
      // Verify child
      // ------------------------------------------------------

      const verified =
        await verifyUser(
          child,
          parent
        );

      if (!verified) {

        throw new Error(
          `Child verification failed: ${childName}`
        );
      }

      children.push(child);

      // ------------------------------------------------------
      // Small delay to avoid RPC overload
      // ------------------------------------------------------

      await sleep(300);
    }

    // --------------------------------------------------------
    // Verify parent's two children
    // --------------------------------------------------------

    await verifyChildren(
      parent,
      children
    );

    // --------------------------------------------------------
    // Add children to next level
    // --------------------------------------------------------

    nextLevel.push(
      ...children
    );
  }

  return nextLevel;
}

// ============================================================
// PRINT TREE
// ============================================================

function printLevel(
  level,
  users
) {

  console.log("\n");
  console.log(
    `LEVEL ${level} (${users.length} users)`
  );

  console.log(
    "------------------------------------------------"
  );

  for (
    const user of users
  ) {

    console.log(
      `${user.username} | ID: ${user.userId.toString()} | referredBy: ${user.referredBy.toString()} | referral: ${user.referralCode}`
    );
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {

  console.log("\n");
  console.log("================================================");
  console.log(" ARDEN QA - 7 LEVEL REFERRAL TREE TEST");
  console.log("================================================");

  console.log(
    "RPC:",
    RPC_URL
  );

  console.log(
    "UserRegistry:",
    USER_REGISTRY
  );

  console.log(
    "Wallet:",
    account.address
  );

  console.log(
    "Root:",
    ROOT_NAME
  );

  console.log(
    "Root User ID:",
    ROOT_USER_ID
  );

  console.log(
    "Total Levels:",
    TOTAL_LEVELS
  );

  console.log(
    "Children Per Parent:",
    CHILDREN_PER_PARENT
  );

  // ==========================================================
  // STEP 1
  // ==========================================================

  const root =
    await checkRoot();

  // ==========================================================
  // STEP 2
  // ==========================================================

  const usdt =
    await checkUSDT();

  // ==========================================================
  // STEP 3
  // ==========================================================

  await approveUSDTIfRequired(
    usdt
  );

  // ==========================================================
  // LEVEL 0
  // ==========================================================

  let currentLevel = [
    root
  ];

  printLevel(
    0,
    currentLevel
  );

  // ==========================================================
  // LEVEL 1 → LEVEL 7
  // ==========================================================

  for (
    let level = 1;
    level <= TOTAL_LEVELS;
    level++
  ) {

    console.log("\n");
    console.log("================================================");
    console.log(
      `STARTING LEVEL ${level}`
    );
    console.log("================================================");

    console.log(
      "Number of parents:",
      currentLevel.length
    );

    // --------------------------------------------------------
    // Create children
    // --------------------------------------------------------

    const nextLevel =
      await processLevel(
        currentLevel,
        level,
        usdt
      );

    // --------------------------------------------------------
    // Validate result
    // --------------------------------------------------------

    const expectedUsers =
      currentLevel.length *
      CHILDREN_PER_PARENT;

    console.log("\n");
    console.log(
      `Level ${level} expected users: ${expectedUsers}`
    );

    console.log(
      `Level ${level} actual users: ${nextLevel.length}`
    );

    if (
      nextLevel.length !==
      expectedUsers
    ) {

      console.log(
        `⚠️ Level ${level} has incomplete users`
      );

    } else {

      console.log(
        `✅ Level ${level} user count PASSED`
      );
    }

    // --------------------------------------------------------
    // Print level
    // --------------------------------------------------------

    printLevel(
      level,
      nextLevel
    );

    // --------------------------------------------------------
    // Referral-chain verification
    // --------------------------------------------------------

    console.log("\n");
    console.log(
      `VERIFYING LEVEL ${level} CHAINS`
    );

    // Only verify chains for this level.
    //
    // For level 7 this confirms the complete
    // ancestor relationship where supported by
    // getReferralChain().
    //
    // --------------------------------------------------------

    for (
      const user of nextLevel
    ) {

      const ancestors = [];

      let ancestorId =
        user.referredBy;

      // Build expected ancestors by walking
      // referredBy relationships.

      for (
        let i = 0;
        i < level;
        i++
      ) {

        if (
          ancestorId ===
          0n
        ) {
          break;
        }

        try {

          const ancestor =
            await getUserById(
              ancestorId
            );

          ancestors.push(
            ancestor
          );

          ancestorId =
            ancestor.referredBy;

        } catch {

          break;
        }
      }

      await verifyReferralChain(
        user,
        ancestors
      );
    }

    // --------------------------------------------------------
    // Next level
    // --------------------------------------------------------

    currentLevel =
      nextLevel;

    console.log("\n");
    console.log(
      `LEVEL ${level} COMPLETED`
    );
  }

  // ==========================================================
  // FINAL SUMMARY
  // ==========================================================

  console.log("\n\n");
  console.log("================================================");
  console.log("7 LEVEL TREE TEST COMPLETED");
  console.log("================================================");

  console.log(
    "Root:",
    ROOT_NAME
  );

  console.log(
    "Root ID:",
    ROOT_USER_ID
  );

  console.log(
    "Levels created:",
    TOTAL_LEVELS
  );

  console.log(
    "Final level users:",
    currentLevel.length
  );

  console.log("\n");
  console.log("EXPECTED USER COUNTS");
  console.log("--------------------");

  let total = 1;

  for (
    let level = 1;
    level <= TOTAL_LEVELS;
    level++
  ) {

    const count =
      Math.pow(
        CHILDREN_PER_PARENT,
        level
      );

    total += count;

    console.log(
      `Level ${level}: ${count}`
    );
  }

  console.log(
    `Total including root: ${total}`
  );

  console.log("\n");
  console.log("TREE STRUCTURE");
  console.log("--------------");

  console.log(`
                         ravneet6
                        User ID 236
                       /          \\
                      /            \\
               ravneet6_1      ravneet6_2
                  /    \\           /    \\
                 /      \\         /      \\
              Level 2  Level 2  Level 2  Level 2
                ...
                ...
             Level 7
  `);

  console.log("================================================");
  console.log("IMPORTANT QA NOTES");
  console.log("================================================");

  console.log(`
1. Every child must have referredBy = its direct parent ID.

2. Every parent must have 2 direct referrals.

3. Every registered user must have an active referral code.

4. referralCodeToUserId(referralCode) must point back
   to the correct user ID.

5. getReferralChain(userId) is used to verify the
   ancestor chain.

6. This ABI does NOT expose LEFT/RIGHT fields.

7. Therefore this script verifies the REFERRAL TREE,
   not binary LEFT/RIGHT placement.

8. The script does NOT continuously scan every user ID.

9. Existing users are reused instead of registered again.

10. If ravneet7 and ravneet8 already exist, the script
    continues from them automatically.

11. Level 7 means 7 levels BELOW ravneet6.

12. With 2 children per parent:

    Level 1 = 2
    Level 2 = 4
    Level 3 = 8
    Level 4 = 16
    Level 5 = 32
    Level 6 = 64
    Level 7 = 128

    Total below root = 254
    Total including root = 255
`);
}

// ============================================================
// ERROR HANDLER
// ============================================================

main().catch(
  (error) => {

    console.error("\n");
    console.error(
      "❌ SCRIPT FAILED"
    );

    console.error(
      "------------------------------------------------"
    );

    console.error(
      "Short message:",
      error.shortMessage ||
      "N/A"
    );

    console.error(
      "Message:",
      error.message ||
      error
    );

    if (error.cause) {

      console.error(
        "\nCause:",
        error.cause
      );
    }

    process.exit(1);
  }
);