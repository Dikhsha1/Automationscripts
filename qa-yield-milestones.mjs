import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  getAddress
} from "viem";

// ============================================================
// CONFIG
// ============================================================

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const STAKING_ENGINE = getAddress(process.env.STAKING_ENGINE);
const NFT_ID = BigInt(process.env.NFT_ID);

// CHANGE THIS IF REQUIRED
const POSITION_INDEX = Number(process.env.POSITION_INDEX ||0);

// ============================================================
// CHAIN
// ============================================================

const chain = {
  id: CHAIN_ID,
  name: "QA Chain",
  nativeCurrency: {
    name: "Native",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [RPC_URL]
    }
  }
};

// ============================================================
// ABI
// ============================================================

// const ABI = [
//   {
//     inputs: [],
//     name: "DAY",
//     outputs: [{ type: "uint256" }],
//     stateMutability: "view",
//     type: "function"
//   },
//   {
//     inputs: [],
//     name: "TERM_DAYS",
//     outputs: [{ type: "uint256" }],
//     stateMutability: "view",
//     type: "function"
//   },
//   {
//     inputs: [
//       {
//         internalType: "uint256",
//         name: "nftId",
//         type: "uint256"
//       }
//     ],
//     name: "positionsOf",
//     outputs: [
//       {
//         components: [
//           {
//             internalType: "uint256",
//             name: "principal",
//             type: "uint256"
//           },
//           {
//             internalType: "uint256",
//             name: "accruedBalance",
//             type: "uint256"
//           },
//           {
//             internalType: "uint64",
//             name: "stakeTimestamp",
//             type: "uint64"
//           },
//           {
//             internalType: "uint16",
//             name: "lastUpdateDay",
//             type: "uint16"
//           },
//           {
//             internalType: "uint8",
//             name: "lastLoyaltyIndex",
//             type: "uint8"
//           },
//           {
//             internalType: "bool",
//             name: "active",
//             type: "bool"
//           },
//           {
//             internalType: "uint256",
//             name: "claimed",
//             type: "uint256"
//           }
//         ],
//         internalType: "struct StakingEngine.Position[]",
//         name: "",
//         type: "tuple[]"
//       }
//     ],
//     stateMutability: "view",
//     type: "function"
//   },
//   {
//     inputs: [
//       {
//         internalType: "uint256",
//         name: "nftId",
//         type: "uint256"
//       },
//       {
//         internalType: "uint256",
//         name: "posIndex",
//         type: "uint256"
//       }
//     ],
//     name: "previewBalance",
//     outputs: [
//       {
//         internalType: "uint256",
//         name: "",
//         type: "uint256"
//       }
//     ],
//     stateMutability: "view",
//     type: "function"
//   }
// ];

const ABI=[
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "target",
          "type": "address"
        }
      ],
      "name": "AddressEmptyCode",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "implementation",
          "type": "address"
        }
      ],
      "name": "ERC1967InvalidImplementation",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ERC1967NonPayable",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "EnforcedPause",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ExpectedPause",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "FailedCall",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidInitialization",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotInitializing",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ReentrancyGuardReentrantCall",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "UUPSUnauthorizedCallContext",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "slot",
          "type": "bytes32"
        }
      ],
      "name": "UUPSUnsupportedProxiableUUID",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "positionIndex",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "Claimed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "version",
          "type": "uint64"
        }
      ],
      "name": "Initialized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "rewardRouter",
          "type": "address"
        }
      ],
      "name": "RewardRouterUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "positionIndex",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tokenAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "Staked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "implementation",
          "type": "address"
        }
      ],
      "name": "Upgraded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "posIndex",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "toUser",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "fee",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "principalOut",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "closed",
          "type": "bool"
        }
      ],
      "name": "Withdrawn",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "BASE_DPY",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DAY",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DPY_INCREMENT",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "EARLY_FEE_BPS",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "FEE_CUTOFF_DAY",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "FUEL_PER_ACTION",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "LOCK_DAYS",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MIN_REMAINDER",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MIN_STAKE",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "TERM_DAYS",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "UPGRADE_INTERFACE_VERSION",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "ardeToken",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        }
      ],
      "name": "claimAllViaRouter",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalClaimed",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "claimedByNft",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "identityNFT",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_arde",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_sArde",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_vault",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_ot",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_identityNFT",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_userRegistry",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_owner",
          "type": "address"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "posIndex",
          "type": "uint256"
        }
      ],
      "name": "isLocked",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "operationTreasury",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pauseStaking",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        }
      ],
      "name": "positionCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        }
      ],
      "name": "positionsOf",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "principal",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lastPrincipal",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "accruedBalance",
              "type": "uint256"
            },
            {
              "internalType": "uint64",
              "name": "stakeTimestamp",
              "type": "uint64"
            },
            {
              "internalType": "uint16",
              "name": "lastUpdateDay",
              "type": "uint16"
            },
            {
              "internalType": "uint8",
              "name": "lastLoyaltyIndex",
              "type": "uint8"
            },
            {
              "internalType": "bool",
              "name": "active",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "claimed",
              "type": "uint256"
            }
          ],
          "internalType": "struct StakingEngine.Position[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "posIndex",
          "type": "uint256"
        }
      ],
      "name": "previewAccrued",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "posIndex",
          "type": "uint256"
        }
      ],
      "name": "previewBalance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        }
      ],
      "name": "previewTotalAccrued",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "total",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "proxiableUUID",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "rewardRouter",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "sArdeToken",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_rewardRouter",
          "type": "address"
        }
      ],
      "name": "setRewardRouter",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "stake",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "posIndex",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "stakedByNft",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "userId",
          "type": "uint256"
        }
      ],
      "name": "stakedByUser",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalClaimedProtocol",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalStakedProtocol",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unpauseStaking",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newImplementation",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "upgradeToAndCall",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "userRegistry",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "vault",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "posIndex",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "withdraw",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "toUser",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "fee",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]

