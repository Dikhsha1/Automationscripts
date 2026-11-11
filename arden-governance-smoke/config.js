import 'dotenv/config';

export const config = {
  RPC: process.env.RPC_URL,
  PRIVATE_KEY: process.env.PRIVATE_KEY,

  SSP: process.env.SSP_ADDRESS,
  USDT: process.env.USDT_ADDRESS,
  DAGR: process.env.DAGR,

  WALLET: process.env.Wallet_address,

  POOL_GUARD: process.env.POOL_GUARD
};