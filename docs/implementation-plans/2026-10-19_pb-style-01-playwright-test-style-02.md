---
version: 1
created: 2026-10-19T15:48Z
project: parabank-bank-automation
type: implementation-plan
item: PB-STYLE-01 (proposed new backlog item)
status: implemented
approved: 2026-10-19, owner (Gary Brooks), D1–D5 as recommended; owner merges
delivered: PR #51, squash commit daecf34 (2026-10-19)
language: en-GB
---

# Implementation plan: PB-STYLE-01 — `test-style-02/`, the fund-transfer brief in plain Playwright Test style

**Goal.** Add a self-contained second test style to this repository, in a new `test-style-02/` folder,
that implements the `sdet-technical-task` brief (`D:\gb-dev\tech-tests\live-session-02\sdet-technical-task\README.md`)
in that task's idiom: **plain `@playwright/test`** with page-object classes, `APIRequestContext`
helpers, `test.describe` / `test` / `test.step`, and dynamic account discovery. It runs against this
project's pinned, resettable Docker SUT instead of the shared public demo.

The existing lanes are Cucumber + Screenplay API, plus Serenity/JS + Playwright + Cucumber UI.
They are not changed. The point is a side-by-side comparison: the same business coverage (FR-A3 transfer,
FR-B2 ledger, FR-B4 rejection) in a second, mainstream style. That style is what a live technical
interview expects, and the `landpage.ts` "Serenity mismatch!!!" note shows the two styles colliding.

## Evidence gathered before planning

All reads only. Nothing in either repository was changed. The SUT was **not** running (Docker was not
available at 2026-10-19T15:48:56Z), so the live probes are Step 0 of the plan, not evidence gathered here.

| Finding | Consequence for the plan |
|---|---|
| The brief asks for three things. Part 1 is a UI $50 transfer from Checking to Savings. Part 2 is a direct `POST /transfer` that succeeds, and invalid requests to it that are rejected. Part 3 is a debit entry in the source account's `GET /accounts/{id}/transactions`. It also says "discover accounts, don't hard-code". | There are four tests, all with discovered account IDs, even though our seed is deterministic. Discovery is part of the style being shown. |
| The source style uses `tests/pages/*.ts` POM classes with `readonly` Locators, two spec files (`fund-transfer-fe.spec.ts`, `fund-transfer-api.spec.ts`), and `playwright.config.ts` with `fullyParallel:false`, `workers:1` and the `list` reporter. `.env.example` holds `PARABANK_USERNAME`/`PARABANK_PASSWORD`. | The folder layout and file names mirror the source task one-to-one, which keeps the comparison honest. |
| The source scaffold has defects: Serenity `By.*` / `.describedAs()` inside a Playwright POM, an unclosed class, Given/When/Then split across isolated `test()` blocks, and `getByLabel('Username')`, which doesn't match ParaBank's markup. The coaching guide (`coaching-guides/…gemini-02…md`) records these. | Style-02 is the **clean** version: native Playwright locators, one test per journey with `test.step` for Given/When/Then, and `input[name=…]` / role locators. The scaffold's defects aren't copied. |
| The coaching guide flags a `baseURL` pitfall: `https://…/parabank` without a trailing slash plus a leading-slash path drops `/parabank`. | `baseURL` is the **origin only** (`http://localhost:8090`), and every path is written in full, exactly as the brief does (`/parabank/services/bank/transfer`). The pitfall can't happen. |
| This repo already pins `playwright ~1.61.1`, and `node_modules/@playwright/test` is **absent**. | `@playwright/test` is added at the **same `~1.61.1`**, so it shares the Chromium build `npx playwright install chromium` already fetches. No second browser download. |
| The root `tsconfig.json` includes `src`, `features`, `scripts` and `tests` only. `check-tags.ts` scans `features/api` and `features/ui` only. `smoke-safety.mjs` runs Cucumber `@smoke` only. `run-unit-tests.mjs` discovers `tests/unit/*.test.ts` only. | `test-style-02/` falls outside every existing gate, so it can't break `npm run verify`. It gets its own `tsconfig.json` and its own typecheck script. |
| Seed (`insert.sql`): customer 12212 owns CHECKING accounts (type 0, e.g. 12345 at −2300.00, 13122 at 1100.00, 54321 at 1351.12) and SAVINGS accounts (type 1: 12678 at −100.00, 13344 at 1231.10). | Discovery always finds both types after `initializeDB`. The "create a Savings account if none" fallback from the coaching guide stays in the helper as a guard, but won't be exercised locally. |
| FR-B4 already asserts, as observed on d1bf006: an unknown account is **400** with `Could not find account #99999`; a non-numeric amount is **404** with an empty body; an overdraft transfer is **200** (accepted). | "Rejected" is asserted as `!response.ok()` plus the observed status per case. **Overdraft and negative amount are not rejection cases.** Asserting they are rejected would break the assert-as-observed working norm (design doc §5.7). |
| Working norms (`docs/project-contract.md`): boot, then seed, then use (DR-PB-06); mutations are reset-bracketed; UI outcomes are cross-checked through REST. | `globalSetup` seeds through `initializeDB` (and expects 204). The UI test also checks the balance deltas through the API. |
| Memory/portfolio rules: plan before implementation; one reviewable change per PR; owner merges; merge only on green; capability matrix updated in the same change set as coverage; walkthrough archived under `docs/walkthroughs/`. | These rules are reflected in Delivery and Verification below. |

