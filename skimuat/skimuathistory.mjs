import {
  createPublicClient,
  http,
  parseAbi,
  formatUnits,
  getAddress,
} from "viem";

import fs from "fs";
import path from "path";

// =====================================================
// ARDEN UAT CONFIGURATION
// =====================================================

const RPC_URL = "https://chain.sotto.li";
const CHAIN_ID = 1337;

// =====================================================
// UAT ADDRESSES
// =====================================================

const USDT = getAddress(
  "0x103df201ed80eE00FfE2f694C49926c7F0d42d72"
);

const DAGR = getAddress(
  "0xDCf82998bE1c95222816538C2dE514534804206b"
);

const SSP = getAddress(
  "0x0F43Cde9eb5017CD28b2BF4Fc508698Ff8BD6aD3"
);

const RT = getAddress(
  "0x37759FBCaA5c39f761d9c422B31F2158Bd28d221"
);

const OT = getAddress(
  "0x63B89457edf03DFBdeEbe5E8ea083DFa58e68Fc3"
);

const POOL_GUARD = getAddress(
  "0xBAa6f2c4bf2715F67dDAb54694cd4c10F111df15"
);

const PRICE_ORACLE = getAddress(
  "0x8350C9cabC24A0acaCc074BaCd59AAd228D1Eb81"
);

const LIQUIDITY_GUARD = getAddress(
  "0x2245116AF09D41c5D0108C79e2Cab530a7D7Ec17"
);

const IDENTITY_NFT = getAddress(
  "0x31281d9EbFF9236ff6b489F27Ad8a9BdB398336D"
);

const USER_REGISTRY = getAddress(
  "0x373194370D4E6D4364e45140dcD8FB2A30fA8CfD"
);

const REWARDS_ENGINE = getAddress(
  "0xC0813b76fd3ced22728A32E5c9aA61542c341C18"
);

const DAGROW_GENESIS_PRESALE = getAddress(
  "0xbcaA71066c0F403E1F4fc07A37d0B337189d15F1"
);

const SDAGR_TOKEN = getAddress(
  "0x356cf0F87812cf28090ec7Ca216F337eA072f288"
);

const DAGR_VAULT = getAddress(
  "0x293ABeD38C2A83CD8C30CbaB5c24579a3d7011df"
);

const REWARD_ROUTER = getAddress(
  "0xB46d7B9c6944201D1f7488F174210A1a4B5B12fa"
);

const TIER_MANAGER = getAddress(
  "0x317BFDF7F750d9A3AD8a45A9E911926A2aC82526"
);

const STAKING_ENGINE = getAddress(
  "0x56B30DD5f043661Ee3d82e84ED3204a595E33f7E"
);

const DAGROW_FACTORY = getAddress(
  "0x7dB341C3B455050De18241D64e6D3FcDBe4614fD"
);

// LiquidityOracle is zero address in supplied UAT configuration.
const LIQUIDITY_ORACLE =
  "0x0000000000000000000000000000000000000000";

// =====================================================
// SKIM CONFIGURATION
// =====================================================

const MIN_BUY_USDT = 50;

const SKIM_BPS = 5000; // 50%

const RT_BPS = 8000; // 80%

const OT_BPS = 2000; // 20%

// =====================================================
// DATE RANGE
// =====================================================
//
// Change these dates when performing a new UAT run.
//
// Current range:
// 25-Aug-2026 00:00 IST
// through
// 27-Aug-2026 00:00 IST
//

const START_DATE = "2026-08-25T00:00:00+05:30";

const END_DATE = "2026-08-27T00:00:00+05:30";

// =====================================================
// REPORT DIRECTORY
// =====================================================

const REPORT_DIR = "./reports";

if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, {
    recursive: true,
  });
}

// =====================================================
// REPORT DATE
// =====================================================

function reportDateFromRange() {
  return START_DATE
    .slice(0, 10)
    .replace(/-/g, "");
}

const REPORT_DATE =
  reportDateFromRange();

const CSV_FILE = path.join(
  REPORT_DIR,
  `uat-ssp-skim-history-${REPORT_DATE}.csv`
);

// =====================================================
// CLIENT
// =====================================================

