import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  isAddress,
} from "viem";
import { defineChain } from "viem";
import { stakingEngine } from "./stakingEngine.js";

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);
const STAKING_ENGINE = process.env.STAKING_ENGINE;

if (!RPC_URL) {
  throw new Error("RPC_URL is missing from .env");
}

if (!STAKING_ENGINE) {
  throw new Error("STAKING_ENGINE is missing from .env");
}

if (!isAddress(STAKING_ENGINE)) {
  throw new Error(`Invalid STAKING_ENGINE address: ${STAKING_ENGINE}`);
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
  console.log("========== STAKING OBLIGATIONS ==========");
  console.log("RPC:", RPC_URL);
  console.log("Chain:", CHAIN_ID);
  console.log("StakingEngine:", STAKING_ENGINE);

  // --------------------------------------------------
  // Protocol-level staking values
  // --------------------------------------------------

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

  console.log("\n========== PROTOCOL VALUES ==========");

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

  // --------------------------------------------------
  // NFT IDs discovered from your Staking events
  // --------------------------------------------------

  const nftIds = [
    277748459900468814n,
    4575609572805213845n,
    5853875218646736804n,
    5963873007303821276n,
    14405664015701580146n,
    17737086233846646872n,
  ];

  let activePrincipal = 0n;
  let accruedObligations = 0n;
  let activePositions = 0;

  console.log("\n========== POSITION DETAILS ==========");

  for (const nftId of nftIds) {
    let positions;

    try {
      positions = await client.readContract({
        address: STAKING_ENGINE,
        abi: stakingEngine,
        functionName: "positionsOf",
        args: [nftId],
      });
    } catch (error) {
      console.log(`\nNFT ${nftId}: unable to read positions`);
      console.error(error.shortMessage || error.message);
      continue;
    }

    console.log(`\nNFT ID: ${nftId}`);
    console.log(`Positions: ${positions.length}`);

    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];

      if (!position.active) {
        continue;
      }

      activePositions++;

      const principal = position.principal;
      const storedAccrued = position.accruedBalance;

      // Current accrued reward calculated directly by contract
      let previewAccrued = 0n;

      try {
        previewAccrued = await client.readContract({
          address: STAKING_ENGINE,
          abi: stakingEngine,
          functionName: "previewAccrued",
          args: [nftId, BigInt(i)],
        });
      } catch (error) {
        console.log(
          `Unable to preview accrued for NFT ${nftId}, position ${i}`
        );

        console.error(error.shortMessage || error.message);
      }

      activePrincipal += principal;

      // Use the contract's current accrued value.
      accruedObligations += previewAccrued;

      console.log(`  Position ${i}`);
      console.log(
        `    Principal:       ${formatUnits(principal, 18)} ARDE`
      );
      console.log(
        `    Stored Accrued:  ${formatUnits(storedAccrued, 18)} ARDE`
      );
      console.log(
        `    Preview Accrued: ${formatUnits(previewAccrued, 18)} ARDE`
      );
      console.log(
        `    Obligation:      ${formatUnits(
          principal + previewAccrued,
          18
        )} ARDE`
      );
    }
  }

  // --------------------------------------------------
  // Final obligation
  // --------------------------------------------------

  const totalEstimatedObligation =
    activePrincipal + accruedObligations;

  console.log("\n========================================");
  console.log("FINAL STAKING OBLIGATION");
  console.log("========================================");

  console.log(
    "Active Principal:",
    formatUnits(activePrincipal, 18),
    "ARDE"
  );

  console.log(
    "Accrued Rewards:",
    formatUnits(accruedObligations, 18),
    "ARDE"
  );

  console.log(
    "Estimated Staking Obligation:",
    formatUnits(totalEstimatedObligation, 18),
    "ARDE"
  );

  console.log(
    "Active Positions:",
    activePositions
  );

  console.log("\n========== END ==========");
}

main().catch((error) => {
  console.error("\n❌ ERROR:");
  console.error(error);
  process.exit(1);
});