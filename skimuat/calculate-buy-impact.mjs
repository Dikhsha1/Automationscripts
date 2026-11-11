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
  "0x0f43cde9eb5017cd28b2bf4fc508698ff8bd6ad3";

const ARDE =
  "0xdcf82998be1c95222816538c2de514534804206b";

const USDT =
  "0x103df201ed80ee00ffe2f694c49926c7f0d42d72";

const USER =
  process.env.USER_ADDRESS ||
  "0xfd76a874f7bbf0f1f78ae82c93f65c16ad70b944";


/* =========================================================
   DECIMALS
========================================================= */

const USDT_DECIMALS = 6;
const ARDE_DECIMALS = 18;


/* =========================================================
   UI SETTINGS
========================================================= */

const SLIPPAGE_BPS = 250n; // 2.5%
const BPS = 10000n;


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


/* =========================================================
   MAIN
========================================================= */

async function main() {

  console.log("\n");
  console.log("======================================================");
  console.log("          ARDEN UAT - ARDE BUY QUOTE QA");
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
     BUY QUOTES
  ======================================================= */

  console.log("\n");
  console.log("======================================================");
  console.log("                    BUY QUOTES");
  console.log("======================================================");

  console.log(
    "Slippage : 2.50%"
  );

  console.log(
    "Fee Tier : Eco"
  );


  for (const usdtAmount of TEST_AMOUNTS) {

    console.log("\n------------------------------------------------------");

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
         UI RATE
         
         1 USDT = X ARDE
      --------------------------------------------------- */

      const rateArdePerUsdt =
        ardeOut / usdtAmount;


      /* ---------------------------------------------------
         INVERSE RATE
         
         1 ARDE = X USDT
      --------------------------------------------------- */

      const rateUsdtPerArde =
        usdtAmount / ardeOut;


      /* ---------------------------------------------------
         SLIPPAGE
         
         minimumReceived =
         quotedOutput × 97.5%
      --------------------------------------------------- */

      const minimumReceivedRaw =
        (
          ardeOutRaw *
          (BPS - SLIPPAGE_BPS)
        ) / BPS;


      const minimumReceived =
        formatUnits(
          minimumReceivedRaw,
          ARDE_DECIMALS
        );


      /* ---------------------------------------------------
         DISPLAY
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
        `MINIMUM RECEIVED : ${minimumReceived} ARDE`
      );

      console.log(
        `SLIPPAGE         : 2.50%`
      );

      console.log(
        `FEE TIER         : Eco`
      );


      /* ===================================================
         PRICE IMPACT
         
         IMPORTANT:
         
         This is only a reference calculation.
         
         It should NOT automatically be called the UI
         price impact until we confirm the UI formula.
      =================================================== */

      if (contractPrice > 0) {

        const referenceImpact =
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
         BASIC QA
      =================================================== */

      const quotePass =
        ardeOutRaw > 0n;

      const minimumReceivedPass =
        minimumReceivedRaw <= ardeOutRaw;

      console.log("\nQA CHECK:");

      console.log(
        "Quote            :",
        quotePass ? "PASS" : "FAIL"
      );

      console.log(
        "Minimum Received :",
        minimumReceivedPass
          ? "PASS"
          : "FAIL"
      );


    } catch (error) {

      console.log(
        `QUOTE FAILED FOR ${usdtAmount} USDT`
      );

      console.log(
        getErrorMessage(error)
      );
    }
  }


  /* =======================================================
     END
  ======================================================= */

  console.log("\n");
  console.log("======================================================");
  console.log("                    TEST COMPLETE");
  console.log("======================================================");
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