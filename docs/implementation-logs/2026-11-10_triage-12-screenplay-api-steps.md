<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-10_triage-12-screenplay-api-steps.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-12: move API step logic into Screenplay Tasks and Questions so steps stay one line, 2026-11-10

## Session Summary

Resolved Claude v1 review finding R-08 (score 5, LOW) by eliminating Screenplay boundary leaks in `features/api/steps/api.steps.ts` and moving all transport calls, business logic, balance arithmetic, and assertions into dedicated Screenplay Tasks and Questions:

1. **Eliminated Direct Ability Calls (D-T12-1, D-T12-4, D-T12-5):**
   - Replaced direct `this.actor.abilityTo(CallParaBankRest)` calls with dedicated Tasks: `ReadAccount.withId(accountId)`, `ReadAccounts.ofCustomer(customerId)`, and `ReadTransactions.forAccount(accountId)` in `src/screenplay/tasks.ts`.
   - Replaced direct `this.actor.abilityTo(CallParaBankSoap)` calls and direct property inspections with `CallSoapGetAccount.withUnqualifiedParameters(accountId)` Task, `TheSoapResponse.status()` / `fault()` Questions, and `VerifySoapResponse` Task.
   - Removed all references to `abilityTo`, `CallParaBankRest`, and `CallParaBankSoap` from `features/api/steps/api.steps.ts`.

2. **Unified Duplicate Step Bodies via Regex (D-T12-2):**
   - Replaced the two duplicate step definitions for reading accounts (`account {int} is read via REST` and `account {int} is read via REST expecting failure`) with a single unified regex step definition:
     `When(/^account (\d+) is read via REST(?: expecting failure)?$/, ...)`
   - Verified that `npx cucumber-js --profile api --dry-run` binds all 14 scenarios and 49 steps without missing or duplicate step errors.

3. **Encapsulated Boundary-Transfer Logic (D-T12-3):**
   - Moved 40+ lines of boundary amount calculation, positive balance checking, observation recording, and balance math verification into `TransferBoundaryAmount.of(boundary).from(from).to(to)` and `VerifyBoundaryTransfer.succeeded()`.
   - Both step definitions in `api.steps.ts` are now single-line Screenplay calls.

4. **Encapsulated Remaining Step Logic into Clean Screenplay Tasks (D-T12-6):**
   - Account creation: `CreateAccount.ofTypeNamed(type).fundedFrom(fromAccountId)` and `VerifyNewAccount.belongsTo(customerId, type)`.
   - Balance tracking: `RecordOpeningBalance.ofNewAccount()`, `VerifyAccountBalance.hasIncreasedBy(amount)` / `hasDecreasedBy(amount)`, `RecordSeededBalance.ofAccount(accountId)`, `VerifyAccountBalance.isNegative(accountId)`.
   - New account transfers & deposits: `DepositIntoNewAccount.of(amount)`, `TransferFromNewAccount.of(amount).to(toAccountId)`.
   - Transactions & parity: `VerifyTransactions.forNewAccount().includeDescriptions(first, second)`, `ReadAccountViaRestAndSoap.withId(accountId)`, `VerifyRestAndSoapParity.agreed()`, `VerifyAgreedBalance.isHigherThanSeededBy(amount)`.
   - Response & contract verification: `VerifyResponse.hasStatus(status)` / `hasPlainTextBody(expected)` / `hasEmptyBody()`, `VerifyOperationConformance.forSpec(PBWorld.spec).conformsTo(name)`, `VerifyContractCoverage.forSpec(PBWorld.spec).hasExpectedCount(count)`.
   - Every single step definition in `features/api/steps/api.steps.ts` is now strictly one statement thick delegating to `await this.actor.attemptsTo(...)`.

5. **Architecture Unit Test (`tests/unit/screenplay-api-steps.test.ts`, D-T12-5):**
   - Added automated architecture unit tests asserting:
     - 0 occurrences of `abilityTo(` in `features/api/steps/api.steps.ts`.
     - No import of `CallParaBankRest` or `CallParaBankSoap` in `api.steps.ts`.
     - Every step definition in `api.steps.ts` delegates to `this.actor.attemptsTo` in a single statement.
     - `CreateAccount.ofTypeNamed` rejects unknown types and resolves valid types.
     - `round2` handles two-decimal money rounding without IEEE noise.
   - Expanded unit test suite from 80 to 85 tests (all passing).

Plan: [`../implementation-plans/2026-11-10_triage-12-screenplay-api-steps.md`](../implementation-plans/2026-11-10_triage-12-screenplay-api-steps.md)
(approved 2026-11-10 by owner, decisions D-T12-1 to D-T12-6 confirmed).

---

## Objectives

1. ✅ Provide Screenplay Tasks and Questions in `src/screenplay/` that encapsulate API domain logic (D-T12-1, D-T12-3, D-T12-4, D-T12-6).
2. ✅ Unify the two identical step bodies for reading an account via REST into a single regex step definition (D-T12-2).
3. ✅ Refactor `features/api/steps/api.steps.ts` to pure 1-line Screenplay delegations (D-T12-2, D-T12-6).
4. ✅ Ensure `grep "abilityTo(" features/api/steps` finds 0 direct client calls (D-T12-5).
5. ✅ Author architecture unit test `tests/unit/screenplay-api-steps.test.ts` verifying seam integrity (D-T12-5).
6. ✅ Preserve 100% passing status across cucumber dry-runs (14 API scenarios, 8 UI scenarios) and unit tests (85/85).
7. ✅ Quality gates: `npm run test:unit` passes 85/85, all four typechecks pass, `lint:tags` passes, portfolio root docs checks pass 9/9.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript | `npm run typecheck` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-02` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-03` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run perf:typecheck` | exit 0 | exit 0 | ✅ PASS |
| Node.js | `npm run test:unit` | 80 pass | 85 pass | ✅ PASS |
| Gherkin | `npm run lint:tags` | exit 0 | exit 0 | ✅ PASS |
| Cucumber | `cucumber-js --profile api --dry-run` | 14 pass / 49 steps | 14 pass / 49 steps | ✅ PASS |
| Cucumber | `cucumber-js --profile ui --dry-run` | 8 pass / 49 steps | 8 pass / 49 steps | ✅ PASS |
| Portfolio CI | `pwsh tools/ci/check-support.ps1 -Only Docs` | 9/9 pass | 9/9 pass | ✅ PASS |

---

## Delivery Outcome

- **Implementation PR:** [#78](https://github.com/GBrooks1970/parabank-bank-automation/pull/78) merged as `858f604` (implementation commit `62e08f7`).
- **PR CI Run:** [Run 42779247839](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/42779247839) passed (`sut-boot-gate` in 4m27s).
- **Unit Tests:** 85/85 passing across 13 test areas in `tests/unit/`.
- **Backlog:** Bumped to **v46**.
