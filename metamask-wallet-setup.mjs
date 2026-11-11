import { defineWalletSetup } from '@synthetixio/synpress-cache';
import { MetaMask } from '@synthetixio/synpress-metamask/playwright';

const password = process.env.METAMASK_PASSWORD;
const seedPhrase = process.env.METAMASK_SEED;

if (!password) {
  throw new Error('METAMASK_PASSWORD is not set.');
}

if (!seedPhrase) {
  throw new Error('METAMASK_SEED is not set.');
}

export default defineWalletSetup(password, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, password);

  await metamask.importWallet(seedPhrase);
});