/**
 * Open liquidity with USDT only (same as app: Earn → Add liquidity).
 *
 * 1. npm install viem   (or run from arden-fe-v2 folder — viem already there)
 * 2. Fill CONFIG below
 * 3. node open-liquidity.mjs
 */
 
import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
 
// ——— FILL THESE IN ———
const CONFIG = {
  rpcUrl: 'https://chain.sotto.li',           // from VITE_DEV_RPC_URL
  privateKey: '0xbe2b0c6b1fd42ff83da7e6634cb899a50cabae903a3bd4bfd1888053be01f003',                        // test wallet key — never commit
  liquidityGuard: '0xD52A7aFdDbBBF580D61AF0Af7a47FBa128475154',                    // VITE_LIQUIDITY_GUARD
  usdt: '0x103df201ed80eE00FfE2f694C49926c7F0d42d72',                              // VITE_USDT_ADDRESS
  passId: '15971368103924485222',                             // your NFT / Pass id
  usdtAmount: '25',                          // e.g. 100 USDT
  chainId: 1337,                             // match UAT (ask tech lead)
};
 
const erc20Abi = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
];
 
const liquidityGuardAbi = [
  {
    type: 'function',
    name: 'openPositionUSDT',
    inputs: [
      { name: 'nftId', type: 'uint256' },
      { name: 'usdtAmount', type: 'uint256' },
      { name: 'minDagrOut', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
];
 
const account = privateKeyToAccount(CONFIG.privateKey);
const transport = http(CONFIG.rpcUrl);
const chain = {
  id: CONFIG.chainId,
  name: 'test',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
};
 
const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ chain, transport, account });
 
const lg = CONFIG.liquidityGuard;
const usdt = CONFIG.usdt;
const amount = parseUnits(CONFIG.usdtAmount, 6); // USDT = 6 decimals
const nftId = BigInt(CONFIG.passId);
const minDagrOut = 0n; // use 0 on testnet only; app uses slippage on prod
const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
 
console.log('Wallet:', account.address);
console.log('Pass id:', CONFIG.passId, '| USDT:', CONFIG.usdtAmount);
 
// Step 1: allow LiquidityGuard to take USDT
let allowance = await publicClient.readContract({
  address: usdt,
  abi: erc20Abi,
  functionName: 'allowance',
  args: [account.address, lg],
});
 
if (allowance > 0n) {
  let tx = await walletClient.writeContract({
    address: usdt,
    abi: erc20Abi,
    functionName: 'approve',
    args: [lg, 0n],
  });
  await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log('Reset approve OK');
}
 
let approveTx = await walletClient.writeContract({
  address: usdt,
  abi: erc20Abi,
  functionName: 'approve',
  args: [lg, amount],
});
await publicClient.waitForTransactionReceipt({ hash: approveTx });
console.log('Approve OK:', approveTx);
 
// Step 2: open position
let openTx = await walletClient.writeContract({
  address: lg,
  abi: liquidityGuardAbi,
  functionName: 'openPositionUSDT',
  args: [nftId, amount, minDagrOut, deadline],
});
let receipt = await publicClient.waitForTransactionReceipt({ hash: openTx });
console.log('Open OK:', openTx, '| status:', receipt.status);