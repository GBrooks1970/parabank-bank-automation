import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  auditActionPins,
  auditAllWorkflowPins,
  verifyCiWorkflow,
  assertCiWorkflowIntegrity
} from '../../src/quality/ci-workflow-integrity.js';

const WORKFLOWS_DIR = join(process.cwd(), '.github', 'workflows');
const CI_PATH = join(WORKFLOWS_DIR, 'ci.yml');

test('ci.yml defines top-level concurrency and cancel-in-progress: true', () => {
  const content = readFileSync(CI_PATH, 'utf8');
  const result = verifyCiWorkflow(content);
  assert.equal(result.valid, true, `Expected ci.yml to be valid, got: ${result.errors.join('; ')}`);
});

test('ci.yml defines static job with all required compile, test, and audit steps', () => {
  const content = readFileSync(CI_PATH, 'utf8');
  const result = verifyCiWorkflow(content);
  assert.equal(result.valid, true);

  // Assert specific steps are present in the static job
  assert.match(content, /npm run lint:tags/);
  assert.match(content, /npm run typecheck/);
  assert.match(content, /npm run typecheck:style-02/);
  assert.match(content, /npm run typecheck:style-03/);
  assert.match(content, /npm run perf:typecheck/);
  assert.match(content, /npm run test:unit/);
  assert.match(content, /npm audit --audit-level=high --omit=optional/);
  assert.match(content, /continue-on-error:\s*true/);
});

test('ci.yml gates sut-boot-gate on static job completion (needs: static)', () => {
  const content = readFileSync(CI_PATH, 'utf8');
  assert.match(content, /sut-boot-gate:[\s\S]*?needs:\s*static/);
});

test('ci.yml gates deploy-pages on sut-boot-gate completion (needs: sut-boot-gate)', () => {
  const content = readFileSync(CI_PATH, 'utf8');
  assert.match(content, /deploy-pages:[\s\S]*?needs:\s*sut-boot-gate/);
});

test('architecture guard: every external action in all repository workflows is pinned by 40-char SHA with version comment', () => {
  const result = auditAllWorkflowPins(WORKFLOWS_DIR);
  assert.equal(
    result.valid,
    true,
    `Workflow action pin audit failed:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`
  );
  assert.ok(result.pins.length >= 8, `Expected at least 8 action pins across workflows, found ${result.pins.length}`);
});

test('MUST-FAIL: verifyCiWorkflow rejects missing concurrency or missing cancel-in-progress', () => {
  const validContent = readFileSync(CI_PATH, 'utf8');

  const missingConcurrency = validContent.replace(/concurrency:[\s\S]*?cancel-in-progress:\s*true\r?\n/, '');
  const r1 = verifyCiWorkflow(missingConcurrency);
  assert.equal(r1.valid, false);
  assert.ok(r1.errors.some((e) => e.includes('concurrency group')));

  const missingCancel = validContent.replace(/cancel-in-progress:\s*true/, 'cancel-in-progress: false');
  const r2 = verifyCiWorkflow(missingCancel);
  assert.equal(r2.valid, false);
  assert.ok(r2.errors.some((e) => e.includes('cancel-in-progress: true')));
});

test('MUST-FAIL: verifyCiWorkflow rejects missing needs: static on sut-boot-gate', () => {
  const validContent = readFileSync(CI_PATH, 'utf8');
  const missingNeeds = validContent.replace(/needs:\s*static\r?\n/, '');
  const result = verifyCiWorkflow(missingNeeds);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("missing 'needs: static'")));
  assert.throws(() => assertCiWorkflowIntegrity(missingNeeds), /needs: static/);
});

test('MUST-FAIL: verifyCiWorkflow rejects blocking audit step without continue-on-error', () => {
  const validContent = readFileSync(CI_PATH, 'utf8');
  const blockingAudit = validContent.replace(/continue-on-error:\s*true\r?\n/, '');
  const result = verifyCiWorkflow(blockingAudit);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('continue-on-error: true')));
});

test('MUST-FAIL: auditActionPins rejects unpinned action tags and missing version comments', () => {
  const fixture = `
jobs:
  test:
    steps:
      - uses: actions/checkout@v5 # v5.1.0
      - uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444
`;
  const result = auditActionPins(fixture, 'test-fixture.yml');
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 2);
  assert.ok(result.errors.some((e) => e.includes("not pinned to a 40-character commit SHA (got 'v5')")));
  assert.ok(result.errors.some((e) => e.includes("lacks a human-readable release comment")));
});
