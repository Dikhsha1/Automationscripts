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
const CHAIN_ID = Number(process.env.CHAIN_ID);

const USDT_ADDRESS = process.env.USDT_ADDRESS;
const ARDE_ADDRESS = process.env.ARDE_ADDRESS;

const STAKING_ENGINE = process.env.STAKING_ENGINE;

const RESERVE_TREASURY = process.env.RESERVE_TREASURY;
const OPERATION_TREASURY = process.env.OPERATION_TREASURY;

if (!RPC_URL) throw new Error("Missing RPC_URL");
if (!CHAIN_ID) throw new Error("Missing CHAIN_ID");

if (!USDT_ADDRESS) throw new Error("Missing USDT_ADDRESS");
if (!ARDE_ADDRESS) throw new Error("Missing ARDE_ADDRESS");

if (!STAKING_ENGINE) throw new Error("Missing STAKING_ENGINE");

if (!RESERVE_TREASURY) {
  throw new Error("Missing RESERVE_TREASURY");
}

if (!OPERATION_TREASURY) {
  throw new Error("Missing OPERATION_TREASURY");
}

/* =========================================================
   CHAIN
========================================================= */

const chain = defineChain({
  id: CHAIN_ID,
  name: "ARDEN Dev",

  nativeCurrency: {
    name: "ARDEN",
    symbol: "ARDEN",
    decimals: 18,
  },

  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
  },
});

/* =========================================================
   CLIENT
========================================================= */

const client = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

/* =========================================================
   ERC20 ABI
========================================================= */

const ERC20_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",

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
    name: "decimals",

    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],

    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "symbol",

    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],

    stateMutability: "view",
    type: "function",
  },
];

/* =========================================================
   STAKING ENGINE ABI
========================================================= */

const STAKING_ENGINE_ABI = [
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
];

/* =========================================================
   HELPERS
========================================================= */

function line(label, value) {
  console.log(`${label.padEnd(34)} : ${value}`);
}

async function tokenInfo(address) {
  const [decimals, symbol] = await Promise.all([
    client.readContract({
      address,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),

    client.readContract({
      address,
      abi: ERC20_ABI,
      functionName: "symbol",
    }),
  ]);

  return {
    decimals: Number(decimals),
    symbol,
  };
}

async function balanceOf(token, account) {
  return client.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account],
  });
}

/* =========================================================
   MAIN
========================================================= */

