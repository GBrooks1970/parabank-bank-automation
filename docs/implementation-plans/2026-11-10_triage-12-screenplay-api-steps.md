---
version: 1
created: 2026-11-10T00:15Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-12 (approved worklist item; proposed backlog candidate)
status: approved
approved: 2026-11-10 (owner)
presented: 2026-11-10
language: en-GB
---

# Implementation plan: TRIAGE-12, move API step logic into Screenplay Tasks and Questions so steps stay one line

**Goal.** Eliminate Screenplay abstraction leaks in the API lane (`features/api/steps/api.steps.ts`) by replacing direct ability calls (`abilityTo`) and embedded business/assertion logic with dedicated Screenplay Tasks and Questions in `src/screenplay/tasks.ts` and `src/screenplay/questions.ts`. Unify duplicate step bodies, encapsulate boundary-transfer orchestration and verification into Screenplay Tasks, encapsulate SOAP fault-path execution and result questions, and ensure every step definition in `api.steps.ts` is exactly one line thick. Resolves Claude v1 review finding R-08 (LOW, 5).

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-12 (`Claude v1 R-08 (LOW, 5)`).
- Review findings: Claude v1 review R-08 in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md` §2.8 and `03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md`.
- Key files:
  - `features/api/steps/api.steps.ts` (API Cucumber step definitions)
  - `src/screenplay/core.ts` (hand-rolled Screenplay core, line 4: "step definitions stay one line thick")
  - `src/screenplay/tasks.ts` (imperative Tasks for Lane B)
  - `src/screenplay/questions.ts` (noun-phrase Questions for Lane B)
  - `src/screenplay/abilities.ts` (`CallParaBankRest`, `CallParaBankSoap`)
  - `tests/unit/` (unit test suite)

---

## Evidence Gathered Before Planning

All reads conducted in worktree `wt-parabank-t12` on branch `worklist/triage-12-screenplay-api-steps` tracking `origin/main` at `2b3afa9` (following TRIAGE-11 delivery outcome merge), with Node 24.18.0 and npm 11.16.0.

1. **Direct Ability Calls in `features/api/steps/api.steps.ts`:**
   - A search for `abilityTo` in `features/api/steps/api.steps.ts` yielded exactly 7 occurrences across two distinct areas:
     - Lines 28–42 (REST reads):
       ```typescript
       When("customer {int}'s accounts are read via REST", async function (this: PBWorld, customerId: number) {
         await this.actor.abilityTo(CallParaBankRest).call((c) => c.accounts(customerId));
       });

       When('account {int} is read via REST', async function (this: PBWorld, accountId: number) {
         await this.actor.abilityTo(CallParaBankRest).call((c) => c.account(accountId));
       });

       When('account {int} is read via REST expecting failure', async function (this: PBWorld, accountId: number) {
         await this.actor.abilityTo(CallParaBankRest).call((c) => c.account(accountId));
       });

       When("account {int}'s transactions are read via REST", async function (this: PBWorld, accountId: number) {
         await this.actor.abilityTo(CallParaBankRest).call((c) => c.transactions(accountId));
       });
       ```
     - Lines 239–250 (SOAP fault path):
       ```typescript
       When('a SOAP getAccount call is made for account {int} with unqualified parameters', async function (this: PBWorld, accountId: number) {
         await this.actor.abilityTo(CallParaBankSoap).call('getAccount', { accountId }, { qualifyParams: false });
       });

       Then('the SOAP response status is {int}', function (this: PBWorld, status: number) {
         assert.equal(this.actor.abilityTo(CallParaBankSoap).last.status, status);
       });

       Then('the SOAP fault mentions {string}', function (this: PBWorld, text: string) {
         const fault = this.actor.abilityTo(CallParaBankSoap).last.fault ?? '(no fault)';
         assert.ok(fault.includes(text), `fault '${fault}' does not mention '${text}'`);
       });
       ```
   - In both areas, the step definitions bypass the Screenplay abstraction, reaching directly into the actor's abilities to invoke transport methods or inspect raw state.

2. **Step Body Duplication in `features/api/steps/api.steps.ts`:**
   - Lines 32–34 and 36–38 have identical bodies:
     - Line 32: `When('account {int} is read via REST', ...)` -> `await this.actor.abilityTo(CallParaBankRest).call((c) => c.account(accountId));`
     - Line 36: `When('account {int} is read via REST expecting failure', ...)` -> `await this.actor.abilityTo(CallParaBankRest).call((c) => c.account(accountId));`
   - In Cucumber.js, these two step patterns can be unified into a single regex step definition:
     `When(/^account (\d+) is read via REST(?: expecting failure)?$/, ...)`
     which matches both `When account 12345 is read via REST` (in `b1-rest-contract.feature:17`) and `When account 99999 is read via REST expecting failure` (in `b4-negative-paths.feature:9`).

3. **Boundary-Transfer Business Logic in Steps (Lines 143–194):**
   - Lines 143–152 define `AmountBoundary` and `BoundaryTransferObservation` in the step file.
   - The `When` step (lines 154–174) resolves boundary amounts ('zero' -> 0, 'minimum-positive' -> 0.01, 'exact-available' -> source balance), queries account balances via `TheAccount`, validates positive source balance, saves state in actor memory, and attempts `Transfer`.
   - The `Then` step (lines 176–194) pulls the observation from memory, queries `TheLastResponse`, performs status and text assertions, queries fresh balances from `TheAccount`, and verifies expected balance deductions and additions.
   - Moving this orchestration and verification into dedicated Screenplay Tasks (`TransferBoundaryAmount` and `VerifyBoundaryTransfer`) restores the one-line step promise.

4. **Additional Multi-Line Logic in API Steps:**
   - Account creation (lines 85–89): `NewAccountType` dictionary indexing and undefined assertion.
   - Transaction verification (lines 129–139): mapping descriptions and iterating over expected matches.
   - Balance tracking (lines 97–127): reading account, calculating expected balance via `round2`, asserting equality, and updating `trackedBalance`.
   - REST/SOAP parity (lines 217–235): reading REST and SOAP accounts, storing in actor memory, comparing keys, and calculating balance delta.

5. **Dry-Run & Baseline Verification:**
   - `npx cucumber-js --profile api --dry-run` confirms 14 scenarios and 49 steps currently bind without errors in 0.082s.
   - `npm run test:unit` confirms all 80 unit tests pass cleanly.
   - `npm run typecheck` and `npm run lint:tags` pass cleanly.

---

## Proposed Changes

### 1. Dedicated REST Read Tasks in `src/screenplay/tasks.ts` (D-T12-1)
- Add Tasks implementing `Task` (`performAs(actor: Actor): Promise<void>`):
  - `ReadAccount.withId(accountId: number)`: calls `rest.call((c) => c.account(accountId))` without asserting HTTP 200, allowing negative/failure scenarios to capture non-200 responses in `lastResponse`.
  - `ReadAccounts.ofCustomer(customerId: number)`: calls `rest.call((c) => c.accounts(customerId))`.
  - `ReadTransactions.forAccount(accountId: number)`: calls `rest.call((c) => c.transactions(accountId))`.

### 2. Unify Duplicate Read Steps in `features/api/steps/api.steps.ts` (D-T12-2)
- Replace lines 32–38 with a single unified step definition:
  ```typescript
  When(/^account (\d+) is read via REST(?: expecting failure)?$/, async function (this: PBWorld, accountId: string) {
    await this.actor.attemptsTo(ReadAccount.withId(Number(accountId)));
  });
  ```
- Replace line 28 with:
  ```typescript
  When("customer {int}'s accounts are read via REST", async function (this: PBWorld, customerId: number) {
    await this.actor.attemptsTo(ReadAccounts.ofCustomer(customerId));
  });
  ```
- Replace line 40 with:
  ```typescript
  When("account {int}'s transactions are read via REST", async function (this: PBWorld, accountId: number) {
    await this.actor.attemptsTo(ReadTransactions.forAccount(accountId));
  });
  ```

### 3. Encapsulate Boundary Transfer in Screenplay Tasks (D-T12-3)
- In `src/screenplay/tasks.ts`:
  - Define `AmountBoundary` and `BoundaryTransferObservation`.
  - Add `TransferBoundaryAmount.of(boundaryName).from(fromAccountId).to(toAccountId)`: encapsulates boundary validation, source/target balance reading, amount calculation, memory recording, and transfer attempt.
  - Add `VerifyBoundaryTransfer.succeeded()`: encapsulates memory retrieval, HTTP status/content-type/text validation, fresh balance queries, and exact math verification.
- In `features/api/steps/api.steps.ts`:
  - Refactor both steps to pure one-line delegations:
    ```typescript
    When(
      'he transfers the {string} amount boundary from account {int} to account {int}',
      async function (this: PBWorld, boundary: string, from: number, to: number) {
        await this.actor.attemptsTo(TransferBoundaryAmount.of(boundary).from(from).to(to));
      }
    );

    Then(
      'the boundary transfer succeeds and both balances change by the resolved amount',
      async function (this: PBWorld) {
        await this.actor.attemptsTo(VerifyBoundaryTransfer.succeeded());
      }
    );
    ```

### 4. Encapsulate SOAP Operations & Assertions in Screenplay (D-T12-4)
- In `src/screenplay/tasks.ts`:
  - Add `CallSoapGetAccount.withUnqualifiedParameters(accountId: number)`: performs `CallParaBankSoap.call('getAccount', { accountId }, { qualifyParams: false })`.
- In `src/screenplay/questions.ts`:
  - Add `TheSoapResponse.status()`: Question returning `number` from `CallParaBankSoap.last.status`.
  - Add `TheSoapResponse.fault()`: Question returning `string` from `CallParaBankSoap.last.fault`.
- In `features/api/steps/api.steps.ts`:
  - Refactor lines 239–250 to:
    ```typescript
    When('a SOAP getAccount call is made for account {int} with unqualified parameters', async function (this: PBWorld, accountId: number) {
      await this.actor.attemptsTo(CallSoapGetAccount.withUnqualifiedParameters(accountId));
    });

    Then('the SOAP response status is {int}', async function (this: PBWorld, status: number) {
      assert.equal(await this.actor.asks(TheSoapResponse.status()), status);
    });

    Then('the SOAP fault mentions {string}', async function (this: PBWorld, text: string) {
      const fault = await this.actor.asks(TheSoapResponse.fault());
      assert.ok(fault.includes(text), `fault '${fault}' does not mention '${text}'`);
    });
    ```

### 5. Encapsulate Remaining Multi-Line Logic into Screenplay Tasks & Questions (D-T12-6)
- **Account creation type validation**:
  - Add `CreateAccount.ofTypeNamed(type: string)` to validate `NewAccountType` inside `CreateAccount` rather than in the step definition.
- **Account verification**:
  - Add `VerifyNewAccount.belongsTo(customerId: number, type: string)`: recalls `newAccount` and asserts `customerId` and `type`.
- **Opening balance & balance change tracking**:
  - Add `RecordOpeningBalance.ofNewAccount()`: recalls `newAccount`, asks `TheAccount`, and remembers `trackedBalance`.
  - Add `VerifyAccountBalance.hasIncreasedBy(amount: number)` and `VerifyAccountBalance.hasDecreasedBy(amount: number)`: recalls `newAccount` and `trackedBalance`, asks `TheAccount`, asserts delta, and updates `trackedBalance`.
  - Add `RecordSeededBalance.ofAccount(accountId: number)`: asks `TheAccount` and stores `seededBalance` and `seededBalanceAccountId`.
  - Add `VerifyAccountBalance.isNegative(accountId: number)`: asks `TheAccount` and asserts balance < 0.
- **Transaction verification**:
  - Add `VerifyTransactions.forNewAccount().includesDescriptions(first: string, second: string)`: recalls `newAccount`, asks `TheTransactions`, and verifies descriptions.
- **REST/SOAP Parity**:
  - Add `ReadAccountViaRestAndSoap.withId(accountId: number)`: asks `TheAccount` and `TheSoapAccount` and remembers `restRead` and `soapRead`.
  - Add `VerifyRestAndSoapParity.agreed()`: asserts deep equality on common properties.
  - Add `VerifyAgreedBalance.isHigherThanSeededBy(amount: number)`: asserts balance difference.

### 6. Architecture Unit Test: Zero Direct Ability Calls in API Steps (D-T12-5)
- Author a dedicated architecture unit test in `tests/unit/screenplay-api-steps.test.ts`:
  - Asserts that `features/api/steps/` does not contain `abilityTo(`.
  - Asserts that every Cucumber step definition in `features/api/steps/api.steps.ts` is exactly one statement/delegation thick.

---

## Key Decisions

- **D-T12-1:** Dedicated REST Read Tasks (`ReadAccount`, `ReadAccounts`, `ReadTransactions`) in `src/screenplay/tasks.ts` rather than ad-hoc lambda closures in steps.
- **D-T12-2:** Unify the two identical step bodies (`account {int} is read via REST` and `account {int} is read via REST expecting failure`) using a single regex step definition `When(/^account (\d+) is read via REST(?: expecting failure)?$/, ...)`.
- **D-T12-3:** Move boundary transfer computation, balance capture, and verification into `TransferBoundaryAmount` and `VerifyBoundaryTransfer` in `src/screenplay/tasks.ts`.
- **D-T12-4:** Provide `CallSoapGetAccount` Task and `TheSoapResponse` Questions in `src/screenplay/` to completely remove `abilityTo(CallParaBankSoap)` from step definitions.
- **D-T12-5:** Add an architecture unit test in `tests/unit/screenplay-api-steps.test.ts` ensuring zero `abilityTo(` calls in API steps and verifying step one-liner discipline.
- **D-T12-6:** Cleanly refactor remaining multi-line API steps so that every step definition in `features/api/steps/api.steps.ts` is a 1-line delegation to `actor.attemptsTo(...)` or `actor.asks(...)`.

---

## Verification Plan

1. **Cucumber Dry-Run:**
   - Execute `npx cucumber-js --profile api --dry-run` to verify that all 14 scenarios and 49 steps continue to bind with 0 undefined steps.
2. **Static & Architecture Verification:**
   - `npm run typecheck`: clean compilation across all TypeScript projects.
   - `grep "abilityTo(" features/api/steps/api.steps.ts`: 0 matches.
   - `npm run lint:tags`: disjoint tags and smoke counts intact.
3. **Unit Test Suite:**
   - Run `npm run test:unit`: suite expands from 80 to 82+ tests (including new architecture test for API step discipline).
4. **Full Verification:**
   - Run `npm run test:api` (14/14 green) and `npm run test:ui` (8/8 green).
   - Run root documentation check: `pwsh -File tools/ci/check-support.ps1 -Only Docs` (9/9 PASS).
5. **CI Gate:**
   - Push branch `worklist/triage-12-screenplay-api-steps`, open PR, and confirm `sut-boot-gate` passes in GitHub Actions.
