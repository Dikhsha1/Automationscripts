import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  parseAbi,
  defineChain,
} from "viem";

// =====================================================
// CONFIG
// =====================================================

const RPC_URL = process.env.RPC_URL || "https://chain.sotto.li";
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const SSP = "0x255e44e7Fec5410fF4f360b5d9C9981b6D7ed208";

const PRICE_ORACLE =
  "0x69755e4313fa237527f906d62e04cd79aee10176";

const USDT =
  "0x103df201ed80eE00FfE2f694C49926c7F0d42d72";

const DAGR =
  "0x59B95C628d9cEdb0077E5BfE1447C50F974341C5";

// =====================================================
// CHAIN
// =====================================================

const chain = defineChain({
  id: CHAIN_ID,
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

const client = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

// =====================================================
// ABI
// =====================================================

const oracleAbi = parseAbi([
  "function anchorValue() view returns (uint256)",
  "function getAnchorValue() view returns (uint256)",
  "function priceIndex() view returns (uint256)",
  "function PI() view returns (uint256)",
  "function marketPrice() view returns (uint256)",
  "function getMarketPrice() view returns (uint256)",
]);

const sspAbi = parseAbi([
  "function canSkim() view returns (bool)",
  "function piThreshold() view returns (uint256)",
  "function skimBps() view returns (uint256)",
  "function floorUSDT() view returns (uint256)",
]);

// =====================================================
// SAFE READ
// =====================================================

async function tryRead(address, abi, functionName) {
  try {
    const value = await client.readContract({
      address,
      abi,
      functionName,
    });

    return value;
  } catch {
    return null;
  }
}

// =====================================================
// MAIN
// =====================================================

async function main() {

  console.log("\n==============================================");
  console.log("          ARDEN PI GATE QA TEST");
  console.log("==============================================");

  console.log("RPC          :", RPC_URL);
  console.log("Chain ID     :", CHAIN_ID);
  console.log("SSP          :", SSP);
  console.log("PriceOracle  :", PRICE_ORACLE);

  // =================================================
  // 1. READ AV
  // =================================================

  console.log("\n----------------------------------------------");
  console.log("ANCHOR VALUE (AV)");
  console.log("----------------------------------------------");

  let avRaw =
    await tryRead(
      PRICE_ORACLE,
      oracleAbi,
      "anchorValue"
    );

  if (avRaw === null) {
    avRaw =
      await tryRead(
        PRICE_ORACLE,
        oracleAbi,
        "getAnchorValue"
      );
  }

  let av = null;

  if (avRaw !== null) {
    av = Number(formatUnits(avRaw, 18));

    console.log(
      "Anchor Value:",
      av.toFixed(8),
      "USDT/DAGR"
    );
  } else {
    console.log("❌ AV getter not found.");
  }

  // =================================================
  // 2. READ MARKET PRICE
  // =================================================

  console.log("\n----------------------------------------------");
  console.log("MARKET PRICE");
  console.log("----------------------------------------------");

  let priceRaw =
    await tryRead(
      PRICE_ORACLE,
      oracleAbi,
      "marketPrice"
    );

  if (priceRaw === null) {
    priceRaw =
      await tryRead(
        PRICE_ORACLE,
        oracleAbi,
        "getMarketPrice"
      );
  }

  let marketPrice = null;

  if (priceRaw !== null) {

    marketPrice =
      Number(formatUnits(priceRaw, 18));

    console.log(
      "Market Price:",
      marketPrice.toFixed(8),
      "USDT/DAGR"
    );

  } else {

    console.log(
      "❌ Market price getter not found."
    );
  }

  // =================================================
  // 3. READ ON-CHAIN PI
  // =================================================

  console.log("\n----------------------------------------------");
  console.log("ON-CHAIN PI");
  console.log("----------------------------------------------");

  let piRaw =
    await tryRead(
      PRICE_ORACLE,
      oracleAbi,
      "priceIndex"
    );

  if (piRaw === null) {
    piRaw =
      await tryRead(
        PRICE_ORACLE,
        oracleAbi,
        "PI"
      );
  }

  let onChainPI = null;

  if (piRaw !== null) {

    onChainPI =
      Number(formatUnits(piRaw, 18));

    console.log(
      "On-chain PI:",
      onChainPI.toFixed(8)
    );

  } else {

    console.log(
      "⚠️ On-chain PI getter unavailable."
    );
  }

  // =================================================
  // 4. LOCAL PI CALCULATION
  // =================================================

  console.log("\n----------------------------------------------");
  console.log("LOCAL PI CALCULATION");
  console.log("----------------------------------------------");

  let calculatedPI = null;

  if (
    av !== null &&
    marketPrice !== null &&
    av > 0
  ) {

    calculatedPI =
      marketPrice / av;

    console.log(
      "Formula:",
      "PI = Market Price / AV"
    );

    console.log(
      "Market Price:",
      marketPrice.toFixed(8)
    );

    console.log(
      "AV:",
      av.toFixed(8)
    );

    console.log(
      "Calculated PI:",
      calculatedPI.toFixed(8)
    );

  } else {

    console.log(
      "❌ Cannot calculate PI."
    );
  }

  // =================================================
  // 5. READ SSP GATES
  // =================================================

  console.log("\n----------------------------------------------");
  console.log("SSP PI GATE CONFIGURATION");
  console.log("----------------------------------------------");

  const thresholdRaw =
    await tryRead(
      SSP,
      sspAbi,
      "piThreshold"
    );

  const skimBpsRaw =
    await tryRead(
      SSP,
      sspAbi,
      "skimBps"
    );

  const floorRaw =
    await tryRead(
      SSP,
      sspAbi,
      "floorUSDT"
    );

  const canSkim =
    await tryRead(
      SSP,
      sspAbi,
      "canSkim"
    );

  if (thresholdRaw !== null) {

    const threshold =
      Number(formatUnits(thresholdRaw, 18));

    console.log(
      "PI Threshold:",
      threshold.toFixed(2)
    );
  }

  if (skimBpsRaw !== null) {

    console.log(
      "Skim BPS:",
      skimBpsRaw.toString(),
      `(${Number(skimBpsRaw) / 100}%)`
    );
  }

  if (floorRaw !== null) {

    console.log(
      "Pool Floor:",
      formatUnits(floorRaw, 6),
      "USDT"
    );
  }

  console.log(
    "canSkim():",
    canSkim === null
      ? "NOT AVAILABLE"
      : canSkim
  );

  // =================================================
  // 6. PI GATE VERDICT
  // =================================================

  console.log("\n==============================================");
  console.log("              PI GATE VERDICT");
  console.log("==============================================");

  if (calculatedPI !== null) {

    const threshold =
      thresholdRaw !== null
        ? Number(formatUnits(thresholdRaw, 18))
        : 1.30;

    console.log(
      `Current PI      : ${calculatedPI.toFixed(8)}`
    );

    console.log(
      `Required PI     : ${threshold.toFixed(2)}`
    );

    if (calculatedPI >= threshold) {

      console.log(
        "PI GATE         : PASS ✅"
      );

      console.log(
        "Expected        : Qualifying buy MAY skim"
      );

    } else {

      console.log(
        "PI GATE         : BLOCKED ❌"
      );

      console.log(
        "Expected        : Qualifying buy must NOT skim"
      );
    }

  } else {

    console.log(
      "PI GATE         : UNABLE TO DETERMINE ⚠️"
    );
  }

  console.log("\n==============================================");
  console.log("                 TEST END");
  console.log("==============================================\n");
}

main().catch((error) => {

  console.error("\n❌ TEST FAILED");
  console.error(error);

  process.exit(1);
});