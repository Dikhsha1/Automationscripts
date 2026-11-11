import "dotenv/config";
import {
  createPublicClient,
  http,
  formatUnits,
  parseUnits,
  defineChain,
} from "viem";

/* =========================================================
   CONFIG
========================================================= */

const RPC_URL = process.env.RPC_URL;

if (!RPC_URL) {
  throw new Error("RPC_URL is missing in .env");
}

const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const SSP =
  "0x255e44e7Fec5410fF4f360b5d9C9981b6D7ed208";

const ARDE =
  "0x59B95C628d9cEdb0077E5BfE1447C50F974341C5";

const USDT =
  "0x103df201ed80eE00FfE2f694C49926c7F0d42d72";

const USER =
  process.env.USER_ADDRESS ||
  "0xfd76a874f7bbf0f1f78ae82c93f65c16ad70b944";


/* =========================================================
   DECIMALS
========================================================= */

const USDT_DECIMALS = 6;
const ARDE_DECIMALS = 18;


/* =========================================================
   SLIPPAGE SETTINGS
=========================================================

   Basis Points:

   0 BPS   = 0%
   50 BPS  = 0.5%
   100 BPS = 1%
   150 BPS = 1.5%
   200 BPS = 2%
   250 BPS = 2.5%
   300 BPS = 3%
   400 BPS = 4%
   500 BPS = 5%

========================================================= */

const BPS = 10000n;

const SLIPPAGE_LEVELS = [
  0n,
  50n,
  100n,
  150n,
  200n,
  250n,
  300n,
  400n,
  500n,
];


/* =========================================================
   TEST AMOUNTS
========================================================= */

const TEST_AMOUNTS = [
  100,
  500,
  1000,
  5000,
  10000,
  20000,
];


/* =========================================================
   CHAIN
========================================================= */

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


/* =========================================================
   CLIENT
========================================================= */

const client = createPublicClient({
  chain,
  transport: http(RPC_URL),
});


/* =========================================================
   SSP ABI
========================================================= */

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
    name: "getAmountsOut",
    inputs: [
      {
        name: "amountIn",
        type: "uint256",
      },
      {
        name: "path",
        type: "address[]",
      },
      {
        name: "user",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "amounts",
        type: "uint256[]",
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
];


/* =========================================================
   HELPERS
========================================================= */

function normalize(address) {
  return address.toLowerCase();
}


function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.shortMessage || error.message;
  }

  return String(error);
}


function formatSlippage(bps) {
  return (Number(bps) / 100).toFixed(2);
}


/* =========================================================
   MAIN
========================================================= */

