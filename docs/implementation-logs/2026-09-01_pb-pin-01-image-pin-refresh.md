# PB-PIN-01 — Container image pin refresh — 2026-09-01

## Session Summary

Refreshed both reviewed container image pins after upstream republished their exact tags,
which had failed every nightly `perf` run since 2026-08-19 and would have failed the next
`ci` run identically. Provenance review found no upstream Maven or Tomcat change: both
multi-platform indexes still report the previously reviewed source revisions and versions,
and only their `eclipse-temurin`/noble bases were rebuilt. Only
`config/container-image-pins.psd1` changed. Pin validation, a real image build, and the
complete five-command project contract passed locally with teardown; closure depends on
the implementation PR and post-merge default-branch CI.

---

## Objectives

1. ✅ Establish why both required lanes were failing and whether it was a defect or drift.
2. ✅ Review the provenance of the current registry indexes before accepting them.
3. ✅ Refresh both reviewed digests through the documented procedure, changing nothing else.
4. ✅ Prove the refreshed pins build the SUT and pass the complete project contract.
5. ✅ Record the old/new tags, digests, provenance, and validation as an immutable log.

---

## Problem

`scripts/build-sut.ps1` resolves each exact tag through Docker Buildx and fails the build
when the registry's current multi-platform index digest differs from the reviewed value in
`config/container-image-pins.psd1` (DR-PB-10, PB-CODEX-06). Both recorded digests had gone
stale, so the guard fired as designed.

| Lane | Effect |
|---|---|
| `perf` (nightly, non-blocking) | Failed 14 consecutive scheduled runs, 2026-08-19 to 2026-09-01, at the `Build SUT image` step. Last green: [run 32095834631](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/32095834631), 2026-08-18. |
| `ci` (push/PR, required) | Not yet observed failing only because it last ran on 2026-08-07, before the tags moved. It runs the same `./scripts/build-sut.ps1` step, so the next push or PR to `main` would have failed identically. |

The failure was never in the k6 performance lane; it occurred before the k6 bundle was
built. The 2026-08-19 run already names `MavenBuilder` as the stale pin, so the drift
predates the current index build date recorded below — the tag was republished more than
once in this window.

---

## Provenance review

Resolved 2026-09-01 with `docker buildx imagetools inspect <tag>`, recording the top-level
index digest, not a platform child manifest.

| Purpose | Exact tag | Previous reviewed digest | Refreshed digest |
|---|---|---|---|
| Maven builder | `maven:3.9.16-eclipse-temurin-17-noble` | `sha256:4015718012bbf1113ec6cfae2b950be328d90265ceb60f92b26c3ea7c4d14ee8` | `sha256:a8746f15d5bb26b5b8bacb056cc76211553850f4c71d16aff845cfa004cbc197` |
| ParaBank runtime | `tomcat:10.1.57-jre21-temurin-noble` | `sha256:b419e1574000f3337644c29b57d868e90ad26ffcfcfbb437f30c8696e8935a70` | `sha256:0d187897e49c9ef3f642f52d19db7f4eab20657f4ab086e680481e10eb69d3fa` |

Both refreshes are **base-image rebuilds, not upstream content changes**. The index
annotations still report the same source revisions and versions reviewed when these pins
were first adopted:

| Purpose | `image.version` | `image.revision` | `image.base.name` | Index built |
|---|---|---|---|---|
| Maven builder | `3.9.16-eclipse-temurin-17-noble` | `1efa2614402e9645749d6e235c93ada60762b267` (`carlossg/docker-maven`) | `eclipse-temurin:17-jdk-noble` | 2026-08-21 |
| ParaBank runtime | `10.1.57-jre21-temurin-noble` | `1609469c3fc33e26ee9b86820047588fb687220c` (`docker-library/tomcat`) | `eclipse-temurin:21-jre-noble` | 2026-08-18 |

Runtime-tag coherence (policy step 3) was re-verified: the pinned upstream checkout is at
`d1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1` and its `Dockerfile` declares
`FROM tomcat:10.1.57-jre21-temurin-noble`, exactly the recorded runtime tag. The upstream
source pin (DR-PB-02) was not touched, so PBR-01, PBR-04, and PBR-05 keep their recorded
triggers and remain open.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Container policy | `-ValidateImagePinsOnly` | Both pins stale; build refused | 2/2 exact tags resolve to reviewed digests | ✅ PASS |
| Docker BuildKit | SUT image build (cold pull) | Refused at the stale-pin guard | Built `parabank:d1bf006`; both complete `tag@sha256` references used | ✅ PASS |
| Docker BuildKit | Generated `Dockerfile.pinned` | — | `FROM tomcat:10.1.57-jre21-temurin-noble@sha256:0d187897…d3fa` | ✅ PASS |
| Boot gate | `scripts/gate.ps1` | — | 4/4: `initializeDB` 204, REST login (customer 12212), OpenAPI 3.0.1, SOAP WSDL | ✅ PASS |
| TypeScript | Framework unit lane | — | 25/25 tests, 0 skipped | ✅ PASS |
| Cucumber | Smoke safety | — | 2 scenarios / 6 steps; 1 scenario / 4 steps | ✅ PASS |
| Cucumber | API lane | 14/14 scenarios; 49/49 steps | 14/14 scenarios; 49/49 steps | ✅ PASS |
| Cucumber/Serenity | UI lane | 8/8 scenarios; 49/49 steps | 8/8 scenarios; 49/49 steps | ✅ PASS |
| Serenity | Report content | — | 8/8 UI scenarios present in JSON evidence | ✅ PASS |
| Project | Five-command contract | Refused at command 1 | All five commands passed, with teardown | ✅ PASS |

