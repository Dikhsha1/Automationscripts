import "dotenv/config";
import {
  createPublicClient,
  http,
  parseAbiItem,
  formatUnits,
} from "viem";

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const STAKING_ENGINE =
  process.env.STAKING_ENGINE ||
  "0x43A158473a6BD19A199aD369300f285358c0da0f";

const client = createPublicClient({
  transport: http(RPC_URL),
});

const STAKED_EVENT = parseAbiItem(
  "event Staked(uint256 indexed nftId, address indexed user, uint256 indexed positionIndex, uint256 tokenAmount, uint256 timestamp)"
);

const WITHDRAWN_EVENT = parseAbiItem(
  "event Withdrawn(uint256 indexed nftId, uint256 indexed posIndex, address indexed owner, uint256 toUser, uint256 fee, uint256 principalOut, bool closed)"
);

async function main() {
  console.log("========== STAKING EVENT SCAN ==========");
  console.log("RPC:", RPC_URL);
  console.log("Chain:", CHAIN_ID);
  console.log("StakingEngine:", STAKING_ENGINE);

  console.log("\nReading Staked events...");

  const stakedLogs = await client.getLogs({
    address: STAKING_ENGINE,
    event: STAKED_EVENT,
    fromBlock: 0n,
    toBlock: "latest",
  });

  console.log("Staked events:", stakedLogs.length);

  console.log("\nReading Withdrawn events...");

  const withdrawnLogs = await client.getLogs({
    address: STAKING_ENGINE,
    event: WITHDRAWN_EVENT,
    fromBlock: 0n,
    toBlock: "latest",
  });

  console.log("Withdrawn events:", withdrawnLogs.length);

  const nftIds = new Set();

  for (const log of stakedLogs) {
    nftIds.add(log.args.nftId.toString());
  }

  for (const log of withdrawnLogs) {
    nftIds.add(log.args.nftId.toString());
  }

  console.log("\n========== NFT IDs ==========");

  const sortedIds = [...nftIds]
    .map(Number)
    .sort((a, b) => a - b);

  console.log("Unique NFT IDs:", sortedIds.length);
  console.log(sortedIds);

  console.log("\n========== STAKED EVENTS ==========");

  for (const log of stakedLogs) {
    console.log({
      nftId: log.args.nftId.toString(),
      positionIndex: log.args.positionIndex.toString(),
      user: log.args.user,
      amount: formatUnits(log.args.tokenAmount, 18),
      timestamp: log.args.timestamp.toString(),
      blockNumber: log.blockNumber?.toString(),
    });
  }

  console.log("\n========== WITHDRAWN EVENTS ==========");

  for (const log of withdrawnLogs) {
    console.log({
      nftId: log.args.nftId.toString(),
      positionIndex: log.args.posIndex.toString(),
      owner: log.args.owner,
      principalOut: formatUnits(log.args.principalOut, 18),
      closed: log.args.closed,
      blockNumber: log.blockNumber?.toString(),
    });
  }
}

main().catch((error) => {
  console.error("\n❌ ERROR:");
  console.error(error);
  process.exit(1);
});