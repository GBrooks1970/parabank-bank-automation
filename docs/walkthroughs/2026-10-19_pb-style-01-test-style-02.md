# Walkthrough — PB-STYLE-01: `test-style-02/`, plain Playwright Test style

## Executive Summary

The `sdet-technical-task` fund-transfer brief (`D:\gb-dev\tech-tests\live-session-02`) is now implemented as a
second, side-by-side test style in [`test-style-02/`](../../test-style-02/README.md). It uses plain `@playwright/test`
with page objects, an `APIRequestContext` helper, fixtures and `test.step`, against the pinned Docker SUT. All 12 tests
are green locally on 4 runs, the must-fail checks go red as intended, and `npm run verify` is unchanged and green.
The change is on PR [#51](https://github.com/GBrooks1970/parabank-bank-automation/pull/51), which awaits CI and the owner's merge.

## 1. Changes Implemented

**Suite (`test-style-02/`, new)**
- [`playwright.config.ts`](../../test-style-02/playwright.config.ts): serial, 1 worker, 0 retries, list + html reporters,
  trace on failure. `baseURL` is the origin only, so full `/parabank/...` paths avoid the trailing-slash pitfall.
- [`global-setup.ts`](../../test-style-02/global-setup.ts): `initializeDB` → 204 (DR-PB-06), failing fast when the SUT is down.
  `PARABANK_SKIP_RESET=1` protects shared environments.
- [`tests/pages/`](../../test-style-02/tests/pages): `LoginPage`, `LeftNav` and `TransferPage`, using native locators.
  `submitTransfer` waits for each concrete `<option value>` (the async `<select>` race, PBR-07 precedent).
- [`tests/support/`](../../test-style-02/tests/support): `ParaBankApi` (JSON `Accept`, query-param mutations, raw
  `transfer()`, money in cents), `discoverCustomer` (first CHECKING account at ≥ $100 and first SAVINGS account), and `test.extend` fixtures.
- [`fund-transfer-fe.spec.ts`](../../test-style-02/tests/fund-transfer-fe.spec.ts): 1 test, with Given/When/Then/And steps and a REST balance cross-check.
- [`fund-transfer-api.spec.ts`](../../test-style-02/tests/fund-transfer-api.spec.ts): 11 tests (1 valid transfer, 6 rejections, 3 `sut-quirk` acceptances, 1 ledger debit).

**Wiring**
- `package.json` / `package-lock.json`: `@playwright/test ~1.61.1` (resolves to 1.61.1, on the same `playwright 1.61.1`), plus scripts `typecheck:style-02` and `test:style-02`.
- `.github/workflows/ci.yml`: a step after `npm run verify`, plus the `test-style-02-report` artifact (existing pinned `upload-artifact` SHA).
- `.gitignore`: style-02 output folders.

**Docs:** `README.md`; DR-PB-12 in `docs/decision-register.md`; `docs/design-document.md` v1.9 §5.11;
`docs/naming-conventions.md`; `docs/backlog.md` v31; the plan (approval and Outcome); the
[implementation log](../implementation-logs/2026-10-19_pb-style-01-test-style-02.md).

## 2. Verification & Test Evidence

| Command | Quality Gate / Suite | Status | Metrics (Passed/Total) | Duration |
|---|---|---|---|---|
| `pwsh ./scripts/build-sut.ps1` | SUT image build | ✅ | `parabank:d1bf006 Built` | 255.5 s |
| `pwsh ./scripts/gate.ps1` | Boot gate | ✅ | 4/4 | — |
| `npm run typecheck:style-02` | Style-02 types | ✅ | exit 0 | — |
| `npm run typecheck` | Root types | ✅ | exit 0 | — |
| `npm run test:style-02` (first run) | Style 02 | ✅ | 12/12 | 10.0 s |
| `npx playwright test -c test-style-02/…` ×3 | Flake check | ✅ | 12/12 each | 6.2 s, 6.0 s, 8.8 s |
| Must-fail (a) `$51.00` | Part 1 assertion | ✅ red | `Expected "$51.00" Received "$50.00"` | — |
| Must-fail (b) `'Credit'` | Part 3 assertion | ✅ red | `- "type": "Credit"  + "type": "Debit"` | — |
| Must-fail (c) SUT stopped | Global seed | ✅ red | `ParaBank seed failed … ECONNREFUSED` | 6.6 s |
| `npm run verify` | Project contract | ✅ | unit 36/36, smoke 3/3, API 14/14, UI 8/8, report 8/8 (JSON) | 56.6 s |
| `npm audit` | Dependencies | ⚠️ unchanged | 14 high before **and** after (pre-existing transitive axios/braces/brace-expansion/fast-uri) | — |

Captured output:

```
Running 12 tests using 1 worker
  ...
  12 passed (10.0s)
```
```
Tag lint OK: @smoke/@mutates disjoint; smoke counts match the design doc.
Smoke-safety OK: @smoke ran green and left the seed state byte-identical.
14 scenarios (14 passed)
8 scenarios (8 passed)
Report content check OK: all 8 ui scenarios present in Serenity artefacts (JSON evidence; HTML checked in CI).
```

Remote CI: PR #51 checks had not reported when this was written (0 passing / 0 failing / 0 pending).

## 3. Operational State & Invariants

- Branch `feat/pb-style-01-test-style-02`. Feature commit `abba591`, base `37c535f`, pushed; this walkthrough follows as its own commit.
- Remote CI on PR #51 is pending. **Owner merge only, and only on green** (merge-only-on-green rule).
- SUT: torn down with `docker compose down` after verification. Docker storage is on `E:\_DockerData`.
- Invariants kept:
  - assert-as-observed (§5.7)
  - boot → seed → use (DR-PB-06)
  - no hard-coded account IDs
  - no new GitHub Actions, and image pins untouched
  - `verify` contract and all existing scenario counts unchanged
  - en-GB prose

## 4. Recommended Next Actions

1. **(Primary)** Once PR #51's CI is green, the owner reviews and merges. Then confirm the post-merge `main` CI and the
   Pages deploy are green, and tick the remaining PB-STYLE-01 boxes in `docs/backlog.md`.
2. Add a ParaBank row to the portfolio capability matrix (`portfolio-docs/PORTFOLIO_CAPABILITY_MATRIX.md`):
   "Playwright Test (POM + APIRequestContext)". This is a separate root-repo PR.
3. Triage the 14 pre-existing HIGH `npm audit` findings (Serenity/JS → axios; Ajv → fast-uri) as a backlog risk.
