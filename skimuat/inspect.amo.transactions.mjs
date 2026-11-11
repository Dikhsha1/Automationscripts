import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  defineChain,
  isAddress,
} from "viem";

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const TX_HASH =
  "0x5680d6a81db035ca28b369bdaaaecdb474053b88d9d3fd45281647e35c769ff6";

const SSP = "0x0F43Cde9eb5017CD28b2BF4Fc508698Ff8BD6aD3";

const ARDE =
  "0xDCf82998bE1c95222816538C2dE514534804206b";

const USDT =
  "0x103df201ed80eE00FfE2f694C49926c7F0d42d72";

const RESERVE_TREASURY =
  "0x37759FBCaA5c39f761d9c422B31F2158Bd28d221";

const OPERATION_TREASURY =
  "0x63B89457edf03DFBdeEbe5E8ea083DFa58e68Fc3";

if (!RPC_URL) {
  throw new Error("RPC_URL missing from .env");
}

const chain = defineChain({
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
});

const client = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

const erc20Abi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      {
        indexed: true,
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        name: "value",
        type: "uint256",
      },
    ],
  },
];

function short(address) {
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function normalize(address) {
  return address.toLowerCase();
}

async function main() {
  console.log("\n========== AMO TRANSACTION INSPECTION ==========");
  console.log("RPC:", RPC_URL);
  console.log("Chain:", CHAIN_ID);
  console.log("Transaction:", TX_HASH);

  console.log("\n========== TRANSACTION ==========");

  const tx = await client.getTransaction({
    hash: TX_HASH,
  });

  const receipt = await client.getTransactionReceipt({
    hash: TX_HASH,
  });

  console.log("From:", tx.from);
  console.log("To:", tx.to);
  console.log("Block:", receipt.blockNumber);
  console.log("Status:", receipt.status);
  console.log("Gas Used:", receipt.gasUsed.toString());

  console.log("\n========== TOKEN TRANSFERS ==========");

  const tokenConfigs = [
    {
      name: "USDT",
      address: USDT,
      decimals: 6,
    },
    {
      name: "ARDE",
      address: ARDE,
      decimals: 18,
    },
  ];

  let usdtToSSP = 0n;
  let usdtFromSSP = 0n;
  let reserveReceived = 0n;
  let operationReceived = 0n;

  for (const token of tokenConfigs) {
    console.log(`\n--- ${token.name} ---`);

    const logs = await client.getLogs({
      address: token.address,
      event: erc20Abi[0],
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    let found = false;

    for (const log of logs) {
      if (log.transactionHash.toLowerCase() !== TX_HASH.toLowerCase()) {
        continue;
      }

      found = true;

      const from = log.args.from;
      const to = log.args.to;
      const value = log.args.value;

      console.log(
        `${short(from)} -> ${short(to)} : ${formatUnits(
          value,
          token.decimals
        )} ${token.name}`
      );

      if (token.name === "USDT") {
        if (
          normalize(to) === normalize(SSP) &&
          normalize(from) !== normalize(SSP)
        ) {
          usdtToSSP += value;
        }

        if (
          normalize(from) === normalize(SSP) &&
          normalize(to) !== normalize(SSP)
        ) {
          usdtFromSSP += value;
        }

        if (
          normalize(from) === normalize(SSP) &&
          normalize(to) === normalize(RESERVE_TREASURY)
        ) {
          reserveReceived += value;
        }

        if (
          normalize(from) === normalize(SSP) &&
          normalize(to) === normalize(OPERATION_TREASURY)
        ) {
          operationReceived += value;
        }
      }
    }

    if (!found) {
      console.log("No transfers found.");
    }
  }

  console.log("\n========== BUY ==========");

  console.log(
    "USDT entering SSP:",
    formatUnits(usdtToSSP, 6),
    "USDT"
  );

  console.log(
    "USDT leaving SSP:",
    formatUnits(usdtFromSSP, 6),
    "USDT"
  );

  console.log("\n========== AMO / SKIM ==========");

  console.log(
    "Reserve Treasury received:",
    formatUnits(reserveReceived, 6),
    "USDT"
  );

  console.log(
    "Operations Treasury received:",
    formatUnits(operationReceived, 6),
    "USDT"
  );

  const totalSkim =
    reserveReceived + operationReceived;

  console.log(
    "TOTAL SKIM:",
    formatUnits(totalSkim, 6),
    "USDT"
  );

  console.log("\n========== EXPECTED RESULT ==========");

  console.log("Pool before trade: >= $100,000");
  console.log("PI before trade: ~0.184");
  console.log("Required PI: >= 1.30");

  if (totalSkim === 0n) {
    console.log("PASS: NO SKIM occurred.");
    console.log(
      "Reason: PI was below the 1.30 AMO threshold."
    );
  } else {
    console.log("WARNING: SKIM OCCURRED.");
    console.log(
      "Investigate because PI was below 1.30."
    );
  }

  console.log("\n========== END ==========\n");
}

main().catch((error) => {
  console.error("\nERROR:");
  console.error(error);
  process.exit(1);
});