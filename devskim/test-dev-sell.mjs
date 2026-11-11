import "dotenv/config";

import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  defineChain,
  getAddress,
  maxUint256,
} from "viem";

import { privateKeyToAccount } from "viem/accounts";

// =====================================================
// ENVIRONMENT
// =====================================================

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const USDT = process.env.USDT_ADDRESS;
const ARDE = process.env.ARDE_ADDRESS;

const SSP = process.env.STRATEGIC_SWAP_POOL;

const RESERVE_TREASURY =
  process.env.RESERVE_TREASURY;

const OPERATION_TREASURY =
  process.env.OPERATION_TREASURY;

const TEST_WALLET =
  process.env.TEST_WALLET;

const PRIVATE_KEY =
  process.env.PRIVATE_KEY;

// =====================================================
// ENV VALIDATION
// =====================================================

function requireEnv(name, value) {
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}`
    );
  }
}

requireEnv("RPC_URL", RPC_URL);
requireEnv("USDT_ADDRESS", USDT);
requireEnv("ARDE_ADDRESS", ARDE);
requireEnv(
  "STRATEGIC_SWAP_POOL",
  SSP
);
requireEnv(
  "RESERVE_TREASURY",
  RESERVE_TREASURY
);
requireEnv(
  "TEST_WALLET",
  TEST_WALLET
);
requireEnv(
  "PRIVATE_KEY",
  PRIVATE_KEY
);

if (!PRIVATE_KEY.startsWith("0x")) {
  throw new Error(
    "PRIVATE_KEY must start with 0x."
  );
}

// =====================================================
// CHAIN
// =====================================================

const chain = defineChain({
  id: CHAIN_ID,
  name: "ARDEN DEV",
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
// CLIENTS
// =====================================================

const publicClient =
  createPublicClient({
    chain,
    transport: http(RPC_URL),
  });

const account =
  privateKeyToAccount(
    PRIVATE_KEY
  );

const walletClient =
  createWalletClient({
    account,
    chain,
    transport: http(RPC_URL),
  });

// =====================================================
// ERC20 ABI
// =====================================================

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

  {
    type: "function",
    name: "allowance",
    inputs: [
      {
        name: "owner",
        type: "address",
      },
      {
        name: "spender",
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

  {
    type: "function",
    name: "approve",
    inputs: [
      {
        name: "spender",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
  },
];

// =====================================================
// SSP ABI
// =====================================================

const sspAbi = [
  {
    type: "function",
    name: "getReserves",
    inputs: [],
    outputs: [
      {
        name: "reserve0",
        type: "uint112",
      },
      {
        name: "reserve1",
        type: "uint112",
      },
      {
        name: "blockTimestampLast",
        type: "uint32",
      },
    ],
    stateMutability: "view",
  },

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
    name: "swapExactTokensForTokens",
    inputs: [
      {
        name: "amountIn",
        type: "uint256",
      },
      {
        name: "amountOutMin",
        type: "uint256",
      },
      {
        name: "path",
        type: "address[]",
      },
      {
        name: "to",
        type: "address",
      },
      {
        name: "deadline",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "amounts",
        type: "uint256[]",
      },
    ],
    stateMutability: "nonpayable",
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

// =====================================================
// BALANCE HELPERS
// =====================================================

async function getTokenBalance(
  token,
  accountAddress
) {
  return await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [accountAddress],
  });
}

async function getPoolReserves() {
  return await publicClient.readContract({
    address: SSP,
    abi: sspAbi,
    functionName: "getReserves",
  });
}

async function getPoolPrice() {
  try {
    const price =
      await publicClient.readContract({
        address: SSP,
        abi: sspAbi,
        functionName:
          "getPriceInUSDT",
      });

    return Number(
      formatUnits(price, 18)
    );
  } catch {
    return null;
  }
}

// =====================================================
// QUOTE ARDE -> USDT
// =====================================================

async function quoteSell(
  ardeAmount
) {
  if (ardeAmount <= 0) {
    throw new Error(
      "ARDE input must be greater than zero."
    );
  }

  // ARDE = 18 decimals
  const amountIn =
    parseUnits(
      ardeAmount.toFixed(18),
      18
    );

  const amounts =
    await publicClient.readContract({
      address: SSP,
      abi: sspAbi,
      functionName:
        "getAmountsOut",
      args: [
        amountIn,
        [ARDE, USDT],
        TEST_WALLET,
      ],
    });

  // USDT = 6 decimals
  const usdtOut =
    amounts[amounts.length - 1];

  return {
    amountIn,
    usdtOut,
  };
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log(
    "\n=========================================="
  );
  console.log(
    "       ARDEN DEV ARDE → USDT TEST"
  );
  console.log(
    "=========================================="
  );

  console.log("\n========== ENVIRONMENT ==========");

  console.log(
    "RPC:",
    RPC_URL
  );

  console.log(
    "Chain:",
    CHAIN_ID
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
    "SSP:",
    SSP
  );

  console.log(
    "Reserve Treasury:",
    RESERVE_TREASURY
  );

  console.log(
    "Operation Treasury:",
    OPERATION_TREASURY ||
      "NOT CONFIGURED"
  );

  // ===================================================
  // WALLET CHECK
  // ===================================================

  console.log(
    "\n========== WALLET =========="
  );

  console.log(
    "TEST_WALLET:",
    TEST_WALLET
  );

  console.log(
    "Signer:",
    account.address
  );

  if (
    getAddress(TEST_WALLET) !==
    getAddress(account.address)
  ) {
    throw new Error(
      `TEST_WALLET does not match PRIVATE_KEY wallet.\n` +
      `TEST_WALLET: ${TEST_WALLET}\n` +
      `Signer: ${account.address}`
    );
  }

  // ===================================================
  // INPUT
  // ===================================================

  const input =
    process.argv[2] || "10";

  const ardeAmount =
    Number(input);

  if (
    !Number.isFinite(
      ardeAmount
    ) ||
    ardeAmount <= 0
  ) {
    throw new Error(
      "Usage: node test-dev-sell.mjs <ARDE_AMOUNT>"
    );
  }

  const amountIn =
    parseUnits(
      ardeAmount.toFixed(18),
      18
    );

  console.log(
    "\n========== TEST INPUT =========="
  );

  console.log(
    "ARDE to sell:",
    ardeAmount
  );

  // ===================================================
  // BEFORE - WALLET
  // ===================================================

  const walletARDEBefore =
    await getTokenBalance(
      ARDE,
      account.address
    );

  const walletUSDTBefore =
    await getTokenBalance(
      USDT,
      account.address
    );

  console.log(
    "\n========== WALLET BEFORE =========="
  );

  console.log(
    "ARDE:",
    formatUnits(
      walletARDEBefore,
      18
    )
  );

  console.log(
    "USDT:",
    formatUnits(
      walletUSDTBefore,
      6
    )
  );

  if (
    walletARDEBefore <
    amountIn
  ) {
    throw new Error(
      `Insufficient ARDE.\n` +
      `Required: ${ardeAmount}\n` +
      `Available: ${formatUnits(
        walletARDEBefore,
        18
      )}`
    );
  }

  // ===================================================
  // BEFORE - POOL
  // ===================================================

  const reservesBefore =
    await getPoolReserves();

  const priceBefore =
    await getPoolPrice();

  console.log(
    "\n========== SSP BEFORE =========="
  );

  console.log(
    "Reserve0:",
    formatUnits(
      reservesBefore[0],
      18
    )
  );

  console.log(
    "Reserve1:",
    formatUnits(
      reservesBefore[1],
      18
    )
  );

  if (
    priceBefore !== null
  ) {
    console.log(
      "Price:",
      priceBefore.toFixed(8),
      "USDT/ARDE"
    );
  }

  // ===================================================
  // BEFORE - TREASURIES
  // ===================================================

  const reserveBefore =
    await getTokenBalance(
      USDT,
      RESERVE_TREASURY
    );

  let operationBefore = null;

  if (
    OPERATION_TREASURY
  ) {
    operationBefore =
      await getTokenBalance(
        USDT,
        OPERATION_TREASURY
      );
  }

  console.log(
    "\n========== TREASURIES BEFORE =========="
  );

  console.log(
    "Reserve Treasury:",
    formatUnits(
      reserveBefore,
      6
    ),
    "USDT"
  );

  if (
    operationBefore !== null
  ) {
    console.log(
      "Operation Treasury:",
      formatUnits(
        operationBefore,
        6
      ),
      "USDT"
    );
  } else {
    console.log(
      "Operation Treasury:",
      "NOT CHECKED"
    );
  }

  // ===================================================
  // QUOTE
  // ===================================================

  console.log(
    "\n========== SELL QUOTE =========="
  );

  const quote =
    await quoteSell(
      ardeAmount
    );

  console.log(
    "ARDE input:",
    ardeAmount
  );

  console.log(
    "Expected USDT:",
    formatUnits(
      quote.usdtOut,
      6
    )
  );

  // ===================================================
  // SLIPPAGE
  // ===================================================

  // 2.5% QA tolerance

  const amountOutMin =
    (quote.usdtOut * 9750n) /
    10000n;

  console.log(
    "Minimum USDT:",
    formatUnits(
      amountOutMin,
      6
    )
  );

  // ===================================================
  // ALLOWANCE
  // ===================================================

  const allowance =
    await publicClient.readContract({
      address: ARDE,
      abi: erc20Abi,
      functionName:
        "allowance",
      args: [
        account.address,
        SSP,
      ],
    });

  console.log(
    "\n========== ALLOWANCE =========="
  );

  console.log(
    "Current ARDE allowance:",
    formatUnits(
      allowance,
      18
    )
  );

  if (
    allowance < amountIn
  ) {
    console.log(
      "Allowance insufficient."
    );

    console.log(
      "Approving ARDE..."
    );

    const approveHash =
      await walletClient.writeContract(
        {
          address: ARDE,
          abi: erc20Abi,
          functionName:
            "approve",
          args: [
            SSP,
            maxUint256,
          ],
        }
      );

    console.log(
      "Approval TX:",
      approveHash
    );

    await publicClient.waitForTransactionReceipt(
      {
        hash: approveHash,
      }
    );

    console.log(
      "Approval confirmed."
    );
  } else {
    console.log(
      "Allowance sufficient."
    );
  }

  // ===================================================
  // EXECUTE SELL
  // ===================================================

  console.log(
    "\n========== EXECUTING ARDE → USDT =========="
  );

  const deadline =
    BigInt(
      Math.floor(
        Date.now() / 1000
      ) + 600
    );

  const swapHash =
    await walletClient.writeContract(
      {
        address: SSP,
        abi: sspAbi,
        functionName:
          "swapExactTokensForTokens",
        args: [
          amountIn,
          amountOutMin,
          [ARDE, USDT],
          account.address,
          deadline,
        ],
      }
    );

  console.log(
    "Sell TX:",
    swapHash
  );

  const receipt =
    await publicClient.waitForTransactionReceipt(
      {
        hash: swapHash,
      }
    );

  console.log(
    "Transaction status:",
    receipt.status
  );

  console.log(
    "Block:",
    receipt.blockNumber
  );

  // ===================================================
  // AFTER - WALLET
  // ===================================================

  const walletARDEAfter =
    await getTokenBalance(
      ARDE,
      account.address
    );

  const walletUSDTAfter =
    await getTokenBalance(
      USDT,
      account.address
    );

  console.log(
    "\n========== WALLET AFTER =========="
  );

  console.log(
    "ARDE:",
    formatUnits(
      walletARDEAfter,
      18
    )
  );

  console.log(
    "USDT:",
    formatUnits(
      walletUSDTAfter,
      6
    )
  );

  // ===================================================
  // AFTER - POOL
  // ===================================================

  const reservesAfter =
    await getPoolReserves();

  const priceAfter =
    await getPoolPrice();

  console.log(
    "\n========== SSP AFTER =========="
  );

  console.log(
    "Reserve0:",
    formatUnits(
      reservesAfter[0],
      18
    )
  );

  console.log(
    "Reserve1:",
    formatUnits(
      reservesAfter[1],
      18
    )
  );

  if (
    priceAfter !== null
  ) {
    console.log(
      "Price:",
      priceAfter.toFixed(8),
      "USDT/ARDE"
    );
  }

  // ===================================================
  // AFTER - TREASURIES
  // ===================================================

  const reserveAfter =
    await getTokenBalance(
      USDT,
      RESERVE_TREASURY
    );

  let operationAfter = null;

  if (
    OPERATION_TREASURY
  ) {
    operationAfter =
      await getTokenBalance(
        USDT,
        OPERATION_TREASURY
      );
  }

  // ===================================================
  // DELTAS
  // ===================================================

  const reserveDelta =
    reserveAfter -
    reserveBefore;

  let operationDelta = null;

  if (
    operationBefore !== null &&
    operationAfter !== null
  ) {
    operationDelta =
      operationAfter -
      operationBefore;
  }

  console.log(
    "\n========== TREASURY AFTER =========="
  );

  console.log(
    "Reserve Treasury:",
    formatUnits(
      reserveAfter,
      6
    ),
    "USDT"
  );

  console.log(
    "Reserve change:",
    formatUnits(
      reserveDelta,
      6
    ),
    "USDT"
  );

  if (
    operationAfter !== null
  ) {
    console.log(
      "Operation Treasury:",
      formatUnits(
        operationAfter,
        6
      ),
      "USDT"
    );

    console.log(
      "Operation change:",
      formatUnits(
        operationDelta,
        6
      ),
      "USDT"
    );
  }

  // ===================================================
  // SKIM DETECTION
  // ===================================================

  console.log(
    "\n========== SKIM DETECTION =========="
  );

  const reserveReceived =
    reserveDelta > 0n;

  const operationReceived =
    operationDelta !== null &&
    operationDelta > 0n;

  const anyTreasuryIncrease =
    reserveReceived ||
    operationReceived;

  if (
    anyTreasuryIncrease
  ) {
    console.log(
      "⚠️ TREASURY BALANCE INCREASE DETECTED"
    );

    if (
      reserveReceived
    ) {
      console.log(
        "Reserve Treasury received USDT: YES"
      );
    }

    if (
      operationReceived
    ) {
      console.log(
        "Operation Treasury received USDT: YES"
      );
    }

    console.log(
      "\nSKIM DETECTED: YES"
    );

    console.log(
      "⚠️ Investigate because this was an ARDE → USDT SELL."
    );
  } else {
    console.log(
      "Reserve Treasury received: NO"
    );

    if (
      operationDelta !== null
    ) {
      console.log(
        "Operation Treasury received: NO"
      );
    }

    console.log(
      "\nSKIM DETECTED: NO ✅"
    );

    console.log(
      "Expected result for a buy-only skim rule."
    );
  }

  // ===================================================
  // QA VERDICT
  // ===================================================

  console.log(
    "\n========== QA VERDICT =========="
  );

  console.log(
    "Test:",
    "ARDE → USDT"
  );

  console.log(
    "Purpose:",
    "Negative/control test for buy-only skim"
  );

  if (
    !anyTreasuryIncrease
  ) {
    console.log(
      "RESULT: PASS ✅"
    );

    console.log(
      "Sell did not cause a treasury skim."
    );
  } else {
    console.log(
      "RESULT: FAIL ❌"
    );

    console.log(
      "Sell caused a treasury balance increase."
    );
  }

  console.log(
    "\nTransaction:"
  );

  console.log(
    swapHash
  );

  console.log(
    "\n=========================================="
  );

  console.log(
    "          TEST COMPLETED"
  );

  console.log(
    "==========================================\n"
  );
}

main().catch(
  (error) => {
    console.error(
      "\n========== ERROR =========="
    );

    console.error(
      error.shortMessage ||
      error.message ||
      error
    );

    process.exit(1);
  }
);