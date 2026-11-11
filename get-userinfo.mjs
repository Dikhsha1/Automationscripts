// ============================================================
// STAKING ENGINE USER QA CHECK
// ============================================================

import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  getAddress,
} from "viem";

// ============================================================
// CONFIG
// ============================================================

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const STAKING_ENGINE = getAddress(process.env.STAKING_ENGINE);
const NFT_ID = BigInt(process.env.NFT_ID);

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

// ============================================================
// CLIENT
// ============================================================

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

// ============================================================
// STAKING ENGINE ABI
// ============================================================

const stakingEngineAbi = [
  {
    inputs: [
      { internalType: "uint256", name: "nftId", type: "uint256" },
    ],
    name: "positionCount",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      { internalType: "uint256", name: "nftId", type: "uint256" },
    ],
    name: "positionsOf",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "principal", type: "uint256" },
          { internalType: "uint256", name: "lastPrincipal", type: "uint256" },
          { internalType: "uint256", name: "accruedBalance", type: "uint256" },
          { internalType: "uint64", name: "stakeTimestamp", type: "uint64" },
          { internalType: "uint16", name: "lastUpdateDay", type: "uint16" },
          { internalType: "uint8", name: "lastLoyaltyIndex", type: "uint8" },
          { internalType: "bool", name: "active", type: "bool" },
          { internalType: "uint256", name: "claimed", type: "uint256" },
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
      { internalType: "uint256", name: "nftId", type: "uint256" },
      { internalType: "uint256", name: "posIndex", type: "uint256" },
    ],
    name: "previewAccrued",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      { internalType: "uint256", name: "nftId", type: "uint256" },
      { internalType: "uint256", name: "posIndex", type: "uint256" },
    ],
    name: "previewBalance",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      { internalType: "uint256", name: "nftId", type: "uint256" },
    ],
    name: "previewTotalAccrued",
    outputs: [
      { internalType: "uint256", name: "total", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      { internalType: "uint256", name: "nftId", type: "uint256" },
    ],
    name: "stakedByNft",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      { internalType: "uint256", name: "nftId", type: "uint256" },
    ],
    name: "claimedByNft",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      { internalType: "uint256", name: "nftId", type: "uint256" },
      { internalType: "uint256", name: "posIndex", type: "uint256" },
    ],
    name: "isLocked",
    outputs: [
      { internalType: "bool", name: "", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// ============================================================
// HELPERS
// ============================================================

function arde(value) {
  return formatUnits(value, 18);
}

function dateFromTimestamp(timestamp) {
  if (!timestamp || timestamp === 0n) return "-";

  return new Date(Number(timestamp) * 1000).toLocaleString("en-IN");
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("\n============================================================");
  console.log("              USER QA BLOCKCHAIN REPORT");
  console.log("============================================================");

  console.log(`NFT ID          : ${NFT_ID}`);
  console.log(`Staking Engine  : ${STAKING_ENGINE}`);

  // ----------------------------------------------------------
  // BASIC STAKING INFORMATION
  // ----------------------------------------------------------

  const [
    positionCount,
    stakedByNft,
    claimedByNft,
    previewTotalAccrued,
    positions,
  ] = await Promise.all([
    publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingEngineAbi,
      functionName: "positionCount",
      args: [NFT_ID],
    }),

    publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingEngineAbi,
      functionName: "stakedByNft",
      args: [NFT_ID],
    }),

    publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingEngineAbi,
      functionName: "claimedByNft",
      args: [NFT_ID],
    }),

    publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingEngineAbi,
      functionName: "previewTotalAccrued",
      args: [NFT_ID],
    }),

    publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingEngineAbi,
      functionName: "positionsOf",
      args: [NFT_ID],
    }),
  ]);

  console.log("\n============================================================");
  console.log("                    STAKING SUMMARY");
  console.log("============================================================");

  console.log(`Position Count  : ${positionCount}`);
  console.log(`Total Staked    : ${arde(stakedByNft)} ARDE`);
  console.log(`Total Claimed   : ${arde(claimedByNft)} ARDE`);
  console.log(`Total Accrued   : ${arde(previewTotalAccrued)} ARDE`);

  // ----------------------------------------------------------
  // POSITIONS
  // ----------------------------------------------------------

  console.log("\n============================================================");
  console.log("                    STAKING POSITIONS");
  console.log("============================================================");

  let calculatedTotalAccrued = 0n;
  let calculatedTotalPrincipal = 0n;

  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];

    const previewAccrued = await publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingEngineAbi,
      functionName: "previewAccrued",
      args: [NFT_ID, BigInt(i)],
    });

    const previewBalance = await publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingEngineAbi,
      functionName: "previewBalance",
      args: [NFT_ID, BigInt(i)],
    });

    const locked = await publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingEngineAbi,
      functionName: "isLocked",
      args: [NFT_ID, BigInt(i)],
    });

    calculatedTotalAccrued += previewAccrued;
    calculatedTotalPrincipal += position.principal;

    console.log("\n------------------------------------------------------------");
    console.log(`POSITION #${i}`);
    console.log("------------------------------------------------------------");

    console.log(`Principal           : ${arde(position.principal)} ARDE`);
    console.log(`Last Principal      : ${arde(position.lastPrincipal)} ARDE`);
    console.log(`Accrued Balance     : ${arde(position.accruedBalance)} ARDE`);
    console.log(`Preview Accrued     : ${arde(previewAccrued)} ARDE`);
    console.log(`Preview Balance     : ${arde(previewBalance)} ARDE`);
    console.log(`Claimed             : ${arde(position.claimed)} ARDE`);

    console.log(
      `Stake Timestamp     : ${position.stakeTimestamp}`
    );

    console.log(
      `Stake Date          : ${dateFromTimestamp(
        position.stakeTimestamp
      )}`
    );

    console.log(`Last Update Day     : ${position.lastUpdateDay}`);
    console.log(`Loyalty Index       : ${position.lastLoyaltyIndex}`);
    console.log(`Active              : ${position.active}`);
    console.log(`Locked              : ${locked}`);

    // --------------------------------------------------------
    // POSITION QA CHECKS
    // --------------------------------------------------------

    if (!position.active) {
      console.log("STATUS              : CLOSED / INACTIVE");
    } else {
      console.log("STATUS              : ACTIVE");
    }

    if (locked) {
      console.log("LOCK STATUS         : LOCKED");
    } else {
      console.log("LOCK STATUS         : UNLOCKED");
    }
  }

  // ----------------------------------------------------------
  // QA VALIDATION
  // ----------------------------------------------------------

  console.log("\n============================================================");
  console.log("                    QA VALIDATION");
  console.log("============================================================");

  console.log(
    `Position count check : ${
      BigInt(positions.length) === positionCount
        ? "PASS"
        : "FAIL"
    }`
  );

  console.log(
    `Principal total check: ${
      calculatedTotalPrincipal === stakedByNft
        ? "PASS"
        : "CHECK"
    }`
  );

  console.log(
    `Reward total check   : ${
      calculatedTotalAccrued === previewTotalAccrued
        ? "PASS"
        : "CHECK"
    }`
  );

  console.log("\nCalculated principal:");
  console.log(`${arde(calculatedTotalPrincipal)} ARDE`);

  console.log("\nCalculated preview accrued:");
  console.log(`${arde(calculatedTotalAccrued)} ARDE`);

  console.log("\nContract preview total accrued:");
  console.log(`${arde(previewTotalAccrued)} ARDE`);

  console.log("\n============================================================");
  console.log("                  END OF QA REPORT");
  console.log("============================================================\n");
}

main().catch((error) => {
  console.error("\n❌ SCRIPT FAILED\n");
  console.error(error);
  process.exit(1);
});