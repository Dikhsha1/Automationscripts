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

const RPC_URL =
  process.env.RPC_URL || "https://chain.sotto.li";

const STAKING_ENGINE =
  process.env.STAKING_ENGINE;

const PRESALE_CONTRACT =
  process.env.PRESALE_CONTRACT;

const PRICE_ORACLE =
  process.env.PRICE_ORACLE;

// Reserve Treasury
const RT_ADDRESS =
  process.env.RT_ADDRESS ||
  "0x37759FBCaA5c39f761d9c422B31F2158Bd28d221";

// Operations Treasury
const OT_ADDRESS =
  process.env.OT_ADDRESS ||
  "0x63B89457edf03DFBdeEbe5E8ea083DFa58e68Fc3";

// USDT
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

// Used by BOTH StakingEngine and Presale.
//
// Returns:
//
// 0 = totalStakedOut
// 1 = approxRewards
// 2 = netAccrued
// 3 = totalObligation
//
const obligationAbi = parseAbi([
  "function getObligationView() view returns (uint256 totalStakedOut, uint256 approxRewards, uint256 netAccrued, uint256 totalObligation)",
]);

// =====================================================
// TOKEN ABI
// =====================================================

const tokenAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

// =====================================================
// PRICE ORACLE ABI
// =====================================================

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
  console.log(
    `${label.padEnd(35)} ${value}`
  );
}

function percentDifference(a, b) {
  if (b === 0) return 0;

  return ((a - b) / b) * 100;
}

// =====================================================
// MAIN
// =====================================================

