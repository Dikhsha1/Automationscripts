#!/usr/bin/env node

import dotenv from "dotenv";

import {
    createPublicClient,
    http,
    parseAbi,
    getAddress,
} from "viem";

// ============================================================
// LOAD ENV
// ============================================================

dotenv.config({ path: ".env.dev" });

// ============================================================
// CONFIG
// ============================================================

const RPC_URL = process.env.RPC_URL;
const USER_REGISTRY_ADDRESS =
    process.env.USER_REGISTRY_ADDRESS;

// ============================================================
// ROOT
// ============================================================

const ROOT_USER_ID = 236;
const ROOT_NAME = "ravneet6";

// ============================================================
// TREE CONFIG
// ============================================================

// Check 7 levels BELOW root
const TOTAL_LEVELS = 7;

// Expected children for every parent
const EXPECTED_CHILDREN = 2;

// ============================================================
// VALIDATION
// ============================================================

if (!RPC_URL) {
    throw new Error(
        "RPC_URL is missing in .env.dev"
    );
}

if (!USER_REGISTRY_ADDRESS) {
    throw new Error(
        "USER_REGISTRY_ADDRESS is missing in .env.dev"
    );
}

// ============================================================
// USER REGISTRY ABI
// ============================================================

const USER_REGISTRY_ABI = parseAbi([

    // --------------------------------------------------------
    // User
    // --------------------------------------------------------

    "function getUserById(uint256 userId) external view returns ((uint256 userId,address userAddress,uint256 nftId,uint256 fuel,string username,uint256 referredBy,string referralCode,uint256 nftMintTime))",

    // --------------------------------------------------------
    // Counter
    // --------------------------------------------------------

    "function userCounter() external view returns (uint256)",

    // --------------------------------------------------------
    // Referral
    // --------------------------------------------------------

    "function directReferralsCount(uint256 userId) external view returns (uint256)",

    "function getReferralChain(uint256 userId) external view returns ((uint256 userId,address userAddress)[])",

    "function getReferrerDetails(uint256 userId) external view returns (uint256,address)",

    // --------------------------------------------------------
    // Referral code
    // --------------------------------------------------------

    "function referralCodeToUserId(string code) external view returns (uint256 userId,bool active)",
]);

// ============================================================
// CONTRACT
// ============================================================

const USER_REGISTRY =
    getAddress(USER_REGISTRY_ADDRESS);

// ============================================================
// CLIENT
// ============================================================

const publicClient =
    createPublicClient({
        transport: http(RPC_URL),
    });

// ============================================================
// CACHE
// ============================================================

const USER_CACHE = new Map();

// ============================================================
// GET USER
// ============================================================

async function getUserById(userId) {

    return await publicClient.readContract({
        address: USER_REGISTRY,
        abi: USER_REGISTRY_ABI,
        functionName: "getUserById",
        args: [BigInt(userId)],
    });
}

// ============================================================
// BUILD USER CACHE
// ============================================================
//
// We load users ONCE.
//
// This avoids repeatedly calling:
//
// getUserById(1)
// getUserById(2)
// ...
//
// for every parent.
//
// ============================================================

async function buildUserCache() {

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "LOADING USERS FROM USER REGISTRY"
    );
    console.log(
        "================================================"
    );

    const counter =
        await publicClient.readContract({
            address: USER_REGISTRY,
            abi: USER_REGISTRY_ABI,
            functionName: "userCounter",
        });

    console.log(
        `Total users: ${counter.toString()}`
    );

    for (
        let id = 1n;
        id <= counter;
        id++
    ) {

        try {

            const user =
                await getUserById(id);

            USER_CACHE.set(
                user.userId.toString(),
                user
            );

            if (
                id % 25n === 0n ||
                id === counter
            ) {

                console.log(
                    `Loaded ${id}/${counter}`
                );
            }

        } catch (error) {

            console.log(
                `⚠️ Unable to load User ID ${id}`
            );
        }
    }

    console.log("");
    console.log(
        `✅ Users loaded: ${USER_CACHE.size}`
    );
}

// ============================================================
// FIND USER
// ============================================================

function getCachedUser(userId) {

    return USER_CACHE.get(
        BigInt(userId).toString()
    );
}

// ============================================================
// FIND CHILDREN
// ============================================================
//
// A child belongs to a parent when:
//
// child.referredBy === parent.userId
//
// ============================================================

