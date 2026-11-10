---
version: 1
created: 2026-11-10T21:05Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-16 (approved worklist item; proposed backlog candidate)
status: delivered
approved: 2026-11-10 (owner)
presented: 2026-11-10
language: en-GB
---

# Implementation plan: TRIAGE-16, close small reproducibility gaps in the perf runner, gate, smoke-safety and compose tag

**Goal.** Address the four residual reproducibility gaps identified in Claude v1 review finding R-10 (score 4, LOW):
1. In `scripts/run-perf.mjs`, default `k6Image` to the immutable digest pinned in `.github/workflows/perf.yml:29` (`grafana/k6@sha256:e7eeddf1ce2361df6920d925297f487c0ba549c44be242c6a9c22f28d9b08efa`) instead of the floating tag `grafana/k6:latest`.
2. In `scripts/gate.ps1`, add explicit `-TimeoutSec 10` to the login, OpenAPI, and SOAP WSDL probes (lines 50, 55, 60), bounding every network probe.
3. In `scripts/smoke-safety.mjs`, replace raw `fetch` calls with the project's standard `withRequestDeadline` helper from `src/api/request-deadline.ts`, enforcing a bounded 10-second timeout with credential-safe error formatting and abort handling.
4. In `scripts/build-sut.ps1`, add validation ensuring that the `image:` tag in `docker-compose.yml` matches `parabank:<short-commit>` (where `<short-commit>` is the first 7 characters of `$UpstreamCommit`), failing clearly before building if a tag mismatch exists.
5. Author a dedicated unit test suite `tests/unit/reproducibility-gaps.test.ts` verifying all four reproducibility guards (expanding unit test suite from 108 to 113+ tests).
6. Record an empirical must-fail proof demonstrating that `scripts/build-sut.ps1` fails with a descriptive error when invoked with a mismatched upstream commit.

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-16 (`Claude v1 R-10 (LOW, 4)`).
- Review findings: Claude v1 review R-10 in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md` §2.10 and `05_RECOMMENDATIONS.md`.
- Key files:
  - `scripts/run-perf.mjs`
  - `scripts/gate.ps1`
  - `scripts/smoke-safety.mjs`
  - `scripts/build-sut.ps1`
  - `docker-compose.yml`
  - `.github/workflows/perf.yml`
  - `tests/unit/reproducibility-gaps.test.ts` (new unit test suite)
  - `docs/backlog.md` (Version 49 -> 50)
  - `docs/qa-strategy.md` (unit test inventory update)

---

## Evidence Gathered Before Planning

All reads and commands conducted in worktree `wt-parabank-t16` on branch `worklist/triage-16-reproducibility-gaps` tracking `origin/main` at `eaa9ed7` (following TRIAGE-15 delivery outcome merge), with Node 24.18.0 and npm 11.16.0.

1. **Floating Tag in `scripts/run-perf.mjs`:**
   - Line 24: `const k6Image = process.env.K6_IMAGE || 'grafana/k6:latest';`
   - In contrast, `.github/workflows/perf.yml:29` pins k6 by digest:
     `K6_IMAGE: grafana/k6@sha256:e7eeddf1ce2361df6920d925297f487c0ba549c44be242c6a9c22f28d9b08efa`
   - Running `npm run perf` locally without explicitly setting `K6_IMAGE` pulls whatever `grafana/k6:latest` points to on Docker Hub, violating the portfolio image-pin discipline.

2. **Unbounded Probes in `scripts/gate.ps1`:**
   - `scripts/gate.ps1:40` (initializeDB poll) has `-TimeoutSec 5`.
   - In contrast, lines 50, 55, and 60 execute `Invoke-WebRequest` for login, OpenAPI, and WSDL without any `-TimeoutSec` argument:
     - Line 50: `Invoke-WebRequest "$BaseUrl/parabank/services/bank/login/john/demo" -Headers @{ Accept = 'application/json' } -UseBasicParsing`
     - Line 55: `Invoke-WebRequest "$BaseUrl/parabank/services/bank/openapi.json" -UseBasicParsing`
     - Line 60: `Invoke-WebRequest "$BaseUrl/parabank/services/ParaBank?wsdl" -UseBasicParsing`
   - If the containerized SUT hangs or deadlocks during startup, PowerShell's default web request timeout is 100 seconds (or indefinite depending on platform socket behavior), causing the gate to hang rather than failing quickly.

3. **Unbounded Fetch in `scripts/smoke-safety.mjs`:**
   - Lines 21 and 26 execute native `fetch` without an `AbortSignal` or deadline:
     - Line 21: `await fetch(`${SERVICES}/initializeDB`, { method: 'POST' });`
     - Line 26: `await fetch(`${SERVICES}${path}`, { headers: { Accept: 'application/json' } });`
   - If the SUT becomes unresponsive, the smoke-safety check hangs. The project already possesses a battle-tested `withRequestDeadline` utility (`src/api/request-deadline.ts`) providing a 10s timeout, `AbortController` cancellation, and credential-safe error logging.

4. **Missing Compose Image Tag Cross-Check in `scripts/build-sut.ps1`:**
   - `scripts/build-sut.ps1` defines param `[string]$UpstreamCommit = 'd1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1'`.
   - `docker-compose.yml:20` hardcodes `image: parabank:d1bf006`.
   - `build-sut.ps1` validates runtime pins and builds the image via `docker compose build`, but never verifies that `docker-compose.yml` actually specifies `parabank:d1bf006`. If a developer bumps `$UpstreamCommit` without updating `docker-compose.yml`, Docker tags the new build under the old tag or leaves `docker compose up -d` running an out-of-sync container.

---

## Key Decisions

### Decision D-T16-1: Pinned Default k6 Digest in `scripts/run-perf.mjs`
- **Context:** The acceptance criteria and review R-10 require `scripts/run-perf.mjs` to default to the exact digest pinned in `perf.yml`.
- **Decision:**
  - Export constant `DEFAULT_K6_IMAGE = 'grafana/k6@sha256:e7eeddf1ce2361df6920d925297f487c0ba549c44be242c6a9c22f28d9b08efa'` in `scripts/run-perf.mjs`.
  - Set `const k6Image = process.env.K6_IMAGE || DEFAULT_K6_IMAGE;`.
  - Ensures local runs (`npm run perf`) and CI runs (`perf.yml`) execute the exact same immutable container image byte-for-byte.

### Decision D-T16-2: Explicit `-TimeoutSec 10` on all `gate.ps1` Web Probes
- **Context:** Acceptance specifies: "the three `gate.ps1` probes carry `-TimeoutSec 10`".
- **Decision:**
  - Add `-TimeoutSec 10` to `Invoke-WebRequest` calls at lines 50, 55, and 60 in `scripts/gate.ps1`.
  - If any endpoint hangs or fails to reply within 10s, PowerShell aborts the request and triggers the failure handler immediately.

### Decision D-T16-3: Project Request-Deadline Policy in `scripts/smoke-safety.mjs`
- **Context:** Acceptance specifies: "`smoke-safety.mjs` requests use the project's request-deadline policy".
- **Decision:**
  - Import `withRequestDeadline` from `../src/api/request-deadline.ts`.
  - Refactor `seed()` to execute `initializeDB` via `withRequestDeadline({ method: 'POST' }, { operation: 'smoke-safety initializeDB', safePath: '/initializeDB' }, (signal) => fetch(...))`.
  - Refactor `readJson(path, what)` to execute via `withRequestDeadline({ headers: { Accept: 'application/json' } }, { operation: `smoke-safety ${what}`, safePath: path }, (signal) => fetch(...))`.
  - Retains all existing smoke-safety assertions and snapshot diffing while guaranteeing bounded 10-second deadlines and credential-safe diagnostics.

### Decision D-T16-4: Compose Image Tag Cross-Check in `scripts/build-sut.ps1`
- **Context:** Acceptance specifies: "`build-sut.ps1` fails clearly when the `docker-compose.yml` image tag does not match the pinned commit (must-fail run with a mismatched tag)".
- **Decision:**
  - In `scripts/build-sut.ps1`, read `docker-compose.yml` from `$root/docker-compose.yml`.
  - Extract the declared image tag matching pattern `(?m)^\s*image:\s*parabank:([a-f0-9]+)\s*$`.
  - Compute the expected short commit `$expectedShort = $UpstreamCommit.Substring(0, 7)`.
  - If `docker-compose.yml` is missing, lacks an image tag, or specifies a tag not equal to `$expectedShort`, throw:
    `"COMPOSE IMAGE TAG MISMATCH: docker-compose.yml specifies image '$composeTag', but pinned upstream commit is '$UpstreamCommit' (expected 'parabank:$expectedShort')."`
  - This check executes before any container download or Maven build, preventing mismatched container builds immediately.

### Decision D-T16-5: Architecture Unit Test Suite (`tests/unit/reproducibility-gaps.test.ts`)
- **Context:** To ensure reproducibility invariants are enforced automatically in local gates and CI.
- **Decision:**
  - Author `tests/unit/reproducibility-gaps.test.ts` (suite expanding from 108 to 113+ tests) verifying:
    1. `scripts/run-perf.mjs` exports and uses `DEFAULT_K6_IMAGE` matching `perf.yml` digest.
    2. `scripts/gate.ps1` all four `Invoke-WebRequest` calls include `-TimeoutSec`.
    3. `scripts/smoke-safety.mjs` imports and uses `withRequestDeadline`.
    4. `docker-compose.yml` image tag matches `scripts/build-sut.ps1` default `$UpstreamCommit` short SHA.
    5. Unit verification of compose tag validation logic (passes on match, fails clearly on mismatch).

### Decision D-T16-6: Must-Fail Demonstration Protocol
- **Context:** Acceptance requires: "must-fail run with a mismatched tag".
- **Decision:**
  - Execute `pwsh scripts/build-sut.ps1 -UpstreamCommit 1234567890abcdef1234567890abcdef12345678 -ValidateImagePinsOnly` (or with a dry run).
  - Observe that `build-sut.ps1` throws `COMPOSE IMAGE TAG MISMATCH` naming the declared vs expected tag and exits with code 1.
  - Record the exact command invocation, output, and exit code in the implementation log.

---

## Detailed Implementation Steps

1. **Update `scripts/run-perf.mjs`:**
   - Define and export `DEFAULT_K6_IMAGE` pinned to digest.
   - Use `const k6Image = process.env.K6_IMAGE || DEFAULT_K6_IMAGE`.
2. **Update `scripts/gate.ps1`:**
   - Add `-TimeoutSec 10` to login, openapi, and wsdl probes.
3. **Update `scripts/smoke-safety.mjs`:**
   - Import `withRequestDeadline` and wrap `seed()` and `readJson()`.
4. **Update `scripts/build-sut.ps1`:**
   - Add compose image tag validation against `$UpstreamCommit`.
5. **Author `tests/unit/reproducibility-gaps.test.ts`:**
   - Author 5+ unit tests covering all four reproducibility requirements.
6. **Local Gates & Must-Fail Check:**
   - Run unit tests (113+ passing).
   - Execute must-fail check against `build-sut.ps1` with mismatched upstream commit.
   - Run all typechecks and `lint:tags`.
7. **PR & Merge:**
   - Push branch `worklist/triage-16-reproducibility-gaps`, open PR, verify CI passes, and merge.
   - Deliver Outcome PR updating backlog to v50 and ticking the final item in root worklist!

---

## Decisions Summary for Owner Review

| ID | Title | Summary / Recommendation |
|---|---|---|
| **D-T16-1** | Default k6 Digest | Default `k6Image` in `scripts/run-perf.mjs` to digest from `perf.yml` instead of floating `latest`. |
| **D-T16-2** | Bounded Gate Probes | Add `-TimeoutSec 10` to all three remaining probes in `scripts/gate.ps1`. |
| **D-T16-3** | Smoke-Safety Deadline | Wrap `seed()` and `readJson()` in `scripts/smoke-safety.mjs` with `withRequestDeadline`. |
| **D-T16-4** | Compose Tag Validation | In `scripts/build-sut.ps1`, validate `docker-compose.yml` image tag matches `$UpstreamCommit.Substring(0, 7)`. |
| **D-T16-5** | Unit Test Suite | Author `tests/unit/reproducibility-gaps.test.ts` enforcing all 4 reproducibility guards. |
| **D-T16-6** | Must-Fail Protocol | Invoke `build-sut.ps1` with mismatched upstream commit, proving it aborts with clear mismatch error. |

---

## Outcome

Delivered 2026-11-10:
- Implementation merged in PR [#86](https://github.com/GBrooks1970/parabank-bank-automation/pull/86) as merge commit `e4acf6ed3c57af854adb13fad19a2fb8038b0365` (implementation commit `64cbd417652043be88984b5d4874c2fd77b1e685`).
- PR CI run [42909241554](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/42909241554) passed:
  - `Fast static checks` passed in 14s (tag lint, 4 typechecks, 113 unit tests, non-blocking audit).
  - `SUT boot gate & functional verification` passed in 2m50s (SUT boot, smoke-safety, API + UI lanes, Serenity BDD reporting, styles 02 & 03, static Pages packaging).
- Unit test suite expanded from 108 to 113 tests across 19 suites (`tests/unit/reproducibility-gaps.test.ts`).
- Empirical must-fail proof captured: `pwsh scripts/build-sut.ps1 -UpstreamCommit 1234567890abcdef1234567890abcdef12345678 -ValidateImagePinsOnly` threw `COMPOSE IMAGE TAG MISMATCH` and exited code 1.
- All 16 items in the ParaBank triage backlog are now 100% complete!
