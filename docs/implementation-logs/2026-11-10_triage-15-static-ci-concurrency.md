<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-10_triage-15-static-ci-concurrency.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-15: add a fast static CI job and cancel superseded PR runs, 2026-11-10

## Session Summary

Resolved Claude v1 review findings R-04 and R-10 (score 4, LOW) by adding a fast static CI job and superseded PR run cancellation to `.github/workflows/ci.yml`:

1. **Top-Level Concurrency Group (D-T15-1):**
   - Configured `concurrency: group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true` at top level in `.github/workflows/ci.yml`.
   - Superseded PR runs cancel immediately when a new commit is pushed to the PR branch, saving runner minutes and eliminating race conditions.
   - Pushes to `main` cancel intermediate builds so runner capacity focuses on deploying the latest verified commit to GitHub Pages.

2. **Fast Static Checks Job (`static`, D-T15-2, D-T15-3):**
   - Configured job `static` with `name: Fast static checks`, `runs-on: ubuntu-latest`, and `permissions: contents: read`.
   - Runs `actions/checkout` and `actions/setup-node` pinned to reviewed 40-character commit SHAs.
   - Runs `npm ci` with npm cache restore.
   - Runs `npm run lint:tags` (<1s).
   - Runs all four TypeScript compilation targets (`typecheck`, `typecheck:style-02`, `typecheck:style-03`, `perf:typecheck`) (~8s).
   - Runs unit test suite `npm run test:unit` (108 tests, ~7-8s).
   - Runs non-blocking dependency audit `npm audit --audit-level=high --omit=optional` with `continue-on-error: true`. Surfaces high-severity security signals in the GitHub Actions UI without failing the job or blocking PR merges.

3. **Gated SUT Boot and Functional Verification (D-T15-4, D-T15-5):**
   - Configured `sut-boot-gate` with `needs: static`.
   - Containerized Maven SUT image build and Docker compose boot only occur after all compile, unit test, tag lint, and audit steps pass.
   - Preserves canonical `npm run verify` contract inside `sut-boot-gate`.
   - `deploy-pages` retains `needs: sut-boot-gate`, ensuring transitive gating on `static`.

4. **Architecture Unit Test Suite & Helper (`src/quality/ci-workflow-integrity.ts`, `tests/unit/ci-workflow-integrity.test.ts`, D-T15-6):**
   - Implemented `verifyCiWorkflow`, `extractActionPins`, `auditActionPins`, and `auditAllWorkflowPins`.
   - Unit test suite covers:
     1. `ci.yml` concurrency configuration and `cancel-in-progress: true`.
     2. `static` job presence and all required compile, test, tag, and audit steps.
     3. `sut-boot-gate` declaring `needs: static`.
     4. `deploy-pages` declaring `needs: sut-boot-gate`.
     5. Action pin architecture guard: statically audits all `.github/workflows/*.yml` files asserting every external action is pinned by a 40-character commit SHA with a human-readable `# vX.Y.Z` comment.
     6. Must-fail assertions rejecting missing concurrency, missing `needs: static`, blocking audit steps, and unpinned actions (`@v5`).
   - Expanded unit test inventory from 99 to 108 tests (18 test suites).

5. **Action Pin Policy Documentation (`docs/github-actions-pin-policy.md`):**
   - Documented the `static` early gating job and top-level concurrency in the reviewed pin policy.

Plan: [`../implementation-plans/2026-11-10_triage-15-static-ci-concurrency.md`](../implementation-plans/2026-11-10_triage-15-static-ci-concurrency.md)
(approved 2026-11-10 by owner, decisions D-T15-1 to D-T15-7 confirmed).

---

## Objectives

1. ✅ Add top-level `concurrency` with `cancel-in-progress: true` to `.github/workflows/ci.yml` (D-T15-1).
2. ✅ Add fast `static` job running pinned actions, `npm ci`, `lint:tags`, all 4 typechecks, `test:unit`, and non-blocking `npm audit` (D-T15-2, D-T15-3).
3. ✅ Configure `sut-boot-gate` with `needs: static` (D-T15-4, D-T15-5).
4. ✅ Author `src/quality/ci-workflow-integrity.ts` and `tests/unit/ci-workflow-integrity.test.ts` (D-T15-6).
5. ✅ Update `docs/github-actions-pin-policy.md`.
6. ✅ Quality gates: `npm run test:unit` passes 108/108, all four typechecks pass, `lint:tags` passes, root `check-support.ps1 -Only Docs` passes 9/9.
