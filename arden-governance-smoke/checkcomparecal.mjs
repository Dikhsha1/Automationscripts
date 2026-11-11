import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  getAddress,
} from "viem";

// ============================================================
// CONFIG
// ============================================================

const RPC_URL = process.env.RPC_URL || "https://devrpc.sotto.li";
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const COUNCIL_SEATS = getAddress(
  process.env.COUNCIL_SEATS ||
    "0x545B044007b171EB05ae3A1dcD9a37A6dFC9B8a5"
);

// ambassder2
const USER_ID = 15n;
const NFT_ID = 1255015828943044933n;

// ============================================================
// CLIENT
// ============================================================

const client = createPublicClient({
  transport: http(RPC_URL),
});

// ============================================================
// ABI
// ============================================================

const ABI = [
  {
    type: "function",
    name: "BPS_DENOMINATOR",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "SCORE_PRECISION",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "scoreParams",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "stakeUnitUsd", type: "uint256" },
          { name: "liquidityUnitUsd", type: "uint256" },
          { name: "referralUnit", type: "uint256" },
          { name: "pairsUnit", type: "uint256" },
          { name: "volumeUnitUsd", type: "uint256" },
          { name: "stakeWeightBps", type: "uint256" },
          { name: "liquidityWeightBps", type: "uint256" },
          { name: "referralWeightBps", type: "uint256" },
          { name: "pairsWeightBps", type: "uint256" },
          { name: "volumeWeightBps", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "metricsOf",
    stateMutability: "view",
    inputs: [{ name: "nftId", type: "uint256" }],
    outputs: [
      { name: "stakeUsd", type: "uint256" },
      { name: "liquidityUsd", type: "uint256" },
      { name: "referrals", type: "uint256" },
      { name: "pairs", type: "uint256" },
      { name: "volumeUsd", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "teamMetrics",
    stateMutability: "view",
    inputs: [{ name: "userId", type: "uint256" }],
    outputs: [
      { name: "matchedPairs", type: "uint256" },
      { name: "matchedVolumeUsd", type: "uint256" },
      { name: "updatedAt", type: "uint64" },
      { name: "epoch", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "scoreOf",
    stateMutability: "view",
    inputs: [{ name: "nftId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
];

// ============================================================
// HELPERS
// ============================================================

function usd18(value) {
  return Number(formatUnits(value, 18));
}

function pct(value, bpsDenominator) {
  return Number(value) / Number(bpsDenominator);
}

function printLine(label, value) {
  console.log(`${label.padEnd(28)} ${value}`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("\n============================================================");
  console.log(" ARDEN / SOTTO UAT - PROPOSER02 COUNCIL SCORE CHECK");
  console.log("============================================================\n");

  console.log(`RPC       : ${RPC_URL}`);
  console.log(`Chain ID  : ${CHAIN_ID}`);
  console.log(`User ID   : ${USER_ID}`);
  console.log(`NFT ID    : ${NFT_ID}`);
  console.log(`Contract  : ${COUNCIL_SEATS}`);

  // ----------------------------------------------------------
  // 1. Read score configuration
  // ----------------------------------------------------------

  const [bpsDenominator, scorePrecision, params] =
    await Promise.all([
      client.readContract({
        address: COUNCIL_SEATS,
        abi: ABI,
        functionName: "BPS_DENOMINATOR",
      }),

      client.readContract({
        address: COUNCIL_SEATS,
        abi: ABI,
        functionName: "SCORE_PRECISION",
      }),

      client.readContract({
        address: COUNCIL_SEATS,
        abi: ABI,
        functionName: "scoreParams",
      }),
    ]);

  console.log("\n------------------------------------------------------------");
  console.log("1. SCORE CONFIGURATION");
  console.log("------------------------------------------------------------");

  printLine("BPS denominator:", bpsDenominator.toString());
  printLine("Score precision:", scorePrecision.toString());

  console.log("\nUnits:");

  printLine(
    "Stake unit:",
    `${usd18(params.stakeUnitUsd).toLocaleString()} USD`
  );

  printLine(
    "Liquidity unit:",
    `${usd18(params.liquidityUnitUsd).toLocaleString()} USD`
  );

  printLine(
    "Referral unit:",
    params.referralUnit.toString()
  );

  printLine(
    "Pairs unit:",
    params.pairsUnit.toString()
  );

  printLine(
    "Volume unit:",
    `${usd18(params.volumeUnitUsd).toLocaleString()} USD`
  );

  console.log("\nWeights:");

  printLine(
    "Stake weight:",
    `${pct(params.stakeWeightBps, bpsDenominator) * 100}%`
  );

  printLine(
    "Liquidity weight:",
    `${pct(params.liquidityWeightBps, bpsDenominator) * 100}%`
  );

  printLine(
    "Referral weight:",
    `${pct(params.referralWeightBps, bpsDenominator) * 100}%`
  );

  printLine(
    "Pairs weight:",
    `${pct(params.pairsWeightBps, bpsDenominator) * 100}%`
  );

  printLine(
    "Volume weight:",
    `${pct(params.volumeWeightBps, bpsDenominator) * 100}%`
  );

  // ----------------------------------------------------------
  // 2. Read teamMetrics(userId)
  // ----------------------------------------------------------

  const team = await client.readContract({
    address: COUNCIL_SEATS,
    abi: ABI,
    functionName: "teamMetrics",
    args: [USER_ID],
  });

  const [
    matchedPairs,
    matchedVolumeUsd,
    updatedAt,
    epoch,
  ] = team;

  console.log("\n------------------------------------------------------------");
  console.log("2. TEAM METRICS - teamMetrics(39)");
  console.log("------------------------------------------------------------");

  printLine("User ID:", USER_ID.toString());
  printLine("Matched pairs:", matchedPairs.toString());
  printLine(
    "Matched volume:",
    `${usd18(matchedVolumeUsd)} USD`
  );
  printLine("Updated at:", updatedAt.toString());
  printLine("Epoch:", epoch.toString());

  // ----------------------------------------------------------
  // 3. Read metricsOf(nftId)
  // ----------------------------------------------------------

  const metrics = await client.readContract({
    address: COUNCIL_SEATS,
    abi: ABI,
    functionName: "metricsOf",
    args: [NFT_ID],
  });

  const [
    stakeUsd,
    liquidityUsd,
    referrals,
    metricPairs,
    metricVolumeUsd,
  ] = metrics;

  console.log("\n------------------------------------------------------------");
  console.log("3. METRICS - metricsOf(NFT)");
  console.log("------------------------------------------------------------");

  printLine("NFT ID:", NFT_ID.toString());
  printLine("Stake:", `${usd18(stakeUsd)} USD`);
  printLine("Liquidity:", `${usd18(liquidityUsd)} USD`);
  printLine("Referrals:", referrals.toString());
  printLine("Pairs:", metricPairs.toString());
  printLine(
    "Volume:",
    `${usd18(metricVolumeUsd)} USD`
  );

  // ----------------------------------------------------------
  // 4. Read actual score
  // ----------------------------------------------------------

  const actualRaw = await client.readContract({
    address: COUNCIL_SEATS,
    abi: ABI,
    functionName: "scoreOf",
    args: [NFT_ID],
  });

  const actualScore = Number(
    formatUnits(actualRaw, 18)
  );

  console.log("\n------------------------------------------------------------");
  console.log("4. ACTUAL ON-CHAIN SCORE");
  console.log("------------------------------------------------------------");

  printLine("Raw score:", actualRaw.toString());
  printLine("Score:", actualScore.toFixed(18));
  printLine("Displayed:", actualScore.toFixed(6));

  // ----------------------------------------------------------
  // 5. Calculate score using metricsOf()
  // ----------------------------------------------------------

  const stake = usd18(stakeUsd);
  const liquidity = usd18(liquidityUsd);
  const volume = usd18(metricVolumeUsd);

  const stakeUnit = usd18(params.stakeUnitUsd);
  const liquidityUnit = usd18(params.liquidityUnitUsd);
  const volumeUnit = usd18(params.volumeUnitUsd);

  const stakeWeight =
    Number(params.stakeWeightBps) / Number(bpsDenominator);

  const liquidityWeight =
    Number(params.liquidityWeightBps) / Number(bpsDenominator);

  const referralWeight =
    Number(params.referralWeightBps) / Number(bpsDenominator);

  const pairsWeight =
    Number(params.pairsWeightBps) / Number(bpsDenominator);

  const volumeWeight =
    Number(params.volumeWeightBps) / Number(bpsDenominator);

  const stakeComponent =
    (stake / stakeUnit) * stakeWeight;

  const liquidityComponent =
    (liquidity / liquidityUnit) * liquidityWeight;

  const referralComponent =
    (Number(referrals) / Number(params.referralUnit)) *
    referralWeight;

  const pairsComponent =
    (Number(metricPairs) / Number(params.pairsUnit)) *
    pairsWeight;

  const volumeComponent =
    (volume / volumeUnit) * volumeWeight;

  const calculatedFromMetrics =
    stakeComponent +
    liquidityComponent +
    referralComponent +
    pairsComponent +
    volumeComponent;

  // ----------------------------------------------------------
  // 6. Calculate using teamMetrics()
  // ----------------------------------------------------------

  const teamVolume = usd18(matchedVolumeUsd);

  const teamPairsComponent =
    (Number(matchedPairs) / Number(params.pairsUnit)) *
    pairsWeight;

  const teamVolumeComponent =
    (teamVolume / volumeUnit) *
    volumeWeight;

  const calculatedUsingTeamMetrics =
    stakeComponent +
    liquidityComponent +
    referralComponent +
    teamPairsComponent +
    teamVolumeComponent;

  console.log("\n------------------------------------------------------------");
  console.log("5. SCORE CALCULATION");
  console.log("------------------------------------------------------------");

  console.log("\nUsing metricsOf():");

  printLine(
    "Stake contribution:",
    stakeComponent.toFixed(9)
  );

  printLine(
    "Liquidity contribution:",
    liquidityComponent.toFixed(9)
  );

  printLine(
    "Referral contribution:",
    referralComponent.toFixed(9)
  );

  printLine(
    "Pairs contribution:",
    pairsComponent.toFixed(9)
  );

  printLine(
    "Volume contribution:",
    volumeComponent.toFixed(9)
  );

  printLine(
    "Calculated score:",
    calculatedFromMetrics.toFixed(9)
  );

  console.log("\nUsing teamMetrics():");

  printLine(
    "Matched pairs contribution:",
    teamPairsComponent.toFixed(9)
  );

  printLine(
    "Matched volume contribution:",
    teamVolumeComponent.toFixed(9)
  );

  printLine(
    "Expected score:",
    calculatedUsingTeamMetrics.toFixed(9)
  );

  // ----------------------------------------------------------
  // 7. Comparison
  // ----------------------------------------------------------

  const difference =
    calculatedUsingTeamMetrics - actualScore;

  const metricsDifference =
    calculatedFromMetrics - actualScore;

  console.log("\n------------------------------------------------------------");
  console.log("6. QA COMPARISON");
  console.log("------------------------------------------------------------");

  printLine(
    "Actual score:",
    actualScore.toFixed(9)
  );

  printLine(
    "Score from metricsOf:",
    calculatedFromMetrics.toFixed(9)
  );

  printLine(
    "Score using teamMetrics:",
    calculatedUsingTeamMetrics.toFixed(9)
  );

  printLine(
    "Team-metric difference:",
    difference.toFixed(9)
  );

  printLine(
    "metricsOf difference:",
    metricsDifference.toFixed(9)
  );

  // ----------------------------------------------------------
  // 8. Team metric consistency
  // ----------------------------------------------------------

  console.log("\n------------------------------------------------------------");
  console.log("7. TEAM METRIC CHECK");
  console.log("------------------------------------------------------------");

  if (matchedPairs > 0n || matchedVolumeUsd > 0n) {
    console.log(
      "teamMetrics(): MATCHED TEAM DATA EXISTS"
    );
  } else {
    console.log(
      "teamMetrics(): No matched team data recorded"
    );
  }

  if (metricPairs === 0n && metricVolumeUsd === 0n) {
    console.log(
      "metricsOf(): pairs/volume = ZERO"
    );
  } else {
    console.log(
      "metricsOf(): pairs/volume are NON-ZERO"
    );
  }

  // ----------------------------------------------------------
  // 9. Final QA result
  // ----------------------------------------------------------

  console.log("\n============================================================");
  console.log("FINAL RESULT");
  console.log("============================================================");

  const tolerance = 0.000001;

  if (
    Math.abs(calculatedFromMetrics - actualScore) <=
    tolerance
  ) {
    console.log(
      "PASS: scoreOf() matches metricsOf() calculation."
    );
  } else {
    console.log(
      "FAIL: scoreOf() does not match metricsOf() calculation."
    );
  }

  if (
    (matchedPairs > 0n || matchedVolumeUsd > 0n) &&
    metricPairs === 0n &&
    metricVolumeUsd === 0n
  ) {
    console.log(
      "WARNING: teamMetrics contains matched data, but metricsOf() returns zero."
    );
  }

  if (
    Math.abs(calculatedUsingTeamMetrics - actualScore) >
    tolerance
  ) {
    console.log(
      "WARNING: scoreOf() does not include the recorded teamMetrics values."
    );
  }

  console.log("\n============================================================\n");
}

main().catch((error) => {
  console.error("\nERROR:");
  console.error(error);
  process.exit(1);
});