## Steps

**0. Live probe (local SUT, reset-bracketed; no repo change).** Run `build-sut.ps1`, then
`docker compose up -d`, then `gate.ps1`. Then record the observed status and body for:
`transfer` with a missing `amount`; `amount=-50`; `fromAccountId=abc`; `fromAccountId == toAccountId`;
the JSON shape of `GET /accounts/{id}/transactions` (field names, whether `type` is `"Debit"`, amount as a
number). Finish with `initializeDB`. These observations fix the expected values in Steps 5 and 6. If an
observation contradicts this plan, stop and put the change to the owner.

**1. Dependency and scripts (root `package.json`).**
- Add devDependency `"@playwright/test": "~1.61.1"`, matching `playwright`, and refresh `package-lock.json` with `npm install`.
- Add scripts:
  - `"typecheck:style-02": "tsc -p test-style-02/tsconfig.json"`
  - `"test:style-02": "playwright test -c test-style-02/playwright.config.ts"`
- `verify` is left unchanged in this PR (see Decision D2).

**2. Folder scaffold `test-style-02/`.**
```
test-style-02/
├── README.md                     # purpose, mapping to the brief and to FR-A3/B2/B4, how to run
├── .env.example                  # PARABANK_URL=http://localhost:8090, PARABANK_USERNAME=john, PARABANK_PASSWORD=demo
├── playwright.config.ts          # testDir ./tests, fullyParallel:false, workers:1, retries:0,
│                                 # reporter list (+ html, open:'never'), trace 'retain-on-failure',
│                                 # baseURL = PARABANK_URL origin, chromium project, globalSetup
├── tsconfig.json                 # strict, NodeNext/ES2022 like root; includes only this folder
├── global-setup.ts               # POST /parabank/services/bank/initializeDB → expect 204 (DR-PB-06)
└── tests/
    ├── pages/
    │   ├── login.page.ts         # LoginPage: usernameInput, passwordInput, loginButton; login()
    │   ├── nav.page.ts           # LeftNav: transferFundsLink, logOutLink; openTransferFunds()
    │   └── transfer.page.ts      # TransferPage: amountInput, fromSelect, toSelect, transferButton,
    │                             # resultPanel, amountResult, fromResult, toResult; submitTransfer()
    ├── support/
    │   ├── parabank-api.ts       # ParaBankApi(request): login, accounts, account, transactions, transfer
    │   │                         # Accept: application/json; transfer returns raw text (plain-text body)
    │   ├── accounts.ts           # discoverAccounts(api): customerId + first CHECKING and first SAVINGS
    │   │                         # with id/balance; creates SAVINGS via createAccount if absent
    │   └── fixtures.ts           # test.extend<{ api, customer }> so specs receive discovered data
    ├── fund-transfer-fe.spec.ts  # Part 1
    └── fund-transfer-api.spec.ts # Part 2 req 1 + req 2, Part 3
```
- Credentials come from `process.env.PARABANK_USERNAME`/`PARABANK_PASSWORD`, defaulting to the seeded identity.
- No `dotenv` dependency: the README documents exporting the variables, which keeps the dependency surface at one package.
- Locators follow the selector norms in `src/screenplay/ui/pages.ts` (scope to `#rightPanel`, no `:has()`, wait for the concrete `<option value>`). They are written natively, e.g. `page.locator('#transferForm #fromAccountId')`. The Serenity module is never imported.
- `.gitignore` gains `/test-style-02/test-results/` and `/test-style-02/playwright-report/`.

