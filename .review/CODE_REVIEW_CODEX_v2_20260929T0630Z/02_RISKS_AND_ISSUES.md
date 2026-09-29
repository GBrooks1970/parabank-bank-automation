# Risks and Issues

[<- Back to Index](00_CODE_REVIEW_CODEX_v2_20260929T0630Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md)

**Reviewer:** AI assistant (Codex GPT-6)
**Date:** 2026-09-29T06:30Z

Three MEDIUM and two LOW findings; no CRITICAL/HIGH project-level finding. These are source-established failure paths unless described as tool output. No newly reproduced SUT failure is claimed. Fetched origin/main changes none of the affected source files.

## 1. R-01 - MEDIUM - Smoke-safety resets between its observations

**Risk Description/Explanation:** The wrapper snapshots seed state, launches API smoke then UI smoke, and compares only after both. Each child loads BeforeAll that unconditionally seeds. An accidental account mutation in API smoke is therefore erased by UI startup before the final snapshot.

**Evidence Outline:** [smoke-safety.mjs](../../scripts/smoke-safety.mjs) (line 22), profile loop line 25 and final snapshot line 30; [hooks.ts](../../features/support/hooks.ts) (line 12) resets at line 14; [cucumber.js](../../cucumber.js) (line 9) and line 17 load shared support in both profiles. The wrapper's line 2 explicitly promises no intervening reset.

**Impact Analysis:** An API smoke regression can pass the advertised store-safety gate. Current smoke steps appear read-only; this is a regression-detection defect, not evidence that today's suite mutates state. Tag lint checks declarations, not behaviour. The snapshot only covers the seeded customer's account data, so it also cannot establish universal datastore immutability.

**Refactor Recommendation and Strategy:** Preserve normal boot->seed->use semantics. Give the dedicated safety runner ownership of seeding, or compare after each profile before another profile can reset. Add a controlled mutating fake/fixture proving the gate fails for mutations in either lane. Acceptance: both negative proofs fail, normal smoke passes, and the measured state scope is explicit.

## 2. R-02 - MEDIUM - Failed perf runs can upload old or mixed evidence

**Risk Description/Explanation:** Checkout contains committed perf HTML/JSON. Upload is unconditional, so failure during build, boot or install attaches old files under the failed run's perf-summary artefact. A threshold-failing k6 run can also write fresh outputs before the runner throws, leaving a previous index.html alongside new metrics.

**Evidence Outline:** [perf.yml](../../.github/workflows/perf.yml) (line 30) checks out the snapshot; lines 57-63 upload perf/report with `if: always()`. [run-perf.mjs](../../scripts/run-perf.mjs) (line 75) invokes k6 before subsequent output normalisation and provenance checks. Git confirms [perf-summary.json](../../perf/report/perf-summary.json) (line 1) is tracked.

**Impact Analysis:** Failure diagnostics can be misread as measurements from the failed run. Embedded provenance helps careful readers but does not make collection current-run-specific. The success-only commit step prevents this path publishing a new main snapshot; this finding does not claim Pages publishes failed metrics.

**Refactor Recommendation and Strategy:** Generate into a clean run-specific directory and always upload only that directory plus failure metadata. Promote verified successful output to the committed snapshot separately. Acceptance: pre-k6 failure cannot attach old metrics; threshold failure preserves only that run's raw evidence and status; successful provenance checks still gate promotion.

## 3. R-03 - MEDIUM - Known vulnerable transitive dependency remains locked

**Risk Description/Explanation:** The development Ajv chain resolves fast-uri 3.1.5. Fresh npm audit reports one HIGH dependency with five advisory entries and `fixAvailable: true`.

**Evidence Outline:** [package-lock.json](../../package-lock.json) (line 1959) locks 3.1.5; line 1442 is Ajv's dependency. [package.json](../../package.json) (line 39) declares dev-only Ajv. [backlog.md](../../docs/backlog.md) (line 29) already acknowledges separate advisory triage. Current advisory identifiers/ranges appear in the [annex](ANNEX/VALIDATION_AND_SCOPE.md).

**Impact Analysis:** Scanner severity is HIGH; contextual project priority is MEDIUM because this is a development validator for a pinned local SUT. No remotely exploitable production service was established. Leaving the acknowledged advisory outside actionable bookkeeping allows a fixable issue to persist; historical zero-advisory runs are not current evidence.

**Refactor Recommendation and Strategy:** Make a scoped transitive lock update outside every returned range, inspect the diff and run unit/type/contract checks plus a fresh audit. One returned advisory affects versions below 3.1.7, so 3.1.6 is insufficient. Avoid broad major upgrades or forced audit fixes as a substitute for compatibility review.

## 4. R-04 - LOW - UI amount checks can accept incorrect displays

**Risk Description/Explanation:** Transfer and bill-pay confirmations search the entire result text for `String(Math.trunc(amount))`. This discards cents and does not delimit the amount: expected 75 matches 175 or 750; expected 100.99 only checks 100.

**Evidence Outline:** [ui.steps.ts](../../features/ui/steps/ui.steps.ts) (line 148) and line 178. Current examples use 100.00 and 75.00: [a3-transfer-funds.feature](../../features/ui/a3-transfer-funds.feature) (line 11) and [a4-bill-pay.feature](../../features/ui/a4-bill-pay.feature) (line 11).

**Impact Analysis:** Incorrect confirmation rendering can pass even when REST correctly proves money movement. REST balance assertions mitigate state risk but cannot prove the displayed amount. This is a narrow UI oracle defect, not a claim of incorrect balances.

**Refactor Recommendation and Strategy:** Read a dedicated amount element or parse a delimited currency value, then compare exact minor units. Demonstrate that 175 fails for expected 75 and different cents fail. Re-run the two journeys while retaining independent REST checks.

## 5. R-05 - LOW - Current-state documentation contradicts evidence

**Risk Description/Explanation:** Backlog v30 says PB-PIN-05 merge evidence is pending and acknowledges fast-uri triage, but its summary says nothing requires action. Local history contains PR #46's merge. Other operational prose still claims automatic seeding or no non-functional coverage.

**Evidence Outline:** [backlog.md](../../docs/backlog.md) (line 16), line 29, line 106 and line 951. Local log records PR #46 merge `6df0f03`. [docker-compose.yml](../../docker-compose.yml) (line 8) says first boot self-seeds, contradicting [project-contract.md](../../docs/project-contract.md) (line 26). [qa-strategy.md](../../docs/qa-strategy.md) (line 35) says non-functional testing is out of scope despite [perf-lane-design.md](../../docs/perf-lane-design.md) (line 12).

**Impact Analysis:** Cold resumes and status generators can hide dependency work, repeat merged maintenance or follow the wrong seed assumption. Stale handover v5 does not override the backlog. This review has not independently established post-merge workflow/issue closure and must not invent it.

**Refactor Recommendation and Strategy:** Add a dated reconciliation preserving history. Verify exact merge/workflow/issue evidence before closing PB-PIN-05; promote dependency triage into explicit status and recompute counts. Correct Compose seeding prose and describe the optional perf lane in QA strategy. Preserve PBR-01/04/05 as accepted trigger-based risks.

---

[<- Previous: Executive Summary](01_EXECUTIVE_SUMMARY.md) | [Back to Index](00_CODE_REVIEW_CODEX_v2_20260929T0630Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md)
