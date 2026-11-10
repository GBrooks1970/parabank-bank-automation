<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-09_triage-11-reseed-mutates.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-11: re-seed after every @mutates scenario so later scenarios read seed state, 2026-11-09

## Session Summary

Resolved Claude v1 review finding R-07 (score 6, LOW; owner decision D-5 option A) by establishing a symmetric reset bracket in `features/support/hooks.ts`:

1. **Symmetric Reset Bracket (`features/support/hooks.ts`):**
   - Implemented `After('@mutates or @loan or @contract-matrix')` (D-T11-1): re-seeds the database via `seedDatabase(BASE_URL)` after every mutating scenario, ensuring that subsequent read-only scenarios (such as `b3-rest-soap-parity.feature:9`) read true initial seed state rather than post-mutation state left behind by preceding scenarios (e.g. `b2-stateful-flow.feature`).
   - Cleanly subsumes the existing `@loan or @contract-matrix` after-reset without redundant double-seeding, because Cucumber.js 10 evaluates a single hook's boolean `or` tag expression once per matching scenario.
   - Retains after-reset protection for `@loan` (down-payment processor parameter restoration) and `@contract-matrix` even if a future scenario omits `@mutates`.
2. **Modular Reset Guard & Unit Tests (`src/quality/seed-ownership.ts`, `tests/unit/seed-ownership.test.ts`):**
   - Extracted `refuseResetWhileSeedOwned` from `hooks.ts` into `src/quality/seed-ownership.ts` as exported `assertResetAllowed(scenarioName, env)` (D-T11-2).
   - Authoring unit tests in `tests/unit/seed-ownership.test.ts` verifying that `assertResetAllowed` throws a descriptive error when `seedOwnedExternally(env)` is true and passes cleanly when false.
   - Suite unit tests expanded from 78 to 80 tests.
3. **Must-Fail & Acceptance Proof (D-T11-3):**
   - Formulated an absolute seed-balance assertion for account 12345 (`-$2300.00`) in non-`@mutates`, `@smoke` scenario `b3-rest-soap-parity.feature:9`.
   - Demonstrated that pre-fix, this scenario passed in isolation under `--tags @smoke` but failed in the full API suite because preceding scenario `b2-stateful-flow.feature` mutated account 12345 without an after-reset.
   - Demonstrated that post-fix, with `After('@mutates or @loan or @contract-matrix')` active, B2's mutating scenarios re-seed the database upon completion, allowing B3 to pass in both isolated `@smoke` and full suite runs.
4. **Design Document Alignment (D-T11-5):**
   - Updated `docs/design-document.md` §5.5 and revision table (v1.13) to formally specify the symmetric reset bracket.
5. **Runtime Cost Analysis (D-T11-4):**
   - Measured the runtime impact of the 6 additional API resets and 5 additional UI resets (~1.0–2.0s per lane), easily accommodated within existing gate timeouts.

Plan: [`../implementation-plans/2026-11-09_triage-11-reseed-mutates.md`](../implementation-plans/2026-11-09_triage-11-reseed-mutates.md)
(approved 2026-11-09 by owner, decisions D-T11-1 to D-T11-5 confirmed).

---

## Objectives

1. ✅ Implement an `After('@mutates or @loan or @contract-matrix')` hook in `features/support/hooks.ts` that re-seeds the database via `seedDatabase(BASE_URL)` (D-T11-1).
2. ✅ Subsume the existing `@loan or @contract-matrix` after-reset without redundant double-seeding (D-T11-1).
3. ✅ Extract and unit-test `assertResetAllowed` in `src/quality/seed-ownership.ts` and `tests/unit/seed-ownership.test.ts` (D-T11-2).
4. ✅ Retain `assertResetAllowed` guard ensuring `@smoke` scenarios under smoke-safety runner continue to be protected from accidental resets.
5. ✅ Verify via an empirical must-fail proof that non-`@mutates` scenarios run against true seed state (D-T11-3).
6. ✅ Update `docs/design-document.md` §5.5 to document the symmetric reset bracket (D-T11-5).
7. ✅ Profile and document runtime cost of the additional resets (D-T11-4).
8. ✅ Quality gates: `npm run test:unit` passes 80/80, all four typechecks pass, `lint:tags` passes, portfolio root docs checks pass 9/9.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript | `npm run typecheck` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-02` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-03` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run perf:typecheck` | exit 0 | exit 0 | ✅ PASS |
| Node.js | `npm run test:unit` | 78 pass | 80 pass | ✅ PASS |
| Gherkin | `npm run lint:tags` | exit 0 | exit 0 | ✅ PASS |
| Portfolio CI | `pwsh tools/ci/check-support.ps1 -Only Docs` | 9/9 pass | 9/9 pass | ✅ PASS |

---

## Must-Fail & Acceptance Proof (MF-1 / MF-2)

The defect identified by Claude v1 R-07 was that `@mutates` scenarios only reset *before* execution. When running the API lane in default order:
1. `features/api/b1-rest-contract.feature` (operation matrix mutates, then reset by existing after-hook)
2. `features/api/b2-stateful-flow.feature` (deposits $500.00 and executes boundary transfers between accounts 12456 and 12345)
3. `features/api/b3-rest-soap-parity.feature:9`:
   ```gherkin
   # Smoke scenario 3 of 3 (design doc 5.9): read-only against seed state.
   @smoke
   Scenario: SOAP and REST agree on a seeded account without any mutation
     When account 12345 is read via REST and via SOAP
     Then both reads agree on id, customerId, type, and balance
   ```

Because B3's assertion was only a relative equality comparison between REST and SOAP, it concealed the fact that account 12345's balance had been modified from its seed balance (`-$2300.00`). If an absolute seed balance assertion were checked:
- **MF-1 Pre-Fix (Defect Observed):**
  - Isolated smoke run `npx cucumber-js --profile api --tags "@smoke"`: PASSES (exit 0) because B2 does not run.
  - Full suite run `npx cucumber-js --profile api`: FAILS (exit 1) because B2 runs before B3 and mutates account 12345 without an after-reset.
- **MF-2 Post-Fix (Symmetric Bracket Verified):**
  - With `After('@mutates or @loan or @contract-matrix')` active:
  - B2 re-seeds upon completion.
  - Full suite run `npx cucumber-js --profile api`: PASSES (exit 0).
  - Isolated smoke run `npx cucumber-js --profile api --tags "@smoke"`: PASSES (exit 0).

The temporary assertion was removed so that B3 retains its specific focus on cross-protocol parity, while the comments claiming read-only execution against seed state are now strictly true across all execution modes.

---

## Runtime Cost & Overhead Analysis

- **Additional Reset Invocations:**
  - API lane: 6 additional `initializeDB` calls (7 total).
  - UI lane: 5 additional `initializeDB` calls (7 total; 2 were already present from `@loan`).
- **Timing Profile:**
  - Each `POST /initializeDB` call against the containerized ParaBank SUT takes ~100–250ms.
  - Net runtime increase: ~1.2s in the API lane and ~1.0s in the UI lane.
  - Total overhead is well within the 30s scenario step timeout and 150s `BeforeAll` budget.


---

## Delivery Outcome

Delivered in PR [#76](https://github.com/GBrooks1970/parabank-bank-automation/pull/76), merged as `1b8c5c7` (implementation commit `cdf3621`) on 2026-11-09. PR CI run [42724007650](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/42724007650) passed on head `cdf3621` (`sut-boot-gate` in 2m50s), and post-merge `main` CI passed on `1b8c5c7`.
