import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  parseAbi,
  defineChain,
} from "viem";

// =====================================================
// ARDEN UAT CONFIGURATION
// =====================================================

const RPC_URL = process.env.RPC_URL || "https://chain.sotto.li";
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

// =====================================================
// UAT ADDRESSES
// =====================================================

const USDT =
  "0x103df201ed80eE00FfE2f694C49926c7F0d42d72";

const DAGR =
  "0xDCf82998bE1c95222816538C2dE514534804206b";

// Strategic Swap Pool / SSP
const SSP =
  "0x0F43Cde9eb5017CD28b2BF4Fc508698Ff8BD6aD3";

// Price Oracle
const PRICE_ORACLE =
  "0x8350C9cabC24A0acaCc074BaCd59AAd228D1Eb81";

// Additional UAT contracts for reference
const POOL_GUARD =
  "0xBAa6f2c4bf2715F67dDAb54694cd4c10F111df15";

const RESERVE_TREASURY =
  "0x37759FBCaA5c39f761d9c422B31F2158Bd28d221";

const LIQUIDITY_GUARD =
  "0x2245116AF09D41c5D0108C79e2Cab530a7D7Ec17";

// =====================================================
// CHAIN
// =====================================================

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

// =====================================================
// PRICE ORACLE ABI
// =====================================================

const oracleAbi = parseAbi([
  "function anchorValue() view returns (uint256)",
  "function getAnchorValue() view returns (uint256)",

  "function priceIndex() view returns (uint256)",
  "function PI() view returns (uint256)",

  "function marketPrice() view returns (uint256)",
  "function getMarketPrice() view returns (uint256)",
]);

// =====================================================
// SSP ABI
// =====================================================

const sspAbi = parseAbi([
  "function canSkim() view returns (bool)",
  "function piThreshold() view returns (uint256)",
  "function skimBps() view returns (uint256)",
  "function floorUSDT() view returns (uint256)",
]);

// =====================================================
// SAFE READ
// =====================================================

async function tryRead(
  address,
  abi,
  functionName
) {
  try {
    return await client.readContract({
      address,
      abi,
      functionName,
    });
  } catch (error) {
    return null;
  }
}

// =====================================================
// MAIN
// =====================================================

