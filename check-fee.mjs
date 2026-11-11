#!/usr/bin/env node
/**
 * check-fee.mjs
 *
 * Verifies which fee tier a wallet actually gets charged on a swap, two
 * independent ways, and flags it if they disagree:
 *
 *   (A) On-chain read: PoolGuard.verifySwap(user, isSell) -> tier, then
 *       reads ecoBps / exoBps directly. This is "what the contract says
 *       it should charge."
 *
 *   (B) Empirical: quotes an amount via SSP.getAmountsOut(...) (the same
 *       call the UI uses) and algebraically solves for the effective fee
 *       from the constant-product formula. This is "what the contract
 *       actually charged," independent of what (A) claims — so if someone
 *       wired the fee lookup wrong, or PoolGuard and SSP disagree, this
 *       catches it.
 *
 * Usage:
 *   node --env-file=.env check-fee.mjs --amount 10 --direction buy
 *   node --env-file=.env check-fee.mjs --amount 10 --direction sell
 *
 * Extra env var beyond swap-cli.mjs:
 *   POOL_GUARD_ADDRESS   - the PoolGuard contract address
 *
 */

import {
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  getAddress,
  defineChain,
} from 'viem';

const args = parseArgs(process.argv.slice(2));

const RPC_URL = requireEnv('RPC_URL');
const CHAIN_ID = Number(requireEnv('CHAIN_ID'));
const SSP = getAddress(requireEnv('SSP'));
const POOL_GUARD_ADDRESS = process.env.POOL_GUARD_ADDRESS
  ? getAddress(process.env.POOL_GUARD_ADDRESS)
  : null;

// Wallet to check. Defaults to a throwaway if not provided — you don't need
// a private key for this, it's read-only. Pass --wallet to check a specific
// address (e.g. one you know has no ARDEN Pass, to confirm it lands in Exo).
const walletToCheck = args.wallet
  ? getAddress(args.wallet)
  : '0x000000000000000000000000000000000000dEaD';

const direction = args.direction ?? 'buy';
const amountInHuman = args.amount ?? '10';
const isSell = direction === 'sell';

