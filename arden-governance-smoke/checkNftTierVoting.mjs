import "dotenv/config";
import {
  createPublicClient,
  http,
  getAddress,
  parseAbiItem,
} from "viem";

// ============================================================
// CONFIG
// ============================================================

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const GOVERNOR = getAddress(process.env.GOVERNOR);
const TIER_MANAGER = getAddress(process.env.TIER_MANAGER);

const PROPOSAL_ID = BigInt(process.env.PROPOSAL_ID);

// ============================================================
// NFT IDs TO TEST
// ============================================================
//
// Put one NFT ID for each tier.
//
// Replace these with your real UAT NFT IDs.
//

const NFTS = [
  {
    tierId: 0,
    tierName: "Seed",
    expectedWeight: 0n,
    nftId: BigInt(process.env.SEED_NFT_ID),
  },
  {
    tierId: 1,
    tierName: "Sprout",
    expectedWeight: 1n,
    nftId: BigInt(process.env.SPROUT_NFT_ID),
  },
  {
    tierId: 2,
    tierName: "Grower",
    expectedWeight: 2n,
    nftId: BigInt(process.env.GROWER_NFT_ID),
  },
  {
    tierId: 3,
    tierName: "Harvester",
    expectedWeight: 3n,
    nftId: BigInt(process.env.HARVESTER_NFT_ID),
  },
  {
    tierId: 4,
    tierName: "Guardian",
    expectedWeight: 5n,
    nftId: BigInt(process.env.GUARDIAN_NFT_ID),
  },
];

// ============================================================
// CLIENT
// ============================================================

const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

// ============================================================
// TIER MANAGER ABI
// ============================================================

const TIER_MANAGER_ABI = [
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

// ============================================================
// GOVERNOR ABI
// ============================================================

const GOVERNOR_ABI = [
  {
    type: "function",
    name: "proposals",
    stateMutability: "view",
    inputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    outputs: [
      { name: "proposalType", type: "uint8" },
      { name: "family", type: "uint8" },
      { name: "state", type: "uint8" },
      { name: "challengeReturnState", type: "uint8" },
      { name: "dissentUsed", type: "bool" },
      { name: "quorumBps", type: "uint16" },
      { name: "approvalBps", type: "uint16" },
      { name: "proposerNftId", type: "uint256" },
      { name: "description", type: "string" },
      { name: "snapshotBlock", type: "uint256" },
      {
        name: "totalEligibleWeightAtSnapshot",
        type: "uint256",
      },
      { name: "forVotes", type: "uint256" },
      { name: "againstVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
      { name: "screeningEndsAt", type: "uint256" },
      { name: "votingEndsAt", type: "uint256" },
      { name: "queuedEta", type: "uint256" },
      { name: "operationId", type: "bytes32" },
    ],
  },

  {
    type: "event",
    name: "VoteCast",
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: "proposalId",
        type: "uint256",
      },
      {
        indexed: true,
        name: "nftId",
        type: "uint256",
      },
      {
        indexed: false,
        name: "support",
        type: "uint8",
      },
      {
        indexed: false,
        name: "weight",
        type: "uint256",
      },
    ],
  },
];

// ============================================================
// SUPPORT
// ============================================================

