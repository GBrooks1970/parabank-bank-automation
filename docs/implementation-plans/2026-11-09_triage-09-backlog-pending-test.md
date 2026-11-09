---
version: 1
created: 2026-11-09T16:50Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-09 (approved worklist item; proposed backlog candidate)
status: approved
approved: 2026-11-09 (owner)
delivered: null
language: en-GB
---

# Implementation plan: TRIAGE-09, add a unit test that fails when the backlog marks a merged PR as pending

**Goal.** Introduce an automated, SUT-independent integrity test that reads `docs/backlog.md` and fails when its current-version entry marks as pending an item whose PR number has already been merged into `main`. This prevents the drift identified in Claude v1 review finding R-02, where merged phases or triage items (e.g. PB-STYLE-03, PB-PIN-05) remain marked "MERGE PENDING" in the status of record.

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-09 (`After TRIAGE-06, whose reconciled backlog is the passing fixture. Follows D-3 option A`).
- Review findings: Claude v1 review R-02 (MEDIUM, 14) in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md` §2.
- Key files:
  - `docs/backlog.md` (authoritative backlog of record)
  - `src/quality/backlog-integrity.ts` (integrity verification and parsing logic)
  - `tests/unit/backlog-integrity.test.ts` (unit tests and must-fail assertions)
  - `scripts/run-unit-tests.mjs` (unit test discovery harness)

---

## Evidence Gathered Before Planning

All reads conducted in worktree `wt-parabank-t09` tracking `origin/main` at `7023375` (following TRIAGE-08 outcome merge), with Node 24.18.0 and npm 11.16.0.

| Finding | Consequence for the plan |
|---|---|
| **Root cause of R-02:** When PR #53 (PB-STYLE-03) merged as `bbca594` on 2026-10-22, backlog v33 was committed with `PB-STYLE-03 IMPLEMENTED, MERGE EVIDENCE PENDING` and was never updated to reflect the merge until TRIAGE-06 (backlog v35). | Delivery workflows need an executable gate that catches a merged PR still labelled pending in the active version entry before the next delivery merges. |
| **Current backlog format:** `docs/backlog.md:14-25` begins with `# parabank-bank-automation — Backlog` followed by `**Version:** <num> — <summary>` for the active version, followed by historical `v<num> — <summary>` entries. | The check must target the active version entry (the top entry), preserving historical narrative in earlier versions (e.g. v33, v30) which document past states. |
| **Merged PR markers in Git log:** In local Git history on `main`, squash merges format as `... (#<num>)` in the commit subject, and standard merge commits format as `Merge pull request #<num> from ...`. | Both patterns can be extracted reliably from local `git log` commit subjects without requiring network requests or GitHub CLI dependencies. |
| **CI checkout depth:** Default CI actions or shallow environments (`--depth 1`) may not contain full Git history or previous merge commits. | The unit test must detect shallow or absent Git history (e.g. via `git rev-parse --is-shallow-repository` or empty logs) and gracefully skip the live repository check with a clear skip message (`t.skip(...)`), while running pure fixture tests unconditionally. |
| **Unit test suite size:** Suite currently has 61 unit tests across 14 files under `tests/unit/`. | Adding `tests/unit/backlog-integrity.test.ts` integrates cleanly into `npm run test:unit` via `scripts/run-unit-tests.mjs`. |

---

## Design Options & Proposed Architecture

### 1. Target Scope in `docs/backlog.md` (D-T09-1)
- **Option A (Recommended):** Inspect strictly the **current-version entry** (the first version line following `# parabank-bank-automation — Backlog`).
  - Matches the exact acceptance criteria: "fails when its current-version line marks as pending an item whose PR number appears as merged on main".
  - Earlier entries (e.g. v33, v30) contain historical narrative and dated mentions that must remain intact.
- **Option B:** Inspect the whole file. Rejected: will falsely trigger on dated historical version records that document earlier pending states.

### 2. Pending Pattern Definition (D-T09-2)
- **Option A (Recommended):** Detect any item associating a PR reference (`#\d+` or `[#\d+]`) with pending status markers such as `MERGE EVIDENCE PENDING`, `MERGE PENDING`, or `PENDING`.
  - Specifically, parse the current version text for lines or sentences containing `PENDING` (case-insensitive) and extract the referenced PR numbers.
- **Option B:** Require exact literal phrase `MERGE EVIDENCE PENDING`. Rejected: too fragile if an engineer writes `MERGE PENDING` or `PENDING`.

### 3. Merged PR Discovery from Local Git Log (D-T09-3)
- **Option A (Recommended):** Inspect commit subjects via `git log -n 200 --format="%s"`:
  - Match squash merge subjects: `.*\(#(\d+)\)$` (e.g. `docs(TRIAGE-08): record delivery outcome and backlog v40 (#67)`)
  - Match merge commit subjects: `^Merge pull request #(\d+)` (e.g. `Merge pull request #64 from ...`)
  - Accumulate merged PR numbers in a `Set<number>`.
  - Zero external npm dependencies; uses only `node:child_process` `execFileSync` or `spawnSync`.
- **Option B:** Query GitHub API or `gh` CLI. Rejected: unit tests must be SUT-independent, offline, deterministic, and credential-free.

