import "dotenv/config";
import {
  createPublicClient,
  http,
  getAddress,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC_URL = process.env.RPC_URL;
const USER_REGISTRY = getAddress(process.env.USER_REGISTRY);
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const sotto = defineChain({
  id: Number(process.env.CHAIN_ID || 1337),
  name: "Sotto",
  nativeCurrency: {
    name: "Sotto",
    symbol: "SOTTO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
  },
});

const publicClient = createPublicClient({
  chain: sotto,
  transport: http(RPC_URL),
});

const account = privateKeyToAccount(PRIVATE_KEY);

const abi = [
  {
    type: "function",
    name: "regUserV2",
    inputs: [
      { name: "referrer", type: "string" },
      { name: "name", type: "string" },
      { name: "dagrAmountToUse", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

const referrer = "";
const name = `QA_MINT_PASS_${Date.now()}`;
const dagrAmountToUse = 0n;

console.log("=================================");
console.log("       ARDEN MINT PASS TEST");
console.log("=================================");
console.log("Contract :", USER_REGISTRY);
console.log("Wallet   :", account.address);
console.log("Function : regUserV2");
console.log("Name     :", name);
console.log("");

try {
  await publicClient.simulateContract({
    address: USER_REGISTRY,
    abi,
    functionName: "regUserV2",
    args: [
      referrer,
      name,
      dagrAmountToUse,
    ],
    account,
  });

  console.log("=================================");
  console.log("✅ MINT PASS");
  console.log("=================================");
  console.log("Contract-side mint call succeeded.");
  console.log("Mint is NOT paused at this contract path.");
  console.log("");
  console.log("No transaction was sent.");
} catch (error) {
  const reason =
    error?.cause?.reason ||
    error?.reason ||
    error?.shortMessage ||
    error?.message ||
    "Unknown revert";

  console.log("=================================");
  console.log("❌ MINT CALL FAILED");
  console.log("=================================");
  console.log("Revert reason:");
  console.log(reason);
  console.log("");

  if (
    reason.toLowerCase().includes("paused") ||
    reason.toLowerCase().includes("pause")
  ) {
    console.log("🚨 CONTRACT MINT IS PAUSED");
  } else {
    console.log("⚠️ Mint failed, but this does NOT confirm pause.");
    console.log("Check the revert reason above.");
  }

  console.log("");
  console.log("No transaction was sent.");
}