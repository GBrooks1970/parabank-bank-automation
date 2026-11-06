# Recommendations

[<- Back to Index](00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)

**Reviewer:** AI assistant (Claude Opus 5.5)
**Date:** 2026-11-05T14:12Z
**Baseline:** `main` at `ccb74d5`

## Recommended Refactors

- **Fix the smoke-safety measurement (R-01).** Snapshot after each profile, or let the safety
  runner own seeding through an env flag honoured by `BeforeAll`; widen the snapshot to
  transactions; add a must-fail proof per lane. Small, high-value, and it restores the truth of a
  publicly stated gate.
- **One report-integrity implementation (R-05).** Move style-03's name -> result logic into
  `src/quality/report-integrity.ts` and use it for `check:report`, `check:pages` and
  `check:style-03-report`, with a unit test that rejects a `FAILURE` result.
- **Exact UI money oracles (R-06).** Port style-03's dedicated result targets into
  `src/screenplay/ui/pages.ts`; assert formatted currency exactly.
- **Thin the glue (R-08, R-09).** Add read Tasks/Questions so every step is a one-line
  delegation; wrap REST cross-checks in a Serenity Ability for the UI lane; build queries with
  `URLSearchParams`.
- **Symmetric reset bracket (R-07).** Add `After('@mutates')` re-seed, or correct the
  "read-only against seed state" comments and lint against absolute assertions outside
  `@mutates`.

## Next Steps

- **Reconcile the record first (R-02), docs-only:** backlog v34 closing PB-STYLE-03, adding and
  closing PB-PIN-05/06, importing the approved TRIAGE-01..05 as scored risks, and recomputing the
  Risk Summary; fix README line 126, QA strategy lines 32 and 35, compose line 8; write handover
  v6; refresh the registry row. Without this, every later agent starts from a wrong baseline.
- **Harden the perf lane (R-03):** split into a read-only test job and a minimal publish job,
  `persist-credentials: false`, run-specific output directory. Consider publishing perf through
  the Pages artifact instead of committing to `main`.
- **Dependency risk (R-04):** record PBR-09; apply `overrides` for `axios`, `follow-redirects`
  and `fast-uri` inside current majors; schedule `@cucumber/cucumber` 13 as its own change; add a
  non-blocking audit step.
- **Fast static CI job (R-10):** typechecks, unit tests and tag lint before the SUT build, plus
  PR concurrency cancellation.
- Then run the full five-command project contract once and record the evidence, since this review
  could not run any SUT-backed gate.

## Future Project Ideas

- **Executable cross-style parity:** a small script that lists the 12 test titles from style-02
  and style-03 and the related main-lane scenarios, failing when the sets drift. It turns the
  DR-PB-12 comparison from a convention into a check.
- **Contract-drift diff on pin bumps:** store a hash of the live `openapi.json` per pinned
  commit and print a structured diff when the SUT pin moves, so PBR-01/04/05 re-justification
  (their success criteria) becomes mechanical.
- **Positions module or LoanProcessor SOAP coverage** (backlog LOW items 3 and 4) as a
  self-contained extension once the maintenance items above are closed.
- **Mutation testing of the guard and contract helpers** (for example Stryker on `src/quality`
  and `src/api/spec-conformance.ts`) to show the 43 unit tests detect injected faults, a strong
  portfolio signal for test-of-tests thinking.

---

[<- Previous: Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md) | [Back to Index](00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)