Java was not available locally, so `report` skipped Serenity HTML aggregation and
`check:report` validated the JSON evidence — the same local condition recorded under
PB-CODEX-06. PR CI installs Java and remains the required HTML enforcement point.

---

## Changes Implemented

**Files changed:**
- `config/container-image-pins.psd1` — refreshed both reviewed digests; retained both exact
  readable tags unchanged; updated the review-date comments to 2026-09-01 and recorded the
  unchanged upstream revisions and base images that make this a rebuild-only refresh.

No script, workflow, Compose, or test change was required or made. `scripts/build-sut.ps1`
already validates the refreshed values, and the generated `Dockerfile.pinned` stays under
ignored `target-app/`.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Accept the republished indexes rather than moving to newer Maven/Tomcat versions. | The exact versions and upstream source revisions are unchanged; only patched bases differ. Changing version at the same time would confuse a routine refresh with a deliberate upgrade. | Bump to a newer Maven or Tomcat line in the same change. |
| Refresh both pins in one change. | Both drifted in the same window and the build asserts them together, so a Maven-only refresh would have failed at the runtime pin on the next run. | Refresh only the pin named in the failure message. |
| Restrict this change to `config/container-image-pins.psd1`. | Policy step 4 requires exactly this; it keeps the urgent unblocking change reviewable and separable from the design and documentation work that follows. | Bundle the drift-handling redesign or the policy-document reconciliation here. |
| Leave the stale-pin guard fatal for now. | Changing when the guard fires is a design decision with an open owner question; it must not ride along in an unblocking fix. | Soften or bypass the guard to get the lanes green. |

No new ADR was required: DR-PB-10 already governs immutable execution inputs and their
deliberate refresh procedure, and this change follows it without amending it.

---

## Documentation Updates

- `docs/implementation-logs/2026-09-01_pb-pin-01-image-pin-refresh.md` — this immutable record.

`docs/container-image-pin-policy.md` still shows the digests reviewed at PB-CODEX-06
(`sha256:1ed5d1f5…` and `sha256:f6e69a64…`), which already disagreed with
`config/container-image-pins.psd1` before this change: an earlier refresh updated the pin
file without updating that table. Correcting it is a separate reconciliation item so this
PR stays a minimal, reviewable pin refresh.

---

## Lessons Learned

- Exact-version Docker Official Image tags are still republished when their base is
  patched, so a tag/digest coherence assertion is a recurring event, not an exceptional one.
- The failure message names only the first stale pin, so a stale-pin report is a lower
  bound: validate every pin before assuming the scope of a drift.
- A drift assertion placed inside the build path converts an expected upstream rebuild into
  an outage of every lane that builds, including the required one. Reproducibility itself
  never depended on it — the build already pulls by `tag@sha256`.
- A nightly non-blocking lane failing for two weeks was the only signal that the required
  lane was also broken; a lane that is allowed to be red is only useful if someone reads it.

---

## Recommendations / Next Steps

- [ ] Merge this PR and require its PR plus post-merge `main` CI to pass, then dispatch `perf` to confirm the nightly lane is restored — HIGH.
- [ ] Decide how drift detection should be separated from build execution so a routine upstream rebuild cannot red both lanes; record the accepted risk if it is not — MEDIUM.
- [ ] Reconcile `docs/container-image-pin-policy.md` "Current reviewed pins" against `config/container-image-pins.psd1` — MEDIUM.
- [ ] Add generating-commit and timestamp provenance plus a staleness guard to the published `/perf/` evidence, which has shown 2026-08-18 numbers undated since the lane broke — MEDIUM.
- [ ] Revisit PBR-02 now the runner force-runs `actions/upload-artifact@v4.6.2` on Node 24 — LOW.
- [ ] Retain PBR-01, PBR-04, and PBR-05: the upstream source pin was not bumped, so their triggers have not fired — LOW.

---

*Session logged: 2026-09-01. Author: Claude Opus 5.*
