<!--
  AUDIENCE: Engineers/agents maintaining ParaBank's performance lane.
  PURPOSE:  Binding design note for the k6 performance-smoke lane, written from the
            owner-recorded decisions in the portfolio design doc.
  LOCATION: docs/perf-lane-design.md
  SOURCE:   portfolio-docs/PORTFOLIO_PERF_AND_DAST_LANES_DESIGN_2026-08-05.md §1 + §1.6 (Task 1),
            decisions D1.1a, D1.2a, D1.3b, D1.4b, D1.5b, D1.6a (recorded 2026-08-05).
-->

# ParaBank — k6 performance-smoke lane (design)

## Purpose and honest framing

A [k6](https://grafana.com/oss/k6/) **performance-smoke** lane over ParaBank's REST surface — a
threshold-gated load *smoke* on a locally-booted, deterministically-seeded SUT. **Not** a capacity or
benchmark test; every artefact says so. It reuses the existing SUT boot/reset
(`scripts/build-sut.ps1` → compose → `scripts/gate.ps1`; `POST /services/bank/initializeDB` resets seed).

## Recorded decisions (portfolio design doc §1.6)

| # | Decision | Choice |
|---|---|---|
| D1.1 | Gate | **Non-blocking / nightly** (schedule + `workflow_dispatch`), like bfx `@extended` |
| D1.2 | Scenarios | **Read-mostly primary + one reset-bracketed write** |
| D1.3 | Language | **TypeScript bundled with esbuild** (`@types/k6`) |
| D1.4 | Load profile | **Short ramping stages** (ramp-up → steady → ramp-down) |
| D1.5 | Evidence | **CI artifact + a published, labelled `/perf/` page** |
| D1.6 | Runner | **Dockerized `grafana/k6`** against the compose SUT |

## Structure

```
perf/
  src/parabank-load.ts   # the k6 test (TS): scenarios, thresholds, handleSummary
  build.mjs              # esbuild → perf/dist/parabank-load.js (k6-loadable ESM)
  tsconfig.json          # @types/k6, no DOM/Node libs
  report/                # committed latest published summary (index.html) → served at /perf/
scripts/run-perf.mjs     # Dockerized k6 run against the SUT; writes perf/report + perf/artifact
```

## Scenarios (D1.2a)

- **`read_mostly`** (ramping-VUs, D1.4b): login (`GET /login/john/demo` → customer 12212) once in
  `setup()`; each iteration `GET /customers/{id}/accounts` then `GET /accounts/{id}/transactions`.
  Idempotent → stable under load.
- **`write_transfer`** (small constant-VUs): `POST /transfer?fromAccountId&toAccountId&amount=1` between
  two seeded accounts. Bracketed by `initializeDB` in `setup()` (clean start) and `teardown()` (clean
  finish) so it never drifts the functional B1–B4 fixtures.

## Thresholds (steady-state aware, conservative)

`http_req_failed rate<0.01`; `http_req_duration{scenario:read_mostly} p(95)<1500ms`;
`checks{...} rate>0.99` per scenario. Because it runs nightly non-blocking (D1.1a), threshold noise
never blocks a PR — the values catch gross regressions and prove correctness under concurrency, not a
tight SLA.

## Evidence + publishing (D1.5b)

`handleSummary()` writes, with **no remote/CDN import** (self-contained, portfolio-consistent):
`perf-summary.json` (raw k6 metrics) and `perf-summary.html` (a self-contained, prominently-labelled
summary page). The nightly workflow (a) uploads both as a **CI artifact** (always the primary evidence)
and (b) commits the HTML + JSON to `perf/report/` on `main` **with `[skip ci]`** — durable in-repo, and
crucially it does **not** trigger a full functional run just to refresh a summary. `preparePagesEvidence`
copies `perf/report/` → `target/pages/perf/` when present and links it from the evidence index, so the
existing `ci.yml` Pages build **publishes `/perf/` on the next functional main-push deploy** (no second
Pages deployment, no Serenity-report clobbering). Trade-off (accepted): the committed report is always
current, but the *live* `/perf/` page refreshes on the next functional deploy — a small, documented lag
chosen over running the whole functional suite nightly. The commit is best-effort (`continue-on-error`)
so branch protection never fails the lane; the artifact remains the evidence in that case.

**Labelling (mandatory):** the page states "threshold-gated load **smoke** on a shared GitHub-hosted
runner — not a capacity/benchmark; numbers are runner-dependent", with the k6 image and run timestamp.

## CI (nightly, non-blocking — D1.1a)

`.github/workflows/perf.yml`: `schedule` (nightly) + `workflow_dispatch`. Boots the pinned SUT
(`build-sut.ps1` + compose + `gate.ps1`), `npm run perf:build`, `npm run perf:run` (Dockerized
`grafana/k6`, `--network host`, `PARABANK_BASE_URL=http://localhost:8090/parabank/services/bank`),
uploads the artifact, and commits `perf/report/` so `/perf/` refreshes. Never blocks a PR.

## Verification (first live runs — 2026-08-05)

The lane was proven end-to-end by dispatching `perf.yml` against the CI-booted SUT. Two defects that a
green run *hid* were caught by inspecting the summary **content**, not the check status, and fixed:

1. **Container write permissions** — `grafana/k6` runs non-root and could not write `handleSummary`
   output to the host-mounted `/work`, so `perf/report/` stayed empty and nothing was committed
   (a silent "no change"). Fixed by running the container as the host user (`--user uid:gid` on POSIX)
   with a fail-loud check if the summary is missing.
2. **Missing `Accept: application/json` → empty-iteration spin** — ParaBank's REST services default to
   XML, so `res.json()` threw in `setup()`, account discovery returned nothing, `readMostly` skipped its
   transactions read, and `writeTransfer` returned instantly — spinning ~8.5M empty iterations while all
   thresholds passed *vacuously* (a threshold over zero samples passes). The write scenario never ran yet
   the lane reported green. Fixed by sending the JSON `Accept` header on every request (mirroring the
   functional client, `src/api/client.ts`) and **hard-failing `setup()` when fewer than two accounts are
   discovered**, so a discovery regression fails the run **red** instead of silently no-opping.

Proven run (both scenarios genuinely exercised): checks `accounts 200`, `transactions 200`, and
`transfer 200` all present; iterations and `http_reqs` reconcile (no empty spin); `http_req_failed` 0,
checks rate 1.0, read-mostly p95 well within the 1500 ms threshold. **Lesson:** an `exec` function that
can early-`return` with neither an HTTP call nor a `sleep` will spin empty iterations and turn a broken
test green — always guard fixtures, avoid sleepless early-returns, and sanity-check iterations vs
`http_reqs` in the summary.

## Licence note

k6 is **AGPL-3.0**; that governs distributing k6 itself. **Using** k6 as a tool to load-test our own
SUT does not impose AGPL on these scripts — no conflict with the portfolio's licence posture.

## Determinism / risks

Load results vary run-to-run on hosted runners → non-blocking cadence absorbs it; the write scenario's
`initializeDB` brackets keep it isolated from the functional seed; `grafana/k6` is digest-pinned like
the SUT images; `perf/dist/` is gitignored (built), `perf/report/index.html` is committed (published).
