import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  getAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ==================================================
// CONFIG
// ==================================================

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const STAKING_ENGINE = getAddress(process.env.STAKING_ENGINE);
const NFT_ID = BigInt(process.env.NFT_ID);
const POSITION_INDEX = BigInt(process.env.POSITION_INDEX || 0);

const WITHDRAW_AMOUNT = process.env.WITHDRAW_AMOUNT || "1";

if (!RPC_URL) throw new Error("RPC_URL is missing");
if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is missing");
if (!STAKING_ENGINE) throw new Error("STAKING_ENGINE is missing");
if (!process.env.NFT_ID) throw new Error("NFT_ID is missing");

// ==================================================
// ACCOUNT
// ==================================================

const account = privateKeyToAccount(PRIVATE_KEY);

// ==================================================
// CHAIN
// ==================================================

const chain = {
  id: CHAIN_ID,
  name: "ARDEN",
  nativeCurrency: {
    name: "Native",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
    public: {
      http: [RPC_URL],
    },
  },
};

// ==================================================
// CLIENTS
// ==================================================

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(RPC_URL),
});

// ==================================================
// ABI
// ==================================================

const stakingAbi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256",
      },
    ],
    name: "positionsOf",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "principal",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "accruedBalance",
            type: "uint256",
          },
          {
            internalType: "uint64",
            name: "stakeTimestamp",
            type: "uint64",
          },
          {
            internalType: "uint16",
            name: "lastUpdateDay",
            type: "uint16",
          },
          {
            internalType: "uint8",
            name: "lastLoyaltyIndex",
            type: "uint8",
          },
          {
            internalType: "bool",
            name: "active",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "claimed",
            type: "uint256",
          },
        ],
        internalType: "struct StakingEngine.Position[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "posIndex",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [
      {
        internalType: "uint256",
        name: "toUser",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "posIndex",
        type: "uint256",
      },
    ],
    name: "isLocked",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// ==================================================
// MAIN
// ==================================================

