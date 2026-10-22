---
version: 1
created: 2026-10-19T20:34Z
project: parabank-bank-automation
type: implementation-plan
item: PB-STYLE-02 (proposed new backlog item)
status: implemented
approved: 2026-10-19, owner (Gary Brooks), D1–D6 as recommended; implement after PR #51 merges; owner merges
delivered: PR #52, squash commit e7130f5 (2026-10-19)
language: en-GB
---

# Implementation plan: PB-STYLE-02 — `test-style-03/`, the same 12 tests in Serenity/JS Screenplay on Playwright Test

**Goal.** Add a third test style in `test-style-03/`. It covers the same brief, has the **same test structure** as
`test-style-02/` and asserts the **same expectations**: two spec files with the same 12 test titles, the
`describe`/`test` hierarchy and Given/When/Then steps. The interaction layer is what changes: **Serenity/JS
Screenplay** (Actors, Abilities, Tasks, Questions), run by Playwright Test through `@serenity-js/playwright-test`.

The result is a three-way comparison of identical coverage:

| Folder | Runner | Interaction model |
|---|---|---|
| `test-style-02/` | Playwright Test | page objects + `APIRequestContext` helper |
| `test-style-03/` | Playwright Test | Serenity/JS Screenplay: `BrowseTheWebWithPlaywright` + `CallAnApi` |
| `features/` (main lanes) | Cucumber | Serenity/JS Screenplay (UI) and the hand-rolled Screenplay (API) |

## Evidence gathered before planning

All reads were done in the local checkout and changed nothing in the repository. The checkout sat on
`feat/pb-style-01-test-style-02`, at PR #51 head `492e24b`.

| Finding | Consequence for the plan |
|---|---|
| `@serenity-js/playwright-test@3.44.1` exists, published 2026-07-06. Its **peer dependency is `@playwright/test ~1.61.1`**, exactly the pin PB-STYLE-01 added. Its dependencies are `@serenity-js/{core,web,rest,playwright}@3.44.1` and `axios 1.18.1`, all of which are already in the tree. | One new devDependency, at the same 3.44.1 as every other Serenity/JS package. It adds no new browser, no Playwright bump and no new axios. The `npm audit` count (14 HIGH, pre-existing) is expected to stay unchanged, and verification checks that. |
| `@serenity-js/rest@3.44.1` is already installed, but only transitively (via `@serenity-js/serenity-bdd`). | It becomes an explicit devDependency. Don't rely on a transitive package. |
| `CallAnApi` (`node_modules/@serenity-js/rest/lib/screenplay/abilities/CallAnApi.js:441-460`) **stores 4xx/5xx responses as `LastResponse` and doesn't throw**. Only network failures (no `error.response`) throw. | The six rejection tests can assert `LastResponse.status()` directly, with no try/catch. |
| `CallAnApi.at(baseURL)` gives axios defaults with a 10 s timeout. Axios joins `baseURL` and the path by concatenation. | `baseURL = PARABANK_URL` (origin) plus full `/parabank/services/bank/...` paths, as in style-02. There is no URL-resolution pitfall. |
| `/transfer` answers with `Content-Type: application/json` but a plain-text body (PB-STYLE-01 Step 0, local and live). Axios's lenient JSON parse should return that body as a string. | Step 0 confirms that `LastResponse.body<string>()` is the exact sentence, and that the empty 404 body and the 500 HTML page come back as strings. |
| The main UI lane's Serenity wiring (`features/ui/support/serenity.setup.ts`) writes Serenity BDD JSON to `target/site/serenity`. `scripts/check-report.ts` reads that folder and expects exactly the 8 Cucumber UI scenarios, and Pages publishes from it. | Style-03's Serenity artefacts **must go to a separate folder** (`test-style-03/target/site/serenity`). Otherwise they would pollute the main report, its content check and the public Pages evidence. |
| `src/quality/report-integrity.ts` exports `inspectSerenityCoverage(featureSources, artifactJsonTexts)`. It is keyed on Gherkin scenario names. | Style-03 needs its own small content check, keyed on the 12 Playwright test titles. It verifies that the report contains every test, rather than trusting that a report was produced (magento empty-shell lesson). |
| `src/screenplay/ui/pages.ts` already holds Serenity `PageElement` targets, but its `TransferPage` has no `amountResult`/`fromAccountIdResult`/`toAccountIdResult` targets. DR-PB-12 says no code is shared between styles. | Style-03 owns its targets (Decision D2). The duplication is small, and each style stays readable on its own. |
| Style-02's verified facts carry over unchanged: selector norms, observed rejection statuses and bodies (400/400/400/404/404/500), accepted quirks (negative amount, same account, overdraft), ledger row shape, the "first CHECKING with at least $100" discovery rule, the `initializeDB` global seed and `PARABANK_SKIP_RESET`. | Expectations aren't re-derived. Step 0 only checks the Serenity-specific mechanics. |
| PR #51 (PB-STYLE-01) is **open**, not merged. Style-03 needs its `@playwright/test` pin and mirrors its structure. | Delivery waits for #51 to merge, then branches from `main` (Decision D5). |

