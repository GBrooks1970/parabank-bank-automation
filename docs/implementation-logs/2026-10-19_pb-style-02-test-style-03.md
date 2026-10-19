<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-10-19_pb-style-02-test-style-03.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# PB-STYLE-02 — `test-style-03/`, Serenity/JS Screenplay on Playwright Test — 2026-10-19

## Session Summary

The goal was to re-implement test-style-02's 12 fund-transfer tests in Serenity/JS Screenplay under Playwright Test, keeping the
titles, structure and expectations, and so complete a three-way style comparison. It is delivered as `test-style-03/`: 12/12 green,
with its own content-checked Serenity BDD report and a separate CI step. `npm run verify` and style-02 are unchanged. A PR is opened
for the owner to merge.

---

## Objectives

1. ✅ Step 0 spike: Serenity REST and reporter mechanics confirmed against the local SUT
2. ✅ Add `@serenity-js/playwright-test` and `@serenity-js/rest` (exact 3.44.1) and the style-03 scripts
3. ✅ Screenplay layer: UI targets, tasks and questions; API endpoints, tasks and questions; a typed notepad
4. ✅ Two specs with the same 12 titles as style-02
5. ✅ Serenity report generation (Java-optional) and a content check keyed on the exact scenario names
6. ✅ Verification: 5 green runs, 4 must-fail checks, style-02 and `verify` unchanged, report isolation
7. ✅ Docs (README ×2, DR-PB-12 generalised, design doc v1.10, naming, backlog v32) and the CI step
8. ⏸️ Merge and post-merge CI (owner); capability-matrix row (root-repo PR, covering both styles)

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Node test runner | Framework unit | 36/36 | 36/36 | ✅ PASS |
| Cucumber | `@smoke` (api + ui) | 3/3 | 3/3 | ✅ PASS (seed byte-identical) |
| Cucumber + Screenplay | API lane | 14/14 | 14/14 | ✅ PASS |
| Serenity/JS + Playwright | UI lane | 8/8 | 8/8 | ✅ PASS |
| Report check | Main Serenity JSON | 8/8 | 8/8 | ✅ PASS (0 style-03 artefacts) |
| Playwright Test | `test-style-02` | 12/12 | 12/12 | ✅ PASS |
| Serenity/JS on Playwright Test | `test-style-03` | — | 12/12 (×5 runs) | ✅ PASS |
| Report check | Style-03 Serenity JSON | — | 12/12 SUCCESS | ✅ PASS (HTML in CI only) |

---

## Changes Implemented

### Dependencies and scripts

**Files changed:**
- `package.json` / `package-lock.json`: `@serenity-js/playwright-test` and `@serenity-js/rest`, both **exactly `3.44.1`**; scripts `typecheck:style-03`,
  `pretest:style-03` (cleans the report folder), `test:style-03`, `report:style-03` and `check:style-03-report`.
- `.gitignore`: style-03's `test-results/`, `playwright-report/` and `target/`.

### The suite (`test-style-03/`, new)

- `playwright.config.ts`: `defineConfig<SerenityFixtures, SerenityWorkerFixtures>`. Reporters are list, html and
  `@serenity-js/playwright-test` (`serenity-bdd` + `ArtifactArchiver` → `test-style-03/target/site/serenity`). `use` sets `baseURL`,
  `defaultActorName: 'John'` and a `Photographer` crew that takes photos of failures.
- `global-setup.ts`, `tsconfig.json`, `.env.example`: the same as style-02.
- `tests/screenplay/ui/`: `targets.ts` (`PageElement`s, with `q`-templated option selectors fed by noted IDs), `tasks.ts` (`LogIn`,
  `OpenTransferFunds`, `TransferFundsThroughTheUi`, which waits for the concrete options) and `questions.ts` (`Text.of` the result fields).
- `tests/screenplay/api/`:
  - `endpoints.ts` (types, `BANK`, headers, `cents`)
  - `tasks.ts` (`DiscoverTheStandardCustomer`, using `Check.whether(...).andIfSo/otherwise` to open a SAVINGS account if needed; `TransferViaTheApi`; `RecordTheBalanceOf`; `RecordTheTransactionIdsOf`)
  - `questions.ts` (balances, balance change in cents, new ledger entries filtered by ID diff and amount, overdraft amount)
- `tests/screenplay/notes.ts`: the typed `ParaBankNotes` notepad.
- `tests/fund-transfer-fe.spec.ts` / `fund-transfer-api.spec.ts`: the 12 tests, using `actor.attemptsTo(...)` and `Ensure.that(...)`.

### Report and CI

**Files added or changed:**
- `scripts/report-style-03.mjs`: the Java-optional `serenity-bdd run` with its own `--source`/`--destination`, `--features test-style-03/tests` and the pinned CLI 4.3.4.
- `scripts/check-style-03-report.ts`: checks the exact `EXPECTED_SCENARIOS` (written out, not imported) are present and SUCCESS, that there are no unexpected or invalid artefacts, and, under Java/CI, that the HTML exists.
- `.github/workflows/ci.yml`: a style-03 step (typecheck, suite, report, check) and the `test-style-03-report` artifact (existing pinned `upload-artifact` SHA).

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Exact `3.44.1` pins | Every later 3.x (3.44.2/3, 3.49.0) moves the `@playwright/test` peer beyond the reviewed `~1.61.1` | `^` / `~` ranges (both ERESOLVE), or bumping Playwright (out of scope, affects every lane) |
| Use the integration's default actors | They already have all three abilities, on the config's `baseURL` | A custom `useFixtures({ actors })` cast that duplicates them |
| `Accept: application/json` per request | `extraHTTPHeaders` would also apply to browser navigations | A global header |
| `Log.the(...)` for quirks in the Serenity report | The reporter doesn't map `test.info()` annotations | Title tags, or omitting the quirk from the Serenity report |
| Questions that fetch state call `CallAnApi.as(actor).request` | They read fresh state inside `Ensure`; the specs assert `LastResponse` first, because these calls replace it | Separate `Send` + `LastResponse` per check, which would need many more steps |

Structural record: **DR-PB-12**, generalised to "additional test styles in `test-style-NN/`".

---

## Documentation Updates

- `test-style-03/README.md`: how to run it, outputs, the reporter-override warning, the Screenplay requirement map and the three-way comparison
- `README.md`: "Additional test styles" (style-02 and style-03)
- `docs/decision-register.md`: DR-PB-12 generalised
- `docs/design-document.md`: v1.10, §5.11
- `docs/naming-conventions.md`: style-03 Screenplay naming
- `docs/backlog.md`: v32 (PB-STYLE-01 complete; PB-STYLE-02 added)
- `docs/implementation-plans/`: PB-STYLE-01 marked delivered; PB-STYLE-02 approved, with Outcome; index rows

---

## Lessons Learned

- **A caret range doesn't follow a peer pin.** `^3.44.1` in a fresh install takes the newest 3.x, and Serenity/JS moves its
  `@playwright/test` peer with almost every patch release. When a framework's peer tracks another pinned dependency, pin the framework exactly.
- **`--reporter=…` replaces the configured reporters.** A "quieter" ad-hoc run silently dropped the Serenity reporter, and only the
  content check caught it. That is the empty-shell lesson again, and the reason report evidence must be content-checked.
- **Read the integration's fixtures before designing your own.** Ten minutes in `test-api.js` removed a whole planned file.
- **`npm audit` counts packages, not advisories.** A new package that depends on an already-flagged one raises the count without any new risk; compare the root advisories.
