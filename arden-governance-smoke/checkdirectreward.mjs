
import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
} from "viem";

// ============================================================
// CONFIG
// ============================================================

const RPC_URL = process.env.RPC_URL;

// Your Rewards contract
const REWARDS_ADDRESS = process.env.REWARDS_ADDRESS;

// ============================================================
// CLIENT
// ============================================================

const client = createPublicClient({
  transport: http(RPC_URL),
});

// ============================================================
// ABI
// ============================================================

// Common BPS getter names.
// We will try them one by one.
const bpsFunctions = [
  "directBps",
  "directRateBps",
  "directReferralBps",
  "directReferralRate",
  "directRate",
];

// ============================================================
// HEADER
// ============================================================

console.log("==========================================");
console.log("ARDEN DIRECT REFERRAL BPS CHECK");
console.log("==========================================");

console.log("RPC URL       :", RPC_URL);
console.log("Rewards       :", REWARDS_ADDRESS);

if (!REWARDS_ADDRESS) {
  console.error("\n❌ REWARDS_ADDRESS is missing from .env");
  process.exit(1);
}

// ============================================================
// TRY EACH GETTER
// ============================================================

let found = false;

for (const functionName of bpsFunctions) {
  try {
    console.log(`\nTrying: ${functionName}()`);

    const abi = [
      {
        type: "function",
        name: functionName,
        stateMutability: "view",
        inputs: [],
        outputs: [
          {
            name: "",
            type: "uint256",
          },
        ],
      },
    ];

    const result = await client.readContract({
      address: REWARDS_ADDRESS,
      abi,
      functionName,
    });

    console.log("✅ Function found");
    console.log("Raw BPS:", result.toString());

    const bps = Number(result);
    const percentage = bps / 100;

    console.log("BPS      :", bps);
    console.log("Rate     :", percentage + "%");

    found = true;
    break;

  } catch (error) {
    console.log("❌ Not available");
  }
}

// ============================================================
// RESULT
// ============================================================

if (!found) {
  console.log("\n==========================================");
  console.log("❌ Could not find a matching BPS getter");
  console.log("==========================================");
  console.log(
    "Please provide the RewardsEngine ABI so we can identify"
  );
  console.log("the exact function used for the Direct Referral BPS.");
} else {
  console.log("\n==========================================");
  console.log("✅ DIRECT REFERRAL BPS FOUND");
  console.log("==========================================");
}

