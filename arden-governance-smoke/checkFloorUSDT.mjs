
import "dotenv/config";
import {
  createPublicClient,
  http,
  getAddress,
  defineChain,
} from "viem";

const RPC_URL = process.env.RPC_URL;

const ARDEN_GOVERNOR = getAddress(
  process.env.ARDEN_GOVERNOR
);

const PRICE_ORACLE = getAddress(
  process.env.PRICE_ORACLE
);

const sotto = defineChain({
  id: 1337,
  name: "Sotto",
  nativeCurrency: {
    name: "SOTTO",
    symbol: "SOTTO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
  },
});

const client = createPublicClient({
  chain: sotto,
  transport: http(RPC_URL),
});

// Possible function names to investigate
const functions = [
  "floorUSDT()",
  "priceFloor()",
  "getFloorUSDT()",
  "getPriceFloor()",
];

async function checkContract(address, name) {
  console.log("\n======================================");
  console.log(name);
  console.log(address);
  console.log("======================================");

  for (const signature of functions) {
    try {
      const result = await client.call({
        to: address,
        data: undefined,
      });

      console.log(signature, result);
    } catch (error) {
      console.log(`${signature}: cannot call with current ABI`);
    }
  }
}

async function main() {
  console.log("RPC:", RPC_URL);

  console.log("\nGovernor:");
  console.log(ARDEN_GOVERNOR);

  console.log("\nPrice Oracle:");
  console.log(PRICE_ORACLE);

  console.log("\nNOTE:");
  console.log(
    "We need the actual ABI/function signature before reading floorUSDT."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});