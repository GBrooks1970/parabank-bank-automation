# Cross-Cutting Analysis

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)

**Reviewer:** AI assistant (CODEX GPT-5)

For this single-repository review, "cross-project" means alignment across the API suite, UI suite,
shared framework, Docker lifecycle, CI, and documentation.

## Tool-Agnostic Tests

- Gherkin describes user and protocol outcomes without Playwright selectors or fetch mechanics,
  so the business intent could survive a runner change.
- Requirement IDs A1-A5/B1-B4 and behavioural tags are independent of the implementation tools.
- Serenity-specific report setup and Cucumber expression wording are appropriately confined to
  support and glue files, not feature prose.
- The UI Tasks are framework-specific by design; tool portability exists at the specification
  boundary, not at the implementation boundary.

## Code-Agnostic Tests

- Feature files do not depend on TypeScript syntax and could be rebound to another language.
- Public API oddities are documented as observable HTTP/SOAP behaviour, which is portable.
- The custom Screenplay core and policy scripts are TypeScript/Node implementations, so framework
  code itself is not language-agnostic and does not need to be.
- Hardcoded seeded identifiers are SUT-contract dependencies, not language dependencies.

## Single Source of Truth

- `docs/backlog.md` is clearly designated as the canonical project state and currently says the
  project is resting.
- A1-A5/B1-B4 identifiers connect design requirements, feature files, and phase evidence well.
- The fixed smoke count is duplicated in design prose and a policy script, but the script converts
  that duplication into an explicit drift gate.
- README status has drifted from the backlog, and FR-B1/ISTQB coverage language needs
  reconciliation with executable evidence.

## API Contract Compliance

- The live OpenAPI document is fetched from the pinned running SUT, eliminating snapshot drift.
- PBR-01 is a narrow, named exception rather than a blanket schema bypass.
- The validator checks named components, not complete operation-response contracts; most client
  operations are not exercised by FR-B1.
- REST/SOAP parity provides valuable cross-interface state evidence, but it is not a substitute
  for full OpenAPI operation coverage.
- Mutating query parameters and unconventional errors are explicitly framed as observed demo-SUT
  behaviour rather than endorsed REST design.

## Screenplay Parity

- Both lanes express work through Tasks and reads through Questions, with abilities holding
  transport/browser concerns.
- Scenario-scoped notes carry dynamic IDs and balances consistently across the hand-rolled and
  Serenity actors.
- The Lane A REST cross-check actor is separate from the Serenity UI actor, which is pragmatic but
  worth explaining to learners because it is not one actor with multiple abilities.
- UI step definitions perform more assertion composition than the design's thin-glue statement
  implies; extraction into Questions/Tasks would improve parity.

## Batch File Design

N/A - the repository has no Windows `.bat` orchestration to compare.

- PowerShell 7 scripts are the cross-platform lifecycle contract for Windows and Ubuntu CI.
- `build-sut.ps1` checks external command exit codes after Git, Maven-container, and compose
  operations.
- `gate.ps1` polls readiness and fails at the first unmet surface contract.
- The Maven builder image and runtime base should be digest-pinned to match the source-pin policy.

## Documentation Alignment

- Backlog, project contract, decision register, QA strategy, design, audit, and implementation log
  provide strong cold-resume context.
- The backlog's phase evidence maps to real PRs, commits, and CI runs.
- README PB-P5 status conflicts with the authoritative resting state.
- The QA strategy claims boundary cases that the feature suite does not implement.
- Handover v2 is paired and semantically useful but predates the final closure merge, preserving
  an advisory freshness warning.

## Logging Alignment

- Lane B progress output is intentionally simple; non-zero Cucumber exit status is the gate.
- Serenity artifacts and failure-only screenshots give the UI lane richer diagnostic evidence.
- CI captures ParaBank container logs on failure and always tears the service down.
- Network timeout errors should include operation context so failures are diagnosable without
  relying solely on a generic Cucumber step timeout.
- N/A - there is no application logging layer in this repository; it tests an externally fetched
  SUT.

## Test Coverage Metrics

- 18 bound scenarios: 10 API scenarios with 47 steps and 8 UI scenarios with 49 steps.
- Three smoke scenarios are fixed by policy: two API and one UI; tag lint passed.
- Nine functional IDs are represented: five UI journeys and four API scenario shapes.
- Zero tracked unit/spec test files cover the repository's own helpers.
- Coverage is requirements/scenario based; no line or branch coverage tool is configured, which
  is acceptable for SUT E2E code but leaves helper-code risk unquantified.

---

[<- Previous: Project Review](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)
