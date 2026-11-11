
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  timeout: 120000,
  reporter: 'list',
  use: {
    headless: false
  }
});
