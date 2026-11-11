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

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const STAKING_ENGINE = getAddress(process.env.STAKING_ENGINE);
const NFT_ID = BigInt(process.env.NFT_ID);
const POSITION_INDEX = BigInt(process.env.POSITION_INDEX || 0);

// Amount you want to partially withdraw
const WITHDRAW_AMOUNT = process.env.WITHDRAW_AMOUNT || "5";

const account = privateKeyToAccount(PRIVATE_KEY);

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
  },
};

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(RPC_URL),
});

// --------------------------------------------------
// ABI
// --------------------------------------------------

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

// --------------------------------------------------
// Main
// --------------------------------------------------

async function main() {
  console.log(`
======================================
 ARDEN PARTIAL WITHDRAW QA
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

  // ------------------------------------------------
  // 1. Read position
  // ------------------------------------------------

  const positions = await publicClient.readContract({
    address: STAKING_ENGINE,
    abi: stakingAbi,
    functionName: "positionsOf",
    args: [NFT_ID],
  });

  if (!positions[Number(POSITION_INDEX)]) {
    throw new Error("Position does not exist");
  }

  const position = positions[Number(POSITION_INDEX)];

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
  console.log(`Stake Timestamp : ${new Date(Number(stakeTimestamp) * 1000).toISOString()}`);
  console.log(`Active          : ${active}`);

  // ------------------------------------------------
  // 2. Calculate age
  // ------------------------------------------------

  const currentTime = Math.floor(Date.now() / 1000);
  const ageSeconds = currentTime - Number(stakeTimestamp);
  const ageMinutes = ageSeconds / 60;

  console.log("\nPOSITION AGE");
  console.log("--------------------------------------");
  console.log(`Age seconds     : ${ageSeconds}`);
  console.log(`Age minutes     : ${ageMinutes.toFixed(4)}`);

  // ------------------------------------------------
  // 3. Determine expected fee
  // ------------------------------------------------

  let expectedFeePercent;

  if (ageMinutes < 30) {
    expectedFeePercent = 1; // transaction should revert
  } else if (ageMinutes < 360) {
    expectedFeePercent = 1;
  } else {
    expectedFeePercent = 0;
  }

  console.log("\nWITHDRAWAL RULE");
  console.log("--------------------------------------");

  if (ageMinutes < 30) {
    console.log("❌ Position is below 30 minutes");
    console.log("Expected: WITHDRAW REVERT");
    return;
  }

  if (ageMinutes < 360) {
    console.log("✅ Position is between 30 and 359 minutes");
    console.log("Expected fee: 1%");
  } else {
    console.log("✅ Position is >= 360 minutes");
    console.log("Expected fee: 0%");
  }

  // ------------------------------------------------
  // 4. Amount validation
  // ------------------------------------------------

  const withdrawAmount = parseUnits(WITHDRAW_AMOUNT, 18);

  if (withdrawAmount <= 0n) {
    throw new Error("Withdraw amount must be greater than 0");
  }

  if (withdrawAmount > principal) {
    throw new Error(
      `Cannot withdraw ${WITHDRAW_AMOUNT} ARDE. Principal is only ${formatUnits(
        principal,
        18
      )} ARDE`
    );
  }

  console.log("\nWITHDRAWAL");
  console.log("--------------------------------------");
  console.log(`Requested       : ${formatUnits(withdrawAmount, 18)} ARDE`);
  console.log(`Expected fee    : ${expectedFeePercent}%`);

  // ------------------------------------------------
  // 5. Check lock
  // ------------------------------------------------

  try {
    const locked = await publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingAbi,
      functionName: "isLocked",
      args: [NFT_ID, POSITION_INDEX],
    });

    console.log(`Locked          : ${locked}`);

    if (locked) {
      console.log("❌ Position is locked. Withdrawal cannot continue.");
      return;
    }
  } catch (err) {
    console.log("⚠️ Could not check isLocked:", err.shortMessage || err.message);
  }

  // ------------------------------------------------
  // 6. Wallet balance BEFORE
  // ------------------------------------------------

  const balanceBefore = await publicClient.getBalance({
    address: account.address,
  });

  console.log("\nSubmitting withdrawal transaction...");

  // ------------------------------------------------
  // 7. Simulate first
  // ------------------------------------------------

  try {
    await publicClient.simulateContract({
      address: STAKING_ENGINE,
      abi: stakingAbi,
      functionName: "withdraw",
      account,
      args: [NFT_ID, POSITION_INDEX, withdrawAmount],
    });

    console.log("✅ Withdrawal simulation successful");
  } catch (err) {
    console.log("❌ Withdrawal simulation reverted");
    console.log(err.shortMessage || err.message);
    return;
  }

  // ------------------------------------------------
  // 8. Execute withdrawal
  // ------------------------------------------------

  const txHash = await walletClient.writeContract({
    address: STAKING_ENGINE,
    abi: stakingAbi,
    functionName: "withdraw",
    args: [NFT_ID, POSITION_INDEX, withdrawAmount],
  });

  console.log(`Transaction Hash : ${txHash}`);

  // ------------------------------------------------
  // 9. Wait confirmation
  // ------------------------------------------------

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  console.log(`Block Number     : ${receipt.blockNumber}`);
  console.log(`Status           : ${receipt.status}`);

  if (receipt.status !== "success") {
    console.log("❌ Withdrawal failed");
    return;
  }

  // ------------------------------------------------
  // 10. Read position AFTER
  // ------------------------------------------------

  const positionsAfter = await publicClient.readContract({
    address: STAKING_ENGINE,
    abi: stakingAbi,
    functionName: "positionsOf",
    args: [NFT_ID],
  });

  const after = positionsAfter[Number(POSITION_INDEX)];

  // ------------------------------------------------
  // 11. Result
  // ------------------------------------------------

  console.log(`
======================================
 WITHDRAW RESULT
======================================
Requested       : ${WITHDRAW_AMOUNT} ARDE
Expected Fee    : ${expectedFeePercent}%

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
`);

  console.log("✅ Partial withdrawal transaction confirmed.");
}

main().catch((err) => {
  console.error("\n❌ ERROR");
  console.error(err.shortMessage || err.message);
  process.exit(1);
});