function findChildren(parentId) {

    const children = [];

    for (
        const user of USER_CACHE.values()
    ) {

        if (
            user.referredBy ===
            BigInt(parentId)
        ) {

            children.push(user);
        }
    }

    // Sort by User ID
    children.sort(
        (a, b) =>
            Number(a.userId - b.userId)
    );

    return children;
}

// ============================================================
// CHECK DIRECT CHILD COUNT
// ============================================================

async function checkDirectCount(
    parent
) {

    const contractCount =
        await publicClient.readContract({
            address: USER_REGISTRY,
            abi: USER_REGISTRY_ABI,
            functionName:
                "directReferralsCount",
            args: [
                parent.userId
            ],
        });

    const actualChildren =
        findChildren(parent.userId);

    console.log(
        `Contract count : ${contractCount.toString()}`
    );

    console.log(
        `Calculated     : ${actualChildren.length}`
    );

    return {
        contractCount,
        actualChildren,
    };
}

// ============================================================
// PRINT CHILD
// ============================================================

function printChild(
    child,
    prefix,
    position
) {

    console.log(
        `${prefix}${position} ${child.username} | ID: ${child.userId.toString()} | referredBy: ${child.referredBy.toString()}`
    );
}

// ============================================================
// CHECK PARENT
// ============================================================

async function checkParent(
    parent,
    level,
    isLastParent = false
) {

    const children =
        findChildren(
            parent.userId
        );

    const contractCount =
        await publicClient.readContract({
            address: USER_REGISTRY,
            abi: USER_REGISTRY_ABI,
            functionName:
                "directReferralsCount",
            args: [
                parent.userId
            ],
        });

    const prefix =
        level === 0
            ? ""
            : "│   ".repeat(level - 1);

    console.log("");

    console.log(
        `${prefix}📌 ${parent.username}`
    );

    console.log(
        `${prefix}   User ID       : ${parent.userId.toString()}`
    );

    console.log(
        `${prefix}   Referral Code : ${parent.referralCode}`
    );

    console.log(
        `${prefix}   referredBy    : ${parent.referredBy.toString()}`
    );

    console.log(
        `${prefix}   Children      : ${children.length}`
    );

    console.log(
        `${prefix}   Contract Count: ${contractCount.toString()}`
    );

    // ========================================================
    // EMPTY CHECK
    // ========================================================

    if (children.length === 0) {

        console.log(
            `${prefix}   ❌ EMPTY PARENT - NO CHILDREN`
        );

    } else if (
        children.length === 1
    ) {

        console.log(
            `${prefix}   ⚠️ ONLY 1 CHILD - ONE SLOT EMPTY`
        );

    } else if (
        children.length === EXPECTED_CHILDREN
    ) {

        console.log(
            `${prefix}   ✅ FULL - 2 CHILDREN`
        );

    } else {

        console.log(
            `${prefix}   ⚠️ MORE THAN EXPECTED CHILDREN`
        );
    }

    // ========================================================
    // PRINT CHILDREN
    // ========================================================

    for (
        let i = 0;
        i < children.length;
        i++
    ) {

        const child =
            children[i];

        const childPrefix =
            level === 0
                ? "    "
                : `${prefix}│   `;

        console.log(
            `${childPrefix}└── ${child.username} | ID: ${child.userId.toString()} | referredBy: ${child.referredBy.toString()}`
        );
    }

    return children;
}

// ============================================================
// LEVEL CHECK
// ============================================================

