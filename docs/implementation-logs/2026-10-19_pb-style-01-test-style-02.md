<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-10-19_pb-style-01-test-style-02.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# PB-STYLE-01 — `test-style-02/`, plain Playwright Test style — 2026-10-19

## Session Summary

The goal was to implement the `sdet-technical-task` fund-transfer brief (from `D:\gb-dev\tech-tests\live-session-02`) as a
second, mainstream test style in this repository, in plain `@playwright/test` with page objects, `APIRequestContext` and
fixtures, against the pinned Docker SUT. It is delivered as `test-style-02/` with 12 green tests and a separate CI step.
The existing `npm run verify` contract is untouched and still green. A PR is opened for the owner to merge.

---

## Objectives

1. ✅ Probe the live SUT's `/transfer` rejection contract and ledger shape (plan Step 0)
2. ✅ Add `@playwright/test ~1.61.1` and the `typecheck:style-02` / `test:style-02` scripts (D1a)
3. ✅ Scaffold `test-style-02/` (config, global seed, tsconfig, page objects, API helper, fixtures)
4. ✅ Implement brief Parts 1, 2 and 3 with discovered account IDs
5. ✅ Verify: 3 consecutive green runs, must-fail checks, and the unchanged `verify`
6. ✅ CI step and docs (README, DR-PB-12, design doc §5.11, naming, backlog)
7. ⏸️ Merge and post-merge CI evidence (the owner merges), plus the portfolio capability-matrix row (root-repo PR)

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Node test runner | Framework unit | 36/36 | 36/36 | ✅ PASS |
| Cucumber | `@smoke` (api + ui) | 3/3 | 3/3 | ✅ PASS (seed byte-identical) |
| Cucumber + Screenplay | API lane | 14/14 | 14/14 | ✅ PASS |
| Serenity/JS + Playwright | UI lane | 8/8 | 8/8 | ✅ PASS |
| Report check | Serenity JSON | 8/8 | 8/8 | ✅ PASS (HTML in CI only; no local JDK) |
| Playwright Test | `test-style-02` | — | 12/12 (×4 runs) | ✅ PASS |

---

## Changes Implemented

### Dependency and scripts

**Files changed:**
- `package.json`, `package-lock.json`:
  - `@playwright/test ~1.61.1`, resolving to 1.61.1, which depends on the already-pinned `playwright 1.61.1` (same Chromium build)
  - scripts `typecheck:style-02` and `test:style-02`
- `.gitignore`: `test-style-02/test-results/` and `playwright-report/`

### The suite

**Files added under `test-style-02/`:**
- `playwright.config.ts`: serial, 1 worker, 0 retries, list + html reporters, trace and screenshot on failure. `baseURL`
  is the origin only (`PARABANK_URL`), so full `/parabank/...` paths can't hit the trailing-slash pitfall.
- `global-setup.ts`: `initializeDB` → 204, failing fast with a clear message. `PARABANK_SKIP_RESET=1` guards shared environments.
- `tests/pages/{login,nav,transfer}.page.ts`: native locators (`input[name=…]`, `getByRole`, `#transferForm #…`).
  `TransferPage.submitTransfer` waits for each concrete `<option value>` before selecting.
- `tests/support/parabank-api.ts`: a typed helper over `APIRequestContext`, with `Accept: application/json`, query-param
  mutations, raw `transfer()` for negative tests, and money in integer cents.
- `tests/support/accounts.ts`: `discoverCustomer`, which logs in through the API and picks the first CHECKING account at ≥ $100
  and the first SAVINGS account, creating one if absent.
- `tests/support/fixtures.ts`: `test.extend` with `api`, `customer` and the page objects.
- `tests/fund-transfer-fe.spec.ts`: Part 1, one test with Given/When/Then/And `test.step`s and a REST balance cross-check.
- `tests/fund-transfer-api.spec.ts`: Part 2 valid; 6 data-driven rejections, each also asserting no balance change;
  3 annotated `sut-quirk` acceptances; and the Part 3 ledger debit, isolated by a before/after transaction-ID diff and a
  distinctive amount (13.57).

### CI

**Files changed:**
- `.github/workflows/ci.yml`: a step after `npm run verify` runs `typecheck:style-02` and `test:style-02`, and uploads
  `test-style-02-report` with the already-pinned `upload-artifact` SHA. No new actions.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| The happy-path source is the first CHECKING account with ≥ $100 | The seed's first CHECKING account (12345) is −2300.00, so "first CHECKING" would make the happy path a silent overdraft | First CHECKING account, or hard-coding 13122 (the brief forbids hard-coding) |
| `PARABANK_SKIP_RESET` guard | D4(b) permits the public demo, and a global `initializeDB` there would reset a shared environment | Seeding unconditionally, or removing the global seed |
| Rejected cases also assert the balance is unchanged | "Rejected" should mean no side effect, not just a 4xx/5xx status | Status-only assertions |
| Same-account transfer goes in the observed-acceptance group | Step 0 showed a 200 response; asserting it as rejected would break §5.7 | Omitting it |

Structural decision recorded as **DR-PB-12**.

---

## Documentation Updates

- `test-style-02/README.md`: how to run it, the requirement map, the observed rejection table, and the style comparison
- `README.md`: a "Second test style" section
- `docs/decision-register.md`: DR-PB-12
- `docs/design-document.md`: v1.9, §5.11
- `docs/naming-conventions.md`: the `*.spec.ts` / `*.page.ts` convention, scoped to `test-style-02/`
- `docs/backlog.md`: v31, PB-STYLE-01
- `docs/implementation-plans/…pb-style-01…md`: approval recorded and Outcome appended; index row added

---

## Lessons Learned

- **The response content type lies:** `/transfer` answers `application/json` with a plain-text body. Read `.text()`, never `.json()`.
- **The account-not-found wording differs by endpoint:** account reads give `Could not find account #N`, but transfers give
  `Could not find account number A and/or B`. Assert per endpoint, not from memory.
- **A missing amount is a 500 HTML page, not a validation 4xx.** It still counts as "rejected", and the test asserts it as observed.
- **"First account of type X" isn't a neutral choice** when the seed holds negative balances. Discovery criteria are part of the test design.
- **The two styles don't mix at code level** (the source scaffold's `By`/`.describedAs()` inside a Playwright POM). Selector
  knowledge moves between them as facts.
