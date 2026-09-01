# PB-PIN-04 — Provenance and freshness for the published /perf/ evidence — 2026-09-01

## Session Summary

Gave the published performance-smoke page its own provenance and a freshness guard. The k6
summary now records when it was measured, from which commit, and by which workflow run; the
page leads with that, and `run-perf.mjs` fails if the provenance does not come back in the
written summary. `preparePagesEvidence` withholds an unprovenanced, future-dated, or
over-age summary and warns, deliberately **without** failing the functional deploy. Unit
coverage rose 25 → 36, including the exact PB-PIN-01 case.

---

## Objectives

1. ✅ Record measurement instant, source commit, and run URL in the summary and on the page.
2. ✅ Fail the perf run if that provenance is missing rather than publishing undated numbers.
3. ✅ Stop stale evidence being published as current.
4. ✅ Do so without coupling the required `ci` lane to a non-blocking lane's health.
5. ✅ Cover the decision with deterministic unit tests, including the real incident's shape.

---

## Problem

The `/perf/` page carried no date. Its numbers are produced by the nightly lane, committed to
`main`, and published on a *later* functional deploy, so the page routinely outlives the run
behind it. While the perf lane was broken (PB-PIN-01, 14 nights), the site kept showing
2026-08-18 figures with nothing to say when they were measured or that the lane had stopped.

Two aggravating details:

- Nothing in `prepare:pages` or `check:pages` looked at perf freshness at all.
- `docs/perf-lane-design.md` already claimed the page showed "the k6 image and run timestamp".
  It showed the image only. The document asserted a property the implementation never had.

File mtimes could not have helped even if consulted: the report is a committed artefact, and a
fresh checkout resets timestamps. Provenance had to be *in* the content.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript | `perf-evidence` unit tests | did not exist | 8/8 — complete record, malformed/ill-typed rejection, fresh, absent, unprovenanced, over-age, boundary, clock skew and future-dated | ✅ PASS |
| TypeScript | `pages-evidence` staging decision | no perf coverage | 3 new: fresh staged and linked; stale withheld **while the deploy still succeeds**; unprovenanced withheld | ✅ PASS |
| TypeScript | Full unit lane | 25/25 | **36/36** | ✅ PASS |
| TypeScript | `tsc --noEmit` | clean | clean | ✅ PASS |
| k6 (live) | End-to-end provenance | absent | `provenance` written with `generatedAt` `2026-09-01T20:47:13.103Z`, `sourceRef` `dce3d331…`, `k6Image`; page renders "Measured … from commit dce3d33" | ✅ PASS |
| k6 (live) | Post-run provenance assertion | did not exist | `perf: wrote … (2026-09-01T20:47:13.103Z, dce3d33)` | ✅ PASS |
| Project | Five-command contract | — | All five green with teardown | ✅ PASS |

The live run confirmed `runUrl` is correctly omitted outside GitHub Actions, and the locally
regenerated `perf/report/` was restored rather than committed: those numbers come from a
Windows dev box and the nightly lane owns that file.

---

## Changes Implemented

### Provenance at the point of measurement

**Files changed:**
- `perf/src/parabank-load.ts` — reads `PERF_GENERATED_AT`, `PERF_SOURCE_REF`, `PERF_RUN_URL`;
  writes a `provenance` object into `perf-summary.json`; renders a lead paragraph naming the
  measurement instant, short commit, and run link, and stating the figures are a snapshot
  rather than a live measurement.
- `scripts/run-perf.mjs` — derives the three values (`GITHUB_SHA` else `git rev-parse HEAD`;
  run URL only under Actions), passes them to the container, refuses to start without a
  resolvable commit, and **re-reads the written summary to assert the provenance landed**.

### Freshness as a publication decision

**Files changed:**
- `src/quality/perf-evidence.ts` — **new.** Pure `readPerfProvenance` and `assessPerfEvidence`
  with an injected clock. `PERF_MAX_AGE_DAYS = 14`; ten minutes of clock skew tolerated, a
  genuinely future-dated summary refused.
- `src/quality/pages-evidence.ts` — the staging decision now consults that assessment instead
  of `existsSync`. When not publishable it logs the reason, emits a `::warning` under Actions,
  and omits `/perf/` — reusing the graceful absence path that already existed for "before the
  first nightly run". The functional deploy is untouched.
- `tests/unit/perf-evidence.test.ts` — **new**, 8 tests.
- `tests/unit/pages-evidence.test.ts` — 3 staging-decision tests and a `writePerfReport` helper.

### Documentation

- `docs/perf-lane-design.md` — new "Provenance + freshness" section; the labelling requirement
  now names the measurement instant and commit, and the stale claim about a "run timestamp" is
  corrected in place.
- `docs/backlog.md` — v25; PB-PIN-04 closed, PBR-02 named as the last open cycle item.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Withhold stale perf; never fail the deploy on it. | Coupling the required lane to a deliberately non-blocking lane is the mistake DR-PB-11 removed. Omitting the link is honest and self-heals on the next nightly run. | Fail `check:pages` on stale perf; publish it anyway with a warning banner. |
| Provenance in the summary content, not file metadata. | The report is committed and re-checked-out, so mtimes are meaningless. | `statSync().mtime`; the git log of `perf/report/`. |
| Inject the clock into the assessment. | Makes every freshness branch deterministic; the over-age test asserts the real incident's "14.7 days old" outcome. | Read `Date.now()` inside the predicate and test around it. |
| 14 days for a nightly lane. | Long enough to absorb a quiet weekend or a one-off failure, short enough that a fortnight-long outage cannot pass as current. | 2 days (noisy); 30 days (would not have caught PB-PIN-01). |
| Assert provenance after the run rather than trusting the container. | The env-to-container-to-summary path is exactly where this can silently break, and a silent break restores the original defect. | Trust `-e` propagation. |
| Restore `perf/report/` rather than commit the local run. | Locally measured numbers from a dev box are not the published evidence; the nightly lane owns that file. | Commit the local summary to demonstrate the new page. |

No new decision record: DR-PB-11 already governs the "withhold, do not block" principle, and
D1.5b already governs how `/perf/` is published.

---

## Lessons Learned

- Published evidence needs to carry its own date, because it will be read out of the context
  that produced it. A page that cannot say when it was measured cannot be checked for staleness
  by anyone.
- A document claiming a property does not make it true. `perf-lane-design.md` promised a run
  timestamp for weeks; nothing compared the promise with the artefact.
- The right failure mode for stale evidence is *withhold*, not *fail*. Reaching for the gate
  would have rebuilt, on the publication path, the coupling just removed from the build path.
- The most fragile link was the env-to-container hop, so that is where the assertion went.

---

## Recommendations / Next Steps

- [ ] Merge, then dispatch `perf` so a provenanced summary exists and `/perf/` republishes — HIGH.
- [ ] PBR-02: bump `actions/upload-artifact` and `actions/setup-java` off Node 20 — LOW.
- [ ] Dispatch `pin-drift` once to prove its green path; it has never executed — LOW.
- [ ] Investigate the intermittent `@smoke` UI failure at `ui.steps.ts:52` seen during PB-PIN-02 — LOW.
- [ ] Retain PBR-01, PBR-04, PBR-05: the upstream source pin is unchanged — LOW.

---

*Session logged: 2026-09-01. Author: Claude Opus 5.*
