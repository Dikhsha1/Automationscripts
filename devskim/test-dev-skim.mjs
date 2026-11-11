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
// ENV
// =====================================================

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const USDT = process.env.USDT_ADDRESS;
const ARDE = process.env.ARDE_ADDRESS;

const SSP = process.env.STRATEGIC_SWAP_POOL;

const PRICE_ORACLE = process.env.PRICE_ORACLE;

const RESERVE_TREASURY = process.env.RESERVE_TREASURY;

const TEST_WALLET = process.env.TEST_WALLET;

const PRIVATE_KEY = process.env.PRIVATE_KEY;

// =====================================================
// VALIDATION
// =====================================================

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}

requireEnv("RPC_URL", RPC_URL);
requireEnv("USDT_ADDRESS", USDT);
requireEnv("ARDE_ADDRESS", ARDE);
requireEnv("STRATEGIC_SWAP_POOL", SSP);
requireEnv("RESERVE_TREASURY", RESERVE_TREASURY);
requireEnv("TEST_WALLET", TEST_WALLET);
requireEnv("PRIVATE_KEY", PRIVATE_KEY);

if (!PRIVATE_KEY.startsWith("0x")) {
  throw new Error(
    "PRIVATE_KEY must start with 0x and contain a valid 32-byte private key."
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

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

const account = privateKeyToAccount(PRIVATE_KEY);

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(RPC_URL),
});

// =====================================================
// ABI
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
// HELPERS
// =====================================================

async function getUSDTBalance(address) {
  const balance = await publicClient.readContract({
    address: USDT,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });

  return balance;
}

async function getARDEBalance(address) {
  const balance = await publicClient.readContract({
    address: ARDE,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });

  return balance;
}

async function getPoolReserves() {
  const reserves = await publicClient.readContract({
    address: SSP,
    abi: sspAbi,
    functionName: "getReserves",
  });

  return reserves;
}

async function getPoolPrice() {
  try {
    const price = await publicClient.readContract({
      address: SSP,
      abi: sspAbi,
      functionName: "getPriceInUSDT",
    });

    return Number(formatUnits(price, 18));
  } catch {
    return null;
  }
}

