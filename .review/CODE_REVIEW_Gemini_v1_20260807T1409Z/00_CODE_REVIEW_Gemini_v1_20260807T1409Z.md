# Code Review: parabank-bank-automation

**Reviewer:** AI assistant (Gemini 2.5 Pro)  
**Date:** 2026-08-07T14:09Z  
**Scope:** Comprehensive Code and Documentation Review of `parabank-bank-automation`  
**Repository:** `parabank-bank-automation/`  

---

## Table of Contents

1. [Executive Summary](01_EXECUTIVE_SUMMARY.md)
2. [Risks and Issues](02_RISKS_AND_ISSUES.md)
3. [Project Reviews](03_PROJECT_REVIEWS/PROJECT_001_parabank-bank-automation.md)
4. [Cross-Project Analysis](04_CROSS_PROJECT_ANALYSIS.md)
5. [Recommendations](05_RECOMMENDATIONS.md)
6. [Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md)
7. [Migration Plans](07_MIGRATION_PLANS.md)

---

## Structure Summary

This code review evaluates `parabank-bank-automation`, an active portfolio repository implementing a dual-lane automation suite against the ParaBank demo banking system (pinned upstream SHA `d1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1`).

- **Lane A (UI):** Serenity/JS + Playwright + Cucumber BDD journey suite (8 scenarios: A1-A5).
- **Lane B (API):** Custom Screenplay + fetch REST & SOAP client suite (14 scenarios: B1-B4).
- **Unit Suite:** 12 lightweight TypeScript unit tests verifying framework helpers without network I/O.
- **Performance Smoke Lane:** Nightly k6 load smoke suite over REST endpoints.

---

## Key Findings

1. **[HIGH] Deprecated Node 20 Runtime in CI Actions (Risk PBR-02)**  
   [.github/workflows/ci.yml](.github/workflows/ci.yml) (lines 38, 68) uses `actions/setup-java@v4.9.0` and `actions/upload-artifact@v4.6.2` which rely on Node 20, deprecated by GitHub Actions runners.
2. **[MEDIUM] Serenity/JS Package Version Discrepancy**  
   [package.json](package.json) (line 35) pins `@serenity-js/serenity-bdd` at `^3.43.2`, while all other `@serenity-js/*` dependencies are at `^3.44.1`.
3. **[MEDIUM] Unmonitored Nightly Performance Smoke Output**  
   Nightly k6 performance workflow [.github/workflows/perf.yml](.github/workflows/perf.yml) runs non-blocking; threshold failures do not raise alerts or fail build pipelines.
4. **[LOW] Upstream OpenAPI Schema Discrepancies Managed via Allowances (Risks PBR-01, PBR-04, PBR-05)**  
   [src/api/spec-conformance.ts](src/api/spec-conformance.ts) correctly implements strict schema checks with narrow, named allowances for upstream ParaBank spec defects.

---

## Navigation Guide

- For an overview of design and quality, see [01_EXECUTIVE_SUMMARY.md](01_EXECUTIVE_SUMMARY.md).
- For a prioritized list of issues with file:line references and remediation, see [02_RISKS_AND_ISSUES.md](02_RISKS_AND_ISSUES.md).
- For deep single-repo analysis, see [03_PROJECT_REVIEWS/PROJECT_001_parabank-bank-automation.md](03_PROJECT_REVIEWS/PROJECT_001_parabank-bank-automation.md).
- For architectural alignment with SOLID, Test Pyramid, and ISTQB, see [06_ARCHITECTURE_ASSESSMENT.md](06_ARCHITECTURE_ASSESSMENT.md).
```

---