## Steps

**0. Mechanics spike (on the new branch, throwaway, not committed).**
Install `@serenity-js/playwright-test@3.44.1` and `@serenity-js/rest@3.44.1`, then run one throwaway spec against the
local SUT that confirms:
- (a) an actor with `CallAnApi.at(PARABANK_URL)` sends `PostRequest.to('/parabank/services/bank/transfer').using({ params })`, and `LastResponse.body<string>()` is the exact plain-text sentence
- (b) a 400, the empty 404 and the 500 arrive as `LastResponse` without throwing, with their bodies as strings
- (c) the `@serenity-js/playwright-test` reporter writes Serenity BDD JSON to `test-style-03/target/site/serenity`, and the files contain the test title
- (d) `BrowseTheWebWithPlaywright` reuses Playwright Test's `browser`/`page` (the integration's default `actors` fixture), so no second browser launch is needed

Then delete the spike. If any point fails, stop and put the change to the owner.

**1. Dependencies and scripts (root `package.json`).**
- devDependencies `"@serenity-js/playwright-test": "^3.44.1"` and `"@serenity-js/rest": "^3.44.1"`, matching the caret range on the other Serenity/JS packages. The lockfile resolves 3.44.1.
- Scripts:
  - `"typecheck:style-03": "tsc -p test-style-03/tsconfig.json"`
  - `"test:style-03": "playwright test -c test-style-03/playwright.config.ts"`
  - `"report:style-03": "node scripts/report-style-03.mjs"`
  - `"check:style-03-report": "tsx scripts/check-style-03-report.ts"`
- `verify` is unchanged (DR-PB-12 precedent).

