# 04. Cross-Project Analysis

**Reviewer:** AI assistant (Gemini 2.5 Pro)  
**Date:** 2026-08-07T14:09Z  
**Scope:** Cross-cutting analysis within `parabank-bank-automation`  

---

## Tool-Agnostic Tests

- **Gherkin Specifications:** Feature files ([features/api/](features/api/) and [features/ui/](features/ui/)) use clean, business-focused Gherkin steps free of framework-specific directives.
- **Portability:** Step definitions separate Gherkin glue from domain logic, enabling straightforward adaptation to alternative runners if required.

---

## Code-Agnostic Tests

- **Declarative BDD Steps:** Scenarios describe user intent and business rules rather than implementation mechanics (e.g. `When "John" transfers $50.00 from account 12345 to 67890`).

---

## Single Source of Truth

- **Backlog & Governance:** [docs/backlog.md](docs/backlog.md) serves as the undisputed single source of truth for project status, completed phases, decision records, and risk logs.
- **SUT Pinning:** SUT commit SHA `d1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1` is pinned across [README.md](README.md), [docs/backlog.md](docs/backlog.md), and [scripts/build-sut.ps1](scripts/build-sut.ps1).

---

## API Contract Compliance

- **Live OpenAPI Validation:** Lane B scenario `B1` fetches `openapi.json` directly from the booted SUT and validates all 14 REST operations against live schemas using `ajv` ([src/api/spec-conformance.ts](src/api/spec-conformance.ts)).

---

## Screenplay Parity

- **Pattern Fidelity:** Actors (`Actor.named`), Abilities (`CallAnApi`, `BrowseTheWeb`), Tasks, and Questions are applied consistently across both API and UI lanes.

---

## Documentation Alignment

- **Zero Documentation Drift:** Project README, backlog, design document, decision register, and implementation logs remain perfectly aligned with current codebase capabilities.

---

## Test Coverage Metrics

- **Total Functional Scenarios:** 22 (14 API + 8 UI).
- **Unit Test Scenarios:** 12.
- **Pass Rate:** 100% passing baseline in CI.
```

---