**3. `fund-transfer-fe.spec.ts`: Part 1, one test.**
`test('transfers $50 from Checking to Savings and the UI confirms it', …)` with three `test.step`s:
- **Given:** discover CHECKING and SAVINGS through the fixture, record both balances through the API, then log in through the UI.
- **When:** open Transfer Funds, wait for both `option[value="<id>"]` elements to be attached, fill `50`, select from/to, then click Transfer.
- **Then:** check that `#showResult` shows "Transfer Complete!", `#amountResult` is `$50.00`, and the from/to IDs match. Then a REST cross-check: CHECKING balance −50.00 and SAVINGS +50.00, compared in integer cents.

**4. `fund-transfer-api.spec.ts` › `Direct API transfer requests` › `handles a successful transfer request`.**
- Discover two accounts, then `POST /parabank/services/bank/transfer` with `params: { fromAccountId, toAccountId, amount }`.
- Expect 200 and the exact plain-text body `Successfully transferred $<amount> from account #<from> to account #<to>`. The amount is rendered as FR-B4 observed it: `$999999`, with no forced decimals. Step 0 confirms the format for a fractional amount.

**5. `… › rejects invalid transfer requests`.**
- Use a data-driven `for (const c of INVALID_CASES) test(\`rejects ${c.name}\`, …)` over the cases Step 0 observed as rejected. As known so far:
  - unknown `fromAccountId`: 400, `Could not find account #…`
  - unknown `toAccountId`: 400
  - non-numeric `amount`: 404, empty body
  - missing `amount`: status from Step 0
- Each test asserts `response.ok()` is false, plus the observed status and body. The tests carry no shared state.
- Cases that Step 0 shows are **accepted** (expected: negative amount and overdraft) are left out of the "rejects" group. They go in one `test.describe('observed acceptance (assert-as-observed)')` with an annotation `{ type: 'sut-quirk', description: … }`. See Decision D3.

**6. `… › Transaction history validation` › `contains a debit entry for the source account after a transfer`.**
- Snapshot the source account's transaction IDs, then transfer a distinctive amount (e.g. `13.57`), then `GET /accounts/{from}/transactions`.
- Find exactly **one** new ID. Check that it has `accountId === from`, `type === 'Debit'`, the amount equal to 13.57 in cents, and `description === 'Funds Transfer Sent'`. Field names come from Step 0.

**7. Documentation (same PR).**
- `test-style-02/README.md`:
  - a style comparison table (Screenplay + Cucumber vs plain Playwright Test: actor/ability/task vs POM/helper/fixture; Gherkin vs `test.step`; Serenity report vs Playwright HTML)
  - a requirement map: brief Part 1 → FR-A3, Part 2 → FR-B4 + transfer, Part 3 → FR-B2 ledger
- Root `README.md`: a short "Second test style" section and the count of new tests. The existing "22 scenarios" claims stay unchanged.
- `docs/backlog.md`: add the PB-STYLE-01 item, a version bump, and the evidence links on completion.
- `docs/decision-register.md`: DR-PB-12, "A second, non-gating plain-Playwright style lives in `test-style-02/`; it shares the SUT, pins and reset contract and never replaces the Screenplay lanes." The wording is settled by D2.
- `docs/naming-conventions.md`: a one-paragraph note that `*.spec.ts` and `*.page.ts` apply only under `test-style-02/`.
- Plan `_index.md`: add a row (done with this file).

