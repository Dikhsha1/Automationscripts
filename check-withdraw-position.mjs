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
const POS_INDEX = Number(process.env.POS_INDEX || 0);

const client = createPublicClient({
  chain: {
    id: CHAIN_ID,
    name: "ARDEN",
    nativeCurrency: {
      name: "Native",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: {
      default: { http: [RPC_URL] }
    }
  },
  transport: http(RPC_URL)
});

const abi = [
  {
    inputs: [{ name: "nftId", type: "uint256" }],
    name: "positionsOf",
    outputs: [{
      components: [
        { name: "principal", type: "uint256" },
        { name: "accruedBalance", type: "uint256" },
        { name: "stakeTimestamp", type: "uint64" },
        { name: "lastUpdateDay", type: "uint16" },
        { name: "lastLoyaltyIndex", type: "uint8" },
        { name: "active", type: "bool" },
        { name: "claimed", type: "uint256" }
      ],
      type: "tuple[]"
    }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "DAY",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
];

async function main() {
  const positions = await client.readContract({
    address: STAKING_ENGINE,
    abi,
    functionName: "positionsOf",
    args: [NFT_ID]
  });

  if (!positions[POS_INDEX]) {
    throw new Error(`Position ${POS_INDEX} does not exist`);
  }

  const p = positions[POS_INDEX];

  const block = await client.getBlock();

  const now = Number(block.timestamp);
  const stakeTime = Number(p.stakeTimestamp);

  const ageSeconds = now - stakeTime;
  const ageMinutes = ageSeconds / 60;

  console.log("======================================");
  console.log(" ARDEN WITHDRAW POSITION CHECK");
  console.log("======================================");

  console.log("NFT ID        :", NFT_ID.toString());
  console.log("Position      :", POS_INDEX);

  console.log("");
  console.log("Principal     :", formatUnits(p.principal, 18), "ARDE");
  console.log("Accrued       :", formatUnits(p.accruedBalance, 18), "ARDE");
  console.log("Claimed       :", formatUnits(p.claimed, 18), "ARDE");
  console.log("Active        :", p.active);

  console.log("");
  console.log("Stake time    :", new Date(stakeTime * 1000).toISOString());
  console.log("Current time  :", new Date(now * 1000).toISOString());

  console.log("");
  console.log("Age seconds   :", ageSeconds);
  console.log("Age minutes   :", ageMinutes.toFixed(4));

  console.log("");
  console.log("======================================");

  if (ageMinutes < 30) {
    console.log("❌ WD-001/WD-002 range: withdrawal should be BLOCKED");
  } else if (ageMinutes === 30) {
    console.log("✅ WD-003 boundary: withdrawal should be ALLOWED");
  } else if (ageMinutes < 360) {
    console.log("✅ WD-004 range: withdrawal should have 1% fee");
  } else {
    console.log("✅ WD-006 range: withdrawal should have ZERO fee");
  }
}

main().catch(console.error);