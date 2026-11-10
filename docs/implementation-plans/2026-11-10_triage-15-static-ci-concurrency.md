---
version: 1
created: 2026-11-10T17:15Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-15 (approved worklist item; proposed backlog candidate)
status: drafted
presented: 2026-11-10
language: en-GB
---

# Implementation plan: TRIAGE-15, add a fast static CI job and cancel superseded PR runs

**Goal.** Enhance `.github/workflows/ci.yml` by adding a fast `static` job that executes dependency installation (`npm ci`), the four TypeScript compilation checks (`typecheck`, `typecheck:style-02`, `typecheck:style-03`, `perf:typecheck`), the tag linter (`lint:tags`), the unit test suite (`test:unit`), and a non-blocking high-severity dependency audit (`npm audit --audit-level=high --omit=optional`). Gate the SUT container build and end-to-end verification (`sut-boot-gate`) on `needs: static`. Introduce a top-level `concurrency` group with `cancel-in-progress: true` so superseded pull request runs are cancelled immediately. Retain strict 40-character commit SHA pinning across all workflow actions per DR-PB-10. Author an architecture unit test suite `tests/unit/ci-workflow-integrity.test.ts` enforcing workflow structure, dependency ordering, and action pin discipline. Record an empirical must-fail proof demonstrating that a deliberate compilation error fails the `static` job and prevents the SUT build from starting.

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-15 (`Claude v1 R-10 (LOW, 4); CI half of R-04`).
- Review findings: Claude v1 review R-04 & R-10 in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md` §2.4, §2.10, and `05_RECOMMENDATIONS.md`.
- Key files:
  - `.github/workflows/ci.yml` (primary CI workflow)
  - `docs/github-actions-pin-policy.md` (action pin policy and inventory)
  - `tests/unit/ci-workflow-integrity.test.ts` (new unit test suite)
  - `docs/backlog.md` (Version 48 -> 49)
  - `docs/qa-strategy.md` (unit test inventory update)

---

## Evidence Gathered Before Planning

All reads and commands conducted in worktree `wt-parabank-t15` on branch `worklist/triage-15-static-ci-concurrency` tracking `origin/main` at `4bdac71` (following TRIAGE-14 delivery outcome merge), with Node 24.18.0 and npm 11.16.0.

1. **Current CI Execution Model in `.github/workflows/ci.yml`:**
   - Single monolithic gate job `sut-boot-gate` performs SUT image building (`./scripts/build-sut.ps1`), SUT container boot (`docker compose up -d`), and HTTP readiness gating (`./scripts/gate.ps1`) *before* installing Node dependencies (`npm ci`) or running any TypeScript or unit tests.
   - SUT image building via containerised Maven currently takes ~1m30s to ~2m00s, followed by container boot and DB initialization (~15s).
   - If a developer introduces a syntax error, type mismatch, broken unit test, or tag policy violation, CI spends 2 to 3 minutes building the SUT image only to fail seconds into `npm run verify`.
   - Superseded PR pushes currently run to completion concurrently, consuming GitHub Actions minutes and runner slots.

2. **Performance of Static Verification Steps:**
   - The four compilation checks run locally in ~8-10 seconds total:
     - `npm run typecheck` (`tsc --noEmit`): ~3.5s
     - `npm run typecheck:style-02` (`tsc -p test-style-02/tsconfig.json`): ~1.8s
     - `npm run typecheck:style-03` (`tsc -p test-style-03/tsconfig.json`): ~1.9s
     - `npm run perf:typecheck` (`tsc -p perf/tsconfig.json`): ~1.5s
   - Unit test suite (`npm run test:unit`): 99 tests across 17 test suites complete in ~7-8s without SUT dependencies.
   - Tag linting (`npm run lint:tags`): ~1s.
   - Total static gate execution time: ~20-30 seconds (including `npm ci` cache restore).

3. **Dependency Audit Status:**
   - `npm audit --audit-level=high --omit=optional` currently exits `0` with 0 high-severity advisories (TRIAGE-01 and TRIAGE-07 resolved all 7 previous HIGH vulnerabilities, leaving only 2 LOW and 3 MODERATE recorded under PBR-09).
   - In accordance with the acceptance criteria, the audit step will be marked `continue-on-error: true` so any newly discovered upstream high advisory surfaces as an informational warning without blocking SUT gating or PR merges.

4. **Action Pinning Inventory:**
   - All external GitHub Actions in `.github/workflows/ci.yml` are pinned by 40-character commit SHAs:
     - `actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0`
     - `actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5.0.0`
     - `actions/setup-java@dd06d9cba3e5552c54d9f8ea23572deb30010f7c # v6.0.0`
     - `actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1`
     - `actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0`
     - `actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6.0.0`
     - `actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128 # v5.0.0`
   - The new `static` job requires only `actions/checkout` and `actions/setup-node`, which will reuse the exact pinned SHAs above.

