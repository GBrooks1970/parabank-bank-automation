---
version: 1
created: 2026-11-09T17:35Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-04 (approved worklist item; proposed backlog candidate)
status: delivered
approved: 2026-11-09 (owner)
delivered: 2026-11-09 (#70, b3d85c3)
presented: 2026-11-09
language: en-GB
---

# Implementation plan: TRIAGE-04, assert exact displayed transfer and bill-pay amounts

**Goal.** Replace unanchored, truncated substring assertions (`String(Math.trunc(amount))`) in UI transfer and bill-pay confirmation steps with exact formatted currency assertions against dedicated DOM elements and delimited currency parsing in minor units (cents). This resolves Claude v1 review finding R-06 (and September review R-04, LOW 7), ensuring expected amounts like $75.00 strictly reject $175.00, $750.00, or wrong cents ($75.01), while preserving independent REST verification.

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-04 (`review R-04 (LOW); Claude v1 R-06 (LOW, 7)`).
- Review findings: Claude v1 review R-06 (LOW, 7) in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md` §6.
- Key files:
  - `features/ui/steps/ui.steps.ts:145-150,175-180` (current step definition oracles)
  - `src/screenplay/ui/pages.ts` (page element targets)
  - `src/screenplay/ui/questions.ts` (screenplay questions)
  - `src/quality/currency.ts` (new currency formatting, delimited parsing, and minor-units matching helper)
  - `tests/unit/currency.test.ts` (new unit tests asserting strict rejection of false-positive amounts)
  - `test-style-03/tests/screenplay/ui/targets.ts:33-38` (style-03 reference model)
  - `target-app/parabank/src/main/webapp/WEB-INF/jsp/content/transfer.jsp:37-47` (SUT transfer DOM)
  - `target-app/parabank/src/main/webapp/WEB-INF/jsp/content/billpay.jsp:95-105` (SUT bill pay DOM)

---

## Evidence Gathered Before Planning

All reads conducted in worktree `wt-parabank-t04` on branch `worklist/triage-04-exact-amounts` tracking `origin/main` at `8edee12` (following TRIAGE-09 delivery outcome merge), with Node 24.18.0 and npm 11.16.0.

| Finding | Consequence for the plan |
|---|---|
| **Root cause of R-06:** In `features/ui/steps/ui.steps.ts:148,178`, confirmation steps assert `Ensure.that(TheTransferResultText(), includes(String(Math.trunc(amount))))` and `Ensure.that(TheBillPayResultText(), includes(String(Math.trunc(amount))))`. | For $100.00 this checks if substring `"100"` is in `#showResult`; for $75.00 this checks if substring `"75"` is in `#billpayResult`. Displays of $175.00, $750.00, $75.01, or account ids containing `75` all falsely pass. |
| **SUT DOM structure for Transfer:** In `transfer.jsp:37-47`, the success container `#showResult` contains `<span id='amountResult'></span>`, `<span id='fromAccountIdResult'></span>`, and `<span id='toAccountIdResult'></span>`. SUT client JS populates `$('#amountResult').text(formatCurrency(amount))` (`'$' + amount.toFixed(2)`). | `TransferPage` in `src/screenplay/ui/pages.ts` can expose dedicated target `amountResult: PageElement.located(By.id('amountResult'))`, matching style-03 (`TransferResult.amount`). |
| **SUT DOM structure for Bill Pay:** In `billpay.jsp:95-105`, the success container `#billpayResult` contains `<span id='payeeName'></span>`, `<span id='amount'></span>`, and `<span id='fromAccountId'></span>`. SUT client JS populates `$('#amount').text(currencyFormat(response.amount))` (`'$' + amount.toFixed(2)`). | `BillPayPage` in `src/screenplay/ui/pages.ts` can expose dedicated target `amountResult: PageElement.located(By.css('#billpayResult #amount'))`. |
| **Style-03 Model:** `test-style-03/tests/fund-transfer-fe.spec.ts:39-42` asserts `Ensure.that(Text.of(TransferResult.amount), equals('$50.00'))`. | Main lane can follow this pattern with `equals(formatCurrency(amount))` and dedicated questions conforming to `docs/naming-conventions.md`. |
| **Acceptance Criteria for Minor Units:** Worklist TRIAGE-04 specifies: "use dedicated amount elements or delimited currency parsing and compare minor units; expected 75 rejects 175/750 and incorrect cents". | A dedicated helper `src/quality/currency.ts` provides both delimited parsing into minor units (integer cents) and exact formatting, with unit tests asserting strict rejection of false positives. |
| **File Coordination:** `features/ui/steps/ui.steps.ts` is also listed under TRIAGE-13 (retiring second actor `this.actor`). | TRIAGE-04 touches only lines 145-150 and 175-180 (UI confirmation steps), leaving `this.actor` and REST assertions untouched so TRIAGE-13 builds on a clean baseline. |

---

## Design Options & Proposed Architecture

### 1. Dedicated DOM Element Targets vs Container Parsing (D-T04-1)
- **Option A (Recommended):** Add dedicated DOM element targets to `src/screenplay/ui/pages.ts`:
  - `TransferPage.amountResult`: `PageElement.located(By.id('amountResult')).describedAs('transferred amount')`
  - `BillPayPage.amountResult`: `PageElement.located(By.css('#billpayResult #amount')).describedAs('bill payment amount')`
  - Container text questions `TheTransferResultText` and `TheBillPayResultText` are retained for checking overall confirmation titles (`'Transfer Complete'` and `'Bill Payment Complete'`).
- **Option B:** Only parse container text using regular expressions. Rejected: fragile and ignores dedicated `<span>` elements already provided by ParaBank's JSP.

### 2. Screenplay Questions (D-T04-2)
- In `src/screenplay/ui/questions.ts`:
  - `TheTransferResultAmount = () => Text.of(TransferPage.amountResult).describedAs('the transferred amount')`
  - `TheBillPayResultAmount = () => Text.of(BillPayPage.amountResult).describedAs('the bill payment amount')`
  - Conforms to noun-phrase naming convention in `docs/naming-conventions.md`.

### 3. Currency Formatting & Minor Units Helper (D-T04-3)
- In `src/quality/currency.ts`:
  - `toMinorUnits(amount: number): number`: Converts decimal dollar amount to integer cents via `Math.round(amount * 100)`.
  - `formatCurrency(amount: number): string`: Formats dollar amount as `'$' + amount.toFixed(2)` (e.g. `100` → `"$100.00"`, `75` → `"$75.00"`).
  - `parseCurrencyToMinorUnits(raw: string): number`: Parses currency string (`"$75.00"`, `"75.00"`, `"$1,250.50"`) using anchored regex `/^\$?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)\.([0-9]{2})$/`, returning integer cents. Throws `TypeError` or `RangeError` if unanchored, malformed, or missing cents.
  - `isExactCurrencyMatch(rawText: string, expectedAmount: number): boolean`: Returns true iff `parseCurrencyToMinorUnits(rawText) === toMinorUnits(expectedAmount)`.

### 4. UI Step Definition Assertions (D-T04-4)
- In `features/ui/steps/ui.steps.ts`:
  - Transfer step:
    ```typescript
    Then('the UI confirms the transfer of ${float}', async function (this: PBWorld, amount: number) {
      await paula().attemptsTo(
        Ensure.that(TheTransferResultText(), includes('Transfer Complete')),
        Ensure.that(TheTransferResultAmount(), equals(formatCurrency(amount)))
      );
    });
    ```
  - Bill pay step:
    ```typescript
    Then('the UI confirms the bill payment completed for ${float}', async function (this: PBWorld, amount: number) {
      await paula().attemptsTo(
        Ensure.that(TheBillPayResultText(), includes('Bill Payment Complete')),
        Ensure.that(TheBillPayResultAmount(), equals(formatCurrency(amount)))
      );
    });
    ```
  - Drops `Math.trunc(amount)` and loose `includes()` for money assertions completely.
  - Preserves downstream REST balance and transaction history assertions untouched.

### 5. Unit Test Verification (D-T04-5)
- In `tests/unit/currency.test.ts`:
  - Verify `formatCurrency` on integer, single-decimal, and two-decimal amounts.
  - Verify `toMinorUnits` and `parseCurrencyToMinorUnits` round-trip.
  - **Must-Fail / Strict Rejection Cases (acceptance criteria):**
    - Expected 75 ($75.00 = 7500 cents) strictly rejects:
      - `$175.00` (17500 cents)
      - `$750.00` (75000 cents)
      - `$75.01` (7501 cents)
      - `$75.99` (7599 cents)
      - `$7.50` (750 cents)
      - `"$75"` (missing cents decimal)
      - `"Account 12375"` (unanchored account substring)
      - `"The transfer of $75.00 was successful"` (unanchored sentence text)
  - Verify Serenity `equals(formatCurrency(amount))` semantics strictly reject mismatched values.

### 6. Two-PR Cadence (D-T04-6)
- **Implementation PR (`worklist/triage-04-exact-amounts`):**
  - Add `src/quality/currency.ts` and `tests/unit/currency.test.ts`.
  - Update `src/screenplay/ui/pages.ts`, `src/screenplay/ui/questions.ts`, and `features/ui/steps/ui.steps.ts`.
  - Update `docs/implementation-plans/_index.md` and log.
  - Open PR, pass CI, merge into `main`.
- **Outcome PR (`worklist/triage-04-outcome`):**
  - Bump `docs/backlog.md` to **v42** recording delivery of TRIAGE-04 (8 unchecked items remaining).
  - Update plan status to `delivered` with merge SHA.
  - Tick root worklist `WORKLIST_parabank-bank-automation.md`.

---

## Verification Strategy & Must-Fail Checks

1. **Unit Test Suite Integration:**
   - Run `npm run test:unit`. Suite expands from 67 to ~73 tests.
   - SUT-independent, deterministic, fast execution (< 10 s).

2. **Must-Fail Verification:**
   - Unit tests explicitly verify that `isExactCurrencyMatch` and `parseCurrencyToMinorUnits` throw or return false when presented with `$175.00`, `$750.00`, `$75.01`, `$7.50`, and unanchored text containing `"75"`.

3. **Typechecks & Tag Linting:**
   - `npm run typecheck` (zero TypeScript errors).
   - `npm run lint:tags` (passes).
   - `tests/unit/destructive-call-sites.test.ts` (passes without modification).

4. **UI Lane Verification:**
   - In CI (or with local SUT), `test:ui` runs `features/ui/a3-transfer-funds.feature` and `features/ui/a4-bill-pay.feature`.
   - The steps assert `#amountResult` equals `"$100.00"` and `#billpayResult #amount` equals `"$75.00"`.

---

## Decision Points for Owner Review

1. **D-T04-1 (Dedicated Page Targets):** Approve exposing `TransferPage.amountResult` (`#amountResult`) and `BillPayPage.amountResult` (`#billpayResult #amount`).
2. **D-T04-2 (Screenplay Questions):** Approve adding `TheTransferResultAmount` and `TheBillPayResultAmount` in `src/screenplay/ui/questions.ts`.
3. **D-T04-3 (Currency Helper):** Approve creating `src/quality/currency.ts` with `formatCurrency`, `toMinorUnits`, `parseCurrencyToMinorUnits`, and `isExactCurrencyMatch`.
4. **D-T04-4 (Step Oracles):** Approve replacing `includes(String(Math.trunc(amount)))` with `equals(formatCurrency(amount))` on the dedicated amount targets, retaining REST assertions.
5. **D-T04-5 (Unit Test Rejection Proof):** Approve adding `tests/unit/currency.test.ts` covering exact parsing and strict rejection of $175.00, $750.00, and $75.01 for expected $75.00.
6. **D-T04-6 (Two-PR Cadence):** Approve implementation PR followed by outcome PR updating backlog to v42.

---

## Outcome

Delivered in PR [#70](https://github.com/GBrooks1970/parabank-bank-automation/pull/70), merged as `b3d85c3` (implementation commit `5dbe97c`) on 2026-11-09. PR CI run [42683784666](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/42683784666) passed on head `5dbe97c` (`sut-boot-gate` in 2m42s), and post-merge `main` CI run [42684336005](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/42684336005) passed on `b3d85c3` (`sut-boot-gate` in 3m3s).
