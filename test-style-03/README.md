# test-style-03 — Serenity/JS Screenplay on Playwright Test

The same fund-transfer brief, the same **12 tests** (identical titles and `describe` structure) and the
same assert-as-observed expectations as [`test-style-02/`](../test-style-02/README.md). The difference is
the interaction layer: here it's **Serenity/JS Screenplay** (Actors, Abilities, Tasks, Questions), run by
Playwright Test through `@serenity-js/playwright-test`. Like style-02, it targets this project's pinned
Docker SUT.

It is one of the project's additional, side-by-side styles (DR-PB-12), and sits outside `npm run verify`.
CI runs it as its own step and checks the content of its separate Serenity BDD report.

## Run it

```bash
pwsh ./scripts/build-sut.ps1 && docker compose up -d && pwsh ./scripts/gate.ps1   # SUT up and seeded
npm ci && npx playwright install chromium                                         # once
npm run typecheck:style-03
npm run test:style-03            # 12 tests; also writes the Serenity BDD JSON
npm run report:style-03          # Serenity BDD HTML (needs Java; a no-op without it)
npm run check:style-03-report    # all 12 scenarios present and SUCCESS (+ HTML when Java/CI)
```

| Output | Where (all gitignored) |
|---|---|
| Serenity BDD JSON + HTML | `test-style-03/target/site/serenity/`, kept apart from the main lane's `target/site/serenity`, which feeds `check:report` and Pages |
| Playwright HTML report | `test-style-03/playwright-report/` |
| Traces and failure photos | `test-style-03/test-results/` |

> Overriding the reporter on the command line (for example `--reporter=line`) **replaces** the configured
> reporters, including Serenity's, so no Serenity JSON is written. `check:style-03-report` then fails.
> Use the npm script for evidence runs.

The settings are the same as style-02's (see [`.env.example`](.env.example)): `PARABANK_URL`,
`PARABANK_USERNAME` / `PARABANK_PASSWORD` and `PARABANK_SKIP_RESET`. `global-setup.ts` reseeds through
`initializeDB` (DR-PB-06).

## How the Screenplay maps onto the brief

The integration's default `actors` fixture gives the actor **John** three abilities:
`BrowseTheWebWithPlaywright` (on Playwright Test's own `page`), `CallAnApi` (axios on the config's
`baseURL`) and `TakeNotes`. There's no custom cast, and no `beforeEach` to set one up.

| Brief | Test (same title as style-02) | Screenplay |
|---|---|---|
| Part 1: UI $50 transfer from Checking to Savings | *transfers $50 from Checking to Savings and the UI confirms it* | `DiscoverTheStandardCustomer`, then `LogIn`, `OpenTransferFunds`, `TransferFundsThroughTheUi`, then `Ensure` on the result `Text` questions and a REST `TheBalanceChangeOf` |
| Part 2: valid transfer | *handles a successful transfer request* | `TransferViaTheApi`, then `Ensure` on `LastResponse.status()` / `.body<string>()` |
| Part 2: invalid requests rejected | *rejects invalid transfer requests* (6 cases) | the same loop as style-02; each checks status > 299, the observed status and body, and `TheBalanceChangeOf('checking')` = 0 |
| Part 2: SUT quirks | *observed acceptance* (3) | Playwright `sut-quirk` annotation **and** a Serenity `Log.the('SUT quirk: …')` entry |
| Part 3: ledger debit | *Transaction history validation* | `RecordTheTransactionIdsOf`, a transfer of 13.57, then `TheOnlyNewLedgerEntryOf(...)` `.type` / `.description` / `.amount` |

The Given/When/Then of the UI test are named Tasks (`Task.where('#actor …')`). Both the Playwright and the
Serenity reports show them as steps.

Account IDs are discovered into the actor's notepad (`screenplay/notes.ts`) and are never hard-coded.
The discovery rule is the same as style-02's: the first CHECKING account with at least $100, and the
first SAVINGS account, opened if there isn't one.

## Layout

```
test-style-03/
├── playwright.config.ts          # Serenity reporter + crew, serial, baseURL = origin
├── global-setup.ts               # initializeDB seed (same as style-02)
├── tsconfig.json
└── tests/
    ├── screenplay/
    │   ├── ui/      targets.ts · tasks.ts · questions.ts
    │   ├── api/     endpoints.ts · tasks.ts · questions.ts
    │   └── notes.ts                # typed notepad: what the actor remembers
    ├── fund-transfer-fe.spec.ts
    └── fund-transfer-api.spec.ts
```

## Three styles, one set of tests

| Concern | `test-style-02/` | `test-style-03/` (this) | Main lanes (`features/`) |
|---|---|---|---|
| Runner | Playwright Test | Playwright Test | Cucumber |
| Spec language | `test` + `test.step` | `test` + named Screenplay `Task`s | Gherkin + step definitions |
| UI interaction | page objects, native `Locator`s | `PageElement` targets, `Click`/`Enter`/`Select` interactions | Serenity/JS Screenplay (same model as here) |
| API interaction | `APIRequestContext` helper class | `CallAnApi` + `Send`/`LastResponse` (`@serenity-js/rest`) | hand-rolled Screenplay over `fetch` |
| State between steps | local variables, fixtures | the actor's notepad (`TakeNotes`) | the actor's notes and the Cucumber world |
| Assertions | `expect(...)` | `Ensure.that(question, expectation)` | `Ensure` (UI) / `assert` (API) |
| Report | Playwright HTML | Serenity BDD (content-checked) + Playwright HTML | Serenity BDD (content-checked, on Pages) |

Plan and decisions: [`docs/implementation-plans/2026-10-19_pb-style-02-serenity-screenplay-test-style-03.md`](../docs/implementation-plans/2026-10-19_pb-style-02-serenity-screenplay-test-style-03.md).
