<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-10_triage-16-reproducibility-gaps.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-16: close reproducibility gaps in perf runner, gate, smoke-safety and compose tag, 2026-11-10

## Session Summary

Resolved Claude v1 review finding R-10 (score 4, LOW) — closing the final triage item in the ParaBank backlog — by eliminating four small reproducibility gaps across operational and verification scripts:

1. **Default k6 Image Pin in Local Perf Runner (`scripts/run-perf.mjs`, D-T16-1):**
   - Pinned `DEFAULT_K6_IMAGE` to `grafana/k6@sha256:e7eeddf1ce2361df6920d925297f487c0ba549c44be242c6a9c22f28d9b08efa` matching `.github/workflows/perf.yml:29`.
   - Exported `DEFAULT_K6_IMAGE` and wrapped CLI execution logic with `isMain` guard so that local `npm run perf:run` runs the identical byte-for-byte image as scheduled CI without relying on mutable `latest` tags.

2. **Bounded PowerShell Web Request Timeouts in Gate (`scripts/gate.ps1`, D-T16-2):**
   - Added explicit `-TimeoutSec 10` to all three readiness probes (`login`, `openapi.json`, and `ParaBank?wsdl`).
   - Prevents potential hanging requests if a container stalls during startup, ensuring fast failure and loop iteration rather than unbound socket hangs.

3. **Request Deadline Policy in Smoke Safety (`scripts/smoke-safety.mjs`, D-T16-3):**
   - Imported and wrapped `seed()` and `readJson()` network requests with `withRequestDeadline` from `src/api/request-deadline.ts`.
   - Propagates enforced 10-second request deadlines, AbortController timeout handling, and credential-safe error context reporting.

4. **Docker Compose Image Tag Cross-Check in SUT Builder (`scripts/build-sut.ps1`, D-T16-4):**
   - Added early validation inspecting `docker-compose.yml` to assert that `image: parabank:<short-sha>` strictly matches `$UpstreamCommit.Substring(0, 7)`.
   - Fails immediately with `COMPOSE IMAGE TAG MISMATCH` before initiating any Git checkout, Maven compilation, or Docker build steps.

5. **Empirical Must-Fail Verification Protocol (D-T16-6):**
   - Executed `pwsh scripts/build-sut.ps1 -UpstreamCommit 1234567890abcdef1234567890abcdef12345678 -ValidateImagePinsOnly`.
   - Confirmed immediate failure: `COMPOSE IMAGE TAG MISMATCH: docker-compose.yml declares image 'parabank:d1bf006', but build-sut.ps1 was invoked with UpstreamCommit '1234567890abcdef1234567890abcdef12345678' (expected tag '1234567')` with exit code 1.

6. **Comprehensive Unit Test Suite (`tests/unit/reproducibility-gaps.test.ts`, D-T16-5):**
   - Authored unit test suite covering:
     1. `run-perf.mjs` `DEFAULT_K6_IMAGE` matches pinned digest in `perf.yml:29`.
     2. All `Invoke-WebRequest` calls in `gate.ps1` carry `-TimeoutSec`.
     3. `smoke-safety.mjs` wraps all HTTP requests with `withRequestDeadline`.
     4. `docker-compose.yml` image tag matches `build-sut.ps1` UpstreamCommit prefix.
     5. Must-fail test reproducing the compose tag mismatch validation.
   - Expanded unit test inventory from 108 to 113 tests (19 test suites, 100% passing).

Plan: [`../implementation-plans/2026-11-10_triage-16-reproducibility-gaps.md`](../implementation-plans/2026-11-10_triage-16-reproducibility-gaps.md)
(approved 2026-11-10 by owner, decisions D-T16-1 to D-T16-6 confirmed).
