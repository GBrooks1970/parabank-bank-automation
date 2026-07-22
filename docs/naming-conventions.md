<!--
  AUDIENCE: Engineers and AI agents writing code/docs in this repo.
  PURPOSE:  Naming rules so two lanes written in different phases read as one project.
  LOCATION: docs/naming-conventions.md
  TEMPLATE: portfolio templates/naming-conventions.template.md (trimmed to this project).
-->

# parabank-bank-automation — Naming Conventions

## Files and folders

- Docs and feature files: **kebab-case** (`design-document.md`, `a3-transfer-funds.feature`).
- TypeScript source: kebab-case filenames; `PascalCase` for exported classes/Screenplay
  types; `camelCase` for functions/variables.
- Feature files carry their requirement ID as prefix: `a1-register-and-login.feature`,
  `b3-rest-soap-parity.feature` — one feature file per FR, no orphan features.
- Lanes live apart, shared code lives shared: `features/ui/`, `features/api/`,
  `src/api/` (shared client), `src/screenplay/` (per-lane subfolders).

## Gherkin

- `Feature:` title = the FR title from the design document (traceability §3).
- Scenario names: outcome-phrased, no "should" ("Transfer moves funds and records two
  transactions").
- Tags per the design doc §5.9 (`@ui`/`@api`, `@mutates`, `@smoke`, `@soap`, `@negative`);
  `@smoke` never co-occurs with `@mutates` (enforced by a lint step in `verify`).

## Screenplay

- Tasks = imperative verb phrases (`TransferFunds.ofAmount(...)`);
  Questions = noun phrases (`TheAccount.balance(...)`); Abilities = `CallParaBankRest`,
  `CallParaBankSoap`, framework `BrowseTheWeb`.
- Step definitions are one-liners delegating to Tasks/Questions; logic in steps is a
  review-blocking smell.

## Decisions, requirements, phases

- Decisions: `DR-PB-NN` (docs/decision-register.md). Requirements: `FR-A[1-5]`,
  `FR-B[1-4]`. Phases: `PB-P[0-5]` (docs/backlog.md). Never renumber; retire with a note.

## Git

- Branches: `docs/…`, `feat/…`, `fix/…`, `chore/…` + short kebab slug
  (`feat/pb-p2-api-lane`).
- Commits: conventional-commit style first line; body explains *why*; reference FR/DR/PB
  ids where relevant.
- PRs: one reviewable change; owner merges (sign-off semantics per backlog gates).

## Language

- **en-GB** in prose docs ("licence", "behaviour"); code identifiers use ecosystem
  spelling (`license` field in package.json is npm's, leave it).
- ASCII in identifiers and filenames; typographic characters allowed in Markdown prose.
