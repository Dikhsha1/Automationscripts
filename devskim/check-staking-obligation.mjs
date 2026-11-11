import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  defineChain,
} from "viem";

/* =========================================================
   CONFIG
========================================================= */

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);
const STAKING_ENGINE = process.env.STAKING_ENGINE;

// Optional: one or more NFT IDs to inspect individually.
// Example: NFT_IDS=1,2,3
const NFT_IDS = (process.env.NFT_IDS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean)
  .map(BigInt);

if (!RPC_URL) {
  throw new Error("Missing RPC_URL");
}

if (!STAKING_ENGINE) {
  throw new Error("Missing STAKING_ENGINE");
}

/* =========================================================
   CHAIN
========================================================= */

const chain = defineChain({
  id: CHAIN_ID,
  name: "ARDEN Dev",
  nativeCurrency: {
    name: "Native",
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

/* =========================================================
   STAKING ENGINE ABI
========================================================= */

const STAKING_ENGINE_ABI = [
  {
    inputs: [],
    name: "BASE_DPY",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "DAY",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "DPY_INCREMENT",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "LOCK_DAYS",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "MIN_REMAINDER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "MIN_STAKE",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "TERM_DAYS",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "EARLY_FEE_BPS",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "FEE_CUTOFF_DAY",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "FUEL_PER_ACTION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
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
        internalType: "uint256",
        name: "",
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
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "weightedStartSum",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "getObligationView",
    outputs: [
      {
        internalType: "uint256",
        name: "totalStaked",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "approxRewards",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "netAccrued",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalObligation",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256",
      },
    ],
    name: "positionCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256",
      },
    ],
    name: "positionsOf",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "principal",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "lastPrincipal",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "accruedBalance",
            type: "uint256",
          },
          {
            internalType: "uint64",
            name: "stakeTimestamp",
            type: "uint64",
          },
          {
            internalType: "uint16",
            name: "lastUpdateDay",
            type: "uint16",
          },
          {
            internalType: "uint8",
            name: "lastLoyaltyIndex",
            type: "uint8",
          },
          {
            internalType: "bool",
            name: "active",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "claimed",
            type: "uint256",
          },
        ],
        internalType: "struct StakingEngine.Position[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "posIndex",
        type: "uint256",
      },
    ],
    name: "previewAccrued",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "posIndex",
        type: "uint256",
      },
    ],
    name: "previewBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256",
      },
    ],
    name: "previewTotalAccrued",
    outputs: [
      {
        internalType: "uint256",
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
        internalType: "uint256",
        name: "nftId",
        type: "uint256",
      },
    ],
    name: "stakedByNft",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const contract = STAKING_ENGINE;

function units(value) {
  return formatUnits(value, 18);
}

function printResult(testId, description, passed, details = "") {
  console.log(
    `${testId.padEnd(12)} | ${description.padEnd(42)} | ${
      passed ? "PASS" : "FAIL"
    }${details ? ` | ${details}` : ""}`
  );
}

async function read(functionName, args = []) {
  return client.readContract({
    address: contract,
    abi: STAKING_ENGINE_ABI,
    functionName,
    args,
  });
}

/* =========================================================
   1. NETWORK
========================================================= */

async function testNetwork() {
  console.log("\n==================================================");
  console.log("              NETWORK CHECK");
  console.log("==================================================");

  const actualChainId = await client.getChainId();
  const blockNumber = await client.getBlockNumber();

  console.log("RPC          :", RPC_URL);
  console.log("Expected     :", CHAIN_ID);
  console.log("Actual       :", actualChainId);
  console.log("Block        :", blockNumber);
  console.log("StakingEngine:", STAKING_ENGINE);

  printResult(
    "OBL-001",
    "Correct chain",
    actualChainId === CHAIN_ID,
    `Chain ID ${actualChainId}`
  );

  return actualChainId === CHAIN_ID;
}

/* =========================================================
   2. CONTRACT PARAMETERS
========================================================= */

async function testParameters() {
  console.log("\n==================================================");
  console.log("           STAKING PARAMETERS");
  console.log("==================================================");

  const names = [
    "MIN_STAKE",
    "LOCK_DAYS",
    "TERM_DAYS",
    "BASE_DPY",
    "DPY_INCREMENT",
    "EARLY_FEE_BPS",
    "FEE_CUTOFF_DAY",
    "FUEL_PER_ACTION",
    "MIN_REMAINDER",
    "DAY",
  ];

  for (const name of names) {
    const value = await read(name);

    console.log(
      `${name.padEnd(22)} : ${value.toString()}`
    );
  }
}

