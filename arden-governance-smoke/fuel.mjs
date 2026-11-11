import "dotenv/config";

import {
  createPublicClient,
  createWalletClient,
  http,
  getAddress,
  formatUnits,
  parseUnits,
  defineChain,
} from "viem";

import { privateKeyToAccount } from "viem/accounts";

/* =========================================================
   CONFIG
========================================================= */

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const USER_REGISTRY = getAddress(process.env.USER_REGISTRY);
const USER_ID = BigInt(process.env.USER_ID);

const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS
  ? getAddress(process.env.GOVERNOR_ADDRESS)
  : null;

const FUEL_PURCHASE_TOKEN_AMOUNT =
  process.env.FUEL_PURCHASE_TOKEN_AMOUNT || "100";

if (!RPC_URL) throw new Error("Missing RPC_URL");
if (!PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY");
if (!USER_REGISTRY) throw new Error("Missing USER_REGISTRY");
if (process.env.USER_ID === undefined) throw new Error("Missing USER_ID");

/* =========================================================
   CHAIN
========================================================= */

const sotto = defineChain({
  id: 1337,
  name: "Sotto",
  nativeCurrency: {
    name: "SOTTO",
    symbol: "SOTTO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
  },
});

/* =========================================================
   CLIENTS
========================================================= */

const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: sotto,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: sotto,
  transport: http(RPC_URL),
});

/* =========================================================
   USER REGISTRY ABI
========================================================= */

