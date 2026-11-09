<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-09_triage-10-report-scenario-results.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-10: make the main-lane report and Pages checks verify each scenario's result, 2026-11-09

## Session Summary

Resolved Claude v1 review finding R-05 (score 9, LOW) by replacing the legacy string-set membership verification in `src/quality/report-integrity.ts` with a single shared report verification engine (`verifySerenityReport`):

1. **Shared Report Verification Engine (`src/quality/report-integrity.ts`):**
   - Implemented `verifySerenityReport(expectedScenarios, artifactJsonTexts)` (D-T10-1): parses each Serenity JSON artifact at top level, extracting `name` and `result`.
   - Replaced recursive `collectStrings` with exact top-level property checks, strictly verifying that each expected scenario is present and has `result === 'SUCCESS'`.
   - Accurately partitions defects into `missingScenarioNames`, `nonSuccessScenarios` (`Array<{ name, result }>`), and `unexpectedScenarioNames`.
   - Preserved `inspectSerenityCoverage(featureSources, artifactJsonTexts)` (D-T10-2) as a feature-wrapper delegating to `verifySerenityReport`.
   - Exported `formatReportCoverageFailures(coverage, artifactFileNames)` (D-T10-3) to produce standardized diagnostic messages across all report checks.
2. **Consumer Modernization (D-T10-4):**
   - `scripts/check-report.ts`: wired to `formatReportCoverageFailures`, strictly failing if any UI scenario is missing, non-`SUCCESS`, or unexpected.
   - `src/quality/pages-evidence.ts`: updated `validatePagesEvidence` to throw when `coverage.nonSuccessScenarios.length > 0` or `coverage.unexpectedScenarioNames.length > 0` before staging GitHub Pages evidence.
   - `scripts/check-style-03-report.ts`: retired inline parsing and comparison loops, replacing them directly with `verifySerenityReport(EXPECTED_SCENARIOS, artifactTexts)` and `formatReportCoverageFailures`.
3. **Unit Tests & Must-Fail Acceptance Proofs (D-T10-5):**
   - Updated `tests/unit/report-integrity.test.ts` (suite expanded from 73 to 78 tests across the repo):
     - Passing test: verified all scenarios present with `result: 'SUCCESS'`.
     - MUST-FAIL / ACCEPTANCE 1: strictly rejected non-`SUCCESS` scenarios (`FAILURE`, `BROKEN`).
     - MUST-FAIL / ACCEPTANCE 2: strictly rejected scenario names appearing only as free text in descriptions or step children as `missingScenarioNames`, reversing the legacy weakness.
     - Unexpected test: strictly rejected scenario names in artifacts not declared in expected list.
     - Malformed JSON test: reported invalid artifact indexes and missing scenarios.
     - Non-scenario artifact test: confirmed non-scenario JSON files (without string `name`) are cleanly ignored.
   - Updated `tests/unit/pages-evidence.test.ts`:
     - Added `result: 'SUCCESS'` to fixture generation.
     - Added unit test verifying `validatePagesEvidence` strictly throws on non-`SUCCESS` scenarios.

Plan: [`../implementation-plans/2026-11-09_triage-10-report-scenario-results.md`](../implementation-plans/2026-11-09_triage-10-report-scenario-results.md)
(approved 2026-11-09 by owner, decisions D-T10-1 to D-T10-6 confirmed).

---

## Objectives

1. ✅ Provide a single shared implementation in `src/quality/report-integrity.ts` mapping each Serenity artefact's `name` to its `result` (D-T10-1, D-T10-2).
2. ✅ Strictly fail on missing, non-`SUCCESS`, and unexpected scenarios (D-T10-3).
3. ✅ Wire shared engine into `check:report`, `check:pages`, and `check:style-03-report` (D-T10-4).
4. ✅ Add unit tests in `tests/unit/report-integrity.test.ts` rejecting `FAILURE` scenarios and scenarios appearing only as free text (D-T10-5).
5. ✅ Quality gates: `npm run test:unit` passes 78/78, all four typechecks pass, `lint:tags` passes.
6. ✅ Two-PR cadence: implementation PR followed by outcome PR and root worklist tick (D-T10-6).

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript | `npm run typecheck` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-02` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-03` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run perf:typecheck` | exit 0 | exit 0 | ✅ PASS |
| Toolchain | `npm run lint:tags` | exit 0 | exit 0 | ✅ PASS |
| Unit Tests | `npm run test:unit` | 73 tests | 78 tests | ✅ PASS (78/78) |
| Architecture | `destructive-call-sites.test.ts` | exit 0 | exit 0 | ✅ PASS |
| Portfolio | `tools/ci/check-support.ps1 -Only Docs` | 9/9 passed | 9/9 passed | ✅ PASS |

---

## Verification Evidence

1. **Rejection of Non-SUCCESS Results (MUST-FAIL):**
   ```typescript
   const result = inspectSerenityCoverage(
     ['Feature: report\nScenario: Failed journey'],
     [JSON.stringify({ name: 'Failed journey', result: 'FAILURE' })]
   );
   assert.deepEqual(result.nonSuccessScenarios, [{ name: 'Failed journey', result: 'FAILURE' }]);
   assert.ok(formatReportCoverageFailures(result).includes("scenario 'Failed journey' is FAILURE, not SUCCESS"));
   ```
2. **Rejection of Free-Text Matching (MUST-FAIL):**
   ```typescript
   // Free text inside description or child step objects no longer satisfies scenario presence
   const result = inspectSerenityCoverage(
     ['Feature: report\nScenario: Second journey'],
     [JSON.stringify({ name: 'First journey', result: 'SUCCESS', description: 'Second journey mentioned' })]
   );
   assert.deepEqual(result.missingScenarioNames, ['Second journey']);
   ```
3. **Rejection of Unexpected Scenarios:**
   ```typescript
   const result = verifySerenityReport(['Expected'], [JSON.stringify({ name: 'Surprise', result: 'SUCCESS' })]);
   assert.deepEqual(result.unexpectedScenarioNames, ['Surprise']);
   ```