/* =========================================================
   3. PROTOCOL OBLIGATION
========================================================= */

async function testProtocolObligation() {
  console.log("\n==================================================");
  console.log("           PROTOCOL OBLIGATION");
  console.log("==================================================");

  const totalStaked = await read(
    "totalStakedProtocol"
  );

  const totalClaimed = await read(
    "totalClaimedProtocol"
  );

  const obligation = await read(
    "getObligationView"
  );

  const contractTotalStaked = obligation[0];
  const approxRewards = obligation[1];
  const netAccrued = obligation[2];
  const totalObligation = obligation[3];

  console.log(
    "totalStakedProtocol() :",
    units(totalStaked),
    "ARDE"
  );

  console.log(
    "totalClaimedProtocol():",
    units(totalClaimed),
    "ARDE"
  );

  console.log("\ngetObligationView():");

  console.log(
    "totalStaked           :",
    units(contractTotalStaked),
    "ARDE"
  );

  console.log(
    "approxRewards         :",
    units(approxRewards),
    "ARDE"
  );

  console.log(
    "netAccrued            :",
    units(netAccrued),
    "ARDE"
  );

  console.log(
    "totalObligation       :",
    units(totalObligation),
    "ARDE"
  );

  /* -------------------------------------------------------
     TEST: totalStakedProtocol vs getObligationView
  ------------------------------------------------------- */

  printResult(
    "OBL-002",
    "Staked total reconciliation",
    totalStaked === contractTotalStaked,
    `Protocol=${units(totalStaked)} / View=${units(
      contractTotalStaked
    )}`
  );

  /* -------------------------------------------------------
     TEST: obligation includes rewards
  ------------------------------------------------------- */

  const expectedMinimumObligation =
    contractTotalStaked + netAccrued;

  const rewardsIncluded =
    totalObligation >= contractTotalStaked &&
    totalObligation >= expectedMinimumObligation;

  printResult(
    "OBL-003",
    "Obligation includes accrued rewards",
    rewardsIncluded,
    `Obligation=${units(totalObligation)} / Staked=${units(
      contractTotalStaked
    )} / NetAccrued=${units(netAccrued)}`
  );

  return {
    totalStaked,
    totalClaimed,
    contractTotalStaked,
    approxRewards,
    netAccrued,
    totalObligation,
  };
}

/* =========================================================
   4. NFT POSITION INSPECTION
========================================================= */

async function inspectNFT(nftId) {
  console.log("\n--------------------------------------------------");
  console.log(`NFT ${nftId.toString()}`);
  console.log("--------------------------------------------------");

  const count = await read("positionCount", [nftId]);

  const positions = await read("positionsOf", [nftId]);

  const nftStaked = await read("stakedByNft", [nftId]);

  const nftAccrued = await read(
    "previewTotalAccrued",
    [nftId]
  );

  console.log(
    "Position count       :",
    count.toString()
  );

  console.log(
    "stakedByNft          :",
    units(nftStaked),
    "ARDE"
  );

  console.log(
    "previewTotalAccrued  :",
    units(nftAccrued),
    "ARDE"
  );

  let calculatedPrincipal = 0n;
  let calculatedAccrued = 0n;
  let calculatedObligation = 0n;

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];

    const previewAccrued = await read(
      "previewAccrued",
      [nftId, BigInt(i)]
    );

    const previewBalance = await read(
      "previewBalance",
      [nftId, BigInt(i)]
    );

    console.log(`\nPosition #${i}`);

    console.log(
      "Principal             :",
      units(p.principal),
      "ARDE"
    );

    console.log(
      "Stored accruedBalance  :",
      units(p.accruedBalance),
      "ARDE"
    );

    console.log(
      "Current previewAccrued :",
      units(previewAccrued),
      "ARDE"
    );

    console.log(
      "Preview balance        :",
      units(previewBalance),
      "ARDE"
    );

    console.log(
      "Active                 :",
      p.active
    );

    console.log(
      "Claimed                :",
      units(p.claimed),
      "ARDE"
    );

    console.log(
      "Stake timestamp        :",
      p.stakeTimestamp.toString()
    );

    console.log(
      "Last update day        :",
      p.lastUpdateDay.toString()
    );

    console.log(
      "Last loyalty index     :",
      p.lastLoyaltyIndex.toString()
    );

    if (p.active) {
      calculatedPrincipal += p.principal;
      calculatedAccrued += previewAccrued;
      calculatedObligation +=
        p.principal + previewAccrued;
    }
  }

  console.log("\nNFT Calculation:");

  console.log(
    "Active principal       :",
    units(calculatedPrincipal),
    "ARDE"
  );

  console.log(
    "Current accrued        :",
    units(calculatedAccrued),
    "ARDE"
  );

  console.log(
    "Calculated obligation  :",
    units(calculatedObligation),
    "ARDE"
  );

  printResult(
    `NFT-${nftId}`,
    "NFT principal matches stakedByNft",
    calculatedPrincipal === nftStaked,
    `Calculated=${units(
      calculatedPrincipal
    )} / Contract=${units(nftStaked)}`
  );

  printResult(
    `ACC-${nftId}`,
    "NFT accrued matches previewTotalAccrued",
    calculatedAccrued === nftAccrued,
    `Calculated=${units(
      calculatedAccrued
    )} / Contract=${units(nftAccrued)}`
  );

  return {
    nftId,
    principal: calculatedPrincipal,
    accrued: calculatedAccrued,
    obligation: calculatedObligation,
  };
}

