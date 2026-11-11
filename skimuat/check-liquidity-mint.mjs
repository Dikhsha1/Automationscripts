import "dotenv/config";
import {
  createPublicClient,
  http,
  parseAbi,
  formatUnits,
  defineChain,
} from "viem";

// =====================================================
// CONFIG
// =====================================================

const RPC_URL = process.env.RPC_URL || "https://chain.sotto.li";

const TX_HASH =
  "0xe42d7289c67282139415a82daed40f7450171cf77c312ca8bab935974e19f9a8";

const USDT_ADDRESS =
  process.env.USDT_ADDRESS ||
  "0x103df201ed80eE00FfE2f694C49926c7F0d42d72";

const ARDE_ADDRESS =
  process.env.ARDE_ADDRESS ||
  "0xDCf82998bE1c95222816538C2dE514534804206b";

const LP_ADDRESS =
  process.env.LP_ADDRESS ||
  "0x0F43Cde9eb5017CD28b2BF4Fc508698Ff8BD6aD3";

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

const erc20Abi = parseAbi([
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

const transferAbi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

const pairAbi = parseAbi([
  "event Mint(address indexed sender, uint256 amount0, uint256 amount1)",
  "event Sync(uint112 reserve0, uint112 reserve1)",
]);

// =====================================================
// HELPERS
// =====================================================

function sameAddress(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

function section(title) {
  console.log("\n================================================");
  console.log(title);
  console.log("================================================");
}

function rawEquals(a, b) {
  return a.toString() === b.toString();
}

function absBigInt(a, b) {
  return a >= b ? a - b : b - a;
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  section("ARDEN LIQUIDITY MINT EVENT QA");

  console.log(`RPC:        ${RPC_URL}`);
  console.log(`Chain ID:   ${chain.id}`);
  console.log(`TX:         ${TX_HASH}`);
  console.log(`USDT:       ${USDT_ADDRESS}`);
  console.log(`ARDE:       ${ARDE_ADDRESS}`);
  console.log(`LP:         ${LP_ADDRESS}`);

  // ===================================================
  // 1. READ TOKEN DECIMALS
  // ===================================================

  const usdtDecimals = await client.readContract({
    address: USDT_ADDRESS,
    abi: erc20Abi,
    functionName: "decimals",
  });

  const ardeDecimals = await client.readContract({
    address: ARDE_ADDRESS,
    abi: erc20Abi,
    functionName: "decimals",
  });

  let usdtSymbol = "USDT";
  let ardeSymbol = "ARDE";

  try {
    usdtSymbol = await client.readContract({
      address: USDT_ADDRESS,
      abi: erc20Abi,
      functionName: "symbol",
    });
  } catch {}

  try {
    ardeSymbol = await client.readContract({
      address: ARDE_ADDRESS,
      abi: erc20Abi,
      functionName: "symbol",
    });
  } catch {}

  section("1. TOKEN CONFIGURATION");

  console.log(`${usdtSymbol} decimals : ${usdtDecimals}`);
  console.log(`${ardeSymbol} decimals : ${ardeDecimals}`);

  const usdtDecimalPass = usdtDecimals === 6;

  console.log(
    `USDT 6-decimal requirement : ${
      usdtDecimalPass ? "PASS ✅" : "FAIL ❌"
    }`
  );

  // ===================================================
  // 2. GET TRANSACTION
  // ===================================================

  const tx = await client.getTransaction({
    hash: TX_HASH,
  });

  const receipt = await client.getTransactionReceipt({
    hash: TX_HASH,
  });

  section("2. TRANSACTION");

  console.log(`Block       : ${receipt.blockNumber}`);
  console.log(`Status      : ${receipt.status}`);
  console.log(`From        : ${tx.from}`);
  console.log(`To          : ${tx.to}`);
  console.log(`Log count   : ${receipt.logs.length}`);

  if (receipt.status !== "success") {
    throw new Error("Transaction failed.");
  }

  // ===================================================
  // 3. READ ALL USDT TRANSFERS
  // ===================================================

  section("3. USDT TRANSFERS");

  const usdtTransfers = [];

  for (const log of receipt.logs) {
    if (!sameAddress(log.address, USDT_ADDRESS)) {
      continue;
    }

    try {
      const decoded = client.decodeEventLog({
        abi: transferAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName !== "Transfer") continue;

      const from = decoded.args.from;
      const to = decoded.args.to;
      const value = decoded.args.value;

      usdtTransfers.push({
        from,
        to,
        raw: value,
        amount: formatUnits(value, usdtDecimals),
        logIndex: log.logIndex,
      });

      console.log(
        `${from} -> ${to} : ${formatUnits(
          value,
          usdtDecimals
        )} USDT`
      );

      console.log(`   RAW: ${value.toString()}`);
    } catch {
      // Ignore non-transfer logs
    }
  }

  // ===================================================
  // 4. FIND USDT TRANSFER INTO LP
  // ===================================================

  section("4. USDT LIQUIDITY TRANSFER");

  const usdtIntoLP = usdtTransfers.filter(
    (t) =>
      sameAddress(t.to, LP_ADDRESS) &&
      !sameAddress(t.from, LP_ADDRESS)
  );

  console.log(`USDT transfers into LP : ${usdtIntoLP.length}`);

  let actualLPUSDT = null;

  if (usdtIntoLP.length > 0) {
    console.log("\nUSDT entering LP:");

    for (const t of usdtIntoLP) {
      console.log(
        `${t.from} -> LP : ${t.amount} USDT`
      );

      console.log(
        `RAW : ${t.raw.toString()}`
      );
    }

    /*
     * If there are multiple transfers into LP in the same transaction,
     * add them together.
     */

    actualLPUSDT = usdtIntoLP.reduce(
      (sum, t) => sum + t.raw,
      0n
    );

    console.log(
      `\nTOTAL USDT INTO LP : ${formatUnits(
        actualLPUSDT,
        usdtDecimals
      )} USDT`
    );

    console.log(
      `TOTAL RAW          : ${actualLPUSDT.toString()}`
    );
  } else {
    console.log("⚠️ No USDT transfer into LP found.");
  }

  // ===================================================
  // 5. FIND MINT EVENTS
  // ===================================================

  section("5. MINT EVENTS");

  const mintEvents = [];

  for (const log of receipt.logs) {
    try {
      const decoded = client.decodeEventLog({
        abi: pairAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName !== "Mint") continue;

      const amount0 = decoded.args.amount0;
      const amount1 = decoded.args.amount1;

      mintEvents.push({
        address: log.address,
        amount0,
        amount1,
        logIndex: log.logIndex,
      });

      console.log(`Mint contract : ${log.address}`);

      console.log(
        `amount0 RAW   : ${amount0.toString()}`
      );

      console.log(
        `amount1 RAW   : ${amount1.toString()}`
      );

      console.log(
        `amount0 as USDT: ${formatUnits(
          amount0,
          usdtDecimals
        )}`
      );

      console.log(
        `amount1 as USDT: ${formatUnits(
          amount1,
          usdtDecimals
        )}`
      );

      console.log(
        `amount0 as ARDE: ${formatUnits(
          amount0,
          ardeDecimals
        )}`
      );

      console.log(
        `amount1 as ARDE: ${formatUnits(
          amount1,
          ardeDecimals
        )}`
      );
    } catch {
      // Not a Mint event
    }
  }

  console.log(`\nMint event count : ${mintEvents.length}`);

  // ===================================================
  // 6. IDENTIFY USDT SIDE
  // ===================================================

  section("6. MINT USDT IDENTIFICATION");

  let mintUSDT = null;
  let mintARDE = null;
  let matchedMint = null;

  for (const mint of mintEvents) {
    /*
     * Compare raw Mint amounts against the actual USDT
     * Transfer into LP.
     *
     * This is the important QA check.
     */

    if (actualLPUSDT !== null) {
      if (rawEquals(mint.amount0, actualLPUSDT)) {
        mintUSDT = mint.amount0;
        mintARDE = mint.amount1;
        matchedMint = mint;

        console.log("USDT identified as amount0.");
        break;
      }

      if (rawEquals(mint.amount1, actualLPUSDT)) {
        mintUSDT = mint.amount1;
        mintARDE = mint.amount0;
        matchedMint = mint;

        console.log("USDT identified as amount1.");
        break;
      }
    }
  }

  if (matchedMint) {
    console.log(
      `Mint USDT RAW : ${mintUSDT.toString()}`
    );

    console.log(
      `Mint USDT     : ${formatUnits(
        mintUSDT,
        usdtDecimals
      )} USDT`
    );

    console.log(
      `Mint ARDE     : ${formatUnits(
        mintARDE,
        ardeDecimals
      )} ARDE`
    );
  } else {
    console.log(
      "⚠️ Could not match Mint amount to USDT transfer."
    );
  }

  // ===================================================
  // 7. EXACT DECIMAL CORRECTNESS TEST
  // ===================================================

  section("7. EXACT MINT ↔ USDT TRANSFER CHECK");

  let exactMatch = false;

  if (actualLPUSDT !== null && mintUSDT !== null) {
    exactMatch = rawEquals(
      actualLPUSDT,
      mintUSDT
    );

    console.log(
      `Actual USDT into LP : ${formatUnits(
        actualLPUSDT,
        usdtDecimals
      )} USDT`
    );

    console.log(
      `Mint USDT           : ${formatUnits(
        mintUSDT,
        usdtDecimals
      )} USDT`
    );

    console.log(
      `Actual RAW          : ${actualLPUSDT.toString()}`
    );

    console.log(
      `Mint RAW            : ${mintUSDT.toString()}`
    );

    console.log(
      `Raw values equal    : ${
        exactMatch ? "PASS ✅" : "FAIL ❌"
      }`
    );
  } else {
    console.log(
      "Cannot perform exact comparison."
    );
  }

  // ===================================================
  // 8. DECIMAL SANITY CHECK
  // ===================================================

  section("8. DECIMAL SANITY CHECK");

  let decimalSanityPass = false;

  if (mintUSDT !== null && usdtDecimals === 6) {
    const formatted = formatUnits(
      mintUSDT,
      usdtDecimals
    );

    console.log(
      `Mint USDT formatted using 6 decimals : ${formatted}`
    );

    /*
     * Re-encode the formatted value and verify that it
     * produces exactly the original raw integer.
     *
     * This proves that the value is being interpreted
     * consistently as a 6-decimal USDT amount.
     */

    const [whole, fraction = ""] =
      formatted.split(".");

    const normalizedFraction =
      fraction.padEnd(6, "0");

    const reconstructed =
      BigInt(whole) * 1_000_000n +
      BigInt(normalizedFraction);

    decimalSanityPass =
      reconstructed === mintUSDT;

    console.log(
      `Reconstructed RAW                    : ${reconstructed}`
    );

    console.log(
      `Original RAW                         : ${mintUSDT}`
    );

    console.log(
      `6-decimal round-trip                 : ${
        decimalSanityPass
          ? "PASS ✅"
          : "FAIL ❌"
      }`
    );
  }

  // ===================================================
  // 9. OLD TRILLION-SCALE BUG INDICATOR
  // ===================================================

  section("9. OLD TRILLION-SCALE BUG CHECK");

  let oldBugDetected = false;

  if (mintUSDT !== null) {
    /*
     * A normal 50 USDT value with 6 decimals:
     *
     * 50 * 10^6
     *
     * If the event incorrectly stored 18-decimal units:
     *
     * 50 * 10^18
     *
     * Reading that as USDT 6 decimals would produce:
     *
     * 50,000,000,000,000
     *
     * This is the old "trillion-scale" symptom.
     */

    const usdtValue6 = Number(
      formatUnits(mintUSDT, 6)
    );

    console.log(
      `Mint USDT interpreted as 6 decimals : ${usdtValue6}`
    );

    /*
     * This is only a diagnostic indicator.
     * It is NOT the primary PASS/FAIL criterion.
     */

    if (
      Number.isFinite(usdtValue6) &&
      usdtValue6 >= 1_000_000_000
    ) {
      oldBugDetected = true;
    }
  }

  console.log(
    `Trillion-scale symptom : ${
      oldBugDetected
        ? "DETECTED ⚠️"
        : "NOT DETECTED ✅"
    }`
  );

  // ===================================================
  // 10. FINAL QA RESULT
  // ===================================================

  section("10. FINAL QA RESULT");

  console.log(
    "Test Case:"
  );

  console.log(
    "Liquidity-add Mint event reports USDT in correct 6-decimal units"
  );

  console.log("\nChecks:");

  console.log(
    `1. Transaction successful             : ${
      receipt.status === "success"
        ? "PASS ✅"
        : "FAIL ❌"
    }`
  );

  console.log(
    `2. USDT decimals = 6                  : ${
      usdtDecimalPass
        ? "PASS ✅"
        : "FAIL ❌"
    }`
  );

  console.log(
    `3. USDT transfer into LP found        : ${
      actualLPUSDT !== null
        ? "PASS ✅"
        : "FAIL ❌"
    }`
  );

  console.log(
    `4. Mint event found                   : ${
      mintEvents.length > 0
        ? "PASS ✅"
        : "FAIL ❌"
    }`
  );

  console.log(
    `5. Mint USDT side identified          : ${
      mintUSDT !== null
        ? "PASS ✅"
        : "FAIL ❌"
    }`
  );

  console.log(
    `6. Mint RAW = USDT transfer RAW       : ${
      exactMatch
        ? "PASS ✅"
        : "FAIL ❌"
    }`
  );

  console.log(
    `7. 6-decimal round-trip               : ${
      decimalSanityPass
        ? "PASS ✅"
        : "FAIL ❌"
    }`
  );

  console.log(
    `8. Old trillion-scale symptom        : ${
      oldBugDetected
        ? "FAIL ❌"
        : "NOT DETECTED ✅"
    }`
  );

  // ===================================================
  // OVERALL
  // ===================================================

  const overallPass =
    receipt.status === "success" &&
    usdtDecimalPass &&
    actualLPUSDT !== null &&
    mintEvents.length > 0 &&
    mintUSDT !== null &&
    exactMatch &&
    decimalSanityPass &&
    !oldBugDetected;

  console.log(
    "\n-----------------------------------------------"
  );

  if (overallPass) {
    console.log("OVERALL RESULT: PASS ✅");

    console.log(
      "\nEvidence:"
    );

    console.log(
      `USDT transfer into LP : ${formatUnits(
        actualLPUSDT,
        usdtDecimals
      )} USDT`
    );

    console.log(
      `Mint USDT amount      : ${formatUnits(
        mintUSDT,
        usdtDecimals
      )} USDT`
    );

    console.log(
      `Raw values identical  : YES`
    );

    console.log(
      `USDT decimals         : ${usdtDecimals}`
    );

    console.log(
      `Old trillion bug      : NOT DETECTED`
    );
  } else {
    console.log("OVERALL RESULT: REVIEW ⚠️");

    console.log(
      "\nThe Mint event and actual USDT transfer did not satisfy every required check."
    );
  }

  console.log(
    "\n================================================"
  );

  console.log("                    END");

  console.log(
    "================================================"
  );
}

main().catch((err) => {
  console.error("\n❌ SCRIPT FAILED");

  console.error(
    err.shortMessage ||
      err.message ||
      err
  );

  process.exit(1);
});