async function main() {

  console.log(`
======================================
 ARDEN WITHDRAWAL QA CHECK
======================================
RPC             : ${RPC_URL}
Chain ID        : ${CHAIN_ID}
Wallet          : ${account.address}
Staking Engine  : ${STAKING_ENGINE}
NFT ID          : ${NFT_ID}
Position        : ${POSITION_INDEX}
Withdraw Amount : ${WITHDRAW_AMOUNT} ARDE
======================================
`);

  // ==================================================
  // 1. READ POSITION
  // ==================================================

  const positions = await publicClient.readContract({
    address: STAKING_ENGINE,
    abi: stakingAbi,
    functionName: "positionsOf",
    args: [NFT_ID],
  });

  const position = positions[Number(POSITION_INDEX)];

  if (!position) {
    throw new Error(
      `Position ${POSITION_INDEX} does not exist for NFT ${NFT_ID}`
    );
  }

  const principal = position.principal;
  const accruedBalance = position.accruedBalance;
  const claimed = position.claimed;
  const stakeTimestamp = position.stakeTimestamp;
  const active = position.active;

  console.log("CURRENT POSITION");
  console.log("--------------------------------------");
  console.log(`Principal       : ${formatUnits(principal, 18)} ARDE`);
  console.log(`Stored Balance  : ${formatUnits(accruedBalance, 18)} ARDE`);
  console.log(`Claimed         : ${formatUnits(claimed, 18)} ARDE`);
  console.log(
    `Stake Timestamp : ${new Date(
      Number(stakeTimestamp) * 1000
    ).toISOString()}`
  );
  console.log(`Active          : ${active}`);

  // ==================================================
  // 2. CALCULATE AGE
  // ==================================================

  const currentTime = Math.floor(Date.now() / 1000);

  const ageSeconds =
    currentTime - Number(stakeTimestamp);

  const ageMinutes =
    ageSeconds / 60;

  console.log("\nPOSITION AGE");
  console.log("--------------------------------------");
  console.log(`Age seconds     : ${ageSeconds}`);
  console.log(`Age minutes     : ${ageMinutes.toFixed(4)}`);

  // ==================================================
  // 3. DETERMINE TEST CASE
  // ==================================================

  let testCase;
  let expectedResult;
  let expectedFee;

  if (ageMinutes < 30) {

    testCase = "WD-001 / WD-002";
    expectedResult = "REVERT";
    expectedFee = "N/A";

  } else if (ageMinutes < 360) {

    testCase = "WD-003 / WD-004 / WD-005";
    expectedResult = "SUCCESS";
    expectedFee = "1%";

  } else {

    testCase = "WD-005 / WD-006";
    expectedResult = "SUCCESS";
    expectedFee = "0%";
  }

  console.log("\nTEST CASE");
  console.log("--------------------------------------");
  console.log(`Applicable Test : ${testCase}`);
  console.log(`Expected Result  : ${expectedResult}`);
  console.log(`Expected Fee     : ${expectedFee}`);

  // ==================================================
  // 4. AMOUNT VALIDATION
  // ==================================================

  const withdrawAmount =
    parseUnits(WITHDRAW_AMOUNT, 18);

  if (withdrawAmount <= 0n) {
    throw new Error(
      "Withdraw amount must be greater than 0"
    );
  }

  if (withdrawAmount > principal) {
    throw new Error(
      `Withdraw amount ${WITHDRAW_AMOUNT} ARDE is greater than principal ${formatUnits(
        principal,
        18
      )} ARDE`
    );
  }

  // ==================================================
  // 5. CHECK ACTIVE
  // ==================================================

  if (!active) {
    console.log("\n❌ Position is already inactive.");
    return;
  }

  // ==================================================
  // 6. CHECK LOCK
  // ==================================================

  try {

    const locked =
      await publicClient.readContract({
        address: STAKING_ENGINE,
        abi: stakingAbi,
        functionName: "isLocked",
        args: [
          NFT_ID,
          POSITION_INDEX,
        ],
      });

    console.log("\nLOCK STATUS");
    console.log("--------------------------------------");
    console.log(`Locked          : ${locked}`);

    if (locked) {
      console.log(
        "❌ Position is locked."
      );
      return;
    }

  } catch (err) {

    console.log(
      "⚠️ Could not check lock status:"
    );

    console.log(
      err.shortMessage || err.message
    );
  }

  // ==================================================
  // 7. NEGATIVE TEST
  // WD-001 / WD-002
  // ==================================================

  if (ageMinutes < 30) {

    console.log(`
======================================
 NEGATIVE WITHDRAWAL TEST
======================================
Position Age : ${ageMinutes.toFixed(4)} minutes

Expected:
❌ Withdrawal MUST revert

Reason:
Withdrawal is not allowed before Minute 30.

Testing withdraw() simulation...
`);

    try {

      await publicClient.simulateContract({
        address: STAKING_ENGINE,
        abi: stakingAbi,
        functionName: "withdraw",
        account,
        args: [
          NFT_ID,
          POSITION_INDEX,
          withdrawAmount,
        ],
      });

      console.log(`
❌ FAIL

Withdrawal simulation SUCCEEDED.

Expected:
Transaction should revert before 30 minutes.

This indicates that WD-001 / WD-002
may not be working as expected.
`);

      process.exit(1);

    } catch (err) {

      console.log(`
✅ PASS

Withdrawal reverted as expected.

======================================
 REVERT INFORMATION
======================================
`);

      console.log(
        err.shortMessage ||
        err.message
      );

      console.log(`
======================================
 QA RESULT
======================================

Test Case       : ${testCase}
Position Age    : ${ageMinutes.toFixed(4)} minutes
Withdraw Amount : ${WITHDRAW_AMOUNT} ARDE

Expected        : REVERT
Actual          : REVERT

STATUS          : ✅ PASS
======================================
`);

      return;
    }
  }

  // ==================================================
  // 8. POSITIVE WITHDRAWAL TEST
  // ==================================================

  console.log(`
======================================
 POSITIVE WITHDRAWAL TEST
======================================
`);

  console.log(
    `Requested Amount : ${WITHDRAW_AMOUNT} ARDE`
  );

  console.log(
    `Expected Fee     : ${expectedFee}`
  );

  // ==================================================
  // 9. SIMULATE
  // ==================================================

  console.log(
    "\nSimulating withdrawal..."
  );

  try {

    await publicClient.simulateContract({
      address: STAKING_ENGINE,
      abi: stakingAbi,
      functionName: "withdraw",
      account,
      args: [
        NFT_ID,
        POSITION_INDEX,
        withdrawAmount,
      ],
    });

    console.log(
      "✅ Withdrawal simulation successful"
    );

  } catch (err) {

    console.log(
      "❌ Withdrawal simulation reverted"
    );

    console.log(
      err.shortMessage ||
      err.message
    );

    return;
  }

  // ==================================================
  // 10. SEND TRANSACTION
  // ==================================================

  console.log(
    "\nSubmitting withdrawal transaction..."
  );

  const txHash =
    await walletClient.writeContract({
      address: STAKING_ENGINE,
      abi: stakingAbi,
      functionName: "withdraw",
      args: [
        NFT_ID,
        POSITION_INDEX,
        withdrawAmount,
      ],
    });

  console.log(
    `Transaction Hash : ${txHash}`
  );

  // ==================================================
  // 11. WAIT CONFIRMATION
  // ==================================================

  const receipt =
    await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

  console.log(
    `Block Number     : ${receipt.blockNumber}`
  );

  console.log(
    `Status           : ${receipt.status}`
  );

  if (receipt.status !== "success") {

    console.log(
      "❌ Withdrawal transaction failed"
    );

    return;
  }

  // ==================================================
  // 12. READ POSITION AFTER
  // ==================================================

  const positionsAfter =
    await publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingAbi,
      functionName: "positionsOf",
      args: [NFT_ID],
    });

  const after =
    positionsAfter[
      Number(POSITION_INDEX)
    ];

  // ==================================================
  // 13. RESULT
  // ==================================================

  console.log(`
======================================
 WITHDRAW RESULT
======================================

Test Case:
${testCase}

Position Age:
${ageMinutes.toFixed(4)} minutes

Requested:
${WITHDRAW_AMOUNT} ARDE

Expected Fee:
${expectedFee}

Principal Before:
${formatUnits(principal, 18)} ARDE

Principal After:
${formatUnits(after.principal, 18)} ARDE

Claimed Before:
${formatUnits(claimed, 18)} ARDE

Claimed After:
${formatUnits(after.claimed, 18)} ARDE

Active After:
${after.active}

Transaction:
${txHash}

======================================
 QA RESULT
======================================
`);

  console.log(
    "✅ Withdrawal transaction confirmed."
  );

  // ==================================================
  // 14. QA EXPECTATION
  // ==================================================

  if (ageMinutes >= 30 && ageMinutes < 360) {

    console.log(
      "Expected behavior: 1% withdrawal fee."
    );

  } else if (ageMinutes >= 360) {

    console.log(
      "Expected behavior: 0% withdrawal fee."
    );
  }

  console.log(
    "======================================"
  );
}

// ==================================================
// RUN
// ==================================================

main().catch((err) => {

  console.error(`
======================================
 ❌ ERROR
======================================
`);

  console.error(
    err.shortMessage ||
    err.message
  );

  process.exit(1);
});