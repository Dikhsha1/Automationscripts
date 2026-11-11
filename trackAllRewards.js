import { createPublicClient, http } from "viem";
import "dotenv/config";

import { rewardRouter } from "./rewardabi.js";

const client = createPublicClient({
  transport: http(process.env.RPC_URL),
});

const REWARDS_ENGINE =
  "0xD03bD0ba816d80113dFcBd5c087DfD3e58B8F62a";

async function main() {
  console.log("Connecting to blockchain...");
  console.log("RewardsEngine:", REWARDS_ENGINE);

  // 1. Check contract
  const code = await client.getBytecode({
    address: REWARDS_ENGINE,
  });

  console.log("\nContract bytecode:", code ? "FOUND" : "NOT FOUND");

  if (!code) {
    throw new Error("No contract found at RewardsEngine address");
  }

  // 2. Check pause status
  try {
    const paused = await client.readContract({
      address: REWARDS_ENGINE,
      abi: rewardRouter,
      functionName: "paused",
    });

    console.log("Paused:", paused);
  } catch (error) {
    console.log("paused() failed:");
    console.log(error.shortMessage || error.message);
  }

  // 3. Get UserRegistry address
  try {
    const userRegistry = await client.readContract({
      address: REWARDS_ENGINE,
      abi: rewardRouter,
      functionName: "userRegistry",
    });

    console.log("UserRegistry:", userRegistry);
  } catch (error) {
    console.log("userRegistry() FAILED:");
    console.log(error.shortMessage || error.message);
  }

  // 4. Get RewardsEngine linked address
  try {
    const rewardsEngine = await client.readContract({
      address: REWARDS_ENGINE,
      abi: rewardRouter,
      functionName: "rewardsEngine",
    });

    console.log("Internal RewardsEngine:", rewardsEngine);
  } catch (error) {
    console.log("rewardsEngine() FAILED:");
    console.log(error.shortMessage || error.message);
  }

  // 5. Check proxy UUID
  try {
    const uuid = await client.readContract({
      address: REWARDS_ENGINE,
      abi: rewardRouter,
      functionName: "proxiableUUID",
    });

    console.log("Proxiable UUID:", uuid);
  } catch (error) {
    console.log("proxiableUUID() FAILED:");
    console.log(error.shortMessage || error.message);
  }
}

main().catch((error) => {
  console.error("\nERROR:");
  console.error(error.shortMessage || error.message);
});