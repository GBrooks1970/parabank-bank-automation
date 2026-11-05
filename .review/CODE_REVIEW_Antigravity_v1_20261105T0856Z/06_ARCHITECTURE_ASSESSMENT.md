# Architecture Assessment

[<- Back to Index](00_CODE_REVIEW_Antigravity_v1_20261105T0856Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)

**Reviewer:** AI assistant (Antigravity)
**Date:** 2026-11-05T08:56Z

This document evaluates the architectural alignment, engineering trade-offs, and design gaps of `parabank-bank-automation` against core software engineering principles and industry test automation standards.

---

## 1. Test Pyramid

### Alignment
- **Fast Unit Foundation:** The project includes a dedicated sub-second unit test lane ([run-unit-tests.mjs](scripts/run-unit-tests.mjs)) with 43 tests verifying framework utilities (tag inheritance, SOAP XML safety, OpenAPI operation filtering, deadline redaction, and report parsing) completely decoupled from the heavyweight SUT container.
- **Broad API Integration Middle Layer:** The API lane (14 BDD scenarios plus Style 02/03 API specs) validates contract compliance, multi-step financial flows, negative paths, and REST-SOAP parity, providing comprehensive functional verification faster and more reliably than browser automation.
- **Focused, High-Value E2E UI Apex:** The UI layer is constrained to 8 essential user journeys (registration, account opening, fund transfer, bill pay, and loans), keeping execution times manageable and avoiding brittle over-reliance on browser rendering.

### Gaps
- **Absence of SUT Unit Tests:** In accordance with DR-PB-01, unit tests for the upstream ParaBank Java application are intentionally omitted from our build pipeline. While this is appropriate for an automation consumer testing an external SUT, the pyramid relies entirely on black-box integration and E2E verification for the application layer.

---

## 2. SOLID Principles

### Alignment
- **Single Responsibility Principle (SRP):** Classes and modules have tightly focused responsibilities:
  - `ParaBankRestClient` ([client.ts](src/api/client.ts)) handles HTTP transport and endpoint mapping.
  - `SpecConformance` ([spec-conformance.ts](src/api/spec-conformance.ts)) handles schema validation.
  - Screenplay Tasks (`LogInAs`, `TransferFundsUI`) orchestrate interactions, while Questions (`TheAccount`, `TheOverviewTableText`) handle state extraction.
- **Open/Closed Principle (OCP):** The Screenplay pattern inherently satisfies OCP; new user interactions or verification questions are added by implementing new Task or Question classes without modifying existing actor execution engines.
- **Liskov Substitution Principle (LSP):** Abilities in Serenity/JS (`BrowseTheWebWithPlaywright`, `CallParaBankRest`) cleanly implement their respective interfaces, allowing actors to seamlessly interchange underlying browser pages or API contexts.
- **Interface Segregation Principle (ISP):** Client interfaces are segregated into concise, role-specific contracts rather than monolithic god-interfaces (e.g. separating SOAP envelope builders from REST client operations).
- **Dependency Inversion Principle (DIP):** High-level step definitions and tasks depend on abstract abilities (`CallAnApi`, `BrowseTheWeb`) rather than directly instantiating low-level HTTP libraries or Playwright browser instances.

### Gaps
- **Coupling in Global World Hooks:** In the Cucumber implementation, `PBWorld` ([world.ts](features/support/world.ts)) couples test context, actor state, and live OpenAPI spec singletons, creating a minor violation of DIP across step definitions.

---

## 3. KISS (Keep It Simple, Stupid)

### Alignment
- **Zero-Dependency Lightweight SOAP Client:** Rather than pulling in heavyweight, complex SOAP/WSDL client libraries (such as `soap` or `strong-soap`), the project implements a clean 60-line XML envelope builder and parser ([soap.ts](src/api/soap.ts)), leveraging native `fetch`.
- **Pure JavaScript Test Runner for Unit Tests:** The unit test suite utilises Node's native `node:test` and `node:assert/strict` runners ([run-unit-tests.mjs](scripts/run-unit-tests.mjs)), avoiding the complexity and overhead of bulky third-party test runners like Jest or Mocha.
- **Straightforward Docker Compose Topology:** The container setup ([docker-compose.yml](docker-compose.yml)) runs a single container with a single mapped port (`8090:8080`), avoiding multi-container networking complexity while satisfying all test requirements.

