# PB-CODEX-06 — Immutable container image digests — 2026-08-01

## Session Summary

Implemented PB-CODEX-06 by pinning the Maven builder and ParaBank Tomcat runtime to
reviewed multi-platform index digests while retaining exact readable version tags. The
build now rejects missing, malformed, registry-drifted, or upstream-mismatched pins and
generates an ignored digest-pinned derivative of the pinned upstream Dockerfile for
Compose. Targeted guard tests, a cold image build, and the complete project contract passed;
closure still depends on the implementation PR and post-merge default-branch CI.

---

## Objectives

1. ✅ Pin the Maven builder to an exact version tag and reviewed multi-platform digest.
2. ✅ Pin the ParaBank runtime base to the exact upstream Tomcat tag and reviewed multi-platform digest.
3. ✅ Fail clearly when a required pin is absent, malformed, registry-drifted, or stale against the pinned upstream Dockerfile.
4. ✅ Document a deliberate provenance review and refresh procedure.
5. ✅ Reconcile PB-CODEX-05 closure evidence and record PB-CODEX-06 as implemented pending merge.
6. ✅ Validate the real build and complete five-command project contract.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| PowerShell | Parser validation | Mutable-image script | No parser errors | ✅ PASS |
| Container policy | Current-pin validation | Mutable tags | 2/2 exact tags resolve to reviewed digests | ✅ PASS |
| Container policy | Missing-digest negative guard | No explicit guard | Rejected before build with named invalid-digest error | ✅ PASS |
| Container policy | Stale-digest negative guard | No explicit guard | Rejected with current and recorded digest values | ✅ PASS |
| Docker Compose | Configuration parse | Upstream mutable Dockerfile | Generated `Dockerfile.pinned` accepted | ✅ PASS |
| Docker BuildKit | Cold SUT image build | Mutable Maven and Tomcat tags | Both complete `tag@sha256` references used; 190.1 seconds | ✅ PASS |
| TypeScript | Framework unit lane | 12/12 | 12/12 | ✅ PASS |
| Cucumber | Smoke safety | 3/3 | 3/3; seed byte-identical | ✅ PASS |
| Cucumber | API lane | 14/14 scenarios; 49/49 steps | 14/14 scenarios; 49/49 steps | ✅ PASS |
| Cucumber/Serenity | UI lane | 8/8 scenarios; 49/49 steps | 8/8 scenarios; 49/49 steps | ✅ PASS |
| Serenity | Report content | 8/8 UI scenarios | 8/8 UI scenarios in JSON evidence | ✅ PASS |
| Project | Five-command contract | PB-CODEX-05 `main` run 30688956444 passed | Local contract passed in 258.7 seconds with teardown | ✅ PASS |

Java was not available locally, so the existing report command skipped HTML aggregation;
the JSON report content was verified. PR CI installs Java and remains the required HTML
enforcement point. `npm ci` repeated the known PBR-03 high-severity development-only
transitive advisory; dependency remediation remains outside this image-pin item.

---

## Changes Implemented

### Single-source reviewed image pins

**Files changed:**
- `config/container-image-pins.psd1` — records exact readable tags and reviewed
  multi-platform index digests for the two external container inputs.

| Purpose | Exact tag | Reviewed digest |
|---|---|---|
| Maven builder | `maven:3.9.16-eclipse-temurin-17-noble` | `sha256:1ed5d1f54416b706707b4f3238f63a20bb06aab27c6d240090a2bb9ad895ed45` |
| ParaBank runtime | `tomcat:10.1.57-jre21-temurin-noble` | `sha256:f6e69a64d90e3b71b22e77fdfa87b3df9fa86be393cd01912e9bf34d0076b335` |

### Build-time drift enforcement

**Files changed:**
- `scripts/build-sut.ps1` — safely imports the data file, validates required fields,
  resolves each exact tag through Docker Buildx, compares registry and reviewed digests,
  checks the pinned upstream Dockerfile runtime tag, and exposes
  `-ValidateImagePinsOnly` for review-time validation.
