import {
  createPublicClient,
  http
} from "viem";

import { config } from "./config.js";

// ============================================================
// POOLGUARD ABI
// ============================================================

const poolGuardAbi = [

  // ----------------------------------------------------------
  // verifySwap
  // ----------------------------------------------------------

  {
    type: "function",
    name: "verifySwap",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address"
      },
      {
        name: "isSell",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [
      {
        name: "tier",
        type: "uint8",
        internalType: "uint8"
      }
    ],
    stateMutability: "view"
  },

  // ----------------------------------------------------------
  // isSellPaused
  // ----------------------------------------------------------

  {
    type: "function",
    name: "isSellPaused",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },

  // ----------------------------------------------------------
  // currentPauseTier
  // ----------------------------------------------------------

  {
    type: "function",
    name: "currentPauseTier",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },

  // ----------------------------------------------------------
  // activePauseEndTime
  // ----------------------------------------------------------

  {
    type: "function",
    name: "activePauseEndTime",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },

  // ----------------------------------------------------------
  // Tier 1 duration
  // ----------------------------------------------------------

  {
    type: "function",
    name: "tier1DurationSecs",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },

  // ----------------------------------------------------------
  // Tier 2 duration
  // ----------------------------------------------------------

  {
    type: "function",
    name: "tier2DurationSecs",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },

  // ----------------------------------------------------------
  // Tier 3 duration
  // ----------------------------------------------------------

  {
    type: "function",
    name: "tier3DurationSecs",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },

  // ----------------------------------------------------------
  // Tier thresholds
  // ----------------------------------------------------------

  {
    type: "function",
    name: "tier1ThresholdBps",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },

  {
    type: "function",
    name: "tier2ThresholdBps",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },

  {
    type: "function",
    name: "tier3ThresholdBps",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },

  // ----------------------------------------------------------
  // Other PoolGuard values
  // ----------------------------------------------------------

  {
    type: "function",
    name: "getTarget",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },

  {
    type: "function",
    name: "baselinePrice",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },

  {
    type: "function",
    name: "ecoBps",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },

  {
    type: "function",
    name: "exoBps",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  }
];

// ============================================================
// PUBLIC CLIENT
// ============================================================

const publicClient = createPublicClient({
  transport: http(config.RPC)
});

// ============================================================
// HELPER
// ============================================================

function formatDuration(seconds) {

  const totalSeconds = Number(seconds);

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const secs = totalSeconds % 60;

  return `${hours}h ${minutes}m ${secs}s`;
}

// ============================================================
// MAIN
// ============================================================

