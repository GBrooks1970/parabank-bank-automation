// Tag-strategy lint (docs/naming-conventions.md): @smoke scenarios are store-safe and
// must NEVER also be @mutates — including tags inherited from the Feature line.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateTagPolicy, FeatureDocument } from '../src/quality/cucumber-tags';

const EXPECTED_SMOKE_COUNTS = { 'features/api': 2, 'features/ui': 1 } as const;

function* featureFiles(dir: string): Generator<string> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* featureFiles(path);
    else if (entry.name.endsWith('.feature')) yield path;
  }
}

const documents: FeatureDocument[] = [];
for (const lane of Object.keys(EXPECTED_SMOKE_COUNTS)) {
  for (const file of featureFiles(lane)) {
    documents.push({ file, lane, source: readFileSync(file, 'utf8') });
  }
}

const { failures } = evaluateTagPolicy(documents, EXPECTED_SMOKE_COUNTS);
if (failures.length > 0) {
  console.error(`Tag lint FAILED:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('Tag lint OK: @smoke/@mutates disjoint; smoke counts match the design doc.');
}
