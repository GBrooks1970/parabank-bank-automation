---
version: 1
created: 2026-11-09T15:18Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-03 (approved worklist item; proposed backlog candidate)
status: implemented
approved: 2026-11-09 (owner)
delivered: 2026-11-09 (#64, 8ac8a7d)
language: en-GB
---

# Implementation plan: TRIAGE-03, isolate current performance-run diagnostics from committed report snapshots

**Goal.** Ensure that failed performance-smoke runs cannot attach old committed metrics as their artifacts, that
threshold failures capture current-run diagnostics and failure metadata without corrupting committed snapshots, and
that only provenanced, successful runs promote snapshots for publication.

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-03 (`Precedes TRIAGE-08 (same workflow)`).
- Review findings: Claude v1 review R-03 (MEDIUM, 13) in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md` §3;
  Codex v2 review R-02 (MEDIUM) in `.review/CODE_REVIEW_CODEX_v2_20260929T0630Z/02_RISKS_AND_ISSUES.md`.
- Key files:
  - `.github/workflows/perf.yml` (lines 30, 57-63, 65-77)
  - `scripts/run-perf.mjs` (lines 13-22, 61-97)
  - `.gitignore` (add run output location)
  - `src/quality/perf-evidence.ts` (provenance & assessment logic)

---

## Evidence Gathered Before Planning

All reads were conducted in worktree `wt-parabank-t03` of `origin/main` at `9b0e0ca` (following TRIAGE-07 outcome merge),
with Node 24.18.0 and npm 11.16.0.

| Finding | Consequence for the plan |
|---|---|
| **Committed snapshot checkout:** `actions/checkout` checks out `perf/report/index.html` and `perf/report/perf-summary.json` (committed on `main` for Pages publication). | When the runner boots, `perf/report` already contains the *previous* run's metrics. |
| **Pre-k6 failure masquerading:** In `.github/workflows/perf.yml:57-63`, the `Upload perf summary artifact` step runs `if: always()` and uploads `path: perf/report`. If any early step fails (`build-sut.ps1`, `docker compose up`, `gate.ps1`, `npm ci`, or `npm run perf:build`), the artifact uploaded by the failed run contains the **old, committed green report** from yesterday. | Pre-k6 failures must upload from an isolated, run-specific location that starts clean, not from `perf/report`. |
| **In-place container mount:** `scripts/run-perf.mjs:72` mounts `-v ${REPORT}:/work`. k6's `handleSummary` writes directly into `perf/report`. | `run-perf.mjs` operates directly inside the git-tracked snapshot directory rather than a staging directory. |
| **Threshold failure unhandled exit:** If k6 breaches a threshold, it exits with code 99. In `scripts/run-perf.mjs:78`, `execFileSync('docker', args)` throws. Execution halts before lines 80-97 can run. | When k6 throws on threshold failure, `perf/report/perf-summary.json` is updated by k6, but `perf-summary.html` is never renamed to `index.html`. The directory is left in an inconsistent mixed state (new JSON, old HTML). |
| **Provenance gating is already present but coupled:** `scripts/run-perf.mjs:92-96` checks that `written?.provenance?.generatedAt === generatedAt && written?.provenance?.sourceRef === sourceRef`. | Provenance verification works, but it currently guards renaming in-place rather than controlling promotion from an isolated workspace into `perf/report`. |
| **Publishing to `main` is already success-gated:** `perf.yml:65-66` has `if: success() && github.ref == 'refs/heads/main'`. | Failed runs never push to `main` or deploy to Pages. The defect is strictly in the **workflow run artifact** (`perf-summary`), which misleads engineers investigating run failures by attaching green metrics to failed runs. |
| **Direct coupling to TRIAGE-08:** TRIAGE-08 will split `.github/workflows/perf.yml` into `perf-smoke` (read-only token) and `publish` (write token, `needs: perf-smoke`, `if: success()`). | TRIAGE-03's artifact isolation provides the exact contract needed for TRIAGE-08: `perf-smoke` will upload the isolated run output artifact, and `publish` will download and promote it to `perf/report`. |

---

## Design Options

1. **Option A: Clean `perf/run-output/` directory + encapsulated promotion in `run-perf.mjs` (Recommended).**
   - Define a dedicated run output location: `perf/run-output/` (git-ignored).
   - Add a lightweight initialization script/step (`scripts/init-perf-run.mjs` or PowerShell inline) that cleans and prepares `perf/run-output/` with an initial `run-metadata.json` (`{ status: 'in_progress', startedAt, sourceRef }`) before any failure-prone step.
   - In `run-perf.mjs`:
     - k6 mounts `perf/run-output/` as `/work`. k6 generates `perf-summary.json` and `perf-summary.html` into `perf/run-output/`.
     - `run-perf.mjs` wraps the Docker execution in a structured `try ... catch`.
     - **On threshold failure / container error:** catch the error, write `failure-metadata.json` into `perf/run-output/` (`{ status: 'failed', exitCode, failedAt, sourceRef, k6Image, reason }`), preserve k6's raw outputs in `perf/run-output/`, leave `perf/report/` untouched, and rethrow/exit non-zero.
     - **On k6 success (exit 0):** verify provenance in `perf/run-output/perf-summary.json`. If valid, format `index.html`, write `run-metadata.json` (`status: 'success'`), and promote (`cpSync`) the verified snapshot to `perf/report/`.
   - In `.github/workflows/perf.yml`:
     - Point `Upload perf summary artifact` (`if: always()`) to `path: perf/run-output`.
   - **Advantages:** Completely solves pre-k6 and threshold failure masquerading; keeps logic cross-platform in TypeScript/Node; testable via unit tests; cleanly paves the way for TRIAGE-08.
2. **Option B: Workflow-only staging using shell commands in YAML.**
   - Leave `run-perf.mjs` writing in-place and use bash commands in `perf.yml` to move files back and forth.
   - **Rejected:** Brittle in CI; cannot be tested locally without running full GitHub Actions; does not protect local developers running `npm run perf:run`.

---

## Architecture & Lifecycle

### Directory Separation

- **Committed Snapshot Directory:** `perf/report/`
  - Tracked in Git on `main`.
  - Read by `src/quality/pages-evidence.ts` during functional deployment.
  - Contains only verified, passing snapshots: `index.html` and `perf-summary.json`.
- **Run Diagnostics Directory:** `perf/run-output/`
  - Untracked (added to `.gitignore`).
  - Wiped clean at the start of each run.
  - Used as container mount for k6.
  - Uploaded as the workflow run artifact by `actions/upload-artifact`.

### Execution Paths & Behaviors

```
                      +---------------------------------------+
                      | Start Perf Run (Clean perf/run-output)|
                      | Write run-metadata.json (in_progress) |
                      +-------------------+-------------------+
                                          |
                        +-----------------+-----------------+
                        |                                   |
             [Pre-k6 Failure]                         [k6 Execution]
             (Build SUT/Gate)                               |
                        |                    +--------------+--------------+
                        v                    |                             |
             Upload perf/run-output       [Threshold/Error]            [k6 Exit 0]
             (only in_progress meta;             |                             |
              zero old metrics)                  v                             v
                                         Write failure-meta.json       Validate Provenance
                                         Retain raw k6 data                    |
                                         (perf/report UNTOUCHED)       +-------+-------+
                                                 |                     |               |
                                                 v                 [Invalid]        [Valid]
                                         Upload perf/run-output        |               |
                                         (diagnostics + failure)       v               v
                                                                   Fail loudly    Promote to
                                                                                  perf/report/
                                                                                       |
                                                                                       v
                                                                                  Stage commit
```

1. **Pre-k6 Failure:**
   - E.g. Maven build fails or ParaBank boot gate times out.
   - `perf/run-output/` contains only `run-metadata.json` indicating premature abort.
   - Artifact contains zero old metrics and no `perf/report/index.html`.
2. **Threshold Failure:**
   - k6 runs and fails performance thresholds (exit code 99).
   - `perf/run-output/` contains raw `perf-summary.json`, `perf-summary.html`, and `failure-metadata.json`.
   - `perf/report/` is NOT modified.
   - Uploaded artifact gives exact failure details without masquerading as an old pass.
3. **Success Path:**
   - k6 runs and passes all thresholds (exit code 0).
   - Provenance (`generatedAt`, `sourceRef`) is strictly verified.
   - Verified snapshot (`index.html` and `perf-summary.json`) is promoted to `perf/report/`.
   - Run metadata updated to `status: 'success'`.
   - In `.github/workflows/perf.yml`, step 65 pushes `perf/report/` to `main` (ready for TRIAGE-08 job split).

---

## Steps

1. **Gitignore:**
   - Add `/perf/run-output/` to `.gitignore`.
2. **Run Initialization Helper:**
   - Add `src/quality/perf-run-lifecycle.ts` exporting:
     - `initPerfRunOutput(rootDir: string, sourceRef: string): { runOutputDir: string, startedAt: string }`
     - `recordPerfFailure(runOutputDir: string, error: unknown, details: Record<string, unknown>): void`
     - `promotePerfSnapshot(runOutputDir: string, targetReportDir: string, provenance: Provenance): void`
3. **Update `scripts/run-perf.mjs`:**
   - Use `initPerfRunOutput` to prepare clean `perf/run-output`.
   - Mount `perf/run-output` as `/work` for k6.
   - Wrap Docker invocation in `try ... catch`:
     - In `catch`: call `recordPerfFailure`, log diagnostics, and exit with container exit code.
     - In `try` (on exit 0): verify provenance, call `promotePerfSnapshot` to update `perf/report/`.
4. **Update `.github/workflows/perf.yml`:**
   - Add early step `Initialize performance run diagnostics` before SUT build:
     ```yaml
     - name: Initialize performance diagnostics
       run: node -e "import('./src/quality/perf-run-lifecycle.ts').then(m => m.initPerfRunOutput(process.cwd(), process.env.GITHUB_SHA || 'dev'))"
     ```
   - Update `Upload perf summary artifact` (step 57-63):
     ```yaml
     - name: Upload perf diagnostics artifact
       if: always()
       uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
       with:
         name: perf-diagnostics
         path: perf/run-output
         if-no-files-found: warn
     ```
5. **Unit Tests:**
   - Add `tests/unit/perf-run-lifecycle.test.ts` to test all lifecycle functions against temporary directories:
     - Initialization creates empty directory with initial metadata; wipes previous artifacts.
     - Failure capture writes structured metadata without modifying report target.
     - Snapshot promotion validates provenance and copies exact required files (`index.html`, `perf-summary.json`).
     - Promotion refuses invalid or mismatched provenance.
6. **Documentation & Implementation Log:**
   - Write `docs/implementation-logs/2026-11-DD_triage-03-perf-diagnostics-isolation.md`.
   - Update `docs/implementation-plans/_index.md`.

---

## Verification & Must-fail Test Strategy

- **Test Suite (Unit):**
  - Run `npm run test:unit` to verify `tests/unit/perf-run-lifecycle.test.ts` passes along with existing 50 tests.
- **Three-Path Verification Script (Scratch test):**
  - **Path 1 (Pre-k6 Early Failure):**
    - Run initialization step, simulate early failure (e.g. throw before `perf:run`).
    - Verify `perf/run-output` contains only initial metadata.
    - Verify `perf/report/` was untouched.
    - Confirm artifact payload contains zero metric files (`perf-summary.json` is absent).
  - **Path 2 (Threshold / Container Failure):**
    - Seed `perf/run-output` with simulated k6 threshold failure output (exit 99).
    - Run failure handling.
    - Verify `failure-metadata.json` is created with exit code 99 and timestamp.
    - Verify `perf/report/index.html` still matches baseline git commit (NOT overwritten).
  - **Path 3 (Success Path):**
    - Provide valid k6 output with matching provenance.
    - Run promotion.
    - Verify `perf/run-output/index.html` and `perf-summary.json` are promoted to `perf/report/`.
    - Verify `assessPerfEvidence` in `src/quality/pages-evidence.ts` accepts the promoted summary.

---

## Gates

- Local gates:
  - `npm run typecheck`
  - `npm run test:unit` (50 + new lifecycle tests)
  - `npm run lint:tags`
  - `tools/ci/check-support.ps1 -Only Docs` from portfolio root
- CI gates:
  - PR CI: `ci.yml` (`sut-boot-gate`) verifies the functional suites and unit tests on the branch.
  - Manual dispatch of `perf.yml` on branch or post-merge to verify end-to-end execution on GitHub Actions.

---

## Delivery

- **Project PR** from `worklist/triage-03-perf-diagnostics-isolation` with lifecycle module, script updates, workflow adjustments, unit tests, and implementation log.
- **Outcome follow-up (project):**
  - Append plan Outcome and set index to `implemented`.
  - Add backlog v39 recording TRIAGE-03 delivery and CI runs.
- **Root:**
  - Tick `- [x] TRIAGE-03` in `WORKLIST_parabank-bank-automation.md`.
  - Unblocks **TRIAGE-08** (workflow permissions split).

---

## Decisions Put to the Owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| **D-T03-1 Directory Location** | A: `perf/run-output/`<br>B: `perf/diagnostics/`<br>C: `.tmp/perf/` | **A: `perf/run-output/`** (clean, self-explanatory, git-ignored) | approved (Option A: `perf/run-output/`) |
| **D-T03-2 Pre-k6 Failure Artifact** | A: Initialize `run-metadata.json` (`in_progress`) before early steps so failed runs upload explicit abort metadata.<br>B: Leave directory empty until k6 runs. | **A: Initialize `run-metadata.json`** (proves run ran and was aborted early; never attaches old metrics) | approved (Option A: Initialize `run-metadata.json` early) |
| **D-T03-3 Failure Diagnostics Content** | A: Record `{ status: 'failed', exitCode, failedAt, sourceRef, k6Image }` + retain raw k6 files.<br>B: Retain raw k6 files only without metadata. | **A: Structured metadata + raw k6 outputs** | approved (Option A: Structured metadata + raw k6 outputs) |
| **D-T03-4 Artifact Naming** | A: Rename artifact to `perf-diagnostics` in TRIAGE-03.<br>B: Keep artifact name `perf-summary` for backwards compatibility with Pages documentation. | **B: Keep artifact name `perf-summary`** (avoids breaking any external reader while isolating its contents) | approved (Option B: Keep artifact name `perf-summary`) |
| **D-T03-5 TRIAGE-08 Coordination** | A: Deliver TRIAGE-03 as an independent PR, immediately followed by TRIAGE-08.<br>B: Bundle TRIAGE-03 and TRIAGE-08 into a single PR. | **A: Deliver independently** (preserves the approved worklist order and discrete, reviewable PR cadence) | approved (Option A: Deliver independently) |

---

## Outcome

Delivered 2026-11-09 in PR [#64](https://github.com/GBrooks1970/parabank-bank-automation/pull/64) (merge commit `8ac8a7d`, implementation commit `e8cd6dc`).
PR CI [run 42645583773](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/42645583773) passed on `e8cd6dc` (`sut-boot-gate` in 2m51s); post-merge `main` CI [run 42646613505](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/42646613505) passed on `8ac8a7d` (`sut-boot-gate` in 2m52s).

All design points delivered as planned with zero deviations:
- `/perf/run-output/` git-ignored and used for all container execution outputs.
- `scripts/init-perf-run.ps1` runs early to record initial `run-metadata.json` (`status: in_progress`).
- Pre-k6 failures upload only current run metadata; old committed metrics from previous runs are never attached.
- Threshold failure or container error captures structured `failure-metadata.json` while `perf/report/` remains pristine.
- `promotePerfSnapshot` in `src/quality/perf-run-lifecycle.ts` promotes verified snapshots only after strict provenance checks match on clean exit 0.
- Workflow `perf.yml` artifact upload points to `perf/run-output` retaining artifact name `perf-summary`.
- Unit test suite expanded from 50 to 54 (`tests/unit/perf-run-lifecycle.test.ts`), covering pre-k6 early abort, threshold breach, provenance gating, and successful promotion.
- Unblocks TRIAGE-08 (splitting perf workflow runner and publish jobs).