async function main() {

  console.log(`
==================================================
       ARDEN ANCHOR VALUE QA
==================================================
`);

  /* -------------------------------------------------------
     NETWORK
  ------------------------------------------------------- */

  const actualChainId = await client.getChainId();
  const blockNumber = await client.getBlockNumber();

  console.log("==================================================");
  console.log("              NETWORK CHECK");
  console.log("==================================================");

  line("RPC", RPC_URL);
  line("Expected Chain", CHAIN_ID);
  line("Actual Chain", actualChainId);
  line("Block", blockNumber);

  console.log(
    `AV-001 | Correct chain                  | ${
      actualChainId === CHAIN_ID ? "PASS" : "FAIL"
    }`
  );

  if (actualChainId !== CHAIN_ID) {
    throw new Error(
      `Wrong chain. Expected ${CHAIN_ID}, got ${actualChainId}`
    );
  }

  /* -------------------------------------------------------
     CONTRACTS
  ------------------------------------------------------- */

  console.log("\n==================================================");
  console.log("              CONTRACT CONFIG");
  console.log("==================================================");

  line("StakingEngine", STAKING_ENGINE);
  line("Reserve Treasury", RESERVE_TREASURY);
  line("Operation Treasury", OPERATION_TREASURY);
  line("USDT", USDT_ADDRESS);
  line("ARDE", ARDE_ADDRESS);

  /* -------------------------------------------------------
     TOKEN INFO
  ------------------------------------------------------- */

  const usdt = await tokenInfo(USDT_ADDRESS);
  const arde = await tokenInfo(ARDE_ADDRESS);

  console.log("\n==================================================");
  console.log("              TOKEN INFORMATION");
  console.log("==================================================");

  line("USDT Symbol", usdt.symbol);
  line("USDT Decimals", usdt.decimals);

  line("ARDE Symbol", arde.symbol);
  line("ARDE Decimals", arde.decimals);

  /* -------------------------------------------------------
     TREASURY BALANCES
  ------------------------------------------------------- */

  const [
    rtUsdtRaw,
    otUsdtRaw,
    rtArdeRaw,
    otArdeRaw,
  ] = await Promise.all([
    balanceOf(USDT_ADDRESS, RESERVE_TREASURY),
    balanceOf(USDT_ADDRESS, OPERATION_TREASURY),

    balanceOf(ARDE_ADDRESS, RESERVE_TREASURY),
    balanceOf(ARDE_ADDRESS, OPERATION_TREASURY),
  ]);

  const rtUsdt = Number(
    formatUnits(rtUsdtRaw, usdt.decimals)
  );

  const otUsdt = Number(
    formatUnits(otUsdtRaw, usdt.decimals)
  );

  const rtArde = Number(
    formatUnits(rtArdeRaw, arde.decimals)
  );

  const otArde = Number(
    formatUnits(otArdeRaw, arde.decimals)
  );

  console.log("\n==================================================");
  console.log("             TREASURY BALANCES");
  console.log("==================================================");

  line("RT USDT", `${rtUsdt} USDT`);
  line("OT USDT", `${otUsdt} USDT`);

  line("RT ARDE", `${rtArde} ARDE`);
  line("OT ARDE", `${otArde} ARDE`);

  /* -------------------------------------------------------
     AV ASSET INCLUSION RULE
  ------------------------------------------------------- */

  console.log("\n==================================================");
  console.log("             AV ASSET CLASSIFICATION");
  console.log("==================================================");

  console.log("RT USDT                         | INCLUDED");
  console.log("OT USDT                         | INCLUDED");

  console.log("RT ARDE                         | EXCLUDED");
  console.log("OT ARDE                         | EXCLUDED");

  console.log("Pool ARDE                       | EXCLUDED");
  console.log("Pool USDT                       | EXCLUDED");

  console.log(
    "\nReason: Treasury-held ARDE is excluded from AV."
  );

  console.log(
    "Reason: Pool ARDE/USDT matched position is excluded."
  );

  /* -------------------------------------------------------
     RESERVE ASSETS
  ------------------------------------------------------- */

  const eligibleReserveUsdt = rtUsdt + otUsdt;

  console.log("\n==================================================");
  console.log("          ELIGIBLE RESERVE ASSETS");
  console.log("==================================================");

  line(
    "Reserve Treasury USDT",
    `${rtUsdt} USDT`
  );

  line(
    "Operations Treasury USDT",
    `${otUsdt} USDT`
  );

  line(
    "TOTAL ELIGIBLE RESERVE",
    `${eligibleReserveUsdt} USDT`
  );

  /* -------------------------------------------------------
     STAKING ENGINE OBLIGATION
  ------------------------------------------------------- */

  const [
    totalStakedRaw,
    totalClaimedRaw,
    obligationView,
  ] = await Promise.all([

    client.readContract({
      address: STAKING_ENGINE,
      abi: STAKING_ENGINE_ABI,
      functionName: "totalStakedProtocol",
    }),

    client.readContract({
      address: STAKING_ENGINE,
      abi: STAKING_ENGINE_ABI,
      functionName: "totalClaimedProtocol",
    }),

    client.readContract({
      address: STAKING_ENGINE,
      abi: STAKING_ENGINE_ABI,
      functionName: "getObligationView",
    }),

  ]);

  const [
    totalStakedViewRaw,
    approxRewardsRaw,
    netAccruedRaw,
    totalObligationRaw,
  ] = obligationView;

  const totalStaked = Number(
    formatUnits(totalStakedRaw, arde.decimals)
  );

  const totalStakedView = Number(
    formatUnits(totalStakedViewRaw, arde.decimals)
  );

  const approxRewards = Number(
    formatUnits(approxRewardsRaw, arde.decimals)
  );

  const netAccrued = Number(
    formatUnits(netAccruedRaw, arde.decimals)
  );

  const totalObligation = Number(
    formatUnits(totalObligationRaw, arde.decimals)
  );

  const totalClaimed = Number(
    formatUnits(totalClaimedRaw, arde.decimals)
  );

  console.log("\n==================================================");
  console.log("             STAKING OBLIGATION");
  console.log("==================================================");

  line(
    "totalStakedProtocol()",
    `${totalStaked} ARDE`
  );

  line(
    "totalClaimedProtocol()",
    `${totalClaimed} ARDE`
  );

  line(
    "getObligationView.totalStaked",
    `${totalStakedView} ARDE`
  );

  line(
    "approxRewards",
    `${approxRewards} ARDE`
  );

  line(
    "netAccrued",
    `${netAccrued} ARDE`
  );

  line(
    "TOTAL OBLIGATION",
    `${totalObligation} ARDE`
  );

  /* -------------------------------------------------------
     OBLIGATION QA
  ------------------------------------------------------- */

  console.log("\n==================================================");
  console.log("             OBLIGATION QA");
  console.log("==================================================");

  const obligationReconciles =
    totalStaked === totalStakedView;

  console.log(
    `AV-002 | Staked reconciliation        | ${
      obligationReconciles ? "PASS" : "FAIL"
    }`
  );

  const rewardsIncluded =
    totalObligation >= totalStaked &&
    netAccrued >= 0;

  console.log(
    `AV-003 | Accrued rewards included     | ${
      rewardsIncluded ? "PASS" : "FAIL"
    }`
  );

  const formulaObligation =
    totalStakedView + netAccrued;

  const obligationFormulaPass =
    Math.abs(
      formulaObligation - totalObligation
    ) < 0.000000000001;

  console.log(
    `AV-004 | Obligation formula           | ${
      obligationFormulaPass ? "PASS" : "FAIL"
    }`
  );

  console.log(
    `      | Principal + Accrued Rewards   | ${formulaObligation} ARDE`
  );

  /* -------------------------------------------------------
     ANCHOR VALUE
  ------------------------------------------------------- */

  if (totalObligation <= 0) {
    throw new Error(
      "Cannot calculate AV: obligation is zero."
    );
  }

  const anchorValue =
    eligibleReserveUsdt / totalObligation;

  console.log("\n==================================================");
  console.log("              ANCHOR VALUE");
  console.log("==================================================");

  line(
    "Eligible Reserve",
    `${eligibleReserveUsdt} USDT`
  );

  line(
    "Estimated Obligation",
    `${totalObligation} ARDE`
  );

  line(
    "ANCHOR VALUE (AV)",
    `${anchorValue.toFixed(12)} USDT / ARDE`
  );

  /* -------------------------------------------------------
     FINAL FORMULA
  ------------------------------------------------------- */

  console.log("\n==================================================");
  console.log("              AV FORMULA");
  console.log("==================================================");

  console.log(
    `AV = Eligible Reserve Assets / Estimated Obligation`
  );

  console.log(
    `AV = ${eligibleReserveUsdt} / ${totalObligation}`
  );

  console.log(
    `AV = ${anchorValue.toFixed(12)} USDT / ARDE`
  );

  /* -------------------------------------------------------
     FINAL SUMMARY
  ------------------------------------------------------- */

  console.log("\n==================================================");
  console.log("              FINAL SUMMARY");
  console.log("==================================================");

  line(
    "RT eligible USDT",
    `${rtUsdt} USDT`
  );

  line(
    "OT eligible USDT",
    `${otUsdt} USDT`
  );

  line(
    "Eligible Reserve",
    `${eligibleReserveUsdt} USDT`
  );

  line(
    "Staked Principal",
    `${totalStakedView} ARDE`
  );

  line(
    "Accrued Rewards",
    `${netAccrued} ARDE`
  );

  line(
    "Estimated Obligation",
    `${totalObligation} ARDE`
  );

  line(
    "ANCHOR VALUE",
    `${anchorValue.toFixed(12)} USDT / ARDE`
  );

  console.log("\n==================================================");
  console.log("          ANCHOR VALUE QA COMPLETE");
  console.log("==================================================\n");
}

main().catch((error) => {
  console.error("\n❌ AV QA FAILED");
  console.error(error);
  process.exit(1);
});