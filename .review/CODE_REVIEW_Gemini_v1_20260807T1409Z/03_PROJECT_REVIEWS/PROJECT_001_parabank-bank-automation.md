# 03. Project Review: parabank-bank-automation

**Reviewer:** AI assistant (Gemini 2.5 Pro)  
**Date:** 2026-08-07T14:09Z  

---

## Architectural & Design Overview

`parabank-bank-automation` implements a clean, multi-layered architecture supporting two distinct test lanes over a containerised ParaBank Java web application:
- **Lane A (UI):** Utilises Serenity/JS with Playwright and Cucumber BDD. UI interactions are modeled using the Screenplay pattern with distinct Actors, Tasks, Questions, and Page Element targets.
- **Lane B (API):** Implements a lightweight Screenplay BDD layer over a custom TypeScript HTTP REST and SOAP client.
- **Infrastructure Layer:** Docker Compose orchestrates the SUT build from pinned upstream source commit `d1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1`.

---

## Code Quality & Maintainability

- **TypeScript Standard:** Modern ESM syntax compiled with `moduleResolution: NodeNext` ([tsconfig.json](tsconfig.json) line 6).
- **Network Resilience:** All HTTP operations are wrapped in `withRequestDeadline` ([src/api/request-deadline.ts](src/api/request-deadline.ts) line 14) enforcing a 10-second timeout.
- **XML Safety:** SOAP envelope construction ([src/api/soap.ts](src/api/soap.ts) line 33) enforces XML character escaping and regex validation (`SAFE_XML_NAME`).

---

## Test Coverage & Execution Strategy

- **API Coverage (Lane B):** 14 Gherkin scenarios across B1 (REST spec conformance), B2 (stateful multi-step flow), B3 (REST/SOAP parity), and B4 (negative paths).
- **UI Coverage (Lane A):** 8 Gherkin scenarios across A1 (registration/login), A2 (open account), A3 (transfer funds), A4 (bill pay), and A5 (request loan).
- **Unit Test Coverage:** 12 SUT-independent unit tests ([tests/unit/](tests/unit/)) covering tag linting, SOAP envelope building, deadline cancellation, and HTML report integrity.
- **Smoke Suite:** 3 store-safe scenarios marked `@smoke` (2 API + 1 UI), verified by [scripts/smoke-safety.mjs](scripts/smoke-safety.mjs) to guarantee zero database state mutation.

---

## Documentation Quality

- **Comprehensive Backlog:** [docs/backlog.md](docs/backlog.md) provides complete lifecycle tracking for all delivery phases, decision records (DR-PB-01 to DR-PB-10), and review remediation cycles.
- **Living Documentation:** Serenity BDD HTML reports generated automatically during execution and published deterministically to GitHub Pages.

---

## Key Strengths

1. Strict separation of test concerns across API, UI, and Unit layers.
2. Complete seed-and-reset contract preventing flaky test execution.
3. Automated security and secret scanning prior to public evidence publication.

---

## Key Weaknesses

1. Deprecated Node 20 runtime dependency in CI workflow actions (Risk PBR-02).
2. Minor Serenity/JS version skew between `@serenity-js/serenity-bdd` and core packages.
```

---