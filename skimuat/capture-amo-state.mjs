import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  defineChain,
} from "viem";

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const ARDE = "0xDCf82998bE1c95222816538C2dE514534804206b";
const USDT = "0x103df201ed80eE00FfE2f694C49926c7F0d42d72";

const SSP = "0x0F43Cde9eb5017CD28b2BF4Fc508698Ff8BD6aD3";
const RESERVE_TREASURY =
  "0x37759FBCaA5c39f761d9c422B31F2158Bd28d221";
const OPERATION_TREASURY =
  "0x63B89457edf03DFBdeEbe5E8ea083DFa58e68Fc3";

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
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
];

async function balance(token, account, decimals) {
  const value = await client.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account],
  });

  return formatUnits(value, decimals);
}

async function main() {
  console.log("\n========== AMO STATE ==========");
  console.log("RPC:", RPC_URL);
  console.log("Chain:", CHAIN_ID);

  const [
    sspUSDT,
    sspARDE,
    reserveUSDT,
    operationUSDT,
  ] = await Promise.all([
    balance(USDT, SSP, 6),
    balance(ARDE, SSP, 18),
    balance(USDT, RESERVE_TREASURY, 6),
    balance(USDT, OPERATION_TREASURY, 6),
  ]);

  console.log("\n========== SSP POOL ==========");
  console.log("SSP USDT:", sspUSDT);
  console.log("SSP ARDE:", sspARDE);

  console.log("\n========== TREASURIES ==========");
  console.log("Reserve USDT:", reserveUSDT);
  console.log("Operation USDT:", operationUSDT);

  console.log("\n========== AMO FLOOR ==========");
  console.log(
    "Pool >= $100,000:",
    Number(sspUSDT) >= 100000 ? "YES" : "NO"
  );

  console.log("\n========== END ==========");
}

main().catch((error) => {
  console.error("\nERROR:");
  console.error(error);
  process.exit(1);
});