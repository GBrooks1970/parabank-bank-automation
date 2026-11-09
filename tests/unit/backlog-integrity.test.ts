import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseCurrentVersionEntry,
  extractPendingPrNumbers,
  isGitHistoryAvailable,
  getMergedPrNumbersFromGit,
  validateBacklogPending,
  assertNoMergedPrsPending
} from '../../src/quality/backlog-integrity';

test('parseCurrentVersionEntry extracts the active version number, header, and body text', () => {
  const sampleBacklog = `# parabank-bank-automation — Backlog

**Version:** 40 — **TRIAGE-08 COMPLETE (2026-11-09): performance workflow split.** Description of v40.
Merged as [#66] into main.

v39 — **TRIAGE-03 COMPLETE (2026-11-09): performance diagnostics.** Description of v39.

v38 — **TRIAGE-07 COMPLETE.** Description of v38.
`;

  const entry = parseCurrentVersionEntry(sampleBacklog);
  assert.equal(entry.version, 40);
  assert.equal(
    entry.header,
    '**TRIAGE-08 COMPLETE (2026-11-09): performance workflow split.** Description of v40.'
  );
  assert.ok(entry.text.includes('Merged as [#66] into main.'));
  assert.ok(!entry.text.includes('v39'));
});

test('extractPendingPrNumbers extracts PR numbers associated with PENDING markers', () => {
  const pendingText = `
v33 — **PB-STYLE-02 COMPLETE; PB-STYLE-03 IMPLEMENTED, MERGE EVIDENCE PENDING (2026-10-19).**
PB-STYLE-02 merged as [#52] (e7130f5).
PB-STYLE-03 lets both style folders run; review vehicle is PR #53, merge evidence pending.
`;

  const prs = extractPendingPrNumbers(pendingText);
  assert.deepEqual(prs, [53]);
});

test('extractPendingPrNumbers returns empty when no items are marked pending', () => {
  const completeText = `
**Version:** 40 — **TRIAGE-08 COMPLETE (2026-11-09): split perf workflow.**
Merged as [#66] (7fb14e8). PR CI run 42654631485 passed.
`;

  const prs = extractPendingPrNumbers(completeText);
  assert.deepEqual(prs, []);
});

test('MUST-FAIL: validateBacklogPending flags violation when current version marks a merged PR as pending', () => {
  const pendingMergedBacklog = `# parabank-bank-automation — Backlog

**Version:** 41 — **TRIAGE-09 IMPLEMENTED, MERGE EVIDENCE PENDING (2026-11-09).**
Review vehicle is PR [#66]. All gates passing.

v40 — **TRIAGE-08 COMPLETE.**
`;

  const mergedPrs = new Set([60, 62, 64, 66]);
  const result = validateBacklogPending(pendingMergedBacklog, mergedPrs);

  assert.equal(result.valid, false);
  assert.equal(result.currentVersion, 41);
  assert.deepEqual(result.pendingPrs, [66]);
  assert.equal(result.violations.length, 1);
  assert.ok(result.violations[0].includes('marks PR #66 as pending'));
  assert.ok(result.violations[0].includes('already merged into main'));

  assert.throws(
    () => assertNoMergedPrsPending(pendingMergedBacklog, mergedPrs),
    (err: unknown) =>
      err instanceof Error &&
      err.message.includes('Backlog integrity violation detected') &&
      err.message.includes('marks PR #66 as pending')
  );
});

test('validateBacklogPending passes when a pending PR is legitimately unmerged', () => {
  const pendingUnmergedBacklog = `# parabank-bank-automation — Backlog

**Version:** 41 — **TRIAGE-09 IMPLEMENTED, MERGE EVIDENCE PENDING (2026-11-09).**
Review vehicle is PR [#999]. Awaiting CI and owner merge.

v40 — **TRIAGE-08 COMPLETE.**
`;

  const mergedPrs = new Set([60, 62, 64, 66]);
  const result = validateBacklogPending(pendingUnmergedBacklog, mergedPrs);

  assert.equal(result.valid, true);
  assert.equal(result.currentVersion, 41);
  assert.deepEqual(result.pendingPrs, [999]);
  assert.equal(result.violations.length, 0);
  assert.doesNotThrow(() => assertNoMergedPrsPending(pendingUnmergedBacklog, mergedPrs));
});

test('live check: docs/backlog.md has no merged PRs marked as pending against Git log', (t) => {
  if (!isGitHistoryAvailable()) {
    t.skip('Git history is shallow or unavailable; skipping live backlog check');
    return;
  }

  const backlogPath = join(process.cwd(), 'docs', 'backlog.md');
  const backlogContent = readFileSync(backlogPath, 'utf-8');
  const mergedPrs = getMergedPrNumbersFromGit();

  assert.ok(mergedPrs.size > 0, 'Expected to find at least one merged PR in git log');
  assert.ok(mergedPrs.has(66), 'Expected merged PR #66 (TRIAGE-08) in git log');
  assert.ok(mergedPrs.has(64), 'Expected merged PR #64 (TRIAGE-03) in git log');

  assert.doesNotThrow(() => assertNoMergedPrsPending(backlogContent, mergedPrs));
});