**2. Folder scaffold `test-style-03/`, one-to-one with `test-style-02/`.**
```
test-style-03/
├── README.md                     # purpose, requirement map, three-way style comparison, how to run
├── .env.example                  # identical variables to style-02
├── playwright.config.ts          # defineConfig<SerenityOptions>: serial, 1 worker, retries 0,
│                                 # reporters: list + html + ['@serenity-js/playwright-test', { crew: [
│                                 #   '@serenity-js/serenity-bdd',
│                                 #   ['@serenity-js/core:ArtifactArchiver', { outputDirectory: 'test-style-03/target/site/serenity' }] ] }]
│                                 # use: { baseURL: PARABANK_URL, crew: [Photographer.whoWill(TakePhotosOfFailures)],
│                                 #        defaultActorName: 'John', trace 'retain-on-failure' }
├── tsconfig.json                 # same as style-02's
├── global-setup.ts               # same initializeDB seed + PARABANK_SKIP_RESET guard as style-02
└── tests/
    ├── screenplay/               # replaces style-02's pages/ + support/parabank-api.ts
    │   ├── ui/targets.ts         # LoginForm, NavPanel, TransferForm, TransferResult: PageElement.located(By…).describedAs(…)
    │   ├── ui/tasks.ts           # LogIn (Masked password), OpenTransferFunds, TransferFundsThroughTheUi(amount, from, to)
    │   ├── ui/questions.ts       # TheTransferResultTitle, TheTransferredAmount, TheFromAccount, TheToAccount
    │   ├── api/endpoints.ts      # BANK path, JSON headers, request builders (GetRequest / PostRequest + params)
    │   ├── api/tasks.ts          # DiscoverTheStandardCustomer (notes: customerId, checkingId, savingsId),
    │   │                         # TransferViaTheApi(params), RecordTheBalanceOf(noteKey), RecordTheTransactionIdsOf(…)
    │   ├── api/questions.ts      # TheBalanceOf(accountId), TheNewTransactionsOf(accountId), TheTransferResponse…
    │   └── notes.ts              # typed notepad: { customerId, checkingId, savingsId, balanceBefore…, knownTransactionIds }
    ├── support/serenity.ts       # useBase(test).useFixtures({ actors }): Cast of actors who can
    │                             # BrowseTheWebWithPlaywright, CallAnApi.at(baseURL), TakeNotes.usingAnEmptyNotepad()
    ├── fund-transfer-fe.spec.ts  # same 1 test as style-02
    └── fund-transfer-api.spec.ts # same 11 tests as style-02
```

