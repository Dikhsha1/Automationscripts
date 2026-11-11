import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits
} from "viem";

// ============================================================
// CONFIG
// ============================================================

const RPC_URL = process.env.RPC_URL || "https://chain.sotto.li";
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const USER_REGISTRY_ADDRESS =
  process.env.USER_REGISTRY_ADDRESS ||
  "0x6955af7cE14e21d6635630e86e07d1A2F76eB42A";

// ============================================================
// CHAIN
// ============================================================

const chain = {
  id: CHAIN_ID,
  name: "ARDEN UAT",
  nativeCurrency: {
    name: "UAT",
    symbol: "UAT",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [RPC_URL]
    }
  }
};

// ============================================================
// ABI - ONLY WHAT WE NEED
// ============================================================

const USER_REGISTRY_ABI = [
  {
    inputs: [],
    name: "userCounter",
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
        name: "",
        type: "uint256"
      }
    ],
    name: "users",
    outputs: [
      {
        internalType: "uint256",
        name: "userId",
        type: "uint256"
      },
      {
        internalType: "address",
        name: "userAddress",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "nftId",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "fuel",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "username",
        type: "string"
      },
      {
        internalType: "uint256",
        name: "referredBy",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "referralCode",
        type: "string"
      },
      {
        internalType: "uint256",
        name: "nftMintTime",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];

// ============================================================
// CLIENT
// ============================================================

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL)
});

// ============================================================
// HELPERS
// ============================================================

function formatDate(timestamp) {
  if (!timestamp || timestamp === 0n) {
    return "";
  }

  return new Date(Number(timestamp) * 1000).toISOString();
}

// ============================================================
// MAIN
// ============================================================

async function main() {

  console.log(`
============================================================
              ARDEN UAT ALL USERS CHECK
============================================================
RPC                  : ${RPC_URL}
Chain ID             : ${CHAIN_ID}
User Registry        : ${USER_REGISTRY_ADDRESS}
============================================================
`);

  // ----------------------------------------------------------
  // BLOCK
  // ----------------------------------------------------------

  const blockNumber = await publicClient.getBlockNumber();

  console.log(`Current Block        : ${blockNumber}`);

  // ----------------------------------------------------------
  // USER COUNT
  // ----------------------------------------------------------

  const userCounter = await publicClient.readContract({
    address: USER_REGISTRY_ADDRESS,
    abi: USER_REGISTRY_ABI,
    functionName: "userCounter"
  });

  console.log(`User Counter         : ${userCounter}`);

  const totalUsers = Number(userCounter);

  console.log(`
------------------------------------------------------------
                    USERS
------------------------------------------------------------
`);

  const users = [];

  // ----------------------------------------------------------
  // READ USERS
  // ----------------------------------------------------------

  for (let id = 1; id <= totalUsers; id++) {

    try {

      const user = await publicClient.readContract({
        address: USER_REGISTRY_ADDRESS,
        abi: USER_REGISTRY_ABI,
        functionName: "users",
        args: [BigInt(id)]
      });

      const [
        userId,
        userAddress,
        nftId,
        fuel,
        username,
        referredBy,
        referralCode,
        nftMintTime
      ] = user;

      const row = {
        userId: userId.toString(),
        userAddress,
        nftId: nftId.toString(),
        fuel: fuel.toString(),
        fuelFormatted: formatUnits(fuel, 18),
        username,
        referredBy: referredBy.toString(),
        referralCode,
        nftMintTime: nftMintTime.toString(),
        nftMintDate: formatDate(nftMintTime)
      };

      users.push(row);

      console.log(
        `${String(id).padStart(5)} | ` +
        `${username.padEnd(20)} | ` +
        `${userAddress} | ` +
        `NFT: ${nftId}`
      );

    } catch (error) {

      console.log(
        `❌ Failed reading User ID ${id}:`,
        error.shortMessage || error.message
      );

    }
  }

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------

  console.log(`
============================================================
                    SUMMARY
============================================================
User Counter         : ${totalUsers}
Users Read           : ${users.length}
Current Block        : ${blockNumber}
============================================================
`);

  // ----------------------------------------------------------
  // CSV
  // ----------------------------------------------------------

  const csvHeader = [
    "userId",
    "username",
    "userAddress",
    "nftId",
    "fuel",
    "fuelFormatted",
    "referredBy",
    "referralCode",
    "nftMintTime",
    "nftMintDate"
  ].join(",");

  const csvRows = users.map(user => {

    return [
      user.userId,
      `"${user.username.replace(/"/g, '""')}"`,
      user.userAddress,
      user.nftId,
      user.fuel,
      user.fuelFormatted,
      user.referredBy,
      `"${user.referralCode.replace(/"/g, '""')}"`,
      user.nftMintTime,
      user.nftMintDate
    ].join(",");

  });

  const csv = [csvHeader, ...csvRows].join("\n");

  const fs = await import("fs");

  fs.writeFileSync(
    "uat-all-users.csv",
    csv,
    "utf8"
  );

  console.log(`CSV saved             : uat-all-users.csv`);
}

main().catch(error => {

  console.error(`
❌ SCRIPT FAILED

${error.shortMessage || error.message}
`);

  process.exit(1);
});