import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import type { SerenityFixtures, SerenityWorkerFixtures } from '@serenity-js/playwright-test';

/**
 * Test style 03 (PB-STYLE-02): the same 12 tests as test-style-02, driven by Serenity/JS
 * Screenplay under Playwright Test (@serenity-js/playwright-test).
 *
 * The integration's default `actors` fixture gives every actor:
 *   BrowseTheWebWithPlaywright (on Playwright Test's own `page`), TakeNotes, and
 *   CallAnApi (axios on this config's baseURL).
 * baseURL is the ORIGIN only; every path is written in full (`/parabank/services/bank/...`).
 *
 * Serenity BDD JSON goes to test-style-03/target/site/serenity, deliberately NOT the main
 * lane's target/site/serenity: that folder feeds check:report and the public Pages evidence.
 *
 * Serial by design: one shared datastore, seeded once by global-setup.ts (DR-PB-06).
 */
export const PARABANK_URL = (process.env.PARABANK_URL ?? 'http://localhost:8090').replace(/\/+$/, '');
export const SERENITY_OUTPUT = join(__dirname, 'target', 'site', 'serenity');

export default defineConfig<SerenityFixtures, SerenityWorkerFixtures>({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    [
      '@serenity-js/playwright-test',
      {
        crew: [
          '@serenity-js/serenity-bdd',
          ['@serenity-js/core:ArtifactArchiver', { outputDirectory: SERENITY_OUTPUT }]
        ]
      }
    ]
  ],
  outputDir: 'test-results',
  use: {
    baseURL: PARABANK_URL,
    defaultActorName: 'John',
    crew: [['@serenity-js/web:Photographer', { strategy: 'TakePhotosOfFailures' }]],
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
