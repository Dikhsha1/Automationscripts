import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  parseUnits,
  defineChain,
} from "viem";

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const SSP = "0x0F43Cde9eb5017CD28b2BF4Fc508698Ff8BD6aD3";
const USDT = "0x103df201ed80eE00FfE2f694C49926c7F0d42d72";
const ARDE = "0xDCf82998bE1c95222816538C2dE514534804206b";

const AV = 9.58220762;
const TARGET_PI = 1.30;

const USER =
  process.env.TEST_WALLET ||
  "0x00b8caf018b640a38a74883f48039252abcb5411";

const USDT_DECIMALS = 6;
const ARDE_DECIMALS = 18;

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

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      {
        name: "account",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
  },
];

const sspAbi = [
  {
    type: "function",
    name: "getAmountsOut",
    inputs: [
      {
        name: "amountIn",
        type: "uint256",
      },
      {
        name: "path",
        type: "address[]",
      },
      {
        name: "user",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "amounts",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
  },

  {
    type: "function",
    name: "getPriceInUSDT",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
  },
];

/**
 * Read actual token balances held by SSP.
 *
 * USDT = 6 decimals
 * ARDE = 18 decimals
 */
async function getPool() {
  const [usdtRaw, ardeRaw] = await Promise.all([
    client.readContract({
      address: USDT,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [SSP],
    }),

    client.readContract({
      address: ARDE,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [SSP],
    }),
  ]);

  const usdt = Number(
    formatUnits(usdtRaw, USDT_DECIMALS)
  );

  const arde = Number(
    formatUnits(ardeRaw, ARDE_DECIMALS)
  );

  return {
    usdt,
    arde,
    usdtRaw,
    ardeRaw,
  };
}

/**
 * Read SSP's own price calculation.
 *
 * This is the authoritative contract price.
 */
async function getContractPrice() {
  const rawPrice = await client.readContract({
    address: SSP,
    abi: sspAbi,
    functionName: "getPriceInUSDT",
  });

  const price = Number(
    formatUnits(rawPrice, 18)
  );

  return price;
}

/**
 * Get ARDE output for a USDT -> ARDE quote.
 *
 * IMPORTANT:
 * USDT input uses 6 decimals.
 */
async function quoteBuy(usdtAmount) {
  if (!Number.isFinite(usdtAmount)) {
    throw new Error(
      "USDT amount is not a valid number"
    );
  }

  if (usdtAmount <= 0) {
    throw new Error(
      "USDT input must be greater than zero"
    );
  }

  const amountIn = parseUnits(
    usdtAmount.toFixed(6),
    USDT_DECIMALS
  );

  if (amountIn === 0n) {
    throw new Error(
      "USDT input converted to zero"
    );
  }

  const amounts = await client.readContract({
    address: SSP,
    abi: sspAbi,
    functionName: "getAmountsOut",
    args: [
      amountIn,
      [USDT, ARDE],
      USER,
    ],
  });

  if (
    !amounts ||
    amounts.length === 0
  ) {
    throw new Error(
      "SSP returned an empty quote"
    );
  }

  const ardeRaw =
    amounts[amounts.length - 1];

  const ardeOut = Number(
    formatUnits(
      ardeRaw,
      ARDE_DECIMALS
    )
  );

  if (
    !Number.isFinite(ardeOut) ||
    ardeOut <= 0
  ) {
    throw new Error(
      "SSP returned zero/invalid ARDE output"
    );
  }

  return ardeOut;
}

/**
 * Simulate a BUY without sending a transaction.
 *
 * Model:
 *
 * USDT reserve increases by input.
 * ARDE reserve decreases by quoted output.
 *
 * Then:
 *
 * price = USDT reserve / ARDE reserve
 * PI = price / AV
 */
async function simulate(
  usdtAmount,
  currentPool
) {
  if (usdtAmount <= 0) {
    return null;
  }

  const ardeOut =
    await quoteBuy(usdtAmount);

  const newUSDT =
    currentPool.usdt + usdtAmount;

  const newARDE =
    currentPool.arde - ardeOut;

  if (newARDE <= 0) {
    return null;
  }

  const simulatedPrice =
    newUSDT / newARDE;

  const simulatedPI =
    simulatedPrice / AV;

  return {
    usdtAmount,
    ardeOut,
    newUSDT,
    newARDE,
    simulatedPrice,
    simulatedPI,
    passes:
      simulatedPI >= TARGET_PI,
  };
}

async function main() {
  console.log(
    "\n========== SKIM TRIGGER SIMULATION =========="
  );

  console.log(
    "RPC:",
    RPC_URL
  );

  console.log(
    "Chain:",
    CHAIN_ID
  );

  console.log(
    "SSP:",
    SSP
  );

  console.log(
    "\n========== TOKENS =========="
  );

  console.log(
    "USDT:",
    USDT
  );

  console.log(
    "ARDE:",
    ARDE
  );

  console.log(
    "USDT decimals:",
    USDT_DECIMALS
  );

  console.log(
    "ARDE decimals:",
    ARDE_DECIMALS
  );

  console.log(
    "\n========== CONFIG =========="
  );

  console.log(
    "AV:",
    AV
  );

  console.log(
    "Target PI:",
    TARGET_PI
  );

  console.log(
    "Quote User:",
    USER
  );

  // ------------------------------------------------
  // CURRENT POOL
  // ------------------------------------------------

  const pool =
    await getPool();

  console.log(
    "\n========== CURRENT SSP BALANCES =========="
  );

  console.log(
    "SSP USDT:",
    pool.usdt.toFixed(6)
  );

  console.log(
    "SSP ARDE:",
    pool.arde.toFixed(18)
  );

  // ------------------------------------------------
  // CURRENT PRICE
  // ------------------------------------------------

  const balancePrice =
    pool.usdt / pool.arde;

  let contractPrice;

  try {
    contractPrice =
      await getContractPrice();
  } catch (error) {
    console.log(
      "\nWARNING: getPriceInUSDT() failed."
    );

    console.log(
      error.shortMessage ||
      error.message
    );

    contractPrice =
      balancePrice;
  }

  console.log(
    "\n========== CURRENT PRICE =========="
  );

  console.log(
    "Balance-derived price:",
    balancePrice.toFixed(8)
  );

  console.log(
    "Contract price:",
    contractPrice.toFixed(8)
  );

  console.log(
    "Price difference:",
    (
      contractPrice -
      balancePrice
    ).toFixed(8)
  );

  // IMPORTANT:
  // Use contract price for current PI.
  const currentPI =
    contractPrice / AV;

  console.log(
    "\n========== CURRENT PI =========="
  );

  console.log(
    "PI:",
    currentPI.toFixed(8)
  );

  const requiredPrice =
    AV * TARGET_PI;

  console.log(
    "\n========== TARGET =========="
  );

  console.log(
    "Target PI:",
    TARGET_PI
  );

  console.log(
    "Required price:",
    requiredPrice.toFixed(8)
  );

  if (currentPI >= TARGET_PI) {
    console.log(
      "\n⚠️ CURRENT PI ALREADY PASSES"
    );

    console.log(
      "PI >= 1.30: YES"
    );

    console.log(
      "No buy is required to pass the PI gate."
    );

    console.log(
      "\n========== END ==========\n"
    );

    return;
  }

  // ------------------------------------------------
  // SEARCH
  // ------------------------------------------------

  console.log(
    "\n========== SEARCHING FOR TRIGGER =========="
  );

  let low = 0.01;
  let high = 1000;

  let highResult = null;

  while (high <= 1_000_000) {
    try {
      const result =
        await simulate(
          high,
          pool
        );

      if (!result) {
        console.log(
          `Unable to simulate $${high}`
        );

        break;
      }

      console.log(
        `$${high.toLocaleString()} -> ` +
        `ARDE ${result.ardeOut.toFixed(6)} -> ` +
        `Price ${result.simulatedPrice.toFixed(8)} -> ` +
        `PI ${result.simulatedPI.toFixed(6)}`
      );

      if (result.passes) {
        highResult = result;
        break;
      }

      low = high;

      high *= 2;

    } catch (error) {
      console.log(
        `Quote failed at $${high.toLocaleString()}:`
      );

      console.log(
        error.shortMessage ||
        error.message
      );

      break;
    }
  }

  if (!highResult) {
    console.log(
      "\n❌ No PI >= 1.30 found " +
      "up to $1,000,000."
    );

    console.log(
      "\n========== END ==========\n"
    );

    return;
  }

  // ------------------------------------------------
  // BINARY SEARCH
  // ------------------------------------------------

  console.log(
    "\n========== BINARY SEARCH =========="
  );

  for (
    let i = 0;
    i < 30;
    i++
  ) {
    const mid =
      Math.round(
        (
          (low + high) /
          2
        ) * 100
      ) / 100;

    if (mid <= 0) {
      break;
    }

    const result =
      await simulate(
        mid,
        pool
      );

    if (!result) {
      high = mid;
      continue;
    }

    if (result.passes) {
      high = mid;
    } else {
      low = mid;
    }

    if (
      high - low <=
      0.01
    ) {
      break;
    }
  }

  // ------------------------------------------------
  // FINAL RESULT
  // ------------------------------------------------

  const trigger =
    await simulate(
      high,
      pool
    );

  const belowAmount =
    Math.max(
      0.01,
      high - 0.01
    );

  const below =
    await simulate(
      belowAmount,
      pool
    );

  console.log(
    "\n========== RESULT =========="
  );

  if (trigger) {
    console.log(
      "Approx minimum USDT buy:",
      `$${trigger.usdtAmount.toFixed(2)}`
    );

    console.log(
      "Expected ARDE received:",
      trigger.ardeOut.toFixed(18)
    );

    console.log(
      "Expected USDT reserve:",
      trigger.newUSDT.toFixed(6)
    );

    console.log(
      "Expected ARDE reserve:",
      trigger.newARDE.toFixed(18)
    );

    console.log(
      "Expected market price:",
      trigger.simulatedPrice.toFixed(8)
    );

    console.log(
      "Expected PI:",
      trigger.simulatedPI.toFixed(8)
    );

    console.log(
      "PI >= 1.30:",
      trigger.passes
        ? "YES ✅"
        : "NO ❌"
    );
  }

  // ------------------------------------------------
  // BOUNDARY
  // ------------------------------------------------

  console.log(
    "\n========== BOUNDARY CHECK =========="
  );

  if (below) {
    console.log(
      `Buy $${below.usdtAmount.toFixed(2)} -> ` +
      `PI ${below.simulatedPI.toFixed(8)}`
    );

    console.log(
      "Below target:",
      below.simulatedPI < TARGET_PI
        ? "YES ✅"
        : "NO ❌"
    );
  }

  // ------------------------------------------------
  // IMPORTANT
  // ------------------------------------------------

  console.log(
    "\n========== IMPORTANT =========="
  );

  console.log(
    "READ-ONLY simulation."
  );

  console.log(
    "NO swap was performed."
  );

  console.log(
    "This estimates the buy size needed " +
    "to move PI to 1.30."
  );

  console.log(
    "PI >= 1.30 does NOT by itself prove " +
    "that the AMO skim will execute."
  );

  console.log(
    "The other AMO gates must also be verified."
  );

  console.log(
    "\n========== END ==========\n"
  );
}

main().catch((error) => {
  console.error(
    "\nERROR:"
  );

  console.error(error);

  process.exit(1);
});