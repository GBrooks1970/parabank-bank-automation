# Cross-Cutting Analysis

[<- Back to Index](00_CODE_REVIEW_Antigravity_v1_20261105T0856Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)

**Reviewer:** AI assistant (Antigravity)
**Date:** 2026-11-05T08:56Z

This section examines nine cross-cutting architectural dimensions across the test suites, framework modules, CI workflows, container infrastructure, and documentation within the repository.

---

## 1. Tool-Agnostic Tests

- **Cross-Framework Journey Portability:** The core banking user journeys are proven across two fundamentally different test runners: Cucumber.js (in the main lanes) and `@playwright/test` (in `test-style-02` and `test-style-03`). The underlying application interactions and verification logic remain consistent despite differing runner mechanics.
- **Protocol Independence in Verification:** Test assertions do not tie verification to a single transport. In both Cucumber UI journeys and Playwright Test specs, UI actions (e.g. submitting a transfer form) are cross-verified by querying backend REST APIs directly, ensuring that test veracity does not depend solely on DOM rendering.
- **Decoupled Performance Testing:** The k6 load testing suite ([perf/src/parabank-load.ts](perf/src/parabank-load.ts)) operates as a standalone toolchain independent of the UI and functional API runners, yet shares the same underlying SUT endpoints, URL resolution conventions, and reset-bracketing patterns.

---

## 2. Code-Agnostic Tests

- **Gherkin Business Specifications as Code-Agnostic Artifacts:** The executable Gherkin feature files in `features/` (`b1` through `b4` for APIs; `a1` through `a5` for UI) are expressed in pure natural language following declarative BDD conventions. These feature files can be consumed by Python (behave), Java (Cucumber-JVM), or C# (SpecFlow/Reqnroll) without modifying the specification text.
- **Abstract Domain Vocabulary:** Step definitions map to high-level banking domain concepts ("she transfers $50 from account X to account Y", "the funding account decreased by exactly $50") rather than low-level CSS selectors or HTTP verbs, insulating specifications from underlying implementation shifts.
- **Multi-Implementation Equivalence:** The 12 test scenarios defined in `test-style-02` (plain Playwright Test) and `test-style-03` (Serenity/JS Screenplay) share exact scenario titles, preconditions, and expected ledger assertions, proving that business intentions are decoupled from syntactic style.

---

## 3. Single Source of Truth

- **Backlog as Primary Delivery Authority:** [docs/backlog.md](docs/backlog.md) serves as the definitive source of truth for all phase gates, risk statuses, and historical implementation records. When governance or planning documents require status updates, the backlog governs precedence.
- **Live OpenAPI Bootstrap Rule:** In accordance with DR-PB-08, the API contract suite does not rely on a disconnected, static OpenAPI JSON file that risks falling out of sync with the SUT. Instead, [spec-conformance.ts](src/api/spec-conformance.ts) dynamically fetches `http://localhost:8090/parabank/services/bank/openapi.json` directly from the booted SUT at runtime.
- **Centralised Configuration and Origin Handling:** Target base URL configuration is normalised centrally in [world.ts](features/support/world.ts), [playwright.config.ts](test-style-02/playwright.config.ts), and [playwright.config.ts](test-style-03/playwright.config.ts). Every request path is written in full (`/parabank/services/bank/...`), eliminating base-path trailing-slash truncation bugs.

---

## 4. API Contract Compliance

- **Typed Operation Matrix Binding:** The REST contract suite binds 14 discrete client methods across GET, POST, and PUT operations to live OpenAPI paths, verifying HTTP status codes, media types (`application/json`, `application/xml`), and payload schemas via Ajv.
- **Auditable Deviation Accounting:** Known SUT divergences from its own published OpenAPI specification are strictly accounted for through auditable allowances:
  - `PBR-01`: SUT returns epoch millisecond integers for `Transaction.date` instead of declared `string`/`date-time`.
  - `PBR-04`: SUT returns raw plain text for mutation confirmations despite declaring `application/json`.
  - `PBR-05`: SUT returns epoch millisecond integers for `LoanResponse.responseDate` instead of `string`/`date-time`.
  Any deviation outside these approved allowances triggers an immediate test failure.
- **SOAP-REST Consistency:** Feature [b3-rest-soap-parity.feature](features/api/b3-rest-soap-parity.feature) asserts semantic contract parity between the REST service (`/services/bank/accounts/{id}`) and the legacy SOAP service (`/services/ParaBank`), validating that both return identical account balances, IDs, and account types following mutations.

---

## 5. Screenplay Parity

