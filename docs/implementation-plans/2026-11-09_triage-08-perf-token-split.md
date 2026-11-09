---
version: 1
created: 2026-11-09T16:00Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-08 (approved worklist item; proposed backlog candidate)
status: approved
approved: 2026-11-09 (owner)
delivered: not yet
language: en-GB
---

# Implementation plan: TRIAGE-08, split the perf workflow so no job running third-party code holds a write token

**Goal.** Eliminate workflow-level write tokens from the performance lane. Split `.github/workflows/perf.yml` into:
1. A `perf-smoke` job that executes under `permissions: contents: read` with `actions/checkout` `persist-credentials: false`, running the SUT, `npm ci`, esbuild, and Dockerized k6 to produce and upload an isolated diagnostics artifact, with zero write permissions.
2. A separate, minimal `publish` job (`needs: perf-smoke`, `permissions: contents: write`, `if: success() && github.ref == 'refs/heads/main'`) that downloads the verified artifact, validates provenance, promotes `index.html` and `perf-summary.json` to `perf/report/`, and commits to `main` with `[skip ci]`.
3. Ensure no third-party npm dependencies or build scripts run inside any environment holding a repository write token.

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-08 (`After TRIAGE-03. Follows D-2 option A`).
- Review findings: Claude v1 review R-03 (MEDIUM, 13) in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md` §3;
  Codex v2 review R-02 (MEDIUM) in `.review/CODE_REVIEW_CODEX_v2_20260929T0630Z/02_RISKS_AND_ISSUES.md`.
- Key files:
  - `.github/workflows/perf.yml` (lines 14-15, 30, 48-55, 65-77)
  - `docs/github-actions-pin-policy.md` (add entry for `actions/download-artifact`)
  - `scripts/promote-perf-snapshot.mjs` (pure Node ESM helper to promote downloaded artifact without `node_modules` or build tools)
  - `src/quality/perf-run-lifecycle.ts` (provenance & promotion lifecycle logic)
  - `tests/unit/perf-run-lifecycle.test.ts` (test coverage)

---

## Evidence Gathered Before Planning

All reads conducted in worktree `wt-parabank-t08` tracking `origin/main` at `8b2d820` (following TRIAGE-03 outcome merge),
with Node 24.18.0 and npm 11.16.0.

| Finding | Consequence for the plan |
|---|---|
| **Workflow-level write token:** `.github/workflows/perf.yml:14-15` declares top-level `permissions: contents: write`. | Every job and step in the workflow inherits write permissions by default unless explicitly restricted. |
| **Credential persistence:** Line 30 executes `actions/checkout` without `persist-credentials: false`. | The GitHub token is persisted to `.git/config` during checkout, allowing any script running in the container or runner to access write credentials. |
| **Execution of untrusted/third-party code:** Lines 48-55 execute `npm ci` (arbitrary npm lifecycle install scripts), `npm run perf:build` (esbuild), and `npm run perf:run` (Dockerized k6) while the write token is active in the runner environment. | A compromised or typosquatted dev dependency could push to `main` without review. |
| **Prerequisite established by TRIAGE-03:** In PR #64 / #65, `perf/run-output/` was decoupled from git tracking, and `perf.yml` was configured to upload `path: perf/run-output` as artifact `perf-summary`. | `perf-smoke` already produces a clean, self-contained artifact directory containing `perf-summary.json`, `index.html`, and `run-metadata.json`. |
| **Action pin policy discipline:** Every action in `.github/workflows/` must be pinned by immutable 40-character commit SHA with version comment and documented in `docs/github-actions-pin-policy.md`. | Adding `actions/download-artifact` requires selecting a vetted release and documenting its Node 24 runtime compliance. |

---

## Design Options & Proposed Architecture

### 1. Workflow-Level Permissions Drop (D-T08-1)
- Drop workflow-level `permissions: contents: write`.
- Set top-level permissions to:
  ```yaml
  permissions:
    contents: read
  ```
  or empty `permissions: {}`.

### 2. Job 1: `perf-smoke` (Read-Only)
- Explicit job permissions:
  ```yaml
  permissions:
    contents: read
  ```
- Checkout step:
  ```yaml
  - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0
    with:
      persist-credentials: false
  ```
- Steps:
  1. `actions/checkout` (`persist-credentials: false`)
  2. `Initialize performance diagnostics` (`./scripts/init-perf-run.ps1`)
  3. `Build SUT image` (`./scripts/build-sut.ps1`)
  4. `Start ParaBank` (`docker compose up -d`)
  5. `actions/setup-node` (pinned v5.0.0, node 24)
  6. `Boot gate (readiness)` (`./scripts/gate.ps1`)
  7. `Install toolchain` (`npm ci`)
  8. `Build the k6 bundle` (`npm run perf:build`)
  9. `Run the k6 performance smoke` (`npm run perf:run`)
  10. `Upload perf summary artifact` (`uses: actions/upload-artifact@043fb46d...`, `path: perf/run-output`, `if: always()`)
  11. `SUT logs on failure` (`if: failure()`)
  12. `Teardown` (`docker compose down`, `if: always()`)
- Notice: The `Publish refreshed /perf/ summary` step is completely removed from `perf-smoke`.

### 3. Job 2: `publish` (Token-Gated, Zero-Dependency)
- Job declaration:
  ```yaml
  publish:
    needs: perf-smoke
    if: success() && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: write
  ```
- Zero third-party execution constraint:
  - `publish` must NOT run `npm ci` or execute arbitrary build commands.
  - To promote the snapshot, a lightweight Node ESM script `scripts/promote-perf-snapshot.mjs` will be authored using only Node standard library modules (`node:fs`, `node:path`).
- Steps:
  1. `actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` (checks out `main`, credentials persisted so git push works).
  2. `Download perf summary artifact`:
     ```yaml
     - name: Download perf summary artifact
       uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
       with:
         name: perf-summary
         path: downloaded-perf-summary
     ```
  3. `Promote perf snapshot`:
     ```yaml
     - name: Promote perf snapshot
       run: node scripts/promote-perf-snapshot.mjs downloaded-perf-summary perf/report
     ```
  4. `Publish refreshed /perf/ summary`:
     ```yaml
     - name: Publish refreshed /perf/ summary (commit to main, skip CI)
       continue-on-error: true # tolerate branch protection; the artifact remains the evidence
       run: |
         git config user.name "github-actions[bot]"
         git config user.email "github-actions[bot]@users.noreply.github.com"
         git add perf/report/index.html perf/report/perf-summary.json
         if git diff --staged --quiet; then
           echo "No change to the performance summary."
         else
           git commit -m "chore(perf): refresh nightly performance-smoke summary [skip ci]"
           git push
         fi
     ```

### 4. Promotion Helper Script (`scripts/promote-perf-snapshot.mjs`)
- Standard Node.js ESM script with zero dependencies:
  - Reads `downloaded-perf-summary/perf-summary.json`.
  - Verifies that `provenance.generatedAt` and `provenance.sourceRef` are present and valid ISO/SHA strings.
  - Copies `downloaded-perf-summary/perf-summary.json` to `perf/report/perf-summary.json`.
  - Copies `downloaded-perf-summary/index.html` (or fallback `perf-summary.html`) to `perf/report/index.html`.
  - Emits informative logging.
  - Throws exit code 1 if files are missing or malformed, preventing unprovenanced snapshot promotion.

### 5. Action Pin: `actions/download-artifact`
- Release: `v8.0.2` (published 2026-10-07, >1 month old, verified `runs.using: node24`).
- Commit SHA: `9000827ccba6bdab643e8b6fd33ac0654aef8333`.
- Documented in `docs/github-actions-pin-policy.md`.

---

## Test & Verification Strategy

1. **Unit Tests:**
   - Add unit test suite for `scripts/promote-perf-snapshot.mjs` verifying:
     - Promotes valid provenanced JSON and HTML to target directory.
     - Rejects missing `perf-summary.json`.
     - Rejects malformed JSON or unprovenanced summaries.
     - Preserves clean exit codes on error.
   - Run `npm run test:unit` (suite expands from 54 to 58).
2. **Static & Workflow Verification:**
   - Verify YAML structure of `.github/workflows/perf.yml`.
   - Run `npm run typecheck`, `npm run typecheck:style-02`, `npm run typecheck:style-03`.
   - Run `npm run lint:tags`.
   - Run `tools/ci/check-support.ps1 -Only Docs` at portfolio root.
3. **CI Contract Gating:**
   - PR CI (`ci.yml`, `sut-boot-gate`) verifies the codebase and test suite on the branch.
   - Manual `workflow_dispatch` of `perf.yml` on `main` post-merge to empirically demonstrate the two-job execution:
     - `perf-smoke` runs with read-only token and uploads artifact.
     - `publish` downloads artifact, promotes snapshots, and commits to `main` with `[skip ci]`.

---

## Decisions Put to the Owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| **D-T08-1 Workflow Permissions** | A: Top-level `permissions: contents: read`; `perf-smoke` declares `contents: read`; `publish` declares `contents: write`.<br>B: Top-level `permissions: {}` (empty). | **A: Top-level `contents: read`** (explicit least-privilege default) | approved (Option A: Top-level contents: read) |
| **D-T08-2 Promotion Mechanism in `publish`** | A: Pure Node ESM script `scripts/promote-perf-snapshot.mjs` (zero npm dependencies, executes natively on Node in `ubuntu-latest`).<br>B: PowerShell script `scripts/promote-perf-snapshot.ps1`.<br>C: Run `npm ci` in `publish`. | **A: Pure Node ESM script** (guarantees zero third-party dependencies run under write token while remaining cross-platform) | approved (Option A: Pure Node ESM script) |
| **D-T08-3 `actions/download-artifact` Pin** | A: `actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2` (Node 24 native, released 2026-10-07).<br>B: `actions/download-artifact@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0`. | **A: `v8.0.2` (`9000827...`)** (proven Node 24 native release matching `upload-artifact` v7) | approved (Option A: v8.0.2 @ 9000827ccba6bdab643e8b6fd33ac0654aef8333) |
| **D-T08-4 Branch Protection Gating** | A: Retain `continue-on-error: true` on the publish git push step to gracefully tolerate potential branch protection while preserving artifact evidence.<br>B: Remove `continue-on-error: true`. | **A: Retain `continue-on-error: true`** (consistent with existing workflow design) | approved (Option A: Retain continue-on-error: true) |
| **D-T08-5 Two-PR Cadence** | A: Deliver TRIAGE-08 as an independent PR, followed by outcome PR (v40) and root worklist tick.<br>B: Single PR. | **A: Deliver independently** (preserves project review cadence) | approved (Option A: Discrete implementation PR) |

---

## Outcome

Not yet delivered.