const USER_REGISTRY_ABI = [
  {
    type: "function",
    name: "getCurrentFuel",
    stateMutability: "view",
    inputs: [
      {
        name: "userId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "fuelLastUpdated",
    stateMutability: "view",
    inputs: [
      {
        name: "userId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "users",
    stateMutability: "view",
    inputs: [
      {
        name: "userId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "userId", type: "uint256" },
          { name: "userAddress", type: "address" },
          { name: "nftId", type: "uint256" },
          { name: "fuel", type: "uint256" },
          { name: "username", type: "string" },
          { name: "referredBy", type: "uint256" },
          { name: "referralCode", type: "string" },
          { name: "nftMintTime", type: "uint256" },
        ],
      },
    ],
  },

  {
    type: "function",
    name: "nftIdToUserId",
    stateMutability: "view",
    inputs: [
      {
        name: "nftId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "isWhitelisted",
    stateMutability: "view",
    inputs: [
      {
        name: "account",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
  },

  {
    type: "function",
    name: "buyFuel",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "userId",
        type: "uint256",
      },
      {
        name: "tokenAmount",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
  },
];

/* =========================================================
   HELPERS
========================================================= */

function printHeader(title) {
  console.log("\n=========================================================");
  console.log(title);
  console.log("=========================================================");
}

function pass(id, message) {
  console.log(`✅ ${id} PASS - ${message}`);
}

function fail(id, message) {
  console.log(`❌ ${id} FAIL - ${message}`);
}

function info(message) {
  console.log(`ℹ️  ${message}`);
}

async function getFuel() {
  return await publicClient.readContract({
    address: USER_REGISTRY,
    abi: USER_REGISTRY_ABI,
    functionName: "getCurrentFuel",
    args: [USER_ID],
  });
}

async function getFuelLastUpdated() {
  return await publicClient.readContract({
    address: USER_REGISTRY,
    abi: USER_REGISTRY_ABI,
    functionName: "fuelLastUpdated",
    args: [USER_ID],
  });
}

async function getUser() {
  return await publicClient.readContract({
    address: USER_REGISTRY,
    abi: USER_REGISTRY_ABI,
    functionName: "users",
    args: [USER_ID],
  });
}

/* =========================================================
   TC-FUEL-01
   Fuel decays by 1 per week
========================================================= */

async function testFuelDecay() {
  printHeader("TC-FUEL-01 - Fuel Decay By 1 Per Week");

  try {
    const beforeFuel = await getFuel();
    const beforeUpdated = await getFuelLastUpdated();

    const beforeBlock = await publicClient.getBlock();

    console.log("User ID:", USER_ID.toString());
    console.log("Fuel before:", beforeFuel.toString());
    console.log(
      "Fuel last updated:",
      new Date(Number(beforeUpdated) * 1000).toISOString()
    );
    console.log(
      "Current block timestamp:",
      new Date(Number(beforeBlock.timestamp) * 1000).toISOString()
    );

    info("Attempting evm_increaseTime by 7 days...");

    await publicClient.request({
      method: "evm_increaseTime",
      params: [604800],
    });

    await publicClient.request({
      method: "evm_mine",
      params: [],
    });

    const afterFuel = await getFuel();

    console.log("Fuel after 7 days:", afterFuel.toString());

    if (beforeFuel === 0n) {
      if (afterFuel === 0n) {
        pass(
          "TC-FUEL-01",
          "Fuel remained at 0 and did not become negative."
        );
      } else {
        fail(
          "TC-FUEL-01",
          `Expected 0 fuel, received ${afterFuel.toString()}`
        );
      }

      return;
    }

    const expectedFuel =
      beforeFuel > 0n ? beforeFuel - 1n : 0n;

    if (afterFuel === expectedFuel) {
      pass(
        "TC-FUEL-01",
        `Fuel decreased from ${beforeFuel} to ${afterFuel}.`
      );
    } else {
      fail(
        "TC-FUEL-01",
        `Expected ${expectedFuel}, received ${afterFuel}.`
      );
    }
  } catch (error) {
    fail(
      "TC-FUEL-01",
      `Could not execute time manipulation / fuel check: ${
        error.shortMessage || error.message
      }`
    );
  }
}

/* =========================================================
   TC-FUEL-02
   Fuel cap = 100
========================================================= */

async function testFuelCap() {
  printHeader("TC-FUEL-02 - Fuel Maximum Cap = 100");

  try {
    const beforeFuel = await getFuel();

    console.log("Fuel before:", beforeFuel.toString());

    if (beforeFuel >= 100n) {
      info("Fuel is already at or above 100.");

      if (beforeFuel === 100n) {
        pass(
          "TC-FUEL-02",
          "Current fuel is exactly at the 100-unit cap."
        );
      } else {
        fail(
          "TC-FUEL-02",
          `Existing fuel is ${beforeFuel}; expected contract state <= 100.`
        );
      }

      return;
    }

    /*
     * IMPORTANT:
     * buyFuel() takes TOKEN AMOUNT, not fuel units.
     *
     * We intentionally purchase a large amount so that the
     * resulting fuel should exceed 100 if there were no cap.
     *
     * Adjust token decimals according to the actual UserRegistry
     * fuel conversion.
     */

    const tokenAmount = parseUnits(
      FUEL_PURCHASE_TOKEN_AMOUNT,
      6
    );

    console.log(
      "Purchase token amount:",
      FUEL_PURCHASE_TOKEN_AMOUNT
    );

    info("Calling buyFuel()...");

    const hash = await walletClient.writeContract({
      address: USER_REGISTRY,
      abi: USER_REGISTRY_ABI,
      functionName: "buyFuel",
      args: [USER_ID, tokenAmount],
    });

    console.log("Transaction:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });

    console.log("Transaction status:", receipt.status);

    const afterFuel = await getFuel();

    console.log("Fuel after purchase:", afterFuel.toString());

    if (afterFuel > 100n) {
      fail(
        "TC-FUEL-02",
        `Fuel exceeded cap: ${afterFuel.toString()}`
      );
    } else if (afterFuel === 100n) {
      pass(
        "TC-FUEL-02",
        "Fuel correctly capped at 100."
      );
    } else {
      info(
        `Fuel is ${afterFuel}. Purchase did not push balance to 100.`
      );

      info(
        "Increase FUEL_PURCHASE_TOKEN_AMOUNT if necessary."
      );
    }
  } catch (error) {
    fail(
      "TC-FUEL-02",
      error.shortMessage || error.message
    );
  }
}

/* =========================================================
   TC-FUEL-04
   Governor whitelist check
========================================================= */

async function testGovernorWhitelist() {
  printHeader("TC-FUEL-04 - Governor Whitelist Check");

  if (!GOVERNOR_ADDRESS) {
    info(
      "GOVERNOR_ADDRESS is not configured. Skipping whitelist check."
    );
    return;
  }

  try {
    const whitelisted = await publicClient.readContract({
      address: USER_REGISTRY,
      abi: USER_REGISTRY_ABI,
      functionName: "isWhitelisted",
      args: [GOVERNOR_ADDRESS],
    });

    console.log("Governor:", GOVERNOR_ADDRESS);
    console.log("Whitelisted:", whitelisted);

    if (whitelisted) {
      pass(
        "TC-FUEL-04",
        "Governor is whitelisted on UserRegistry."
      );
    } else {
      info(
        "Governor is NOT whitelisted. A fuel-consuming governance action should revert when deductFuel is attempted."
      );
    }
  } catch (error) {
    fail(
      "TC-FUEL-04",
      error.shortMessage || error.message
    );
  }
}

/* =========================================================
   TC-FUEL-05
   NFT -> User mapping
========================================================= */

async function testNftMapping() {
  printHeader("TC-FUEL-05 - Multiple NFTs / Shared User Fuel");

  try {
    const user = await getUser();

    console.log("User ID:", user.userId.toString());
    console.log("User address:", user.userAddress);
    console.log("Primary NFT ID:", user.nftId.toString());
    console.log("Stored fuel:", user.fuel.toString());
    console.log("Username:", user.username);

    const nftId = user.nftId;

    const mappedUserId = await publicClient.readContract({
      address: USER_REGISTRY,
      abi: USER_REGISTRY_ABI,
      functionName: "nftIdToUserId",
      args: [nftId],
    });

    console.log(
      `NFT ${nftId.toString()} -> User ${mappedUserId.toString()}`
    );

    if (mappedUserId === USER_ID) {
      pass(
        "TC-FUEL-05",
        `NFT ${nftId} correctly maps to User ${USER_ID}.`
      );
    } else {
      fail(
        "TC-FUEL-05",
        `Expected NFT ${nftId} to map to User ${USER_ID}, received User ${mappedUserId}.`
      );
    }

    info(
      "To fully execute TC-FUEL-05, a second NFT ID mapped to the same userId is required."
    );
  } catch (error) {
    fail(
      "TC-FUEL-05",
      error.shortMessage || error.message
    );
  }
}

/* =========================================================
   MAIN
========================================================= */

async function main() {
  printHeader("ARDEN / SOTTO UAT - FUEL QA");

  console.log("RPC:", RPC_URL);
  console.log("UserRegistry:", USER_REGISTRY);
  console.log("Tester wallet:", account.address);
  console.log("User ID:", USER_ID.toString());

  const block = await publicClient.getBlock();

  console.log(
    "Current block:",
    block.number.toString()
  );

  console.log(
    "Block timestamp:",
    new Date(Number(block.timestamp) * 1000).toISOString()
  );

  await testFuelDecay();

  await testFuelCap();

  await testGovernorWhitelist();

  await testNftMapping();

  printHeader("FUEL QA COMPLETE");
}

main().catch((error) => {
  console.error("\n❌ SCRIPT ERROR");
  console.error(error);
  process.exit(1);
});