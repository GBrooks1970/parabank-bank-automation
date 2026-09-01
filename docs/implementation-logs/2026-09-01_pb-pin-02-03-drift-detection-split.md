# PB-PIN-02 / PB-PIN-03 — Pin drift detection split from build enforcement — 2026-09-01

## Session Summary

Separated container image pin **drift detection** from **build enforcement** under the new
DR-PB-11, so an ordinary upstream rebuild of an exact tag can no longer take out the required
`ci` lane and the nightly `perf` lane. `build-sut.ps1` now consumes the reviewed immutable
`tag@sha256` references, reports **every** drifted pin as a warning, and continues; drift stays
fatal in the `-ValidateImagePinsOnly` review path and in a new scheduled `pin-drift` workflow
that raises or updates a tracking issue. PB-PIN-03 reconciled the pin policy's derived digest
table, which had been wrong since an earlier undocumented refresh. Recorded as risk PBR-06,
resolved in the same change.

---

## Objectives

1. ✅ Stop registry drift from blocking execution while keeping it impossible to ignore.
2. ✅ Report all drifted pins, not only the first.
3. ✅ Keep genuinely fatal conditions fatal: absent/malformed pins, and upstream `FROM`-tag mismatch.
4. ✅ Record the decision (DR-PB-11) and align the policy, contract, and design documents.
5. ✅ Reconcile `container-image-pin-policy.md` "Current reviewed pins" with the pin file.
6. ✅ Prove both the drifted and undrifted paths, and the complete five-command contract.

---

## Problem

PB-PIN-01 established the failure: `Assert-CurrentImagePin` hard-failed inside
`scripts/build-sut.ps1` when an exact tag no longer resolved to its reviewed digest. Docker
Official Images republish exact tags whenever their base is patched, so that condition arises
as routine maintenance — and it arose inside the one code path both lanes run.

Reproducibility never depended on the assertion. The build pulls `$Pin.Reference`, which is
`tag@sha256`, so a republished tag cannot change what is built. The check was a *maintenance
detector* wired as an *execution blocker*, and its failure mode was an outage:

- `perf` failed 14 consecutive nights, 2026-08-19 to 2026-09-01.
- `ci` was latently broken behind it, green only because it had not run since 2026-08-07.

A second, compounding defect: the check threw on the first mismatch, so a report named one
stale pin when both had drifted. That is how the Tomcat drift stayed invisible until PB-PIN-01
validated the pins directly.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Container policy | Strict mode, pins current | Pass | `IMAGE PIN VALIDATION PASS`, 2/2 resolve | ✅ PASS |
| Container policy | Strict mode, **both** pins stale | Threw naming only the first pin | Fails naming **both**: `2 of 2 reviewed pins need a deliberate refresh (MavenBuilder, ParaBankRuntime)` | ✅ PASS |
| Container policy | Drift report file | Did not exist | Markdown report written in both the clean and drifted cases | ✅ PASS |
| Container policy | GitHub annotations | None | `::warning` per drifted pin + step-summary section (verified via `GITHUB_ACTIONS`/`GITHUB_STEP_SUMMARY`) | ✅ PASS |
| Docker BuildKit | **Build with both pins stale** | Refused at the guard | Warned, then **built successfully** from the recorded digests (`maven@sha256:40157180…`, `tomcat@sha256:b419e157…`), exit 0 | ✅ PASS |
| Workflow | YAML parse, all three workflows | — | `ci`, `perf`, `pin-drift` all parse | ✅ PASS |
| Workflow | `gh` issue-dedupe filter | — | Filter accepted live; returns empty, so a first run creates rather than comments | ✅ PASS |
| Boot gate | `scripts/gate.ps1` | — | 4/4 verified | ✅ PASS |
| TypeScript | Framework unit lane | 25/25 | 25/25 | ✅ PASS |
| Cucumber | API lane | 14/14 scenarios; 49/49 steps | 14/14 scenarios; 49/49 steps | ✅ PASS |
| Cucumber/Serenity | UI lane | 8/8 scenarios; 49/49 steps | 8/8 scenarios; 49/49 steps | ✅ PASS |
| Project | Five-command contract | — | All five commands passed, with teardown | ✅ PASS |

The drifted-build test used the *previously reviewed, still-pullable* digests rather than a
fabricated one, so it proves the real property: the build consumes the recorded digest, not
whatever the tag currently points at. Java remains absent locally, so HTML report aggregation
is checked in CI as usual.

---

## Changes Implemented

### Drift detection (PB-PIN-02)

**Files changed:**
- `scripts/build-sut.ps1` — replaced `Assert-CurrentImagePin` with `Get-ImagePinDrift`, which
  returns a drift record instead of throwing, so every pin is checked. Added
  `Write-DriftReport` (Markdown, written in both outcomes) and `Write-DriftNotice`
  (`Write-Warning`, `::warning` annotation, step-summary entry). Added the optional
  `-DriftReportPath` parameter. Strict mode (`-ValidateImagePinsOnly`) throws once, naming
  every drifted pin; the build path warns and continues.
