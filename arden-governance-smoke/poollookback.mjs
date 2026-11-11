
import "dotenv/config";
import { createPublicClient, http } from "viem";

// ============================================================
// CONFIG
// ============================================================

const RPC_URL = process.env.RPC_URL || "https://devrpc.sotto.li";
const POOL_GUARD = process.env.POOL_GUARD;

if (!POOL_GUARD) {
  throw new Error("Missing POOL_GUARD in .env");
}

// ============================================================
// ABI
// ============================================================

const poolGuardAbi = [
  {
    type: "function",
    name: "baselineWindowSecs",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
];

// ============================================================
// CLIENT
// ============================================================

const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

// ============================================================
// READ BASELINE WINDOW
// ============================================================

async function main() {
  console.log("==========================================");
  console.log("PoolGuard Baseline Window Check");
  console.log("==========================================");

  console.log(`RPC: ${RPC_URL}`);
  console.log(`PoolGuard: ${POOL_GUARD}`);
  console.log("");

  const windowSecs = await publicClient.readContract({
    address: POOL_GUARD,
    abi: poolGuardAbi,
    functionName: "baselineWindowSecs",
  });

  const seconds = Number(windowSecs);
  const hours = seconds / 3600;

  console.log(`baselineWindowSecs(): ${windowSecs}`);
  console.log(`Window: ${hours} hours`);
  console.log("");

  // Expected new value = 20 hours
  const EXPECTED_SECONDS = 20 * 60 * 60; // 72,000

  if (seconds === EXPECTED_SECONDS) {
    console.log("PASS");
    console.log("Baseline lookback window is correctly set to 20 hours.");
  } else {
    console.log("FAIL");
    console.log(`Expected: ${EXPECTED_SECONDS} seconds (20 hours)`);
    console.log(`Actual:   ${seconds} seconds (${hours} hours)`);
  }

  console.log("==========================================");
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

