# Walkthrough — PB-STYLE-02: `test-style-03/`, Serenity/JS Screenplay on Playwright Test

## Executive Summary

test-style-02's 12 fund-transfer tests now also exist as Serenity/JS Screenplay under Playwright Test, in
[`test-style-03/`](../../test-style-03/README.md). The titles, structure and expectations are identical, which completes a three-way
style comparison: page objects, Screenplay on Playwright Test, and Screenplay on Cucumber. The suite is 12/12 green on 5 local runs. It
has its own content-checked Serenity BDD report, and style-02 and `npm run verify` are unchanged. The work is on PR
[#52](https://github.com/GBrooks1970/parabank-bank-automation/pull/52), awaiting CI (including the Java-only HTML report check) and the owner's merge.

## 1. Changes Implemented

**Suite (`test-style-03/`, new)**
- [`playwright.config.ts`](../../test-style-03/playwright.config.ts):
  - reporters: list, html and `@serenity-js/playwright-test`, which runs `serenity-bdd` + `ArtifactArchiver` into `test-style-03/target/site/serenity`
  - `use`: `baseURL`, `defaultActorName: 'John'` and a photographer for failures
- [`tests/screenplay/ui/`](../../test-style-03/tests/screenplay/ui): `PageElement` targets, with `q`-templated option selectors fed from the notepad. The
  tasks are `LogIn`, `OpenTransferFunds` and `TransferFundsThroughTheUi` (which waits for the concrete options), plus `Text.of` result questions.
- [`tests/screenplay/api/`](../../test-style-03/tests/screenplay/api): `DiscoverTheStandardCustomer`, using `Check.whether` to open a SAVINGS account
  only when there isn't one; `TransferViaTheApi`, which leaves the response in `LastResponse`; and the record tasks. The questions cover balances,
  the balance change in cents, and new ledger entries (an ID diff plus an amount filter).
- [`tests/screenplay/notes.ts`](../../test-style-03/tests/screenplay/notes.ts): the typed notepad.
- [`fund-transfer-fe.spec.ts`](../../test-style-03/tests/fund-transfer-fe.spec.ts) (1 test) and [`fund-transfer-api.spec.ts`](../../test-style-03/tests/fund-transfer-api.spec.ts) (11 tests).

**Report and CI**
- [`scripts/report-style-03.mjs`](../../scripts/report-style-03.mjs): Java-optional HTML generation, with its own source and destination folders.
- [`scripts/check-style-03-report.ts`](../../scripts/check-style-03-report.ts): the 12 written-out scenario names must be present and SUCCESS, with no
  unexpected or invalid artefacts; under Java/CI, `index.html` must exist and not be trivially small.
- `.github/workflows/ci.yml`: the style-03 step and the `test-style-03-report` artifact.

**Wiring:**
- `package.json` / `package-lock.json`: `@serenity-js/playwright-test` and `@serenity-js/rest`, pinned exactly at `3.44.1`, plus five scripts.
- `.gitignore`: style-03's output folders and the root `test-results/`.

**Docs:**
- `README.md` and `test-style-03/README.md`
- DR-PB-12, generalised
- design doc v1.10, §5.11
- naming conventions
- backlog v32, which also closes PB-STYLE-01
- the plan's Outcome and the [implementation log](../implementation-logs/2026-10-19_pb-style-02-test-style-03.md)

## 2. Verification & Test Evidence

| Command | Quality Gate / Suite | Status | Metrics (Passed/Total) | Duration |
|---|---|---|---|---|
| `pwsh ./scripts/gate.ps1` | Boot gate | ✅ | 4/4 | — |
| Step 0 spike (throwaway) | Serenity REST + reporter mechanics | ✅ | 3/3 | 4.9 s |
| `npm run typecheck` / `:style-02` / `:style-03` | Types | ✅ | exit 0 ×3 | — |
| `npm run test:style-03` ×5 | Style 03 | ✅ | 12/12 each | 20.5, 19.1, 16.8, 18.7, 18.9 s |
| `npm run check:style-03-report` | Style-03 report content | ✅ | 12/12 SUCCESS (JSON) | — |
| `npm run test:style-02` | Style 02 regression | ✅ | 12/12 | 5.2 s |
| `npm run verify` | Project contract | ✅ | unit 36/36, smoke 3/3, API 14/14, UI 8/8, report 8/8 | 63.6 s |
| `grep` of `target/site/serenity` | Report isolation | ✅ | 0 style-03 artefacts | — |
| Must-fail (a) `$51.00` | UI assertion | ✅ red | `Expected the transferred amount to equal "$51.00"` | — |
| Must-fail (b) `'Credit'` | Ledger assertion | ✅ red | `<<the only new $13.57 ledger entry on the account>>.type … Received string: Debit` | — |
| Must-fail (c) SUT stopped | Global seed | ✅ red | `ParaBank seed failed … ECONNREFUSED` | 7 s |
| Must-fail (d) renamed test | Report check | ✅ red | the missing and the unexpected scenario, both named | — |
| `npm audit` | Dependencies | ⚠️ 15 high | +1 package entry, **0 new advisories** (same transitive `axios 1.18.1`) | — |

Captured output:

```
Running 12 tests using 1 worker
  ...
  12 passed (20.5s)
Style-03 report content check OK: all 12 scenarios present and SUCCESS (JSON evidence; HTML checked in CI).
```

Remote CI: PR #52 checks hadn't started when this was written. The style-03 **HTML** report generation and check run only in CI, because there's no local JDK.

## 3. Operational State & Invariants

- Branch `feat/pb-style-02-test-style-03`, from `main` at `daecf34`. Commits `d8ffd50` (feature) and `d072148` (stray spike output removed, root `test-results/` ignored), then this walkthrough. All pushed.
- PR #52 is open; the owner merges, only on green. #51 is merged, and its post-merge CI [run 39321895997](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/39321895997) was green.
- The SUT was torn down with `docker compose down` after verification. Docker storage is on `E:\_DockerData`.
- Invariants kept:
  - `verify` contract and all existing counts unchanged
  - Pages packaging untouched
  - no new GitHub Actions
  - image pins untouched
  - Playwright still `1.61.1`
  - assert-as-observed
  - no hard-coded account IDs
  - en-GB prose

## 4. Recommended Next Actions

1. **(Primary)** Watch PR #52's CI, especially the first Java-backed `report:style-03` + `check:style-03-report` run. Then the owner merges, and
   post-merge `main` CI is confirmed.
2. Add the portfolio capability-matrix row(s) for both new styles, as a root-repo PR after #52 merges.
3. Triage the pre-existing transitive `axios 1.18.1` HIGH advisories as a backlog risk. They now span 8 `@serenity-js/*` packages, and fixing them needs a coordinated Serenity/JS + Playwright upgrade.