async function checkLevel(
    parents,
    level
) {

    console.log("");
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        `LEVEL ${level} CHECK`
    );
    console.log(
        "================================================"
    );

    console.log(
        `Parents in level ${level}: ${parents.length}`
    );

    const nextLevel = [];

    let emptyParents = 0;
    let oneChildParents = 0;
    let fullParents = 0;

    for (
        const parent of parents
    ) {

        const children =
            await checkParent(
                parent,
                level
            );

        // --------------------------------------------
        // Empty
        // --------------------------------------------

        if (
            children.length === 0
        ) {

            emptyParents++;
        }

        // --------------------------------------------
        // One child
        // --------------------------------------------

        else if (
            children.length === 1
        ) {

            oneChildParents++;
        }

        // --------------------------------------------
        // Full
        // --------------------------------------------

        else if (
            children.length ===
            EXPECTED_CHILDREN
        ) {

            fullParents++;
        }

        nextLevel.push(
            ...children
        );
    }

    // ========================================================
    // LEVEL SUMMARY
    // ========================================================

    console.log("");
    console.log(
        "------------------------------------------------"
    );

    console.log(
        `LEVEL ${level} SUMMARY`
    );

    console.log(
        "------------------------------------------------"
    );

    console.log(
        `Parents checked       : ${parents.length}`
    );

    console.log(
        `Children found        : ${nextLevel.length}`
    );

    console.log(
        `Empty parents         : ${emptyParents}`
    );

    console.log(
        `Parents with 1 child  : ${oneChildParents}`
    );

    console.log(
        `Parents with 2 child  : ${fullParents}`
    );

    const expectedChildren =
        parents.length *
        EXPECTED_CHILDREN;

    console.log(
        `Expected children     : ${expectedChildren}`
    );

    console.log(
        `Actual children       : ${nextLevel.length}`
    );

    if (
        nextLevel.length ===
        expectedChildren
    ) {

        console.log(
            `✅ LEVEL ${level} COUNT PASSED`
        );

    } else {

        console.log(
            `❌ LEVEL ${level} COUNT FAILED`
        );
    }

    // ========================================================
    // EMPTY PARENT SUMMARY
    // ========================================================

    if (
        emptyParents > 0
    ) {

        console.log("");
        console.log(
            "❌ EMPTY PARENTS"
        );

        for (
            const parent of parents
        ) {

            const children =
                findChildren(
                    parent.userId
                );

            if (
                children.length === 0
            ) {

                console.log(
                    `   ${parent.username} | User ID: ${parent.userId.toString()}`
                );
            }
        }
    }

    // ========================================================
    // ONE CHILD SUMMARY
    // ========================================================

    if (
        oneChildParents > 0
    ) {

        console.log("");
        console.log(
            "⚠️ PARENTS WITH ONE CHILD"
        );

        for (
            const parent of parents
        ) {

            const children =
                findChildren(
                    parent.userId
                );

            if (
                children.length === 1
            ) {

                console.log(
                    `   ${parent.username} | ID: ${parent.userId.toString()}`
                );

                console.log(
                    `      Existing child: ${children[0].username}`
                );
            }
        }
    }

    return nextLevel;
}

// ============================================================
// VERIFY REFERRAL CHAINS
// ============================================================

async function verifyChains(
    users,
    level
) {

    console.log("");
    console.log(
        "------------------------------------------------"
    );
    console.log(
        `VERIFYING LEVEL ${level} REFERRAL CHAINS`
    );
    console.log(
        "------------------------------------------------"
    );

    let passed = 0;
    let failed = 0;

    for (
        const user of users
    ) {

        try {

            const chain =
                await publicClient.readContract({
                    address: USER_REGISTRY,
                    abi: USER_REGISTRY_ABI,
                    functionName:
                        "getReferralChain",
                    args: [
                        user.userId
                    ],
                });

            if (
                chain.length >= level
            ) {

                console.log(
                    `✅ ${user.username} | chain length: ${chain.length}`
                );

                passed++;

            } else {

                console.log(
                    `❌ ${user.username} | chain length: ${chain.length} | expected >= ${level}`
                );

                failed++;
            }

        } catch (error) {

            console.log(
                `❌ ${user.username} | referral chain check failed`
            );

            failed++;
        }
    }

    console.log("");
    console.log(
        `Chain Passed: ${passed}`
    );

    console.log(
        `Chain Failed: ${failed}`
    );
}

// ============================================================
// FIND ALL EMPTY PARENTS
// ============================================================

