# PB-PIN-06 — Maven Builder Pin Refresh — 2026-10-07

## Session Summary

Resolved the Maven builder drift tracked by issue #47 and raised by the scheduled `pin-drift` lane (last scheduled failure: run
`37273885104`, 2026-10-05). The exact Maven tag, Maven version and `carlossg/docker-maven` source revision are unchanged; all six
Linux platform manifests were rebuilt over newer `eclipse-temurin:17-jdk-noble` bases. The reviewed multi-platform index digest is
refreshed in PR #49, merged as `25c83b8` on 2026-10-07. The ParaBank runtime pin is unchanged. PR CI, post-merge CI and a dispatched
`pin-drift` run all passed.

The implementation was done by a delegated agent from an approved plan
([`docs/implementation-plans/2026-10-07_pb-pin-06-maven-builder-refresh.md`](../implementation-plans/2026-10-07_pb-pin-06-maven-builder-refresh.md));
the owner merged. Figures from the local validation are the implementing agent's, as recorded in its hand-back and in the PR body of
#49. The pin diff, the PR contents, the CI runs and the post-merge pin validation were checked independently afterwards.

---

## Objectives

1. ✅ Confirm the `pin-drift` failure was the intended DR-PB-11 maintenance signal, not a product or test failure.
2. ✅ Review the old and current multi-platform Maven image provenance before accepting the candidate digest.
3. ✅ Refresh only the stale Maven builder pin and reconcile the same-PR policy record.
4. ✅ Prove the refreshed digest through strict validation, a real SUT build and the complete project contract.
5. ✅ Obtain PR CI, owner merge, post-merge CI and a dispatched `pin-drift` run, and close issue #47.
6. ⏸️ Nightly `perf` has not yet run against the new digest (it runs on schedule; not dispatched in this session).

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Container provenance | Strict pin validation, before the change | 1/2 current (MavenBuilder stale), exit 1 | n/a | ✅ failing case observed |
| Container provenance | Strict pin validation, after the change | n/a | 2/2 current, exit 0 | ✅ PASS |
| Container provenance | Strict pin validation on `main` at `25c83b8` (re-run after merge, 11 s) | n/a | 2/2 current, exit 0 | ✅ PASS |
| Docker/ParaBank | Digest-pinned SUT build (331 s) | Old Maven digest | New Maven digest packaged the WAR; `Dockerfile.pinned` loaded from `tomcat:10.1.57-jre21-temurin-noble@sha256:0d187897…` | ✅ PASS |
| ParaBank | Boot/seed gate (29 s) | 4 probes | 4/4 | ✅ PASS |
| TypeScript | Unit suite | 36 expected | 36/36 | ✅ PASS |
| API/UI | Smoke safety | 3 expected | 3/3 (2 API, 1 UI); seed state byte-identical | ✅ PASS |
| API | Cucumber profile | 14 expected | 14/14; FR-B1 operation coverage 14/14 | ✅ PASS |
| UI | Cucumber profile | 8 expected | 8/8 | ✅ PASS |
| Serenity | Report content | 8 expected UI scenarios | content check OK (HTML generation left to CI; no local Java) | ✅ PASS |
| Project contract | Five-command gate | not run before the refresh | 5/5; `compose up` 3 s, `verify` 99 s, `compose down` 3 s; no ParaBank container left | ✅ PASS |
| CI | PR run `37592342888` (on `45ff590`) | n/a | success | ✅ PASS |
| CI | Post-merge `ci` run `37593043391` (on `25c83b8`) | n/a | success | ✅ PASS |
| CI | Dispatched `pin-drift` run `37593996309` (on `25c83b8`, 19 s) | scheduled run `37273885104` failed | success | ✅ PASS |

`npm ci` was not needed because `node_modules` already existed. `npm run verify` modified no tracked files.

---

## Changes Implemented

### Refreshed the Maven builder digest

**Files changed:**
- `config/container-image-pins.psd1` — `MavenBuilder` `Digest` from `sha256:880934ae394bf91bc3e57d573e4fc04774f064f3c4df7ccd7cc10b3b126737bf`
  to `sha256:1a352420f7aba21f5ad08df31bab55f74c013fb491f1ae8ab1dd7ff9ed698584`; review-date comment set to 2026-10-07 (previously
  2026-09-14, 2026-09-01 and 2026-08-01). The tag and the `ParaBankRuntime` entry are unchanged.
