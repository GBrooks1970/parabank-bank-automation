# Recommendations

[<- Back to Index](00_CODE_REVIEW_Antigravity_v1_20261105T0856Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)

**Reviewer:** AI assistant (Antigravity)
**Date:** 2026-11-05T08:56Z

---

## 1. Recommended Refactors

- **Isolate Smoke-Safety Per-Profile State Assertions:** Refactor [scripts/smoke-safety.mjs](scripts/smoke-safety.mjs) (lines 28-33) to snapshot and verify account state immediately after running the `api` smoke profile, prior to launching the `ui` profile. This ensures any accidental data mutation during API smoke tests is flagged before Cucumber's `BeforeAll` hook executes its unconditional database reset.
- **Dynamic Ephemeral Directory for CI Performance Artefacts:** Refactor [.github/workflows/perf.yml](.github/workflows/perf.yml) (lines 57-64) and [scripts/run-perf.mjs](scripts/run-perf.mjs) (line 75) to output performance metrics into an uncommitted scratch directory (e.g. `perf/target/report`) and upload only that directory in CI, preventing the upload of historical, committed git files when a workflow run fails prematurely.
- **Exact Currency Pattern Matching in UI Confirmations:** Replace the fragile `Math.trunc()` and substring `includes()` checks in [features/ui/steps/ui.steps.ts](features/ui/steps/ui.steps.ts) (lines 148, 178) with an anchored currency regex (e.g. `/\$100\.00(?!\d)/`) or target-specific DOM element assertions, strengthening visual validation against incorrect amounts or missing cents.
- **Transitive Dependency Resolution in Lockfile:** Perform targeted updates to `package-lock.json` to resolve the 11 `npm audit` vulnerabilities across `fast-uri` (bump to `>=3.1.9`), `brace-expansion` (bump to `>=5.0.12`), and investigate updated `@serenity-js/*` packages to clear `axios` CVE advisories.

---

## 2. Next Steps

- **Reconcile Backlog v33 Merge Bookkeeping:** Update [docs/backlog.md](docs/backlog.md) (line 768) to formally close PB-STYLE-03 by recording the merge of PR #53 (`bbca594`), checking off the pending PR CI and post-merge CI verification boxes, and bumping the active backlog version notes.
- **Harmonise QA Strategy and Docker Compose Prose:** Update [docs/qa-strategy.md](docs/qa-strategy.md) (line 35) to incorporate the nightly k6 performance-smoke lane and reference test styles 02 and 03. Correct [docker-compose.yml](docker-compose.yml) (line 8) to remove the obsolete claim that first boot automatically self-seeds.
- **Introduce Automated Transitive Audit Gating:** Add an automated audit check (or an exception-managed audit script) into the CI pipeline or maintenance schedule, preventing silent accumulation of High-severity CVEs across development dependencies.
- **Add Negative Safety Regression Test:** Author a dedicated unit test in `tests/unit/` that invokes `smoke-safety.mjs` against a mock server returning mutated balances, proving that the safety gate exits non-zero when a mutation occurs.

---

## 3. Future Project Ideas

- **In-Container Docker Compose Healthcheck:** Add a container healthcheck into [docker-compose.yml](docker-compose.yml) using a lightweight HTTP polling probe against `http://localhost:8080/parabank/services/bank/initializeDB`. This would enable Docker Compose `depends_on: condition: service_healthy` semantics, simplifying local developer bring-up.
- **CI Dependency Caching for Containerised Maven Build:** Implement caching for Maven dependencies (`.m2` repository) across GitHub Actions workflow runs, reducing cold build times for the ParaBank WAR file in [scripts/build-sut.ps1](scripts/build-sut.ps1) by approximately 60-90 seconds per run.
- **Expanded Coverage for Unexercised SUT Endpoints:** Explore optional post-closure test coverage for the remaining unexercised ParaBank business modules, specifically the positions/stock-trading surface and expanded loan processing paths under `LoanProcessor` SOAP.
- **Playwright Trace Viewer Integration in Public Evidence:** Enhance the static Pages evidence packaging ([scripts/prepare-pages-report.ts](scripts/prepare-pages-report.ts)) to optionally embed sanitized, public-safe Playwright trace viewer links for UI journeys, providing interactive step-by-step DOM visualisations directly within published reports.

---

[<- Previous: Cross-Project Analysis](04_CROSS_PROJECT_ANALYSIS.md) | [Back to Index](00_CODE_REVIEW_Antigravity_v1_20261105T0856Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)
