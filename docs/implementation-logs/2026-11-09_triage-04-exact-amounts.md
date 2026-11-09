<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-09_triage-04-exact-amounts.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-04: assert exact displayed transfer and bill-pay amounts, 2026-11-09

## Session Summary

Resolved Claude v1 review finding R-06 (and September review R-04, LOW 7) by replacing loose, truncated substring assertions (`String(Math.trunc(amount))`) with exact formatted currency assertions against dedicated DOM targets and delimited currency parsing in minor units (cents).

1. **Dedicated DOM Targets (`src/screenplay/ui/pages.ts`):**
   - Added `TransferPage.amountResult`: `PageElement.located(By.id('amountResult')).describedAs('transferred amount')` (targeting ParaBank's `<span id='amountResult'></span>` in `transfer.jsp:41`, matching style-03).
   - Added `BillPayPage.amountResult`: `PageElement.located(By.css('#billpayResult #amount')).describedAs('bill payment amount')` (targeting ParaBank's `<span id='amount'></span>` in `billpay.jsp:99`).
2. **Screenplay Questions (`src/screenplay/ui/questions.ts`):**
   - Added `TheTransferResultAmount = () => Text.of(TransferPage.amountResult).describedAs('the transferred amount')`.
   - Added `TheBillPayResultAmount = () => Text.of(BillPayPage.amountResult).describedAs('the bill payment amount')`.
3. **Currency Utility (`src/quality/currency.ts`):**
   - `formatCurrency(amount: number): string`: formats amounts strictly as `'$' + amount.toFixed(2)`.
   - `toMinorUnits(amount: number): number`: converts dollar amounts to integer cents (`Math.round(amount * 100)`).
   - `parseCurrencyToMinorUnits(raw: string): number`: anchored regex parser requiring valid currency and 2 decimal places.
   - `isExactCurrencyMatch(rawText: string, expectedAmount: number): boolean`: compares minor units.
   - `assertExactCurrency(rawText: string, expectedAmount: number): void`: asserts exact minor unit equality.
4. **UI Step Definition Oracles (`features/ui/steps/ui.steps.ts`):**
   - Replaced unanchored `Ensure.that(TheTransferResultText(), includes(String(Math.trunc(amount))))` with `Ensure.that(TheTransferResultAmount(), equals(formatCurrency(amount)))`.
   - Replaced unanchored `Ensure.that(TheBillPayResultText(), includes(String(Math.trunc(amount))))` with `Ensure.that(TheBillPayResultAmount(), equals(formatCurrency(amount)))`.
   - Maintained independent REST balance decrements and transaction history assertions.
   - Preserved `this.actor` interactions intact for follow-on item TRIAGE-13.
5. **Unit Tests & Rejection Evidence (`tests/unit/currency.test.ts`):**
   - 6 new unit tests added (expanding suite from 67 to 73 tests).
   - Explicitly verified that for expected $75.00 (7500 cents), false positives `$175.00`, `$750.00`, `$75.01`, `$75.99`, `$7.50`, `"$75"`, `"Account 12375"`, and unanchored sentences are strictly rejected.

Plan: [`../implementation-plans/2026-11-09_triage-04-exact-amounts.md`](../implementation-plans/2026-11-09_triage-04-exact-amounts.md)
(approved 2026-11-09 by owner, decisions D-T04-1 to D-T04-6 confirmed).

---

## Objectives

1. ✅ Dedicated DOM targets: added `TransferPage.amountResult` and `BillPayPage.amountResult` in `src/screenplay/ui/pages.ts` (D-T04-1).
2. ✅ Noun-phrase questions: added `TheTransferResultAmount` and `TheBillPayResultAmount` in `src/screenplay/ui/questions.ts` (D-T04-2).
3. ✅ Currency formatting and minor-units helper: implemented `src/quality/currency.ts` (D-T04-3).
4. ✅ Strict step oracles: updated `features/ui/steps/ui.steps.ts` to assert `equals(formatCurrency(amount))` (D-T04-4).
5. ✅ Strict rejection verification: added `tests/unit/currency.test.ts` rejecting $175, $750, wrong cents, and unanchored text (D-T04-5).
6. ✅ Quality gates: `npm run test:unit` passes 73/73, all four typechecks pass, `lint:tags` passes.
7. ✅ Two-PR cadence: implementation PR followed by outcome PR and root worklist tick (D-T04-6).

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript | `npm run typecheck` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-02` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-03` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run perf:typecheck` | exit 0 | exit 0 | ✅ PASS |
| Toolchain | `npm run lint:tags` | exit 0 | exit 0 | ✅ PASS |
| Architecture | `destructive-call-sites.test.ts` | exit 0 | exit 0 | ✅ PASS |
| Unit Tests | `npm run test:unit` | 67 tests | 73 tests | ✅ PASS (73/73) |

---

## Verification Evidence

1. **Strict Rejection of False Positives:**
   ```typescript
   // tests/unit/currency.test.ts
   // Expected: $75.00
   isExactCurrencyMatch('$175.00', 75.0) === false; // Rejected
   isExactCurrencyMatch('$750.00', 75.0) === false; // Rejected
   isExactCurrencyMatch('$75.01', 75.0) === false;  // Rejected
   isExactCurrencyMatch('Account 12375', 75.0) === false; // Rejected
   ```
2. **Serenity Equality Oracle:**
   - Transfer: `Ensure.that(TheTransferResultAmount(), equals('$100.00'))` on `#amountResult`.
   - Bill Pay: `Ensure.that(TheBillPayResultAmount(), equals('$75.00'))` on `#billpayResult #amount`.

---

## Delivery Outcome

Delivered in PR [#70](https://github.com/GBrooks1970/parabank-bank-automation/pull/70), merged as `b3d85c3` (implementation commit `5dbe97c`) on 2026-11-09. PR CI run [42683784666](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/42683784666) passed on head `5dbe97c` (`sut-boot-gate` in 2m42s), and post-merge `main` CI run [42684336005](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/42684336005) passed on `b3d85c3` (`sut-boot-gate` in 3m3s).

