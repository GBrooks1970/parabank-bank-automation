# PBR-02 — Node 24 action runtimes — 2026-09-01

## Session Summary

Closed the last open item of the PB-PIN cycle by moving the two workflow actions that still
declared Node 20 runtimes onto Node-24-native majors: `actions/setup-java` v4.9.0 → v6.0.0 and
`actions/upload-artifact` v4.6.2 → v7.0.1. Both are multi-major jumps, so each intervening
release was reviewed for runtime, input, permission, and runner compatibility before pinning,
and both pinned commits were verified to declare `runs.using: node24` at the pinned SHA rather
than at the moving tag.

---

## Objectives

1. ✅ Confirm PBR-02's trigger had genuinely fired rather than assuming it.
2. ✅ Review every intervening major release, not just the target.
3. ✅ Verify the Node 24 runtime **at the pinned commit**.
4. ✅ Update every call site, including one added earlier the same day.
5. ✅ Keep the pin-policy record truthful in the same PR.

---

## Problem

PBR-02 recorded that `setup-java@v4.9.0` and `upload-artifact@v4.6.2` still declared Node 20
action runtimes, with the success criterion "bump when a Node-24-native major is available".
The runner has since stopped merely deprecating Node 20 and now **force-runs** these actions on
Node 24, annotating every workflow run:

> Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run
> on Node.js 24: `actions/upload-artifact@ea165f8d…`

So the trigger had fired twice over: Node-24-native majors exist, and the runner is already
overriding the declared runtime. A forced runtime is not a supported configuration to rely on.

---

## Review

Multi-major jumps, so each release between the pinned one and the target was read.

**`actions/upload-artifact` v4.6.2 → v7.0.1**

| Release | Change relevant to this repository |
|---|---|
| v5.0.0 | Node 24 support added; default runtime still Node 20. Bumps `@actions/artifact` to v4. |
| v6.0.0 | `runs.using: node24` becomes the default. **Requires runner ≥ 2.327.1** — satisfied by GitHub-hosted `ubuntu-latest`. |
| v7.0.0 | Opt-in unzipped single-file upload via a new `archive: false` input; package migrated to ESM. |
| v7.0.1 | README and transitive dependency updates only. |

All three call sites pass only `name`, `path` and `if-no-files-found`, so no changed or removed
input is used and `archive` stays at its default. v4's immutable-artifact semantics are
unaffected.

**`actions/setup-java` v4.9.0 → v6.0.0**

| Release | Change relevant to this repository |
|---|---|
| v5.0.0 | Node 24 runtime (**breaking**, runner ≥ 2.327.1); dependency and error-handling fixes. |
| v6.0.0 | ESM migration, explicitly documented as *not* user-facing; Zulu moved from the Discovery API to the Azul Metadata API; `jdkFile` renamed to `jdk-file` with a deprecated alias; various cache and problem-matcher additions. |

The `ci.yml` step pins `distribution: temurin` and `java-version: 21`, so neither the Azul
migration (Zulu only) nor the `jdkFile` rename applies.

**Runtime verified at the pinned commit**, not at the tag:

```
actions/upload-artifact @ 043fb46d…  ->  runs.using: 'node24'
actions/setup-java      @ dd06d9cb…  ->  runs.using: 'node24'
```

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Actions policy | `runs.using` at the pinned SHA | `node20` × 2 | `node24` × 2 | ✅ PASS |
| Actions policy | Full 40-character SHA pins | 7 actions pinned | 7 actions pinned, 2 refreshed | ✅ PASS |
| Actions policy | Call-site inventory | — | 3 `upload-artifact`, 1 `setup-java`; all updated | ✅ PASS |
| Workflow | YAML parse, all three workflows | — | `ci`, `perf`, `pin-drift` all parse | ✅ PASS |
| Project | Five-command contract | — | All five green with teardown | ✅ PASS |

The decisive evidence is the post-merge `main` run: the Node 20 annotation must be absent, and
the Serenity artefact upload and Pages deployment must still succeed. That cannot be produced
locally, so it is the required gate for closing PBR-02.

---

## Changes Implemented

**Files changed:**
- `.github/workflows/ci.yml` — `setup-java` → `dd06d9cba3e5552c54d9f8ea23572deb30010f7c` (v6.0.0);
  `upload-artifact` → `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (v7.0.1).
- `.github/workflows/perf.yml` — `upload-artifact` bumped.
- `.github/workflows/pin-drift.yml` — `upload-artifact` bumped. This workflow was added earlier
  the same day (PB-PIN-02) and had copied the then-current v4.6.2 pin, so without this it would
  have shipped a brand-new Node 20 pin into a PR whose purpose was removing them.
- `docs/github-actions-pin-policy.md` — refreshed both rows with the reviewed release, SHA and
  the compatibility notes above; recorded the 2026-09-01 refresh date.
- `docs/backlog.md` — v27; PBR-02 resolved with its review evidence; the PB-PIN cycle closed.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Take the current majors (v7.0.1 / v6.0.0) rather than the first Node-24 release. | v6/v5 respectively are already superseded; pinning a stale major would guarantee a second bump soon. | Pin `upload-artifact@v6.0.0` and `setup-java@v5.0.0` as the minimal Node 24 step. |
| Read every intervening release, not only the target's notes. | A multi-major jump hides breaking changes in the middle; `upload-artifact` v6's runner floor appears in v6's notes, not v7's. | Read the target release only. |
| Verify `runs.using` at the pinned SHA. | The whole point of SHA pinning is that the tag is not the thing executed; the runtime claim must be checked against what will actually run. | Trust the release notes' Node 24 claim. |
| Bump `pin-drift.yml` in the same PR. | It was authored hours earlier with the old pin; leaving it would have re-introduced the exact defect this PR closes. | Leave it for a follow-up. |

No decision record needed: DR-PB-10 already governs actions as immutable execution inputs, and
`github-actions-pin-policy.md` already prescribes this review procedure. This is that procedure
being followed.

---

## Lessons Learned

- A trigger-gated risk needs someone to notice the trigger. PBR-02's fired when GitHub moved
  from warning to force-running, and nothing was watching for that transition — it surfaced only
  because an unrelated failure log was being read closely.
- New work inherits old pins. `pin-drift.yml` copied the Node 20 `upload-artifact` pin from an
  existing workflow within hours of being written; a fix is not complete while the pattern it
  fixes is still being copied.
- "Multi-major jump" is a reason to read more, not a reason to defer. The deferral in PBR-02 was
  right when written and had quietly become the more expensive option.

---

## Recommendations / Next Steps

- [ ] Merge, then confirm the post-merge `main` run has **no** Node 20 annotation and still uploads the Serenity artefact and deploys Pages — HIGH.
- [ ] Dispatch `pin-drift` once to prove its green path; it has still never executed — LOW.
- [ ] Retain PBR-01, PBR-04, PBR-05: the upstream source pin is unchanged, so their triggers have not fired — LOW.
- [ ] Consider a periodic check that no workflow declares a deprecated action runtime, so the next PBR-02 is noticed rather than stumbled upon — LOW.

---

*Session logged: 2026-09-01. Author: Claude Opus 5.*