const sspAbi = [
  { type: 'function', name: 'dagrToken', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'stablecoin', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'stablecoinDecimals', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'token0', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'token1', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  {
    type: 'function', name: 'getReserves', inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'getAmountsOut',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
  },
];

const poolGuardAbi = [
  {
    type: 'function',
    name: 'verifySwap',
    inputs: [
      { name: 'user', type: 'address', internalType: 'address' },
      { name: 'isSell', type: 'bool', internalType: 'bool' },
    ],
    outputs: [{ name: 'tier', type: 'uint8', internalType: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTarget',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isSellPaused',
    inputs: [],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'baselinePrice',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ecoBps',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'exoBps',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
];

const chain = defineChain({
  id: CHAIN_ID,
  name: `chain-${CHAIN_ID}`,
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL, { timeout: 30_000, retryCount: 2 }),
});

async function main() {
  const actualChainId = await publicClient.getChainId();
  if (actualChainId !== CHAIN_ID) {
    throw new Error(`CHAIN_ID mismatch: .env has ${CHAIN_ID}, RPC reports ${actualChainId}.`);
  }

  const [token0, token1, dagrToken, stablecoin, stablecoinDecimals, reserves] = await Promise.all([
    publicClient.readContract({ address: SSP, abi: sspAbi, functionName: 'token0' }),
    publicClient.readContract({ address: SSP, abi: sspAbi, functionName: 'token1' }),
    publicClient.readContract({ address: SSP, abi: sspAbi, functionName: 'dagrToken' }),
    publicClient.readContract({ address: SSP ,abi: sspAbi, functionName: 'stablecoin' }),
    publicClient.readContract({ address: SSP, abi: sspAbi, functionName: 'stablecoinDecimals' }),
    publicClient.readContract({ address: SSP, abi: sspAbi, functionName: 'getReserves' }),
  ]);

  const tokenIn = direction === 'buy' ? stablecoin : dagrToken;
  const tokenOut = direction === 'buy' ? dagrToken : stablecoin;
  const decimalsIn = direction === 'buy' ? Number(stablecoinDecimals) : 18;
  const decimalsOut = direction === 'buy' ? 18 : Number(stablecoinDecimals);

  const [reserve0, reserve1] = reserves;
  const reserveIn = token0.toLowerCase() === tokenIn.toLowerCase() ? reserve0 : reserve1;
  const reserveOut = token0.toLowerCase() === tokenOut.toLowerCase() ? reserve0 : reserve1;

  console.log(`Checking: ${direction} ${amountInHuman} (${tokenIn} -> ${tokenOut})`);
  console.log(`Wallet checked: ${walletToCheck}`);
  // Reserves are stored normalized to 18 decimals internally regardless of
  // each token's native decimals (confirmed empirically — USDT's raw reserve
  // only makes sense as a real-world figure when divided by 1e18, not 1e6).
  console.log(`Pool reserves (normalized 18dp): reserveIn=${formatUnits(reserveIn, 18)}  reserveOut=${formatUnits(reserveOut, 18)}\n`);

  // ---- (A) On-chain read of PoolGuard's declared tier + bps ----------
  if (POOL_GUARD_ADDRESS) {
    const code = await publicClient.getBytecode({ address: POOL_GUARD_ADDRESS });
    if (!code || code === '0x') {
      console.log(`(A) Skipped — no contract deployed at POOL_GUARD_ADDRESS (${POOL_GUARD_ADDRESS}) on this chain.`);
      console.log('    Double check the address and that RPC_URL/CHAIN_ID point at the right network.\n');
    } else {
    try {
      const tier = await publicClient.readContract({
        address: POOL_GUARD_ADDRESS, abi: poolGuardAbi, functionName: 'verifySwap',
        args: [walletToCheck, isSell],
      });
      const ecoBps = await publicClient.readContract({ address: POOL_GUARD_ADDRESS, abi: poolGuardAbi, functionName: 'ecoBps' });
      const exoBps = await publicClient.readContract({ address: POOL_GUARD_ADDRESS, abi: poolGuardAbi, functionName: 'exoBps' });
      const sellPaused = await publicClient.readContract({ address: POOL_GUARD_ADDRESS, abi: poolGuardAbi, functionName: 'isSellPaused' });

      const tierLabel = Number(tier) === 0 ? 'Eco' : 'Exo';
      const declaredBps = Number(tier) === 0 ? ecoBps : exoBps;

      console.log('(A) PoolGuard says:');
      console.log(`    Tier: ${tierLabel} (tier=${tier})`);
      console.log(`    ecoBps=${ecoBps} (${Number(ecoBps) / 100}%)  exoBps=${exoBps} (${Number(exoBps) / 100}%)`);
      console.log(`    -> declared fee for this wallet: ${Number(declaredBps) / 100}%`);
      console.log(`    Sell paused: ${sellPaused}\n`);
    } catch (err) {
      console.log('(A) PoolGuard read failed — ABI likely doesn\'t match your actual contract.');
      console.log(`    ${err.shortMessage ?? err.message}\n`);
    }
    }
  } else {
    console.log('(A) Skipped — set POOL_GUARD_ADDRESS in .env to check the declared tier/fee.\n');
  }

  // ---- (B) Empirical fee derived from getAmountsOut -------------------
  const amountIn = parseUnits(amountInHuman, decimalsIn);
  const path = [tokenIn, tokenOut];
  const amounts = await publicClient.readContract({
    address: SSP, abi: sspAbi, functionName: 'getAmountsOut',
    args: [amountIn, path, walletToCheck],
  });
  const actualOut = amounts[amounts.length - 1];

  // Solve x*y=k for netIn (amountIn after fee), given the actual quoted
  // output, then derive the fee fraction that was applied to amountIn.
  // outWithFee = reserveOut * netIn / (reserveIn + netIn)
  // => netIn = outWithFee * reserveIn / (reserveOut - outWithFee)
  if (actualOut >= reserveOut) {
    console.log('(B) Could not compute — quoted output exceeds reserveOut (check reserve/token mapping).');
  } else if (actualOut * 20n > reserveOut) {
    // Trade is more than ~5% of the pool's output-side reserve — price impact
    // dominates and the algebraic fee-isolation formula becomes numerically
    // unstable (small denominator). Flag it instead of printing nonsense.
    console.log('(B) Skipped reliable calc — this trade is a large fraction of pool depth');
    console.log(`    (actualOut=${formatUnits(actualOut, decimalsOut)} vs reserveOut≈${formatUnits(reserveOut, 18)}).`);
    console.log('    Price impact dominates at this size, which breaks the fee-isolation math.');
    console.log('    Re-run with a much smaller --amount (e.g. 0.01) to isolate the fee cleanly.\n');
  } else {
    // Normalize to 18dp — reserves are stored normalized regardless of each
    // token's native decimals, so amountIn/actualOut must match that basis
    // for the ratio to mean anything.
    const amountIn18 = to18(amountIn, decimalsIn);
    const actualOut18 = to18(actualOut, decimalsOut);

    const netIn18 = (actualOut18 * reserveIn) / (reserveOut - actualOut18);
    const feeBpsExact = ((amountIn18 - netIn18) * 10000n) / amountIn18;

    console.log('(B) Empirical (derived from getAmountsOut + reserves):');
    console.log(`    amountIn:  ${formatUnits(amountIn, decimalsIn)}`);
    console.log(`    actualOut: ${formatUnits(actualOut, decimalsOut)}`);
    console.log(`    effective fee: ~${Number(feeBpsExact) / 100}% (${feeBpsExact} bps)`);
    console.log('    (small rounding drift from integer math is normal — expect ~4990-5010 bps for a 5% fee)\n');

    if (feeBpsExact > 450n && feeBpsExact < 550n) {
      console.log('=> Looks like the Exo 5% fee IS being applied.');
    } else if (feeBpsExact > 90n && feeBpsExact < 110n) {
      console.log('=> This looks like the Eco 1% fee, not Exo 5% — this wallet may hold an ARDEN Pass, or tier detection isn\'t routing it to Exo.');
    } else {
      console.log(`=> Effective fee doesn't match either expected tier (1% Eco / 5% Exo) — worth investigating.`);
    }
  }
}

function to18(amountRaw, fromDecimals) {
  if (fromDecimals >= 18) return amountRaw;
  return amountRaw * 10n ** BigInt(18 - fromDecimals);
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

main().catch((err) => {
  console.error('Check failed:', err.shortMessage ?? err.message ?? err);
  process.exit(1);
});