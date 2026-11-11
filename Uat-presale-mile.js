import "dotenv/config";
import fs from "fs";
import {
  createPublicClient,
  http,
  formatUnits,
  getAddress
} from "viem";

// ============================================================
// CONFIG
// ============================================================

const RPC_URL =
  process.env.RPC_URL || "https://chain.sotto.li";

const CHAIN_ID =
  Number(process.env.CHAIN_ID || 1337);

const PRESALE_CONTRACT = getAddress(
  process.env.PRESALE_ADDRESS ||
  process.env.PRESALE_CONTRACT ||
  "0xd96ff57a67eA8d45019358A2c9b862507c8883f5"
);

// Fresh user
const USER_ID =
  BigInt(process.env.USER_ID || "19");

// Expected presale stake
const TARGET_PRINCIPAL =
  BigInt(
    process.env.TARGET_PRINCIPAL_WEI ||
    "100000000000000000000"
  );

// Expected stake date
const TARGET_DATE =
  process.env.TARGET_DATE || "2026-08-6";

const OUTPUT_FILE =
  process.env.OUTPUT_FILE ||
  "presale-stake-check.csv";

// ============================================================
// PRESALE ABI
// ============================================================

const presaleABI = [

  // ----------------------------------------------------------
  // Position count
  // ----------------------------------------------------------

  {
    inputs: [
      {
        internalType: "uint256",
        name: "userId",
        type: "uint256"
      }
    ],
    name: "getPositionCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  // ----------------------------------------------------------
  // User position
  // ----------------------------------------------------------

  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "userPositions",
    outputs: [
      {
        internalType: "uint256",
        name: "principal",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "accruedBalance",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "stakeTimestamp",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "lastUpdateDay",
        type: "uint256"
      },
      {
        internalType: "uint8",
        name: "lastLoyaltyIndex",
        type: "uint8"
      },
      {
        internalType: "uint16",
        name: "bucketDay",
        type: "uint16"
      },
      {
        internalType: "bool",
        name: "isActive",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  // ----------------------------------------------------------
  // Current live balance
  // ----------------------------------------------------------

  {
    inputs: [
      {
        internalType: "uint256",
        name: "userId",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "_posIndex",
        type: "uint256"
      }
    ],
    name: "viewAccruedBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  // ----------------------------------------------------------
  // Claimed reward
  // ----------------------------------------------------------

  {
    inputs: [
      {
        internalType: "uint256",
        name: "userId",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "posIndex",
        type: "uint256"
      }
    ],
    name: "getClaimedRewardForPosition",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];

// ============================================================
// CHAIN
// ============================================================

const chain = {
  id: CHAIN_ID,

  name: "Sotto UAT",

  nativeCurrency: {
    name: "Sotto",
    symbol: "SOTTO",
    decimals: 18
  },

  rpcUrls: {
    default: {
      http: [RPC_URL]
    }
  }
};

// ============================================================
// CLIENT
// ============================================================

const client = createPublicClient({
  chain,
  transport: http(RPC_URL)
});

// ============================================================
// HELPERS
// ============================================================

function formatARDE(value) {
  return Number(
    formatUnits(value, 18)
  ).toFixed(10);
}

function formatDate(timestamp) {

  return new Date(
    Number(timestamp) * 1000
  )
    .toISOString()
    .slice(0, 10);
}

function formatDateTime(timestamp) {

  return new Date(
    Number(timestamp) * 1000
  ).toISOString();
}

function csvEscape(value) {

  const str = String(value ?? "");

  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n")
  ) {
    return `"${str.replaceAll('"', '""')}"`;
  }

  return str;
}

// ============================================================
// HEADER
// ============================================================

console.log("");

console.log(
  "============================================================"
);

console.log(
  "             ARDEN UAT PRESALE STAKE CHECK"
);

console.log(
  "============================================================"
);

console.log(
  "RPC              :",
  RPC_URL
);

console.log(
  "Chain ID         :",
  CHAIN_ID
);

console.log(
  "Presale Contract :",
  PRESALE_CONTRACT
);

console.log(
  "User ID          :",
  USER_ID.toString()
);

console.log(
  "Expected Stake   :",
  formatARDE(TARGET_PRINCIPAL),
  "ARDE"
);

console.log(
  "Expected Date    :",
  TARGET_DATE
);

console.log(
  "============================================================"
);

// ============================================================
// CURRENT BLOCK
// ============================================================

const currentBlock =
  await client.getBlockNumber();

console.log("");

console.log(
  "Current Block    :",
  currentBlock.toString()
);

// ============================================================
// GET POSITION COUNT
// ============================================================

const positionCount =
  await client.readContract({
    address: PRESALE_CONTRACT,
    abi: presaleABI,
    functionName: "getPositionCount",
    args: [USER_ID]
  });

console.log("");

console.log(
  "------------------------------------------------------------"
);

console.log(
  "PRESALE POSITIONS"
);

console.log(
  "------------------------------------------------------------"
);

console.log(
  "Position Count   :",
  positionCount.toString()
);

// ============================================================
// FIND 100 ARDE FRESH PRESALE POSITION
// ============================================================

let targetPosition = null;

for (
  let i = 0n;
  i < positionCount;
  i++
) {

  const position =
    await client.readContract({
      address: PRESALE_CONTRACT,
      abi: presaleABI,
      functionName: "userPositions",
      args: [USER_ID, i]
    });

  const [
    principal,
    accruedBalance,
    stakeTimestamp,
    lastUpdateDay,
    lastLoyaltyIndex,
    bucketDay,
    isActive
  ] = position;

  const stakeDate =
    formatDate(stakeTimestamp);

  console.log("");

  console.log(
    `Position ${i.toString()}`
  );

  console.log(
    "Principal        :",
    formatARDE(principal),
    "ARDE"
  );

  console.log(
    "Stake Date       :",
    formatDateTime(stakeTimestamp)
  );

  console.log(
    "Last Update Day  :",
    lastUpdateDay.toString()
  );

  console.log(
    "Loyalty Index    :",
    lastLoyaltyIndex.toString()
  );

  console.log(
    "Bucket Day       :",
    bucketDay.toString()
  );

  console.log(
    "Active           :",
    isActive
  );

  // ----------------------------------------------------------
  // MATCH ONLY PRESALE STAKE
  // ----------------------------------------------------------

  if (
    principal === TARGET_PRINCIPAL &&
    stakeDate === TARGET_DATE &&
    isActive
  ) {

    targetPosition = {
      index: i,
      principal,
      accruedBalance,
      stakeTimestamp,
      lastUpdateDay,
      lastLoyaltyIndex,
      bucketDay,
      isActive
    };

    break;
  }
}

// ============================================================
// POSITION NOT FOUND
// ============================================================

if (!targetPosition) {

  console.log("");

  console.log(
    "============================================================"
  );

  console.log(
    "❌ PRESALE STAKE NOT FOUND"
  );

  console.log(
    "============================================================"
  );

  console.log(
    "Expected Principal :",
    formatARDE(TARGET_PRINCIPAL),
    "ARDE"
  );

  console.log(
    "Expected Date      :",
    TARGET_DATE
  );

  console.log("");

  console.log(
    "Possible reasons:"
  );

  console.log(
    "1. Wrong USER_ID"
  );

  console.log(
    "2. Wrong TARGET_DATE"
  );

  console.log(
    "3. Wrong principal"
  );

  console.log(
    "4. Position is inactive"
  );

  process.exit(1);
}

// ============================================================
// TARGET POSITION FOUND
// ============================================================

console.log("");

console.log(
  "============================================================"
);

console.log(
  "             PRESALE STAKE FOUND"
);

console.log(
  "============================================================"
);

console.log(
  "Position Index   :",
  targetPosition.index.toString()
);

console.log(
  "Principal        :",
  formatARDE(targetPosition.principal),
  "ARDE"
);

console.log(
  "Stake Date       :",
  formatDateTime(
    targetPosition.stakeTimestamp
  )
);

console.log(
  "Last Update Day  :",
  targetPosition.lastUpdateDay.toString()
);

console.log(
  "Loyalty Index    :",
  targetPosition.lastLoyaltyIndex.toString()
);

console.log(
  "Bucket Day       :",
  targetPosition.bucketDay.toString()
);

console.log(
  "Active           :",
  targetPosition.isActive
);

// ============================================================
// CURRENT LIVE BALANCE
// ============================================================

const liveBalance =
  await client.readContract({
    address: PRESALE_CONTRACT,
    abi: presaleABI,
    functionName: "viewAccruedBalance",
    args: [
      USER_ID,
      targetPosition.index
    ]
  });

// ============================================================
// CLAIMED REWARD
// ============================================================

const claimedReward =
  await client.readContract({
    address: PRESALE_CONTRACT,
    abi: presaleABI,
    functionName:
      "getClaimedRewardForPosition",
    args: [
      USER_ID,
      targetPosition.index
    ]
  });

// ============================================================
// CURRENT REWARD
// ============================================================

const currentReward =
  liveBalance >
  targetPosition.principal
    ? liveBalance -
      targetPosition.principal
    : 0n;

// ============================================================
// AGE
// ============================================================

const stakeDate =
  new Date(
    Number(
      targetPosition.stakeTimestamp
    ) * 1000
  );

const now =
  new Date();

const ageDays =
  Math.floor(
    (
      now.getTime() -
      stakeDate.getTime()
    ) /
    (24 * 60 * 60 * 1000)
  );

// ============================================================
// CURRENT YIELD %
// ============================================================

const principalNumber =
  Number(
    formatUnits(
      targetPosition.principal,
      18
    )
  );

const rewardNumber =
  Number(
    formatUnits(
      currentReward,
      18
    )
  );

const yieldPercent =
  principalNumber > 0
    ? (
        rewardNumber /
        principalNumber
      ) * 100
    : 0;

// ============================================================
// CURRENT GROWTH
// ============================================================

console.log("");

console.log(
  "------------------------------------------------------------"
);

console.log(
  "CURRENT PRESALE GROWTH"
);

console.log(
  "------------------------------------------------------------"
);

console.log(
  "Principal        :",
  formatARDE(
    targetPosition.principal
  ),
  "ARDE"
);

console.log(
  "Live Balance     :",
  formatARDE(liveBalance),
  "ARDE"
);

console.log(
  "Current Reward   :",
  formatARDE(currentReward),
  "ARDE"
);

console.log(
  "Claimed Reward   :",
  formatARDE(claimedReward),
  "ARDE"
);

console.log(
  "Total Growth     :",
  formatARDE(
    currentReward + claimedReward
  ),
  "ARDE"
);

console.log(
  "Age              :",
  ageDays,
  "days"
);

console.log(
  "Current Yield     :",
  yieldPercent.toFixed(8),
  "%"
);

// ============================================================
// CSV
// ============================================================

const rows = [];

rows.push([
  "User_ID",
  "Position_Index",
  "Stake_Date",
  "Principal_ARDE",
  "Live_Balance_ARDE",
  "Current_Reward_ARDE",
  "Claimed_Reward_ARDE",
  "Total_Growth_ARDE",
  "Age_Days",
  "Yield_Percent",
  "Last_Update_Day",
  "Loyalty_Index",
  "Bucket_Day",
  "Active",
  "Current_Block"
]);

rows.push([
  USER_ID.toString(),

  targetPosition.index.toString(),

  formatDateTime(
    targetPosition.stakeTimestamp
  ),

  formatARDE(
    targetPosition.principal
  ),

  formatARDE(
    liveBalance
  ),

  formatARDE(
    currentReward
  ),

  formatARDE(
    claimedReward
  ),

  formatARDE(
    currentReward +
    claimedReward
  ),

  ageDays,

  yieldPercent.toFixed(8),

  targetPosition.lastUpdateDay.toString(),

  targetPosition.lastLoyaltyIndex.toString(),

  targetPosition.bucketDay.toString(),

  targetPosition.isActive,

  currentBlock.toString()
]);

const csv =
  rows
    .map(row =>
      row
        .map(csvEscape)
        .join(",")
    )
    .join("\n");

fs.writeFileSync(
  OUTPUT_FILE,
  csv,
  "utf8"
);

// ============================================================
// FINAL RESULT
// ============================================================

console.log("");

console.log(
  "============================================================"
);

console.log(
  "                  PRESALE QA COMPLETE"
);

console.log(
  "============================================================"
);

console.log(
  "User ID           :",
  USER_ID.toString()
);

console.log(
  "Position          :",
  targetPosition.index.toString()
);

console.log(
  "Presale Stake     :",
  formatARDE(
    targetPosition.principal
  ),
  "ARDE"
);

console.log(
  "Stake Date        :",
  formatDate(
    targetPosition.stakeTimestamp
  )
);

console.log(
  "Live Balance      :",
  formatARDE(liveBalance),
  "ARDE"
);

console.log(
  "Current Reward    :",
  formatARDE(currentReward),
  "ARDE"
);

console.log(
  "Claimed Reward    :",
  formatARDE(claimedReward),
  "ARDE"
);

console.log(
  "Total Growth      :",
  formatARDE(
    currentReward +
    claimedReward
  ),
  "ARDE"
);

console.log(
  "Age               :",
  ageDays,
  "days"
);

console.log(
  "Yield             :",
  yieldPercent.toFixed(8),
  "%"
);

console.log(
  "CSV saved         :",
  OUTPUT_FILE
);

console.log(
  "============================================================"
);