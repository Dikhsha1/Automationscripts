import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  getAddress
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// =====================================================
// CONFIG
// =====================================================

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const STAKING_ENGINE = getAddress(process.env.STAKING_ENGINE);
const NFT_ID = BigInt(process.env.NFT_ID);

// Stake amount PER POSITION
const STAKE_PER_POSITION = parseUnits(
  process.env.STAKE_PER_POSITION || "10",
  18
);

// Number of positions to create in this run
const POSITION_COUNT = Number(
  process.env.POSITION_COUNT || 10
);

// =====================================================
// CHAIN
// =====================================================

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

// =====================================================
// ABI
// =====================================================

const STAKING_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "stake",
    outputs: [
      {
        internalType: "uint256",
        name: "posIndex",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
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
  }
];

// =====================================================
// CLIENTS
// =====================================================

const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL)
});

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(RPC_URL)
});

// =====================================================
// START
// =====================================================

console.log("==============================================");
console.log("       ARDEN STK-011 BATCH POSITION QA");
console.log("==============================================");

console.log("RPC             :", RPC_URL);
console.log("Chain ID        :", CHAIN_ID);
console.log("Wallet          :", account.address);
console.log("Staking Engine  :", STAKING_ENGINE);
console.log("NFT ID          :", NFT_ID.toString());

console.log("----------------------------------------------");
console.log("Positions to create :", POSITION_COUNT);
console.log(
  "Stake per position  :",
  formatUnits(STAKE_PER_POSITION, 18),
  "ARDE"
);

console.log(
  "Total required      :",
  formatUnits(STAKE_PER_POSITION * BigInt(POSITION_COUNT), 18),
  "ARDE"
);

console.log("==============================================");

// =====================================================
// READ BEFORE
// =====================================================

const beforeCount = await publicClient.readContract({
  address: STAKING_ENGINE,
  abi: STAKING_ABI,
  functionName: "positionCount",
  args: [NFT_ID]
});

console.log("\nBEFORE");
console.log("----------------------------------------------");
console.log("Position count:", beforeCount.toString());

// =====================================================
// CREATE POSITIONS
// =====================================================

const createdPositions = [];

for (let i = 0; i < POSITION_COUNT; i++) {

  const expectedIndex = beforeCount + BigInt(i);

  console.log("\n----------------------------------------------");
  console.log(
    `Creating position ${i + 1}/${POSITION_COUNT}`
  );

  console.log(
    "Expected position index:",
    expectedIndex.toString()
  );

  try {

    // Simulate first
    const simulation = await publicClient.simulateContract({
      account,
      address: STAKING_ENGINE,
      abi: STAKING_ABI,
      functionName: "stake",
      args: [
        NFT_ID,
        STAKE_PER_POSITION
      ]
    });

    console.log("✅ Simulation successful");

    // Send transaction
    const hash = await walletClient.writeContract(
      simulation.request
    );

    console.log("Transaction:", hash);

    // Wait confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash
    });

    if (receipt.status !== "success") {
      console.log("❌ Transaction failed");
      break;
    }

    console.log(
      "✅ Confirmed in block:",
      receipt.blockNumber.toString()
    );

    createdPositions.push({
      index: expectedIndex,
      hash
    });

  } catch (error) {

    console.log("\n❌ STAKE FAILED");

    console.log(
      error.shortMessage ||
      error.message ||
      error
    );

    console.log(
      "\nStopping batch to avoid continuing after failure."
    );

    break;
  }
}

// =====================================================
// READ AFTER
// =====================================================

const afterCount = await publicClient.readContract({
  address: STAKING_ENGINE,
  abi: STAKING_ABI,
  functionName: "positionCount",
  args: [NFT_ID]
});

console.log("\n==============================================");
console.log("              BATCH RESULT");
console.log("==============================================");

console.log(
  "Position count BEFORE :",
  beforeCount.toString()
);

console.log(
  "Position count AFTER  :",
  afterCount.toString()
);

console.log(
  "Positions requested   :",
  POSITION_COUNT
);

console.log(
  "Positions confirmed   :",
  createdPositions.length
);

const expectedAfter =
  beforeCount + BigInt(createdPositions.length);

console.log(
  "Expected count        :",
  expectedAfter.toString()
);

console.log("----------------------------------------------");

if (afterCount === expectedAfter) {
  console.log("✅ STK-011 POSITION COUNT PASSED");
} else {
  console.log("❌ STK-011 POSITION COUNT FAILED");

  console.log(
    "Difference:",
    (afterCount - expectedAfter).toString()
  );
}

// =====================================================
// VERIFY POSITIONS
// =====================================================

console.log("\n==============================================");
console.log("          VERIFY CREATED POSITIONS");
console.log("==============================================");

const positions = await publicClient.readContract({
  address: STAKING_ENGINE,
  abi: STAKING_ABI,
  functionName: "positionsOf",
  args: [NFT_ID]
});

let verificationPassed = true;

for (const item of createdPositions) {

  const index = Number(item.index);

  if (!positions[index]) {
    console.log(
      `❌ Position ${index}: NOT FOUND`
    );

    verificationPassed = false;
    continue;
  }

  const position = positions[index];

  const principal = formatUnits(
    position.principal,
    18
  );

  console.log(
    `Position ${index}: ${principal} ARDE | Active: ${position.active}`
  );

  if (
    position.principal !== STAKE_PER_POSITION
  ) {
    console.log(
      `   ❌ Principal mismatch`
    );

    verificationPassed = false;
  }

  if (!position.active) {
    console.log(
      `   ❌ Position is not active`
    );

    verificationPassed = false;
  }
}

// =====================================================
// FINAL RESULT
// =====================================================

console.log("\n==============================================");
console.log("              QA RESULT");
console.log("==============================================");

if (
  afterCount === expectedAfter &&
  verificationPassed &&
  createdPositions.length === POSITION_COUNT
) {

  console.log(
    "✅ STK-011 PASSED"
  );

  console.log(
    `✅ ${POSITION_COUNT} positions created successfully`
  );

  console.log(
    "✅ All created positions remain individually queryable"
  );

  console.log(
    `✅ Each position = ${formatUnits(
      STAKE_PER_POSITION,
      18
    )} ARDE`
  );

} else {

  console.log(
    "❌ STK-011 FAILED"
  );

}

console.log("==============================================");