async function main() {

  console.log("\n==============================================");
  console.log("           ARDEN UAT PI INDEX QA");
  console.log("==============================================");

  console.log("RPC             :", RPC_URL);
  console.log("Chain ID        :", CHAIN_ID);

  console.log("\nUAT CONTRACTS");
  console.log("----------------------------------------------");
  console.log("USDT            :", USDT);
  console.log("DAGR            :", DAGR);
  console.log("Strategic Pool  :", SSP);
  console.log("Price Oracle    :", PRICE_ORACLE);
  console.log("Pool Guard      :", POOL_GUARD);
  console.log("Reserve Treasury:", RESERVE_TREASURY);
  console.log("Liquidity Guard :", LIQUIDITY_GUARD);

  // =================================================
  // 1. ANCHOR VALUE
  // =================================================

  console.log("\n----------------------------------------------");
  console.log("1. ANCHOR VALUE");
  console.log("----------------------------------------------");

  let avRaw = await tryRead(
    PRICE_ORACLE,
    oracleAbi,
    "anchorValue"
  );

  let avGetter = "anchorValue()";

  if (avRaw === null) {

    avRaw = await tryRead(
      PRICE_ORACLE,
      oracleAbi,
      "getAnchorValue"
    );

    avGetter = "getAnchorValue()";
  }

  let av = null;

  if (avRaw !== null) {

    av = Number(
      formatUnits(avRaw, 18)
    );

    console.log(
      "Getter       :",
      avGetter
    );

    console.log(
      "Anchor Value :",
      av.toFixed(8),
      "USDT/DAGR"
    );

  } else {

    console.log(
      "❌ Anchor Value getter unavailable"
    );
  }

  // =================================================
  // 2. MARKET PRICE
  // =================================================

  console.log("\n----------------------------------------------");
  console.log("2. MARKET PRICE");
  console.log("----------------------------------------------");

  let priceRaw = await tryRead(
    PRICE_ORACLE,
    oracleAbi,
    "marketPrice"
  );

  let priceGetter = "marketPrice()";

  if (priceRaw === null) {

    priceRaw = await tryRead(
      PRICE_ORACLE,
      oracleAbi,
      "getMarketPrice"
    );

    priceGetter = "getMarketPrice()";
  }

  let marketPrice = null;

  if (priceRaw !== null) {

    marketPrice = Number(
      formatUnits(priceRaw, 18)
    );

    console.log(
      "Getter       :",
      priceGetter
    );

    console.log(
      "Market Price :",
      marketPrice.toFixed(8),
      "USDT/DAGR"
    );

  } else {

    console.log(
      "❌ Market Price getter unavailable"
    );
  }

  // =================================================
  // 3. ON-CHAIN PI
  // =================================================

  console.log("\n----------------------------------------------");
  console.log("3. ON-CHAIN PI");
  console.log("----------------------------------------------");

  let piRaw = await tryRead(
    PRICE_ORACLE,
    oracleAbi,
    "priceIndex"
  );

  let piGetter = "priceIndex()";

  if (piRaw === null) {

    piRaw = await tryRead(
      PRICE_ORACLE,
      oracleAbi,
      "PI"
    );

    piGetter = "PI()";
  }

  let onChainPI = null;

  if (piRaw !== null) {

    onChainPI = Number(
      formatUnits(piRaw, 18)
    );

    console.log(
      "Getter      :",
      piGetter
    );

    console.log(
      "On-chain PI :",
      onChainPI.toFixed(8)
    );

  } else {

    console.log(
      "⚠️ On-chain PI getter unavailable"
    );
  }

  // =================================================
  // 4. LOCAL PI CALCULATION
  // =================================================

  console.log("\n----------------------------------------------");
  console.log("4. LOCAL PI CALCULATION");
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
      "Formula      : Market Price / Anchor Value"
    );

    console.log(
      "Market Price :",
      marketPrice.toFixed(8)
    );

    console.log(
      "Anchor Value :",
      av.toFixed(8)
    );

    console.log(
      "Calculated PI:",
      calculatedPI.toFixed(8)
    );

  } else {

    console.log(
      "❌ Cannot calculate PI"
    );
  }

  // =================================================
  // 5. PI CONSISTENCY
  // =================================================

  console.log("\n----------------------------------------------");
  console.log("5. PI CONSISTENCY CHECK");
  console.log("----------------------------------------------");

  let piDifference = null;

  if (
    onChainPI !== null &&
    calculatedPI !== null
  ) {

    piDifference =
      Math.abs(
        onChainPI - calculatedPI
      );

    console.log(
      "On-chain PI :",
      onChainPI.toFixed(8)
    );

    console.log(
      "Local PI    :",
      calculatedPI.toFixed(8)
    );

    console.log(
      "Difference  :",
      piDifference.toFixed(8)
    );

    const PI_TOLERANCE = 0.00000001;

    if (
      piDifference <= PI_TOLERANCE
    ) {

      console.log(
        "PI CONSISTENCY: PASS ✅"
      );

    } else {

      console.log(
        "PI CONSISTENCY: FAIL ❌"
      );
    }

  } else {

    console.log(
      "⚠️ PI consistency unavailable"
    );
  }

  // =================================================
  // 6. SSP GATES
  // =================================================

  console.log("\n----------------------------------------------");
  console.log("6. SSP PI GATE CONFIGURATION");
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

  let threshold = null;

  if (thresholdRaw !== null) {

    threshold =
      Number(
        formatUnits(
          thresholdRaw,
          18
        )
      );

    console.log(
      "PI Threshold :",
      threshold.toFixed(8)
    );

  } else {

    console.log(
      "⚠️ piThreshold() unavailable"
    );
  }

  if (skimBpsRaw !== null) {

    console.log(
      "Skim BPS     :",
      skimBpsRaw.toString()
    );

    console.log(
      "Skim %       :",
      `${Number(skimBpsRaw) / 100}%`
    );

  } else {

    console.log(
      "⚠️ skimBps() unavailable"
    );
  }

  if (floorRaw !== null) {

    console.log(
      "Pool Floor   :",
      formatUnits(
        floorRaw,
        6
      ),
      "USDT"
    );

  } else {

    console.log(
      "⚠️ floorUSDT() unavailable"
    );
  }

  console.log(
    "canSkim()    :",
    canSkim === null
      ? "NOT AVAILABLE"
      : canSkim
  );

  // =================================================
  // 7. PI GATE VERDICT
  // =================================================

  console.log("\n==============================================");
  console.log("              PI GATE VERDICT");
  console.log("==============================================");

  let piGatePass = false;

  if (
    calculatedPI !== null &&
    threshold !== null
  ) {

    console.log(
      "Current PI   :",
      calculatedPI.toFixed(8)
    );

    console.log(
      "Required PI  :",
      threshold.toFixed(8)
    );

    if (
      calculatedPI >= threshold
    ) {

      piGatePass = true;

      console.log(
        "PI GATE      : PASS ✅"
      );

      console.log(
        "Expected     : Qualifying buy MAY skim"
      );

    } else {

      console.log(
        "PI GATE      : BLOCKED ❌"
      );

      console.log(
        "Expected     : Qualifying buy MUST NOT skim"
      );
    }

  } else {

    console.log(
      "PI GATE      : UNABLE TO DETERMINE ⚠️"
    );
  }

  // =================================================
  // 8. canSkim CONSISTENCY
  // =================================================

  console.log("\n----------------------------------------------");
  console.log("8. canSkim() CONSISTENCY");
  console.log("----------------------------------------------");

  if (
    calculatedPI !== null &&
    threshold !== null &&
    canSkim !== null
  ) {

    const piQualifies =
      calculatedPI >= threshold;

    console.log(
      "PI qualifies:",
      piQualifies
    );

    console.log(
      "canSkim()   :",
      canSkim
    );

    if (
      piQualifies === canSkim
    ) {

      console.log(
        "GATE CONSISTENCY: PASS ✅"
      );

    } else {

      console.log(
        "GATE CONSISTENCY: FAIL ❌"
      );
    }

  } else {

    console.log(
      "⚠️ Cannot compare PI and canSkim()"
    );
  }

  // =================================================
  // 9. FINAL UAT SUMMARY
  // =================================================

  console.log("\n==============================================");
  console.log("                UAT SUMMARY");
  console.log("==============================================");

  console.log(
    "AV                 :",
    av !== null
      ? av.toFixed(8)
      : "N/A"
  );

  console.log(
    "Market Price       :",
    marketPrice !== null
      ? marketPrice.toFixed(8)
      : "N/A"
  );

  console.log(
    "On-chain PI        :",
    onChainPI !== null
      ? onChainPI.toFixed(8)
      : "N/A"
  );

  console.log(
    "Calculated PI      :",
    calculatedPI !== null
      ? calculatedPI.toFixed(8)
      : "N/A"
  );

  console.log(
    "PI Threshold       :",
    threshold !== null
      ? threshold.toFixed(8)
      : "N/A"
  );

  console.log(
    "canSkim()          :",
    canSkim === null
      ? "N/A"
      : canSkim
  );

  console.log(
    "StrategicSwapPool  :",
    SSP
  );

  console.log(
    "PriceOracle        :",
    PRICE_ORACLE
  );

  console.log("----------------------------------------------");

  if (piGatePass) {

    console.log(
      "FINAL PI RESULT    : PASS ✅"
    );

  } else {

    console.log(
      "FINAL PI RESULT    : BLOCKED / FAIL ❌"
    );
  }

  console.log("==============================================");
  console.log("                 TEST END");
  console.log("==============================================\n");
}

// =====================================================
// ERROR HANDLER
// =====================================================

main().catch((error) => {

  console.error("\n❌ UAT TEST FAILED");
  console.error(error);

  process.exit(1);
});