import {
  createPublicClient,
  http,
  formatUnits,
  parseUnits
} from "viem";

import { config } from "./config.js";
import { sspAbi } from "./sspAbi.js";

const publicClient = createPublicClient({
  transport: http(config.RPC)
});

// ============================================================
// TEST INPUT
// ============================================================

const USDT_AMOUNT = "10000";
const SLIPPAGE_PERCENT = 0.6;

// ============================================================
// ERC20 ABI
// ============================================================

const erc20Abi = [
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view"
  }
];

// ============================================================
// MAIN
// ============================================================

async function main() {

  console.log("\n==============================================");
  console.log("       ARDEN LIVE SWAP CALCULATION");
  console.log("==============================================");

  // ----------------------------------------------------------
  // 1. Token decimals
  // ----------------------------------------------------------

  const usdtDecimals = await publicClient.readContract({
    address: config.USDT,
    abi: erc20Abi,
    functionName: "decimals"
  });

  const ardeDecimals = await publicClient.readContract({
    address: config.ARDE,
    abi: erc20Abi,
    functionName: "decimals"
  });

  console.log("\nTOKEN INFORMATION");
  console.log("----------------------------------------------");
  console.log("USDT decimals :", usdtDecimals);
  console.log("ARDE decimals :", ardeDecimals);

  // ----------------------------------------------------------
  // 2. Input amount
  // ----------------------------------------------------------

  const amountIn = parseUnits(
    USDT_AMOUNT,
    usdtDecimals
  );

  // ----------------------------------------------------------
  // 3. LIVE SSP QUOTE
  // ----------------------------------------------------------

  const out = await publicClient.readContract({
    address: config.SSP,
    abi: sspAbi,
    functionName: "getAmountsOut",
    args: [
      amountIn,
      [config.USDT, config.ARDE],
      config.WALLET
    ]
  });

  const quotedArde = out[1];

  // ----------------------------------------------------------
  // 4. Format quote
  // ----------------------------------------------------------

  const quotedArdeFormatted =
    formatUnits(quotedArde, ardeDecimals);

  // ----------------------------------------------------------
  // 5. Effective execution rate
  // ----------------------------------------------------------

  const executionRate =
    Number(quotedArdeFormatted) /
    Number(USDT_AMOUNT);

  // ----------------------------------------------------------
  // 6. Slippage calculation
  // ----------------------------------------------------------

  const slippageBps =
    BigInt(Math.round(SLIPPAGE_PERCENT * 100));

  const minimumReceived =
    (
      quotedArde *
      (10_000n - slippageBps)
    ) / 10_000n;

  const slippageAmount =
    quotedArde - minimumReceived;

  // ----------------------------------------------------------
  // 7. Output
  // ----------------------------------------------------------

  console.log("\nINPUT");
  console.log("----------------------------------------------");

  console.log(
    "USDT Input        :",
    formatUnits(amountIn, usdtDecimals),
    "USDT"
  );

  console.log("\nLIVE CONTRACT QUOTE");
  console.log("----------------------------------------------");

  console.log(
    "Quoted ARDE       :",
    quotedArdeFormatted,
    "ARDE"
  );

  console.log(
    "Effective Rate    :",
    executionRate.toFixed(10),
    "ARDE / USDT"
  );

  console.log("\nSLIPPAGE");
  console.log("----------------------------------------------");

  console.log(
    "Slippage          :",
    SLIPPAGE_PERCENT,
    "%"
  );

  console.log(
    "Slippage Amount   :",
    formatUnits(
      slippageAmount,
      ardeDecimals
    ),
    "ARDE"
  );

  console.log(
    "Minimum Received  :",
    formatUnits(
      minimumReceived,
      ardeDecimals
    ),
    "ARDE"
  );

  console.log("\nRAW CONTRACT VALUES");
  console.log("----------------------------------------------");

  console.log(
    "Raw Input         :",
    out[0].toString()
  );

  console.log(
    "Raw Output        :",
    out[1].toString()
  );

  console.log("\n==============================================");
  console.log("Calculation completed - READ ONLY");
  console.log("==============================================\n");
}

main().catch((error) => {
  console.error("\n❌ Calculation failed:");
  console.error(error);
});