**8. CI (same PR, per D2).** In `ci.yml`, after `npm run verify` and before Pages packaging:
- `npm run typecheck:style-02`, then `npm run test:style-02`, against the already-booted SUT.
- `globalSetup` re-seeds, so test order relative to the Cucumber lanes doesn't matter.
- Upload `test-style-02/playwright-report` with the already-pinned `upload-artifact` SHA (`if: always()`). No new actions, so the pin policy is untouched.

**9. Post-delivery records.** An implementation log in `docs/implementation-logs/`, a walkthrough in
`docs/walkthroughs/2026-10-xx_pb-style-01-test-style-02.md` (AGENTS.md dual-archive rule), the Outcome
appended here, and a capability-matrix update in the portfolio root (`portfolio-docs/PORTFOLIO_CAPABILITY_MATRIX.md`:
ParaBank gains "Playwright Test (POM + APIRequestContext)"). The root update is a separate PR in the root repo.

## Verification

1. `npm run typecheck`, the existing root check, still passes and doesn't see `test-style-02/`.
2. `npm run typecheck:style-02` exits 0.
3. `npm run test:style-02` against a freshly seeded SUT reports **all tests passed**, with the count recorded (expected 1 UI + 1 success + N rejection + 1 ledger + M observed-acceptance).
4. Run it **3 times consecutively** with no failures, as a flake check on the async `<select>` wait (PBR-07 precedent).
5. Run `npm run verify` and check it is unchanged: 36 unit tests, 3 smoke, 14 API, 8 UI, 8 Serenity JSON checks.
6. **Must-fail checks**, done locally and reverted, never committed:
   - (a) change the expected UI amount to `$51.00`, and the Part 1 test goes red at the Then step
   - (b) change the ledger expectation to `'Credit'`, and Part 3 goes red
   - (c) stop the container, and `globalSetup` fails fast with a clear `initializeDB` error rather than timeouts
7. Run `git diff --stat` and confirm no file outside `test-style-02/`, `package*.json`, `.gitignore`, `ci.yml` and `docs/` changed.
8. PR CI is green on the final head before the owner merges; after the merge, `main` CI is green and Pages has deployed.

## Delivery

- Branch `feat/pb-style-01-test-style-02` in `GBrooks1970/parabank-bank-automation`, one PR (code, CI and docs together, because the coverage and its claims move together).
- The owner merges; the PR is never self-merged or auto-merged. Every check result is tested before merge.
- Follow-up PR in the portfolio root repo for the capability matrix row (and the landing page only if the owner wants the second style surfaced publicly).

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| D1 Package layout | (a) root `package.json` devDependency + `-c test-style-02/…` config; (b) separate `test-style-02/package.json` + lockfile | **(a)**: one lockfile, one `npm ci`, shared Chromium; Dependabot/audit surface stays single | Recommended option, 2026-10-19 |
| D2 Gating | (a) a separate CI step after `verify`, red fails the job; (b) add to `npm run verify`; (c) local-only, non-CI | **(a)**: proves it in CI without changing the `verify` contract that every existing claim and handover cites | Recommended option, 2026-10-19 |
| D3 SUT quirks (negative amount / overdraft accepted) | (a) assert as observed in a labelled "observed acceptance" group; (b) `test.fail()` marking them as expected-to-fail requirement violations; (c) omit | **(a)**: consistent with the project's assert-as-observed norm and FR-B4; the annotation surfaces it as a finding | Recommended option, 2026-10-19 |
| D4 Target | (a) local Docker SUT only; (b) also allow `PARABANK_URL=https://parabank.parasoft.com` for interview rehearsal (non-gating, documented as best-effort) | **(b)**: no code cost; the config already reads `PARABANK_URL`. CI stays local-only | Recommended option, 2026-10-19 |
| D5 Test discovery style | (a) `test.extend` fixtures (`api`, `customer`); (b) plain helper calls in `beforeEach`, as the source scaffold does | **(a)**: still idiomatic Playwright, removes repeated setup; README shows the (b) equivalent in one snippet | Recommended option, 2026-10-19 |