async function quoteSwap(amountIn) {
  const amounts = await publicClient.readContract({
    address: SSP,
    abi: sspAbi,
    functionName: "getAmountsOut",
    args: [
      amountIn,
      [USDT, ARDE],
      TEST_WALLET,
    ],
  });

  return amounts[amounts.length - 1];
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log("\n==========================================");
  console.log("       ARDEN DEV SKIM TEST");
  console.log("==========================================");

  console.log("RPC:", RPC_URL);
  console.log("Chain:", CHAIN_ID);

  console.log("\n========== CONTRACTS ==========");

  console.log("USDT:", USDT);
  console.log("ARDE:", ARDE);
  console.log("SSP:", SSP);
  console.log("PriceOracle:", PRICE_ORACLE);
  console.log("ReserveTreasury:", RESERVE_TREASURY);

  console.log("\n========== WALLET ==========");

  console.log("Configured TEST_WALLET:", TEST_WALLET);
  console.log("Signer wallet:", account.address);

  if (
    getAddress(TEST_WALLET) !==
    getAddress(account.address)
  ) {
    throw new Error(
      `TEST_WALLET (${TEST_WALLET}) does not match PRIVATE_KEY wallet (${account.address}).`
    );
  }

  // ---------------------------------------------------
  // BUY AMOUNT
  // ---------------------------------------------------

  const input = process.argv[2] || "100";

  const usdtAmount = Number(input);

  if (!Number.isFinite(usdtAmount) || usdtAmount <= 0) {
    throw new Error(
      "Usage: node test-dev-skim.mjs <USDT_AMOUNT>"
    );
  }

  const amountIn = parseUnits(
    usdtAmount.toFixed(6),
    6
  );

  console.log("\n========== TEST INPUT ==========");

  console.log(
    "USDT buy amount:",
    usdtAmount,
    "USDT"
  );

  // ---------------------------------------------------
  // WALLET BALANCES
  // ---------------------------------------------------

  const walletUSDTBefore =
    await getUSDTBalance(account.address);

  const walletARDEBefore =
    await getARDEBalance(account.address);

  console.log("\n========== WALLET BEFORE ==========");

  console.log(
    "USDT:",
    formatUnits(walletUSDTBefore, 6)
  );

  console.log(
    "ARDE:",
    formatUnits(walletARDEBefore, 18)
  );

  if (walletUSDTBefore < amountIn) {
    throw new Error(
      `Insufficient USDT. Required ${usdtAmount}, available ${formatUnits(
        walletUSDTBefore,
        6
      )}`
    );
  }

  // ---------------------------------------------------
  // POOL BEFORE
  // ---------------------------------------------------

  const reservesBefore =
    await getPoolReserves();

  console.log("\n========== POOL BEFORE ==========");

  console.log(
    "Reserve0:",
    formatUnits(reservesBefore[0], 18)
  );

  console.log(
    "Reserve1:",
    formatUnits(reservesBefore[1], 18)
  );

  const priceBefore =
    await getPoolPrice();

  if (priceBefore !== null) {
    console.log(
      "SSP Price:",
      priceBefore.toFixed(8),
      "USDT/ARDE"
    );
  }

  // ---------------------------------------------------
  // TREASURY BEFORE
  // ---------------------------------------------------

  const reserveBefore =
    await getUSDTBalance(RESERVE_TREASURY);

  console.log("\n========== RESERVE TREASURY BEFORE ==========");

  console.log(
    "USDT:",
    formatUnits(reserveBefore, 6)
  );

  // ---------------------------------------------------
  // QUOTE
  // ---------------------------------------------------

  console.log("\n========== SWAP QUOTE ==========");

  const quotedARDE =
    await quoteSwap(amountIn);

  console.log(
    "Input:",
    usdtAmount,
    "USDT"
  );

  console.log(
    "Quoted ARDE:",
    formatUnits(quotedARDE, 18)
  );

  // ---------------------------------------------------
  // SLIPPAGE
  // ---------------------------------------------------

  // For QA testing we use 2.5% tolerance.
  // This is NOT a recommendation for production.

  const amountOutMin =
    (quotedARDE * 9750n) / 10000n;

  console.log(
    "Minimum ARDE:",
    formatUnits(amountOutMin, 18)
  );

  // ---------------------------------------------------
  // APPROVAL
  // ---------------------------------------------------

  const allowance =
    await publicClient.readContract({
      address: USDT,
      abi: erc20Abi,
      functionName: "allowance",
      args: [
        account.address,
        SSP,
      ],
    });

  console.log("\n========== ALLOWANCE ==========");

  console.log(
    "Current allowance:",
    formatUnits(allowance, 6)
  );

  if (allowance < amountIn) {
    console.log(
      "Allowance insufficient."
    );

    console.log(
      "Sending USDT approval..."
    );

    const approveHash =
      await walletClient.writeContract({
        address: USDT,
        abi: erc20Abi,
        functionName: "approve",
        args: [
          SSP,
          maxUint256,
        ],
      });

    console.log(
      "Approval TX:",
      approveHash
    );

    await publicClient.waitForTransactionReceipt({
      hash: approveHash,
    });

    console.log(
      "Approval confirmed."
    );
  } else {
    console.log(
      "Allowance sufficient."
    );
  }

  // ---------------------------------------------------
  // SWAP
  // ---------------------------------------------------

  console.log("\n========== EXECUTING SWAP ==========");

  const deadline =
    BigInt(
      Math.floor(Date.now() / 1000) + 600
    );

  const swapHash =
    await walletClient.writeContract({
      address: SSP,
      abi: sspAbi,
      functionName:
        "swapExactTokensForTokens",
      args: [
        amountIn,
        amountOutMin,
        [USDT, ARDE],
        account.address,
        deadline,
      ],
    });

  console.log(
    "Swap TX:",
    swapHash
  );

  const receipt =
    await publicClient.waitForTransactionReceipt({
      hash: swapHash,
    });

  console.log(
    "Transaction status:",
    receipt.status
  );

  console.log(
    "Block:",
    receipt.blockNumber
  );

  // ---------------------------------------------------
  // AFTER
  // ---------------------------------------------------

  const walletUSDTAfter =
    await getUSDTBalance(account.address);

  const walletARDEAfter =
    await getARDEBalance(account.address);

  const reservesAfter =
    await getPoolReserves();

  const reserveAfter =
    await getUSDTBalance(RESERVE_TREASURY);

  const priceAfter =
    await getPoolPrice();

  console.log("\n========== WALLET AFTER ==========");

  console.log(
    "USDT:",
    formatUnits(walletUSDTAfter, 6)
  );

  console.log(
    "ARDE:",
    formatUnits(walletARDEAfter, 18)
  );

  console.log("\n========== POOL AFTER ==========");

  console.log(
    "Reserve0:",
    formatUnits(reservesAfter[0], 18)
  );

  console.log(
    "Reserve1:",
    formatUnits(reservesAfter[1], 18)
  );

  if (priceAfter !== null) {
    console.log(
      "SSP Price:",
      priceAfter.toFixed(8),
      "USDT/ARDE"
    );
  }

  // ---------------------------------------------------
  // TREASURY RESULT
  // ---------------------------------------------------

  console.log(
    "\n========== RESERVE TREASURY AFTER =========="
  );

  console.log(
    "USDT:",
    formatUnits(reserveAfter, 6)
  );

  const reserveDelta =
    reserveAfter - reserveBefore;

  console.log(
    "Reserve Treasury change:",
    formatUnits(reserveDelta, 6),
    "USDT"
  );

  // ---------------------------------------------------
  // FINAL
  // ---------------------------------------------------

  console.log("\n========== DEV SKIM RESULT ==========");

  console.log(
    "Swap:",
    `${usdtAmount} USDT → ARDE`
  );

  console.log(
    "TX:",
    swapHash
  );

  console.log(
    "Status:",
    receipt.status
  );

  if (reserveDelta > 0n) {
    console.log(
      "SKIM DETECTED: YES ✅"
    );

    console.log(
      "Reserve Treasury received:",
      formatUnits(reserveDelta, 6),
      "USDT"
    );
  } else {
    console.log(
      "SKIM DETECTED: NO"
    );

    console.log(
      "Reserve Treasury change: 0 USDT"
    );
  }

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

main().catch((error) => {
  console.error("\n========== ERROR ==========");

  console.error(
    error.shortMessage ||
    error.message ||
    error
  );

  process.exit(1);
});