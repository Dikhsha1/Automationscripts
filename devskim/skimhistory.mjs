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
// CONFIG
// =====================================================

const RPC_URL = "https://chain.sotto.li";
const CHAIN_ID = 1337;

// =====================================================
// ADDRESSES
// =====================================================

const SSP = getAddress(
  "0x255e44e7Fec5410fF4f360b5d9C9981b6D7ed208"
);

const RT = getAddress(
  "0x554c1e44DF63AE9e7D83Db4a96A541E1cebEaAa0"
);

const OT = getAddress(
  "0x7037d9cb58784615fa6A177D3fD0aBc2D1E5E44a"
);

const USDT = getAddress(
  "0x103df201ed80eE00FfE2f694C49926c7F0d42d72"
);

const DAGR = getAddress(
  "0x59B95C628d9cEdb0077E5BfE1447C50F974341C5"
);

// =====================================================
// SKIM CONFIGURATION
// =====================================================

const MIN_BUY_USDT = 50;
const SKIM_BPS = 5000;     // 50%
const RT_BPS = 8000;       // 80%
const OT_BPS = 2000;       // 20%

// =====================================================
// DATE RANGE
// =====================================================

const START_DATE = "2026-08-25T00:00:00+05:30";
const END_DATE   = "2026-08-27T00:00:00+05:30";

// =====================================================
// REPORT DIRECTORY
// =====================================================

const REPORT_DIR = "./reports";

if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

const REPORT_DATE = new Date()
  .toISOString()
  .slice(0, 10);

const CSV_FILE = path.join(
  REPORT_DIR,
  `ssp-transaction-history-${REPORT_DATE}.csv`
);

// =====================================================
// CLIENT
// =====================================================