// ============================================================
// CLIENT
// ============================================================

const client = createPublicClient({
  chain,
  transport: http(RPC_URL)
});

// ============================================================
// HELPERS
// ============================================================

function formatArde(value) {
  return formatUnits(value, 18);
}

function separator() {
  console.log("==============================================");
}

// ============================================================
// REQUIREMENTS
// ============================================================

const TESTS = [
  {
    id: "YLD-001",
    day: 30,
    expected: 101016253828094102171n
  },
  {
    id: "YLD-002",
    day: 90,
    expected: 104282854940826372143n
  },
  {
    id: "YLD-003",
    day: 180,
    expected: 109174916170349420450n
  },
  {
    id: "YLD-004",
    day: 360,
    expected: 121047307108102825324n
  },
  {
    id: "YLD-005",
    day: 540,
    expected: 136130802236383586109n
  },
  {
    id: "YLD-006",
    day: 720,
    expected: 155050761461151561063n
  },
  {
    id: "YLD-007",
    day: 900,
    expected: 178797244183742781611n
  },
  {
    id: "YLD-008",
    day: 1080,
    expected: 211000016231343050040n
  },

  // Post-term tests
  {
    id: "YLD-009",
    day: 1200,
    expected: 211000016231343050040n,
    postTerm: true
  },
  {
    id: "YLD-010",
    day: 5000,
    expected: 211000016231343050040n,
    postTerm: true
  },
  {
    id: "YLD-011",
    day: 100000,
    expected: 211000016231343050040n,
    postTerm: true
  }
];

// ============================================================
// MAIN
// ============================================================

console.log("");
separator();
console.log("       ARDEN YIELD ENGINE QA CHECK");
separator();

console.log(`RPC           : ${RPC_URL}`);
console.log(`Chain ID      : ${CHAIN_ID}`);
console.log(`Staking Engine: ${STAKING_ENGINE}`);
console.log(`NFT ID        : ${NFT_ID}`);
console.log(`Position      : ${POSITION_INDEX}`);

// ============================================================
// CONTRACT PARAMETERS
// ============================================================

const daySeconds = await client.readContract({
  address: STAKING_ENGINE,
  abi: ABI,
  functionName: "DAY"
});

const termDays = await client.readContract({
  address: STAKING_ENGINE,
  abi: ABI,
  functionName: "TERM_DAYS"
});

console.log("");
separator();
console.log("       CONTRACT TIME PARAMETERS");
separator();

console.log(`DAY           : ${daySeconds} seconds`);
console.log(`TERM_DAYS     : ${termDays}`);

// ============================================================
// POSITION
// ============================================================

const positions = await client.readContract({
  address: STAKING_ENGINE,
  abi: ABI,
  functionName: "positionsOf",
  args: [NFT_ID]
});

if (!positions[POSITION_INDEX]) {
  throw new Error(
    `Position ${POSITION_INDEX} does not exist. Total positions: ${positions.length}`
  );
}

const position = positions[POSITION_INDEX];

const principal = position.principal;
const claimed = position.claimed;
const stakeTimestamp = Number(position.stakeTimestamp);

const block = await client.getBlock();

const currentTimestamp = Number(block.timestamp);

const ageSeconds =
  currentTimestamp - stakeTimestamp;