---

## Key Decisions

### Decision D-T15-1: Workflow Concurrency Configuration
- **Context:** Pushing rapid successive commits to a PR branch or main currently triggers concurrent workflow runs that race and consume GitHub Actions quota.
- **Decision:**
  - Add top-level concurrency configuration to `.github/workflows/ci.yml`:
    ```yaml
    concurrency:
      group: ${{ github.workflow }}-${{ github.ref }}
      cancel-in-progress: true
    ```
  - For PRs, `github.ref` evaluates to `refs/pull/<pr_number>/merge`. When a new commit is pushed to the PR branch, GitHub cancels any active run on that PR ref and immediately runs against the latest head commit.
  - For `main`, `github.ref` evaluates to `refs/heads/main`. If successive merges land, obsolete intermediate runs on `main` are superseded, ensuring runner capacity is focused on deploying the latest validated commit to GitHub Pages.
- **Alternatives Considered:**
  - *`cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`:* Keeps all pushes to `main` queued sequentially. Rejected because sequential queueing on `main` delays the latest Pages deployment and wastes runner minutes on intermediate states that are immediately overwritten anyway.
  - *Per-job concurrency:* Rejected because job-level concurrency does not cancel upstream or downstream dependent jobs cleanly. Top-level workflow concurrency is idiomatic.

### Decision D-T15-2: Structure of the `static` Job
- **Context:** Acceptance specifies: "a `static` job runs `npm ci`, the four typechecks, `test:unit`, `lint:tags` and a non-blocking `npm audit --audit-level=high --omit=optional`, and the SUT job `needs` it".
- **Decision:**
  - Declare job `static` with `name: Fast static checks`, `runs-on: ubuntu-latest`, `timeout-minutes: 10`, and explicit `permissions: contents: read`:
    ```yaml
    jobs:
      static:
        name: Fast static checks
        runs-on: ubuntu-latest
        timeout-minutes: 10
        permissions:
          contents: read
        steps:
          - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0

          - uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5.0.0
            with:
              node-version: 24
              cache: npm

          - name: Install dependencies
            run: npm ci

          - name: Tag lint
            run: npm run lint:tags

          - name: Typechecks (main, style-02, style-03, perf)
            run: |
              npm run typecheck
              npm run typecheck:style-02
              npm run typecheck:style-03
              npm run perf:typecheck

          - name: Unit tests
            run: npm run test:unit

          - name: Dependency audit (non-blocking)
            continue-on-error: true
            run: npm audit --audit-level=high --omit=optional
    ```
  - Running tag lint first catches formatting or tag policy defects in <1 second.
  - Running all four typechecks in a grouped step validates compile-time correctness across the entire repository (main framework, style 02, style 03, and perf scripts).
  - Running unit tests catches logic regressions in ~7 seconds before any containerized infrastructure is spun up.

### Decision D-T15-3: Non-Blocking Dependency Audit
- **Context:** Acceptance requires a non-blocking high-severity audit step that reports without failing the job.
- **Decision:**
  - Use GitHub Actions native `continue-on-error: true` on step `Dependency audit (non-blocking)` with `run: npm audit --audit-level=high --omit=optional`.
  - When audit findings are clean (as they are today), the step completes with a green checkmark.
  - If a future upstream advisory introduces a high-severity vulnerability before a patch or override is merged, GitHub Actions marks the step with an orange warning indicator without failing the `static` job, ensuring the security signal is visible to developers while preventing unexpected merge blocking on third-party advisories.

### Decision D-T15-4: Preserving Canonical Verification in `sut-boot-gate`
- **Context:** `sut-boot-gate` currently runs `npm run verify`, which includes `typecheck`, `test:unit`, and `lint:tags` as part of its composite chain.
- **Decision:**
  - Keep `npm run verify` intact inside `sut-boot-gate`.
  - Retaining `npm run verify` maintains exact parity between the local developer verification entrypoint (`npm run verify`) and CI execution. The overhead of re-running typecheck, unit tests, and tag lint inside `sut-boot-gate` is negligible (~8s), and keeping the canonical verification script guarantees that `sut-boot-gate` remains completely self-contained.
  - Add `needs: static` to `sut-boot-gate` so it only starts once `static` completes successfully.

### Decision D-T15-5: Job Dependencies and GitHub Pages Deployment Gating
- **Context:** `deploy-pages` currently specifies `needs: sut-boot-gate`.
- **Decision:**
  - Retain `needs: sut-boot-gate` for `deploy-pages`.
  - Since `sut-boot-gate` has `needs: static`, `deploy-pages` transitively depends on `static`. If `static` fails, neither `sut-boot-gate` nor `deploy-pages` will execute.
  - This preserves the existing security invariant: Pages deployment only happens on `refs/heads/main` after both static and full functional verification pass.

