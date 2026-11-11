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

console.log("PRIVATE_KEY:", config.PRIVATE_KEY);
console.log("Length:", config.PRIVATE_KEY?.length);
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

const erc20Abi = [
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
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view"
  }
];

// --- resolve real decimals ---
print("DECIMALS");

const usdtDecimals = await ssp.read.stablecoinDecimals();
const dagrDecimals = await publicClient.readContract({
  address: config.DAGR,
  abi: erc20Abi,
  functionName: "decimals"
});

console.log("USDT decimals:", usdtDecimals);
console.log("DAGR decimals:", dagrDecimals);

//read pool
print("POOL");

const reserve = await ssp.read.getReserves();

console.log(reserve);

//current price (fixed 18-decimal ratio, not tied to usdtDecimals)
print("PRICE");

const price = await ssp.read.getPriceInUSDT();

console.log(formatUnits(price, 18), "USDT");

//quote swap: DAGR -> USDT
print("QUOTE");

const amount = parseUnits("1", dagrDecimals); // selling 100 DAGR

const out = await ssp.read.getAmountsOut([
  amount,
  [config.DAGR, config.USDT],
  config.WALLET
]);

console.log("Input :", formatUnits(out[0], dagrDecimals));
console.log("Output:", formatUnits(out[1], usdtDecimals));

// --- approve DAGR spend if needed ---
const currentAllowance = await publicClient.readContract({
  address: config.DAGR,
  abi: erc20Abi,
  functionName: "allowance",
  args: [config.WALLET, config.SSP]
});

if (currentAllowance < amount) {
  print("APPROVE");
  const approveHash = await walletClient.writeContract({
    address: config.DAGR,
    abi: erc20Abi,
    functionName: "approve",
    args: [config.SSP, amount]
  });
  console.log("Approve Hash:", approveHash);

  await publicClient.waitForTransactionReceipt({ hash: approveHash });
}

// --- check DAGR balance before swapping ---
const dagrBalance = await publicClient.readContract({
  address: config.DAGR,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [config.WALLET]
});

console.log("DAGR balance:", formatUnits(dagrBalance, dagrDecimals));

if (dagrBalance < amount) {
  throw new Error(
    `Insufficient DAGR balance: have ${formatUnits(dagrBalance, dagrDecimals)}, need ${formatUnits(amount, dagrDecimals)}`
  );
}

//Swap: DAGR -> USDT
print("SWAP");

const hash = await walletClient.writeContract({
  address: config.SSP,
  abi: sspAbi,
  functionName: "swapExactTokensForTokens",
  args: [
    amount,
    0n, // consider a real min-out based on `out[1]` minus slippage tolerance
    [config.DAGR, config.USDT],
    config.WALLET,
    BigInt(Math.floor(Date.now() / 1000) + 600)
  ]
});

console.log("Transaction Hash:", hash);

//Transaction Receipt
const receipt = await publicClient.waitForTransactionReceipt({
  hash
});

console.log(receipt);

//Read Pool Again
const reserveAfter = await ssp.read.getReserves();

console.log(reserveAfter);