### Gaps
- **Multi-Repo Synchronization Overhead:** Maintaining parallel test implementations across three distinct styles (`features/ui/`, `test-style-02/`, and `test-style-03/`) introduces maintenance duplication, requiring identical updates across multiple files when underlying banking business logic changes.

---

## 4. YAGNI (You Aren't Gonna Need It)

### Alignment
- **Pruned Container Port Mappings (DR-PB-04):** Although upstream ParaBank exposes HSQLDB (port 9001) and ActiveMQ (port 61616), the project explicitly maps only Tomcat port 8080 (to host 8090), deliberately omitting unneeded services to prevent port clashes and reduce attack surface.
- **Scope Trimming on Legacy Modules:** In accordance with the approved scoping plan, complex legacy features such as the stock positions module and broader `LoanProcessor` SOAP services were intentionally excluded from initial phases, avoiding over-engineering before core banking journeys were secured.
- **Focused Performance Smoke:** Rather than implementing an elaborate, full-scale load and stress testing infrastructure, the performance lane is strictly framed as a lightweight performance-smoke threshold check.

### Gaps
- **Redundant Style Implementations:** While pedagogically invaluable, maintaining both plain Playwright Test (`test-style-02`) and Serenity/JS Playwright Test (`test-style-03`) represents duplicate coverage for the same 12 test scenarios, which in a commercial environment would violate YAGNI.

---

## 5. REST + OpenAPI

### Alignment
- **Dynamic Spec Ingestion (DR-PB-08):** The framework dynamically retrieves the live OpenAPI 3.0.1 specification from the running SUT at `http://localhost:8090/parabank/services/bank/openapi.json`, eliminating static mock drift.
- **Strict Media Type and Schema Validation:** All 14 in-scope operations validate response schemas via Ajv, asserting that responses match declared types (`application/json`, `application/xml`).
- **Standard HTTP Method Usage:** Operations accurately map to RESTful standards (GET for queries, POST for mutations, PUT for updates) with HTTP status codes verified.

### Gaps
- **Upstream Spec Violations (PBR-01, PBR-04, PBR-05):** ParaBank exhibits several non-standard REST behaviours (mutations via query parameters, returning unquoted plain text for JSON responses, returning HTTP 400 instead of 404 for missing entities). The framework handles these via auditable allowances rather than fixing upstream code.

---

## 6. ISTQB Strategies

### Alignment
- **Equivalence Partitioning & Boundary Value Analysis (DR-PB-09):** Systematically applied across transfer amounts: zero (`$0.00`), minimum positive (`$0.01`), exact available balance depletion, exceeding available balance (overdraft), and non-numeric inputs.
- **State Transition Testing:** Applied to account lifecycles in `b2-stateful-flow.feature` (customer login -> account creation -> initial deposit -> inter-account transfer -> transaction history ledger validation).
- **Decision Table Testing:** Applied to loan application approvals in `a5-request-loan.feature` based on the SUT's internal two-gate decision logic (available funds ceiling + 20% down-payment ratio).
- **Use Case Testing:** UI journeys mirror realistic customer workflows from initial registration to multi-step bill payments.

### Gaps
- **Pairwise / Combinatorial Testing:** Form inputs (such as registration and bill pay forms) use representative happy-path data sets rather than extensive combinatorial or orthogonal array testing.

---

## 7. Pedagogical Comments

### Alignment
- **Explanatory In-Code Rationale:** Code files across `src/` and `tests/` contain extensive pedagogical comments explaining *why* specific design choices were made (e.g. explaining in-container WAR renaming, tsx loader selection over ts-node, and one-stdout-formatter rules).
- **Comprehensive Decision Records:** Every architectural deviation is formally recorded in [decision-register.md](docs/decision-register.md) with explicit problem statements and evaluated options.
- **Self-Documenting Architecture Test:** [destructive-call-sites.test.ts](tests/unit/destructive-call-sites.test.ts) acts as executable documentation, explicitly listing all approved destructive operation call sites and explaining the required security guards.

### Gaps
- **Gherkin Step Definitions Lack Inline Docstrings:** While feature files are clean and business-readable, some complex step definitions in `features/ui/steps/ui.steps.ts` would benefit from expanded explanatory comments detailing specific locator trade-offs.

---

[<- Previous: Recommendations](05_RECOMMENDATIONS.md) | [Back to Index](00_CODE_REVIEW_Antigravity_v1_20261105T0856Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)
