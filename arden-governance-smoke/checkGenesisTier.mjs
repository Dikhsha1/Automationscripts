
import "dotenv/config";
import {
  createPublicClient,
  http,
  getAddress,
} from "viem";

// ============================================================
// CONFIG
// ============================================================

const RPC_URL = process.env.RPC_URL || "https://chain.sotto.li";
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const TIER_MANAGER = getAddress(
  process.env.TIER_MANAGER
);

const IDENTITY_NFT = getAddress(
  process.env.IDENTITY_NFT
);

// Genesis NFT
const NFT_ID = 13817077592778951294n;

// ============================================================
// VALIDATION
// ============================================================

if (!process.env.TIER_MANAGER) {
  throw new Error("Missing TIER_MANAGER in .env");
}

if (!process.env.IDENTITY_NFT) {
  throw new Error("Missing IDENTITY_NFT in .env");
}

// ============================================================
// CHAIN
// ============================================================

const chain = {
  id: CHAIN_ID,
  name: "Sotto",
  nativeCurrency: {
    name: "Sotto",
    symbol: "SOTTO",
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
// TIER MANAGER ABI
// ============================================================

const tierManagerAbi = [
  {
    type: "function",
    name: "computeTier",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
  },

  {
    type: "function",
    name: "tierWeight",
    stateMutability: "pure",
    inputs: [
      {
        name: "tier",
        type: "uint8",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
];

// ============================================================
// IDENTITY NFT ABI
// ============================================================

const identityNftAbi = [
  {
    type: "function",
    name: "tierOf",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
  },

  {
    type: "function",
    name: "tierNameOf",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
  },

  {
    type: "function",
    name: "maxTierAchieved",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
  },
];

// ============================================================
// TIER NAMES
// ============================================================

const TIER_NAMES = {
  0: "Seed",
  1: "Sprout",
  2: "Grower",
  3: "Harvester",
  4: "Guardian",
};

function tierName(tier) {
  return TIER_NAMES[Number(tier)] ?? `Unknown (${tier})`;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("\n============================================================");
  console.log("       ARDEN / SOTTO - GENESIS NFT TIER CHECK");
  console.log("============================================================");

  console.log("\nRPC URL       :", RPC_URL);
  console.log("Chain ID      :", CHAIN_ID);
  console.log("TierManager   :", TIER_MANAGER);
  console.log("IdentityNFT   :", IDENTITY_NFT);
  console.log("NFT ID        :", NFT_ID.toString());

  // ==========================================================
  // 1. CURRENT STORED TIER
  // ==========================================================

  console.log("\n------------------------------------------------------------");
  console.log("1. CURRENT STORED TIER");
  console.log("------------------------------------------------------------");

  let currentTier;

  try {
    currentTier = await publicClient.readContract({
      address: IDENTITY_NFT,
      abi: identityNftAbi,
      functionName: "tierOf",
      args: [NFT_ID],
    });

    console.log(
      "tierOf()              :",
      currentTier.toString(),
      `(${tierName(currentTier)})`
    );
  } catch (error) {
    console.log("❌ tierOf() REVERTED");
    console.log(
      "Reason:",
      error.shortMessage || error.message
    );
  }

  // ==========================================================
  // 2. TIER NAME
  // ==========================================================

  console.log("\n------------------------------------------------------------");
  console.log("2. TIER NAME");
  console.log("------------------------------------------------------------");

  try {
    const currentTierName =
      await publicClient.readContract({
        address: IDENTITY_NFT,
        abi: identityNftAbi,
        functionName: "tierNameOf",
        args: [NFT_ID],
      });

    console.log(
      "tierNameOf()          :",
      currentTierName
    );
  } catch (error) {
    console.log("❌ tierNameOf() REVERTED");
    console.log(
      "Reason:",
      error.shortMessage || error.message
    );
  }

  // ==========================================================
  // 3. MAX TIER ACHIEVED
  // ==========================================================

  console.log("\n------------------------------------------------------------");
  console.log("3. MAX TIER ACHIEVED");
  console.log("------------------------------------------------------------");

  try {
    const maxTier =
      await publicClient.readContract({
        address: IDENTITY_NFT,
        abi: identityNftAbi,
        functionName: "maxTierAchieved",
        args: [NFT_ID],
      });

    console.log(
      "maxTierAchieved()     :",
      maxTier.toString(),
      `(${tierName(maxTier)})`
    );
  } catch (error) {
    console.log("❌ maxTierAchieved() REVERTED");
    console.log(
      "Reason:",
      error.shortMessage || error.message
    );
  }

  // ==========================================================
  // 4. COMPUTED TIER
  // ==========================================================

  console.log("\n------------------------------------------------------------");
  console.log("4. COMPUTED / ELIGIBLE TIER");
  console.log("------------------------------------------------------------");

  let computedTier;

  try {
    computedTier =
      await publicClient.readContract({
        address: TIER_MANAGER,
        abi: tierManagerAbi,
        functionName: "computeTier",
        args: [NFT_ID],
      });

    console.log(
      "computeTier()         :",
      computedTier.toString(),
      `(${tierName(computedTier)})`
    );
  } catch (error) {
    console.log("❌ computeTier() REVERTED");
    console.log(
      "Reason:",
      error.shortMessage || error.message
    );
  }

  // ==========================================================
  // 5. TIER WEIGHTS
  // ==========================================================

  console.log("\n------------------------------------------------------------");
  console.log("5. TIER WEIGHTS");
  console.log("------------------------------------------------------------");

  for (let tier = 0; tier <= 4; tier++) {
    try {
      const weight =
        await publicClient.readContract({
          address: TIER_MANAGER,
          abi: tierManagerAbi,
          functionName: "tierWeight",
          args: [tier],
        });

      console.log(
        `${tier} - ${tierName(tier).padEnd(10)} : ${weight.toString()}`
      );
    } catch (error) {
      console.log(
        `❌ tierWeight(${tier}) failed:`,
        error.shortMessage || error.message
      );
    }
  }

  // ==========================================================
  // 6. COMPARISON
  // ==========================================================

  console.log("\n------------------------------------------------------------");
  console.log("6. STORED VS COMPUTED");
  console.log("------------------------------------------------------------");

  if (
    currentTier !== undefined &&
    computedTier !== undefined
  ) {
    console.log(
      "Stored Tier            :",
      `${currentTier} (${tierName(currentTier)})`
    );

    console.log(
      "Computed Tier          :",
      `${computedTier} (${tierName(computedTier)})`
    );

    if (Number(currentTier) === Number(computedTier)) {
      console.log("\n✅ PASS");
      console.log(
        "Stored tier matches computed tier."
      );
    } else {
      console.log("\n⚠️ WARNING");
      console.log(
        "Stored tier does NOT match computed tier."
      );
    }
  } else {
    console.log(
      "⚠️ Comparison could not be completed."
    );
  }

  console.log("\n============================================================");
  console.log("                    CHECK COMPLETE");
  console.log("============================================================\n");
}

main().catch((error) => {
  console.error("\n❌ SCRIPT FAILED\n");
  console.error(error);
  process.exit(1);
});

