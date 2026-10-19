<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-10-19_pb-style-03-live-demo-target.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# PB-STYLE-03 — live-demo runs for the style folders; main lanes guarded to the local SUT — 2026-10-19

## Session Summary

The goal was to let `test-style-02/` and `test-style-03/` run against the public ParaBank demo when directed, and to make sure no
lane could ever reset a host other than the local SUT. Planning found the main lanes would reset, wipe and re-configure whatever
`PARABANK_URL` named (risk PBR-08). Plan v1 was judged over-built by the owner and replaced by a lean v2, which is delivered here:
- a unit-tested `assertLocalSut` guard in the main lanes
- a loopback-only reset in both styles
- the overdraft test skipped on a remote host
- documented one-liners for live runs

Local and live runs are green, and a PR is open.

---

## Objectives

1. ✅ Step 0 live probe of the four not-yet-probed transfer cases (all match local)
2. ✅ `src/quality/target-guard.ts` + `tests/unit/target-guard.test.ts`; guard wired into `world.ts` and `smoke-safety.mjs`
3. ✅ Loopback-only reset in both styles' `global-setup.ts`; overdraft `test.skip` on a remote host
4. ✅ Verification: local unchanged, live 11 passed + 1 skipped per style, guard must-fails, `verify` green
5. ✅ Docs: style READMEs, `.env.example` ×2, root README, DR-PB-13, design doc v1.11, backlog v33 (PBR-08)
6. ⏸️ Merge after green CI; post-merge CI; capability-matrix row (root repo)

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Node test runner | Framework unit | 36/36 | 38/38 | ✅ PASS |
| Cucumber | `@smoke` + smoke-safety | 3/3 | 3/3 (now via `tsx`) | ✅ PASS |
| Cucumber + Screenplay | API lane | 14/14 | 14/14 | ✅ PASS |
| Serenity/JS + Playwright | UI lane | 8/8 | 8/8 | ✅ PASS |
| Playwright Test | `test-style-02` local / live | 12/12 / — | 12/12 / 11 + 1 skipped | ✅ PASS |
| Serenity/JS on Playwright Test | `test-style-03` local / live | 12/12 / — | 12/12 / 11 + 1 skipped | ✅ PASS |

---

## Changes Implemented

### Main-lane guard (DR-PB-13, resolves PBR-08)

**Files changed:**
- `src/quality/target-guard.ts` (new): `isLoopbackUrl` and `assertLocalSut`.
- `tests/unit/target-guard.test.ts` (new): loopback hosts accepted; the demo, `host.docker.internal`, a LAN IP, a look-alike
  domain, a non-http(s) scheme and a non-URL all rejected. The refusal message is asserted.
- `features/support/world.ts`: calls `assertLocalSut(BASE_URL, 'The Cucumber lanes')` at module load, before every hook.
- `scripts/smoke-safety.mjs`: calls the guard before `seed()`. `package.json` `check:smoke-safety` now runs it with `tsx`.

### Style folders

**Files changed:**
- `test-style-0{2,3}/playwright.config.ts`: `IS_LOCAL_TARGET`, the loopback rule on `PARABANK_URL`.
- `test-style-0{2,3}/global-setup.ts`: on a non-local host, print the "no reset" line and return, without ever resetting.
  Locally it behaves as before.
- `test-style-0{2,3}/tests/fund-transfer-api.spec.ts`: `test.skip(!IS_LOCAL_TARGET, 'live-skip: …')` on the overdraft test.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Plan v2 over v1 | The return is an occasional live run; the safety is what matters | A `PARABANK_TARGET` resolver, a launcher, `:live` scripts, a CI refusal, remote tuning, a target-aware report check |
| Run smoke-safety under `tsx` | One unit-tested guard, not a copy in plain JS | A duplicate guard in the `.mjs` |
| Guard at module load in `world.ts` | It fires before `BeforeAll`, so before the first request, for every Cucumber profile | A check inside each hook |
| Report check stays strict for live runs | Live evidence must not pass as CI evidence | Making the check target-aware (v1) |

---

## Documentation Updates

- `test-style-02/README.md`, `test-style-03/README.md`: "Run against the live demo" (PowerShell and bash one-liners, the rules)
- `test-style-0{2,3}/.env.example`: live note; `PARABANK_SKIP_RESET` now means the local SUT only
- `README.md`: one paragraph
- `docs/decision-register.md`: DR-PB-13
- `docs/design-document.md`: v1.11 (§5.5 guard, §5.11 remote runs)
- `docs/backlog.md`: v33 (PB-STYLE-02 complete, PB-STYLE-03, risk PBR-08 resolved; summary 6 → 7 resolved)
- `docs/implementation-plans/`: v2 plan, approval and Outcome; PB-STYLE-02 marked delivered; index rows

---

## Lessons Learned

- **A shared variable is a shared blast radius.** Adding a reason to point `PARABANK_URL` elsewhere quietly armed every other reader
  of it. Search for all readers of a variable before giving it a new meaning.
- **Ask what a change returns before building it.** The owner's question cut the plan from about 15 files to about 7 without losing
  any safety.
- **Prove "before any request" with an unresolvable host.** `https://unreachable.invalid` distinguishes the guard firing from a network
  failure in one run.