async function main() {

  console.log("");
  console.log("================================================");
  console.log("       ARDEN AV + OBLIGATION QA TEST");
  console.log("================================================");

  console.log(`RPC: ${RPC_URL}`);
  console.log(`Chain ID: ${chain.id}`);

  // ===================================================
  // CONFIG VALIDATION
  // ===================================================

  if (!STAKING_ENGINE) {
    throw new Error(
      "Missing STAKING_ENGINE in .env"
    );
  }

  if (!PRESALE_CONTRACT) {
    throw new Error(
      "Missing PRESALE_CONTRACT in .env"
    );
  }

  if (!PRICE_ORACLE) {
    throw new Error(
      "Missing PRICE_ORACLE in .env"
    );
  }

  console.log("");
  console.log("CONTRACTS");
  console.log("-----------------------------------------------");

  printLine(
    "Staking Engine",
    STAKING_ENGINE
  );

  printLine(
    "Presale",
    PRESALE_CONTRACT
  );

  printLine(
    "Price Oracle",
    PRICE_ORACLE
  );

  printLine(
    "Reserve Treasury",
    RT_ADDRESS
  );

  printLine(
    "Operations Treasury",
    OT_ADDRESS
  );

  printLine(
    "USDT",
    USDT_ADDRESS
  );

  // ===================================================
  // BLOCK SNAPSHOT
  // ===================================================

  const block = await client.getBlock();

  console.log("");
  console.log("-----------------------------------------------");
  console.log("CHAIN SNAPSHOT");
  console.log("-----------------------------------------------");

  printLine(
    "Block",
    block.number.toString()
  );

  printLine(
    "Block Timestamp",
    block.timestamp.toString()
  );

  printLine(
    "Block Time",
    new Date(
      Number(block.timestamp) * 1000
    ).toISOString()
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

  const stakingPrincipal =
    toNumber(
      stakingPrincipalRaw,
      18
    );

  const stakingApproxRewards =
    toNumber(
      stakingApproxRewardsRaw,
      18
    );

  const stakingNetAccrued =
    toNumber(
      stakingNetAccruedRaw,
      18
    );

  const stakingObligation =
    toNumber(
      stakingTotalRaw,
      18
    );

  // ===================================================
  // STAKING OUTPUT
  // ===================================================

  console.log("");
  console.log("-----------------------------------------------");
  console.log("1. STAKING OBLIGATION");
  console.log("-----------------------------------------------");

  printLine(
    "Staked Principal",
    `${stakingPrincipal} ARDE`
  );

  printLine(
    "Approx Rewards",
    `${stakingApproxRewards} ARDE`
  );

  printLine(
    "Net Accrued",
    `${stakingNetAccrued} ARDE`
  );

  printLine(
    "Total Staking Obligation",
    `${stakingObligation} ARDE`
  );

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

  const presalePrincipal =
    toNumber(
      presalePrincipalRaw,
      18
    );

  const presaleApproxRewards =
    toNumber(
      presaleApproxRewardsRaw,
      18
    );

  const presaleNetAccrued =
    toNumber(
      presaleNetAccruedRaw,
      18
    );

  const presaleObligation =
    toNumber(
      presaleTotalRaw,
      18
    );

  // ===================================================
  // PRESALE OUTPUT
  // ===================================================

  console.log("");
  console.log("-----------------------------------------------");
  console.log("2. PRESALE OBLIGATION");
  console.log("-----------------------------------------------");

  printLine(
    "Presale Principal",
    `${presalePrincipal} ARDE`
  );

  printLine(
    "Presale Approx Rewards",
    `${presaleApproxRewards} ARDE`
  );

  printLine(
    "Presale Net Accrued",
    `${presaleNetAccrued} ARDE`
  );

  printLine(
    "Total Presale Obligation",
    `${presaleObligation} ARDE`
  );

  // ===================================================
  // 3. COMBINED OBLIGATION
  // ===================================================

  const combinedPrincipal =
    stakingPrincipal +
    presalePrincipal;

  const combinedApproxRewards =
    stakingApproxRewards +
    presaleApproxRewards;

  const combinedNetAccrued =
    stakingNetAccrued +
    presaleNetAccrued;

  const combinedObligation =
    stakingObligation +
    presaleObligation;

  // ===================================================
  // COMBINED OUTPUT
  // ===================================================

  console.log("");
  console.log("-----------------------------------------------");
  console.log("3. COMBINED OBLIGATION");
  console.log("-----------------------------------------------");

  printLine(
    "Staking Obligation",
    `${stakingObligation.toFixed(12)} ARDE`
  );

  printLine(
    "Presale Obligation",
    `${presaleObligation.toFixed(12)} ARDE`
  );

  console.log("");

  printLine(
    "Combined Principal",
    `${combinedPrincipal.toFixed(12)} ARDE`
  );

  printLine(
    "Combined Approx Rewards",
    `${combinedApproxRewards.toFixed(12)} ARDE`
  );

  printLine(
    "Combined Net Accrued",
    `${combinedNetAccrued.toFixed(12)} ARDE`
  );

  printLine(
    "COMBINED OBLIGATION",
    `${combinedObligation.toFixed(12)} ARDE`
  );

  // ===================================================
  // 4. USDT DECIMALS
  // ===================================================

  const usdtDecimals =
    await client.readContract({
      address: USDT_ADDRESS,
      abi: tokenAbi,
      functionName: "decimals",
    });

  console.log("");
  console.log("-----------------------------------------------");
  console.log("4. USDT");
  console.log("-----------------------------------------------");

  printLine(
    "USDT Decimals",
    usdtDecimals.toString()
  );

  // ===================================================
  // 5. RESERVE TREASURY BALANCE
  // ===================================================

  const rtBalanceRaw =
    await client.readContract({
      address: USDT_ADDRESS,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [RT_ADDRESS],
    });

  const rtBalance =
    toNumber(
      rtBalanceRaw,
      usdtDecimals
    );

  // ===================================================
  // 6. OPERATIONS TREASURY BALANCE
  // ===================================================

  const otBalanceRaw =
    await client.readContract({
      address: USDT_ADDRESS,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [OT_ADDRESS],
    });

  const otBalance =
    toNumber(
      otBalanceRaw,
      usdtDecimals
    );

  // ===================================================
  // 7. TOTAL ELIGIBLE RESERVES
  // ===================================================

  const eligibleReserves =
    rtBalance +
    otBalance;

  console.log("");
  console.log("-----------------------------------------------");
  console.log("5. ELIGIBLE RESERVES");
  console.log("-----------------------------------------------");

  printLine(
    "Reserve Treasury USDT",
    `$${rtBalance.toFixed(6)}`
  );

  printLine(
    "Operations Treasury USDT",
    `$${otBalance.toFixed(6)}`
  );

  console.log("");

  printLine(
    "TOTAL ELIGIBLE RESERVES",
    `$${eligibleReserves.toFixed(6)}`
  );

  // ===================================================
  // 8. LOCAL AV
  // ===================================================

  const localAV =
    combinedObligation > 0
      ? eligibleReserves /
        combinedObligation
      : 0;

  console.log("");
  console.log("-----------------------------------------------");
  console.log("6. LOCAL ANCHOR VALUE");
  console.log("-----------------------------------------------");

  console.log(
    "Formula:"
  );

  console.log(
    "AV = (RT USDT + OT USDT) / Combined Obligation"
  );

  console.log("");

  printLine(
    "Eligible Reserves",
    `$${eligibleReserves.toFixed(6)}`
  );

  printLine(
    "Combined Obligation",
    `${combinedObligation.toFixed(12)} ARDE`
  );

  printLine(
    "LOCAL AV",
    `$${localAV.toFixed(8)} / ARDE`
  );

  // ===================================================
  // 9. PRICE ORACLE AV
  // ===================================================

  let oracleAV = null;

  console.log("");
  console.log("-----------------------------------------------");
  console.log("7. PRICE ORACLE AV");
  console.log("-----------------------------------------------");

  try {

    const oracleAVRaw =
      await client.readContract({
        address: PRICE_ORACLE,
        abi: priceOracleAbi,
        functionName: "anchorValue",
      });

    oracleAV =
      toNumber(
        oracleAVRaw,
        18
      );

    printLine(
      "On-chain Oracle AV",
      `$${oracleAV.toFixed(8)} / ARDE`
    );

  } catch (error) {

    console.log(
      "⚠️ Could not read anchorValue()"
    );

    console.log(
      "Check the actual PriceOracle ABI/getter."
    );

    console.log("");

    console.log(
      error.shortMessage ||
      error.message
    );
  }

  // ===================================================
  // 10. LOCAL VS ORACLE
  // ===================================================

  if (oracleAV !== null) {

    const difference =
      localAV -
      oracleAV;

    const differencePercent =
      percentDifference(
        localAV,
        oracleAV
      );

    console.log("");
    console.log("-----------------------------------------------");
    console.log("8. LOCAL AV VS ORACLE AV");
    console.log("-----------------------------------------------");

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

  }

  // ===================================================
  // 11. EXPECTED DEV VALUE
  // ===================================================

  console.log("");
  console.log("-----------------------------------------------");
  console.log("9. DEV REPORTED AV");
  console.log("-----------------------------------------------");

  console.log(
    "Developer brief: approximately $0.85"
  );

  console.log("");

  printLine(
    "Calculated Local AV",
    `$${localAV.toFixed(8)}`
  );

  if (oracleAV !== null) {

    printLine(
      "Oracle AV",
      `$${oracleAV.toFixed(8)}`
    );

    printLine(
      "Difference from $0.85",
      `$${(oracleAV - 0.85).toFixed(8)}`
    );
  }

  // ===================================================
  // 12. FINAL QA SUMMARY
  // ===================================================

  console.log("");
  console.log("================================================");
  console.log("                 FINAL QA RESULT");
  console.log("================================================");

  console.log("");

  console.log(
    `Staking Obligation : ${stakingObligation.toFixed(12)} ARDE`
  );

  console.log(
    `Presale Obligation : ${presaleObligation.toFixed(12)} ARDE`
  );

  console.log(
    `Combined Obligation: ${combinedObligation.toFixed(12)} ARDE`
  );

  console.log("");

  console.log(
    `RT USDT            : $${rtBalance.toFixed(6)}`
  );

  console.log(
    `OT USDT            : $${otBalance.toFixed(6)}`
  );

  console.log(
    `Eligible Reserves  : $${eligibleReserves.toFixed(6)}`
  );

  console.log("");

  console.log(
    `LOCAL AV           : $${localAV.toFixed(8)}`
  );

  if (oracleAV !== null) {

    console.log(
      `ORACLE AV          : $${oracleAV.toFixed(8)}`
    );

    const diff =
      Math.abs(
        localAV -
        oracleAV
      );

    console.log("");

    if (diff <= 0.0001) {

      console.log(
        "PASS ✅ Local AV matches PriceOracle AV."
      );

    } else {

      console.log(
        "CHECK ⚠️ Local AV differs from PriceOracle AV."
      );

      console.log(
        "This means PriceOracle is using a different"
      );

      console.log(
        "reserve or obligation definition."
      );
    }
  }

  console.log("");
  console.log("================================================");
  console.log("                    END");
  console.log("================================================");
  console.log("");
}

// =====================================================
// ERROR HANDLER
// =====================================================

main().catch((error) => {

  console.error("");
  console.error("❌ SCRIPT FAILED");
  console.error("");

  console.error(
    error.shortMessage ||
    error.message ||
    error
  );

  process.exit(1);
});