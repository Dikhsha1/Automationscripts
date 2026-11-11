import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  defineChain,
} from "viem";

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const ARDE = "0x59B95C628d9cEdb0077E5BfE1447C50F974341C5";
const USDT = "0x103df201ed80eE00FfE2f694C49926c7F0d42d72";

const SSP = "0x255e44e7Fec5410fF4f360b5d9C9981b6D7ed208";

const RESERVE_TREASURY =
  "0x554c1e44DF63AE9e7D83Db4a96A541E1cebEaAa0";

const OPERATION_TREASURY =
  "0x7037d9cb58784615fa6A177D3fD0aBc2D1E5E44a";

// Current obligations supplied from your UAT data

const OBLIGATIONS=1317924.348751432030;
const TARGET_PI_1 = 1.30;
const TARGET_PI_2 = 1.60;

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


// ============================================================
// ERC20 ABI
// ============================================================

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      {
        name: "account",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
  },
];


// ============================================================
// SSP ABI
// ============================================================

const sspAbi = [
  {
    type: "function",
    name: "getReserves",
    inputs: [],
    outputs: [
      {
        name: "reserve0",
        type: "uint112",
      },
      {
        name: "reserve1",
        type: "uint112",
      },
      {
        name: "blockTimestampLast",
        type: "uint32",
      },
    ],
    stateMutability: "view",
  },

  {
    type: "function",
    name: "token0",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
  },

  {
    type: "function",
    name: "token1",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
  },

  {
    type: "function",
    name: "getPriceInUSDT",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
  },
];


// ============================================================
// TOKEN BALANCE
// ============================================================

async function tokenBalance(token, account, decimals) {
  const value = await client.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account],
  });

  return Number(formatUnits(value, decimals));
}


// ============================================================
// MAIN
// ============================================================