- **Pattern Fidelity Across Frameworks:** The Screenplay pattern is implemented with high fidelity across both Cucumber (`src/screenplay/`) and Playwright Test (`test-style-03/tests/screenplay/`). Both implementations strictly segregate Actors, Abilities, Tasks, and Questions.
- **Shared Ability Semantics:** Actors in both frameworks possess the ability to browse the web using Playwright and interact with REST APIs (`CallAnApi` in `@serenity-js/playwright-test`; `CallParaBankRest` in custom Screenplay).
- **Question and Oracle Consistency:** Questions in both Screenplay layers encapsulate interaction mechanics (e.g. querying balance figures, checking table rows) and return strongly-typed domain values rather than raw DOM elements, allowing clean assertions via Serenity/JS `Ensure` or Playwright assertions.

---

## 6. Batch File and Script Design

- **Cross-Platform Scripting Strategy:** SUT build and bootstrapping are codified in PowerShell scripts ([scripts/build-sut.ps1](scripts/build-sut.ps1) and [scripts/gate.ps1](scripts/gate.ps1)), ensuring seamless execution across Windows workstations and Linux CI runners (`shell: pwsh`).
- **Defensive Script Parameterisation:** `gate.ps1` and `build-sut.ps1` include strict parameter validation. `gate.ps1` verifies the target URL with `assertLocalSut()` before issuing requests, and `build-sut.ps1` provides dedicated flags (`-ValidateImagePinsOnly`, `-DriftReportPath`) for headless CI drift checks.
- **Unified NPM Script Orchestration:** The root [package.json](package.json) orchestrates all lifecycle steps via standard npm scripts (`typecheck`, `test:unit`, `lint:tags`, `check:smoke-safety`, `test:api`, `test:ui`, `verify`), presenting a single deterministic command for local and CI execution.

---

## 7. Documentation Alignment

- **Strong Traceability Across Deliverables:** Documentation demonstrates exceptional traceability. Worklist items reference backlog phases, implementation plans cite specific decision records, and walkthroughs provide reproducible command sequences.
- **Accurate Scope Distinctions in README:** The root [README.md](README.md) clearly distinguishes the main gating verification lane (`npm run verify`) from supplementary test styles (`test-style-02` and `test-style-03`) and the nightly performance smoke lane.
- **Documented Supply-Chain Policies:** Formal markdown policies ([container-image-pin-policy.md](docs/container-image-pin-policy.md) and [github-actions-pin-policy.md](docs/github-actions-pin-policy.md)) document the rationales, refresh procedures, and review standards for immutable digest and SHA pins.

---

## 8. Logging and Diagnostics Alignment

- **Single Stdout Formatter in Cucumber:** In alignment with portfolio lessons learned from other repositories (e.g. `magento-checkout-automation`), Cucumber is configured with exactly one stdout formatter ([cucumber.js](cucumber.js) (line 12)), preventing interleaved or corrupted terminal logs during test execution.
- **Sanitised Timeout and Abort Diagnostics:** The request deadline policy ([request-deadline.ts](src/api/request-deadline.ts) (line 34)) sanitises error logging. Credentials, URL query strings, and basic auth headers are stripped from error logs when network requests time out or abort.
- **Fail-Fast Boot Gate Diagnostics:** `scripts/gate.ps1` logs explicit HTTP status codes, latency, and response bodies for each of the four boot probes (UI, OpenAPI, SOAP, and `initializeDB`), facilitating rapid diagnosis of container boot issues.

---

## 9. Test Coverage Metrics

- **Quantitative Test Distribution:**
  - **Framework Unit Tests:** 43 tests in 10 test files (100% passing; sub-second execution).
  - **Main Cucumber Lanes:** 22 scenarios (14 API scenarios in 4 features; 8 UI scenarios in 5 features).
  - **Store-Safe Smoke Subset:** Exactly 3 scenarios (2 API, 1 UI) validated by tag linting and smoke-safety checks.
  - **Playwright Test Style 02:** 12 tests covering UI transfer, API valid/invalid transfers, and ledger debits.
  - **Screenplay Test Style 03:** 12 tests mirroring Style 02 in Screenplay syntax.
  - **Performance Smoke Lane:** 1 multi-stage k6 load script exercising ramping virtual users and threshold checks.
- **High Automation Density:** The repository achieves comprehensive coverage across all critical retail banking user flows (authentication, account creation, transfers, bill payments, and loans) across both GUI and API layers with zero manual testing requirements.

---

[<- Previous: Project Review](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_AUTOMATION.md) | [Back to Index](00_CODE_REVIEW_Antigravity_v1_20261105T0856Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)
