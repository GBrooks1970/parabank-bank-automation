# Walkthrough — PB-STYLE-03 v3: destructive operations guarded at the source

## Executive Summary

Before merging PR [#53](https://github.com/GBrooks1970/parabank-bank-automation/pull/53), the owner asked whether further changes to
the main lanes could still remove live-demo data. With v2 they could: it guarded only where the Cucumber lanes and smoke-safety read
their URL. v3 moves the guard onto the destructive operations themselves and closes the two remaining entry points, `gate.ps1` and the
perf lane. An architecture test fails CI if a new reset/wipe/admin call site appears outside a reviewed, guarded list. Unit tests are
43/43, the must-fail checks are red as intended, and `npm run verify`, the local perf lane and both styles are green. The work is pushed to #53.

## 1. Changes Implemented

**Guards at the destructive operations**
- [`src/api/client.ts`](../../src/api/client.ts): `initializeDB()`, `cleanDB()` and `setParameter()` each start with
  `assertLocalSut(this.baseUrl, 'ParaBankRestClient.<op>')`.
- [`src/api/reset.ts`](../../src/api/reset.ts): `seedDatabase()` starts with `assertLocalSut(baseUrl, 'seedDatabase')`.

**The remaining entry points**
- [`scripts/gate.ps1`](../../scripts/gate.ps1): a non-loopback `-BaseUrl` gives `GATE REFUSED … (DR-PB-13)` and exit 1, before any request.
- [`scripts/run-perf.mjs`](../../scripts/run-perf.mjs): `assertLocalSut(baseUrl, 'The perf lane')` before Docker. `perf:run` runs under `tsx`.
- [`perf/src/parabank-load.ts`](../../perf/src/parabank-load.ts): an init-context loopback check, a commented duplicate because k6 can't import Node modules.

**Tests**
- [`tests/unit/destructive-operations-guard.test.ts`](../../tests/unit/destructive-operations-guard.test.ts): 3 tests. With `fetch` stubbed,
  a remote host gets refusals and no request leaves; the local SUT still works.
- [`tests/unit/destructive-call-sites.test.ts`](../../tests/unit/destructive-call-sites.test.ts): 2 architecture tests. It scans `src/`,
  `features/`, `scripts/`, `perf/src/` and both style folders for `initializeDB` / `cleanDB` / `setParameter`. 13 reviewed files are listed, each
  with its guard marker. The client entry requires all three per-method guards.

**Docs:** DR-PB-13 (hardened), design doc §5.5, the backlog PB-STYLE-03 block, the plan (v3 section and v3 Outcome) and the implementation-log addendum.

## 2. Verification & Test Evidence

| Command | Quality Gate / Suite | Status | Metrics (Passed/Total) | Duration |
|---|---|---|---|---|
| `npm run test:unit` | Framework unit | ✅ | 43/43 | — |
| Must-fail (a): `client.initializeDB` guard removed | Unit + architecture | ✅ red | 2 fail: `src/api/client.ts lost its guard (expected to contain: assertLocalSut(this.baseUrl, 'ParaBankRestClient.initializeDB'))` | — |
| Must-fail (b): unlisted `src/api/unguarded-probe.ts` | Architecture | ✅ red | `New destructive call site(s): src/api/unguarded-probe.ts …` | — |
| `pwsh ./scripts/gate.ps1 -BaseUrl https://parabank.parasoft.com` | Gate guard | ✅ refused | `GATE REFUSED …`, exit 1 | — |
| `pwsh ./scripts/gate.ps1` | Boot gate | ✅ | `GATE PASS`, exit 0 | — |
| `PARABANK_BASE_URL=<demo> npm run perf:run` | Perf guard | ✅ refused | `The perf lane refuses …`, exit 1, before Docker | — |
| k6 bundle run directly with the demo URL | k6 init check | ✅ refused | `The perf lane refuses PARABANK_BASE_URL=https://parabank.parasoft.com/…` | — |
| `npm run perf` (local) | Perf lane | ✅ | both scenarios ✓, exit 0 | 63 s |
| `npm run verify` | Project contract | ✅ | unit 43/43, smoke 3/3, API 14/14, UI 8/8, report 8/8 | 81.8 s |
| `npm run test:style-02` / `test:style-03` (local) | Styles | ✅ | 12/12 / 12/12; report check OK | 7.4 s / 19.5 s |

Remote CI: the v3 commit hadn't been pushed when this was written. Auto-fix is on for #53.

## 3. Operational State & Invariants

- Branch `feat/pb-style-03-live-demo-target` (PR #53), with v2 commits `70d3ed5` and `ac808bf` and the v3 commit after them.
- `perf/report/` was restored after the local perf run, so the nightly lane's committed evidence is unchanged. The SUT is torn down after verification.
- Invariants kept:
  - CI local only, with no workflow change
  - no new dependency
  - the style folders don't change behaviour in v3
  - assert-as-observed
  - en-GB prose

What no code can promise: a later PR could delete the guards *and* their tests together. The architecture test and the owner's review at
merge make that visible rather than silent.

## 4. Recommended Next Actions

1. **(Primary)** Push v3, then merge #53 only once every check result on the final head is green. Then confirm post-merge `main` CI.
2. The capability-matrix row(s) in the root repo: style-02, style-03, the live option, and the destructive-operation guard.
3. Optional wording fix: make the guard message name the variable actually used (`PARABANK_BASE_URL` for perf).