async function main() {

  console.log("\n========== REQUIRED PI ANALYSIS ==========");

  console.log("RPC:", RPC_URL);
  console.log("Chain:", CHAIN_ID);
  console.log("SSP:", SSP);

  // ==========================================================
  // 1. TREASURY BALANCES
  // ==========================================================

  const reserveUSDT = await tokenBalance(
    USDT,
    RESERVE_TREASURY,
    6
  );

  const operationUSDT = await tokenBalance(
    USDT,
    OPERATION_TREASURY,
    6
  );

  const backing =
    reserveUSDT +
    operationUSDT;


  // ==========================================================
  // 2. SSP TOKEN ORDER
  // ==========================================================

  const token0 = await client.readContract({
    address: SSP,
    abi: sspAbi,
    functionName: "token0",
  });

  const token1 = await client.readContract({
    address: SSP,
    abi: sspAbi,
    functionName: "token1",
  });

  console.log("\n========== TOKEN ORDER ==========");

  console.log("Token0:", token0);
  console.log("Token1:", token1);

  // ==========================================================
  // 3. SSP RESERVES
  // ==========================================================

  const reserves = await client.readContract({
    address: SSP,
    abi: sspAbi,
    functionName: "getReserves",
  });

  const rawReserve0 = reserves[0];
  const rawReserve1 = reserves[1];

  console.log("\n========== RAW RESERVES ==========");

  console.log(
    "Raw Reserve0:",
    rawReserve0.toString()
  );

  console.log(
    "Raw Reserve1:",
    rawReserve1.toString()
  );


  // ==========================================================
  // 4. CONVERT RESERVES
  //
  // SSP getReserves() is using 18-decimal internal units.
  // token0 = USDT
  // token1 = ARDE
  // ==========================================================

  let poolUSDT;
  let poolARDE;

  if (
    token0.toLowerCase() === USDT.toLowerCase() &&
    token1.toLowerCase() === ARDE.toLowerCase()
  ) {

    poolUSDT = Number(
      formatUnits(rawReserve0, 18)
    );

    poolARDE = Number(
      formatUnits(rawReserve1, 18)
    );

  } else if (
    token0.toLowerCase() === ARDE.toLowerCase() &&
    token1.toLowerCase() === USDT.toLowerCase()
  ) {

    poolARDE = Number(
      formatUnits(rawReserve0, 18)
    );

    poolUSDT = Number(
      formatUnits(rawReserve1, 18)
    );

  } else {

    throw new Error(
      "SSP token0/token1 do not match expected ARDE/USDT addresses."
    );
  }


  // ==========================================================
  // 5. CALCULATE MARKET PRICE
  // ==========================================================

  const calculatedMarketPrice =
    poolUSDT / poolARDE;


  // ==========================================================
  // 6. READ CONTRACT MARKET PRICE
  // ==========================================================

  let contractPrice = null;

  try {

    const priceRaw = await client.readContract({
      address: SSP,
      abi: sspAbi,
      functionName: "getPriceInUSDT",
    });

    contractPrice =
      Number(formatUnits(priceRaw, 18));

  } catch {

    console.log(
      "\nContract getPriceInUSDT(): unavailable"
    );
  }


  // ==========================================================
  // 7. AV
  //
  // AV = Treasury assets / ARDE obligations
  // ==========================================================

  const AV =
    backing /
    OBLIGATIONS;


  // ==========================================================
  // 8. PI
  //
  // PI = Market Price / AV
  // ==========================================================

  const currentPI =
    calculatedMarketPrice /
    AV;


  // ==========================================================
  // 9. REQUIRED MARKET PRICE
  // ==========================================================

  const requiredPrice130 =
    AV *
    TARGET_PI_1;

  const requiredPrice160 =
    AV *
    TARGET_PI_2;


  // ==========================================================
  // 10. PRICE INCREASE REQUIRED
  // ==========================================================

  const increase130 =
    ((requiredPrice130 / calculatedMarketPrice) - 1) *
    100;

  const increase160 =
    ((requiredPrice160 / calculatedMarketPrice) - 1) *
    100;


  // ==========================================================
  // OUTPUT
  // ==========================================================

  console.log("\n========== TREASURIES ==========");

  console.log(
    "Reserve Treasury USDT:",
    reserveUSDT.toFixed(6)
  );

  console.log(
    "Operation Treasury USDT:",
    operationUSDT.toFixed(6)
  );

  console.log(
    "Total Backing:",
    backing.toFixed(6)
  );


  console.log("\n========== OBLIGATIONS ==========");

  console.log(
    "ARDE Obligations:",
    OBLIGATIONS.toFixed(18)
  );


  console.log("\n========== AV ==========");

  console.log(
    "AV:",
    AV.toFixed(8),
    "USDT / ARDE"
  );


  console.log("\n========== POOL ==========");

  console.log(
    "Pool USDT:",
    poolUSDT.toFixed(6)
  );

  console.log(
    "Pool ARDE:",
    poolARDE.toFixed(18)
  );


  console.log("\n========== MARKET PRICE ==========");

  console.log(
    "Calculated Market Price:",
    calculatedMarketPrice.toFixed(8),
    "USDT / ARDE"
  );

  if (contractPrice !== null) {

    console.log(
      "Contract getPriceInUSDT:",
      contractPrice.toFixed(8),
      "USDT / ARDE"
    );

    const difference =
      Math.abs(
        calculatedMarketPrice -
        contractPrice
      );

    console.log(
      "Price Difference:",
      difference.toFixed(8)
    );
  }


  console.log("\n========== CURRENT PI ==========");

  console.log(
    "PI:",
    currentPI.toFixed(8)
  );


  // ==========================================================
  // PI 1.30
  // ==========================================================

  console.log("\n========== PI 1.30 TARGET ==========");

  console.log(
    "Required Market Price:",
    requiredPrice130.toFixed(8)
  );

  console.log(
    "Current Market Price:",
    calculatedMarketPrice.toFixed(8)
  );

  if (increase130 > 0) {

    console.log(
      "Price Increase Required:",
      increase130.toFixed(2),
      "%"
    );

  } else {

    console.log(
      "Price Increase Required: 0%"
    );
  }


  // ==========================================================
  // PI 1.60
  // ==========================================================

  console.log("\n========== PI 1.60 TARGET ==========");

  console.log(
    "Required Market Price:",
    requiredPrice160.toFixed(8)
  );

  if (increase160 > 0) {

    console.log(
      "Price Increase Required:",
      increase160.toFixed(2),
      "%"
    );

  } else {

    console.log(
      "Price Increase Required: 0%"
    );
  }


  // ==========================================================
  // FLOOR
  // ==========================================================

  console.log("\n========== AMO GATES ==========");

  console.log(
    "Pool >= $100,000:",
    poolUSDT >= 100000
      ? "PASS"
      : "FAIL"
  );

  console.log(
    "PI >= 1.30:",
    currentPI >= 1.30
      ? "PASS"
      : "FAIL"
  );


  // ==========================================================
  // FINAL RESULT
  // ==========================================================

  console.log("\n========== AMO STATUS ==========");

  if (
    poolUSDT >= 100000 &&
    currentPI >= 1.30
  ) {

    console.log(
      "AMO PI/FLOOR GATES: PASS"
    );

    console.log(
      "A qualifying $50+ buy should be eligible for skim."
    );

  } else {

    console.log(
      "AMO PI/FLOOR GATES: NOT READY"
    );

    if (poolUSDT < 100000) {
      console.log(
        "Reason: Pool is below $100,000."
      );
    }

    if (currentPI < 1.30) {
      console.log(
        "Reason: PI is below 1.30."
      );
    }
  }


  console.log("\n========== END ==========\n");
}


main().catch((error) => {

  console.error("\nERROR:");
  console.error(error);

  process.exit(1);

});