import { request } from '@playwright/test';
import { IS_LOCAL_TARGET, PARABANK_URL } from './playwright.config';

/**
 * Boot -> seed -> use (DR-PB-06): a fresh container is not assumed seeded, so the suite
 * resets the datastore to the built-in seed once before any test runs. Fails fast with a
 * clear message when the SUT is down, instead of letting every test time out.
 *
 * Only the local SUT is ever reset (DR-PB-13). Any other host, such as the live demo, is used as it
 * is. PARABANK_SKIP_RESET=1 skips the reset of the local SUT too.
 */
export default async function globalSetup(): Promise<void> {
  if (!IS_LOCAL_TARGET) {
    console.log(`ParaBank target is not the local SUT (${PARABANK_URL}): no reset; tests move real money there.`);
    return;
  }
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
