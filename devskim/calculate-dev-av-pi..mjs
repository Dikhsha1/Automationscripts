import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  parseAbi,
} from "viem";
import { defineChain } from "viem";

// =====================================================
// CONFIG
// =====================================================

const RPC_URL = process.env.RPC_URL || "https://chain.sotto.li";

const STAKING_ENGINE = process.env.STAKING_ENGINE;
const PRESALE_CONTRACT = process.env.PRESALE_CONTRACT;
const PRICE_ORACLE = process.env.PRICE_ORACLE;

const RT_ADDRESS =
  process.env.RT_ADDRESS ||
  "0x554c1e44DF63AE9e7D83Db4a96A541E1cebEaAa0";

const OT_ADDRESS =
  process.env.OT_ADDRESS ||
  "0x7037d9cb58784615fa6A177D3fD0aBc2D1E5E44a";

const USDT_ADDRESS =
  process.env.USDT_ADDRESS ||
  "0x103df201ed80eE00FfE2f694C49926c7F0d42d72";

// =====================================================
// CHAIN
// =====================================================

const chain = defineChain({
  id: 1337,
  name: "ARDEN Dev",
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

// =====================================================
// CLIENT
// =====================================================

const client = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

// =====================================================
// ABI
// =====================================================

const obligationAbi = parseAbi([
  "function getObligationView() view returns (uint256 totalStakedOut, uint256 approxRewards, uint256 netAccrued, uint256 totalObligation)",
]);

const tokenAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

// IMPORTANT:
// Use the actual AV getter exposed by your PriceOracle.
// If your PriceOracle uses another name, change this one line.
const priceOracleAbi = parseAbi([
  "function anchorValue() view returns (uint256)",
]);

// =====================================================
// HELPERS
// =====================================================

function toNumber(value, decimals) {
  return Number(formatUnits(value, decimals));
}

function printLine(label, value) {
  console.log(`${label.padEnd(35)} ${value}`);
}

function pctDifference(a, b) {
  if (b === 0) return 0;
  return ((a - b) / b) * 100;
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log("\n==============================================");
  console.log("       ARDEN COMBINED AV QA TEST");
  console.log("==============================================");

  console.log(`RPC: ${RPC_URL}`);
  console.log(`Chain ID: ${chain.id}`);

  if (!STAKING_ENGINE) {
    throw new Error("Missing STAKING_ENGINE in .env");
  }

  if (!PRESALE_CONTRACT) {
    throw new Error("Missing PRESALE_CONTRACT in .env");
  }

  if (!PRICE_ORACLE) {
    throw new Error("Missing PRICE_ORACLE in .env");
  }

  console.log(`\nStaking Engine : ${STAKING_ENGINE}`);
  console.log(`Presale        : ${PRESALE_CONTRACT}`);
  console.log(`Price Oracle   : ${PRICE_ORACLE}`);
  console.log(`Reserve        : ${RT_ADDRESS}`);
  console.log(`Operations     : ${OT_ADDRESS}`);
  console.log(`USDT           : ${USDT_ADDRESS}`);

  // ===================================================
  // BLOCK SNAPSHOT
  // ===================================================

  const block = await client.getBlock();

  console.log("\n----------------------------------------------");
  console.log("CHAIN SNAPSHOT");
  console.log("----------------------------------------------");

  printLine("Block", block.number.toString());
  printLine(
    "Block Time",
    block.timestamp
      ? new Date(Number(block.timestamp) * 1000).toISOString()
      : "N/A"
  );

  // ===================================================
  // 1. STAKING OBLIGATION
  // ===================================================

  const staking = await client.readContract({
    address: STAKING_ENGINE,
    abi: obligationAbi,
    functionName: "getObligationView",
  });

  const [
    stakingPrincipalRaw,
    stakingApproxRewardsRaw,
    stakingNetAccruedRaw,
    stakingTotalRaw,
  ] = staking;

  const stakingPrincipal = toNumber(stakingPrincipalRaw, 18);
  const stakingApproxRewards = toNumber(stakingApproxRewardsRaw, 18);
  const stakingNetAccrued = toNumber(stakingNetAccruedRaw, 18);
  const stakingTotal = toNumber(stakingTotalRaw, 18);

  console.log("\n----------------------------------------------");
  console.log("STAKING OBLIGATION");
  console.log("----------------------------------------------");

  printLine("Staked Principal", stakingPrincipal);
  printLine("Approx Rewards", stakingApproxRewards);
  printLine("Net Accrued", stakingNetAccrued);
  printLine("Total Staking Obligation", stakingTotal);

  // ===================================================
  // 2. PRESALE OBLIGATION
  // ===================================================

  const presale = await client.readContract({
    address: PRESALE_CONTRACT,
    abi: obligationAbi,
    functionName: "getObligationView",
  });

  const [
    presalePrincipalRaw,
    presaleApproxRewardsRaw,
    presaleNetAccruedRaw,
    presaleTotalRaw,
  ] = presale;

  const presalePrincipal = toNumber(presalePrincipalRaw, 18);
  const presaleApproxRewards = toNumber(presaleApproxRewardsRaw, 18);
  const presaleNetAccrued = toNumber(presaleNetAccruedRaw, 18);
  const presaleTotal = toNumber(presaleTotalRaw, 18);

  console.log("\n----------------------------------------------");
  console.log("PRESALE OBLIGATION");
  console.log("----------------------------------------------");

  printLine("Presale Principal", presalePrincipal);
  printLine("Approx Rewards", presaleApproxRewards);
  printLine("Net Accrued", presaleNetAccrued);
  printLine("Total Presale Obligation", presaleTotal);

  // ===================================================
  // 3. COMBINED OBLIGATION
  // ===================================================

  const combinedObligation =
    stakingTotal + presaleTotal;

  console.log("\n----------------------------------------------");
  console.log("COMBINED OBLIGATION");
  console.log("----------------------------------------------");

  printLine(
    "Staking Obligation",
    stakingTotal.toFixed(12)
  );

  printLine(
    "Presale Obligation",
    presaleTotal.toFixed(12)
  );

  printLine(
    "Combined Obligation",
    combinedObligation.toFixed(12)
  );

  // ===================================================
  // 4. RT + OT USDT
  // ===================================================

  const rtBalanceRaw = await client.readContract({
    address: USDT_ADDRESS,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [RT_ADDRESS],
  });

  const otBalanceRaw = await client.readContract({
    address: USDT_ADDRESS,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [OT_ADDRESS],
  });

  const usdtDecimals = await client.readContract({
    address: USDT_ADDRESS,
    abi: tokenAbi,
    functionName: "decimals",
  });

  const rtBalance = toNumber(rtBalanceRaw, usdtDecimals);
  const otBalance = toNumber(otBalanceRaw, usdtDecimals);

  const eligibleReserves =
    rtBalance + otBalance;

  console.log("\n----------------------------------------------");
  console.log("ELIGIBLE RESERVES");
  console.log("----------------------------------------------");

  printLine(
    "RT USDT",
    `$${rtBalance.toFixed(6)}`
  );

  printLine(
    "OT USDT",
    `$${otBalance.toFixed(6)}`
  );

  printLine(
    "RT + OT Reserves",
    `$${eligibleReserves.toFixed(6)}`
  );

  // ===================================================
  // 5. LOCAL AV CALCULATION
  // ===================================================

  const localAV =
    combinedObligation > 0
      ? eligibleReserves / combinedObligation
      : 0;

  console.log("\n----------------------------------------------");
  console.log("LOCAL AV CALCULATION");
  console.log("----------------------------------------------");

  printLine(
    "Eligible Reserves",
    `$${eligibleReserves.toFixed(6)}`
  );

  printLine(
    "Combined Obligation",
    combinedObligation.toFixed(12)
  );

  printLine(
    "Local Calculated AV",
    `$${localAV.toFixed(8)} / ARDE`
  );

  // ===================================================
  // 6. PRICE ORACLE AV
  // ===================================================

  console.log("\n----------------------------------------------");
  console.log("PRICE ORACLE AV");
  console.log("----------------------------------------------");

  let oracleAV;

  try {
    const oracleAVRaw = await client.readContract({
      address: PRICE_ORACLE,
      abi: priceOracleAbi,
      functionName: "anchorValue",
    });

    oracleAV = toNumber(oracleAVRaw, 18);

    printLine(
      "On-chain Oracle AV",
      `$${oracleAV.toFixed(8)} / ARDE`
    );

  } catch (error) {
    console.log(
      "⚠️ Could not read anchorValue() from PriceOracle."
    );

    console.log(
      "Check the actual AV getter name in the PriceOracle ABI."
    );

    console.log("\nERROR:");
    console.log(error.shortMessage || error.message);

    process.exit(1);
  }

  // ===================================================
  // 7. LOCAL VS ORACLE
  // ===================================================

  const difference =
    localAV - oracleAV;

  const differencePercent =
    pctDifference(localAV, oracleAV);

  console.log("\n----------------------------------------------");
  console.log("LOCAL VS ON-CHAIN AV");
  console.log("----------------------------------------------");

  printLine(
    "Local AV",
    `$${localAV.toFixed(8)}`
  );

  printLine(
    "Oracle AV",
    `$${oracleAV.toFixed(8)}`
  );

  printLine(
    "Difference",
    `$${difference.toFixed(8)}`
  );

  printLine(
    "Difference %",
    `${differencePercent.toFixed(4)}%`
  );

  // ===================================================
  // 8. RESULT
  // ===================================================

  const tolerance = 0.0001;

  const avMatch =
    Math.abs(difference) <= tolerance;

  console.log("\n----------------------------------------------");
  console.log("AV CONSISTENCY RESULT");
  console.log("----------------------------------------------");

  if (avMatch) {
    console.log(
      "PASS ✅ Local AV matches PriceOracle AV."
    );
  } else {
    console.log(
      "CHECK ⚠️ Local AV does NOT match PriceOracle AV."
    );

    console.log(
      "\nThis means the PriceOracle is using a different"
    );

    console.log(
      "asset/obligation calculation than this QA reconstruction."
    );
  }

  // ===================================================
  // 9. DEV TARGET INFORMATION
  // ===================================================

  console.log("\n----------------------------------------------");
  console.log("DEV AV TARGET");
  console.log("----------------------------------------------");

  console.log(
    `Developer reported target/current AV: ~$0.85`
  );

  if (Math.abs(oracleAV - 0.85) <= 0.01) {
    console.log(
      "PASS ✅ PriceOracle AV is approximately $0.85."
    );
  } else {
    console.log(
      `INFO ℹ️ Current PriceOracle AV is $${oracleAV.toFixed(8)}`
    );
  }

  // ===================================================
  // FINAL
  // ===================================================

  console.log("\n==============================================");
  console.log("FINAL RESULT");
  console.log("==============================================");

  console.log(
    `Local Combined AV : $${localAV.toFixed(8)}`
  );

  console.log(
    `PriceOracle AV     : $${oracleAV.toFixed(8)}`
  );

  if (avMatch) {
    console.log(
      "\nPASS ✅ Combined Staking + Presale calculation"
    );
    console.log(
      "matches the PriceOracle."
    );
  } else {
    console.log(
      "\n⚠️ QA REVIEW REQUIRED"
    );
    console.log(
      "Local calculation and PriceOracle calculation differ."
    );
  }

  console.log("\n");
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED");
  console.error(err);
  process.exit(1);
});