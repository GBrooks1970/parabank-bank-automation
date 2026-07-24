# Migration Plans

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md) | [Next: Evidence and Metrics ->](ANNEX/EVIDENCE_AND_METRICS.md)

**Reviewer:** AI assistant (CODEX GPT-5)

These plans are incremental hardening paths, not authorisation to change a resting project's
approved scope.

## Plan 1 - Single Source of Truth for Features and Contract Coverage

1. Record the owner's answer to whether FR-B1 is comprehensive or representative.
2. Build one operation matrix from the agreed design scope: method, path, status, media type,
   schema, state needs, feature scenario, and allowed deviation.
3. Refactor `SpecConformance` to resolve live operation response definitions and keep PBR-01 as a
   named exception.
4. Add or adjust Gherkin so every matrix row has an executable reference; avoid duplicating
   existing stateful journeys where their response can be validated in place.
5. Add a lightweight static report that fails when agreed operations are unreferenced.
6. Reconcile design, QA strategy, backlog risk/status text, and README in the same reviewed change.
7. Gate completion with unit fixtures, Cucumber dry-runs, full project-contract execution, and
   exact-SHA CI evidence.

## Plan 2 - Docker Compose for Local Development

1. Keep the existing single-service compose topology; there is no case for adding a separate
   database or broker.
2. Pin the Maven builder and Tomcat runtime inputs by digest while retaining human-readable
   version comments.
3. Evaluate an in-container healthcheck only after proving a suitable probe command exists in the
   runtime image; keep `gate.ps1` as the authoritative multi-surface seed/readiness check.
4. Document when to use in-place `initializeDB` versus `docker compose down` for a pristine
   container.
5. If Maven caching is adopted, use an explicit CI cache key based on the pinned upstream build
   inputs and document invalidation; do not confuse a per-run Docker volume with cross-run cache.
6. Preserve failure logs and unconditional teardown.
7. Prove Windows and Ubuntu parity with the same PowerShell scripts before updating the backlog.

## Plan 3 - GitHub Actions and Workflow Hardening

1. Add explicit least-privilege workflow permissions, initially `contents: read`.
2. Pin every action to a reviewed full commit SHA and annotate its release version.
3. Keep Node 24, Java 21, npm cache, Chromium installation, `npm ci`, and `npm run verify` aligned
   with local documentation.
4. Add the proposed fast unit lane before SUT build where workflow structure permits, so pure
   framework failures stop early.
5. Retain full SUT build, boot gate, both lanes, Serenity content verification, artifact upload,
   failure logs, and teardown as the authoritative integration job.
6. Resolve PBR-02 when Node-24-native action releases remove the verified warning; do not suppress
   the annotation without changing the runtime source.
7. Consider a separately documented audit policy if the project wants vulnerability status to
   remain continuously enforced rather than point-in-time evidence.

---

[<- Previous: Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md) | [Next: Evidence and Metrics ->](ANNEX/EVIDENCE_AND_METRICS.md)
