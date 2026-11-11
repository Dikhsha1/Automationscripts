import dotenv from "dotenv";

dotenv.config({ path: ".env.dev" });


import { createPublicClient, http, formatUnits } from "viem";
import { defineChain } from "viem";

// ================================
// CONFIG
// ================================

const RPC_URL = process.env.RPC_URL;
const PROXY_ADDRESS = process.env.PROXY_ADDRESS;

if (!RPC_URL) {
    throw new Error("Missing RPC_URL in .env");
}

if (!PROXY_ADDRESS) {
    throw new Error("Missing PROXY_ADDRESS in .env");
}

// Replace chain configuration with your actual network
const chain = defineChain({
    id: Number(process.env.CHAIN_ID || 1),
    name: "SOTTO Dev Network",
    nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18
    },
    rpcUrls: {
        default: {
            http: [RPC_URL]
        }
    }
});

const client = createPublicClient({
    chain,
    transport: http(RPC_URL)
});

// ================================
// ABI - only functions needed
// ================================

const abi = [
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
                name: "customName",
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
            }
        ],
        stateMutability: "view",
        type: "function"
    },

    {
        inputs: [
            {
                internalType: "uint256",
                name: "userId",
                type: "uint256"
            }
        ],
        name: "getUserStakingCount",
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
                name: "userId",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "index",
                type: "uint256"
            }
        ],
        name: "getStakingInfo",
        outputs: [
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "startTime",
                type: "uint256"
            },
            {
                internalType: "bool",
                name: "claimed",
                type: "bool"
            },
            {
                internalType: "address",
                name: "staker",
                type: "address"
            },
            {
                internalType: "uint256",
                name: "apy",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "lockDuration",
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
                name: "userId",
                type: "uint256"
            }
        ],
        name: "getUserIncomes",
        outputs: [
            {
                internalType: "uint256",
                name: "directIncome",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "levelIncome",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "binaryIncome",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "stakingRewards",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "lpRewards",
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
                name: "userId",
                type: "uint256"
            }
        ],
        name: "availableIncome",
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
                name: "userId",
                type: "uint256"
            }
        ],
        name: "pendingAmount",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        stateMutability: "view",
        type: "function"
    }
];

// ================================
// Helper
// ================================

function token(value) {
    return formatUnits(value, 18);
}

// ================================
// Main
// ================================

async function main() {

    console.log("Connecting to blockchain...");

    const totalUsers = await client.readContract({
        address: PROXY_ADDRESS,
        abi,
        functionName: "userCounter"
    });

    console.log(`Total users: ${totalUsers}`);

    const results = [];

    for (let i = 1n; i <= totalUsers; i++) {

        try {

            console.log(`Checking user ${i}/${totalUsers}...`);

            const user = await client.readContract({
                address: PROXY_ADDRESS,
                abi,
                functionName: "users",
                args: [i]
            });

            const [
                userId,
                userAddress,
                nftId,
                fuel,
                customName,
                referredBy,
                referralCode
            ] = user;

            // ----------------------------
            // Income
            // ----------------------------

            const incomes = await client.readContract({
                address: PROXY_ADDRESS,
                abi,
                functionName: "getUserIncomes",
                args: [i]
            });

            const [
                directIncome,
                levelIncome,
                binaryIncome,
                stakingRewards,
                lpRewards
            ] = incomes;

            // ----------------------------
            // Available / pending
            // ----------------------------

            const available = await client.readContract({
                address: PROXY_ADDRESS,
                abi,
                functionName: "availableIncome",
                args: [i]
            });

            const pending = await client.readContract({
                address: PROXY_ADDRESS,
                abi,
                functionName: "pendingAmount",
                args: [i]
            });

            // ----------------------------
            // Staking count
            // ----------------------------

            const stakingCount = await client.readContract({
                address: PROXY_ADDRESS,
                abi,
                functionName: "getUserStakingCount",
                args: [i]
            });

            const stakes = [];

            for (let j = 0n; j < stakingCount; j++) {

                const staking = await client.readContract({
                    address: PROXY_ADDRESS,
                    abi,
                    functionName: "getStakingInfo",
                    args: [i, j]
                });

                const [
                    amount,
                    startTime,
                    claimed,
                    staker,
                    apy,
                    lockDuration
                ] = staking;

                stakes.push({
                    index: Number(j),
                    amount: token(amount),
                    startTime: new Date(
                        Number(startTime) * 1000
                    ).toISOString(),
                    claimed,
                    staker,
                    apy: token(apy),
                    lockDuration: Number(lockDuration)
                });
            }

            const result = {

                userId: userId.toString(),

                address: userAddress,

                nftId: nftId.toString(),

                name: customName,

                referralCode,

                referredBy: referredBy.toString(),

                fuel: token(fuel),

                directIncome: token(directIncome),

                levelIncome: token(levelIncome),

                binaryIncome: token(binaryIncome),

                stakingRewards: token(stakingRewards),

                lpRewards: token(lpRewards),

                availableIncome: token(available),

                pendingAmount: token(pending),

                stakingCount: stakingCount.toString(),

                stakes

            };

            results.push(result);

            console.log(result);

        } catch (error) {

            console.error(
                `Failed to read user ${i}:`,
                error.shortMessage || error.message
            );

        }
    }

    console.log("\n==============================");
    console.log("FINAL RESULT");
    console.log("==============================");

    console.log(
        JSON.stringify(results, null, 2)
    );
}

main().catch(console.error);