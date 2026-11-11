import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  getAddress
} from "viem";

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const STAKING_ENGINE = getAddress(process.env.STAKING_ENGINE);
const NFT_ID = BigInt(process.env.NFT_ID);

const chain = {
  id: CHAIN_ID,
  name: "Sotto Chain",
  nativeCurrency: {
    name: "Native",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [RPC_URL]
    }
  }
};

const client = createPublicClient({
  chain,
  transport: http(RPC_URL)
});

const abi = [
  {
    inputs: [
      {
        name: "nftId",
        type: "uint256"
      }
    ],
    name: "positionsOf",
    outputs: [
      {
        components: [
          {
            name: "principal",
            type: "uint256"
          },
          {
            name: "accruedBalance",
            type: "uint256"
          },
          {
            name: "stakeTimestamp",
            type: "uint64"
          },
          {
            name: "lastUpdateDay",
            type: "uint16"
          },
          {
            name: "lastLoyaltyIndex",
            type: "uint8"
          },
          {
            name: "active",
            type: "bool"
          },
          {
            name: "claimed",
            type: "uint256"
          }
        ],
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];

async function main() {

  console.log("\n======================================");
  console.log("       CLOSED POSITION QA CHECK");
  console.log("======================================");

  console.log("NFT ID:", NFT_ID.toString());

  const positions = await client.readContract({
    address: STAKING_ENGINE,
    abi,
    functionName: "positionsOf",
    args: [NFT_ID]
  });

  const closedPositions = positions.filter(
    position => position.active === false
  );

  if (closedPositions.length === 0) {
    console.log("\n❌ No closed positions found.");
    return;
  }

  console.log(
    `\nFound ${closedPositions.length} closed position(s).\n`
  );

  closedPositions.forEach((position, index) => {

    console.log("--------------------------------------");
    console.log(`Closed Position ${index}`);
    console.log("--------------------------------------");

    console.log(
      "Principal:",
      formatUnits(position.principal, 18),
      "ARDE"
    );

    console.log(
      "Stored Accrued:",
      formatUnits(position.accruedBalance, 18),
      "ARDE"
    );

    console.log(
      "Claimed:",
      formatUnits(position.claimed, 18),
      "ARDE"
    );

    console.log(
      "Active:",
      position.active
    );

    console.log(
      "Stake Timestamp:",
      new Date(
        Number(position.stakeTimestamp) * 1000
      ).toISOString()
    );

    console.log(
      "Last Update Day:",
      position.lastUpdateDay.toString()
    );

    console.log(
      "Last Loyalty Index:",
      position.lastLoyaltyIndex.toString()
    );
  });

  console.log("\n======================================");
  console.log("             QA RESULT");
  console.log("======================================");

  console.log(
    "Closed Positions:",
    closedPositions.length
  );

  console.log("======================================\n");
}

main().catch(error => {
  console.error("\n❌ ERROR:");
  console.error(error);
  process.exit(1);
});