/* =========================================================
   5. MAIN
========================================================= */

async function main() {
  console.log("\n==================================================");
  console.log("       ARDEN STAKING ENGINE OBLIGATION QA");
  console.log("==================================================");

  console.log("Date           : 25-Aug-2026");
  console.log("Network        : ARDEN Dev");
  console.log("Chain ID       :", CHAIN_ID);
  console.log("RPC            :", RPC_URL);
  console.log("StakingEngine  :", STAKING_ENGINE);

  const networkOK = await testNetwork();

  if (!networkOK) {
    throw new Error("Wrong network. Stopping test.");
  }

  await testParameters();

  const protocol = await testProtocolObligation();

  /* -------------------------------------------------------
     NFT-LEVEL VALIDATION
  ------------------------------------------------------- */

  const nftResults = [];

  if (NFT_IDS.length > 0) {
    console.log("\n==================================================");
    console.log("          NFT LEVEL OBLIGATION CHECK");
    console.log("==================================================");

    for (const nftId of NFT_IDS) {
      const result = await inspectNFT(nftId);
      nftResults.push(result);
    }
  } else {
    console.log("\nNo NFT_IDS supplied.");
    console.log(
      "Skipping NFT-level reconciliation."
    );
    console.log(
      "Use NFT_IDS=1,2,3 in .env to inspect specific NFTs."
    );
  }

  /* -------------------------------------------------------
     FINAL SUMMARY
  ------------------------------------------------------- */

  console.log("\n==================================================");
  console.log("                FINAL SUMMARY");
  console.log("==================================================");

  console.log(
    "Contract total staked :",
    units(protocol.contractTotalStaked),
    "ARDE"
  );

  console.log(
    "Contract approx reward:",
    units(protocol.approxRewards),
    "ARDE"
  );

  console.log(
    "Contract net accrued  :",
    units(protocol.netAccrued),
    "ARDE"
  );

  console.log(
    "Contract obligation   :",
    units(protocol.totalObligation),
    "ARDE"
  );

  if (nftResults.length > 0) {
    let principal = 0n;
    let accrued = 0n;
    let obligation = 0n;

    for (const result of nftResults) {
      principal += result.principal;
      accrued += result.accrued;
      obligation += result.obligation;
    }

    console.log("\nSelected NFT totals:");

    console.log(
      "Principal             :",
      units(principal),
      "ARDE"
    );

    console.log(
      "Accrued rewards       :",
      units(accrued),
      "ARDE"
    );

    console.log(
      "Obligation            :",
      units(obligation),
      "ARDE"
    );
  }

  console.log("\n==================================================");
  console.log("       STAKING OBLIGATION QA COMPLETE");
  console.log("==================================================\n");
}

main().catch((error) => {
  console.error("\n❌ TEST FAILED");
  console.error(error);
  process.exit(1);
});