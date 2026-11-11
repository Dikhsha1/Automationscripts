import { test as base, expect } from '@playwright/test';
import { metaMaskFixtures } from '@synthetixio/synpress-metamask/playwright';
import walletSetup from '../metamask-wallet-setup.mjs';

const test = base.extend(
  metaMaskFixtures(walletSetup)
);

test('Sotto QA - MetaMask connection and UI check', async ({
  page,
  metamask
}) => {
  console.log('Opening Sotto...');

  await page.goto('https://qa.sotto.li', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  console.log('Sotto loaded.');

  console.log('MetaMask account:');
  console.log(await metamask.getAccountAddress());

  // Find the Connect button without XPath.
  const connectButton = page.getByRole('button', {
    name: /^Connect$/i
  });

  await expect(connectButton).toBeVisible({
    timeout: 30000
  });

  console.log('Connect button found.');

  await connectButton.click();

  console.log('Connect clicked.');

  // MetaMask handles the connection request.
  await metamask.connectToDapp();

  console.log('MetaMask connection approved.');

  // Give the website time to update its wallet state.
  await page.waitForTimeout(3000);

  console.log('Current URL:', page.url());

  // Print visible page text for initial verification.
  console.log(
    'Page title:',
    await page.title()
  );

  console.log(
    'Connected account:',
    await metamask.getAccountAddress()
  );

  // Basic verification that Connect is no longer the active state.
  const connectStillVisible = await page
    .getByRole('button', { name: /^Connect$/i })
    .isVisible()
    .catch(() => false);

  if (connectStillVisible) {
    throw new Error(
      'Wallet connection may have failed: Connect button is still visible.'
    );
  }

  console.log('Wallet connection verified.');

  // Run your existing ARDEN UI checker.
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const checkerPath = path.join(__dirname, 'arden-ui-check.js');

  if (!fs.existsSync(checkerPath)) {
    throw new Error(`arden-ui-check.js not found: ${checkerPath}`);
  }

  const checkScript = fs.readFileSync(checkerPath, 'utf8');

  const result = await page.evaluate(checkScript);

  console.log('\n==============================================');
  console.log('          ARDEN UI CHECK RESULT');
  console.log('==============================================');
  console.log(`Errors   : ${result.errors}`);
  console.log(`Warnings : ${result.warnings}`);

  for (const item of result.report) {
    console.log(
      `[${item.severity}] ${item.rule} x${item.count}: ${item.samples}`
    );
  }

  if (result.errors > 0) {
    throw new Error(
      `UI check failed with ${result.errors} error(s).`
    );
  }

  console.log('\nUI CHECK PASSED.');
});
