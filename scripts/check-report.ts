// PB-P3 gate: every UI scenario must appear in valid Serenity JSON, and the Java-backed
// HTML report must be present and non-trivial when Java (or CI) makes it mandatory.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inspectSerenityCoverage } from '../src/quality/report-integrity';

const SITE = 'target/site/serenity';
const failures: string[] = [];

function* featureFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* featureFiles(path);
    else if (entry.name.endsWith('.feature')) yield path;
  }
}

const featureSources = [...featureFiles('features/ui')].map((file) => readFileSync(file, 'utf8'));
const artifactFiles = existsSync(SITE)
  ? readdirSync(SITE).filter((name) => name.endsWith('.json'))
  : [];
const coverage = inspectSerenityCoverage(
  featureSources,
  artifactFiles.map((name) => readFileSync(join(SITE, name), 'utf8'))
);

if (coverage.scenarioNames.length === 0) failures.push('no ui scenarios found under features/ui');
if (artifactFiles.length === 0) {
  failures.push(`${SITE} contains no Serenity JSON artefacts — did the ui lane run?`);
}
for (const index of coverage.invalidArtifactIndexes) {
  failures.push(`invalid Serenity JSON artefact: ${artifactFiles[index]}`);
}
for (const name of coverage.missingScenarioNames) {
  failures.push(`scenario missing from Serenity artefacts: '${name}'`);
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
    failures.push(`${indexHtml} missing — run \`npm run report\` (requires Java)`);
  } else if (statSync(indexHtml).size < 1024) {
    failures.push(`${indexHtml} is implausibly small (${statSync(indexHtml).size} bytes)`);
  }
} else {
  console.log('NOTE: Java not available locally — HTML report generation/check runs in CI.');
}

if (failures.length > 0) {
  console.error(`Report content check FAILED:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(
    `Report content check OK: all ${coverage.scenarioNames.length} ui scenarios present in Serenity artefacts` +
      (existsSync(indexHtml) ? '; HTML report present.' : ' (JSON evidence; HTML checked in CI).')
  );
}
