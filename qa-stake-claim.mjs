import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  getAddress
} from "viem";

// ===============================
// CONFIG
// ===============================

const RPC_URL = process.env.RPC_URL || "https://chain.sotto.li";
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

// Put your StakingEngine / contract address here
const STAKING_ENGINE = process.env.STAKING_ENGINE;

// Put the NFT ID you want to test here
const NFT_ID = process.env.NFT_ID;

if (!STAKING_ENGINE) {
  console.error("❌ Missing STAKING_ENGINE");
  console.log(
    "Example: set STAKING_ENGINE=0xYourStakingContractAddress"
  );
  process.exit(1);
}

if (!NFT_ID) {
  console.error("❌ Missing NFT_ID");
  console.log(
    "Example: set NFT_ID=10206862306487530304"
  );
  process.exit(1);
}

// ===============================
// CHAIN
// ===============================

const chain = {
  id: CHAIN_ID,
  name: "Sotto Chain",
  nativeCurrency: {
    name: "Native",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
    public: {
      http: [RPC_URL],
    },
  },
};

// ===============================
// CLIENT
// ===============================

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

// ===============================
// ABI
// ===============================

const abi = [
  {
    inputs: [],
    name: "BASE_DPY",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DPY_INCREMENT",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DAY",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCK_DAYS",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TERM_DAYS",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        name: "nftId",
        type: "uint256",
      },
    ],
    name: "stakedByNft",
    outputs: [
      {
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        name: "nftId",
        type: "uint256",
      },
    ],
    name: "claimedByNft",
    outputs: [
      {
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        name: "nftId",
        type: "uint256",
      },
    ],
    name: "previewTotalAccrued",
    outputs: [
      {
        name: "total",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        name: "nftId",
        type: "uint256",
      },
    ],
    name: "positionCount",
    outputs: [
      {
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        name: "nftId",
        type: "uint256",
      },
    ],
    name: "positionsOf",
    outputs: [
      {
        components: [
          {
            name: "principal",
            type: "uint256",
          },
          {
            name: "accruedBalance",
            type: "uint256",
          },
          {
            name: "stakeTimestamp",
            type: "uint64",
          },
          {
            name: "lastUpdateDay",
            type: "uint16",
          },
          {
            name: "lastLoyaltyIndex",
            type: "uint8",
          },
          {
            name: "active",
            type: "bool",
          },
          {
            name: "claimed",
            type: "uint256",
          },
        ],
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        name: "nftId",
        type: "uint256",
      },
      {
        name: "posIndex",
        type: "uint256",
      },
    ],
    name: "previewAccrued",
    outputs: [
      {
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        name: "nftId",
        type: "uint256",
      },
      {
        name: "posIndex",
        type: "uint256",
      },
    ],
    name: "previewBalance",
    outputs: [
      {
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalStakedProtocol",
    outputs: [
      {
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedProtocol",
    outputs: [
      {
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// ===============================
// MAIN
// ===============================

async function main() {
  console.log("\n======================================");
  console.log(" ARDEN STAKE / CLAIM QA CHECK");
  console.log("======================================");

  console.log(`RPC: ${RPC_URL}`);
  console.log(`Chain ID: ${CHAIN_ID}`);
  console.log(`Staking Engine: ${STAKING_ENGINE}`);
  console.log(`NFT ID: ${NFT_ID}`);

  // ===============================
  // CONTRACT CONSTANTS
  // ===============================

  console.log("\n==============================");
  console.log("CONTRACT PARAMETERS");
  console.log("==============================");

  const [
    baseDpy,
    dpyIncrement,
    day,
    lockDays,
    termDays,
  ] = await Promise.all([
    publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "BASE_DPY",
    }),

    publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "DPY_INCREMENT",
    }),

    publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "DAY",
    }),

    publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "LOCK_DAYS",
    }),

    publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "TERM_DAYS",
    }),
  ]);

  console.log("BASE_DPY      :", baseDpy.toString());
  console.log("DPY_INCREMENT :", dpyIncrement.toString());
  console.log("DAY           :", day.toString());
  console.log("LOCK_DAYS     :", lockDays.toString());
  console.log("TERM_DAYS     :", termDays.toString());

  // ===============================
  // NFT TOTALS
  // ===============================

  console.log("\n==============================");
  console.log("NFT TOTALS");
  console.log("==============================");

  const [
    staked,
    claimed,
    totalAccrued,
    positionCount,
  ] = await Promise.all([
    publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "stakedByNft",
      args: [BigInt(NFT_ID)],
    }),

    publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "claimedByNft",
      args: [BigInt(NFT_ID)],
    }),

    publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "previewTotalAccrued",
      args: [BigInt(NFT_ID)],
    }),

    publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "positionCount",
      args: [BigInt(NFT_ID)],
    }),
  ]);

  console.log("Staked       :", formatUnits(staked, 18));
  console.log("Claimed      :", formatUnits(claimed, 18));
  console.log("Accrued      :", formatUnits(totalAccrued, 18));
  console.log("Positions    :", positionCount.toString());

  // ===============================
  // POSITIONS
  // ===============================

  console.log("\n==============================");
  console.log("POSITIONS");
  console.log("==============================");

  const positions = await publicClient.readContract({
    address: getAddress(STAKING_ENGINE),
    abi,
    functionName: "positionsOf",
    args: [BigInt(NFT_ID)],
  });

  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];

    const previewAccrued = await publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "previewAccrued",
      args: [BigInt(NFT_ID), BigInt(i)],
    });

    const previewBalance = await publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "previewBalance",
      args: [BigInt(NFT_ID), BigInt(i)],
    });

    console.log(`\n--------- Position ${i} ---------`);

    console.log(
      "Principal:",
      formatUnits(position.principal, 18)
    );

    console.log(
      "Stored accrued:",
      formatUnits(position.accruedBalance, 18)
    );

    console.log(
      "Preview accrued:",
      formatUnits(previewAccrued, 18)
    );

    console.log(
      "Preview balance:",
      formatUnits(previewBalance, 18)
    );

    console.log(
      "Claimed:",
      formatUnits(position.claimed, 18)
    );

    console.log(
      "Stake timestamp:",
      new Date(
        Number(position.stakeTimestamp) * 1000
      ).toISOString()
    );

    console.log(
      "Last update day:",
      position.lastUpdateDay.toString()
    );

    console.log(
      "Last loyalty index:",
      position.lastLoyaltyIndex.toString()
    );

    console.log(
      "Active:",
      position.active
    );
  }

  // ===============================
  // PROTOCOL TOTALS
  // ===============================

  console.log("\n==============================");
  console.log("PROTOCOL TOTALS");
  console.log("==============================");

  const [
    protocolStaked,
    protocolClaimed,
  ] = await Promise.all([
    publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "totalStakedProtocol",
    }),

    publicClient.readContract({
      address: getAddress(STAKING_ENGINE),
      abi,
      functionName: "totalClaimedProtocol",
    }),
  ]);

  console.log(
    "Total protocol staked:",
    formatUnits(protocolStaked, 18)
  );

  console.log(
    "Total protocol claimed:",
    formatUnits(protocolClaimed, 18)
  );

  // ===============================
  // SUMMARY
  // ===============================

  console.log("\n======================================");
  console.log(" QA SUMMARY");
  console.log("======================================");

  console.log(
    "Principal Staked :",
    formatUnits(staked, 18),
    "ARDE"
  );

  console.log(
    "Already Claimed  :",
    formatUnits(claimed, 18),
    "ARDE"
  );

  console.log(
    "Currently Accrued:",
    formatUnits(totalAccrued, 18),
    "ARDE"
  );

  console.log(
    "Expected Claimable:",
    formatUnits(totalAccrued, 18),
    "ARDE"
  );

  console.log("\n======================================");
}

main().catch((error) => {
  console.error("\n❌ ERROR");
  console.error(error);
  process.exit(1);
});