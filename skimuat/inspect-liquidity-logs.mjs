import "dotenv/config";
import {
  createPublicClient,
  http,
  defineChain,
  keccak256,
  toHex,
} from "viem";

const RPC_URL =
  process.env.RPC_URL || "https://chain.sotto.li";

const TX_HASH =
  "0xe42d7289c67282139415a82daed40f7450171cf77c312ca8bab935974e19f9a8";

const chain = defineChain({
  id: 1337,
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
});

const client = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

function section(title) {
  console.log("\n================================================");
  console.log(title);
  console.log("================================================");
}

function shortHex(value) {
  if (!value) return "";
  return value.length > 30
    ? `${value.slice(0, 16)}...${value.slice(-12)}`
    : value;
}

async function main() {
  section("ARDEN LIQUIDITY RAW LOG INSPECTOR");

  console.log(`RPC : ${RPC_URL}`);
  console.log(`TX  : ${TX_HASH}`);

  const receipt =
    await client.getTransactionReceipt({
      hash: TX_HASH,
    });

  console.log(
    `Block      : ${receipt.blockNumber}`
  );

  console.log(
    `Status     : ${receipt.status}`
  );

  console.log(
    `Log count  : ${receipt.logs.length}`
  );

  section("RAW TRANSACTION LOGS");

  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];

    console.log(
      `\n---------------- LOG #${i + 1} ----------------`
    );

    console.log(
      `Contract : ${log.address}`
    );

    console.log(
      `Topics   : ${log.topics.length}`
    );

    for (
      let j = 0;
      j < log.topics.length;
      j++
    ) {
      console.log(
        `Topic[${j}] : ${log.topics[j]}`
      );
    }

    console.log(
      `Data     : ${log.data}`
    );

    console.log(
      `Data len : ${(log.data.length - 2) / 2} bytes`
    );
  }

  section("LOG CONTRACT SUMMARY");

  const contractCounts = {};

  for (const log of receipt.logs) {
    const address = log.address.toLowerCase();

    contractCounts[address] =
      (contractCounts[address] || 0) + 1;
  }

  for (const [address, count] of Object.entries(
    contractCounts
  )) {
    console.log(
      `${address} : ${count} log(s)`
    );
  }

  section("EVENT SIGNATURE CANDIDATES");

  /*
   * Topic[0] is normally:
   *
   * keccak256("EventName(type1,type2,...)")
   *
   * We cannot know the event name without the ABI,
   * but this gives us every event signature hash.
   */

  const signatures = new Set();

  for (const log of receipt.logs) {
    if (log.topics.length > 0) {
      signatures.add(log.topics[0]);
    }
  }

  for (const signature of signatures) {
    console.log(signature);
  }

  section("END");

  console.log(
    "\nSend me this complete output."
  );

  console.log(
    "Then we can identify the actual LP event ABI."
  );
}

main().catch((err) => {
  console.error("\n❌ SCRIPT FAILED");

  console.error(
    err.shortMessage ||
      err.message ||
      err
  );

  process.exit(1);
});