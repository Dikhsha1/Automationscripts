import {
  createPublicClient,
  http,
  formatUnits,
  defineChain,
} from "viem";

// --------------------------------------------------
// Sotto Dev / UAT RPC
// --------------------------------------------------
const sotto = defineChain({
  id: 1337,
  name: "Sotto",
  nativeCurrency: {
    name: "Sotto",
    symbol: "SOTTO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://devrpc.sotto.li"],
    },
  },
});

// --------------------------------------------------
// PoolGuard address
// IMPORTANT: replace with your actual PoolGuard address
// --------------------------------------------------
const POOLGUARD = "0x08D0582D8633455Bbb7c6733df895cC7D3B655e7";

// --------------------------------------------------
// ABI - only functions needed for this test
// --------------------------------------------------
const poolGuardAbi = [
  {
    inputs: [],
    name: "floorUSDT",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "mcapTargetBps",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// --------------------------------------------------
// Expected values for Proposal #4
// --------------------------------------------------
const EXPECTED_FLOOR_USDT = 80_000;
const EXPECTED_MCAP_BPS = 400;

// --------------------------------------------------
// Client
// --------------------------------------------------
const client = createPublicClient({
  chain: sotto,
  transport: http(),
});

// --------------------------------------------------
// Main
// --------------------------------------------------
async function main() {
  console.log("========================================");
  console.log("PoolGuard Price Floor QA");
  console.log("========================================");

  console.log("PoolGuard:", POOLGUARD);
  console.log("");

  // Read floorUSDT()
  const floorRaw = await client.readContract({
    address: POOLGUARD,
    abi: poolGuardAbi,
    functionName: "floorUSDT",
  });

  // Read mcapTargetBps()
  const mcapBps = await client.readContract({
    address: POOLGUARD,
    abi: poolGuardAbi,
    functionName: "mcapTargetBps",
  });

  const floorUSDT = Number(formatUnits(floorRaw, 6));

  console.log("On-chain values");
  console.log("----------------------------------------");
  console.log("floorUSDT raw      :", floorRaw.toString());
  console.log("floorUSDT          :", floorUSDT, "USDT");
  console.log("mcapTargetBps      :", mcapBps.toString(), "bps");
  console.log("");

  console.log("Expected Proposal #4");
  console.log("----------------------------------------");
  console.log("Expected floor     :", EXPECTED_FLOOR_USDT, "USDT");
  console.log("Expected mcap      :", EXPECTED_MCAP_BPS, "bps");
  console.log("");

  // ------------------------------------------------
  // Validation
  // ------------------------------------------------
  const floorPassed = floorUSDT === EXPECTED_FLOOR_USDT;
  const mcapPassed = Number(mcapBps) === EXPECTED_MCAP_BPS;

  console.log("Validation");
  console.log("----------------------------------------");

  console.log(
    `Price Floor: ${
      floorPassed
        ? "PASS ✅"
        : "FAIL ❌"
    }`
  );

  console.log(
    `Market Cap BPS: ${
      mcapPassed
        ? "PASS ✅"
        : "FAIL ❌"
    }`
  );

  console.log("");

  if (floorPassed && mcapPassed) {
    console.log("========================================");
    console.log("Proposal #4 values are applied ✅");
    console.log("========================================");
  } else {
    console.log("========================================");
    console.log("Proposal #4 values are NOT applied ❌");
    console.log("========================================");
  }
}

main().catch((error) => {
  console.error("");
  console.error("❌ Script failed");
  console.error(error);
  process.exit(1);
});