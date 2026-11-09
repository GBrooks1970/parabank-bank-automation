---
version: 1
created: 2026-11-09T23:30Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-11 (approved worklist item; proposed backlog candidate)
status: approved
approved: 2026-11-09 (owner)
presented: 2026-11-09
language: en-GB
---

# Implementation plan: TRIAGE-11, re-seed after every @mutates scenario so later scenarios read seed state

**Goal.** Make the ParaBank test reset bracket symmetric by implementing an `After` hook that re-seeds the database via `seedDatabase(BASE_URL)` after every mutating scenario. Subsume the existing `@loan or @contract-matrix` after-reset without redundant double-seeding, preserve the `refuseResetWhileSeedOwned` guard to ensure store-safe `@smoke` runs remain protected, verify via an empirical must-fail proof that non-`@mutates` scenarios run against true seed state, and record the exact run-time cost of the additional resets. Resolves Claude v1 review finding R-07 (LOW, 6).

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-11 (`Claude v1 R-07 (LOW, 6); owner decision D-5 option A`).
- Review findings: Claude v1 review R-07 in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md` §2.7.
- Key files:
  - `features/support/hooks.ts` (Cucumber lifecycle hooks, Before/After resets, seed ownership refusal)
  - `src/quality/seed-ownership.ts` (seed ownership policy and guard logic)
  - `tests/unit/seed-ownership.test.ts` (unit tests for seed ownership guard)
  - `features/api/b2-stateful-flow.feature` (mutating scenarios altering account balances)
  - `features/api/b3-rest-soap-parity.feature` (non-mutating smoke parity scenario executing after B2)
  - `docs/design-document.md` (§5.5 reset bracket)

---

## Evidence Gathered Before Planning

All reads conducted in worktree `wt-parabank-t11` on branch `worklist/triage-11-reseed-mutates` tracking `origin/main` at `2c40f4f` (following TRIAGE-10 delivery outcome merge), with Node 24.18.0 and npm 11.16.0.

1. **Current Hook Configuration in `features/support/hooks.ts`:**
   - Lines 34–39:
     ```typescript
     Before(async function (this: PBWorld, { pickle }) {
       // Reset bracket (design doc §5.5): scenarios tagged @mutates start from seed state.
       if (pickle.tags.some((t) => t.name === '@mutates')) {
         refuseResetWhileSeedOwned(pickle.name);
         await seedDatabase(BASE_URL);
       }
       ...
     ```
   - Lines 48–51:
     ```typescript
     // FR-A5 and the FR-B1 matrix pin/mutate admin or database state; restore defaults
     // afterwards — initializeDB resets admin parameters along with the data.
     After('@loan or @contract-matrix', async function ({ pickle }) {
       refuseResetWhileSeedOwned(pickle.name);
       await seedDatabase(BASE_URL);
     });
     ```
2. **The Asymmetry Defect (Claude v1 R-07):**
   - The reset bracket is currently *before-only* for general `@mutates` scenarios: an `@mutates` scenario re-seeds before it runs, but does *not* re-seed after it completes (unless it happens to carry `@loan` or `@contract-matrix`).
   - Consequently, any non-`@mutates` scenario that executes subsequently in the same process inherits the post-mutation database state left behind by preceding scenarios.
   - Specifically, in the API lane:
     - `features/api/b2-stateful-flow.feature` runs before `features/api/b3-rest-soap-parity.feature`.
     - `b2-stateful-flow.feature` executes a deposit and three boundary transfers (`$0.00`, `$0.01`, `$10.45` exact-available) involving account 12345.
     - `b3-rest-soap-parity.feature:9` (`Scenario: SOAP and REST agree on a seeded account without any mutation`) is tagged `@smoke` and commented `# Smoke scenario 3 of 3 (design doc 5.9): read-only against seed state.`
     - When `npm run test:api` runs, by the time `b3` executes, account 12345 has a mutated balance, not its seed balance (`-$2300.00`).
     - Today, `b3` passes only because its assertions are relative (`both reads agree on id, customerId, type, and balance`). If an absolute balance assertion were asserted against seed state, it would pass in isolation (`--tags @smoke`) but fail in the full suite.
3. **Inventory of Tagged Mutating Scenarios:**
   - **API Lane (7 scenarios across 4 features):**
     - `features/api/b1-rest-contract.feature:26`: `Scenario: Every approved REST client operation has live operation evidence` (`@mutates @contract-matrix`)
     - `features/api/b2-stateful-flow.feature:8`: `Scenario: Login, create account, deposit, transfer, and verify state end to end` (`@mutates`)
     - `features/api/b2-stateful-flow.feature:24`: `Scenario Outline: Transfer at the <boundary> amount boundary` (3 examples: zero, minimum-positive, exact-available; `@mutates @amount-boundary`)
     - `features/api/b3-rest-soap-parity.feature:13`: `Scenario: SOAP sees a REST mutation immediately` (`@mutates`)
     - `features/api/b4-negative-paths.feature:20`: `Scenario Outline: An unparseable amount is rejected with 400` (1 example: `"abc"`; `@mutates`)
   - **UI Lane (7 scenarios across 5 features):**
     - `features/ui/a1-register-and-login.feature:14`: `Scenario: A new user can register and log in` (`@mutates`)
     - `features/ui/a2-open-account.feature:7`: `Scenario: Paula opens a new checking account through the UI` (`@mutates`)
     - `features/ui/a2-open-account.feature:17`: `Scenario: Paula opens a new savings account through the UI` (`@mutates`)
     - `features/ui/a3-transfer-funds.feature:6`: `Scenario: Paula transfers funds between accounts through the UI` (`@mutates`)
     - `features/ui/a4-bill-pay.feature:6`: `Scenario: Paula pays a bill through the UI` (`@mutates`)
     - `features/ui/a5-request-loan.feature:13`: `Scenario: A loan with a sufficient down payment is approved` (`@mutates`, inherits `@ui @loan`)
     - `features/ui/a5-request-loan.feature:22`: `Scenario: A loan with an insufficient down payment is denied` (`@mutates`, inherits `@ui @loan`)
4. **Tag Subsumption & Hook Semantics:**
   - In Cucumber.js 10, a single hook registered with tag expression `'@mutates or @loan or @contract-matrix'` fires exactly once per scenario that matches any of those tags.
   - All currently tagged `@loan` and `@contract-matrix` scenarios already carry `@mutates`.
   - Registering `After('@mutates or @loan or @contract-matrix', ...)` cleanly subsumes the existing after-hook, eliminates double-seeding, and retains after-reset protection for `@loan` and `@contract-matrix` even if a future scenario omits `@mutates`.
5. **Smoke-Safety Protection (`scripts/smoke-safety.mjs`):**
   - The smoke-safety runner executes `npx cucumber-js --profile {api|ui} --tags "@smoke"` under `PARABANK_SEED_OWNER=smoke-safety`.
   - `refuseResetWhileSeedOwned(pickle.name)` ensures that if any `@smoke` scenario ever attempts to trigger a reset hook (either `Before` or `After`), the runner throws immediately with an explicit error.
   - Tag policy `evaluateTagPolicy` (`src/quality/cucumber-tags.ts:65-67`) independently rejects any scenario tagged both `@smoke` and `@mutates`.
6. **Architecture Guard on Destructive Operations:**
   - `tests/unit/destructive-call-sites.test.ts` scans all sources for `/\b(initializeDB|cleanDB|setParameter)\b/`.
   - `features/support/hooks.ts` is explicitly listed in `ALLOWED` with `marker: null`, reason `'comment only; resets through the guarded seedDatabase()'`.
   - The test requires that `hooks.ts` continues to mention `initializeDB` in comments, and makes reset calls exclusively through `seedDatabase(BASE_URL)`.

---

## Proposed Changes

### 1. Update `features/support/hooks.ts` (D-T11-1)
- Replace the specialized `After('@loan or @contract-matrix', ...)` hook with:
  ```typescript
  // TRIAGE-11 (DR-PB-06 boot→seed→use, design doc §5.5 symmetric reset bracket, R-07):
  // re-seed after every @mutates scenario so subsequent scenarios read clean seed state.
  // Subsumes @loan and @contract-matrix without double-seeding — initializeDB resets both
  // data and admin parameters.
  After('@mutates or @loan or @contract-matrix', async function ({ pickle }) {
    assertResetAllowed(pickle.name);
    await seedDatabase(BASE_URL);
  });
  ```
- Consume `assertResetAllowed(pickle.name)` from `src/quality/seed-ownership.ts`.

### 2. Extract Guard to `src/quality/seed-ownership.ts` and Add Unit Tests (D-T11-2)
- In `src/quality/seed-ownership.ts`, export:
  ```typescript
  /** Refuse a reset attempt while the smoke-safety runner owns the seed state. */
  export function assertResetAllowed(scenarioName: string, env: NodeJS.ProcessEnv = process.env): void {
    if (seedOwnedExternally(env)) {
      throw new Error(
        `smoke-safety owns the seed state; scenario "${scenarioName}" would reset it. @smoke scenarios must not trigger a reset hook.`
      );
    }
  }
  ```
- In `tests/unit/seed-ownership.test.ts`, add unit tests:
  - `assertResetAllowed throws descriptive error when smoke-safety owns the seed state`
  - `assertResetAllowed passes silently when seed state is not owned externally`
- Suite unit test count expands from 78 to 80.

### 3. Empirical Must-Fail Proof Protocol (D-T11-3)
- Author temporary assertion in `features/api/b3-rest-soap-parity.feature`:
  - In scenario `SOAP and REST agree on a seeded account without any mutation`, add step:
    `And both reads agree the balance is exactly $-2300.00` (or verify via temporary step in `features/api/steps/api.steps.ts`).
- **MF-1 (Pre-Fix Defect Proof):**
  - Without `After('@mutates')`, run `npx cucumber-js --profile api --tags "@smoke"`: PASSES (exit 0) because no mutating scenario ran prior to B3.
  - Run full suite `npm run test:api`: FAILS (exit 1) because `b2-stateful-flow.feature` ran first and mutated account 12345's balance.
- **MF-2 (Post-Fix Verification Proof):**
  - With `After('@mutates or @loan or @contract-matrix')` active:
  - Run `npx cucumber-js --profile api --tags "@smoke"`: PASSES (exit 0).
  - Run full suite `npm run test:api`: PASSES (exit 0) because B2's mutating scenarios re-seeded the database upon completion.
- Revert temporary fixture step so feature files retain their clean original assertions. Record exact commands, outputs, and exit codes in implementation log.

### 4. Run-Time Overhead Measurement (D-T11-4)
- Profile wall-clock execution time for `npm run test:api` and `npm run test:ui` before and after adding `After('@mutates')`.
- API lane adds 6 re-seeds (total 7); UI lane adds 5 re-seeds (total 7).
- Each `POST /initializeDB` call takes ~100–250ms on local SUT. Expected added run-time is ~1.0–2.0s per lane, well within timeouts.
- Record exact timings in implementation log and backlog v45.

### 5. Update Operational Documentation (D-T11-5)
- In `docs/design-document.md` §5.5, update text and ASCII diagram:
  ```
  beforeEach mutating scenario:  POST initializeDB  → expect 204
  afterEach mutating scenario:   POST initializeDB  → expect 204 (TRIAGE-11 symmetric bracket)
  ```
  Noting that read-only scenarios run against seed state regardless of scenario execution order.

---

## Decisions for Owner Review

| ID | Topic | Options Considered | Recommended | Reason |
|---|---|---|---|---|
| **D-T11-1** | `After` hook tag expression | **Option A:** Single `After('@mutates or @loan or @contract-matrix')` hook.<br>**Option B:** Two separate hooks `After('@mutates')` and `After('(@loan or @contract-matrix) and not @mutates')`. | **Option A** | Cucumber evaluates a single hook's boolean `or` tag expression once per scenario, guaranteeing zero double-seeding while keeping all three tags protected in one place. |
| **D-T11-2** | Guard modularity & unit testing | **Option A:** Export `assertResetAllowed` from `src/quality/seed-ownership.ts` and unit-test it in `tests/unit/seed-ownership.test.ts`.<br>**Option B:** Keep `refuseResetWhileSeedOwned` private inside `features/support/hooks.ts` without dedicated unit tests. | **Option A** | Follows framework pattern of extracting pure logic into `src/quality/` and verifying with SUT-independent unit tests (expanding suite 78 → 80). |
| **D-T11-3** | Must-fail proof scope | **Option A:** Execute temporary absolute-balance fixture in B3, capture exact pre-fix failure and post-fix success in implementation log, and revert.<br>**Option B:** Permanently retain an absolute-balance step in B3. | **Option A** | Matches the TRIAGE-02 precedent; preserves FR-B3's specific focus on protocol parity while empirically demonstrating defect resolution. |
| **D-T11-4** | Run-time profiling | Measure and document the exact run-time delta of `npm run test:api` and `npm run test:ui` in the implementation log and backlog. | **Approved** | Directly satisfies the acceptance requirement to record the run-time cost of the after-resets. |
| **D-T11-5** | Design doc alignment | Update `docs/design-document.md` §5.5 to document the symmetric reset bracket. | **Approved** | Keeps architectural documentation synchronized with operational code. |

---

## Verification & Acceptance Plan

1. **Unit Tests:** `npm run test:unit` passes 80/80 (adding 2 new unit tests for `assertResetAllowed`).
2. **Tag Linting:** `npm run lint:tags` passes (confirming 3 smoke scenarios, zero `@smoke` + `@mutates` collisions).
3. **Smoke Safety:** `npm run check:smoke-safety` passes (confirming `@smoke` lane makes zero mutations and triggers no reset hooks).
4. **Empirical Must-Fail Proof:** Pre-fix MF-1 fails in full API run and passes in `@smoke`; post-fix MF-2 passes in both full API run and `@smoke`.
5. **Full Project Contract:**
   - `npm run typecheck` passes all 4 configurations (`root`, `scripts`, `test-style-02`, `test-style-03`).
   - `npm run verify` passes with teardown.
   - PR CI `sut-boot-gate` passes on GitHub Actions.
