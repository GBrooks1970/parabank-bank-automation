# test-style-02 — plain Playwright Test

The `sdet-technical-task` fund-transfer brief implemented in **plain `@playwright/test`**:
page-object classes, an `APIRequestContext` helper, `test.extend` fixtures and `test.step`.
It runs against this project's pinned Docker SUT, not the shared public demo.

This is a second, **non-gating-by-`verify`** style beside the project's main lanes, which are
Cucumber + Screenplay for the API and Serenity/JS + Playwright + Cucumber for the UI (DR-PB-12).
It shares their SUT, image pins and reset contract, and it never replaces them. CI runs it as its
own step after `npm run verify`.

## Run it

```bash
pwsh ./scripts/build-sut.ps1 && docker compose up -d && pwsh ./scripts/gate.ps1   # SUT up and seeded
npm ci && npx playwright install chromium                                         # once
npm run typecheck:style-02
npm run test:style-02
```

`global-setup.ts` reseeds through `initializeDB` (expects 204) before any test runs (DR-PB-06).
When the SUT is down it fails within seconds with a clear message.
The HTML report is written to `test-style-02/playwright-report/`. Traces and screenshots are kept
on failure in `test-style-02/test-results/`. Both are gitignored.

Settings (see [`.env.example`](.env.example); export them, there is no dotenv):

| Variable | Default | Use |
|---|---|---|
| `PARABANK_URL` | `http://localhost:8090` | Origin only, with no `/parabank`; paths are written in full |
| `PARABANK_USERNAME` / `PARABANK_PASSWORD` | `john` / `demo` | Seeded customer |
| `PARABANK_SKIP_RESET` | unset | `1` skips the `initializeDB` reset, for a shared environment you must not reset |

To rehearse against the public demo (best effort, never in CI), set
`PARABANK_URL=https://parabank.parasoft.com` and `PARABANK_SKIP_RESET=1`. The public demo's data
and behaviour aren't pinned, so the assert-as-observed expectations may not hold there.

## Requirement map

| Brief | Test | Project requirement |
|---|---|---|
| Part 1: UI $50 transfer from Checking to Savings | `fund-transfer-fe.spec.ts` › *transfers $50 from Checking to Savings and the UI confirms it* (plus a REST balance cross-check) | FR-A3 |
| Part 2, req 1: a valid direct transfer | `fund-transfer-api.spec.ts` › *handles a successful transfer request* | FR-B2 (transfer) |
| Part 2, req 2: invalid requests are rejected | › *rejects invalid transfer requests* (6 data-driven cases) | FR-B4 |
| Part 2: SUT quirks, assert-as-observed | › *observed acceptance* (negative amount, same account, overdraft), annotated `sut-quirk` | FR-B4, design doc §5.7 |
| Part 3: debit in the source account's ledger | › *Transaction history validation* | FR-B2 (ledger) |

Account IDs are **discovered, never hard-coded** (`tests/support/accounts.ts`). The helper takes the
first CHECKING account holding at least $100, so the happy path is a genuine in-funds transfer and
not a permitted overdraft, and the first SAVINGS account. If there is no SAVINGS account, it opens one.

Rejection expectations were observed live against `d1bf006` on 2026-10-19:

| Request | Observed |
|---|---|
| Unknown `fromAccountId` / `toAccountId` | 400, `Could not find account number <from> and/or <to>` |
| Missing `fromAccountId` | 400, the same message with account `0` |
| Non-numeric account or amount | 404, empty body |
| Missing amount | 500, HTML error page |
| Negative amount, same account, overdraft | **200, accepted** (SUT quirk) |

## Layout

```
test-style-02/
├── playwright.config.ts      # serial, 1 worker, list + html reporters, baseURL = origin
├── global-setup.ts           # initializeDB seed (DR-PB-06)
├── tsconfig.json             # own typecheck; outside the root tsconfig on purpose
└── tests/
    ├── pages/                # LoginPage, LeftNav, TransferPage: readonly Locators + actions
    ├── support/              # ParaBankApi (APIRequestContext), discoverCustomer, fixtures
    ├── fund-transfer-fe.spec.ts
    └── fund-transfer-api.spec.ts
```

## The two styles side by side

| Concern | Main lanes (`features/`, `src/screenplay/`) | test-style-02 |
|---|---|---|
| Spec language | Gherkin `.feature` + step definitions | `test.describe` / `test` + `test.step('Given …')` |
| Interaction model | Screenplay: Actor → Ability → Task / Question | Page objects + API helper, injected by `test.extend` fixtures |
| Locators | `PageElement.located(By.css(…)).describedAs(…)` (Serenity/JS) | `page.locator(…)` / `getByRole(…)` (native Playwright) |
| HTTP | `fetch` via the shared `ParaBankRestClient` | Playwright `APIRequestContext` (`request` fixture) |
| Reporting | Serenity BDD living documentation (content-verified) | Playwright list + HTML report, trace on failure |
| Runner | `cucumber-js --profile api|ui` | `playwright test -c test-style-02/playwright.config.ts` |

The two styles don't mix. `By` and `.describedAs()` are Serenity/JS APIs and don't exist on a
Playwright `Locator`. Shared knowledge (selectors, SUT quirks) moves between them as **facts**, not
as code.

Fixtures (D5 option a) remove repeated setup. The equivalent in the source scaffold's
`beforeEach` style is:

```ts
let api: ParaBankApi;
let customer: DiscoveredCustomer;
test.beforeEach(async ({ request }) => {
  api = new ParaBankApi(request);
  customer = await discoverCustomer(api);
});
```

Plan and decisions: [`docs/implementation-plans/2026-10-19_pb-style-01-playwright-test-style-02.md`](../docs/implementation-plans/2026-10-19_pb-style-01-playwright-test-style-02.md).
