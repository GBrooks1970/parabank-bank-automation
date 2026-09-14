# PB-PIN-05 — Maven Builder Pin Refresh — 2026-09-14

## Session Summary

Resolved the Maven builder drift detected by scheduled `pin-drift` run `34814232263` and tracked
by issue #45. The exact Maven tag, Maven source revision, Maven version and Java version are
unchanged; five of its six Linux platform manifests were rebuilt over newer Temurin bases. The
reviewed multi-platform index digest is refreshed, the ParaBank runtime pin is unchanged, and the
complete local project contract is green with teardown; PR and post-merge evidence remain pending.

---

## Objectives

1. ✅ Confirm the scheduled failure was an intentional DR-PB-11 maintenance signal rather than a product or test failure.
2. ✅ Review the old and current multi-platform Maven image provenance before accepting the candidate digest.
3. ✅ Refresh only the stale Maven builder pin and reconcile the same-PR policy record.
4. ✅ Prove the refreshed digest through strict validation, a real SUT build and the complete project contract.
5. ⏸️ Obtain PR CI, owner merge, post-merge CI, dispatched `pin-drift`/`perf` evidence and close issue #45.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Container provenance | Strict pin validation | 1/2 current in run `34814232263` | 2/2 current | ✅ PASS |
| Docker/ParaBank | Digest-pinned SUT build | Old Maven digest built with a drift warning in perf run `34803094444` | New Maven digest packaged the WAR; generated image used the reviewed Tomcat digest | ✅ PASS |
| ParaBank | Boot/seed gate | 4 required probes | 4/4 probes | ✅ PASS |
| TypeScript | Unit suite | 36 expected | 36/36 tests | ✅ PASS |
| API/UI | Smoke safety | 3 expected scenarios | 3/3 scenarios; 10/10 steps; seed state byte-identical | ✅ PASS |
| API | Cucumber profile | 14 expected | 14/14 scenarios; 49/49 steps; 14/14 operation coverage | ✅ PASS |
| UI | Cucumber profile | 8 expected | 8/8 scenarios; 49/49 steps | ✅ PASS |
| Serenity | Report content | 8 expected UI scenarios | 8/8 present in JSON evidence | ✅ PASS |
| Project contract | Five-command gate | Not run in this session before the refresh | 5/5 commands; teardown complete; 321.72 seconds | ✅ PASS |

`npm ci` installed 217 packages and audited 218 in 91.39 seconds. It reported one HIGH advisory
affecting dev-only `fast-uri@3.1.5`, reached through root `ajv@8.20.0`; `npm audit --json` names
GHSA-5jgf-p345-68v8, GHSA-f65p-4m7j-42xc, GHSA-fph4-wmhf-6fwf and
GHSA-jqff-g426-hqxp. That dependency finding predates and is independent of this image-pin edit,
has a fix available, and is retained for separate backlog triage. Java was unavailable locally,
so Serenity HTML generation was skipped as designed; CI installs Java and enforces the HTML gate.

---

## Changes Implemented

### Refreshed the reviewed Maven multi-platform index

**Files changed:**
- `config/container-image-pins.psd1` — changed only the Maven builder digest from
  `sha256:a8746f15d5bb26b5b8bacb056cc76211553850f4c71d16aff845cfa004cbc197` to
  `sha256:880934ae394bf91bc3e57d573e4fc04774f064f3c4df7ccd7cc10b3b126737bf`
  and advanced its review date to 2026-09-14.

The exact `maven:3.9.16-eclipse-temurin-17-noble` tag is retained. All six Linux platform
descriptors report `carlossg/docker-maven` revision
`1efa2614402e9645749d6e235c93ada60762b267`, Maven image version
`3.9.16-eclipse-temurin-17-noble` and the `eclipse-temurin:17-jdk-noble` base name. The
`linux/amd64`, `linux/arm/v7`, `linux/arm64/v8`, `linux/ppc64le` and `linux/riscv64` manifests
were rebuilt on 2026-09-09 with new base digests; `linux/s390x` is unchanged.

### Reconciled the governed pin record and backlog

**Files changed:**
- `docs/container-image-pin-policy.md` — updated the derived current-pins table in the same PR,
  recorded the per-platform provenance finding and extended the refresh history.
- `docs/backlog.md` — opened PB-PIN-05 at version 30 with the detection, provenance, local gate
  and remaining closure evidence stated explicitly.
- `docs/implementation-logs/2026-09-14_pb-pin-05-maven-builder-refresh.md` — added this immutable
  development record.

No SUT source pin, ParaBank runtime digest, application dependency, workflow or drift-handling
policy changed.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Accept the republished index for the existing exact Maven tag. | Image metadata shows the same Maven source revision, Maven version, Java version and base-image family; the change is a base rebuild rather than a Maven upgrade. | Combine routine pin maintenance with a Maven-version change. |
| Refresh only `MavenBuilder`. | Strict validation and the scheduled report both show `ParaBankRuntime` remains current. | Rewrite both digests merely to mirror PB-PIN-01. |
| Retain DR-PB-11 unchanged. | The latest perf run warned, continued from the immutable reviewed digest and passed, while the dedicated detector raised issue #45 and failed visibly. The separation worked exactly as designed. | Weaken or rerun away the red detector; make registry drift block functional builds again. |
| Keep the `fast-uri` advisory out of this pin refresh. | It is a separately scoped dependency risk and changing the lockfile here would obscure the provenance-only image update. | Run `npm audit fix` and bundle an unrelated dependency change. |

No new decision record was required; this refresh applies DR-PB-10 and DR-PB-11 without changing
their structure or policy.

---

## Documentation Updates

- `docs/container-image-pin-policy.md` — refreshed the Maven digest, review date, provenance and history.
- `docs/backlog.md` — added PB-PIN-05 implementation and evidence status at version 30.
- `docs/implementation-logs/2026-09-14_pb-pin-05-maven-builder-refresh.md` — recorded this work.

---

## Lessons Learned

- The dedicated DR-PB-11 detector now has production evidence for both outcomes: an earlier green
  dispatch and this scheduled red path, including issue creation and an uploaded report.
- Multi-platform tag drift need not affect every architecture: five Maven manifests changed while
  `linux/s390x` remained identical, so provenance review must compare platform descriptors rather
  than only the top-level digest.
- A full validation run can surface unrelated dependency advisories. Preserve them explicitly and
  schedule them separately instead of either hiding them or expanding an urgent maintenance PR.

---

## Recommendations / Next Steps

- [ ] Require the PB-PIN-05 PR gate and owner merge, then verify post-merge `main` CI — PB-PIN-05 / HIGH.
- [ ] Dispatch `pin-drift` and `perf`; require both green on the refreshed digest, then close issue #45 with the PR, merge and run evidence — PB-PIN-05 / HIGH.
- [ ] Triage the new `fast-uri@3.1.5` advisory into a separate scored backlog risk before any lockfile change — owner / LOW project exposure, advisory severity HIGH.

---

*Session logged: 2026-09-14. Author: Codex.*