- `.github/workflows/pin-drift.yml` — **new.** Weekly (Monday ~06:00 UTC) and dispatch only,
  never on `pull_request`. Runs `-ValidateImagePinsOnly -DriftReportPath`, raises or updates a
  `Container image pin drift` issue from the report, uploads the report, and fails the job.
  `issues: write` is scoped to that job and exists solely to raise the issue.

Unchanged and still fatal in the build: an absent or malformed pin file/entry, and an upstream
Dockerfile `FROM` tag that disagrees with the reviewed runtime tag. Those mean the build would
consume an unreviewed input, which is a correctness failure rather than a maintenance signal.

### Policy reconciliation (PB-PIN-03)

**Files changed:**
- `docs/container-image-pin-policy.md` — corrected "Current reviewed pins" to the digests
  actually in `config/container-image-pins.psd1`, declared the table a derived record that must
  be updated in the same PR as any refresh, added the refresh history that explains the drift,
  rewrote "Enforcement" as "Enforcement, and where drift is detected", and narrowed the
  automation exclusion to *automation* now that scheduled *detection* is in scope.
- `docs/project-contract.md` — added the DR-PB-11 working norm and the same-PR table rule.
- `docs/decision-register.md` — added DR-PB-11.
- `docs/design-document.md` — v1.8; NFR-5 now distinguishes drift handling from enforcement.
- `docs/backlog.md` — v24; records the PB-PIN cycle, adds PBR-06 (resolved here), and
  reconciles a stale governance paragraph that still called PBR-03 actionable and PB-EVID-01
  the only active enhancement.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Warn in the build, fail in a dedicated lane. | Keeps the signal while removing the outage. The build is already reproducible via digests, so blocking bought nothing. | Keep the inline hard failure and accept a monthly red lane; drop drift detection entirely. |
| Check every pin before deciding. | A report that stops at the first mismatch understates the work and hides a second drift, exactly as happened here. | Preserve the fail-fast throw. |
| Weekly schedule, deduplicated onto one issue. | The tag moved at least twice in a fortnight, so weekly notices drift promptly; commenting on an open issue avoids a daily pile of duplicates. | Daily runs; a new issue per detection. |
| Detect on a schedule but never automate the refresh. | Provenance review, the full gate, and owner merge are the point of DR-PB-10; a bot must not shortcut them. | Auto-open a refresh PR with the new digest. |
| Use `gh` in a `run` step rather than adding an action. | Avoids introducing and reviewing another pinned third-party action for one API call. | `actions/github-script`. |
| Test drift with the previously reviewed digests. | They are real and pullable, so the test proves the build genuinely builds from the recorded digest. | A fabricated digest, which only proves the pull fails. |

DR-PB-11 refines DR-PB-10 rather than replacing it: reviewed digests, the deliberate refresh
procedure, and owner merge are unchanged.

---

## Documentation Updates

- `docs/container-image-pin-policy.md` — corrected pins table, refresh history, enforcement split.
- `docs/project-contract.md` — DR-PB-11 working norm.
- `docs/decision-register.md` — DR-PB-11.
- `docs/design-document.md` — v1.8, NFR-5 amendment.
- `docs/backlog.md` — v24, PBR-06, governance reconciliation.
- `docs/implementation-logs/2026-09-01_pb-pin-02-03-drift-detection-split.md` — this record.

---

## Lessons Learned

- Ask what a check *protects* before deciding what it should *block*. This one protected
  nothing the digest reference did not already guarantee, so its only effect was downtime.
- A fail-fast guard over a collection under-reports. Fail-fast is right for a pipeline stage
  and wrong for an inventory check.
- A lane allowed to be red is only a signal if someone reads it. `perf` was correctly
  non-blocking and correctly red for two weeks, and told nobody; routing detection to an issue
  is the part that was missing.
- Deriving a documentation table by hand from a source file guarantees eventual disagreement.
  The table is now explicitly marked derived, with a same-PR rule; generating it would be
  better still.

---

## Recommendations / Next Steps

- [ ] Merge and require PR plus post-merge `main` CI; then dispatch `pin-drift` once to prove the green path end to end — HIGH.
- [ ] PB-PIN-04: stamp generating commit/timestamp into the published `/perf/` evidence and guard its staleness — MEDIUM.
- [ ] PBR-02: bump `actions/upload-artifact` and `actions/setup-java` off their Node 20 runtimes — LOW.
- [ ] Consider generating the policy's pins table from `config/container-image-pins.psd1` so it cannot drift again — LOW.
- [ ] Retain PBR-01, PBR-04, PBR-05: the upstream source pin is unchanged, so their triggers have not fired — LOW.

---

*Session logged: 2026-09-01. Author: Claude Opus 5.*
