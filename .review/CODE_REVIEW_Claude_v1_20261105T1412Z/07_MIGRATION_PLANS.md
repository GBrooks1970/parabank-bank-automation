# Migration Strategy and Plans

[<- Back to Index](00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Annex - Test Strategy ->](ANNEX/TEST_STRATEGY.md)

**Reviewer:** AI assistant (Claude Opus 5.5)
**Date:** 2026-11-05T14:12Z
**Baseline:** `main` at `ccb74d5`

## Plan 1 - Single Source of Truth for Features

- **Current status:** feature behaviour lives in Gherkin for the main lanes and in Playwright test
  titles for the style folders; the operation contract lives in `OPERATION_CONTRACTS`; project
  status lives in `docs/backlog.md` but has drifted (R-02).
- **Step 1 (status):** make the backlog true again (v34) and import the approved TRIAGE items as
  scored risks so there is one list of open work, not two (backlog plus root worklist).
- **Step 2 (scenario names):** derive the main-lane expected scenario set from Gherkin (already
  done) and keep style-03's hand-written list as an intentional tripwire, but record that choice
  in DR-PB-12 so the asymmetry is explained.
- **Step 3 (cross-style parity):** add a small check that the style-02 and style-03 test titles
  are identical sets, since DR-PB-12 promises "the same tests".
- **Step 4 (SUT identity):** derive the compose image tag from the pinned commit, or assert their
  equality in `build-sut.ps1` (R-10).
- **Step 5 (docs guard):** a lightweight test or PR checklist item that fails when the backlog's
  current-version line marks as pending a PR already merged on `main`.
- **Exit criterion:** a cold-start agent reading only `docs/backlog.md` reaches the same open-item
  list as `git log`, the root worklist and the code.

## Plan 2 - Docker Compose for Local Development

- **Current status:** implemented. A single-service compose file
  ([docker-compose.yml](../../docker-compose.yml)) builds from a generated, digest-pinned
  Dockerfile; only port 8090 is exposed (DR-PB-04); `gate.ps1` provides readiness and seeding.
- **Step 1:** correct the "first boot self-seeds" comment (line 8) to the DR-PB-06 contract.
- **Step 2:** add the backlog's proposed healthcheck (MEDIUM next step 2) only if a second service
  is ever added; until then the host-side gate is sufficient (YAGNI).
- **Step 3:** bound the remaining gate probes with `-TimeoutSec` (R-10).
- **Step 4:** pin the local k6 default to the CI digest so `npm run perf` is reproducible off CI.
- **Step 5:** document resource needs (RAM) for running the SUT, Chromium and k6 together on a
  developer laptop; not stated in the README today.
- **Exit criterion:** `build-sut -> compose up -> gate -> verify -> compose down` is reproducible
  on a clean Windows and Linux host with every input pinned.

## Plan 3 - GitHub Actions/Workflow

- **Current status:** three workflows. `ci` (push to `main`, all PRs): SUT build, boot gate,
  `npm run verify`, both styles, Pages packaging and a separate least-privilege deploy job. `perf`
  (nightly, dispatch): k6 smoke and a bot commit to `main`. `pin-drift` (weekly, dispatch): strict
  pin validation and issue creation. All actions are full-SHA pinned. CI results were not
  re-fetched in this review.
- **Step 1 (fast feedback):** add a `static` job (install, four typechecks, unit, tag lint,
  non-blocking `npm audit --audit-level=high`) that the SUT job `needs` (R-10, R-04).
- **Step 2 (cancel superseded runs):** `concurrency: { group: ci-${{ github.ref }},
  cancel-in-progress: ${{ github.event_name == 'pull_request' }} }`.
- **Step 3 (perf least privilege):** split `perf` into a read-only test job with
  `persist-credentials: false` and a minimal publish job; write to a run-specific directory (R-03).
- **Step 4 (optional, removes bot commits):** have `deploy-pages` fetch the latest successful
  `perf-summary` artifact instead of reading committed files; then drop `contents: write`.
- **Step 5 (cost):** cache `~/.m2` (or a prebuilt SUT image promoted by digest) and the Playwright
  browser directory, as the backlog's MEDIUM next step 1 already proposes.
- **Exit criterion:** a type error fails a PR within about a minute; no job that runs third-party
  code holds a write token; `main` history contains only reviewed changes.

---

[<- Previous: Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) | [Back to Index](00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Annex - Test Strategy ->](ANNEX/TEST_STRATEGY.md)
