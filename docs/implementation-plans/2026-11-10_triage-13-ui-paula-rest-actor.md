---
version: 1
created: 2026-11-10T08:25Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-13 (approved worklist item; proposed backlog candidate)
status: approved
approved: 2026-11-10 (owner)
presented: 2026-11-10
language: en-GB
---

# Implementation plan: TRIAGE-13, report UI-lane REST cross-checks through Paula and retire the second actor

**Goal.** Unify the UI lane under Serenity/JS actor Paula by granting her a Serenity/JS Ability wrapping `ParaBankRestClient`, encapsulating REST cross-checks in named Serenity Questions, encapsulating loan admin parameter pinning into a dedicated `PinTheLoanEnvironment` Task (satisfying `destructive-call-sites.test.ts`), storing registration and baseline state in Paula's Serenity Notepad (`TakeNotes` / `notes<UINotes>()`), and eliminating the second hand-rolled actor (`this.actor`) from `features/ui/steps/ui.steps.ts`. Verify that the Serenity BDD report captures named REST cross-check activities and that all test gates pass. Resolves Claude v1 review finding R-08 (score 5, LOW).

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-13 (`Claude v1 R-08 (LOW, 5)`).
- Review findings: Claude v1 review R-08 in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md` §2.8 and `03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md`.
- Key files:
  - `features/ui/steps/ui.steps.ts` (UI Cucumber step definitions, currently mixing `paula()` and `this.actor`)
  - `features/ui/support/serenity.setup.ts` (Serenity/JS Cast configuration for UI lane)
  - `src/screenplay/abilities.ts` (`CallParaBankRest`)
  - `src/screenplay/ui/tasks.ts` (Lane A UI Tasks)
  - `src/screenplay/ui/questions.ts` (Lane A UI Questions)
  - `src/screenplay/ui/notes.ts` (new typed UI notes interface for Paula's Notepad)
  - `src/quality/report-integrity.ts` and `scripts/check-report.ts` (Serenity report verification)
  - `tests/unit/destructive-call-sites.test.ts` (DR-PB-13 architecture guard)
  - `tests/unit/screenplay-ui-steps.test.ts` (new architecture guard retiring `this.actor` from UI steps)

---

## Evidence Gathered Before Planning

All reads conducted in worktree `wt-parabank-t13` on branch `worklist/triage-13-ui-paula-rest-actor` tracking `origin/main` at `c02cb6e` (following TRIAGE-12 delivery outcome merge), with Node 24.18.0 and npm 11.16.0.

1. **Two-Actor Pattern in `features/ui/steps/ui.steps.ts`:**
   - Audit of `features/ui/steps/ui.steps.ts` revealed that every UI scenario currently instantiates and uses two separate actor implementations:
     - Serenity/JS `Paula` (`paula() = actorCalled('Paula')`) drives the Playwright browser.
     - Hand-rolled `Tess` (`this.actor` from `PBWorld.actor`, constructed in `features/support/hooks.ts:30-33`) is invoked in 14 places for:
       - Customer registration memory (lines 80, 85, 94, 99): `this.actor.remember('registration', ...)` and `this.actor.recall<NewCustomerDetails>('registration')`.
       - Funding baseline balance recording (lines 106–107, 111–112): `this.actor.asks(TheAccount.withId(...))` and `this.actor.remember(...)`.
       - Capturing UI-created account ID and opening balance (lines 125, 129, 132): `this.actor.remember('uiNewAccountId', ...)` and `this.actor.asks(...)`.
       - REST balance comparison assertions (lines 136–139, 156–159, 186–187): `assert.equal(account.balance, round2(...))`.
       - REST transaction verification (lines 165–166, 192–196): `this.actor.asks(TheTransactions.forAccount(...))` and `assert.ok(hasDescription(...))`.
       - Parameter pinning (lines 202–210): `this.actor.abilityTo(CallParaBankRest).call((c) => c.setParameter(...))`.
   - As documented in Claude v1 R-08: "In the UI lane each scenario uses two actors from two Screenplay implementations: Serenity/JS Paula drives the browser while the hand-rolled Tess (this.actor) performs REST cross-checks and even stores Paula's registration details."

2. **Absence of REST Activities in Serenity Report JSON:**
   - Inspection of `parabank-bank-automation/target/site/serenity/scenario-transfer-between-two-seeded-accounts-verified-via-rest-0887d7508a.json` revealed:
     - Steps using Serenity/JS (e.g. `When she transfers...`, `Then the UI confirms...`) contain `children: 1` or `children: 2` representing child activities (`TransferFundsUI`, `Ensure.that`).
     - REST cross-check steps (e.g. `Given the REST balances of accounts 12345 and 12456 are recorded`, `And via REST account 12345 decreased...`, `And via REST account 12345 has a "Funds Transfer Sent" transaction...`) contain `children: 0`.
     - Because `node:assert` and `this.actor` bypassed Serenity/JS, the Serenity report recorded no activities for the REST cross-checks, rendering the strongest oracle checks invisible in the test report.

3. **Destructive Call-Site Guard (`tests/unit/destructive-call-sites.test.ts`):**
   - Line 37 of `tests/unit/destructive-call-sites.test.ts` lists:
     `'features/ui/steps/ui.steps.ts': { marker: null, reason: 'calls the guarded ParaBankRestClient.setParameter only' },`
   - Moving `setParameter` out of `features/ui/steps/ui.steps.ts` into a new Task `PinTheLoanEnvironment` in `src/screenplay/ui/tasks.ts` requires updating `ALLOWED` in `destructive-call-sites.test.ts` to replace `features/ui/steps/ui.steps.ts` with `src/screenplay/ui/tasks.ts`.

4. **Serenity/JS Ability & Notepad Capabilities:**
   - Serenity/JS `@serenity-js/core` exports `Ability`, `Question`, `Task`, `Interaction`, and `notes`.
   - `Cast.where(actor => actor.whoCan(BrowseTheWebWithPlaywright.using(browser, ...), TakeNotes.usingAnEmptyNotepad(), CallParaBankRest.using(new ParaBankRestClient(BASE_URL))))` enables Paula to perform web interactions, store typed scenario notes (`theNotes().set(key, value)`), and make REST queries via `CallParaBankRest.as(actor)`.
   - Serenity/JS `@serenity-js/assertions` exports `Ensure`, `equals`, `isGreaterThan`, `containAtLeastOneItemThat`, `includes`, and `and`, enabling expressive assertion activities that log directly into the Serenity report.

---

## Key Decisions

### Decision D-T13-1: Serenity Ability for Paula
- **Context:** Paula needs an ability to interact with the ParaBank REST API during UI scenarios.
- **Options:**
  - *Option A (Recommended):* Adapt `CallParaBankRest` in `src/screenplay/abilities.ts` to extend `Ability` from `@serenity-js/core` and provide static helpers `CallParaBankRest.using(client)` and `CallParaBankRest.as(actor)`.
  - *Option B:* Create a separate, duplicate class `CallParaBankRestSerenity` in `src/screenplay/ui/abilities.ts`.
- **Selection:** Option A. Unified ability model: in TypeScript/JavaScript, a class extending Serenity's `Ability` still satisfies Lane B's lightweight `Ability = object` interface (`src/screenplay/core.ts`), allowing both actors (`Paula` and `Tess`) to use the exact same ability class without duplicate implementations.

### Decision D-T13-2: Screenplay Notes and Registration Memory
- **Context:** Steps need to share registration details, account IDs, and baseline balances between Given, When, and Then steps in a scenario.
- **Options:**
  - *Option A (Recommended):* Define strongly-typed `UINotes` in `src/screenplay/ui/notes.ts` leveraging Serenity's `notes<UINotes>()` (`theNotes()`). Paula records values via `theNotes().set(key, value)` (which records a Serenity activity) and reads them via `theNotes().get(key)` / `actor.answer(theNotes().get(key))`.
  - *Option B:* Store temporary state in step-file variables or `PBWorld` properties.
- **Selection:** Option A. Standard Screenplay idiom for actor state between steps (consistent with `test-style-03/tests/screenplay/notes.ts`), avoids mutable file-scoped state, and integrates directly with Serenity's scenario lifecycle.

### Decision D-T13-3: Serenity Questions for REST Cross-Checks
- **Context:** REST balances, customer IDs, and transaction descriptions must be queried and asserted via Serenity/JS so that they appear as named activities in the Serenity report.
- **Options:**
  - *Option A (Recommended):* Implement named Serenity Questions in `src/screenplay/ui/questions.ts`:
    - `TheRestAccount.withId(accountId: Answerable<number>)`: returns `Account`
    - `TheRestAccountBalance.of(accountId: Answerable<number>)`: returns `number`
    - `TheRestAccountCustomerId.of(accountId: Answerable<number>)`: returns `number`
    - `TheRestTransactions.forAccount(accountId: Answerable<number>)`: returns `Transaction[]`
    - `TheRestTransactionDescriptions.forAccount(accountId: Answerable<number>)`: returns `string[]`
    Assert outcomes in step definitions using `Ensure.that(...)` with Serenity predicates (`equals`, `isGreaterThan`, `containAtLeastOneItemThat(includes(...))`, `containAtLeastOneItemThat(and(includes(...), includes(...)))`).
  - *Option B:* Keep `node:assert` calls in steps and only use Serenity Questions to fetch data.
- **Selection:** Option A. `Ensure.that(...)` generates child activity nodes in the Serenity report, ensuring the report shows explicit proof of the REST cross-checks.

### Decision D-T13-4: Loan Environment Parameter Pinning Task
- **Context:** The loan UI scenario pins the local down-payment processor threshold to 20%. This is currently performed inline in `features/ui/steps/ui.steps.ts:201-211`.
- **Options:**
  - *Option A (Recommended):* Implement `PinTheLoanEnvironment(provider?, processor?, threshold?)` Task in `src/screenplay/ui/tasks.ts`. Paula attempts the task in one line: `await paula().attemptsTo(PinTheLoanEnvironment());`. Update `ALLOWED` in `tests/unit/destructive-call-sites.test.ts` to replace `features/ui/steps/ui.steps.ts` with `src/screenplay/ui/tasks.ts`.
  - *Option B:* Place the task in `src/screenplay/tasks.ts`.
- **Selection:** Option A. `PinTheLoanEnvironment` is a Serenity/JS Task performed by Paula in Lane A. Moving it to `src/screenplay/ui/tasks.ts` aligns with the UI task suite and cleanly satisfies the `destructive-call-sites.test.ts` architecture guard.

### Decision D-T13-5: Verification of Named REST Activities in Report Integrity
- **Context:** The acceptance criteria requires: "the regenerated Serenity report shows the cross-checks as named activities (content-checked)".
- **Options:**
  - *Option A (Recommended):* Add `verifyRestCrossCheckActivities(artifactJsonTexts)` in `src/quality/report-integrity.ts`, checking that the UI Serenity JSON artifacts contain child activity records matching expected REST activity descriptions (e.g. `Ensure that the REST balance of account`, `Ensure that the REST transaction descriptions`, `sets loan parameters via REST`). Wire into `scripts/check-report.ts` and add unit tests in `tests/unit/report-integrity.test.ts`.
  - *Option B:* Rely only on visual/manual inspection of the HTML report.
- **Selection:** Option A. Provides permanent automated regression prevention in CI and local `npm run check:report`.

### Decision D-T13-6: Architecture Guard for UI Steps
- **Context:** To ensure `this.actor` is permanently retired from the UI lane and step glue does not regress.
- **Options:**
  - *Option A (Recommended):* Author architecture test `tests/unit/screenplay-ui-steps.test.ts` asserting:
    - 0 occurrences of `this.actor` in `features/ui/steps/ui.steps.ts`
    - 0 occurrences of `abilityTo(` in `features/ui/steps/ui.steps.ts`
    - 0 occurrences of `assert.` / `node:assert` in `features/ui/steps/ui.steps.ts`
  - *Option B:* No unit test.
- **Selection:** Option A. Mirrored after `tests/unit/screenplay-api-steps.test.ts` delivered in TRIAGE-12, providing strict mechanical enforcement.

---

## Proposed Changes

### 1. Ability Adaptation
- File: `src/screenplay/abilities.ts`
  - Update `CallParaBankRest` to extend `Ability` from `@serenity-js/core`.
  - Add static methods `CallParaBankRest.using(client: ParaBankRestClient): CallParaBankRest` and `CallParaBankRest.as(actor: UsesAbilities): CallParaBankRest`.

### 2. Serenity Cast Configuration
- File: `features/ui/support/serenity.setup.ts`
  - In `Before()` hook, grant Paula `CallParaBankRest.using(new ParaBankRestClient(BASE_URL))` alongside `BrowseTheWebWithPlaywright` and `TakeNotes`.

### 3. Strongly-Typed UI Notes
- File: `src/screenplay/ui/notes.ts` (new file)
  - Define `UINotes` interface covering `registration`, `fundingBaseline`, `uiNewAccountId`, `uiNewAccountBalance`, `payeeName`, `billAmount`, and dynamic keys `baseline:${number}`.
  - Export `theNotes = () => notes<UINotes>()`.

### 4. REST Questions for UI Lane
- File: `src/screenplay/ui/questions.ts`
  - Add `TheRestAccount.withId(accountId)`
  - Add `TheRestAccountBalance.of(accountId)`
  - Add `TheRestAccountCustomerId.of(accountId)`
  - Add `TheRestTransactions.forAccount(accountId)`
  - Add `TheRestTransactionDescriptions.forAccount(accountId)`

### 5. Loan Environment Pinning Task
- File: `src/screenplay/ui/tasks.ts`
  - Add `PinTheLoanEnvironment(provider = 'local', processor = 'down', threshold = '20'): Task` calling `c.setParameter` via Paula's `CallParaBankRest` ability.

### 6. Refactor UI Steps & Retire `this.actor`
- File: `features/ui/steps/ui.steps.ts`
  - Replace all occurrences of `this.actor.remember(...)` with `await paula().attemptsTo(theNotes().set(...))` or inline in tasks.
  - Replace all occurrences of `this.actor.recall(...)` with `await paula().answer(theNotes().get(...))`.
  - Replace all `this.actor.asks(...)` and `assert.equal(...)` with Serenity `Ensure.that(...)` assertions on REST questions.
  - Replace inline `setParameter` loop with `await paula().attemptsTo(PinTheLoanEnvironment());`.
  - Remove unused imports (`assert`, `PBWorld`, `CallParaBankRest`, `TheAccount`, `TheTransactions`, `Account`).

### 7. Destructive Call-Sites Architecture Test
- File: `tests/unit/destructive-call-sites.test.ts`
  - Replace `'features/ui/steps/ui.steps.ts'` in `ALLOWED` with `'src/screenplay/ui/tasks.ts'`.

### 8. Report Integrity Verification
- File: `src/quality/report-integrity.ts`
  - Add `verifyRestCrossCheckActivities(artifactJsonTexts: readonly string[]): { found: string[]; missing: string[] }`.
- File: `scripts/check-report.ts`
  - Wire `verifyRestCrossCheckActivities` into the report check.
- File: `tests/unit/report-integrity.test.ts`
  - Add tests validating detection of presence/absence of REST cross-check activities in report JSON fixtures.

### 9. UI Steps Architecture Test
- File: `tests/unit/screenplay-ui-steps.test.ts` (new file)
  - Assert 0 occurrences of `this.actor`, `abilityTo(`, and `assert.` in `features/ui/steps/ui.steps.ts`.

---

## Test & Verification Plan

1. **Local Test Gates:**
   - Unit tests: `npm run test:unit` (all existing 85 tests + new tests in `report-integrity.test.ts` and `screenplay-ui-steps.test.ts` pass, expanding total to ~89+).
   - Destructive call-sites check: `tests/unit/destructive-call-sites.test.ts` passes with `src/screenplay/ui/tasks.ts` replacing `features/ui/steps/ui.steps.ts`.
   - TypeScript checks: `npm run typecheck`, `npm run typecheck:style-02`, `npm run typecheck:style-03`.
   - Tag lint: `npm run lint:tags`.
   - Smoke safety: `npm run check:smoke-safety`.

2. **UI Lane Execution & Serenity Report Verification:**
   - Run `npm run test:ui` (all 8 UI scenarios pass).
   - Run `npm run report` (Serenity BDD report generates).
   - Run `npm run check:report` (validates 8/8 UI scenarios SUCCESS and verifies presence of named REST cross-check activities).
   - Inspect generated JSON artifacts in `target/site/serenity/` to confirm `children` array contains named REST activities:
     - `Ensure that the REST balance of account ...`
     - `Ensure that the REST transaction descriptions of account ...`
     - `Ensure that the REST customer id of account ...`

3. **PR CI Verification:**
   - Push branch `worklist/triage-13-ui-paula-rest-actor`, open PR, and verify `sut-boot-gate` passes in GitHub Actions.
