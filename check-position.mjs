import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  getAddress
} from "viem";

const RPC_URL = "https://chain.sotto.li";

const STAKING_ENGINE = getAddress(
  "0xC3E9b327BB4Ce8d92F06c224E9f32a85290eD3A0"
);

const NFT_ID = BigInt("12044075717716138298");

const chain = {
  id: 1337,
  name: "Sotto UAT",
  nativeCurrency: {
    name: "Sotto",
    symbol: "SOTTO",
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

const ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256"
      }
    ],
    name: "positionCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256"
      }
    ],
    name: "positionsOf",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "principal",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "accruedBalance",
            type: "uint256"
          },
          {
            internalType: "uint64",
            name: "stakeTimestamp",
            type: "uint64"
          },
          {
            internalType: "uint16",
            name: "lastUpdateDay",
            type: "uint16"
          },
          {
            internalType: "uint8",
            name: "lastLoyaltyIndex",
            type: "uint8"
          },
          {
            internalType: "bool",
            name: "active",
            type: "bool"
          },
          {
            internalType: "uint256",
            name: "claimed",
            type: "uint256"
          }
        ],
        internalType: "struct StakingEngine.Position[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "posIndex",
        type: "uint256"
      }
    ],
    name: "previewBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];

async function main() {

  console.log("\n======================================");
  console.log("       UAT POSITION DIAGNOSTIC");
  console.log("======================================");

  console.log("RPC:", RPC_URL);
  console.log("Engine:", STAKING_ENGINE);
  console.log("NFT:", NFT_ID.toString());

  // -----------------------------------
  // 1. positionCount
  // -----------------------------------

  const count = await client.readContract({
    address: STAKING_ENGINE,
    abi: ABI,
    functionName: "positionCount",
    args: [NFT_ID]
  });

  console.log("\nPosition Count:", count.toString());

  // -----------------------------------
  // 2. positionsOf
  // -----------------------------------

  const positions = await client.readContract({
    address: STAKING_ENGINE,
    abi: ABI,
    functionName: "positionsOf",
    args: [NFT_ID]
  });

  console.log("positionsOf length:", positions.length);

  // -----------------------------------
  // 3. Print positions
  // -----------------------------------

  for (let i = 0; i < positions.length; i++) {

    const p = positions[i];

    console.log("\n----------------------------------");
    console.log("Position:", i);

    console.log(
      "Principal:",
      formatUnits(p.principal, 18),
      "ARDE"
    );

    console.log(
      "Accrued:",
      formatUnits(p.accruedBalance, 18),
      "ARDE"
    );

    console.log(
      "Claimed:",
      formatUnits(p.claimed, 18),
      "ARDE"
    );

    console.log(
      "Active:",
      p.active
    );

    console.log(
      "Stake timestamp:",
      p.stakeTimestamp.toString()
    );

    console.log(
      "Stake date:",
      new Date(
        Number(p.stakeTimestamp) * 1000
      ).toISOString()
    );

    console.log(
      "Last update day:",
      p.lastUpdateDay.toString()
    );

    console.log(
      "Loyalty index:",
      p.lastLoyaltyIndex.toString()
    );

    const balance = await client.readContract({
      address: STAKING_ENGINE,
      abi: ABI,
      functionName: "previewBalance",
      args: [
        NFT_ID,
        BigInt(i)
      ]
    });

    console.log(
      "Preview balance:",
      formatUnits(balance, 18),
      "ARDE"
    );
  }

  console.log("\n======================================");

  if (positions.length === 0) {

    console.log(
      "❌ No position exists for this NFT."
    );

    console.log("\nPossible reasons:");
    console.log(
      "1. NFT ID is from another environment."
    );
    console.log(
      "2. NFT was created but stake was not made."
    );
    console.log(
      "3. Wrong StakingEngine address."
    );
    console.log(
      "4. The stake belongs to another NFT ID."
    );
    console.log(
      "5. UAT data was reset/redeployed."
    );
  }

  console.log("======================================\n");
}

main().catch(console.error);