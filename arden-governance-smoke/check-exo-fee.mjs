
import "dotenv/config";
import {
  createPublicClient,
  http,
  getAddress,
  defineChain,
  formatUnits,
} from "viem";

// =========================================================
// ARDEN / SOTTO UAT
// Check Exo Swap Fee (BPS)
// =========================================================

const RPC_URL = process.env.RPC_URL;
const SSP_ADDRESS = getAddress(process.env.SSP_ADDRESS);

// Sotto UAT
const sotto = defineChain({
  id: 1337,
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

// =========================================================
// ABI
// =========================================================
//
// IMPORTANT:
// Replace "getExoFeeBps" with the actual Tier/Fee function
// name from your SSP / Fee contract if different.
//

const abi = [
  {
    type: "function",
    name: "getExoFeeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
];

// =========================================================
// CLIENT
// =========================================================

const publicClient = createPublicClient({
  chain: sotto,
  transport: http(RPC_URL),
});

// =========================================================
// CHECK
// =========================================================

async function main() {
  console.log("==============================================");
  console.log("ARDEN / SOTTO UAT - EXO FEE CHECK");
  console.log("==============================================");

  console.log("SSP:", SSP_ADDRESS);

  const feeBps = await publicClient.readContract({
    address: SSP_ADDRESS,
    abi,
    functionName: "getExoFeeBps",
  });

  const bps = Number(feeBps);
  const percentage = bps / 100;

  console.log("");
  console.log("Exo Fee BPS:", bps);
  console.log("Exo Fee %:", percentage.toFixed(2) + "%");

  console.log("");

  if (bps === 397) {
    console.log("RESULT: PASS");
    console.log("Expected: 397 bps (3.97%)");
    console.log("Actual:   " + bps + " bps (3.97%)");
  } else {
    console.log("RESULT: FAIL");
    console.log("Expected: 397 bps (3.97%)");
    console.log(
      "Actual:   " +
        bps +
        " bps (" +
        percentage.toFixed(2) +
        "%)"
    );
  }

  console.log("==============================================");
}

main().catch((error) => {
  console.error("");
  console.error("ERROR:");
  console.error(error);
  process.exit(1);
});

