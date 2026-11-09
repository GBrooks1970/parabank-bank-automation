---
version: 1
created: 2026-11-09T20:45Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-10 (approved worklist item; proposed backlog candidate)
status: delivered
delivered: 2026-11-09 (PR #74, 8dd6b37)
approved: 2026-11-09 (owner)
presented: 2026-11-09
language: en-GB
---

# Implementation plan: TRIAGE-10, make the main-lane report and Pages checks verify each scenario's result

**Goal.** Replace the legacy string-set membership verification in `src/quality/report-integrity.ts` with a single shared implementation that maps each Serenity JSON artefact's top-level `name` to its `result`, strictly requiring `SUCCESS` and failing on missing, non-`SUCCESS` (e.g. `FAILURE`, `BROKEN`, `PENDING`), or unexpected scenarios. Wire this shared engine across `check:report`, `check:pages`, and `check:style-03-report`, eliminating logic duplication and resolving Claude v1 review finding R-05 (LOW, 9).

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-10 (`Claude v1 R-05 (LOW, 9)`).
- Review findings: Claude v1 review R-05 in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md` §2.5.
- Key files:
  - `src/quality/report-integrity.ts` (shared Serenity report integrity engine)
  - `scripts/check-report.ts` (main-lane UI report content verification gate)
  - `src/quality/pages-evidence.ts` (static GitHub Pages packaging and validation gate)
  - `scripts/check-style-03-report.ts` (test-style-03 Serenity report content gate)
  - `tests/unit/report-integrity.test.ts` (unit tests and must-fail rejection proofs)
  - `tests/unit/pages-evidence.test.ts` (Pages staging and evidence test fixtures)

---

## Evidence Gathered Before Planning

All reads conducted in worktree `wt-parabank-t10` on branch `worklist/triage-10-report-scenario-results` tracking `origin/main` at `831a4e9` (following TRIAGE-05 delivery outcome merge), with Node 24.18.0 and npm 11.16.0.

1. **Current Weakness in `src/quality/report-integrity.ts`:**
   - Lines 22–33 of `report-integrity.ts` recursively collect *every* string value found anywhere in the JSON artifact via `collectStrings`.
   - If a scenario name appears only as free text in a step description, error trace, or child node, it is considered present (`artifactStrings.has(name)`).
   - Crucially, `report-integrity.ts` never inspects `result`. A failed scenario (`result: 'FAILURE'` or `'BROKEN'`) with its name in the JSON passes the gate with exit 0.
2. **Existing Strong Model in `scripts/check-style-03-report.ts`:**
   - Lines 37–53 parse each artifact file as `{ name?: unknown; result?: unknown }`.
   - Populates `results.set(scenario.name, String(scenario.result))`.
   - Fails if `result === undefined` (missing scenario).
   - Fails if `result !== 'SUCCESS'` (`scenario '${name}' is ${result}, not SUCCESS`).
   - Fails if `!EXPECTED_SCENARIOS.includes(name)` (`unexpected scenario in Serenity artefacts: '${name}'`).
3. **Consumer Alignment:**
   - `scripts/check-report.ts` currently imports `inspectSerenityCoverage` and checks `missingScenarioNames` and `invalidArtifactIndexes`, but lacks non-`SUCCESS` and unexpected scenario checks.
   - `src/quality/pages-evidence.ts` lines 229–241 currently call `inspectSerenityCoverage` and check `missingScenarioNames`, but do not verify `result === 'SUCCESS'` or unexpected scenarios before staging evidence.
   - `scripts/check-style-03-report.ts` duplicates artifact parsing and validation logic inline instead of consuming the shared quality module.

---

## Decisions for Owner Review

### D-T10-1: Shared Verification Engine (`verifySerenityReport`)
Introduce `verifySerenityReport(expectedScenarios: readonly string[], artifactJsonTexts: readonly string[]): ReportCoverageResult` in `src/quality/report-integrity.ts`.
- Top-level JSON parsing extracts `name` (string) and `result` (string) for each artifact.
- Non-scenario objects (e.g. metadata or non-scenario JSON files) without a string `name` property are ignored rather than counted as scenarios.
- Syntactically invalid JSON strings record their index in `invalidArtifactIndexes`.
- Evaluates:
  - `missingScenarioNames`: expected scenario names absent from discovered artifact names.
  - `nonSuccessScenarios`: discovered scenarios matching an expected name where `result !== 'SUCCESS'` (returning `{ name, result }`).
  - `unexpectedScenarioNames`: discovered scenario names not present in `expectedScenarios`.

### D-T10-2: Feature Coverage Wrapper (`inspectSerenityCoverage`)
Retain `inspectSerenityCoverage(featureSources: readonly string[], artifactJsonTexts: readonly string[]): ReportCoverageResult` for backwards compatibility with existing consumers. It extracts `scenarioNames` via `scenarioNamesFromFeature(source)` and directly returns `verifySerenityReport(scenarioNames, artifactJsonTexts)`.

### D-T10-3: Unified Failure Formatting Helper
Export `formatReportCoverageFailures(coverage: ReportCoverageResult, artifactFileNames?: readonly string[]): string[]` in `src/quality/report-integrity.ts`.
Standardises error messages across all consumers:
- `invalid Serenity JSON artefact: <file | index>`
- `scenario missing from Serenity artefacts: '<name>'`
- `scenario '<name>' is <result>, not SUCCESS`
- `unexpected scenario in Serenity artefacts: '<name>'`

### D-T10-4: Wire Shared Engine into All Three Consumers
1. **`scripts/check-report.ts`:**
   - Use `coverage.nonSuccessScenarios` and `coverage.unexpectedScenarioNames` (or `formatReportCoverageFailures`) to fail if any scenario did not succeed or was unexpected.
2. **`src/quality/pages-evidence.ts`:**
   - In `validatePagesEvidence`, throw errors if `coverage.nonSuccessScenarios.length > 0` (`Serenity report contains non-SUCCESS scenarios: ...`) or `coverage.unexpectedScenarioNames.length > 0` (`Serenity report contains unexpected scenarios: ...`).
3. **`scripts/check-style-03-report.ts`:**
   - Replace inline JSON parsing and comparison loops with `verifySerenityReport(EXPECTED_SCENARIOS, artifactTexts)` and `formatReportCoverageFailures(coverage, artifactFiles)`.

### D-T10-5: Unit Testing & Must-Fail Acceptance Proofs
Update `tests/unit/report-integrity.test.ts` to verify:
1. Passing run: all expected scenarios present with `result: 'SUCCESS'`.
2. MUST-FAIL / ACCEPTANCE 1: non-`SUCCESS` result (`FAILURE`, `BROKEN`, `PENDING`) is strictly flagged in `nonSuccessScenarios`.
3. MUST-FAIL / ACCEPTANCE 2: a scenario name appearing only as free text in a child object or step description is strictly flagged in `missingScenarioNames` (reversing the flawed legacy behavior).
4. Unexpected scenario detection: artifacts with scenario names not in the expected list are flagged in `unexpectedScenarioNames`.
5. Missing scenario detection and malformed JSON index reporting.
Update `tests/unit/pages-evidence.test.ts`:
- Ensure `makeFixture` creates valid Serenity artifacts with `result: 'SUCCESS'` so staging fixtures remain valid.

### D-T10-6: Two-PR Cadence
Deliver via the approved two-PR workflow:
1. Implementation PR from branch `worklist/triage-10-report-scenario-results` targeting `main`.
2. Outcome PR updating `docs/backlog.md` to **v44**, marking plan delivered, and ticking root worklist item `- [x] TRIAGE-10`.

---

## Acceptance Criteria

- [ ] `src/quality/report-integrity.ts` provides a single shared implementation that maps each Serenity artefact's `name` to its `result`.
- [ ] Verification strictly fails on missing, non-`SUCCESS`, and unexpected scenarios.
- [ ] `scripts/check-report.ts`, `src/quality/pages-evidence.ts`, and `scripts/check-style-03-report.ts` all consume the shared implementation.
- [ ] Unit tests in `tests/unit/report-integrity.test.ts` reject a `FAILURE` result and a scenario name appearing only as free text.
- [ ] All existing report and Pages unit tests pass (`npm run test:unit` 73/73+).
- [ ] TypeScript typechecks (`typecheck`, `typecheck:style-02`, `typecheck:style-03`, `perf:typecheck`) and tag linting pass with exit code 0.
- [ ] PR CI (`sut-boot-gate`) passes cleanly on head commit.

---

## Implementation Steps

1. **Plan Approval:** Owner reviews and confirms Decisions D-T10-1 through D-T10-6. Update status to `approved` and commit plan + index.
2. **Implement Shared Report Integrity Engine:**
   - Update `src/quality/report-integrity.ts`:
     - Define `ScenarioResult` and expand `ReportCoverageResult`.
     - Implement `verifySerenityReport` and `formatReportCoverageFailures`.
     - Update `inspectSerenityCoverage` to delegate to `verifySerenityReport`.
3. **Wire Consumers:**
   - Update `scripts/check-report.ts` to check non-`SUCCESS` and unexpected scenarios.
   - Update `src/quality/pages-evidence.ts` to assert non-`SUCCESS` and unexpected scenarios throw.
   - Update `scripts/check-style-03-report.ts` to consume `verifySerenityReport` and `formatReportCoverageFailures`.
4. **Update & Expand Unit Tests:**
   - Update `tests/unit/report-integrity.test.ts` with passing, must-fail free text, must-fail `FAILURE`, and unexpected scenario tests.
   - Update `tests/unit/pages-evidence.test.ts` fixture generator to include `result: 'SUCCESS'`.
5. **Run Verification Gates:**
   - `npm run test:unit`
   - `npm run typecheck`, `npm run typecheck:style-02`, `npm run typecheck:style-03`, `npm run perf:typecheck`
   - `npm run lint:tags`
   - Portfolio `tools/ci/check-support.ps1 -Only Docs`
6. **PR & Merge Cadence:**
   - Commit implementation and author session log `docs/implementation-logs/2026-11-09_triage-10-report-scenario-results.md`.
   - Push branch and open implementation PR.
   - Merge on green CI (`--match-head-commit`).
   - Fast-forward `main`, open outcome PR (backlog v44), merge, tick root worklist.
