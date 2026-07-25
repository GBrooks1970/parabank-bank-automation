# Code Review: parabank-bank-automation

**Reviewer:** AI assistant (CODEX GPT-5)
**Date:** 2026-07-24T00:20Z
**Scope:** Full tracked codebase at `dc3a209d0eaed197298ed4574eac6a7bd8641775`
**Review type:** Single-repository portfolio review against `docs/backlog.md`

## Table of Contents

1. [Executive Summary](01_EXECUTIVE_SUMMARY.md)
2. [Risks and Issues](02_RISKS_AND_ISSUES.md)
3. [Project Review](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md)
4. [Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md)
5. [Recommendations](05_RECOMMENDATIONS.md)
6. [Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md)
7. [Migration Plans](07_MIGRATION_PLANS.md)
8. [Evidence and Metrics Annex](ANNEX/EVIDENCE_AND_METRICS.md)

## Structure Summary

This review first states the portfolio-level judgement, then records eight actionable findings
with evidence and remediation. The project review covers the complete two-lane implementation.
The remaining sections examine cross-cutting consistency, architecture, migration-sized
improvements, and the exact validation evidence used.

## Key Findings

1. **HIGH - FR-B1 proves only a narrow subset of its declared contract surface.** The design
   requires the in-scope REST client surface to be exercised against the live OpenAPI document,
   while the three B1 scenarios validate four read operations and component schemas only.
2. **MEDIUM - Non-trivial automation helpers have no unit-level safety net.** SOAP/XML handling,
   live-spec filtering, report parsing, and tag policy are only exercised through static checks
   or the Docker-backed system suite.
3. **MEDIUM - The QA strategy overstates boundary coverage.** It says zero, minimal positive,
   exact-balance, excess, and non-numeric amounts are applied; only the latter two are explicitly
   present.
4. **MEDIUM - CI and SUT source are reproducible, but the execution supply chain is not fully
   immutable.** Actions use moving major tags, workflow token permissions are implicit, and the
   Maven builder uses a mutable image tag.
5. **MEDIUM - General REST, SOAP, and live-spec calls have no request-level timeout.** Cucumber
   limits a step, but it does not cancel the underlying network request.

## Review Baseline and Evidence Warning

- The working tree was clean and `origin/main` was fetched and fast-forward checked before this
  branch was created.
- The reviewed default head is `dc3a209`; GitHub Actions run
  [29999689438](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/29999689438)
  is green for that exact SHA.
- The latest paired portfolio handover is v2
  (`parabank-bank-automation_session-notes_v2_20260722T2220Z`), but it predates `dc3a209`.
  This preserves the workspace preflight `WARN`: the handover expected closure PR #11 to be
  confirmed, while that closure is now present in the reviewed history. The warning is advisory,
  not evidence that the implementation is unhealthy.
- Lightweight validation passed. SUT build, Docker bring-up, boot gate, full `npm run verify`,
  and teardown were not run locally because this review was explicitly instructed not to fetch
  or build the SUT, start Docker, or run the long E2E suite.

## Navigation Guide

- Start with the [Executive Summary](01_EXECUTIVE_SUMMARY.md) for the overall judgement.
- Use [Risks and Issues](02_RISKS_AND_ISSUES.md) as the prioritised worklist source.
- Use the [Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) for Test Pyramid, SOLID,
  KISS, YAGNI, OpenAPI, and ISTQB analysis.
- Use the [Evidence and Metrics Annex](ANNEX/EVIDENCE_AND_METRICS.md) to reproduce the static
  checks and understand the review limitations.

---

[Next: Executive Summary ->](01_EXECUTIVE_SUMMARY.md)
