# Migration Plans

[<- Back to Index](00_CODE_REVIEW_CODEX_v2_20260929T0630Z.md) | [Next: Validation and Scope ->](ANNEX/VALIDATION_AND_SCOPE.md)

**Reviewer:** AI assistant (Codex GPT-6)
**Date:** 2026-09-29T06:30Z

## Single Source of Truth for Features

- Retain feature directories and requirement IDs; no framework migration is needed.
- Preserve the 14 API/8 UI baseline while fixing smoke orchestration independently.
- Keep feature-derived tag/report checks and explicit contractual counts aligned.
- Add an intentionally mutating negative proof before trusting smoke safety.
- Reconcile current backlog claims in a new dated version, retaining historical evidence and accepted triggers.
- Check bindings/tags after scenario edits; do not call dry-run discovery execution.

## Docker Compose for Local Development

- Retain the single pinned Tomcat/HSQLDB SUT and build->boot->seed->use sequence.
- Correct the automatic-seeding comment without changing seed policy.
- Verify Docker storage against E:\_DockerData before authorised image/build work; none occurred here.
- Preserve serial scenarios; parallel execution would require separate datastore/isolation design.
- Consider healthchecks or persistent CI caching only against concrete needs.
- Verify infrastructure changes with the complete five-command contract and teardown.

## GitHub Actions/Workflow

- Retain immutable action pins and separate Pages deployment privileges.
- Isolate current-run perf output before build/install can fail.
- Preserve threshold-failure metrics with explicit failure metadata; never substitute old snapshots.
- Promote only verified successful output to the committed perf/report snapshot.
- Preserve non-blocking perf and DR-PB-11: build-time drift warnings, dedicated strict detection.
- Verify success and intentional failure paths before closing R-02; verify exact commit provenance after merge.

These are recommendations for later implementation. This task changes only its versioned review artefacts. See [Recommendations](05_RECOMMENDATIONS.md).

---

[<- Previous: Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) | [Back to Index](00_CODE_REVIEW_CODEX_v2_20260929T0630Z.md) | [Next: Validation and Scope ->](ANNEX/VALIDATION_AND_SCOPE.md)
