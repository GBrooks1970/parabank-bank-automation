# Code Review: parabank-bank-automation

**Reviewer:** AI assistant (Claude Opus 5.5)
**Date:** 2026-11-05T14:12Z
**Scope:** Full repository review of `parabank-bank-automation` against its own
`docs/backlog.md` (v33): source, executable specifications, test styles, perf lane, scripts, CI
workflows, Docker build, and documentation.
**Baseline:** `main` at `ccb74d5093c57bfdace8a6b7cfab8606ecddd35b`, clean working tree.
**Validation:** SUT-independent gates only (typechecks, unit tests, tag lint, Cucumber dry-runs,
`npm audit`). No Docker SUT, E2E lane or CI fetch was run; see [ANNEX/METRICS.md](ANNEX/METRICS.md).
**Independence:** findings were derived from current source and tool output. Earlier reviews in
`.review/` were read for context only; where a finding was raised before, that is stated.

## Table of Contents

1. [Executive Summary](01_EXECUTIVE_SUMMARY.md) - verdict, design and code quality, highlights,
   pedagogical value, validation summary.
2. [Risks and Issues](02_RISKS_AND_ISSUES.md) - ten scored findings, 4 MEDIUM and 6 LOW, each
   with evidence, impact and remediation.
3. [Project Reviews](03_PROJECT_REVIEWS/) - the single project:
   [PROJECT_001_PARABANK_BANK_AUTOMATION.md](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md),
   including the deferred and planned coverage table.
4. [Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md) - the nine template areas applied
   across lanes, styles, CI, build and docs.
5. [Recommendations](05_RECOMMENDATIONS.md) - refactors, next steps, future ideas.
6. [Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) - Test Pyramid, SOLID, KISS, YAGNI,
   REST/OpenAPI, ISTQB, pedagogical comments.
7. [Migration Plans](07_MIGRATION_PLANS.md) - single source of truth, Docker Compose, GitHub
   Actions.
8. [Annex - Test Strategy](ANNEX/TEST_STRATEGY.md) - lifecycle, isolation, waits, stability,
   data and auth assumptions, CI assessment.
9. [Annex - Metrics and Security Pass](ANNEX/METRICS.md) - commands run with results, size
   metrics, dependency/security/licence pass.

## Structure Summary

The review follows `templates/code-review.template.md` with its single-repository customisation:
one project file under `03_PROJECT_REVIEWS/`, and `04_CROSS_PROJECT_ANALYSIS.md` read as
cross-cutting analysis inside the repo. The prompt's mandatory assessments that do not have a
template section of their own (lifecycle, isolation, data/auth, CI, dependency/security/licence)
are in the two annex files. Every file carries reviewer attribution and header/footer navigation.

## Key Findings

- **R-01 MEDIUM - smoke-safety does not measure API smoke.** The UI process's `BeforeAll`
  re-seeds before the final snapshot, so a mutating API `@smoke` scenario would pass the
  store-safety gate ([details](02_RISKS_AND_ISSUES.md#1-r-01---medium-15---smoke-safety-proof-cannot-detect-a-mutating-api-smoke-scenario)).
- **R-02 MEDIUM - the status of record is behind the repo.** Backlog v33 shows PB-STYLE-03 as
  unmerged (merged as `bbca594`), omits PB-PIN-06, and reports zero open items while six
  owner-approved triage items from 2026-09-30 remain unactioned
  ([details](02_RISKS_AND_ISSUES.md#2-r-02---medium-14---the-status-of-record-contradicts-the-repository-and-an-approved-triage)).
- **R-03 MEDIUM - perf lane write token.** `perf.yml` grants `contents: write` to the job that runs
  `npm ci` and k6, then pushes to `main` nightly (82 of 189 commits are bot commits)
  ([details](02_RISKS_AND_ISSUES.md#3-r-03---medium-13---perf-workflow-runs-third-party-code-with-a-contents-write-token-and-pushes-to-main)).
- **R-04 MEDIUM - 7 high advisories untracked.** `npm audit` reports 11 (1 low, 3 moderate,
  7 high) in the dev toolchain, with no backlog risk and no CI signal
  ([details](02_RISKS_AND_ISSUES.md#4-r-04---medium-12---npm-audit-11-advisories-7-high-with-no-backlog-risk-and-no-ci-signal)).
- **Strength - contract and safety engineering.** Operation-aware OpenAPI conformance over all 14
  client operations, REST-SOAP parity, digest-pinned SUT inputs, and destructive operations that
  guard themselves with an architecture test to keep it that way
  ([Executive Summary](01_EXECUTIVE_SUMMARY.md)).

## Navigation Guide

- Short on time: read the Key Findings above, then
  [01_EXECUTIVE_SUMMARY.md](01_EXECUTIVE_SUMMARY.md).
- Planning remediation: read [02_RISKS_AND_ISSUES.md](02_RISKS_AND_ISSUES.md) then
  [05_RECOMMENDATIONS.md](05_RECOMMENDATIONS.md); the order there is the suggested order of work,
  starting with the docs-only reconciliation in R-02.
- Assessing engineering depth: [06_ARCHITECTURE_ASSESSMENT.md](06_ARCHITECTURE_ASSESSMENT.md)
  and [ANNEX/TEST_STRATEGY.md](ANNEX/TEST_STRATEGY.md).
- Checking what was actually executed: [ANNEX/METRICS.md](ANNEX/METRICS.md).
- Cross-references: R-01 relates to the lifecycle table in the Test Strategy annex; R-03 and R-04
  meet in the CI table; R-05 and R-06 are both "style-03 is stronger" findings discussed under
  Screenplay Parity in [04_CROSS_PROJECT_ANALYSIS.md](04_CROSS_PROJECT_ANALYSIS.md).
- All file links are relative to this review folder and resolve into the repository root two
  levels up.

---

[Next: Executive Summary ->](01_EXECUTIVE_SUMMARY.md)
