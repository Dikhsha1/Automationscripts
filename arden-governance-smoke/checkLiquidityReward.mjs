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

const RPC_URL = process.env.RPC_URL || "https://chain.sotto.li";
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const LIQUIDITY_GUARD = process.env.LIQUIDITY_GUARD;
const NFT_ID = process.env.NFT_ID;

// ============================================================
// CLIENT
// ============================================================

const client = createPublicClient({
  transport: http(RPC_URL),
});

// ============================================================
// ABI
// ============================================================

const liquidityGuardAbi = [
  {
    inputs: [{ internalType: "uint256", name: "nftId", type: "uint256" }],
    name: "getPosition",
    outputs: [
      { internalType: "uint256", name: "valueUSDT", type: "uint256" },
      { internalType: "uint256", name: "capUSDT", type: "uint256" },
      { internalType: "uint256", name: "claimedUSDT", type: "uint256" },
      { internalType: "uint256", name: "claimedDAGR", type: "uint256" },
      { internalType: "uint256", name: "rewardDebt", type: "uint256" },
      { internalType: "bool", name: "isAbsorbed", type: "bool" },
      {
        internalType: "uint256",
        name: "lastInteractionBlock",
        type: "uint256",
      },
      { internalType: "uint256", name: "pendingDAGR", type: "uint256" },
      { internalType: "uint256", name: "pendingUSDT", type: "uint256" },
      { internalType: "uint256", name: "remainingUSDT", type: "uint256" },
      { internalType: "uint64", name: "openedAt", type: "uint64" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "nftId", type: "uint256" }],
    name: "pendingRewards",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "accDAGRPerUSDT",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastCumulativeFees",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalActiveLPValueUSDT",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// ============================================================
// VALIDATION
// ============================================================

if (!LIQUIDITY_GUARD) {
  throw new Error("Missing LIQUIDITY_GUARD in .env");
}

if (!NFT_ID) {
  throw new Error("Missing NFT_ID in .env");
}

const liquidityGuard = getAddress(LIQUIDITY_GUARD);

// ============================================================
// READ DATA
// ============================================================

console.log("\n==========================================");
console.log(" ARDEN LIQUIDITY REWARD CHECK");
console.log("==========================================");

console.log("RPC:", RPC_URL);
console.log("Chain ID:", CHAIN_ID);
console.log("LiquidityGuard:", liquidityGuard);
console.log("NFT ID:", NFT_ID);

const position = await client.readContract({
  address: liquidityGuard,
  abi: liquidityGuardAbi,
  functionName: "getPosition",
  args: [BigInt(NFT_ID)],
});

const pending = await client.readContract({
  address: liquidityGuard,
  abi: liquidityGuardAbi,
  functionName: "pendingRewards",
  args: [BigInt(NFT_ID)],
});

const accDAGRPerUSDT = await client.readContract({
  address: liquidityGuard,
  abi: liquidityGuardAbi,
  functionName: "accDAGRPerUSDT",
});

const lastCumulativeFees = await client.readContract({
  address: liquidityGuard,
  abi: liquidityGuardAbi,
  functionName: "lastCumulativeFees",
});

const totalActiveLP = await client.readContract({
  address: liquidityGuard,
  abi: liquidityGuardAbi,
  functionName: "totalActiveLPValueUSDT",
});

// ============================================================
// OUTPUT
// ============================================================

const [
  valueUSDT,
  capUSDT,
  claimedUSDT,
  claimedDAGR,
  rewardDebt,
  isAbsorbed,
  lastInteractionBlock,
  pendingDAGR,
  pendingUSDT,
  remainingUSDT,
  openedAt,
] = position;

console.log("\n--------------- POSITION ----------------");

console.log(
  "LP Value USDT:",
  formatUnits(valueUSDT, 6)
);

console.log(
  "LP Cap USDT:",
  formatUnits(capUSDT, 6)
);

console.log(
  "Claimed USDT:",
  formatUnits(claimedUSDT, 6)
);

console.log(
  "Claimed DAGR:",
  formatUnits(claimedDAGR, 18)
);

console.log(
  "Reward Debt:",
  rewardDebt.toString()
);

console.log(
  "Absorbed:",
  isAbsorbed
);

console.log(
  "Last Interaction Block:",
  lastInteractionBlock.toString()
);

console.log(
  "Pending DAGR:",
  formatUnits(pendingDAGR, 18)
);

console.log(
  "Pending USDT:",
  formatUnits(pendingUSDT, 6)
);

console.log(
  "Remaining USDT:",
  formatUnits(remainingUSDT, 6)
);

console.log(
  "Opened At:",
  openedAt.toString()
);

console.log("\n--------------- REWARDS ----------------");

console.log(
  "pendingRewards():",
  formatUnits(pending, 18)
);

console.log(
  "accDAGRPerUSDT:",
  accDAGRPerUSDT.toString()
);

console.log(
  "lastCumulativeFees:",
  lastCumulativeFees.toString()
);

console.log(
  "Total Active LP USDT:",
  formatUnits(totalActiveLP, 6)
);

console.log("\n==========================================");
console.log(" RESULT");
console.log("==========================================");

if (isAbsorbed) {
  console.log("⚠️ Position is ABSORBED");
}

if (valueUSDT === 0n) {
  console.log("⚠️ No active LP value found");
}

if (pending === 0n) {
  console.log("ℹ️ No pending LP reward currently");
} else {
  console.log(
    "✅ Pending LP reward:",
    formatUnits(pending, 18),
    "DAGR"
  );
}

console.log("==========================================\n");