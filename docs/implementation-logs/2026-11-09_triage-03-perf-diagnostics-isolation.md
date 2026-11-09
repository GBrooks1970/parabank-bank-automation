<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-09_triage-03-perf-diagnostics-isolation.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-03: isolate performance-run diagnostics from committed report snapshots, 2026-11-09

## Session Summary

Performance-smoke run diagnostics and artifacts have been decoupled from the git-tracked snapshot directory (`perf/report/`).
Previously, `perf.yml` uploaded `perf/report` with `if: always()`, meaning any early failure prior to k6 execution
masqueraded the previous run's committed metrics as current-run evidence. Additionally, on threshold failure (exit 99),
`run-perf.mjs` crashed without managing snapshots, leaving an inconsistent mixed snapshot state.

A clean, run-specific diagnostic output directory (`perf/run-output/`, git-ignored) now manages all execution artifacts.
Early in the workflow, `scripts/init-perf-run.ps1` initializes `perf/run-output/` with `run-metadata.json` (`status: in_progress`).
k6 mounts only `perf/run-output/`. If k6 breaches thresholds or errors, `recordPerfFailure` captures `failure-metadata.json`
alongside raw container outputs while leaving `perf/report/` completely untouched. Only when k6 exits 0 and provenance
checks strictly match is the snapshot promoted to `perf/report/` via `promotePerfSnapshot`.

Unit tests increased from 50 to 54, covering all run lifecycle states. Static gates passed cleanly. Plan:
[`../implementation-plans/2026-11-09_triage-03-perf-diagnostics-isolation.md`](../implementation-plans/2026-11-09_triage-03-perf-diagnostics-isolation.md)
(approved 2026-11-09 by owner, decisions D-T03-1 to D-T03-5 as recommended).

---

## Objectives

1. ✅ Gitignore isolation: added `/perf/run-output/` to `.gitignore` (D-T03-1).
2. ✅ Early initialization: added `scripts/init-perf-run.ps1` and early workflow step to create `run-metadata.json` (`in_progress`) before any failure-prone steps (D-T03-2).
3. ✅ Execution isolation: updated `scripts/run-perf.mjs` to mount `perf/run-output/` as `/work`, keeping `perf/report/` untouched during execution.
4. ✅ Threshold & container failure handling: `recordPerfFailure` captures structured failure metadata and k6 raw outputs; `perf/report/` remains unpolluted (D-T03-3).
5. ✅ Strict provenance gating: `promotePerfSnapshot` promotes `index.html` and `perf-summary.json` to `perf/report/` only upon verified provenance match on clean exit 0.
6. ✅ Workflow artifact target: updated `Upload perf summary artifact` in `perf.yml` to upload `path: perf/run-output`, retaining name `perf-summary` (D-T03-4).
7. ✅ Unit test coverage: added `tests/unit/perf-run-lifecycle.test.ts` (4 new tests; suite 50 -> 54).
8. ✅ TRIAGE-08 alignment: establishes the clean artifact contract for the upcoming workflow permissions split (D-T03-5).

---

## Evidence

### Lifecycle Paths Verified

| Path | Initial State | Failure Condition | Diagnostic Output (`perf/run-output`) | Snapshot (`perf/report`) |
|---|---|---|---|---|
| **1. Pre-k6 Early Abort** | Initialized by `init-perf-run.ps1` | Build or gate failure before k6 runs | Contains only `run-metadata.json` (`status: in_progress`); zero old metric files | **Untouched**; old committed files never attached to failed run artifact |
| **2. Threshold Breach / Error** | k6 mounted to `perf/run-output` | k6 exit 99 (threshold breach) or container error | Raw `perf-summary.json`, `perf-summary.html`, plus structured `failure-metadata.json` | **Untouched**; no partial or unpromoted files leak into git snapshot |
| **3. Clean Pass** | k6 mounted to `perf/run-output` | k6 exit 0, provenance matches `generatedAt` & `sourceRef` | Complete diagnostics + `run-metadata.json` (`status: success`) | **Promoted**; `index.html` and `perf-summary.json` promoted for git staging |

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript | `npm run typecheck` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-02` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-03` | exit 0 | exit 0 | ✅ PASS |
| Cucumber / tsx | `npm run lint:tags` | exit 0 | exit 0 | ✅ PASS |
| Node.js test runner | `npm run test:unit` | 50/50 | **54/54** (added `perf-run-lifecycle.test.ts`) | ✅ PASS |
| Architecture test | `destructive-call-sites.test.ts` | 50/50 | pass (retains `assertLocalSut` guard marker) | ✅ PASS |
| PowerShell | `scripts/init-perf-run.ps1` | n/a | exit 0 (creates `run-metadata.json`) | ✅ PASS |
| CI Gate | `ci.yml` (`sut-boot-gate`) | n/a | PR CI | ⏸️ CI |

---

## Changes Implemented

### `.gitignore`
- Added `/perf/run-output/`.

### `src/quality/perf-run-lifecycle.ts`
- Added `initPerfRunOutput`: wipes and prepares `perf/run-output` with initial `run-metadata.json`.
- Added `recordPerfFailure`: records `failure-metadata.json` without touching `perf/report`.
- Added `promotePerfSnapshot`: enforces provenance match and copies verified artifacts to `perf/report`.

### `scripts/init-perf-run.ps1`
- Cross-platform PowerShell script to initialize `perf/run-output` before pre-k6 steps.

### `scripts/run-perf.mjs`
- Mounts `perf/run-output` into k6 container as `/work`.
- Catches k6 failures and records failure metadata.
- Promotes verified snapshots only on success.

### `.github/workflows/perf.yml`
- Added `Initialize performance diagnostics` step right after checkout.
- Updated `Upload perf summary artifact` path to `perf/run-output`.

### `tests/unit/perf-run-lifecycle.test.ts`
- 4 unit tests covering initialization, clean directory wiping, failure recording, and provenance-gated snapshot promotion.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Dedicated `perf/run-output/` directory (D-T03-1) | Isolates execution output from tracked Git files. | Writing in-place to `perf/report/` or temporary system folders. |
| Early `run-metadata.json` initialization (D-T03-2) | Ensures that pre-k6 aborted runs upload an explicit artifact proving the run attempted and aborted, without uploading stale metrics. | Leaving directory empty. |
| Structured failure metadata (D-T03-3) | Enables rapid root-cause diagnosis of failed nightly runs from artifact inspection. | Raw k6 outputs only. |
| Retain `perf-summary` artifact name (D-T03-4) | Maintains compatibility with existing tooling while correcting the artifact payload. | Renaming artifact to `perf-diagnostics`. |
| Discrete TRIAGE-03 PR (D-T03-5) | Keeps PR scope focused; sets up clean interface for TRIAGE-08 workflow permissions split. | Bundling TRIAGE-03 and TRIAGE-08. |

---

## Documentation Updates

- `docs/implementation-plans/2026-11-09_triage-03-perf-diagnostics-isolation.md`: status set to `approved`.
- `docs/implementation-plans/_index.md`: row added and approved.
- `docs/implementation-logs/2026-11-09_triage-03-perf-diagnostics-isolation.md`: created with test evidence.
