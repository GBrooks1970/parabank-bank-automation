// PB-P3 gate: prove the @smoke subset is store-safe (side-effect-free) — run it against
// seeded state and assert the seed state is unchanged WITHOUT an intervening reset
// (design doc §5.9; magento C-01 lesson).
import { execSync } from 'node:child_process';

const BASE_URL = process.env.PARABANK_URL ?? 'http://localhost:8090';

async function seed() {
  const res = await fetch(`${BASE_URL}/parabank/services/bank/initializeDB`, { method: 'POST' });
  if (res.status !== 204) throw new Error(`initializeDB → HTTP ${res.status}`);
}

async function snapshot() {
  // Seeded customer's accounts (ids + balances + types) are the state smoke could touch.
  const res = await fetch(`${BASE_URL}/parabank/services/bank/customers/12212/accounts`, {
    headers: { Accept: 'application/json' }
  });
  if (res.status !== 200) throw new Error(`accounts snapshot → HTTP ${res.status}`);
  return await res.text();
}

await seed();
const before = await snapshot();

for (const profile of ['api', 'ui']) {
  console.log(`Running @smoke (${profile} profile) ...`);
  execSync(`npx cucumber-js --profile ${profile} --tags "@smoke"`, { stdio: 'inherit' });
}

const after = await snapshot();
if (before !== after) {
  console.error('Smoke-safety FAILED: seed state changed after running @smoke without a reset.');
  console.error(`before: ${before}`);
  console.error(`after:  ${after}`);
  process.exit(1);
}
console.log('Smoke-safety OK: @smoke ran green and left the seed state byte-identical.');