## Outcome

Implemented 2026-10-19 on branch `feat/pb-style-01-test-style-02` (base `37c535f`). PR and merge evidence are
recorded in `docs/backlog.md` PB-STYLE-01 and in the index row.

**Step 0 probe** (local SUT `d1bf006`, between 2026-10-19T16:00:59Z and 16:13:15Z, re-seeded afterwards with `initializeDB` → 204):

| Request to `POST /transfer` | Observed |
|---|---|
| valid `amount=50.00` / `13.57` | 200, content type `application/json` but a plain-text body `Successfully transferred $50.00 from account #13122 to account #13344` (amount echoed exactly as sent) |
| unknown `fromAccountId` / `toAccountId` | 400 `text/plain`, `Could not find account number 99999 and/or 13344` |
| missing `fromAccountId` | 400, `Could not find account number 0 and/or 13344` |
| `fromAccountId=abc`, `amount=abc` | 404, empty body |
| missing amount, empty amount | 500, HTML error page |
| `amount=-50` | 200, `Successfully transferred $-50 …` (accepted) |
| `fromAccountId == toAccountId` | 200 (accepted) |

`GET /accounts/{id}/transactions` returns `[{id, accountId, type: "Debit"|"Credit", date, amount, description}]`.
A transfer debit has `type: "Debit"` and `description: "Funds Transfer Sent"`. No observation contradicted the plan.

**Differences from the plan, and why:**
- The plan expected 1 + 1 + N + 1 + M tests. Delivered: **12** (1 UI, 1 valid, 6 rejected, 3 observed-acceptance, 1 ledger).
  Same-account transfer was added to the observed-acceptance group because Step 0 showed it is accepted.
- `PARABANK_SKIP_RESET=1` was added to `global-setup.ts`. D4(b) allows pointing at the public demo, and the global
  `initializeDB` must never reset a shared environment. It is a safety guard, not a scope change.
- Discovery picks the first CHECKING account **holding at least $100** rather than the first CHECKING account.
  The seed's first CHECKING account (12345) is −2300.00, which would have made the happy path an overdraft.
- The UI test adds a fourth `test.step` ("And the balances moved by $50 (REST cross-check)") per the project
  working norm. The plan named this check inside the Then step.
- Design doc → v1.9 (§5.11) in the same PR, per the decision register's amendment rule (register and design doc
  change together).

**Verification evidence** (local, Windows, Node 24.18.0, Docker 29.0.1):
- `npm run typecheck:style-02` exit 0, and `npm run typecheck` exit 0.
- `npm run test:style-02`: first run 12 passed (10.0 s), then 3 consecutive runs at 12 passed each (6.2 s, 6.0 s, 8.8 s).
- Must-fail (reverted, never committed):
  - (a) `$51.00`: red at the "Then the UI should reflect the completed transfer" step, `Expected "$51.00" Received "$50.00"`
  - (b) `'Credit'`: red, diff `"type": "Debit"`
  - (c) container stopped: `ParaBank seed failed at http://localhost:8090: … ECONNREFUSED`, total 6.6 s
- `npm run verify` (after `gate.ps1` re-seed) exit 0 in 56.6 s. It reported 36/36 unit; tag lint OK; smoke 2+1 scenarios,
  with smoke-safety byte-identical; 14/14 API; 8/8 UI; and the report check OK on 8 UI scenarios (JSON only; Java is absent locally).

Implementation log: [`../implementation-logs/2026-10-19_pb-style-01-test-style-02.md`](../implementation-logs/2026-10-19_pb-style-01-test-style-02.md).
Walkthrough: [`../walkthroughs/2026-10-19_pb-style-01-test-style-02.md`](../walkthroughs/2026-10-19_pb-style-01-test-style-02.md).
