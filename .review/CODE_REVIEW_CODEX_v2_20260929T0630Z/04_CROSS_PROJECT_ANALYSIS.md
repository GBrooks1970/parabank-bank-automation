# Cross-Cutting Analysis

[<- Back to Index](00_CODE_REVIEW_CODEX_v2_20260929T0630Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)

**Reviewer:** AI assistant (Codex GPT-6)
**Date:** 2026-09-29T06:30Z

## Tool-Agnostic Tests

- Gherkin expresses journeys but bindings depend on Cucumber and the two Screenplay runtimes.
- API metadata/models can be reused without Playwright; UI Tasks depend on Serenity web abstractions.
- No second framework implementation exists; portability is potential, not verified parity. See [cucumber.js](../../cucumber.js) (line 6).

## Code-Agnostic Tests

- REST, SOAP and browser boundaries are independent of ParaBank's Java implementation language.
- Source/image pins stabilise observed behaviour, including unconventional errors.
- Test code is TypeScript; no cross-language implementation is claimed. See [README.md](../../README.md) (line 20).

## Single Source of Truth

- Gherkin feeds tag/report consistency checks.
- Typed operation metadata connects 14 client methods to live contracts without duplicating the whole specification.
- Backlog headers and summary conflict around pending closure and advisory triage (R-05). See [backlog.md](../../docs/backlog.md) (line 16).

## API Contract Compliance

- Validation resolves actual method/path/status/media/schema entries, stronger than checking detached component schemas.
- Named PBR exceptions are operation-bound and require reconsideration on SUT upgrades.
- Credentials in GET paths and query mutations are observed demo behaviour, not recommended production API design. See [spec-conformance.ts](../../src/api/spec-conformance.ts) (line 90).

## Screenplay Parity

- UI uses Serenity Tasks/Questions/Abilities; API uses minimal equivalent concepts.
- Both can inspect REST state; B3 adds SOAP account-field parity.
- Reporting is intentionally asymmetric: Serenity covers UI; API contract coverage appears in Cucumber logs. See [qa-strategy.md](../../docs/qa-strategy.md) (line 93).

## Batch File Design

- N/A - no Windows batch implementation; PowerShell/Node scripts are the orchestration layer.
- PowerShell builds on Windows/Linux with native exit checks and centralised immutable image inputs.
- R-01/R-02 concern lifecycle/output correctness; changing script language is unnecessary. See [build-sut.ps1](../../scripts/build-sut.ps1) (line 143).

## Documentation Alignment

- README 14/8 scenario claims match fresh discovery; earlier phase counts are dated history.
- Backlog remains authoritative but internally inconsistent (R-05).
- QA non-functional scope and Compose auto-seed wording lag delivered behaviour. See [qa-strategy.md](../../docs/qa-strategy.md) (line 35).

## Logging Alignment

- Safe deadline diagnostics use route templates; UI passwords are masked.
- Public artefacts are content-checked and scanned for token/header/path leakage.
- Perf provenance identifies dates/commits, but unconditional uploads may collect earlier reports (R-02). See [perf.yml](../../.github/workflows/perf.yml) (line 57).

## Test Coverage Metrics

- 36 framework units passed; no coverage percentage or SUT unit coverage was measured.
- API dry-run found 14 scenarios/49 steps; UI dry-run found 8/49; all were skipped.
- Tag lint passed for three smoke scenarios; smoke-safety was not run and R-01 limits its proof.
- k6 remains optional threshold-gated smoke, not capacity evidence. See [perf-lane-design.md](../../docs/perf-lane-design.md) (line 14).

---

[<- Previous: Project Review](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md) | [Back to Index](00_CODE_REVIEW_CODEX_v2_20260929T0630Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)