**3. `support/serenity.ts`: the cast (style-02's `fixtures.ts` equivalent).**
- Export `describe`, `it`/`test` and `expect` from `useBase(base).useFixtures<{ actors }>`.
- The `actors` fixture builds a `Cast` whose actors get the browser ability from the Playwright Test `page` (the Serenity integration's own way), plus `CallAnApi.at(baseURL)` and `TakeNotes.usingAnEmptyNotepad()`.
- Specs receive `actor` (the default actor, John) or `actorCalled`. Discovery isn't a fixture here: it is the Screenplay **Task** `DiscoverTheStandardCustomer()`, which writes the IDs to the actor's notepad. That is the Screenplay idiom for state between interactions.

**4. `fund-transfer-fe.spec.ts`: brief Part 1 (FR-A3).** One test, `transfers $50 from Checking to Savings and the UI confirms it`:
```
await actor.attemptsTo(
  DiscoverTheStandardCustomer(),
  RecordTheBalanceOf('checking'), RecordTheBalanceOf('savings'),
  Task.where('#actor is using ParaBank as the standard customer', LogIn.asTheStandardCustomer()),
  Task.where('#actor completes a transfer of $50 from Checking to Savings',
    OpenTransferFunds(), TransferFundsThroughTheUi(50, notes().get('checkingId'), notes().get('savingsId'))),
  Task.where('#actor sees the UI reflect the completed transfer',
    Ensure.that(TheTransferResultTitle(), equals('Transfer Complete!')),
    Ensure.that(TheTransferredAmount(), equals('$50.00')),
    Ensure.that(TheFromAccount(), equals(notes().get('checkingId').as(String))), …),
  Task.where('#actor sees the balances move by $50 (REST cross-check)',
    Ensure.that(TheBalanceChangeOf('checking'), equals(-5000)), Ensure.that(TheBalanceChangeOf('savings'), equals(5000)))
)
```
- Given/When/Then are named `Task.where(...)` blocks (Decision D3). Serenity reports them as steps, which plays the same role as style-02's `test.step`.
- `TransferFundsThroughTheUi` uses `Wait.until(TransferForm.fromOption(id), isPresent())` before `Select.value(...)`, following the PBR-07 precedent.

**5. `fund-transfer-api.spec.ts`: brief Parts 2 and 3.** The 11 titles and the `describe` grouping are identical to style-02.
- *handles a successful transfer request*: `TransferViaTheApi({ from: checking, to: savings, amount: '25.00' })`, then `Ensure.that(LastResponse.status(), equals(200))` and `Ensure.that(LastResponse.body<string>(), equals(\`Successfully transferred $25.00 …\`))`.
- *rejects invalid transfer requests*: the same data-driven loop over the 6 observed cases. Each asserts the status, the body (equals or matches) and `TheBalanceOf(checking)` unchanged.
- *observed acceptance (assert-as-observed)*: the 3 quirk tests. The `sut-quirk` annotation stays via `test.info().annotations`. It also goes into the Serenity report as a tag or note, if Step 0(c) shows `test.info` annotations aren't carried there.
- *Transaction history validation*: `RecordTheTransactionIdsOf(checking)`, then a 13.57 transfer, then `Ensure.that(TheNewTransactionsOf(checking), …)`. The check is exactly one new entry, `type 'Debit'`, `description 'Funds Transfer Sent'`, amount in cents. Money is compared in integer cents throughout, as in style-02.

**6. Serenity report: generation and content check.**
- `scripts/report-style-03.mjs`: the same Java-optional pattern as `scripts/report.mjs`, using the same pinned `serenity-cli 4.3.4`. It runs `serenity-bdd run --source test-style-03/target/site/serenity --destination test-style-03/target/site/serenity`, with the project name set to "ParaBank — test style 03".
- `scripts/check-style-03-report.ts`:
  - parse every JSON artefact in `test-style-03/target/site/serenity`
  - assert each of the 12 expected test titles is present, with no invalid JSON
  - when Java or CI is present, assert the HTML `index.html` exists and is non-trivial
  - take the expected titles from a single `EXPECTED_TESTS` list, which the specs don't import, so a renamed test makes the check fail
- `.gitignore`: add `/test-style-03/test-results/`, `/test-style-03/playwright-report/` and `/test-style-03/target/`.

**7. Documentation (same PR).**
- `test-style-03/README.md`: how to run it, the requirement map (same as style-02), and a **three-way comparison table** (page objects vs Screenplay on Playwright Test vs Screenplay on Cucumber).
- Root `README.md`: extend the "Second test style" section to "Additional test styles", covering style-02 and style-03.
- `docs/decision-register.md`: per D4, generalise DR-PB-12 or add DR-PB-13.
- `docs/design-document.md`: v1.10, §5.11 extended to style-03.
- `docs/naming-conventions.md`: Screenplay naming in style-03. Tasks are imperative verb phrases and Questions are noun phrases (the existing Screenplay rule), with `*.spec.ts` specs.
- `docs/backlog.md`: the PB-STYLE-02 item.
- Plan `_index.md`: add a row.

**8. CI (same PR).** In `ci.yml`, after the style-02 step, add one step:

```
npm run typecheck:style-03 && npm run test:style-03 && npm run report:style-03 && npm run check:style-03-report
```

Then upload `test-style-03/target/site/serenity` and `test-style-03/playwright-report` with the already-pinned
`upload-artifact` SHA (`if: always()`). Java is already installed in the job. Pages packaging isn't touched: style-03's
report is a CI artefact only (Decision D6).

**9. Post-delivery records.** The implementation log, the walkthrough
(`docs/walkthroughs/2026-10-xx_pb-style-02-test-style-03.md`), the Outcome appended here, and the capability-matrix row
in the portfolio root, in a separate root-repo PR after merge.

## Verification

1. `npm run typecheck`, `typecheck:style-02` and `typecheck:style-03` all exit 0.
2. `npm run test:style-03`: **12/12**, with the same titles as style-02. Three consecutive green runs follow (flake check on the async `<select>`).
3. `npm run test:style-02` is still 12/12 (no regression from the shared dependency change).
4. `npm run verify` is unchanged: 36/36 unit, 3/3 smoke, 14/14 API, 8/8 UI, 8/8 report. `target/site/serenity` contains **no** style-03 artefacts, which shows the report folders are isolated.
5. `npm run report:style-03 && npm run check:style-03-report` pass. Run without Java, it's a JSON-only pass; in CI, the HTML is enforced.
6. **Must-fail checks** (local, reverted):
   - (a) expected UI amount `$51.00`: red, with the failing `Ensure` named in the Serenity output
   - (b) ledger `'Credit'`: red
   - (c) SUT stopped: `global-setup` fails fast
   - (d) remove one test title from the report JSON, or rename a test: `check:style-03-report` red
7. `npm audit`: still 14 HIGH (no new advisories from the two added packages).
8. `git diff --stat` touches only `test-style-03/`, `scripts/report-style-03.mjs`, `scripts/check-style-03-report.ts`, `package*.json`, `.gitignore`, `ci.yml` and `docs/`.
9. PR CI green on the final head, then the owner merges, then post-merge `main` CI green.

## Delivery

- **Prerequisite:** PR [#51](https://github.com/GBrooks1970/parabank-bank-automation/pull/51) (PB-STYLE-01) is merged.
- Branch `feat/pb-style-02-test-style-03` from the updated `main`, with one PR. This plan file moves onto that branch; it isn't committed to #51's branch.
- The owner merges, never self-merged, and only on green.
- Follow-up root-repo PR for the capability-matrix row.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| D1 Runner | (a) Playwright Test via `@serenity-js/playwright-test`; (b) Cucumber + Serenity/JS, as the main UI lane | **(a)**: the request is the *same test structure as style-02*, which is Playwright Test. (b) would duplicate the existing main lane | Recommended option, 2026-10-19 |
| D2 Targets/tasks | (a) self-contained under `test-style-03/tests/screenplay/`; (b) import `src/screenplay/ui/pages.ts` and extend it | **(a)**: consistent with DR-PB-12's "no shared code between styles", and each style reads on its own; the duplication is small | Recommended option, 2026-10-19 |
| D3 Given/When/Then | (a) named `Task.where('#actor …')` blocks, reported as Serenity steps; (b) `test.step` wrapping `actor.attemptsTo`; (c) both | **(a)**: idiomatic Screenplay, and it renders in the Serenity report; (b) mixes two step vocabularies | Recommended option, 2026-10-19 |
| D4 Decision record | (a) generalise DR-PB-12 to "additional test styles in `test-style-NN/`"; (b) new DR-PB-13 for style-03 | **(a)**: one rule covers both folders and any future style; history stays in the register row | Recommended option, 2026-10-19 |
| D5 Sequencing | (a) wait for #51 to merge, then branch from `main`; (b) stacked PR on `feat/pb-style-01-test-style-02` now | **(a)**: one reviewable change per PR on a stable base; #51 is green and mergeable | Recommended option, 2026-10-19 |
| D6 Style-03 Serenity report | (a) CI artefact only + content check; (b) also publish on Pages next to the main report | **(a)**: Pages packaging and `check:pages` stay untouched; publishing can be a later item if wanted | Recommended option, 2026-10-19 |

## Outcome

Implemented 2026-10-19 on branch `feat/pb-style-02-test-style-03`, from `main` at `daecf34` (#51, merged 2026-10-19T20:44:52Z;
post-merge CI [run 39321895997](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/39321895997) green).
PR and merge evidence are in `docs/backlog.md` PB-STYLE-02 and the index row.

**Step 0 spike** (local SUT `d1bf006`; a throwaway `test-style-03/_spike/`, deleted before commit; SUT re-seeded, 204). 3/3 passed:
- (a) `LastResponse.status()` was 200, and `LastResponse.body<string>()` was exactly
  `Successfully transferred $25.00 from account #13122 to account #13344`.
- (b) A 400 (`Could not find account number 99999 and/or 13344`), the empty 404 (`''`) and the 500 (an HTML string)
  all arrived as `LastResponse` without a throw.
- (c) Serenity BDD JSON was written to the configured `outputDirectory`, one file per test, with `name` = the test title and
  every Screenplay activity recorded as a step (for example "John sends a POST request to '/parabank/services/bank/transfer'").
- (d) Serenity's `BrowseTheWeb` page and Playwright's `page` showed the same URL.

**Differences from the plan, and why:**
- **Exact pins, not caret ranges** (plan Step 1 said `^3.44.1`). A fresh `^3.44.1` resolves to 3.49.0, whose peer is
  `@playwright/test ~1.64.0`. `~3.44.1` resolves to 3.44.3, whose peer is `~1.62.1`. Both failed `npm install` with ERESOLVE. Only an
  exact `3.44.1` keeps the reviewed `~1.61.1` Playwright pin and matches the other Serenity/JS packages, which are locked at 3.44.1.
  This is recorded in DR-PB-12.
- **No custom cast or `support/serenity.ts`** (plan Step 3). The integration's own `actors` fixture (`test-api.js:57-65`) already gives
  `BrowseTheWebWithPlaywright.usingPage(page)`, `TakeNotes` and `CallAnApi.using(axios)`, with axios built from the config's `baseURL`.
  Specs import `test` straight from `@serenity-js/playwright-test`. The JSON `Accept` header is set per request rather than through
  `extraHTTPHeaders`, which would also apply to the browser's page loads.
- **The quirk flag in the Serenity report is a `Log.the('SUT quirk: …')` entry.** The plan allowed for this fallback: the Serenity
  Playwright reporter doesn't carry `test.info()` annotations, which stay on for the Playwright report.
- **The Serenity scenario name** is the nested describe path below the top-level describe, plus the title (for example
  `Direct API transfer requests rejects invalid transfer requests rejects a missing amount`). `EXPECTED_SCENARIOS` in the check uses those exact strings.
- **Added `pretest:style-03`**, which clears the style-03 Serenity folder (the main lane's `pretest:ui` pattern), so artefacts from an
  earlier run can't satisfy or confuse the content check. The check also flags *unexpected* scenarios and non-SUCCESS results.
- **`npm audit` went from 14 to 15 HIGH, with no new advisory.** The extra entry is `@serenity-js/playwright-test` itself, flagged through the
  same transitive `axios 1.18.1` advisories that already flag every `@serenity-js/*` package. The set of root advisories is unchanged.
  The plan had expected the count to stay at 14.
- **`--features test-style-03/tests` / `--project` on `serenity-bdd run`, and the HTML half of the content check, ran only in CI.**
  There's no JDK locally, and getting the Serenity CLI jar is a download.

**Verification evidence** (local, Windows, Node 24.18.0, Docker 29.0.1):
- `typecheck:style-03`, `typecheck:style-02` and `npm run typecheck` all exit 0.
- `npm run test:style-03`: **12/12** on 5 runs (20.5 s, 19.1 s, 16.8 s, 18.7 s, 18.9 s). `check:style-03-report`: OK, 12/12 present and SUCCESS (JSON).
- `npm run test:style-02`: still 12/12 (5.2 s).
- Must-fail (reverted, never committed):
  - (a) `$51.00` gave `Expected the transferred amount to equal "$51.00" … Received string: $50.00`
  - (b) `'Credit'` gave `Expected <<the only new $13.57 ledger entry on the account>>.type to equal "Credit" … Received string: Debit`
  - (c) SUT stopped gave `ParaBank seed failed … ECONNREFUSED` in 7 s
  - (d) renaming a test made `check:style-03-report` fail with both the missing and the unexpected scenario name
  - An accidental extra: `--reporter=line` drops the Serenity reporter, and the check failed with "contains no Serenity JSON artefacts".
- `npm run verify` exit 0 in 63.6 s: unit 36/36; tag lint OK; smoke 2 + 1, seed byte-identical; API 14/14; UI 8/8; report OK on 8.
  `target/site/serenity` holds **0** style-03 artefacts.

Implementation log: [`../implementation-logs/2026-10-19_pb-style-02-test-style-03.md`](../implementation-logs/2026-10-19_pb-style-02-test-style-03.md).
Walkthrough: [`../walkthroughs/2026-10-19_pb-style-02-test-style-03.md`](../walkthroughs/2026-10-19_pb-style-02-test-style-03.md).
