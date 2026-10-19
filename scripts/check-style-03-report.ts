// PB-STYLE-02: the test-style-03 Serenity report is content-verified, never trusted to have
// merely been generated (magento empty-shell lesson). Every expected test must appear, by its
// exact Serenity scenario name, in valid JSON with a SUCCESS result; when Java (or CI) makes
// it mandatory, the HTML report must be present and non-trivial.
//
// EXPECTED_SCENARIOS is written out here on purpose, not imported from the specs: renaming,
// dropping or adding a test must make this check fail until the list is updated with it.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'test-style-03/target/site/serenity';

// Serenity names a Playwright test by its describe path below the top-level describe
// (which becomes the feature), followed by the test title.
const EXPECTED_SCENARIOS = [
  'transfers $50 from Checking to Savings and the UI confirms it',
  'Direct API transfer requests handles a successful transfer request',
  'Direct API transfer requests rejects invalid transfer requests rejects an unknown source account',
  'Direct API transfer requests rejects invalid transfer requests rejects an unknown destination account',
  'Direct API transfer requests rejects invalid transfer requests rejects a missing source account',
  'Direct API transfer requests rejects invalid transfer requests rejects a non-numeric source account',
  'Direct API transfer requests rejects invalid transfer requests rejects a non-numeric amount',
  'Direct API transfer requests rejects invalid transfer requests rejects a missing amount',
  'Direct API transfer requests observed acceptance (assert-as-observed) accepts a negative amount, moving money in reverse',
  'Direct API transfer requests observed acceptance (assert-as-observed) accepts a transfer to the same account',
  'Direct API transfer requests observed acceptance (assert-as-observed) accepts an overdraft beyond the available balance',
  'Transaction history validation contains a debit entry for the source account after a transfer'
];

const failures: string[] = [];
const results = new Map<string, string>();

const artifactFiles = existsSync(SITE) ? readdirSync(SITE).filter((name) => name.endsWith('.json')) : [];
if (artifactFiles.length === 0) failures.push(`${SITE} contains no Serenity JSON artefacts — did test:style-03 run?`);

for (const file of artifactFiles) {
  try {
    const scenario = JSON.parse(readFileSync(join(SITE, file), 'utf8')) as { name?: unknown; result?: unknown };
    if (typeof scenario.name === 'string') results.set(scenario.name, String(scenario.result));
  } catch {
    failures.push(`invalid Serenity JSON artefact: ${file}`);
  }
}

for (const name of EXPECTED_SCENARIOS) {
  const result = results.get(name);
  if (result === undefined) failures.push(`scenario missing from Serenity artefacts: '${name}'`);
  else if (result !== 'SUCCESS') failures.push(`scenario '${name}' is ${result}, not SUCCESS`);
}
for (const name of results.keys()) {
  if (!EXPECTED_SCENARIOS.includes(name)) failures.push(`unexpected scenario in Serenity artefacts: '${name}'`);
}

function javaAvailable(): boolean {
  try {
    execSync('java -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const indexHtml = join(SITE, 'index.html');
if (javaAvailable() || process.env.CI) {
  if (!existsSync(indexHtml)) {
    failures.push(`${indexHtml} missing — run \`npm run report:style-03\` (requires Java)`);
  } else if (statSync(indexHtml).size < 1024) {
    failures.push(`${indexHtml} is implausibly small (${statSync(indexHtml).size} bytes)`);
  }
} else {
  console.log('NOTE: Java not available locally — style-03 HTML report generation/check runs in CI.');
}

if (failures.length > 0) {
  console.error(`Style-03 report content check FAILED:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(
    `Style-03 report content check OK: all ${EXPECTED_SCENARIOS.length} scenarios present and SUCCESS` +
      (existsSync(indexHtml) ? '; HTML report present.' : ' (JSON evidence; HTML checked in CI).')
  );
}
