# Recommendations

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)

**Reviewer:** AI assistant (CODEX GPT-5)

## Recommended Refactors

- **Priority 1 - Make FR-B1 honest and operation-aware.** Agree the intended endpoint matrix,
  then bind observed status, media type, and body schema to the relevant live-spec operation.
- **Priority 2 - Add focused framework tests.** Cover SOAP/XML, spec-deviation handling, tag
  inheritance, report integrity, and request timeouts before adding more E2E breadth.
- **Priority 3 - Reconcile stated boundary coverage.** Add the zero/minimum/exact cases or narrow
  the QA strategy so "applied" means what the features prove.
- **Priority 4 - Harden execution inputs.** Set least-privilege workflow permissions and pin
  actions and Docker builders by reviewed SHA/digest.
- **Priority 5 - Bound all SUT requests.** Centralise fetch deadlines and contextual errors.

## Next Steps

- Convert Risks #1 through #5 into backlog candidates ordered by requirement truth, cheap unit
  feedback, test-design alignment, supply-chain hardening, and runtime resilience.
- Correct the README's PB-P5/resting status and its "each journey" REST cross-check wording as a
  small documentation-only change.
- Correct the A4 bill-pay UI step assertion or wording.
- Keep PBR-01 open until an upstream pin re-check removes the deviation; keep PBR-02 open while
  the latest CI annotation persists.
- After implementation, run the complete five-command project contract and attach exact CI
  evidence; do not infer full-system green from this review's static checks.

## Future Project Ideas

- Publish the Serenity living report as a stable portfolio page if discoverability justifies the
  maintenance cost; the current CI artifact is already valid evidence.
- Add a scheduled upstream-pin evaluation that proposes, but never silently applies, source and
  image digest changes.
- Add a small contract-coverage report showing live OpenAPI operations in scope, exercised, and
  intentionally excluded.
- Consider broader LoanProcessor SOAP or positions coverage only through a newly approved phase;
  both are currently honest out-of-scope candidates.

## Recorded Questions for the Owner

These questions are recorded for later decision; the unattended review did not wait for answers.

1. Should FR-B1 retain its current "in-scope client surface" meaning and expand to every listed
   operation, or should the design/backlog explicitly define it as a representative read-contract
   sample?
2. Should the zero, minimum-positive, and exact-balance partitions become required v1
   maintenance tests, or should the QA strategy mark them as deferred candidates?
3. Does the repository's "pinned SUT" promise include build/action image digests, or only the
   ParaBank source commit?

---

[<- Previous: Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)
