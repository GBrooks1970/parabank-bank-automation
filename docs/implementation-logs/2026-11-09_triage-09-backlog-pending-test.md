<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-09_triage-09-backlog-pending-test.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-09: add a unit test that fails when the backlog marks a merged PR as pending, 2026-11-09

## Session Summary

An automated, SUT-independent integrity test suite has been introduced to prevent backlog status drift (Claude v1 review R-02, MEDIUM 14).
1. `src/quality/backlog-integrity.ts` provides parsing and integrity checks:
   - `parseCurrentVersionEntry`: identifies the current (active) version header and body in `docs/backlog.md` (D-T09-1).
   - `extractPendingPrNumbers`: identifies PR numbers marked as pending (`PENDING`, `MERGE PENDING`, `MERGE EVIDENCE PENDING`) in sentences/clauses (D-T09-2).
   - `isGitHistoryAvailable`: checks if local Git history is deep and available (`git rev-parse --is-shallow-repository`) (D-T09-4).
   - `getMergedPrNumbersFromGit`: parses local `git log` commit subjects for squash merges (`(#<num>)`) and merge commits (`Merge pull request #<num>`) without network or API calls (D-T09-3).
   - `validateBacklogPending` & `assertNoMergedPrsPending`: verifies that no merged PR is marked pending in the current version entry.
2. `tests/unit/backlog-integrity.test.ts` adds 6 comprehensive unit tests:
   - Parser and extraction validation.
   - **Must-fail before-evidence:** asserts failure against a fixture where merged PR #66 is marked pending in the current version line (throws `AssertionError` with detailed violation message).
   - **Passing fixture assertion:** verifies that an unmerged PR (e.g. #999) marked pending passes validation without error.
   - **Shallow / Non-Git Handling:** detects shallow checkouts (`--depth 1`) or missing git binary and gracefully skips the live repository check with a clear skip message (`t.skip(...)`).
   - **Live repository verification:** validates actual `docs/backlog.md` against real local Git history from `main`, passing cleanly on the reconciled backlog v40.
3. Unit test suite expanded from 61 to 67 tests (all passing). Static typechecks, tag linting, and portfolio docs support checks passed cleanly.

Plan: [`../implementation-plans/2026-11-09_triage-09-backlog-pending-test.md`](../implementation-plans/2026-11-09_triage-09-backlog-pending-test.md)
(approved 2026-11-09 by owner, decisions D-T09-1 to D-T09-6 confirmed).

---

## Objectives

1. ✅ SUT-independent integrity logic: implemented `src/quality/backlog-integrity.ts`.
2. ✅ Current-version scoping: `parseCurrentVersionEntry` inspects only the topmost version entry, preserving historical version narrative (D-T09-1).
3. ✅ Pending pattern matching: detects PR numbers associated with `PENDING` across sentence/clause boundaries (D-T09-2).
4. ✅ Offline Git log discovery: `getMergedPrNumbersFromGit` queries local `git log` for squash and merge commit subjects (D-T09-3).
5. ✅ Shallow clone resilience: `isGitHistoryAvailable` guards live repository tests with `t.skip` on shallow CI checkouts (D-T09-4).
6. ✅ Must-fail evidence: verified red on a pending-but-merged fixture (PR #66).
7. ✅ Passing live test: verified green against the reconciled backlog v40.
8. ✅ Test runner integration: discovered automatically by `scripts/run-unit-tests.mjs` as part of `npm run test:unit`.
9. ✅ Two-PR cadence: implementation PR followed by outcome PR and root worklist tick (D-T09-6).

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript | `npm run typecheck` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-02` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-03` | exit 0 | exit 0 | ✅ PASS |
| Toolchain | `npm run lint:tags` | exit 0 | exit 0 | ✅ PASS |
| Unit Tests | `npm run test:unit` | 61 tests | 67 tests | ✅ PASS (67/67) |