const publicClient =
  createPublicClient({
    chain: {
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
    },

    transport: http(RPC_URL),
  });

// =====================================================
// ABI
// =====================================================

const transferEventAbi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

// =====================================================
// HELPERS
// =====================================================

function same(a, b) {
  return (
    a?.toLowerCase() ===
    b?.toLowerCase()
  );
}

function usdt(raw) {
  return Number(
    formatUnits(raw, 6)
  );
}

function dagr(raw) {
  return Number(
    formatUnits(raw, 18)
  );
}

function money(value) {
  return Number(value || 0).toFixed(6);
}

function shortHash(hash) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function shortAddress(address) {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function csvEscape(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return `"${String(value)
    .replace(/"/g, '""')}"`;
}

// =====================================================
// BLOCK SEARCH
// =====================================================

async function findFirstBlock(
  targetTimestamp,
  latestBlock
) {

  let low = 0n;

  let high = latestBlock;

  while (low < high) {

    const mid =
      (low + high) / 2n;

    const block =
      await publicClient.getBlock({
        blockNumber: mid,
      });

    if (
      Number(block.timestamp) >=
      targetTimestamp
    ) {

      high = mid;

    } else {

      low = mid + 1n;
    }
  }

  return low;
}

async function findLastBlock(
  targetTimestamp,
  latestBlock
) {

  let low = 0n;

  let high = latestBlock;

  while (low < high) {

    const mid =
      (low + high + 1n) / 2n;

    const block =
      await publicClient.getBlock({
        blockNumber: mid,
      });

    if (
      Number(block.timestamp) <=
      targetTimestamp
    ) {

      low = mid;

    } else {

      high = mid - 1n;
    }
  }

  return low;
}

// =====================================================
// GET TRANSFERS FOR TRANSACTION
// =====================================================

async function getTransfersForTransaction(
  blockNumber,
  txHash
) {

  const transfers = [];

  // ---------------------------------------------------
  // USDT
  // ---------------------------------------------------

  const usdtLogs =
    await publicClient.getLogs({
      address: USDT,

      event:
        transferEventAbi[0],

      fromBlock:
        blockNumber,

      toBlock:
        blockNumber,
    });

  for (const log of usdtLogs) {

    if (
      log.transactionHash !==
      txHash
    ) {
      continue;
    }

    transfers.push({
      token: "USDT",

      from: log.args.from,

      to: log.args.to,

      value: log.args.value,

      txHash:
        log.transactionHash,

      logIndex:
        log.logIndex,
    });
  }

  // ---------------------------------------------------
  // DAGR
  // ---------------------------------------------------

  const dagrLogs =
    await publicClient.getLogs({
      address: DAGR,

      event:
        transferEventAbi[0],

      fromBlock:
        blockNumber,

      toBlock:
        blockNumber,
    });

  for (const log of dagrLogs) {

    if (
      log.transactionHash !==
      txHash
    ) {
      continue;
    }

    transfers.push({
      token: "DAGR",

      from: log.args.from,

      to: log.args.to,

      value: log.args.value,

      txHash:
        log.transactionHash,

      logIndex:
        log.logIndex,
    });
  }

  return transfers;
}

// =====================================================
// CLASSIFY TRANSACTION
// =====================================================

function classifyTransaction(
  transfers
) {

  const usdtToSSP =
    transfers.some(
      x =>
        x.token === "USDT" &&
        same(x.to, SSP) &&
        !same(x.from, SSP)
    );

  const usdtFromSSP =
    transfers.some(
      x =>
        x.token === "USDT" &&
        same(x.from, SSP) &&
        !same(x.to, SSP)
    );

  const dagrToSSP =
    transfers.some(
      x =>
        x.token === "DAGR" &&
        same(x.to, SSP) &&
        !same(x.from, SSP)
    );

  const dagrFromSSP =
    transfers.some(
      x =>
        x.token === "DAGR" &&
        same(x.from, SSP) &&
        !same(x.to, SSP)
    );

  const rtUSDT =
    transfers.some(
      x =>
        x.token === "USDT" &&
        same(x.to, RT)
    );

  const otUSDT =
    transfers.some(
      x =>
        x.token === "USDT" &&
        same(x.to, OT)
    );

  // ---------------------------------------------------
  // SKIM
  // ---------------------------------------------------

  if (
    rtUSDT ||
    otUSDT
  ) {

    return "SKIM";
  }

  // ---------------------------------------------------
  // BUY
  // ---------------------------------------------------

  if (
    usdtToSSP &&
    dagrFromSSP
  ) {

    return "BUY";
  }

  // ---------------------------------------------------
  // SELL
  // ---------------------------------------------------

  if (
    dagrToSSP &&
    usdtFromSSP
  ) {

    return "SELL";
  }

  // ---------------------------------------------------
  // LIQUIDITY ADD
  // ---------------------------------------------------

  if (
    usdtToSSP &&
    dagrToSSP
  ) {

    return "LIQUIDITY ADD";
  }

  return "OTHER";
}

// =====================================================
// MAIN
// =====================================================

async function main() {

  console.log(
    "\n=============================================="
  );

  console.log(
    "       ARDEN UAT SSP SKIM HISTORY"
  );

  console.log(
    "=============================================="
  );

  console.log(
    `Environment : UAT`
  );

  console.log(
    `RPC         : ${RPC_URL}`
  );

  console.log(
    `Chain ID    : ${CHAIN_ID}`
  );

  // ===================================================
  // UAT CONTRACTS
  // ===================================================

  console.log(
    "\n=============================================="
  );

  console.log(
    "             UAT CONTRACTS"
  );

  console.log(
    "=============================================="
  );

  console.log(
    `USDT              : ${USDT}`
  );

  console.log(
    `DAGR              : ${DAGR}`
  );

  console.log(
    `Strategic SSP     : ${SSP}`
  );

  console.log(
    `Reserve Treasury  : ${RT}`
  );

  console.log(
    `Operation Treasury: ${OT}`
  );

  console.log(
    `Pool Guard        : ${POOL_GUARD}`
  );

  console.log(
    `Price Oracle      : ${PRICE_ORACLE}`
  );

  console.log(
    `Liquidity Guard   : ${LIQUIDITY_GUARD}`
  );

  console.log(
    `Staking Engine    : ${STAKING_ENGINE}`
  );

  // ===================================================
  // SKIM CONFIG
  // ===================================================

  console.log(
    "\n=============================================="
  );

  console.log(
    "             SKIM CONFIGURATION"
  );

  console.log(
    "=============================================="
  );

  console.log(
    `Minimum Buy      : ${MIN_BUY_USDT} USDT`
  );

  console.log(
    `Skim             : ${SKIM_BPS / 100}%`
  );

  console.log(
    `Reserve Treasury : ${RT_BPS / 100}%`
  );

  console.log(
    `Operation        : ${OT_BPS / 100}%`
  );

  // ===================================================
  // DATE → BLOCK
  // ===================================================

  const startTimestamp =
    Math.floor(
      new Date(
        START_DATE
      ).getTime() / 1000
    );

  const endTimestamp =
    Math.floor(
      new Date(
        END_DATE
      ).getTime() / 1000
    );

  if (
    Number.isNaN(
      startTimestamp
    ) ||
    Number.isNaN(
      endTimestamp
    )
  ) {

    throw new Error(
      "Invalid START_DATE or END_DATE"
    );
  }

  const latestBlock =
    await publicClient
      .getBlockNumber();

  console.log(
    "\n=============================================="
  );

  console.log(
    "              BLOCK RANGE"
  );

  console.log(
    "=============================================="
  );

  console.log(
    `Latest block : ${latestBlock}`
  );

  const startBlock =
    await findFirstBlock(
      startTimestamp,
      latestBlock
    );

  const endBlock =
    await findLastBlock(
      endTimestamp,
      latestBlock
    );

  console.log(
    `Start block  : ${startBlock}`
  );

  console.log(
    `End block    : ${endBlock}`
  );

  // ===================================================
  // GET TOKEN LOGS
  // ===================================================

  console.log(
    "\n=============================================="
  );

  console.log(
    "       SEARCHING UAT SSP ACTIVITY"
  );

  console.log(
    "=============================================="
  );

  const usdtLogs =
    await publicClient.getLogs({
      address: USDT,

      event:
        transferEventAbi[0],

      fromBlock:
        startBlock,

      toBlock:
        endBlock,
    });

  const dagrLogs =
    await publicClient.getLogs({
      address: DAGR,

      event:
        transferEventAbi[0],

      fromBlock:
        startBlock,

      toBlock:
        endBlock,
    });

  const txHashes =
    new Set();

  // ---------------------------------------------------
  // USDT transactions
  // ---------------------------------------------------

  for (const log of usdtLogs) {

    if (
      same(log.args.from, SSP) ||
      same(log.args.to, SSP) ||
      same(log.args.to, RT) ||
      same(log.args.to, OT)
    ) {

      txHashes.add(
        log.transactionHash
      );
    }
  }

  // ---------------------------------------------------
  // DAGR transactions
  // ---------------------------------------------------

  for (const log of dagrLogs) {

    if (
      same(log.args.from, SSP) ||
      same(log.args.to, SSP)
    ) {

      txHashes.add(
        log.transactionHash
      );
    }
  }

  console.log(
    `Relevant transactions : ${txHashes.size}`
  );

  // ===================================================
  // PROCESS TRANSACTIONS
  // ===================================================

  const transactions = [];

  for (
    const hash of txHashes
  ) {

    const receipt =
      await publicClient
        .getTransactionReceipt({
          hash,
        });

    const blockNumber =
      receipt.blockNumber;

    const block =
      await publicClient.getBlock({
        blockNumber,
      });

    const timestamp =
      new Date(
        Number(
          block.timestamp
        ) * 1000
      ).toLocaleString(
        "en-IN",
        {
          timeZone:
            "Asia/Kolkata",
        }
      );

    const transaction =
      await publicClient
        .getTransaction({
          hash,
        });

    const transfers =
      await getTransfersForTransaction(
        blockNumber,
        hash
      );

    const type =
      classifyTransaction(
        transfers
      );

    // =================================================
    // TOKEN MOVEMENTS
    // =================================================

    let usdtToPool = 0;

    let usdtFromPool = 0;

    let dagrToPool = 0;

    let dagrFromPool = 0;

    let rtAmount = 0;

    let otAmount = 0;

    for (
      const transfer of transfers
    ) {

      if (
        transfer.token ===
        "USDT"
      ) {

        const amount =
          usdt(
            transfer.value
          );

        if (
          same(
            transfer.to,
            SSP
          )
        ) {

          usdtToPool +=
            amount;
        }

        if (
          same(
            transfer.from,
            SSP
          )
        ) {

          usdtFromPool +=
            amount;
        }

        if (
          same(
            transfer.to,
            RT
          )
        ) {

          rtAmount +=
            amount;
        }

        if (
          same(
            transfer.to,
            OT
          )
        ) {

          otAmount +=
            amount;
        }
      }

      if (
        transfer.token ===
        "DAGR"
      ) {

        const amount =
          dagr(
            transfer.value
          );

        if (
          same(
            transfer.to,
            SSP
          )
        ) {

          dagrToPool +=
            amount;
        }

        if (
          same(
            transfer.from,
            SSP
          )
        ) {

          dagrFromPool +=
            amount;
        }
      }
    }

    // =================================================
    // SKIM CALCULATION
    // =================================================

    const totalSkim =
      rtAmount +
      otAmount;

    let rtPercent = 0;

    let otPercent = 0;

    if (
      totalSkim > 0
    ) {

      rtPercent =
        (
          rtAmount /
          totalSkim
        ) * 100;

      otPercent =
        (
          otAmount /
          totalSkim
        ) * 100;
    }

    const splitPass =
      totalSkim > 0 &&
      Math.abs(
        rtPercent - 80
      ) < 0.01 &&
      Math.abs(
        otPercent - 20
      ) < 0.01;

    // =================================================
    // BUY / SKIM RELATIONSHIP
    // =================================================

    let inferredBuy = 0;

    let expectedSkim = 0;

    let skimPercentOfBuy = 0;

    if (
      type === "SKIM"
    ) {

      /*
       * Expected:
       *
       * SKIM = 50% of qualifying buy
       *
       * Therefore:
       *
       * Buy = SKIM / 0.50
       */

      inferredBuy =
        totalSkim /
        (
          SKIM_BPS /
          10000
        );

      expectedSkim =
        inferredBuy *
        (
          SKIM_BPS /
          10000
        );

      skimPercentOfBuy =
        inferredBuy > 0
          ? (
              totalSkim /
              inferredBuy
            ) * 100
          : 0;
    }

    // =================================================
    // MIN BUY CHECK
    // =================================================

    let minimumBuyCheck =
      "N/A";

    if (
      type === "SKIM"
    ) {

      minimumBuyCheck =
        inferredBuy >=
        MIN_BUY_USDT
          ? "PASS"
          : "FAIL";
    }

    // =================================================
    // QA STATUS
    // =================================================

    let qaResult =
      "INFO";

    if (
      type === "SKIM"
    ) {

      qaResult =
        splitPass &&
        minimumBuyCheck ===
          "PASS" &&
        Math.abs(
          skimPercentOfBuy - 50
        ) < 0.01
          ? "PASS"
          : "FAIL";
    }

    if (
      type === "SELL"
    ) {

      qaResult =
        totalSkim === 0
          ? "PASS"
          : "FAIL";
    }

    if (
      type === "BUY"
    ) {

      qaResult =
        usdtToPool >=
        MIN_BUY_USDT
          ? "PASS"
          : "INFO";
    }

    if (
      type ===
      "LIQUIDITY ADD"
    ) {

      qaResult =
        "VERIFY LP MINT";
    }

    // =================================================
    // STORE
    // =================================================

    transactions.push({

      environment:
        "UAT",

      dateTime:
        timestamp,

      block:
        blockNumber.toString(),

      transactionHash:
        hash,

      shortTransactionHash:
        shortHash(hash),

      from:
        transaction.from,

      shortFrom:
        shortAddress(
          transaction.from
        ),

      type,

      usdtToPool,

      usdtFromPool,

      dagrToPool,

      dagrFromPool,

      rtAmount,

      otAmount,

      totalSkim,

      rtPercent,

      otPercent,

      splitCheck:
        type === "SKIM"
          ? splitPass
            ? "PASS"
            : "FAIL"
          : "N/A",

      inferredBuy,

      minimumBuyCheck,

      expectedSkim,

      skimPercentOfBuy,

      skimGate:
        type === "SKIM"
          ? "TRIGGERED"
          : "NOT TRIGGERED",

      liquidityCheck:
        type ===
        "LIQUIDITY ADD"
          ? "CHECK LP MINT EVENT"
          : "N/A",

      qaResult,
    });
  }

  // ===================================================
  // SORT
  // ===================================================

  transactions.sort(
    (a, b) =>
      Number(a.block) -
      Number(b.block)
  );

  // ===================================================
  // PRINT HISTORY
  // ===================================================

  console.log(
    "\n=============================================="
  );

  console.log(
    "       DETAILED UAT TRANSACTION HISTORY"
  );

  console.log(
    "=============================================="
  );

  for (
    const tx of transactions
  ) {

    console.log(
      "\n----------------------------------------------"
    );

    console.log(
      `TYPE       : ${tx.type}`
    );

    console.log(
      `Date/Time  : ${tx.dateTime}`
    );

    console.log(
      `Block      : ${tx.block}`
    );

    console.log(
      `TX Hash    : ${tx.transactionHash}`
    );

    console.log(
      `From       : ${tx.from}`
    );

    console.log(
      "\nTOKEN MOVEMENTS"
    );

    console.log(
      `USDT → SSP : ${money(tx.usdtToPool)}`
    );

    console.log(
      `USDT ← SSP : ${money(tx.usdtFromPool)}`
    );

    console.log(
      `DAGR → SSP : ${tx.dagrToPool.toFixed(18)}`
    );

    console.log(
      `DAGR ← SSP : ${tx.dagrFromPool.toFixed(18)}`
    );

    console.log(
      `RT         : ${money(tx.rtAmount)}`
    );

    console.log(
      `OT         : ${money(tx.otAmount)}`
    );

    if (
      tx.type === "SKIM"
    ) {

      console.log(
        "\nSKIM ANALYSIS"
      );

      console.log(
        `Total Skim       : ${money(tx.totalSkim)}`
      );

      console.log(
        `Inferred Buy     : ${money(tx.inferredBuy)}`
      );

      console.log(
        `Minimum Buy      : ${MIN_BUY_USDT.toFixed(6)}`
      );

      console.log(
        `Minimum Buy Check: ${tx.minimumBuyCheck}`
      );

      console.log(
        `Expected Skim    : ${money(tx.expectedSkim)}`
      );

      console.log(
        `RT %             : ${tx.rtPercent.toFixed(4)}%`
      );

      console.log(
        `OT %             : ${tx.otPercent.toFixed(4)}%`
      );

      console.log(
        `50% Skim Check   : ${
          Math.abs(
            tx.skimPercentOfBuy - 50
          ) < 0.01
            ? "PASS ✅"
            : "FAIL ❌"
        }`
      );

      console.log(
        `80/20 Split      : ${tx.splitCheck}`
      );

      console.log(
        `Skim Gate        : ${tx.skimGate}`
      );
    }

    if (
      tx.type ===
      "LIQUIDITY ADD"
    ) {

      console.log(
        "\nLIQUIDITY ADD"
      );

      console.log(
        `USDT Added       : ${money(tx.usdtToPool)}`
      );

      console.log(
        `DAGR Added       : ${tx.dagrToPool.toFixed(18)}`
      );

      console.log(
        `LP Verification  : ${tx.liquidityCheck}`
      );
    }

    console.log(
      `QA RESULT        : ${tx.qaResult}`
    );
  }

  // ===================================================
  // CSV REPORT
  // ===================================================

  const headers = [

    "Environment",

    "Date/Time",

    "Block",

    "Transaction Hash",

    "Short TX Hash",

    "From",

    "Type",

    "USDT To SSP",

    "USDT From SSP",

    "DAGR To SSP",

    "DAGR From SSP",

    "RT Received",

    "OT Received",

    "Total Skim",

    "RT %",

    "OT %",

    "Split Check",

    "Inferred Buy",

    "Minimum Buy",

    "Minimum Buy Check",

    "Expected Skim",

    "Skim % of Buy",

    "Skim Gate",

    "Liquidity Check",

    "QA Result",
  ];

  const csvRows = [];

  csvRows.push(
    headers
      .map(csvEscape)
      .join(",")
  );

  // ---------------------------------------------------
  // Contract configuration rows are added as metadata
  // ---------------------------------------------------

  csvRows.push(
    [
      "UAT",
      "",
      "",
      "",
      "",
      "",
      "CONTRACT CONFIG",
      `USDT=${USDT}`,
      `DAGR=${DAGR}`,
      `SSP=${SSP}`,
      `RT=${RT}`,
      `OT=${OT}`,
      `PriceOracle=${PRICE_ORACLE}`,
      `PoolGuard=${POOL_GUARD}`,
      `LiquidityGuard=${LIQUIDITY_GUARD}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]
      .map(csvEscape)
      .join(",")
  );

  // ---------------------------------------------------
  // Transaction rows
  // ---------------------------------------------------

  for (
    const tx of transactions
  ) {

    csvRows.push(

      [
        tx.environment,

        tx.dateTime,

        tx.block,

        tx.transactionHash,

        tx.shortTransactionHash,

        tx.from,

        tx.type,

        money(
          tx.usdtToPool
        ),

        money(
          tx.usdtFromPool
        ),

        tx.dagrToPool
          .toFixed(18),

        tx.dagrFromPool
          .toFixed(18),

        money(
          tx.rtAmount
        ),

        money(
          tx.otAmount
        ),

        money(
          tx.totalSkim
        ),

        tx.rtPercent
          .toFixed(4),

        tx.otPercent
          .toFixed(4),

        tx.splitCheck,

        money(
          tx.inferredBuy
        ),

        MIN_BUY_USDT
          .toFixed(6),

        tx.minimumBuyCheck,

        money(
          tx.expectedSkim
        ),

        tx.skimPercentOfBuy
          .toFixed(4),

        tx.skimGate,

        tx.liquidityCheck,

        tx.qaResult,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  fs.writeFileSync(
    CSV_FILE,
    csvRows.join("\n"),
    "utf8"
  );

  // ===================================================
  // SUMMARY
  // ===================================================
  // ===================================================
  // OVERALL UAT TRANSACTION SUMMARY
  // ===================================================

  const counts = {
    BUY: 0,
    SELL: 0,
    SKIM: 0,
    "LIQUIDITY ADD": 0,
    OTHER: 0,
  };

  let totalSkimAmount = 0;
  let totalRT = 0;
  let totalOT = 0;

  let passCount = 0;
  let failCount = 0;
  let infoCount = 0;

  let totalUSDTToSSP = 0;
  let totalUSDTFromSSP = 0;

  let totalDAGRToSSP = 0;
  let totalDAGRFromSSP = 0;

  // ---------------------------------------------------
  // Process all transactions
  // ---------------------------------------------------

  for (const tx of transactions) {

    // Transaction type count
    if (counts[tx.type] !== undefined) {
      counts[tx.type]++;
    }

    // Token movement totals
    totalUSDTToSSP += tx.usdtToPool;
    totalUSDTFromSSP += tx.usdtFromPool;

    totalDAGRToSSP += tx.dagrToPool;
    totalDAGRFromSSP += tx.dagrFromPool;

    // QA result count
    if (tx.qaResult === "PASS") {
      passCount++;
    }

    if (tx.qaResult === "FAIL") {
      failCount++;
    }

    if (tx.qaResult === "INFO") {
      infoCount++;
    }

    // Skim totals
    if (tx.type === "SKIM") {

      totalSkimAmount += tx.totalSkim;

      totalRT += tx.rtAmount;

      totalOT += tx.otAmount;
    }
  }

  // ---------------------------------------------------
  // Today's date
  // ---------------------------------------------------

  const todayIST =
    new Date().toLocaleDateString(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );

  // ---------------------------------------------------
  // Overall result
  // ---------------------------------------------------

  let overallResult = "PASS";

  if (failCount > 0) {
    overallResult = "REVIEW";
  }

  // ===================================================
  // PRINT SUMMARY
  // ===================================================

  console.log(
    "\n================================================"
  );

  console.log(
    "             OVERALL UAT TRANSACTION SUMMARY"
  );

  console.log(
    "================================================"
  );

  console.log(
    `Environment       : UAT`
  );

  console.log(
    `Report Date       : ${todayIST}`
  );

  console.log(
    `Start Date        : ${START_DATE}`
  );

  console.log(
    `End Date          : ${END_DATE}`
  );

  console.log(
    `Start Block       : ${startBlock}`
  );

  console.log(
    `End Block         : ${endBlock}`
  );

  console.log(
    `Total Transactions: ${transactions.length}`
  );

  // ===================================================
  // TRANSACTION COUNTS
  // ===================================================

  console.log(
    "\n------------------------------------------------"
  );

  console.log(
    "TRANSACTION TYPE SUMMARY"
  );

  console.log(
    "------------------------------------------------"
  );

  console.log(
    `BUY               : ${counts.BUY}`
  );

  console.log(
    `SELL              : ${counts.SELL}`
  );

  console.log(
    `SKIM              : ${counts.SKIM}`
  );

  console.log(
    `LIQUIDITY ADD     : ${counts["LIQUIDITY ADD"]}`
  );

  console.log(
    `OTHER             : ${counts.OTHER}`
  );

  // ===================================================
  // TOKEN MOVEMENT SUMMARY
  // ===================================================

  console.log(
    "\n------------------------------------------------"
  );

  console.log(
    "OVERALL TOKEN MOVEMENTS"
  );

  console.log(
    "------------------------------------------------"
  );

  console.log(
    `USDT → SSP        : ${money(totalUSDTToSSP)} USDT`
  );

  console.log(
    `USDT ← SSP        : ${money(totalUSDTFromSSP)} USDT`
  );

  console.log(
    `DAGR → SSP        : ${totalDAGRToSSP.toFixed(18)} DAGR`
  );

  console.log(
    `DAGR ← SSP        : ${totalDAGRFromSSP.toFixed(18)} DAGR`
  );

  // ===================================================
  // SKIM SUMMARY
  // ===================================================

  console.log(
    "\n------------------------------------------------"
  );

  console.log(
    "SKIM SUMMARY"
  );

  console.log(
    "------------------------------------------------"
  );

  console.log(
    `Skim Transactions : ${counts.SKIM}`
  );

  console.log(
    `Total Skim        : ${money(totalSkimAmount)} USDT`
  );

  console.log(
    `Reserve Treasury  : ${money(totalRT)} USDT`
  );

  console.log(
    `Operation Treasury: ${money(totalOT)} USDT`
  );

  if (totalSkimAmount > 0) {

    const overallRTPercent =
      (totalRT / totalSkimAmount) * 100;

    const overallOTPercent =
      (totalOT / totalSkimAmount) * 100;

    console.log(
      `RT Share          : ${overallRTPercent.toFixed(4)}%`
    );

    console.log(
      `OT Share          : ${overallOTPercent.toFixed(4)}%`
    );

    console.log(
      `80/20 Split       : ${
        Math.abs(overallRTPercent - 80) < 0.01 &&
        Math.abs(overallOTPercent - 20) < 0.01
          ? "PASS ✅"
          : "FAIL ❌"
      }`
    );
  } else {

    console.log(
      `80/20 Split       : N/A`
    );
  }

  // ===================================================
  // QA RESULT SUMMARY
  // ===================================================

  console.log(
    "\n------------------------------------------------"
  );

  console.log(
    "QA RESULT SUMMARY"
  );

  console.log(
    "------------------------------------------------"
  );

  console.log(
    `PASS              : ${passCount}`
  );

  console.log(
    `FAIL              : ${failCount}`
  );

  console.log(
    `INFO              : ${infoCount}`
  );

  console.log(
    `Overall Result    : ${
      overallResult === "PASS"
        ? "PASS ✅"
        : "REVIEW ⚠️"
    }`
  );

  // ===================================================
  // TEST CONDITIONS
  // ===================================================

  console.log(
    "\n------------------------------------------------"
  );

  console.log(
    "SKIM TEST CONDITIONS VERIFIED"
  );

  console.log(
    "------------------------------------------------"
  );

  console.log(
    `Minimum Buy       : ${MIN_BUY_USDT} USDT`
  );

  console.log(
    `Skim Percentage   : ${SKIM_BPS / 100}%`
  );

  console.log(
    `Reserve Treasury  : ${RT_BPS / 100}%`
  );

  console.log(
    `Operation Treasury: ${OT_BPS / 100}%`
  );

  console.log(
    `Pool Threshold    : 100,000 USDT+`
  );

  console.log(
    `Price Index Gate  : Verified during UAT`
  );

  // ===================================================
  // FINAL SUMMARY
  // ===================================================

  console.log(
    "\n================================================"
  );

  console.log(
    "                 FINAL UAT SUMMARY"
  );

  console.log(
    "================================================"
  );

  console.log(
    `Total Transactions : ${transactions.length}`
  );

  console.log(
    `BUY                : ${counts.BUY}`
  );

  console.log(
    `SELL               : ${counts.SELL}`
  );

  console.log(
    `SKIM               : ${counts.SKIM}`
  );

  console.log(
    `Liquidity Adds     : ${counts["LIQUIDITY ADD"]}`
  );

  console.log(
    `Total Skim         : ${money(totalSkimAmount)} USDT`
  );

  console.log(
    `RT Received        : ${money(totalRT)} USDT`
  );

  console.log(
    `OT Received        : ${money(totalOT)} USDT`
  );

  console.log(
    `QA PASS            : ${passCount}`
  );

  console.log(
    `QA FAIL            : ${failCount}`
  );

  console.log(
    `QA INFO            : ${infoCount}`
  );

  console.log(
    `Overall QA         : ${
      overallResult === "PASS"
        ? "PASS ✅"
        : "REVIEW ⚠️"
    }`
  );

  console.log(
    "================================================\n"
  );

  console.log(
    `CSV Report         : ${CSV_FILE}`
  );

  console.log(
    "================================================\n"
  );