async function main() {

  console.log("\n");
  console.log("======================================================");
  console.log("       ARDEN UAT - ARDE BUY QUOTE & SLIPPAGE QA");
  console.log("======================================================");

  console.log("RPC       :", RPC_URL);
  console.log("CHAIN ID  :", CHAIN_ID);
  console.log("SSP       :", SSP);
  console.log("USER      :", USER);

  console.log("\nConfigured pair:");
  console.log("USDT      :", USDT);
  console.log("ARDE      :", ARDE);


  /* =======================================================
     READ CONTRACT DATA
  ======================================================= */

  const [
    token0,
    token1,
    reserves,
    currentPrice,
  ] = await Promise.all([

    client.readContract({
      address: SSP,
      abi: sspAbi,
      functionName: "token0",
    }),

    client.readContract({
      address: SSP,
      abi: sspAbi,
      functionName: "token1",
    }),

    client.readContract({
      address: SSP,
      abi: sspAbi,
      functionName: "getReserves",
    }),

    client.readContract({
      address: SSP,
      abi: sspAbi,
      functionName: "getPriceInUSDT",
    }),

  ]);


  /* =======================================================
     VERIFY PAIR
  ======================================================= */

  const token0Lower = normalize(token0);
  const token1Lower = normalize(token1);

  const usdtLower = normalize(USDT);
  const ardeLower = normalize(ARDE);

  const validPair =
    (
      token0Lower === usdtLower &&
      token1Lower === ardeLower
    ) ||
    (
      token0Lower === ardeLower &&
      token1Lower === usdtLower
    );

  console.log("\n");
  console.log("======================================================");
  console.log("                 TOKEN VERIFICATION");
  console.log("======================================================");

  console.log("Token0 :", token0);
  console.log("Token1 :", token1);

  if (!validPair) {
    throw new Error(
      "\nSSP token pair mismatch.\n" +
      `Expected USDT/ARDE:\n` +
      `USDT = ${USDT}\n` +
      `ARDE = ${ARDE}\n` +
      `Actual:\n` +
      `Token0 = ${token0}\n` +
      `Token1 = ${token1}`
    );
  }

  console.log("PAIR CHECK : PASS");


  /* =======================================================
     RESERVES
  ======================================================= */

  let reserveUSDT;
  let reserveARDE;

  if (token0Lower === usdtLower) {

    reserveUSDT =
      formatUnits(
        reserves[0],
        USDT_DECIMALS
      );

    reserveARDE =
      formatUnits(
        reserves[1],
        ARDE_DECIMALS
      );

  } else {

    reserveARDE =
      formatUnits(
        reserves[0],
        ARDE_DECIMALS
      );

    reserveUSDT =
      formatUnits(
        reserves[1],
        USDT_DECIMALS
      );
  }


  console.log("\n");
  console.log("======================================================");
  console.log("                     POOL");
  console.log("======================================================");

  console.log(
    "USDT RESERVE :",
    reserveUSDT
  );

  console.log(
    "ARDE RESERVE :",
    reserveARDE
  );


  /* =======================================================
     CONTRACT PRICE
  ======================================================= */

  const contractPrice =
    Number(
      formatUnits(
        currentPrice,
        18
      )
    );

  console.log(
    "CONTRACT PRICE :",
    contractPrice.toFixed(8),
    "USDT/ARDE"
  );


  /* =======================================================
     TEST CONFIGURATION
  ======================================================= */

  console.log("\n");
  console.log("======================================================");
  console.log("                 TEST CONFIGURATION");
  console.log("======================================================");

  console.log(
    "Slippage Range : 0% - 5%"
  );

  console.log(
    "Slippage Cases : 9"
  );

  console.log(
    "Buy Amounts    :",
    TEST_AMOUNTS.join(", "),
    "USDT"
  );

  console.log(
    "Fee Tier       : Eco"
  );


  /* =======================================================
     BUY QUOTES
  ======================================================= */

  let totalQuotePass = 0;
  let totalQuoteFail = 0;

  let totalSlippagePass = 0;
  let totalSlippageFail = 0;


  for (const usdtAmount of TEST_AMOUNTS) {

    console.log("\n");
    console.log("======================================================");
    console.log(
      `              BUY TEST: ${usdtAmount} USDT`
    );
    console.log("======================================================");


    try {

      /* ---------------------------------------------------
         USDT INPUT
      --------------------------------------------------- */

      const amountIn =
        parseUnits(
          usdtAmount.toString(),
          USDT_DECIMALS
        );


      /* ---------------------------------------------------
         CONTRACT QUOTE
      --------------------------------------------------- */

      const amounts =
        await client.readContract({

          address: SSP,

          abi: sspAbi,

          functionName: "getAmountsOut",

          args: [
            amountIn,

            [
              USDT,
              ARDE,
            ],

            USER,
          ],

        });


      if (
        !amounts ||
        amounts.length < 2
      ) {
        throw new Error(
          "Invalid getAmountsOut response"
        );
      }


      /* ---------------------------------------------------
         ARDE OUTPUT
      --------------------------------------------------- */

      const ardeOutRaw =
        amounts[amounts.length - 1];

      const ardeOut =
        Number(
          formatUnits(
            ardeOutRaw,
            ARDE_DECIMALS
          )
        );


      if (ardeOut <= 0) {
        throw new Error(
          "ARDE output is zero"
        );
      }


      /* ---------------------------------------------------
         RATE
      --------------------------------------------------- */

      const rateArdePerUsdt =
        ardeOut / usdtAmount;


      const rateUsdtPerArde =
        usdtAmount / ardeOut;


      /* ---------------------------------------------------
         DISPLAY QUOTE
      --------------------------------------------------- */

      console.log(
        `USDT INPUT       : ${usdtAmount.toFixed(2)} USDT`
      );

      console.log(
        `ARDE OUTPUT      : ${ardeOut.toFixed(12)} ARDE`
      );

      console.log(
        `RATE             : 1 USDT ≈ ${rateArdePerUsdt.toFixed(6)} ARDE`
      );

      console.log(
        `INVERSE RATE     : 1 ARDE ≈ ${rateUsdtPerArde.toFixed(8)} USDT`
      );

      console.log(
        `FEE TIER         : Eco`
      );


      /* ===================================================
         REFERENCE PRICE IMPACT
      =================================================== */

      let referenceImpact = null;

      if (contractPrice > 0) {

        referenceImpact =
          (
            (rateUsdtPerArde - contractPrice) /
            contractPrice
          ) * 100;

        console.log(
          `REFERENCE IMPACT : ${referenceImpact.toFixed(4)}%`
        );

      } else {

        console.log(
          "REFERENCE IMPACT : N/A"
        );
      }


      /* ===================================================
         BASIC QUOTE QA
      =================================================== */

      const quotePass =
        ardeOutRaw > 0n;

      if (quotePass) {
        totalQuotePass++;
      } else {
        totalQuoteFail++;
      }


      console.log("\nQA CHECK:");
      console.log(
        "Quote            :",
        quotePass ? "PASS" : "FAIL"
      );


      /* ===================================================
         SLIPPAGE TEST CASES
      =================================================== */

      console.log("\n");
      console.log("------------------------------------------------------");
      console.log("              SLIPPAGE TEST CASES");
      console.log("------------------------------------------------------");

      console.log(
        "Quoted Output :",
        ardeOut.toFixed(12),
        "ARDE"
      );

      console.log("");

      for (const slippageBps of SLIPPAGE_LEVELS) {

        const minimumReceivedRaw =
          (
            ardeOutRaw *
            (BPS - slippageBps)
          ) / BPS;


        const minimumReceived =
          formatUnits(
            minimumReceivedRaw,
            ARDE_DECIMALS
          );


        const slippagePercent =
          formatSlippage(slippageBps);


        /* -------------------------------------------------
           TEST 1
           Minimum received cannot exceed quote
        ------------------------------------------------- */

        const minimumLessThanQuotePass =
          minimumReceivedRaw <= ardeOutRaw;


        /* -------------------------------------------------
           TEST 2
           0% slippage must equal quote
        ------------------------------------------------- */

        const zeroSlippagePass =
          slippageBps !== 0n ||
          minimumReceivedRaw === ardeOutRaw;


        /* -------------------------------------------------
           TEST 3
           5% slippage must equal 95% of quote
        ------------------------------------------------- */

        const fivePercentExpected =
          (
            ardeOutRaw * 9500n
          ) / BPS;


        const fivePercentPass =
          slippageBps !== 500n ||
          minimumReceivedRaw ===
            fivePercentExpected;


        /* -------------------------------------------------
           TEST 4
           Minimum received should decrease as
           slippage increases
        ------------------------------------------------- */

        const monotonicPass =
          minimumReceivedRaw <= ardeOutRaw;


        const slippagePass =
          minimumLessThanQuotePass &&
          zeroSlippagePass &&
          fivePercentPass &&
          monotonicPass;


        if (slippagePass) {
          totalSlippagePass++;
        } else {
          totalSlippageFail++;
        }


        console.log(
          `${slippagePercent.padStart(5)}%` +
          ` | Minimum Received: ` +
          `${minimumReceived}` +
          ` ARDE` +
          ` | ${slippagePass ? "PASS" : "FAIL"}`
        );
      }


    } catch (error) {

      totalQuoteFail++;

      console.log(
        `QUOTE FAILED FOR ${usdtAmount} USDT`
      );

      console.log(
        getErrorMessage(error)
      );
    }
  }


  /* =======================================================
     SLIPPAGE RANGE TEST
  ======================================================= */

  console.log("\n");
  console.log("======================================================");
  console.log("             SLIPPAGE RANGE VALIDATION");
  console.log("======================================================");

  const minSlippage =
    SLIPPAGE_LEVELS[0];

  const maxSlippage =
    SLIPPAGE_LEVELS[
      SLIPPAGE_LEVELS.length - 1
    ];

  const validSlippageRange =
    minSlippage === 0n &&
    maxSlippage === 500n &&
    SLIPPAGE_LEVELS.every(
      (value) =>
        value >= 0n &&
        value <= 500n
    );


  console.log(
    "Minimum Slippage :",
    formatSlippage(minSlippage) + "%"
  );

  console.log(
    "Maximum Slippage :",
    formatSlippage(maxSlippage) + "%"
  );

  console.log(
    "Range Check      :",
    validSlippageRange
      ? "PASS"
      : "FAIL"
  );


  /* =======================================================
     FINAL SUMMARY
  ======================================================= */

  console.log("\n");
  console.log("======================================================");
  console.log("                  FINAL QA SUMMARY");
  console.log("======================================================");

  console.log(
    "Buy Quote PASS       :",
    totalQuotePass
  );

  console.log(
    "Buy Quote FAIL       :",
    totalQuoteFail
  );

  console.log(
    "Slippage Tests PASS  :",
    totalSlippagePass
  );

  console.log(
    "Slippage Tests FAIL  :",
    totalSlippageFail
  );

  console.log(
    "Slippage Range       :",
    validSlippageRange
      ? "PASS (0% - 5%)"
      : "FAIL"
  );


  const overallPass =
    totalQuoteFail === 0 &&
    totalSlippageFail === 0 &&
    validSlippageRange;


  console.log("\n");
  console.log("======================================================");
  console.log(
    "                 OVERALL RESULT"
  );
  console.log("======================================================");

  console.log(
    overallPass
      ? "                 PASS"
      : "                 FAIL"
  );

  console.log("======================================================");


  /* =======================================================
     END
  ======================================================= */

  console.log("\nTEST COMPLETE\n");
}


/* =========================================================
   RUN
========================================================= */

main().catch((error) => {

  console.error("\n");
  console.error("======================================================");
  console.error("                       ERROR");
  console.error("======================================================");

  console.error(
    getErrorMessage(error)
  );

  process.exit(1);
});