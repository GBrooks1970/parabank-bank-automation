<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-09_triage-08-perf-token-split.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-08: split the perf workflow so no job running third-party code holds a write token, 2026-11-09

## Session Summary

The performance-smoke workflow (`.github/workflows/perf.yml`) has been split into two discrete jobs according to least-privilege security principles (Claude v1 review R-03, MEDIUM 13):
1. Top-level workflow permissions drop `contents: write` in favor of an explicit `permissions: contents: read` default (D-T08-1).
2. `perf-smoke` job runs under `permissions: contents: read` with `actions/checkout` `persist-credentials: false`. All failure-prone and third-party execution steps (SUT boot, readiness gate, `npm ci`, esbuild, Dockerized k6) execute in an environment with zero repository write access. Verified diagnostics outputs are uploaded as artifact `perf-summary`.
3. `publish` job runs separately (`needs: perf-smoke`, `if: success() && github.ref == 'refs/heads/main'`), granted `permissions: contents: write`. It checks out `main`, downloads the `perf-summary` artifact using pinned `actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2` (Node 24 native), promotes snapshots via a zero-dependency pure Node ESM script `scripts/promote-perf-snapshot.mjs`, and commits to `main` with `[skip ci]`.
4. Zero third-party code or npm lifecycle install scripts run inside the environment holding the repository write token.

Unit tests increased from 54 to 61 (7 new tests covering snapshot promotion and CLI execution). All static typechecks, tag linting, and portfolio support checks passed cleanly.

Plan: [`../implementation-plans/2026-11-09_triage-08-perf-token-split.md`](../implementation-plans/2026-11-09_triage-08-perf-token-split.md)
(approved 2026-11-09 by owner, decisions D-T08-1 to D-T08-5 confirmed).

---

## Objectives

1. ✅ Top-level permissions: replaced `permissions: contents: write` with `permissions: contents: read` (D-T08-1).
2. ✅ `perf-smoke` isolation: explicit `permissions: contents: read` and `persist-credentials: false` on checkout.
3. ✅ Execution environment hardening: `npm ci`, build, and k6 run with zero write privileges and no persisted credentials.
4. ✅ Separate `publish` job: `needs: perf-smoke`, `if: success() && github.ref == 'refs/heads/main'`, `permissions: contents: write`.
5. ✅ Zero-dependency promotion script: created `scripts/promote-perf-snapshot.mjs` using only standard library `node:fs` and `node:path` (D-T08-2).
6. ✅ Action pinning: pinned `actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2` and documented in `docs/github-actions-pin-policy.md` (D-T08-3).
7. ✅ Branch protection tolerance: retained `continue-on-error: true` on the push step (D-T08-4).
8. ✅ Unit test coverage: added `tests/unit/promote-perf-snapshot.test.ts` (7 new unit tests; suite expanded 54 -> 61).
9. ✅ Two-PR cadence: discrete implementation PR followed by outcome PR and root tick (D-T08-5).

---

## Evidence

### Workflow Architecture Comparison

| Dimension | Before (TRIAGE-03) | After (TRIAGE-08) |
|---|---|---|
| **Workflow Permissions** | `permissions: contents: write` | `permissions: contents: read` |
| **`perf-smoke` Token** | Write token active during `npm ci` & k6 | Read-only (`contents: read`), `persist-credentials: false` |
| **Publish Step Placement** | Trailing step inside the `perf-smoke` job | Dedicated `publish` job (`needs: perf-smoke`, `main` only) |
| **Third-Party Code Under Write Token** | `npm ci`, esbuild, k6, dependencies | **Zero**; only pure Node script `scripts/promote-perf-snapshot.mjs` |
| **Action Pinning** | `actions/upload-artifact@043fb46d... # v7.0.1` | Added `actions/download-artifact@9000827c... # v8.0.2` |

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript | `npm run typecheck` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-02` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-03` | exit 0 | exit 0 | ✅ PASS |
| Cucumber / tsx | `npm run lint:tags` | exit 0 | exit 0 | ✅ PASS |
| Node.js test runner | `npm run test:unit` | 54/54 | **61/61** (added `promote-perf-snapshot.test.ts`) | ✅ PASS |
| Architecture test | `destructive-call-sites.test.ts` | pass | pass | ✅ PASS |
| Node CLI probe | `node scripts/promote-perf-snapshot.mjs` | n/a | exit 0 on valid inputs; exit 1 on invalid | ✅ PASS |
| CI Gate | `ci.yml` (`sut-boot-gate`) | n/a | PR CI | ⏸️ CI |

---

## Changes Implemented

### `.github/workflows/perf.yml`
- Replaced top-level `permissions: contents: write` with `permissions: contents: read`.
- Added `permissions: contents: read` and `persist-credentials: false` to `perf-smoke`.
- Removed commit/push step from `perf-smoke`.
- Added `publish` job with `permissions: contents: write`, `needs: perf-smoke`, `if: success() && github.ref == 'refs/heads/main'`.
- Added `actions/download-artifact` step downloading `perf-summary` into `downloaded-perf-summary`.
- Added `node scripts/promote-perf-snapshot.mjs downloaded-perf-summary perf/report`.
- Added commit/push step under `publish`.

### `scripts/promote-perf-snapshot.mjs`
- Pure Node ESM script (zero third-party dependencies) that validates provenance (`generatedAt`, `sourceRef`) and copies summary files into `perf/report`.

### `tests/unit/promote-perf-snapshot.test.ts`
- 7 unit tests covering provenance validation, fallback handling, missing files, malformed JSON, and CLI exit codes.

### `docs/github-actions-pin-policy.md`
- Added `actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2` review entry.
- Updated explanatory text regarding the `perf.yml` token split.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Explicit `contents: read` default (D-T08-1) | Declares least-privilege baseline across all workflow jobs. | Leaving default permissions empty (`{}`). |
| Pure Node ESM script for promotion (D-T08-2) | Eliminates any need to run `npm ci` or execute third-party devDependencies while holding a write token. | PowerShell script; running `npm ci` in `publish`. |
| `actions/download-artifact@v8.0.2` pin (D-T08-3) | Vetted release (`9000827c...`), verified `runs.using: node24`, >1 month old, compatible with v7 upload-artifact. | Pinning older v7.0.0 or v4. |
| Retain `continue-on-error: true` (D-T08-4) | Tolerates branch protection rules without crashing the workflow or discarding artifact evidence. | Hard failure on push rejection. |
| Discrete TRIAGE-08 PR (D-T08-5) | Keeps PR reviewable and follows project two-PR delivery pattern. | Bundled PR. |

---

## Documentation Updates

- `docs/implementation-plans/2026-11-09_triage-08-perf-token-split.md`: created and approved (owner).
- `docs/implementation-plans/_index.md`: row added and set to approved.
- `docs/github-actions-pin-policy.md`: updated with `actions/download-artifact` pin.
- `docs/implementation-logs/2026-11-09_triage-08-perf-token-split.md`: created with test evidence.