async function findAllEmptyParents() {

    console.log("");
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "SEARCHING FOR ALL EMPTY PARENTS"
    );
    console.log(
        "================================================"
    );

    const emptyParents = [];
    const oneChildParents = [];

    for (
        const user of USER_CACHE.values()
    ) {

        const children =
            findChildren(
                user.userId
            );

        if (
            children.length === 0
        ) {

            emptyParents.push(
                user
            );
        }

        if (
            children.length === 1
        ) {

            oneChildParents.push(
                {
                    parent: user,
                    child: children[0],
                }
            );
        }
    }

    console.log("");
    console.log(
        `Total users checked: ${USER_CACHE.size}`
    );

    console.log("");
    console.log(
        "❌ USERS WITH ZERO CHILDREN"
    );

    console.log(
        "------------------------------------------------"
    );

    if (
        emptyParents.length === 0
    ) {

        console.log(
            "None"
        );

    } else {

        for (
            const user of emptyParents
        ) {

            console.log(
                `${user.username} | ID: ${user.userId.toString()} | referredBy: ${user.referredBy.toString()}`
            );
        }
    }

    console.log("");
    console.log(
        "⚠️ USERS WITH ONLY ONE CHILD"
    );

    console.log(
        "------------------------------------------------"
    );

    if (
        oneChildParents.length === 0
    ) {

        console.log(
            "None"
        );

    } else {

        for (
            const item of oneChildParents
        ) {

            console.log(
                `${item.parent.username} | ID: ${item.parent.userId.toString()}`
            );

            console.log(
                `   └── ${item.child.username} | ID: ${item.child.userId.toString()}`
            );
        }
    }

    return {
        emptyParents,
        oneChildParents,
    };
}

// ============================================================
// MAIN
// ============================================================

async function main() {

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        " ARDEN QA - REFERRAL TREE EMPTY SLOT CHECKER"
    );
    console.log(
        "================================================"
    );

    console.log(
        `RPC             : ${RPC_URL}`
    );

    console.log(
        `UserRegistry    : ${USER_REGISTRY}`
    );

    console.log(
        `Root            : ${ROOT_NAME}`
    );

    console.log(
        `Root User ID    : ${ROOT_USER_ID}`
    );

    console.log(
        `Levels          : ${TOTAL_LEVELS}`
    );

    console.log(
        `Expected Child  : ${EXPECTED_CHILDREN}`
    );

    // ========================================================
    // LOAD ALL USERS
    // ========================================================

    await buildUserCache();

    // ========================================================
    // GET ROOT
    // ========================================================

    const root =
        getCachedUser(
            ROOT_USER_ID
        );

    if (!root) {

        throw new Error(
            `Root User ID ${ROOT_USER_ID} not found`
        );
    }

    if (
        root.username !==
        ROOT_NAME
    ) {

        throw new Error(
            `Root username mismatch. Expected ${ROOT_NAME}, found ${root.username}`
        );
    }

    console.log("");
    console.log(
        "✅ ROOT FOUND"
    );

    console.log(
        `Root: ${root.username} | ID: ${root.userId.toString()}`
    );

    // ========================================================
    // LEVEL 0
    // ========================================================

    let currentLevel = [
        root
    ];

    // ========================================================
    // CHECK LEVEL 1 → 7
    // ========================================================

    for (
        let level = 1;
        level <= TOTAL_LEVELS;
        level++
    ) {

        currentLevel =
            await checkLevel(
                currentLevel,
                level
            );

        if (
            currentLevel.length === 0
        ) {

            console.log("");
            console.log(
                `❌ LEVEL ${level} HAS NO USERS`
            );

            console.log(
                "Stopping tree traversal."
            );

            break;
        }

        // ----------------------------------------------------
        // Referral chain check
        // ----------------------------------------------------

        await verifyChains(
            currentLevel,
            level
        );
    }

    // ========================================================
    // GLOBAL EMPTY CHECK
    // ========================================================

    await findAllEmptyParents();

    // ========================================================
    // FINAL
    // ========================================================

    console.log("");
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "REFERRAL TREE CHECK COMPLETED"
    );
    console.log(
        "================================================"
    );

    console.log("");
    console.log(
        "This script is READ-ONLY."
    );

    console.log(
        "No registration transaction was sent."
    );

    console.log(
        "No USDT was spent."
    );

    console.log(
        "================================================"
    );
}

// ============================================================
// ERROR HANDLER
// ============================================================

main().catch(
    (error) => {

        console.error("");
        console.error(
            "❌ SCRIPT FAILED"
        );

        console.error(
            "------------------------------------------------"
        );

        console.error(
            "Short message:",
            error.shortMessage ||
            "N/A"
        );

        console.error(
            "Message:",
            error.message ||
            error
        );

        if (
            error.cause
        ) {

            console.error(
                "Cause:",
                error.cause
            );
        }

        process.exit(1);
    }
);