### 4. Handling Shallow / Non-Git Environments (D-T09-4)
- **Option A (Recommended):**
  - Check if Git is available and whether repository history is shallow (`git rev-parse --is-shallow-repository`).
  - If shallow (depth ≤ 1) or Git is not found, the live repository test calls `t.skip("Git history is shallow or unavailable; skipping live backlog check")` and exits cleanly.
  - All fixture-based tests (testing the parsing, extraction, and validation logic against artificial passing and failing fixtures) run in all environments unconditionally.
- **Option B:** Fail hard if Git history is shallow. Rejected: would cause CI failure on default shallow checkouts.

### 5. Implementation Structure & Exports (D-T09-5)
- **Module:** `src/quality/backlog-integrity.ts`:
  - `parseCurrentVersionEntry(backlogContent: string): { version: number; text: string }`: extracts the top version entry.
  - `extractPendingPrNumbers(text: string): number[]`: identifies PR numbers marked pending.
  - `getMergedPrNumbersFromGit(cwd?: string): Set<number>`: queries local git log.
  - `validateBacklogPending(backlogContent: string, mergedPrs: Set<number>): { valid: boolean; violations: string[] }`: asserts that no merged PR is marked pending.
- **Unit test suite:** `tests/unit/backlog-integrity.test.ts`:
  - Test 1: Parser correctly extracts current version and distinguishes it from historical entries.
  - Test 2: Extraction correctly identifies pending PR numbers from pending patterns.
  - Test 3: Must-fail fixture test — fails when a merged PR (e.g. #66) is marked pending in a test fixture.
  - Test 4: Fixture test — passes when an unmerged PR (e.g. #999) is marked pending.
  - Test 5: Fixture test — passes when all entries in current version are marked COMPLETE / delivered.
  - Test 6: Live check — executes against actual `docs/backlog.md` and live git log, passing on the current reconciled backlog (or skipping cleanly if shallow).

### 6. Two-PR Cadence (D-T09-6)
- **Implementation PR (`worklist/triage-09-backlog-pending-test`):**
  - Add `src/quality/backlog-integrity.ts`.
  - Add `tests/unit/backlog-integrity.test.ts`.
  - Update `docs/implementation-plans/_index.md` and log.
  - Open PR, pass CI, merge into `main`.
- **Outcome PR (`worklist/triage-09-outcome`):**
  - Bump `docs/backlog.md` to **v41** recording delivery of TRIAGE-09 (9 unchecked items remaining).
  - Update plan status to `delivered` with merge SHA.
  - Tick root worklist `WORKLIST_parabank-bank-automation.md`.

---

## Verification Strategy & Must-Fail Checks

1. **Must-Fail Check 1 (Deliberate Pending-but-Merged Fixture):**
   - Provide a backlog fixture string where the current version line states:
     `**Version:** 41 — **TRIAGE-09 IMPLEMENTED, MERGE EVIDENCE PENDING.** [#66]`
     with `mergedPrs = new Set([66])`.
   - Assert `validateBacklogPending` returns `valid: false` and violations naming PR #66.
   - Assert calling a strict assertion helper throws an `AssertionError` with informative message.

2. **Passing Check 2 (Unmerged PR Fixture):**
   - Provide a fixture where PR #999 is marked `MERGE EVIDENCE PENDING` while `mergedPrs` contains only `{ 60, 62, 64, 66 }`.
   - Assert `validateBacklogPending` returns `valid: true` and 0 violations.

3. **Passing Check 3 (Current Reconciled Backlog):**
   - Run the validation against the live `docs/backlog.md` (v40) with the live Git log from `main`.
   - Passes with 0 violations.

4. **Shallow Skip Check 4:**
   - Verify that when simulated or actual Git history is shallow, `t.skip` logs the reason without error.

5. **Full Contract & Typechecks:**
   - `npm run typecheck` passes (zero TypeScript errors).
   - `npm run test:unit` passes (all 61 existing tests + new backlog integrity tests = ~67 passing tests).
   - `npm run lint:tags` passes.

---

## Risk Assessment & Trade-Offs

- **False Positives:** By restricting analysis strictly to the top version entry and matching PR numbers associated with `PENDING`, older historical notes like v33 ("PB-STYLE-03 IMPLEMENTED, MERGE EVIDENCE PENDING") are ignored.
- **Portability:** Uses `node:child_process` with standard `git log` options compatible across Linux and Windows.
- **CI Safety:** The graceful skip on shallow history guarantees that CI environments checking out with default depth do not break.

---

## Decision Points for Owner Review

1. **D-T09-1 (Target Scope):** Approve restricting pending checks to the current-version entry (top entry in `docs/backlog.md`).
2. **D-T09-2 (Pending Syntax):** Approve matching `PENDING` in sentences referencing `#<num>` or `[#<num>]`.
3. **D-T09-3 (Git Discovery):** Approve local `git log` commit subject parsing for `(#<num>)` and `Merge pull request #<num>`.
4. **D-T09-4 (Shallow Skip):** Approve graceful `t.skip` when Git history is shallow or Git CLI is unavailable.
5. **D-T09-5 (Implementation Structure):** Approve creating `src/quality/backlog-integrity.ts` and `tests/unit/backlog-integrity.test.ts`.
6. **D-T09-6 (Two-PR Cadence):** Approve implementation PR followed by outcome PR updating backlog to v41.