- `docker-compose.yml` — builds `Dockerfile.pinned`, generated from the pinned upstream
  Dockerfile with its `FROM` instruction replaced by the reviewed `tag@sha256` reference.

The generated Dockerfile stays under ignored `target-app/`; no vendor source or generated
build input is committed. The source Dockerfile's remaining instructions are preserved.

### Project evidence reconciliation

**Files changed:**
- `README.md` — exposes the builder/runtime pin posture and links the pin source and policy.
- `docs/container-image-pin-policy.md` — records provenance, enforcement, and the refresh procedure.
- `docs/project-contract.md` — adds the container-pin working norm.
- `docs/backlog.md` — advances to v13, closes PB-CODEX-05 using PR #18 and post-merge
  run 30688956444, and records PB-CODEX-06 as implemented pending merge gates.
- `docs/design-document.md` — advances to v1.6 and links NFR-5 to the container policy.
- `docs/decision-register.md` — records PB-CODEX-05 as adopted under DR-PB-10 and
  PB-CODEX-06 implementation as in progress.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Pin multi-platform index digests rather than the local AMD64 child manifest. | Preserves immutable behaviour on both local Docker Desktop and Linux CI without architecture-specific configuration. | Host-specific child digest; mutable tag only. |
| Replace the floating Maven family tag with exact `3.9.16-eclipse-temurin-17-noble`. | Keeps the human-readable tag as precise as the reviewed manifest instead of hiding a future Maven/OS change behind `3.9-eclipse-temurin-17`. | Retain the floating family tag beside the digest. |
| Generate a pinned derivative of the upstream Dockerfile. | Preserves the source-pinned upstream instructions, avoids committing vendor source, and lets the build enforce the reviewed runtime digest. | Patch the ignored checkout manually; duplicate the complete upstream Dockerfile as a tracked fork. |
| Compare exact tags with current registry digests before every build. | Detects republished/drifted tags early and reports actionable old/new evidence before packaging. | Trust a syntactically valid digest without checking tag coherence; rely on a later opaque pull failure. |

No new ADR was required because DR-PB-10 already governs immutable execution inputs and
their deliberate refresh process.

---

## Documentation Updates

- `README.md` — added builder/runtime pin facts and policy links.
- `docs/container-image-pin-policy.md` — added provenance, enforcement, and refresh instructions.
- `docs/project-contract.md` — added the DR-PB-10 container-pin working norm.
- `docs/backlog.md` — reconciled PB-CODEX-05 and PB-CODEX-06 status.
- `docs/design-document.md` — recorded v1.6 digest-pin implementation detail.
- `docs/decision-register.md` — aligned DR-PB-10 implementation status.
- `docs/implementation-logs/2026-08-01_pb-codex-06-image-digests.md` — added this immutable record.

---

## Lessons Learned

- Docker's top-level index digest is the portable immutable input; the listed platform
  manifests are children and must not be confused with the cross-platform pin.
- Image annotations revealed that the old Maven family tag currently meant Maven 3.9.16 on
  Ubuntu Noble, making the exact replacement tag straightforward and reviewable.
- Generating only the `FROM` replacement keeps the repository aligned with the pinned vendor
  Dockerfile while still ensuring Compose cannot consume its mutable base reference.
- Negative guard probes are important: a valid-looking 64-character digest should fail with
  a clear drift message, not merely pass format validation.

---

## Recommendations / Next Steps

- [ ] Merge the PB-CODEX-06 project PR and require its PR plus post-merge `main` CI to pass before closing the item — MEDIUM.
- [ ] Reconcile the portfolio-root ParaBank worklist with PB-CODEX-05 closure and PB-CODEX-06 PR evidence — MEDIUM.
- [ ] Continue with PB-CODEX-07 to add bounded REST, SOAP, and live-spec request deadlines — MEDIUM.
- [ ] Retain PBR-02 until Node-24-native action majors are available and reviewed — LOW.
- [ ] Resolve PBR-03 as a separate dependency-only change — LOW.

---

*Session logged: 2026-08-01. Author: Codex.*