- `docs/container-image-pin-policy.md` — "Current reviewed pins" row, provenance text and refresh history updated in the same PR, as the
  policy requires.

### Recorded the plan and adopted the convention in this project

**Files changed:**
- `docs/implementation-plans/2026-10-07_pb-pin-06-maven-builder-refresh.md` and `docs/implementation-plans/_index.md` — committed before the pin was touched.
- `docs/templates/implementation-plan.template.md` — copied from the portfolio root `templates/`, as the convention asks on first use.

### Provenance reviewed (old to new, all six Linux platforms)

Image version `3.9.16-eclipse-temurin-17-noble` and revision `1efa2614402e9645749d6e235c93ada60762b267` are identical old and new on every
platform. Only the `eclipse-temurin:17-jdk-noble` base digest and created date moved.

| Platform | Base digest old | Base digest new | Created old | Created new |
|---|---|---|---|---|
| linux/amd64 | `fb9701fe…` | `1975bbe4…` | 2026-09-09 | 2026-09-25 |
| linux/arm/v7 | `fafdb271…` | `5ccd948e…` | 2026-09-09 | 2026-09-25 |
| linux/arm64/v8 | `b5b311f0…` | `4f9dc6e3…` | 2026-09-09 | 2026-09-25 |
| linux/ppc64le | `d20b856e…` | `6b0cd1d9…` | 2026-09-09 | 2026-09-26 |
| linux/riscv64 | `e2e34e17…` | `f159d628…` | 2026-09-09 | 2026-10-01 |
| linux/s390x | `8583f518…` | `7b1ae506…` | 2026-08-21 | 2026-09-25 |

**Not reviewed:** the contents of the Temurin base image and its CVEs. Provenance (tag, version, source revision, base lineage) is what
the policy requires.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Pin the digest the tag resolved to on 2026-10-07 (`1a352420…`), not the candidate named in issue #47 (`42a3ac39…`) | The registry had moved on since 2026-09-21; the pin must be what was reviewed now. Re-resolved at the start, after validation and after the PR was opened; identical each time | Pin the issue's candidate; wait for the index to settle |
| Keep the exact tag; do not change Maven or Java versions | Policy: no floating family tags; version and revision were unchanged, so this is a rebuild-only refresh | Move to a newer Maven tag |
| Annotations-only provenance review | What the policy requires; stated plainly that base contents and CVEs were not reviewed | Review Temurin contents and CVEs (out of scope) |
| Plan committed before the pin | So the failing case (`-ValidateImagePinsOnly` exit 1 on the unmodified pin) was observed before the change | Commit everything together |

---

## Documentation Updates

- `docs/container-image-pin-policy.md` — current pins table, provenance and refresh history (in PR #49).
- `docs/implementation-plans/2026-10-07_pb-pin-06-maven-builder-refresh.md` — status set to implemented, `delivered` filled in and an Outcome section appended (this PR); the approved body is unchanged.
- `docs/implementation-plans/_index.md` — row updated to implemented (this PR).
- This log.

---

## Lessons Learned

- This refresh moved all six platforms, including `s390x` (2026-08-21 to 2026-09-25). PB-PIN-05 recorded five of six moving, with `s390x` the
  unchanged one. Do not assume the same platforms stay put between refreshes.
- Issue #47's candidate digest was already out of date by the time the refresh was planned, and the riscv64 manifest had been rebuilt as
  recently as 2026-10-01. Re-resolve the tag at implementation time and again just before opening the PR.
- The scheduled `pin-drift` lane had been failing since the drift appeared (latest scheduled run `37273885104`, 2026-10-05); the lane worked as
  designed and nothing in builds was affected, because builds consume the reviewed `tag@sha256`.
- Running the strict validation on the unmodified pin before committing the plan gave an observed failing case rather than an assumed one.
- Delegating the implementation from an approved, file-recorded plan worked; the hand-back was still re-verified (PR diff, CI runs, validation) before this log relied on it.

---

## Recommendations / Next Steps

- [ ] Watch the next scheduled `perf` run (nightly) and the next Monday `pin-drift` run; both should use the new digest and pass — owner / low.
- [ ] If the owner wants Temurin base contents or CVEs reviewed, that is a separate item; the policy does not require it — owner / optional.

---

*Session logged: 2026-10-07. Author: Claude (Sonnet 5.5), with a delegated implementing agent; owner: Gary Brooks.*
