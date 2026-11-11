import {
  createPublicClient,
  http,
  formatUnits,
  parseAbi
} from "viem";

import "dotenv/config";

const RPC_URL = process.env.RPC_URL || "https://chain.sotto.li";
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

const STAKING_ENGINE =
  process.env.STAKING_ENGINE ||
  "0x3d38B4e78732CfC946bEeCf9B44aCBdea0865Fc8";

const NFT_ID = BigInt(
  process.env.NFT_ID || "10206862306487530304"
);

const publicClient = createPublicClient({
  chain: {
    id: CHAIN_ID,
    name: "Sotto",
    nativeCurrency: {
      name: "Native",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: {
      default: { http: [RPC_URL] }
    }
  },
  transport: http(RPC_URL)
});

const stakingAbi = parseAbi([
  "function stakedByNft(uint256 nftId) view returns (uint256)",
  "function positionCount(uint256 nftId) view returns (uint256)",
  "function positionsOf(uint256 nftId) view returns ((uint256 principal,uint256 accruedBalance,uint64 stakeTimestamp,uint16 lastUpdateDay,uint8 lastLoyaltyIndex,bool active,uint256 claimed)[])",
  "function previewAccrued(uint256 nftId,uint256 posIndex) view returns (uint256)",
  "function previewBalance(uint256 nftId,uint256 posIndex) view returns (uint256)",
  "function previewTotalAccrued(uint256 nftId) view returns (uint256)",
  "function claimedByNft(uint256 nftId) view returns (uint256)",
  "function totalStakedProtocol() view returns (uint256)",
  "function totalClaimedProtocol() view returns (uint256)"
]);

function arde(value) {
  return formatUnits(value, 18);
}

async function main() {

  console.log(`
======================================
 ARDEN REMAINING POSITION QA CHECK
======================================
RPC           : ${RPC_URL}
Chain ID      : ${CHAIN_ID}
StakingEngine : ${STAKING_ENGINE}
NFT ID        : ${NFT_ID}
`);

  // -----------------------------------------
  // 1. NFT TOTAL STAKED
  // -----------------------------------------

  const nftStaked = await publicClient.readContract({
    address: STAKING_ENGINE,
    abi: stakingAbi,
    functionName: "stakedByNft",
    args: [NFT_ID]
  });

  console.log("==============================");
  console.log("NFT TOTAL");
  console.log("==============================");

  console.log("Current NFT Staked :", arde(nftStaked), "ARDE");


  // -----------------------------------------
  // 2. POSITION COUNT
  // -----------------------------------------

  const positionCount = await publicClient.readContract({
    address: STAKING_ENGINE,
    abi: stakingAbi,
    functionName: "positionCount",
    args: [NFT_ID]
  });

  console.log("Positions         :", positionCount.toString());


  // -----------------------------------------
  // 3. GET ALL POSITIONS
  // -----------------------------------------

  const positions = await publicClient.readContract({
    address: STAKING_ENGINE,
    abi: stakingAbi,
    functionName: "positionsOf",
    args: [NFT_ID]
  });


  console.log(`
==============================
POSITIONS
==============================`);


  let totalPrincipal = 0n;
  let totalClaimed = 0n;
  let totalAccrued = 0n;
  let totalRemaining = 0n;


  for (let i = 0; i < positions.length; i++) {

    const p = positions[i];

    const previewAccrued =
      await publicClient.readContract({
        address: STAKING_ENGINE,
        abi: stakingAbi,
        functionName: "previewAccrued",
        args: [NFT_ID, BigInt(i)]
      });

    const previewBalance =
      await publicClient.readContract({
        address: STAKING_ENGINE,
        abi: stakingAbi,
        functionName: "previewBalance",
        args: [NFT_ID, BigInt(i)]
      });


    console.log(`
--------- Position ${i} ---------`);

    console.log(
      "Principal        :",
      arde(p.principal),
      "ARDE"
    );

    console.log(
      "Stored Accrued   :",
      arde(p.accruedBalance),
      "ARDE"
    );

    console.log(
      "Preview Accrued  :",
      arde(previewAccrued),
      "ARDE"
    );

    console.log(
      "Preview Balance  :",
      arde(previewBalance),
      "ARDE"
    );

    console.log(
      "Claimed          :",
      arde(p.claimed),
      "ARDE"
    );

    console.log(
      "Active           :",
      p.active
    );

    console.log(
      "Stake Timestamp  :",
      new Date(Number(p.stakeTimestamp) * 1000).toISOString()
    );

    console.log(
      "Last Update Day  :",
      p.lastUpdateDay.toString()
    );

    console.log(
      "Loyalty Index    :",
      p.lastLoyaltyIndex.toString()
    );


    // -----------------------------------------
    // Calculate remaining principal
    // -----------------------------------------

    if (p.active) {

      totalRemaining += p.principal;

      console.log(
        "Remaining Principal :",
        arde(p.principal),
        "ARDE"
      );

    } else {

      console.log(
        "Remaining Principal : 0 ARDE (CLOSED)"
      );
    }


    totalPrincipal += p.principal;
    totalClaimed += p.claimed;
    totalAccrued += previewAccrued;
  }


  // -----------------------------------------
  // 4. NFT PREVIEW TOTAL
  // -----------------------------------------

  const totalPreviewAccrued =
    await publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingAbi,
      functionName: "previewTotalAccrued",
      args: [NFT_ID]
    });


  const nftClaimed =
    await publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingAbi,
      functionName: "claimedByNft",
      args: [NFT_ID]
    });


  // -----------------------------------------
  // 5. PROTOCOL TOTALS
  // -----------------------------------------

  const protocolStaked =
    await publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingAbi,
      functionName: "totalStakedProtocol"
    });

  const protocolClaimed =
    await publicClient.readContract({
      address: STAKING_ENGINE,
      abi: stakingAbi,
      functionName: "totalClaimedProtocol"
    });


  // -----------------------------------------
  // 6. FINAL QA SUMMARY
  // -----------------------------------------

  console.log(`
======================================
 QA SUMMARY
======================================`);

  console.log(
    "Total Position Principal :",
    arde(totalPrincipal),
    "ARDE"
  );

  console.log(
    "Current Remaining Stake  :",
    arde(totalRemaining),
    "ARDE"
  );

  console.log(
    "Total Claimed            :",
    arde(nftClaimed),
    "ARDE"
  );

  console.log(
    "Currently Accrued        :",
    arde(totalPreviewAccrued),
    "ARDE"
  );

  console.log(
    "Current Claimable        :",
    arde(totalPreviewAccrued),
    "ARDE"
  );

  console.log(`
--------------------------------------
PROTOCOL
--------------------------------------`);

  console.log(
    "Protocol Staked          :",
    arde(protocolStaked),
    "ARDE"
  );

  console.log(
    "Protocol Claimed         :",
    arde(protocolClaimed),
    "ARDE"
  );


  // -----------------------------------------
  // 7. QA VALIDATION
  // -----------------------------------------

  console.log(`
======================================
 VALIDATION
======================================`);

  if (nftStaked === totalRemaining) {

    console.log(
      "✅ NFT staked amount matches active positions"
    );

  } else {

    console.log(
      "⚠️ NFT staked amount DOES NOT match active positions"
    );

    console.log(
      "Contract:",
      arde(nftStaked)
    );

    console.log(
      "Calculated:",
      arde(totalRemaining)
    );
  }


  console.log(`
======================================
 DONE
======================================
`);
}

main().catch((error) => {

  console.error(`
❌ ERROR
`);

  console.error(error.shortMessage || error.message);

  process.exit(1);
});