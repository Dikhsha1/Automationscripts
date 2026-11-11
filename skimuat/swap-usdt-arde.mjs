import "dotenv/config";

import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  defineChain,
  getAddress,
} from "viem";

import { privateKeyToAccount } from "viem/accounts";

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const SSP = getAddress(
  "0x0F43Cde9eb5017CD28b2BF4Fc508698Ff8BD6aD3"
);

const USDT = getAddress(
  "0x103df201ed80eE00FfE2f694C49926c7F0d42d72"
);

const ARDE = getAddress(
  "0xDCf82998bE1c95222816538C2dE514534804206b"
);

const USDT_DECIMALS = 6;
const ARDE_DECIMALS = 18;

// 2.5% slippage
const SLIPPAGE_BPS = 250;

if (!RPC_URL) {
  throw new Error("RPC_URL missing from .env");
}

if (!PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY missing from .env");
}

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
];

async function main() {
  const amountArg = process.argv[2];

  if (!amountArg) {
    throw new Error(
      "Usage: node swap-usdt-arde.mjs <USDT amount>"
    );
  }

  const usdtAmount = Number(amountArg);

  if (!Number.isFinite(usdtAmount) || usdtAmount <= 0) {
    throw new Error("USDT amount must be greater than 0");
  }

  const amountIn = parseUnits(
    usdtAmount.toFixed(USDT_DECIMALS),
    USDT_DECIMALS
  );

  console.log("\n========== ARDEN UAT SWAP ==========");

  console.log("Wallet:", account.address);
  console.log("SSP:", SSP);
  console.log("USDT:", USDT);
  console.log("ARDE:", ARDE);
  console.log("USDT input:", usdtAmount);

  // --------------------------------------------------
  // 1. Check USDT balance
  // --------------------------------------------------

  const balance = await publicClient.readContract({
    address: USDT,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  console.log(
    "USDT balance:",
    formatUnits(balance, USDT_DECIMALS)
  );

  if (balance < amountIn) {
    throw new Error("Insufficient USDT balance");
  }

  // --------------------------------------------------
  // 2. Get quote
  // --------------------------------------------------

  const quote = await publicClient.readContract({
    address: SSP,
    abi: sspAbi,
    functionName: "getAmountsOut",
    args: [
      amountIn,
      [USDT, ARDE],
      account.address,
    ],
  });

  const expectedARDE = quote[quote.length - 1];

  console.log(
    "Expected ARDE:",
    formatUnits(expectedARDE, ARDE_DECIMALS)
  );

  // --------------------------------------------------
  // 3. Calculate minimum received
  // --------------------------------------------------

  const amountOutMin =
    expectedARDE -
    (expectedARDE * BigInt(SLIPPAGE_BPS)) / 10000n;

  console.log(
    "Minimum ARDE:",
    formatUnits(amountOutMin, ARDE_DECIMALS)
  );

  console.log(
    "Slippage:",
    `${SLIPPAGE_BPS / 100}%`
  );

  // --------------------------------------------------
  // 4. Check allowance
  // --------------------------------------------------

  const allowance = await publicClient.readContract({
    address: USDT,
    abi: erc20Abi,
    functionName: "allowance",
    args: [
      account.address,
      SSP,
    ],
  });

  console.log(
    "Current allowance:",
    formatUnits(allowance, USDT_DECIMALS)
  );

  // --------------------------------------------------
  // 5. Approve if necessary
  // --------------------------------------------------

  if (allowance < amountIn) {
    console.log("\n========== APPROVAL ==========");

    const approveHash =
      await walletClient.writeContract({
        address: USDT,
        abi: erc20Abi,
        functionName: "approve",
        args: [
          SSP,
          amountIn,
        ],
      });

    console.log(
      "Approval TX:",
      approveHash
    );

    await publicClient.waitForTransactionReceipt({
      hash: approveHash,
    });

    console.log("Approval confirmed.");
  }

  // --------------------------------------------------
  // 6. Execute swap
  // --------------------------------------------------

  console.log("\n========== SWAP ==========");

  const deadline =
    BigInt(Math.floor(Date.now() / 1000) + 1200);

  const swapHash =
    await walletClient.writeContract({
      address: SSP,
      abi: sspAbi,
      functionName: "swapExactTokensForTokens",
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

  // --------------------------------------------------
  // 7. Wait for confirmation
  // --------------------------------------------------

  const receipt =
    await publicClient.waitForTransactionReceipt({
      hash: swapHash,
    });

  console.log("\n========== RESULT ==========");

  console.log(
    "Transaction:",
    swapHash
  );

  console.log(
    "Status:",
    receipt.status
  );

  console.log(
    "Block:",
    receipt.blockNumber
  );

  console.log(
    "Gas used:",
    receipt.gasUsed.toString()
  );

  console.log("\n========== END ==========\n");
}

main().catch((error) => {
  console.error("\nERROR:");
  console.error(
    error.shortMessage || error.message
  );

  process.exit(1);
});