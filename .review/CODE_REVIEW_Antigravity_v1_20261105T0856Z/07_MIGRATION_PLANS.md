# Migration Strategy & Plans

[<- Back to Index](00_CODE_REVIEW_Antigravity_v1_20261105T0856Z.md) | [Next: Annex ->](ANNEX/VALIDATION_AND_SCOPE.md)

**Reviewer:** AI assistant (Antigravity)
**Date:** 2026-11-05T08:56Z

This section outlines three concrete, actionable migration plans addressing feature consolidation, containerised local development, and CI/CD workflow hardening.

---

## 1. Single Source of Truth for Features

Consolidate business feature specifications across the three parallel test styles into a unified, shared specification model without compromising framework independence.

- **Centralise Gherkin Feature Specifications:** Migrate the 12 fund-transfer test scenarios currently hardcoded across `test-style-02/tests/fund-transfer-fe.spec.ts` and `test-style-03/tests/fund-transfer-fe.spec.ts` to consume the canonical Gherkin feature file [features/ui/a3-transfer-funds.feature](features/ui/a3-transfer-funds.feature) (or a shared brief feature) as the single source of truth.
- **Adopt `playwright-bdd` for Style 02/03:** Evaluate migrating `test-style-02` and `test-style-03` to `playwright-bdd`, enabling both Playwright Test runners to execute directly against the shared `.feature` files, eliminating dual maintenance of scenario definitions and titles.
- **Shared Test Data Fixtures:** Extract common test customer constants (`john`/`demo`, account numbers, initial seed balances) into a single shared test-data module in `src/quality/test-data.ts`, removing duplicate account constants currently defined in `test-style-02/tests/support/accounts.ts`.
- **Harmonise Assertion Oracles:** Standardise the monetary confirmation assertions across all three styles so that Cucumber UI steps, Playwright Test specs, and Serenity Screenplay specs all execute identical regex-delimited currency checks.
- **Preserve Independent Execution Profiles:** Ensure that feature consolidation preserves independent npm scripts (`npm run test:ui`, `npm run test:style-02`, and `npm run test:style-03`) and distinct report directories (`target/site/serenity` vs `test-style-03/target/site/serenity`).
- **Update Governance and Backlog Documentation:** Document the unified feature specification architecture in [docs/design-document.md](docs/design-document.md) and record the completion of feature consolidation in [docs/backlog.md](docs/backlog.md).

---

## 2. Docker Compose for Local Development

Modernise and harden the local container development lifecycle to improve startup reliability, developer ergonomics, and environment consistency.

- **Implement Native Docker Compose Healthcheck:** Add an in-container HTTP polling healthcheck to [docker-compose.yml](docker-compose.yml) targeting `http://localhost:8080/parabank/services/bank/initializeDB`, allowing dependent test runners to use standard `depends_on: condition: service_healthy` semantics.
- **Automate First-Boot Database Seeding:** Enhance the container initialization script or Docker Compose entrypoint to automatically execute `POST /initializeDB` upon container readiness, eliminating manual `scripts/gate.ps1` execution for non-interactive local developers.
- **Reconcile Stale Compose Comments:** Remove the legacy comment in `docker-compose.yml` (line 8) claiming that first boot automatically self-seeds, aligning the compose configuration with `docs/project-contract.md`.
- **Pre-Built SUT Image Registry Staging:** Introduce an optional GitHub Packages / Docker Hub publishing step that pushes pre-built `parabank:d1bf006` images by digest, allowing local developers and CI runners to pull pre-compiled containers rather than compiling the WAR locally from source.
- **E: Drive and Local Volume Alignment:** Document explicit container storage volume configuration adhering to portfolio infrastructure guidelines (`E:\_DockerData` on Windows workstations), preventing Docker root disk exhaustion on the `C:` drive.
- **One-Command Developer Bring-Up Script:** Provide a cross-platform command (`npm run sut:up`) combining image build verification, compose bring-up, and healthcheck verification in a single idempotent task.

---

## 3. GitHub Actions and CI/CD Workflow Hardening

Strengthen CI workflow efficiency, reporting isolation, and automated supply-chain security auditing.

- **Implement Maven Dependency Caching:** Add `actions/cache` to [.github/workflows/ci.yml](.github/workflows/ci.yml) targeting the `~/.m2/repository` directory across runner jobs, reducing the SUT build stage duration from ~90 seconds to under 20 seconds.
- **Isolate Nightly Performance Artifacts:** Refactor [.github/workflows/perf.yml](.github/workflows/perf.yml) to write k6 performance metrics into an uncommitted ephemeral directory, ensuring that premature build/boot failures do not upload historical tracked git files as current-run artefacts.
- **Automated Dependency Audit Gate:** Incorporate an exception-managed `npm audit` check into `.github/workflows/ci.yml` that permits documented, reviewed advisories (e.g. `fast-uri` and `brace-expansion`) while failing PR builds if newly introduced High or Critical CVEs appear.
- **Workflow Matrix for Browser Testing:** Expand `sut-boot-gate` in `ci.yml` to optionally run the fast `@smoke` UI scenario against Firefox and WebKit in addition to Chromium, catching cross-browser CSS and JavaScript rendering discrepancies early.
- **Reconcile Backlog v33 Merge Bookkeeping:** Update `.github/workflows/` governance documentation and [docs/backlog.md](docs/backlog.md) to formally reflect the merged state of PB-STYLE-03 (`bbca594`), closing all pending merge verification checkboxes.
- **Pages Concurrency Guarding:** Verify that the `deploy-pages` job in `ci.yml` maintains strict concurrency controls (`cancel-in-progress: false`), preventing concurrent merges on `main` from cancelling in-flight GitHub Pages deployments.

---

[<- Previous: Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) | [Back to Index](00_CODE_REVIEW_Antigravity_v1_20261105T0856Z.md) | [Next: Annex ->](ANNEX/VALIDATION_AND_SCOPE.md)