### Decision D-T15-6: Architecture Unit Guard (`tests/unit/ci-workflow-integrity.test.ts`)
- **Context:** To prevent future regressions in CI configuration, an automated unit test should enforce workflow structure and action pinning.
- **Decision:**
  - Author `tests/unit/ci-workflow-integrity.test.ts` (suite expanding from 99 to 104+ tests) verifying:
    1. `.github/workflows/ci.yml` defines top-level `concurrency` with `group` and `cancel-in-progress: true`.
    2. `.github/workflows/ci.yml` defines job `static` with steps running `npm ci`, `lint:tags`, all four typechecks (`typecheck`, `typecheck:style-02`, `typecheck:style-03`, `perf:typecheck`), `test:unit`, and `npm audit --audit-level=high --omit=optional`.
    3. `sut-boot-gate` declares `needs: static`.
    4. Step `Dependency audit (non-blocking)` declares `continue-on-error: true`.
    5. Every `uses:` action across all workflows in `.github/workflows/*.yml` is pinned to an immutable 40-character commit SHA with a version comment (`# vX.Y.Z`).

### Decision D-T15-7: Must-Fail Verification Protocol
- **Context:** Acceptance requires: "a must-fail run with a deliberate type error fails the static job before the SUT build".
- **Decision:**
  - Execute a live must-fail check on branch `worklist/triage-15-static-ci-concurrency`:
    1. Introduce a deliberate compile error in `src/quality/seed-ownership.ts` (e.g. `const _mustFailTypeCheck: number = "deliberate_type_mismatch";`).
    2. Push the commit to the branch and inspect the GitHub Actions run.
    3. Verify empirically:
       - The `static` job fails at the `Typechecks` step within ~20-30 seconds.
       - The `sut-boot-gate` job is marked as skipped / not executed (`needs: static` failed).
       - No Maven image build or Docker containers were started.
    4. Revert the deliberate error and push the clean commit.
    5. Verify empirically that `static`, `sut-boot-gate`, and all downstream checks complete green.
    6. Record both run IDs, URLs, and timings in the implementation log.

---

## Detailed Implementation Steps

1. **Update `.github/workflows/ci.yml`:**
   - Add top-level `concurrency: group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true`.
   - Add job `static` running `checkout`, `setup-node`, `npm ci`, `lint:tags`, the four typechecks, `test:unit`, and `npm audit --audit-level=high --omit=optional` (`continue-on-error: true`).
   - Add `needs: static` to `sut-boot-gate`.
   - Ensure all `uses:` actions use exact 40-character commit SHAs.

2. **Author Architecture Unit Test Suite (`tests/unit/ci-workflow-integrity.test.ts`):**
   - Read `.github/workflows/ci.yml` and parse/verify concurrency, job structure, `needs: static`, audit non-blocking flag, and SHA pinning across all `.github/workflows/*.yml` files.

3. **Update Documentation:**
   - Update `docs/github-actions-pin-policy.md` to document the `static` job and its role in early gating.

4. **Local Verification:**
   - Run `npm run test:unit` (104+ tests passing).
   - Run all four typechecks locally.
   - Run `npm run lint:tags`.
   - Run root `tools/ci/check-support.ps1 -Only Docs`.

5. **CI Execution & Must-Fail Demonstration:**
   - Push deliberate type error commit -> capture failed `static` and skipped `sut-boot-gate`.
   - Push revert commit -> capture all-green CI run.
   - Open PR and await green CI.

---

## Decisions Summary for Owner Review

| ID | Title | Summary / Recommendation |
|---|---|---|
| **D-T15-1** | Concurrency Configuration | Use `group: ${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true` to cancel superseded runs on PRs and main. |
| **D-T15-2** | `static` Job Structure | Combine `npm ci`, `lint:tags`, grouped execution of the four typechecks, `test:unit`, and non-blocking audit into job `static`. |
| **D-T15-3** | Non-blocking Audit | Use GitHub Actions `continue-on-error: true` so high-severity findings warn without blocking CI. |
| **D-T15-4** | Retention of `verify` in SUT Gate | Keep `npm run verify` intact inside `sut-boot-gate` to preserve local/CI parity. |
| **D-T15-5** | Job Dependencies | Gate `sut-boot-gate` on `needs: static`; `deploy-pages` transitively gated via `needs: sut-boot-gate`. |
| **D-T15-6** | Architecture Unit Guard | Author `tests/unit/ci-workflow-integrity.test.ts` enforcing workflow structure and 40-character action pin discipline. |
| **D-T15-7** | Must-Fail Protocol | Push deliberate type mismatch commit, capture `static` failure and skipped SUT build, then push clean commit. |