const currentDay =
  Math.floor(ageSeconds / Number(daySeconds));

const active = position.active;

// ============================================================
// CURRENT STATUS
// ============================================================

const actualBalance = await client.readContract({
  address: STAKING_ENGINE,
  abi: ABI,
  functionName: "previewBalance",
  args: [NFT_ID, BigInt(POSITION_INDEX)]
});

console.log("");
separator();
console.log("       CURRENT POSITION");
separator();

console.log(
  `Principal       : ${formatArde(principal)} ARDE`
);

console.log(
  `Claimed         : ${formatArde(claimed)} ARDE`
);

console.log(
  `Preview Balance : ${formatArde(actualBalance)} ARDE`
);

console.log(
  `Stake Timestamp : ${new Date(
    stakeTimestamp * 1000
  ).toISOString()}`
);

console.log(
  `Current Time    : ${new Date(
    currentTimestamp * 1000
  ).toISOString()}`
);

console.log(
  `Age Seconds     : ${ageSeconds}`
);

console.log(
  `Current Day     : ${currentDay}`
);

console.log(
  `Active          : ${active}`
);

// ============================================================
// MILESTONE STATUS
// ============================================================

console.log("");
separator();
console.log("       MILESTONE STATUS");
separator();

let passCount = 0;
let missedCount = 0;
let notReachedCount = 0;

for (const test of TESTS) {

  // ----------------------------------------------------------
  // FUTURE
  // ----------------------------------------------------------

  if (currentDay < test.day) {

    const remaining =
      test.day - currentDay;

    console.log(
      `${test.id} | Day ${test.day} | ⏳ NOT REACHED | ${remaining} days remaining`
    );

    notReachedCount++;

    continue;
  }

  // ----------------------------------------------------------
  // EXACT DAY
  // ----------------------------------------------------------

  if (currentDay === test.day) {

    console.log("");
    console.log(
      `${test.id} | Day ${test.day} | 🎯 EXACT DAY`
    );

    console.log(
      `Expected : ${formatArde(test.expected)} ARDE`
    );

    console.log(
      `Actual   : ${formatArde(actualBalance)} ARDE`
    );

    if (actualBalance === test.expected) {

      console.log("Result   : ✅ PASS");

      passCount++;

    } else {

      console.log("Result   : ❌ FAIL");

      const difference =
        actualBalance > test.expected
          ? actualBalance - test.expected
          : test.expected - actualBalance;

      console.log(
        `Difference: ${formatArde(difference)} ARDE`
      );
    }

    continue;
  }

  // ----------------------------------------------------------
  // POST TERM
  // ----------------------------------------------------------

  if (test.postTerm) {

    if (currentDay > test.day) {

      // At this point the test cannot be independently
      // reproduced at exactly Day 1200/5000/100000,
      // but we can verify that the balance remains frozen.

      if (actualBalance === test.expected) {

        console.log(
          `${test.id} | Day ${test.day} | ✅ FREEZE VERIFIED`
        );

        console.log(
          `Expected : ${formatArde(test.expected)} ARDE`
        );

        console.log(
          `Actual   : ${formatArde(actualBalance)} ARDE`
        );

        passCount++;

      } else {

        console.log(
          `${test.id} | Day ${test.day} | ❌ FREEZE FAILED`
        );

        console.log(
          `Expected : ${formatArde(test.expected)} ARDE`
        );

        console.log(
          `Actual   : ${formatArde(actualBalance)} ARDE`
        );
      }

      continue;
    }
  }

  // ----------------------------------------------------------
  // MISSED EXACT MILESTONE
  // ----------------------------------------------------------

  console.log(
    `${test.id} | Day ${test.day} | ⚠️ MISSED`
  );

  console.log(
    `Current Day : ${currentDay}`
  );

  console.log(
    `Target Day  : ${test.day}`
  );

  missedCount++;
}

// ============================================================
// SUMMARY
// ============================================================

console.log("");
separator();
console.log("             QA SUMMARY");
separator();

console.log(`Current Day       : ${currentDay}`);
console.log(`Position          : ${POSITION_INDEX}`);
console.log("");

console.log(`✅ Passed         : ${passCount}`);
console.log(`⚠️ Missed         : ${missedCount}`);
console.log(`⏳ Not Reached    : ${notReachedCount}`);

console.log("");

if (missedCount > 0) {

  console.log(
    "⚠️ Some exact-day milestones were missed."
  );

  console.log(
    "Create a fresh position for exact milestone validation."
  );
}

if (notReachedCount > 0) {

  console.log(
    "⏳ Some milestones have not been reached yet."
  );
}

console.log("");
separator();