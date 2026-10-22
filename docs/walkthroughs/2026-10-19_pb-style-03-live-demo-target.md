# Walkthrough — PB-STYLE-03: live-demo runs for the style folders; main lanes guarded to the local SUT

## Executive Summary

`test-style-02/` and `test-style-03/` can now run against the public ParaBank demo when directed, through the existing
`PARABANK_URL`. A remote host is never reset, and the overdraft test is skipped there. The main Cucumber lanes and
`check:smoke-safety` refuse any non-local host before making a request. That closes PBR-08: they would have reset, wiped and
re-configured whatever host `PARABANK_URL` named. Locally both styles are 12/12 and live each is 11 passed + 1 skipped. Unit tests
are 38/38 and `npm run verify` is green. The work is on branch `feat/pb-style-03-live-demo-target`, with the PR opened after this commit.

## 1. Changes Implemented

**Main-lane guard (DR-PB-13)**
- [`src/quality/target-guard.ts`](../../src/quality/target-guard.ts): `isLoopbackUrl` (true only for http(s) on `localhost` /
  `127.0.0.1` / `::1`) and `assertLocalSut`, which throws a message naming DR-PB-13 and the style folders as the way to run live.
- [`tests/unit/target-guard.test.ts`](../../tests/unit/target-guard.test.ts): 2 tests, accept and reject cases.
- [`features/support/world.ts`](../../features/support/world.ts): the guard runs at module load, before every hook, for every Cucumber profile.
- [`scripts/smoke-safety.mjs`](../../scripts/smoke-safety.mjs): the guard runs before `seed()`. `check:smoke-safety` now runs with `tsx`, so it can import the TS guard.

**Style folders**
- `test-style-0{2,3}/playwright.config.ts`: `IS_LOCAL_TARGET`.
- `test-style-0{2,3}/global-setup.ts`: a remote host prints `ParaBank target is not the local SUT (…): no reset; tests move real money there.`
  and returns without resetting.
- `test-style-0{2,3}/tests/fund-transfer-api.spec.ts`: the overdraft test has `test.skip(!IS_LOCAL_TARGET, 'live-skip: …')`.

**Docs:**
- style READMEs, which gain a "Run against the live demo" section with the PowerShell and bash one-liners
- both `.env.example` files
- the root README
- DR-PB-13
- design doc v1.11
- backlog v33, with PBR-08 resolved and PB-STYLE-02 closed
- the plan v2 Outcome and the [implementation log](../implementation-logs/2026-10-19_pb-style-03-live-demo-target.md)

## 2. Verification & Test Evidence

| Command | Quality Gate / Suite | Status | Metrics (Passed/Total) | Duration |
|---|---|---|---|---|
| curl ×4 against the live demo | Step 0 probe | ✅ | 4/4 match local | 21:41:33Z–21:41:36Z |
| `npm run typecheck` / `:style-02` / `:style-03` | Types | ✅ | exit 0 ×3 | — |
| `npm run test:unit` | Framework unit | ✅ | 38/38 | — |
| `npm run test:style-02` (local) | Style 02 | ✅ | 12/12 | 11.0 s |
| `npm run test:style-03` + check (local) | Style 03 | ✅ | 12/12; report OK | 16.5 s |
| Container access log | Local resets | ✅ | exactly 2 `initializeDB` calls (one per suite) | — |
| `PARABANK_URL=https://parabank.parasoft.com npm run test:style-02` | Live | ✅ | 11 passed, 1 skipped | 14.1 s |
| `PARABANK_URL=https://parabank.parasoft.com npm run test:style-03` | Live | ✅ | 11 passed, 1 skipped | 40.9 s |
| `cucumber-js --profile api`, URL `https://unreachable.invalid` | Guard must-fail | ✅ red | `The Cucumber lanes refuses PARABANK_URL=…` (no DNS error) | — |
| `cucumber-js --profile ui`, demo URL | Guard must-fail | ✅ red | same refusal | — |
| `check:smoke-safety`, unreachable URL | Guard must-fail | ✅ red | `The smoke-safety check refuses …`, exit 1 | — |
| `isLoopbackUrl` forced to `true` | Unit must-fail | ✅ red | 36 pass, 2 fail; restored to 38/38 | — |
| `check:style-03-report` after a live run | Strictness | ✅ red | `… accepts an overdraft … is SKIPPED, not SUCCESS` | — |
| `npm run verify` | Project contract | ✅ | unit 38/38, smoke 3/3, API 14/14, UI 8/8, report 8/8 | 49.0 s |

Captured output:

```
=== LIVE style-02
ParaBank target is not the local SUT (https://parabank.parasoft.com): no reset; tests move real money there.
 1 skipped
 11 passed (14.1s)
```

Remote CI: the PR hadn't been opened when this was written. CI exercises local only.

## 3. Operational State & Invariants

- Branch `feat/pb-style-03-live-demo-target`, from `main` at `e7130f5` (#52; post-merge CI [run 39327685933](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/39327685933) green). Feature commit `70d3ed5`, then this walkthrough.
- The SUT is torn down after verification. Docker storage is on `E:\_DockerData`.
- Live runs moved real money on the shared demo, as approved (two runs of 11 tests).
- Invariants kept:
  - CI unchanged and local only
  - no dependency change (`npm audit` unchanged)
  - no new environment variable
  - style folders share no code (DR-PB-12)
  - assert-as-observed
  - en-GB prose

## 4. Recommended Next Actions

1. **(Primary)** Open the PR. Merge only once every check result on the final head is green, then confirm post-merge `main` CI.
2. Add the capability-matrix row(s) in the root repo for style-02, style-03 and the live option. That's the pending follow-up session.
3. Optional: triage the pre-existing transitive `axios 1.18.1` HIGH advisories as a backlog risk.
