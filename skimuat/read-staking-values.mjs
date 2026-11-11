import "dotenv/config";
import { createPublicClient, http, formatUnits, isAddress } from "viem";
import { defineChain } from "viem";
import { stakingEngine } from "./stakingEngine.js";

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);
const STAKING_ENGINE = process.env.STAKING_ENGINE;

console.log("RPC:", RPC_URL);
console.log("CHAIN ID:", CHAIN_ID);
console.log("STAKING ENGINE:", STAKING_ENGINE);

if (!RPC_URL) {
  throw new Error("RPC_URL is missing from .env");
}

if (!STAKING_ENGINE) {
  throw new Error(
    "STAKING_ENGINE is missing from .env. Add STAKING_ENGINE=0x..."
  );
}

if (!isAddress(STAKING_ENGINE)) {
  throw new Error(
    `Invalid STAKING_ENGINE address: ${STAKING_ENGINE}`
  );
}

const chain = defineChain({
  id: CHAIN_ID,
  name: "ARDEN UAT",
  nativeCurrency: {
    name: "ETH",
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
  chain,
  transport: http(RPC_URL),
});

async function main() {
  console.log("\n========== STAKING ENGINE ==========");

  const totalStaked = await client.readContract({
    address: STAKING_ENGINE,
    abi: stakingEngine,
    functionName: "totalStakedProtocol",
  });

  const totalClaimed = await client.readContract({
    address: STAKING_ENGINE,
    abi: stakingEngine,
    functionName: "totalClaimedProtocol",
  });

  console.log("\n===== STAKING VALUES =====");

  console.log(
    "Total Staked Protocol:",
    formatUnits(totalStaked, 18),
    "ARDE"
  );

  console.log(
    "Total Claimed Protocol:",
    formatUnits(totalClaimed, 18),
    "ARDE"
  );
}

main().catch((error) => {
  console.error("\n❌ ERROR:");
  console.error(error);
  process.exit(1);
});