const SUPPORT = {
  0: "Against",
  1: "For",
  2: "Abstain",
};

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("============================================================");
  console.log(" ARDEN / SOTTO - ALL TIER VOTING WEIGHT TEST");
  console.log("============================================================");

  console.log(`RPC:             ${RPC_URL}`);
  console.log(`Chain ID:        ${CHAIN_ID}`);
  console.log(`Governor:        ${GOVERNOR}`);
  console.log(`TierManager:     ${TIER_MANAGER}`);
  console.log(`Proposal ID:     ${PROPOSAL_ID}`);

  // ==========================================================
  // STEP 1 - PROPOSAL
  // ==========================================================

  console.log("\n------------------------------------------------------------");
  console.log(" STEP 1 - PROPOSAL SNAPSHOT");
  console.log("------------------------------------------------------------");

  const proposal = await publicClient.readContract({
    address: GOVERNOR,
    abi: GOVERNOR_ABI,
    functionName: "proposals",
    args: [PROPOSAL_ID],
  });

  const snapshotBlock = proposal[9];

  console.log(`Proposal ID:              ${PROPOSAL_ID}`);
  console.log(`Proposal Type:            ${proposal[0]}`);
  console.log(`Proposal State:           ${proposal[2]}`);
  console.log(`Proposer NFT:             ${proposal[7]}`);
  console.log(`Snapshot Block:           ${snapshotBlock}`);
  console.log(
    `Eligible Weight Snapshot: ${proposal[10]}`
  );
  console.log(`For Votes:                ${proposal[11]}`);
  console.log(`Against Votes:            ${proposal[12]}`);
  console.log(`Abstain Votes:            ${proposal[13]}`);

  // ==========================================================
  // STEP 2 - TEST ALL TIERS
  // ==========================================================

  console.log("\n============================================================");
  console.log(" STEP 2 - ALL TIER TEST");
  console.log("============================================================");

  const results = [];

  for (const nft of NFTS) {
    console.log("\n------------------------------------------------------------");
    console.log(` ${nft.tierName.toUpperCase()}`);
    console.log("------------------------------------------------------------");

    console.log(`NFT ID:              ${nft.nftId}`);
    console.log(`Expected Tier ID:    ${nft.tierId}`);
    console.log(`Expected Weight:     ${nft.expectedWeight}x`);

    // --------------------------------------------------------
    // COMPUTE TIER
    // --------------------------------------------------------

    let actualTierId;

    try {
      actualTierId = await publicClient.readContract({
        address: TIER_MANAGER,
        abi: TIER_MANAGER_ABI,
        functionName: "computeTier",
        args: [nft.nftId],
      });
    } catch (error) {
      console.log("❌ computeTier() failed");
      console.log(error.shortMessage || error.message);

      results.push({
        ...nft,
        actualTierId: null,
        actualWeight: null,
        status: "FAIL",
      });

      continue;
    }

    console.log(`Actual Tier ID:      ${actualTierId}`);

    const tierMatch =
      Number(actualTierId) === nft.tierId;

    if (tierMatch) {
      console.log(
        `✅ Tier PASS - ${nft.tierName}`
      );
    } else {
      console.log(
        `❌ Tier FAIL - Expected ${nft.tierId}, got ${actualTierId}`
      );
    }

    // --------------------------------------------------------
    // FIND ACTUAL VOTE
    // --------------------------------------------------------

    let voteLogs = [];

    try {
      const currentBlock =
        await publicClient.getBlockNumber();

      voteLogs = await publicClient.getLogs({
        address: GOVERNOR,
        event: parseAbiItem(
          "event VoteCast(uint256 indexed proposalId,uint256 indexed nftId,uint8 support,uint256 weight)"
        ),
        args: {
          proposalId: PROPOSAL_ID,
          nftId: nft.nftId,
        },
        fromBlock: 0n,
        toBlock: currentBlock,
      });
    } catch (error) {
      console.log("⚠️ Could not read VoteCast events");
      console.log(error.shortMessage || error.message);
    }

    // --------------------------------------------------------
    // NO VOTE
    // --------------------------------------------------------

    if (voteLogs.length === 0) {
      console.log("Actual Governor Vote: NOT FOUND");
      console.log(
        "ℹ️ NFT has not voted on this proposal."
      );

      results.push({
        ...nft,
        actualTierId: Number(actualTierId),
        actualWeight: null,
        status: tierMatch ? "TIER PASS / NO VOTE" : "FAIL",
      });

      continue;
    }

    // --------------------------------------------------------
    // VOTE FOUND
    // --------------------------------------------------------

    for (const log of voteLogs) {
      const actualWeight = log.args.weight;
      const support = Number(log.args.support);

      console.log(`Vote:                ${SUPPORT[support]}`);
      console.log(`Actual Weight:       ${actualWeight}`);
      console.log(`Vote Block:          ${log.blockNumber}`);
      console.log(`Transaction:         ${log.transactionHash}`);

      const weightMatch =
        actualWeight === nft.expectedWeight;

      console.log(
        `Expected Weight:     ${nft.expectedWeight}`
      );
      console.log(
        `Actual Weight:       ${actualWeight}`
      );

      if (weightMatch) {
        console.log(
          "✅ VOTING WEIGHT PASS"
        );
      } else {
        console.log(
          "❌ VOTING WEIGHT FAIL"
        );
      }

      results.push({
        ...nft,
        actualTierId: Number(actualTierId),
        actualWeight,
        status:
          tierMatch && weightMatch
            ? "PASS"
            : "FAIL",
      });
    }
  }

  // ==========================================================
  // FINAL SUMMARY
  // ==========================================================

  console.log("\n\n============================================================");
  console.log(" FINAL ALL-TIER SUMMARY");
  console.log("============================================================");

  console.log(
    "Tier        Expected    Actual Tier    Expected VP    Actual VP    Result"
  );

  console.log(
    "--------------------------------------------------------------------------"
  );

  for (const result of results) {
    const actualTier =
      result.actualTierId === null
        ? "ERROR"
        : result.actualTierId;

    const actualWeight =
      result.actualWeight === null
        ? "NO VOTE"
        : result.actualWeight;

    console.log(
      `${result.tierName.padEnd(11)} ` +
      `${String(result.tierId).padEnd(11)} ` +
      `${String(actualTier).padEnd(14)} ` +
      `${String(result.expectedWeight).padEnd(13)} ` +
      `${String(actualWeight).padEnd(12)} ` +
      `${result.status}`
    );
  }

  console.log(
    "--------------------------------------------------------------------------"
  );

  console.log("\nExpected governance mapping:");
  console.log("Seed      = 0x");
  console.log("Sprout    = 1x");
  console.log("Grower    = 2x");
  console.log("Harvester = 3x");
  console.log("Guardian  = 5x");

  console.log("\n============================================================");
  console.log(" TEST COMPLETE");
  console.log("============================================================");
}

main().catch((error) => {
  console.error("\n❌ SCRIPT FAILED");
  console.error(error);
  process.exit(1);
});