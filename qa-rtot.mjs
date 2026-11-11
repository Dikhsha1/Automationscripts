import { createPublicClient, http } from "viem";
import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { parseUnits, formatUnits } from "viem";
import { getContract } from "viem";
import { config } from "./config.js";
import { sspAbi } from "./sspAbi.js";
import { print } from "./helper.js";

const publicClient = createPublicClient({
  transport: http(config.RPC)
});

const account = privateKeyToAccount(config.PRIVATE_KEY);

const walletClient = createWalletClient({
  account,
  transport: http(config.RPC)
});

const ssp = getContract({
  address: config.SSP,
  abi: sspAbi,
  client: {
    public: publicClient,
    wallet: walletClient
  }
});

// Treasury addresses that receive the extracted excess split
const RT = "0x554c1e44DF63AE9e7D83Db4a96A541E1cebEaAa0"; // 80%
const OT = "0x7037d9cb58784615fa6A177D3fD0aBc2D1E5E44a"; // 20%

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view"
  }
];

const usdtDecimals = await ssp.read.stablecoinDecimals();

// --- Snapshot RT/OT USDT balances BEFORE the buy ---
print("BEFORE");

const rtBefore = await publicClient.readContract({
  address: config.USDT,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [RT]
});

const otBefore = await publicClient.readContract({
  address: config.USDT,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [OT]
});

console.log("RT USDT balance:", formatUnits(rtBefore, usdtDecimals));
console.log("OT USDT balance:", formatUnits(otBefore, usdtDecimals));

// --- Declare the buy amount FIRST, before anything references it ---
// Lowered to 250 since wallet currently holds 300 USDT. Adjust up once
// the wallet is funded with more, to more reliably trigger extraction.
const amountIn = parseUnits("2500", usdtDecimals);

// --- Check wallet balance against amountIn ---
const usdtBalance = await publicClient.readContract({
  address: config.USDT,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [config.WALLET]
});

console.log("Wallet USDT balance:", formatUnits(usdtBalance, usdtDecimals));

if (usdtBalance < amountIn) {
  throw new Error(
    `Insufficient USDT balance: have ${formatUnits(usdtBalance, usdtDecimals)}, need ${formatUnits(amountIn, usdtDecimals)}. Fund the wallet before retrying.`
  );
}

// --- Approve if needed ---
const currentAllowance = await publicClient.readContract({
  address: config.USDT,
  abi: erc20Abi,
  functionName: "allowance",
  args: [config.WALLET, config.SSP]
});

if (currentAllowance < amountIn) {
  print("APPROVE");
  const approveHash = await walletClient.writeContract({
    address: config.USDT,
    abi: erc20Abi,
    functionName: "approve",
    args: [config.SSP, amountIn]
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log("Approved:", approveHash);
}

// --- Execute the buy: USDT -> ARDE ---
print("BUY");

const hash = await walletClient.writeContract({
  address: config.SSP,
  abi: sspAbi,
  functionName: "swapExactTokensForTokens",
  args: [
    amountIn,
    0n,
    [config.USDT, config.DAGR],
    config.WALLET,
    BigInt(Math.floor(Date.now() / 1000) + 600)
  ]
});

console.log("Buy Tx:", hash);

const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("Status:", receipt.status);

// --- Snapshot RT/OT USDT balances AFTER the buy ---
print("AFTER");

const rtAfter = await publicClient.readContract({
  address: config.USDT,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [RT]
});

const otAfter = await publicClient.readContract({
  address: config.USDT,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [OT]
});

console.log("RT USDT balance:", formatUnits(rtAfter, usdtDecimals));
console.log("OT USDT balance:", formatUnits(otAfter, usdtDecimals));

// --- Compute the observed split ---
print("EXTRACTION RESULT");

const rtDelta = rtAfter - rtBefore;
const otDelta = otAfter - otBefore;
const totalExtracted = rtDelta + otDelta;

console.log("RT received:", formatUnits(rtDelta, usdtDecimals), "USDT");
console.log("OT received:", formatUnits(otDelta, usdtDecimals), "USDT");

if (totalExtracted > 0n) {
  const rtPct = Number((rtDelta * 10000n) / totalExtracted) / 100;
  const otPct = Number((otDelta * 10000n) / totalExtracted) / 100;
  console.log(`Split: RT ${rtPct}% / OT ${otPct}% (expected 80% / 20%)`);
} else {
  console.log(
    "No extraction occurred on this buy — USDT reserve likely did not exceed PoolGuard.getTarget()."
  );
}