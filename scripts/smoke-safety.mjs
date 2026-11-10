// PB-P3 gate, hardened by TRIAGE-02: prove the @smoke subset is store-safe (side-effect-free)
// (design doc §5.9; magento C-01 lesson). This runner owns the seed state: it seeds once, then runs
// the api and ui @smoke profiles with PARABANK_SEED_OWNER=smoke-safety, so neither child process
// re-seeds (any reset hook that would fire fails instead). After EACH profile, before the next can
// run, it compares the measured state with the seeded snapshot and fails naming the lane.
// Measured scope: seeded customer 12212's accounts and each of those accounts' transactions.
// Not measured: admin parameters, other customers, and customers registered during the run.
import { execSync } from 'node:child_process';
import { assertLocalSut } from '../src/quality/target-guard.ts';
import { SEED_OWNER_ENV, SMOKE_SAFETY_OWNER } from '../src/quality/seed-ownership.ts';
import { diffSnapshots } from '../src/quality/smoke-snapshot.ts';
import { withRequestDeadline } from '../src/api/request-deadline.ts';

const BASE_URL = process.env.PARABANK_URL ?? 'http://localhost:8090';
// DR-PB-13: this check seeds (initializeDB) before anything else; refuse a remote host first.
assertLocalSut(BASE_URL, 'The smoke-safety check');

const SEEDED_CUSTOMER = 12212;
const SERVICES = `${BASE_URL}/parabank/services/bank`;

async function seed() {
  const res = await withRequestDeadline(
    { method: 'POST' },
    { operation: 'smoke-safety initializeDB', safePath: '/initializeDB' },
    (signal) => fetch(`${SERVICES}/initializeDB`, { method: 'POST', signal })
  );
  if (res.status !== 204) throw new Error(`initializeDB → HTTP ${res.status}`);
}

async function readJson(path, what) {
  const res = await withRequestDeadline(
    { headers: { Accept: 'application/json' } },
    { operation: `smoke-safety ${what}`, safePath: path },
    (signal) => fetch(`${SERVICES}${path}`, { headers: { Accept: 'application/json' }, signal })
  );
  if (res.status !== 200) throw new Error(`${what} snapshot → HTTP ${res.status}`);
  return await res.json();
}

async function snapshot() {
  // The seeded customer's accounts, then each account's transactions in ascending id order.
  const accounts = await readJson(`/customers/${SEEDED_CUSTOMER}/accounts`, 'accounts');
  const transactions = {};
  for (const id of accounts.map((account) => account.id).sort((a, b) => a - b)) {
    transactions[String(id)] = await readJson(`/accounts/${id}/transactions`, `account ${id} transactions`);
  }
  return { accounts, transactions };
}

await seed();
const before = await snapshot();

for (const profile of ['api', 'ui']) {
  console.log(`Running @smoke (${profile} profile) with the seed state owned by this check ...`);
  execSync(`npx cucumber-js --profile ${profile} --tags "@smoke"`, {
    stdio: 'inherit',
    env: { ...process.env, [SEED_OWNER_ENV]: SMOKE_SAFETY_OWNER }
  });
  const differences = diffSnapshots(before, await snapshot());
  if (differences.length > 0) {
    console.error(`Smoke-safety FAILED in the ${profile} lane: @smoke changed the seed state (no reset ran in between).`);
    for (const difference of differences) console.error(`  - ${difference}`);
    process.exit(1);
  }
}

const transactionCount = Object.values(before.transactions).reduce((sum, list) => sum + list.length, 0);
console.log(
  `Smoke-safety OK: api and ui @smoke left customer ${SEEDED_CUSTOMER}'s ${before.accounts.length} accounts and their ` +
    `${transactionCount} transactions unchanged, compared after each lane with no reset in between.`
);
