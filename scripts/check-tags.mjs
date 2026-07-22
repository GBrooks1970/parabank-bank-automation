// Tag-strategy lint (docs/naming-conventions.md): @smoke scenarios are store-safe and
// must NEVER also be @mutates — including tags inherited from the Feature line.
// Also pins the smoke count: the design doc (§5.9) fixes it, so a drift fails the gate.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Design doc §5.9: 3 total; smoke ① is the UI scenario, arriving with PB-P3.
const EXPECTED_SMOKE_COUNTS = { 'features/api': 2, 'features/ui': 1 };

let failures = [];
let smokeByDir = {};

function* featureFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // lane folder may not exist yet (features/ui arrives in PB-P3)
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* featureFiles(path);
    else if (entry.name.endsWith('.feature')) yield path;
  }
}

for (const dir of Object.keys(EXPECTED_SMOKE_COUNTS)) {
  smokeByDir[dir] = 0;
  for (const file of featureFiles(dir)) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    let featureTags = [];
    let pendingTags = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('@')) {
        pendingTags.push(...line.split(/\s+/).filter((t) => t.startsWith('@')));
      } else if (line.startsWith('Feature:')) {
        featureTags = pendingTags;
        pendingTags = [];
      } else if (line.startsWith('Scenario')) {
        const tags = [...featureTags, ...pendingTags];
        pendingTags = [];
        if (tags.includes('@smoke')) {
          smokeByDir[dir]++;
          if (tags.includes('@mutates')) {
            failures.push(`${file}:${i + 1} — scenario is tagged BOTH @smoke and @mutates`);
          }
        }
      } else if (line !== '' && !line.startsWith('#')) {
        pendingTags = [];
      }
    }
  }
}

for (const [dir, expected] of Object.entries(EXPECTED_SMOKE_COUNTS)) {
  const actual = smokeByDir[dir] ?? 0;
  // features/ui does not exist until PB-P3; only enforce once the lane folder has features.
  if (actual === 0 && expected > 0 && dir === 'features/ui') continue;
  if (actual !== expected) {
    failures.push(
      `${dir}: ${actual} @smoke scenario(s), design doc §5.9 fixes ${expected} — changing the smoke set is a design-doc amendment`
    );
  }
}

if (failures.length > 0) {
  console.error('Tag lint FAILED:\n' + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log('Tag lint OK: @smoke/@mutates disjoint; smoke counts match the design doc.');
