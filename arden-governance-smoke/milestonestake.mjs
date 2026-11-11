import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  getAddress
} from "viem";

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);
const STAKING_ENGINE = getAddress(process.env.STAKING_ENGINE);
const NFT_ID = BigInt(process.env.NFT_ID);

// --------------------------------------------------
// Chain
// --------------------------------------------------

const chain = {
  id: CHAIN_ID,
  name: "Sotto Chain",
  nativeCurrency: {
    name: "Native",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [RPC_URL]
    }
  }
};

const client = createPublicClient({
  chain,
  transport: http(RPC_URL)
});

// --------------------------------------------------
// ABI
// --------------------------------------------------

const abi = [
  {
    inputs: [{ name: "nftId", type: "uint256" }],
    name: "stakedByNft",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [{ name: "nftId", type: "uint256" }],
    name: "claimedByNft",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [{ name: "nftId", type: "uint256" }],
    name: "previewTotalAccrued",
    outputs: [
      {
        name: "total",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [{ name: "nftId", type: "uint256" }],
    name: "positionsOf",
    outputs: [
      {
        components: [
          {
            name: "principal",
            type: "uint256"
          },
          {
            name: "accruedBalance",
            type: "uint256"
          },
          {
            name: "stakeTimestamp",
            type: "uint64"
          },
          {
            name: "lastUpdateDay",
            type: "uint16"
          },
          {
            name: "lastLoyaltyIndex",
            type: "uint8"
          },
          {
            name: "active",
            type: "bool"
          },
          {
            name: "claimed",
            type: "uint256"
          }
        ],
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [],
    name: "DAY",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [],
    name: "TERM_DAYS",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
];

// --------------------------------------------------
// Requirement milestones
// --------------------------------------------------

const milestones = [
  { day: 90, bonus: 1.10 },
  { day: 180, bonus: 1.25 },
  { day: 270, bonus: 1.40 },
  { day: 360, bonus: 1.60 },
  { day: 450, bonus: 1.75 },
  { day: 540, bonus: 1.90 },
  { day: 630, bonus: 2.05 },
  { day: 720, bonus: 2.20 },
  { day: 810, bonus: 2.40 },
  { day: 900, bonus: 2.55 },
  { day: 990, bonus: 2.70 },
  { day: 1080, bonus: 5.40 }
];

// --------------------------------------------------
// Main
// --------------------------------------------------

async function main() {

  console.log("\n==============================================");
  console.log("       ARDEN MILESTONE QA CHECK");
  console.log("==============================================");

  console.log("RPC           :", RPC_URL);
  console.log("Chain ID      :", CHAIN_ID);
  console.log("Staking Engine:", STAKING_ENGINE);
  console.log("NFT ID        :", NFT_ID.toString());

  // ------------------------------------------------
  // Read contract parameters
  // ------------------------------------------------

  const [daySeconds, termDays] = await Promise.all([

    client.readContract({
      address: STAKING_ENGINE,
      abi,
      functionName: "DAY"
    }),

    client.readContract({
      address: STAKING_ENGINE,
      abi,
      functionName: "TERM_DAYS"
    })

  ]);

  console.log("\n==============================================");
  console.log("       CONTRACT TIME PARAMETERS");
  console.log("==============================================");

  console.log("DAY           :", daySeconds.toString(), "seconds");
  console.log("TERM_DAYS     :", termDays.toString());

  // ------------------------------------------------
  // Read NFT information
  // ------------------------------------------------

  const [
    staked,
    claimed,
    accrued,
    positions
  ] = await Promise.all([

    client.readContract({
      address: STAKING_ENGINE,
      abi,
      functionName: "stakedByNft",
      args: [NFT_ID]
    }),

    client.readContract({
      address: STAKING_ENGINE,
      abi,
      functionName: "claimedByNft",
      args: [NFT_ID]
    }),

    client.readContract({
      address: STAKING_ENGINE,
      abi,
      functionName: "previewTotalAccrued",
      args: [NFT_ID]
    }),

    client.readContract({
      address: STAKING_ENGINE,
      abi,
      functionName: "positionsOf",
      args: [NFT_ID]
    })

  ]);

  if (positions.length === 0) {
    console.log("\n❌ No staking position found for this NFT.");
    return;
  }

  // ------------------------------------------------
  // Position
  // ------------------------------------------------

  const position = positions[1];

  const principal = position.principal;

  const stakeTimestamp = Number(position.stakeTimestamp);

  const currentTimestamp = Math.floor(Date.now() / 1000);

  const elapsedSeconds =
    currentTimestamp - stakeTimestamp;

  const currentDay = Math.floor(
    elapsedSeconds / Number(daySeconds)
  );

  // ------------------------------------------------
  // Output current status
  // ------------------------------------------------

  console.log("\n==============================================");
  console.log("          CURRENT USER STATUS");
  console.log("==============================================");

  console.log(
    "Principal       :",
    formatUnits(principal, 18),
    "ARDE"
  );

  console.log(
    "Current Accrued :",
    formatUnits(accrued, 18),
    "ARDE"
  );

  console.log(
    "Claimed         :",
    formatUnits(claimed, 18),
    "ARDE"
  );

  console.log(
    "Stake Date      :",
    new Date(stakeTimestamp * 1000).toISOString()
  );

  console.log(
    "Current Day     :",
    currentDay
  );

  console.log(
    "Active          :",
    position.active
  );

  // ------------------------------------------------
  // Determine achieved milestone
  // ------------------------------------------------

  const achieved = milestones.filter(
    m => currentDay >= m.day
  );

  const next = milestones.find(
    m => currentDay < m.day
  );

  console.log("\n==============================================");
  console.log("          MILESTONE STATUS");
  console.log("==============================================");

  for (const m of milestones) {

    let status;

    if (currentDay >= m.day) {
      status = "✅ ACHIEVED";
    } else {
      status = "⏳ NOT REACHED";
    }

    console.log(
      `Day ${String(m.day).padEnd(4)} | ` +
      `${String(m.bonus).padEnd(5)}% | ${status}`
    );
  }

  // ------------------------------------------------
  // Latest milestone
  // ------------------------------------------------

  console.log("\n==============================================");
  console.log("             QA RESULT");
  console.log("==============================================");

  if (achieved.length > 0) {

    const latest = achieved[achieved.length - 1];

    console.log(
      `✅ Latest Milestone : Day ${latest.day}`
    );

    console.log(
      `   Loyalty Bonus    : ${latest.bonus}%`
    );

  } else {

    console.log("⏳ No loyalty milestone achieved yet.");

  }

  if (next) {

    const remainingDays =
      next.day - currentDay;

    console.log(
      `⏳ Next Milestone   : Day ${next.day}`
    );

    console.log(
      `   Loyalty Bonus    : ${next.bonus}%`
    );

    console.log(
      `   Remaining Days   : ${remainingDays}`
    );

  } else {

    console.log("🏆 All milestones achieved.");

  }

  console.log("\n==============================================\n");
}

main().catch(error => {

  console.error("\n❌ ERROR:");
  console.error(error);

  process.exit(1);
});