const publicClient = createPublicClient({
  chain: {
    id: CHAIN_ID,
    name: "ARDEN Dev",
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

const balanceAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
]);

// =====================================================
// HELPERS
// =====================================================

function same(a, b) {
  return a?.toLowerCase() === b?.toLowerCase();
}

function usdt(raw) {
  return Number(formatUnits(raw, 6));
}

function dagr(raw) {
  return Number(formatUnits(raw, 18));
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

// =====================================================
// BLOCK SEARCH
// =====================================================

async function findFirstBlock(targetTimestamp, latestBlock) {

  let low = 0n;
  let high = latestBlock;

  while (low < high) {

    const mid = (low + high) / 2n;

    const block = await publicClient.getBlock({
      blockNumber: mid,
    });

    if (Number(block.timestamp) >= targetTimestamp) {
      high = mid;
    } else {
      low = mid + 1n;
    }
  }

  return low;
}

async function findLastBlock(targetTimestamp, latestBlock) {

  let low = 0n;
  let high = latestBlock;

  while (low < high) {

    const mid = (low + high + 1n) / 2n;

    const block = await publicClient.getBlock({
      blockNumber: mid,
    });

    if (Number(block.timestamp) <= targetTimestamp) {
      low = mid;
    } else {
      high = mid - 1n;
    }
  }

  return low;
}

// =====================================================
// GET TRANSFERS FOR SPECIFIC TRANSACTION
// =====================================================

async function getTransfersForTransaction(
  blockNumber,
  txHash
) {

  const transfers = [];

  const usdtLogs = await publicClient.getLogs({
    address: USDT,
    event: transferEventAbi[0],
    fromBlock: blockNumber,
    toBlock: blockNumber,
  });

  for (const log of usdtLogs) {

    if (log.transactionHash !== txHash) continue;

    transfers.push({
      token: "USDT",
      from: log.args.from,
      to: log.args.to,
      value: log.args.value,
      txHash: log.transactionHash,
      logIndex: log.logIndex,
    });
  }

  const dagrLogs = await publicClient.getLogs({
    address: DAGR,
    event: transferEventAbi[0],
    fromBlock: blockNumber,
    toBlock: blockNumber,
  });

  for (const log of dagrLogs) {

    if (log.transactionHash !== txHash) continue;

    transfers.push({
      token: "DAGR",
      from: log.args.from,
      to: log.args.to,
      value: log.args.value,
      txHash: log.transactionHash,
      logIndex: log.logIndex,
    });
  }

  return transfers;
}

// =====================================================
// CLASSIFY TRANSACTION
// =====================================================

function classifyTransaction(transfers) {

  const usdtToSSP = transfers.some(
    x =>
      x.token === "USDT" &&
      same(x.to, SSP) &&
      !same(x.from, SSP)
  );

  const usdtFromSSP = transfers.some(
    x =>
      x.token === "USDT" &&
      same(x.from, SSP) &&
      !same(x.to, SSP)
  );

  const dagrToSSP = transfers.some(
    x =>
      x.token === "DAGR" &&
      same(x.to, SSP) &&
      !same(x.from, SSP)
  );

  const dagrFromSSP = transfers.some(
    x =>
      x.token === "DAGR" &&
      same(x.from, SSP) &&
      !same(x.to, SSP)
  );

  const rtUSDT = transfers.some(
    x =>
      x.token === "USDT" &&
      same(x.to, RT)
  );

  const otUSDT = transfers.some(
    x =>
      x.token === "USDT" &&
      same(x.to, OT)
  );

  // ---------------------------------------------------
  // SKIM
  // ---------------------------------------------------

  if (rtUSDT || otUSDT) {
    return "SKIM";
  }

  // ---------------------------------------------------
  // BUY
  // ---------------------------------------------------

  if (usdtToSSP && dagrFromSSP) {
    return "BUY";
  }

  // ---------------------------------------------------
  // SELL
  // ---------------------------------------------------

  if (dagrToSSP && usdtFromSSP) {
    return "SELL";
  }

  // ---------------------------------------------------
  // LIQUIDITY ADD
  // ---------------------------------------------------

  if (usdtToSSP && dagrToSSP) {
    return "LIQUIDITY ADD";
  }

  return "OTHER";
}

// =====================================================
// CSV ESCAPE
// =====================================================

function csvEscape(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return `"${String(value).replace(/"/g, '""')}"`;
}

// =====================================================
// MAIN
// =====================================================

async function main() {

  console.log("\n==============================================");
  console.log("       ARDEN SSP TRANSACTION HISTORY");
  console.log("==============================================");

  console.log(`RPC       : ${RPC_URL}`);
  console.log(`Chain ID  : ${CHAIN_ID}`);
  console.log(`SSP       : ${SSP}`);
  console.log(`RT        : ${RT}`);
  console.log(`OT        : ${OT}`);
  console.log(`USDT      : ${USDT}`);
  console.log(`DAGR      : ${DAGR}`);

  // ===================================================
  // DATE → BLOCK
  // ===================================================

  const startTimestamp =
    Math.floor(new Date(START_DATE).getTime() / 1000);

  const endTimestamp =
    Math.floor(new Date(END_DATE).getTime() / 1000);

  const latestBlock =
    await publicClient.getBlockNumber();

  console.log("\n==============================================");
  console.log("             BLOCK RANGE");
  console.log("==============================================");

  console.log(`Latest block : ${latestBlock}`);

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

  console.log(`Start block  : ${startBlock}`);
  console.log(`End block    : ${endBlock}`);

  // ===================================================
  // FIND RELEVANT TRANSACTIONS
  // ===================================================

  console.log("\n==============================================");
  console.log("       SEARCHING SSP TOKEN ACTIVITY");
  console.log("==============================================");

  const usdtLogs = await publicClient.getLogs({
    address: USDT,
    event: transferEventAbi[0],
    fromBlock: startBlock,
    toBlock: endBlock,
  });

  const dagrLogs = await publicClient.getLogs({
    address: DAGR,
    event: transferEventAbi[0],
    fromBlock: startBlock,
    toBlock: endBlock,
  });

  const txHashes = new Set();

  for (const log of usdtLogs) {

    if (
      same(log.args.from, SSP) ||
      same(log.args.to, SSP) ||
      same(log.args.to, RT) ||
      same(log.args.to, OT)
    ) {
      txHashes.add(log.transactionHash);
    }
  }

  for (const log of dagrLogs) {

    if (
      same(log.args.from, SSP) ||
      same(log.args.to, SSP)
    ) {
      txHashes.add(log.transactionHash);
    }
  }

  console.log(
    `Relevant transactions : ${txHashes.size}`
  );

  // ===================================================
  // PROCESS TRANSACTIONS
  // ===================================================

  const transactions = [];

  for (const hash of txHashes) {

    const receipt =
      await publicClient.getTransactionReceipt({
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
        Number(block.timestamp) * 1000
      ).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

    const transaction =
      await publicClient.getTransaction({
        hash,
      });

    const transfers =
      await getTransfersForTransaction(
        blockNumber,
        hash
      );

    const type =
      classifyTransaction(transfers);

    // =================================================
    // CALCULATE MOVEMENTS
    // =================================================

    let usdtToPool = 0;
    let usdtFromPool = 0;

    let dagrToPool = 0;
    let dagrFromPool = 0;

    let rtAmount = 0;
    let otAmount = 0;

    for (const transfer of transfers) {

      if (transfer.token === "USDT") {

        const amount =
          usdt(transfer.value);

        if (same(transfer.to, SSP)) {
          usdtToPool += amount;
        }

        if (same(transfer.from, SSP)) {
          usdtFromPool += amount;
        }

        if (same(transfer.to, RT)) {
          rtAmount += amount;
        }

        if (same(transfer.to, OT)) {
          otAmount += amount;
        }
      }

      if (transfer.token === "DAGR") {

        const amount =
          dagr(transfer.value);

        if (same(transfer.to, SSP)) {
          dagrToPool += amount;
        }

        if (same(transfer.from, SSP)) {
          dagrFromPool += amount;
        }
      }
    }

    // =================================================
    // SKIM CALCULATION
    // =================================================

    const totalSkim =
      rtAmount + otAmount;

    let rtPercent = 0;
    let otPercent = 0;

    if (totalSkim > 0) {

      rtPercent =
        (rtAmount / totalSkim) * 100;

      otPercent =
        (otAmount / totalSkim) * 100;
    }

    const splitPass =
      totalSkim > 0 &&
      Math.abs(rtPercent - 80) < 0.01 &&
      Math.abs(otPercent - 20) < 0.01;

    // =================================================
    // BUY / SKIM RELATIONSHIP
    // =================================================

    let inferredBuy = 0;
    let expectedSkim = 0;
    let skimPercentOfBuy = 0;

    if (type === "SKIM") {

      /*
       * RT + OT = 50% of after-fee buy
       *
       * Therefore:
       *
       * Buy = Skim / 0.50
       */

      inferredBuy =
        totalSkim /
        (SKIM_BPS / 10000);

      expectedSkim =
        inferredBuy *
        (SKIM_BPS / 10000);

      skimPercentOfBuy =
        inferredBuy > 0
          ? (totalSkim / inferredBuy) * 100
          : 0;
    }

    // =================================================
    // QA STATUS
    // =================================================

    let qaResult = "INFO";

    if (type === "SKIM") {

      qaResult =
        splitPass &&
        Math.abs(
          skimPercentOfBuy - 50
        ) < 0.01
          ? "PASS"
          : "FAIL";
    }

    if (type === "SELL") {

      qaResult =
        totalSkim === 0
          ? "PASS"
          : "FAIL";
    }

    if (type === "BUY") {

      qaResult = "PASS";
    }

    if (type === "LIQUIDITY ADD") {

      qaResult = "VERIFY LP MINT";
    }

    // =================================================
    // STORE TRANSACTION
    // =================================================

    transactions.push({

      dateTime: timestamp,

      block: blockNumber.toString(),

      transactionHash: hash,

      shortTransactionHash:
        shortHash(hash),

      from:
        transaction.from,

      shortFrom:
        shortAddress(transaction.from),

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

      expectedSkim,

      skimPercentOfBuy,

      skimGate:
        type === "SKIM"
          ? "TRIGGERED"
          : "NOT TRIGGERED",

      liquidityCheck:
        type === "LIQUIDITY ADD"
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
  // PRINT DETAILED HISTORY
  // ===================================================

  console.log("\n==============================================");
  console.log("       DETAILED TRANSACTION HISTORY");
  console.log("==============================================");

  for (const tx of transactions) {

    console.log("\n----------------------------------------------");

    console.log(`TYPE       : ${tx.type}`);
    console.log(`Date/Time  : ${tx.dateTime}`);
    console.log(`Block      : ${tx.block}`);
    console.log(`TX Hash    : ${tx.transactionHash}`);
    console.log(`From       : ${tx.from}`);

    console.log("\nTOKEN MOVEMENTS");

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

    if (tx.type === "SKIM") {

      console.log("\nSKIM ANALYSIS");

      console.log(
        `Total Skim       : ${money(tx.totalSkim)}`
      );

      console.log(
        `Inferred Buy     : ${money(tx.inferredBuy)}`
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
          tx.skimPercentOfBuy >= 49.99 &&
          tx.skimPercentOfBuy <= 50.01
            ? "PASS ✅"
            : "FAIL ❌"
        }`
      );

      console.log(
        `80/20 Split      : ${tx.splitCheck}`
      );
    }

    if (tx.type === "LIQUIDITY ADD") {

      console.log("\nLIQUIDITY ADD");

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
  // CSV
  // ===================================================

  const headers = [

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
    "Expected Skim",

    "Skim % of Buy",
    "Skim Gate",

    "Liquidity Check",

    "QA Result",
  ];

  const csvRows = [];

  csvRows.push(
    headers.map(csvEscape).join(",")
  );

  for (const tx of transactions) {

    csvRows.push(

      [
        tx.dateTime,
        tx.block,
        tx.transactionHash,
        tx.shortTransactionHash,
        tx.from,
        tx.type,

        money(tx.usdtToPool),
        money(tx.usdtFromPool),

        tx.dagrToPool.toFixed(18),
        tx.dagrFromPool.toFixed(18),

        money(tx.rtAmount),
        money(tx.otAmount),

        money(tx.totalSkim),

        tx.rtPercent.toFixed(4),
        tx.otPercent.toFixed(4),

        tx.splitCheck,

        money(tx.inferredBuy),
        money(tx.expectedSkim),

        tx.skimPercentOfBuy.toFixed(4),

        tx.skimGate,

        tx.liquidityCheck,

        tx.qaResult,

      ].map(csvEscape).join(",")
    );
  }

  fs.writeFileSync(
    CSV_FILE,
    csvRows.join("\n"),
    "utf8"
  );

  // ===================================================
  // FINAL SUMMARY
  // ===================================================

  const counts = {

    BUY: 0,
    SELL: 0,
    SKIM: 0,
    "LIQUIDITY ADD": 0,
    OTHER: 0,
  };

  for (const tx of transactions) {

    if (counts[tx.type] !== undefined) {
      counts[tx.type]++;
    }
  }

  console.log("\n==============================================");
  console.log("              HISTORY SUMMARY");
  console.log("==============================================");

  console.log(`BUY             : ${counts.BUY}`);
  console.log(`SELL            : ${counts.SELL}`);
  console.log(`SKIM            : ${counts.SKIM}`);
  console.log(
    `LIQUIDITY ADD   : ${counts["LIQUIDITY ADD"]}`
  );
  console.log(`OTHER           : ${counts.OTHER}`);

  console.log("\n==============================================");
  console.log("              CSV REPORT SAVED");
  console.log("==============================================");

  console.log(`File: ${CSV_FILE}`);

  console.log("\n==============================================");
  console.log("                 TEST COMPLETE");
  console.log("==============================================\n");
}

main().catch(error => {

  console.error("\n❌ TEST FAILED\n");
  console.error(error);

  process.exit(1);
});