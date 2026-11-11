import "dotenv/config";
import {
  createPublicClient,
  http,
  getAddress,
  defineChain,
} from "viem";

// ===============================
// CONFIG
// ===============================

const RPC_URL = process.env.RPC_URL;

const IDENTITY_NFT = getAddress(process.env.IDENTITY_NFT);
const TIER_MANAGER = getAddress(process.env.TIER_MANAGER);

const TOKEN_ID = BigInt(process.env.TOKEN_ID);

const Wallet_address = getAddress(process.env.Wallet_address);

// ===============================
// VALIDATION
// ===============================

if (!RPC_URL) throw new Error("RPC_URL missing in .env");
if (!process.env.IDENTITY_NFT) throw new Error("IDENTITY_NFT missing in .env");
if (!process.env.TIER_MANAGER) throw new Error("TIER_MANAGER missing in .env");
if (!process.env.TOKEN_ID) throw new Error("TOKEN_ID missing in .env");
if (!process.env.Wallet_address) throw new Error("Wallet_address missing in .env");

// ===============================
// CHAIN
// ===============================

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
      http: [RPC_URL],
    },
  },
});

// ===============================
// CLIENT
// ===============================

const client = createPublicClient({
  chain: sotto,
  transport: http(RPC_URL),
});

// ===============================
// ABI
// ===============================

const identityNFTAbi = [
  {
    type: "function",
    name: "ownerOf",
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
        type: "address",
      },
    ],
  },
];

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
];

// ===============================
// TIER MAPPING
// ===============================

const tierNames = {
  0: "Seed",
  1: "Sprout",
  2: "Grower",
  3: "Harvester",
  4: "Guardian",
};

const tierWeights = {
  0: "1x",
  1: "1x",
  2: "2x",
  3: "3x",
  4: "5x",
};

// ===============================
// READ BLOCKCHAIN
// ===============================

console.log("\nChecking vote eligibility basics...\n");

const owner = await client.readContract({
  address: IDENTITY_NFT,
  abi: identityNFTAbi,
  functionName: "ownerOf",
  args: [TOKEN_ID],
});

const tierId = await client.readContract({
  address: TIER_MANAGER,
  abi: tierManagerAbi,
  functionName: "computeTier",
  args: [TOKEN_ID],
});

const tierName = tierNames[Number(tierId)] ?? "Unknown";
const weight = tierWeights[Number(tierId)] ?? "Unknown";

const ownerMatches =
  owner.toLowerCase() === Wallet_address.toLowerCase();

// ===============================
// RESULT
// ===============================

console.log("======================================");
console.log("       VOTE ELIGIBILITY CHECK");
console.log("======================================");

console.log("wallet Address     :", Wallet_address);
console.log("Token ID         :", TOKEN_ID.toString());
console.log("NFT Owner        :", owner);
console.log("Owner Matches    :", ownerMatches ? "YES" : "NO");

console.log("--------------------------------------");

console.log("Current Tier ID   :", tierId.toString());
console.log("Current Tier      :", tierName);
console.log("Expected Weight   :", weight);

console.log("--------------------------------------");

if (ownerMatches) {
  console.log("NFT Ownership     : PASS");
} else {
  console.log("NFT Ownership     : FAIL");
}

if (Number(tierId) >= 1) {
  console.log("Tier Eligibility  : PASS");
} else {
  console.log("Tier Eligibility  : CHECK");
}

console.log("--------------------------------------");

if (ownerMatches && Number(tierId) >= 1) {
  console.log("Basic Result      : POSSIBLY ELIGIBLE");
  console.log(
    "NOTE: Proposal snapshot voting power still needs to be checked."
  );
} else {
  console.log("Basic Result      : NOT ELIGIBLE");
}

console.log("======================================\n");