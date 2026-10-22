import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import test from 'node:test';

/**
 * DR-PB-13 architecture test: data-destroying ParaBank operations may appear only in reviewed
 * files, and each of those files must still carry its guard. A future change that adds a new
 * reset/wipe/admin call site, or removes a guard, turns this test (and so CI) red until the
 * change is reviewed and this list is updated with it.
 */
const DESTRUCTIVE = /\b(initializeDB|cleanDB|setParameter)\b/;

const SCANNED_ROOTS = ['src', 'features', 'scripts', 'perf/src', 'test-style-02', 'test-style-03'];
const SCANNED_EXTENSIONS = ['.ts', '.mjs', '.js', '.ps1'];
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'target', 'dist', 'test-results', 'playwright-report']);

/**
 * Reviewed files → the guard marker each must still contain, and why the file is allowed.
 * A list of markers means every one must be present. `marker: null` means the file only names an
 * operation (metadata, docs text) and sends nothing.
 */
const ALLOWED: Record<string, { marker: string | string[] | null; reason: string }> = {
  'src/api/client.ts': {
    marker: [
      "assertLocalSut(this.baseUrl, 'ParaBankRestClient.setParameter')",
      "assertLocalSut(this.baseUrl, 'ParaBankRestClient.initializeDB')",
      "assertLocalSut(this.baseUrl, 'ParaBankRestClient.cleanDB')"
    ],
    reason: 'each destructive method guards its own base URL'
  },
  'src/api/reset.ts': { marker: "assertLocalSut(baseUrl, 'seedDatabase')", reason: 'the shared reset helper guards its URL' },
  'src/api/operation-contracts.ts': { marker: null, reason: 'operation metadata only (paths and statuses)' },
  'src/quality/target-guard.ts': { marker: null, reason: 'the guard itself; names the operations in its message' },
  'src/screenplay/contract-tasks.ts': { marker: null, reason: 'calls the guarded ParaBankRestClient methods only' },
  'features/support/hooks.ts': { marker: null, reason: 'comment only; resets through the guarded seedDatabase()' },
  'features/ui/steps/ui.steps.ts': { marker: null, reason: 'calls the guarded ParaBankRestClient.setParameter only' },
  'scripts/smoke-safety.mjs': { marker: "assertLocalSut(BASE_URL, 'The smoke-safety check')", reason: 'seeds directly; guarded at entry' },
  'scripts/gate.ps1': { marker: 'GATE REFUSED', reason: 'POSTs initializeDB; refuses a non-loopback -BaseUrl first' },
  'scripts/run-perf.mjs': { marker: "assertLocalSut(baseUrl, 'The perf lane')", reason: 'starts the k6 lane, which resets' },
  'perf/src/parabank-load.ts': { marker: 'The perf lane refuses PARABANK_BASE_URL', reason: 'k6 init-context loopback check' },
  'test-style-02/global-setup.ts': { marker: 'if (!IS_LOCAL_TARGET)', reason: 'resets only a loopback host' },
  'test-style-03/global-setup.ts': { marker: 'if (!IS_LOCAL_TARGET)', reason: 'resets only a loopback host' }
};

function* sourceFiles(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) yield* sourceFiles(path);
    } else if (SCANNED_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      yield path;
    }
  }
}

const toRepoPath = (path: string) => relative('.', path).split(sep).join('/');

const filesNamingDestructiveOperations = SCANNED_ROOTS.flatMap((root) => [...sourceFiles(root)])
  .filter((path) => DESTRUCTIVE.test(readFileSync(path, 'utf8')))
  .map(toRepoPath)
  .sort();

test('only reviewed files name a destructive ParaBank operation', () => {
  const unreviewed = filesNamingDestructiveOperations.filter((path) => !(path in ALLOWED));
  assert.deepEqual(
    unreviewed,
    [],
    `New destructive call site(s): ${unreviewed.join(', ')}. Guard them (assertLocalSut / loopback-only) and add them to ALLOWED (DR-PB-13).`
  );
});

test('every reviewed file still exists, still names an operation, and keeps its guard', () => {
  for (const [path, { marker }] of Object.entries(ALLOWED)) {
    assert.ok(existsSync(path), `${path} is listed in ALLOWED but no longer exists; update the list`);
    const source = readFileSync(path, 'utf8');
    assert.ok(DESTRUCTIVE.test(source), `${path} no longer names a destructive operation; remove it from ALLOWED`);
    for (const required of marker === null ? [] : [marker].flat()) {
      assert.ok(source.includes(required), `${path} lost its guard (expected to contain: ${required})`);
    }
  }
});
