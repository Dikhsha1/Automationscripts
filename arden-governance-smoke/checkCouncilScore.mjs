
import "dotenv/config";
import {
  createPublicClient,
  http,
  getAddress,
  formatUnits,
} from "viem";

// ============================================================
// CONFIG
// ============================================================

const RPC_URL = process.env.RPC_URL;

const COUNCIL_SEATS = getAddress(
  process.env.COUNCIL_SEATS ||
    "0x0cA1e860E63c10dA6A38568065FC48130959BDFe"
);

// ambassder3
const NFT_ID = 9840234757901838675n;

// ============================================================
// CLIENT
// ============================================================

const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

// ============================================================
// MINIMAL ABI
// ============================================================

const councilSeatsAbi = [
  {
    inputs: [{ name: "nftId", type: "uint256" }],
    name: "scoreOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [{ name: "nftId", type: "uint256" }],
    name: "metricsOf",
    outputs: [
      { name: "stakeUsd", type: "uint256" },
      { name: "liquidityUsd", type: "uint256" },
      { name: "referrals", type: "uint256" },
      { name: "pairs", type: "uint256" },
      { name: "volumeUsd", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// ============================================================
// HEADER
// ============================================================

console.log("");
console.log("========================================");
console.log("       ARDEN COUNCIL SCORE CHECK");
console.log("========================================");

console.log(`RPC:          ${RPC_URL}`);
console.log(`CouncilSeats: ${COUNCIL_SEATS}`);
console.log(`NFT ID:       ${NFT_ID.toString()}`);
console.log(`NFT Name:     ambassder3`);

console.log("");
console.log("Reading deployed contract...");
console.log("----------------------------------------");

// ============================================================
// ON-CHAIN SCORE
// ============================================================

const score = await publicClient.readContract({
  address: COUNCIL_SEATS,
  abi: councilSeatsAbi,
  functionName: "scoreOf",
  args: [NFT_ID],
});

console.log("");
console.log("Council Score");
console.log("----------------------------------------");

console.log(`Raw Score:    ${score.toString()}`);
console.log(`Score / 1e18: ${formatUnits(score, 18)}`);

// ============================================================
// NFT METRICS
// ============================================================

const metrics = await publicClient.readContract({
  address: COUNCIL_SEATS,
  abi: councilSeatsAbi,
  functionName: "metricsOf",
  args: [NFT_ID],
});

const stakeUsd = metrics[0];
const liquidityUsd = metrics[1];
const referrals = metrics[2];
const pairs = metrics[3];
const volumeUsd = metrics[4];

console.log("");
console.log("NFT Metrics");
console.log("----------------------------------------");

console.log(
  `Stake USD:      ${formatUnits(stakeUsd, 18)}`
);

console.log(
  `Liquidity USD:  ${formatUnits(liquidityUsd, 18)}`
);

console.log(
  `Referrals:      ${referrals.toString()}`
);

console.log(
  `Pairs:          ${pairs.toString()}`
);

console.log(
  `Volume USD:     ${formatUnits(volumeUsd, 18)}`
);

// ============================================================
// SUMMARY
// ============================================================

console.log("");
console.log("========================================");
console.log("              SUMMARY");
console.log("========================================");

console.log(`NFT:            ambassder3`);
console.log(`NFT ID:         ${NFT_ID.toString()}`);
console.log(
  `Council Score:  ${formatUnits(score, 18)}`
);
console.log(
  `Stake:          ${formatUnits(stakeUsd, 18)} USD`
);
console.log(
  `Liquidity:      ${formatUnits(liquidityUsd, 18)} USD`
);
console.log(`Referrals:      ${referrals.toString()}`);
console.log(`Pairs:          ${pairs.toString()}`);
console.log(
  `Volume:         ${formatUnits(volumeUsd, 18)} USD`
);

console.log("");
console.log("========================================");
console.log("                 DONE");
console.log("========================================");