async function main() {

  console.log("\n==============================================");
  console.log("       ARDEN DEV POOLGUARD SELL CHECK");
  console.log("==============================================");

  // ----------------------------------------------------------
  // 1. NETWORK
  // ----------------------------------------------------------

  const chainId = await publicClient.getChainId();

  console.log("\nNETWORK");
  console.log("----------------------------------------------");

  console.log("RPC       :", config.RPC);
  console.log("Chain ID  :", chainId);

  // ----------------------------------------------------------
  // 2. CONTRACT / WALLET
  // ----------------------------------------------------------

  console.log("\nCONTRACT INFORMATION");
  console.log("----------------------------------------------");

  console.log(
    "PoolGuard :",
    config.POOL_GUARD
  );

  console.log(
    "Wallet    :",
    config.WALLET
  );

  // ----------------------------------------------------------
  // 3. CHECK CONTRACT DEPLOYMENT
  // ----------------------------------------------------------

  const bytecode = await publicClient.getBytecode({
    address: config.POOL_GUARD
  });

  console.log(
    "Deployed  :",
    bytecode && bytecode !== "0x"
      ? "YES ✅"
      : "NO ❌"
  );

  if (!bytecode || bytecode === "0x") {

    throw new Error(
      "PoolGuard contract is not deployed at the configured address."
    );

  }

  // ----------------------------------------------------------
  // 4. GLOBAL SELL PAUSE
  // ----------------------------------------------------------

  const sellPaused = await publicClient.readContract({
    address: config.POOL_GUARD,
    abi: poolGuardAbi,
    functionName: "isSellPaused"
  });

  // ----------------------------------------------------------
  // 5. PAUSE INFORMATION
  // ----------------------------------------------------------

  const currentPauseTier =
    await publicClient.readContract({
      address: config.POOL_GUARD,
      abi: poolGuardAbi,
      functionName: "currentPauseTier"
    });

  const activePauseEndTime =
    await publicClient.readContract({
      address: config.POOL_GUARD,
      abi: poolGuardAbi,
      functionName: "activePauseEndTime"
    });

  // ----------------------------------------------------------
  // 6. TIER DURATIONS
  // ----------------------------------------------------------

  const tier1Duration =
    await publicClient.readContract({
      address: config.POOL_GUARD,
      abi: poolGuardAbi,
      functionName: "tier1DurationSecs"
    });

  const tier2Duration =
    await publicClient.readContract({
      address: config.POOL_GUARD,
      abi: poolGuardAbi,
      functionName: "tier2DurationSecs"
    });

  const tier3Duration =
    await publicClient.readContract({
      address: config.POOL_GUARD,
      abi: poolGuardAbi,
      functionName: "tier3DurationSecs"
    });

  // ----------------------------------------------------------
  // 7. TIER THRESHOLDS
  // ----------------------------------------------------------

  const tier1Threshold =
    await publicClient.readContract({
      address: config.POOL_GUARD,
      abi: poolGuardAbi,
      functionName: "tier1ThresholdBps"
    });

  const tier2Threshold =
    await publicClient.readContract({
      address: config.POOL_GUARD,
      abi: poolGuardAbi,
      functionName: "tier2ThresholdBps"
    });

  const tier3Threshold =
    await publicClient.readContract({
      address: config.POOL_GUARD,
      abi: poolGuardAbi,
      functionName: "tier3ThresholdBps"
    });

  // ----------------------------------------------------------
  // 8. CURRENT BLOCK TIME
  // ----------------------------------------------------------

  const block = await publicClient.getBlock();

  const currentTimestamp = Number(block.timestamp);

  const endTimestamp = Number(activePauseEndTime);

  const remainingSeconds =
    Math.max(
      0,
      endTimestamp - currentTimestamp
    );

  // ----------------------------------------------------------
  // 9. OUTPUT
  // ----------------------------------------------------------

  console.log("\nPOOLGUARD STATUS");
  console.log("----------------------------------------------");

  console.log(
    "Global Sell Pause :",
    sellPaused
      ? "YES ❌"
      : "NO ✅"
  );

  console.log(
    "Current Pause Tier:",
    currentPauseTier.toString()
  );

  console.log(
    "Pause End Time    :",
    new Date(
      endTimestamp * 1000
    ).toLocaleString()
  );

  console.log(
    "Remaining Pause   :",
    formatDuration(remainingSeconds)
  );

  console.log("\nTIER CONFIGURATION");
  console.log("----------------------------------------------");

  console.log(
    "Tier 1 Duration   :",
    formatDuration(tier1Duration)
  );

  console.log(
    "Tier 2 Duration   :",
    formatDuration(tier2Duration)
  );

  console.log(
    "Tier 3 Duration   :",
    formatDuration(tier3Duration)
  );

  console.log("\nTIER THRESHOLDS");
  console.log("----------------------------------------------");

  console.log(
    "Tier 1 Threshold  :",
    tier1Threshold.toString(),
    "bps"
  );

  console.log(
    "Tier 2 Threshold  :",
    tier2Threshold.toString(),
    "bps"
  );

  console.log(
    "Tier 3 Threshold  :",
    tier3Threshold.toString(),
    "bps"
  );

  // ----------------------------------------------------------
  // 10. USER SELL TIER
  // ----------------------------------------------------------

  console.log("\nUSER SELL CHECK");
  console.log("----------------------------------------------");

  let sellTier = null;

  if (sellPaused) {

    console.log(
      "User Sell Tier    : Not returned"
    );

    console.log(
      "Reason            : PG: SELL_PAUSED"
    );

  } else {

    sellTier = await publicClient.readContract({
      address: config.POOL_GUARD,
      abi: poolGuardAbi,
      functionName: "verifySwap",
      args: [
        config.WALLET,
        true
      ]
    });

    console.log(
      "User Sell Tier    :",
      sellTier.toString()
    );
  }

  // ----------------------------------------------------------
  // 11. USER BUY TIER
  // ----------------------------------------------------------

  const buyTier = await publicClient.readContract({
    address: config.POOL_GUARD,
    abi: poolGuardAbi,
    functionName: "verifySwap",
    args: [
      config.WALLET,
      false
    ]
  });

  console.log(
    "User Buy Tier     :",
    buyTier.toString()
  );

  // ----------------------------------------------------------
  // 12. QA RESULT
  // ----------------------------------------------------------

  console.log("\nQA RESULT");
  console.log("----------------------------------------------");

  if (sellPaused) {

    console.log(
      "❌ SELLING IS CURRENTLY PAUSED"
    );

    console.log(
      "Active Pause Tier:",
      currentPauseTier.toString()
    );

    if (currentPauseTier === 1n) {

      console.log(
        "Configured Duration:",
        formatDuration(tier1Duration)
      );

    } else if (currentPauseTier === 2n) {

      console.log(
        "Configured Duration:",
        formatDuration(tier2Duration)
      );

    } else if (currentPauseTier === 3n) {

      console.log(
        "Configured Duration:",
        formatDuration(tier3Duration)
      );

    } else {

      console.log(
        "⚠️ Unknown pause tier returned:",
        currentPauseTier.toString()
      );

    }

  } else {

    console.log(
      "✅ SELLING IS NOT CURRENTLY PAUSED"
    );

  }

  // ----------------------------------------------------------
  // 13. IMPORTANT NOTE
  // ----------------------------------------------------------

  console.log("\nNOTE");
  console.log("----------------------------------------------");

  console.log(
    "verifySwap(wallet, true) checks the user's"
  );

  console.log(
    "SELL permission."
  );

  console.log(
    "When SELL is paused, verifySwap(..., true)"
  );

  console.log(
    "reverts with PG: SELL_PAUSED."
  );

  console.log(
    "currentPauseTier() identifies the active"
  );

  console.log(
    "global sell-pause tier."
  );

  console.log("\n==============================================");
  console.log("       READ-ONLY CHECK COMPLETED");
  console.log("==============================================\n");
}

// ============================================================
// ERROR HANDLING
// ============================================================

main().catch((error) => {

  console.error("\n❌ PoolGuard check failed:");
  console.error(error);

});