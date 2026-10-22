import { defineConfig, devices } from '@playwright/test';

/**
 * Test style 02 (PB-STYLE-01): the sdet-technical-task fund-transfer brief in plain
 * Playwright Test style, run against this project's pinned Docker SUT.
 *
 * baseURL is the ORIGIN only. Every request path is written in full
 * (`/parabank/services/bank/...`), exactly as the brief does, so the
 * "no trailing slash drops /parabank" resolution pitfall cannot occur.
 *
 * Serial by design: one shared datastore, seeded once by global-setup.ts (DR-PB-06).
 */
export const PARABANK_URL = (process.env.PARABANK_URL ?? 'http://localhost:8090').replace(/\/+$/, '');

/**
 * DR-PB-13: only the local SUT (a loopback host) is ever reset. Any other host, such as the live
 * demo when directed with PARABANK_URL=https://parabank.parasoft.com, is used as it is: no reset,
 * and the overdraft test is skipped there.
 */
export const IS_LOCAL_TARGET = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(new URL(PARABANK_URL).hostname.toLowerCase());

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: PARABANK_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
