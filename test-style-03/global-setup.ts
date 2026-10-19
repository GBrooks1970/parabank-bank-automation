import { request } from '@playwright/test';
import { PARABANK_URL } from './playwright.config';

/**
 * Boot -> seed -> use (DR-PB-06): a fresh container is not assumed seeded, so the suite
 * resets the datastore to the built-in seed once before any test runs. Fails fast with a
 * clear message when the SUT is down, instead of letting every test time out.
 *
 * Set PARABANK_SKIP_RESET=1 when pointing PARABANK_URL at a shared environment you must
 * not reset (for example the public demo, used only for best-effort rehearsal).
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.PARABANK_SKIP_RESET === '1') return;

  const context = await request.newContext({ baseURL: PARABANK_URL });
  try {
    const response = await context.post('/parabank/services/bank/initializeDB', { timeout: 15_000 });
    if (response.status() !== 204) {
      throw new Error(`initializeDB returned HTTP ${response.status()} (expected 204)`);
    }
  } catch (error) {
    throw new Error(
      `ParaBank seed failed at ${PARABANK_URL}: ${(error as Error).message}. ` +
        'Is the SUT up? See README Quickstart (build-sut.ps1, docker compose up -d, gate.ps1).'
    );
  } finally {
    await context.dispose();
  }
}
