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
  }
];

// --- USDT to ARde-
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

//current price
print("PRICE");

const price = await ssp.read.getPriceInUSDT();

console.log(formatUnits(price,18), "USDT");

//quote swap
print("QUOTE");

const amount = parseUnits("100", usdtDecimals);

const out = await ssp.read.getAmountsOut([
  amount,
  [config.USDT, config.DAGR],
  config.WALLET
]);

console.log("Input :", formatUnits(out[0], usdtDecimals));
console.log("Output:", formatUnits(out[1], dagrDecimals));

// --- approve if needed ---
const currentAllowance = await publicClient.readContract({
  address: config.USDT,
  abi: erc20Abi,
  functionName: "allowance",
  args: [config.WALLET, config.SSP]
});

if (currentAllowance < amount) {
  print("APPROVE");
  const approveHash = await walletClient.writeContract({
    address: config.USDT,
    abi: erc20Abi,
    functionName: "approve",
    args: [config.SSP, amount] // or a large/infinite value if you'll trade repeatedly
  });
  console.log("Approve Hash:", approveHash);

  // wait for approval to be mined before swapping
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
}

// --- check balance before swapping to fail fast with a clear message ---
const usdtBalance = await publicClient.readContract({
  address: config.USDT,
  abi: [
    {
      type: "function",
      name: "balanceOf",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ type: "uint256" }],
      stateMutability: "view"
    }
  ],
  functionName: "balanceOf",
  args: [config.WALLET]
});

console.log("USDT balance:", formatUnits(usdtBalance, usdtDecimals));

if (usdtBalance < amount) {
  throw new Error(
    `Insufficient USDT balance: have ${formatUnits(usdtBalance, usdtDecimals)}, need ${formatUnits(amount, usdtDecimals)}`
  );
}

//Swap
print("SWAP");

const hash = await walletClient.writeContract({
  address: config.SSP,
  abi: sspAbi,
  functionName: "swapExactTokensForTokens",
  args: [
    amount,
    0n, // consider setting a real min-out instead of 0 to avoid unlimited slippage
    [config.USDT, config.DAGR],
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