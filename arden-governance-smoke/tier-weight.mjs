import "dotenv/config";
import {
  createPublicClient,
  http,
  getAddress,
  defineChain,
} from "viem";

const RPC_URL = process.env.RPC_URL;
const TIER_MANAGER = getAddress(process.env.TIER_MANAGER);

const TOKEN_ID = BigInt(process.env.TOKEN_ID);

const sotto = defineChain({
  id: 1337,
  name: "Sotto",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
  },
});

const client = createPublicClient({
  chain: sotto,
  transport: http(RPC_URL),
});

const tierManagerAbi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "computeTier",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const TIER_NAMES = {
  0: "Seed",
  1: "Sprout",
  2: "Grower",
  3: "Harvester",
  4: "Guardian",
};

const TIER_WEIGHTS = {
  0: 1,
  1: 1,
  2: 2,
  3: 3,
  4: 5,
};

async function main() {
  console.log("Checking Tier...");
  console.log("TierManager:", TIER_MANAGER);
  console.log("Token ID:", TOKEN_ID.toString());
  console.log("");

  const tier = await client.readContract({
    address: TIER_MANAGER,
    abi: tierManagerAbi,
    functionName: "computeTier",
    args: [TOKEN_ID],
  });

  const tierId = Number(tier);
  const tierName = TIER_NAMES[tierId] ?? "Unknown";
  const expectedWeight = TIER_WEIGHTS[tierId] ?? "Unknown";

  console.log("Result");
  console.log("--------------------------------");
  console.log(`Tier ID       : ${tierId}`);
  console.log(`Tier          : ${tierName}`);
  console.log(`Expected Weight: ${expectedWeight}x`);
  console.log("--------------------------------");
}

main().catch((error) => {
  console.error("ERROR:", error.shortMessage || error.message);
  process.exit(1);
});