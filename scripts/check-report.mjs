// PB-P3 gate: the Serenity living-documentation report must CONTAIN the executed
// scenarios, not merely exist (portfolio lesson: magento's report was an empty shell at
// go-live). Checks:
//   1. Every scenario name in features/ui/**/*.feature appears in the Serenity BDD JSON
//      artefacts produced by the ui run (works locally and in CI).
//   2. The generated HTML report (needs Java: `npm run report`) exists and is non-trivial.
//      Enforced in CI; skipped locally when Java is unavailable (stated explicitly).
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const SITE = 'target/site/serenity';
const failures = [];

// -- collect expected scenario names from the ui feature files
const scenarioNames = [];
function* featureFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* featureFiles(path);
    else if (entry.name.endsWith('.feature')) yield path;
  }
}
for (const file of featureFiles('features/ui')) {
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*Scenario(?: Outline)?:\s*(.+)$/.exec(line);
    if (match) scenarioNames.push(match[1].trim());
  }
}
if (scenarioNames.length === 0) failures.push('no ui scenarios found under features/ui');

// -- 1. every scenario name must appear in the Serenity JSON artefacts
let jsonBlob = '';
if (existsSync(SITE)) {
  for (const name of readdirSync(SITE)) {
    if (name.endsWith('.json')) jsonBlob += readFileSync(join(SITE, name), 'utf8');
  }
}
if (jsonBlob === '') {
  failures.push(`${SITE} contains no Serenity JSON artefacts — did the ui lane run?`);
} else {
  for (const name of scenarioNames) {
    if (!jsonBlob.includes(JSON.stringify(name).slice(1, -1))) {
      failures.push(`scenario missing from Serenity artefacts: '${name}'`);
    }
  }
}

// -- 2. generated HTML report (Java-dependent)
function javaAvailable() {
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
    failures.push(`${indexHtml} missing — run \`npm run report\` (requires Java)`);
  } else if (statSync(indexHtml).size < 1024) {
    failures.push(`${indexHtml} is implausibly small (${statSync(indexHtml).size} bytes)`);
  }
} else {
  console.log('NOTE: Java not available locally — HTML report generation/check runs in CI.');
}

if (failures.length > 0) {
  console.error('Report content check FAILED:\n' + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log(
  `Report content check OK: all ${scenarioNames.length} ui scenarios present in Serenity artefacts` +
    (existsSync(indexHtml) ? '; HTML report present.' : ' (JSON evidence; HTML checked in CI).')
);
