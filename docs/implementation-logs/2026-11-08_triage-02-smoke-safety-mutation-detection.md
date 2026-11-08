<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-08_triage-02-smoke-safety-mutation-detection.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-02: smoke-safety detects mutations before another profile can reset them, 2026-11-08

## Session Summary

`npm run check:smoke-safety` could not see a mutation made by an API `@smoke` scenario. The UI profile's `BeforeAll`
re-seeded the datastore before the only post-run snapshot was taken (Claude v1 review R-01, Codex v2 R-01). The runner
now owns the seed state, and neither lane re-seeds; any reset hook that would fire fails the gate instead. The runner
compares the seeded customer's accounts and their transactions after each lane, and fails naming the lane. A $0.01
deposit now turns the gate red in the API lane and, separately, in the UI lane. Before the change, the same API-lane
deposit passed green. Plan: [`../implementation-plans/2026-11-08_triage-02-smoke-safety-mutation-detection.md`](../implementation-plans/2026-11-08_triage-02-smoke-safety-mutation-detection.md)
(approved 2026-11-08 with D-T02-1 to D-T02-8 as recommended).

---

## Objectives

1. ✅ Step 0 probe of the widened snapshot against the local SUT, and the baseline gate.
2. ✅ Demonstrate the defect before the fix: MF-1 passed green on unmodified hooks and runner.
3. ✅ Runner-owned seed with a comparison after each lane (D-T02-1 option C), and reset hooks that refuse during an
   owned run (D-T02-2).
4. ✅ Snapshot widened to every account of customer 12212 and its transactions (D-4).
5. ✅ Must-fail proofs MF-1 to MF-4 red after the fix; fixtures were temporary and never committed (D-T02-4).
6. ✅ Measured scope stated in the script header, design doc §5.9 (v1.12), QA strategy and README (D-T02-8).
7. ✅ Five-command project contract run locally (D-T02-6); PR CI to confirm.
8. ⏸️ Optional UI-transfer must-fail (D-T02-3 "optional") not run; the approved REST-deposit proof covers the UI lane.
9. ⏸️ Backlog entry deferred to the outcome follow-up with merge evidence (D-T02-7).

---

## Step 0 probe (local SUT, `main` at `81d11eb` plus the plan files only)

Run with a throwaway script outside the repository after `build-sut.ps1` (exit 0, 267.4 s), `docker compose up -d`
(exit 0, 1.8 s) and `gate.ps1` (exit 0, 22.8 s; `GATE PASS`):

```text
accounts of 12212: 11 -> ids 12345,12456,12567,12678,12789,12900,13011,13122,13233,13344,54321
transactions per account: 12345:7 12456:0 12567:0 12678:2 12789:1 12900:2 13011:1 13122:3 13233:1 13344:2 54321:2
widened snapshot requests: 12, took 622 ms
two consecutive snapshots identical: true
seed->snap->seed->snap identical: true
```

The seed is deterministic for the widened scope too, so a comparison after each lane alone (option A) would also have
detected the mutation. Option C was still chosen: it makes the script's "no intervening reset" promise literally
true, and a reset hook can no longer hide anything.

Baseline on unmodified code: `npm run check:smoke-safety` exited 0 in 38.6 s (api 2 scenarios / 6 steps passed;
ui 1 scenario / 4 steps passed), ending `Smoke-safety OK: @smoke ran green and left the seed state byte-identical.`

---

## Must-fail evidence

The fixtures were copied in from outside the repository and deleted straight after each run. `git status` showed no
`zz-smoke-safety-selftest` files after each one, and none were committed.

| Proof | Code | Exit | Decisive console lines |
|---|---|---|---|
| MF-1 pre-fix (defect observed) | unmodified hooks and runner | **0** | api `3 scenarios (3 passed)`, ui `1 scenario (1 passed)`, then `Smoke-safety OK: @smoke ran green and left the seed state byte-identical.` The $0.01 deposit had been made and was erased by the UI process's re-seed. |
| MF-1 API lane | after the fix | **1** | `Smoke-safety FAILED in the api lane: @smoke changed the seed state (no reset ran in between).` `- account 12345 balance changed from -2300 to -2299.99` `- account 12345 transactions changed from 7 to 8 entries; first difference at #7: {"accountId":12345,"amount":0.01,...,"description":"Deposit via Web Service",...,"type":"Credit"}`. The UI profile never started. |
| MF-2 UI lane | after the fix | **1** | api `2 scenarios (2 passed)` compared clean; ui `2 scenarios (2 passed)`, then `Smoke-safety FAILED in the ui lane: ...` with the same two difference lines for account 12345. |
| MF-3 reset hook in an owned run | after the fix | **1** | `Error: smoke-safety owns the seed state; scenario "Self-test read-only scenario that would trigger a reset hook" would reset it. @smoke scenarios must not trigger a reset hook.` `3 scenarios (1 failed, 2 passed)`, then `Error: Command failed: npx cucumber-js --profile api --tags "@smoke"`. |
| MF-4 unit (inverted comparison) | `seedOwnedExternally` returning `!==` | **1** | `tests 3`, `pass 0`, `fail 3`. Reverted, the same file passed (exit 0). |

Fixtures used:
- MF-1: a temporary `@api` feature with one `@smoke` scenario, `When the self-test deposits $0.01 into account 12345`,
  plus a temporary step using the existing `Deposit` Task.
- MF-2: the same step inside the UI profile, after `Given Paula is on the ParaBank home page` and the seeded UI login.
  The ParaBank UI has no deposit form.
- MF-3: a read-only `@smoke @contract-matrix` API scenario, `When account 12345 is read via REST`.

Positive run after the fix: exit 0. Both lanes print `BeforeAll seed skipped: the smoke-safety runner owns the seed
state`, and the run ends `Smoke-safety OK: api and ui @smoke left customer 12212's 11 accounts and their 21
transactions unchanged, compared after each lane with no reset in between.`

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript | Unit (`npm run test:unit`) | 43/43 | 50/50 | ✅ PASS |
| TypeScript | New unit files alone | n/a | 7/7 (`seed-ownership` 3, `smoke-snapshot` 4) | ✅ PASS |
| Node | `npm run check:smoke-safety` | 2/2 API + 1/1 UI; accounts only | 2/2 API + 1/1 UI; 11 accounts + 21 transactions, per lane | ✅ PASS |
| Project contract | Five-command gate | not run before the change | 5/5: `build-sut.ps1` exit 0 (168.4 s), `compose up -d` exit 0 (1.6 s), `gate.ps1` exit 0 (18.1 s, `GATE PASS`), `npm run verify` exit 0 (52.9 s: typecheck, 50/50 unit, tag lint OK, smoke-safety OK, 14/14 API scenarios and 49 steps, 8/8 UI scenarios and 49 steps, report JSON check OK with HTML left to CI because there is no local Java), `compose down` exit 0 (4.2 s); total 245.2 s; no ParaBank container left | ✅ PASS |

---

## Changes Implemented

### Runner-owned seed and per-lane comparison

**Files changed:**
- `scripts/smoke-safety.mjs`:
  - seeds once, then runs each profile with `PARABANK_SEED_OWNER=smoke-safety`;
  - snapshots the 12212 accounts and each account's transactions after each lane, and fails naming the lane;
  - the header states the mechanism and the measured scope;
  - the DR-PB-13 guard line, the architecture-test marker, is byte-identical.
- `features/support/hooks.ts`:
  - `BeforeAll` skips its seed only under seed ownership, and logs the skip;
  - the `@mutates` bracket and the `@loan or @contract-matrix` after-reset throw under seed ownership instead of
    seeding.
- `src/quality/seed-ownership.ts` (new): `seedOwnedExternally()`, true only for the exact value `smoke-safety`.
- `src/quality/smoke-snapshot.ts` (new): `SeedSnapshot`, `canonical()` and `diffSnapshots()`, pure and
  SUT-independent.
- `tests/unit/seed-ownership.test.ts` and `tests/unit/smoke-snapshot.test.ts` (new): 3 + 4 tests.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Runner owns the seed and compares after each lane (D-T02-1 C) | Makes "no intervening reset" literally true, and attributes a failure to its lane | Option A (comparison only; would also have worked, Step 0); option B alone (no attribution) |
| A reset hook in an owned run throws (D-T02-2) | A future `@smoke @loan` scenario cannot silently re-seed and hide a mutation | Ignoring the hook |
| Snapshot reads keep plain `fetch` with no deadline (D-T02-5) | TRIAGE-16's acceptance owns the request-deadline change for this script | Adopting the client now |
| Compare parsed, key-sorted JSON rather than raw text | Readable per-account differences; immune to key-order noise | Raw text compare (no attribution) |

---

## Documentation Updates

- `docs/design-document.md`: v1.12; §5.9 states the runner-owned seed, the per-lane comparison and the measured scope;
  the status and history rows were updated.
- `docs/qa-strategy.md`: the smoke row and §4 state the scope, the PB-P3 exit line references it, and the framework
  unit row lists the new helpers.
- `README.md`: the store-safety proof wording names the scope.
- `docs/implementation-plans/2026-11-08_triage-02-smoke-safety-mutation-detection.md` and `_index.md`: plan approved.

---

## Lessons Learned

- **A proof that passes a deliberately broken input is not a proof.** The pre-fix MF-1 run was green with a real
  deposit made: the strongest evidence the defect was real, and cheap to obtain.
- **Separate processes inherit hooks, not intent.** Each Cucumber child re-ran the shared `BeforeAll`. An explicit,
  exact-valued ownership flag, plus hooks that refuse rather than comply, closes that class of gap.
- **Determinism checks inform design without forcing it.** The re-seed was deterministic, so option A would have
  worked. Option C was still preferred for its literal truth and its lane attribution.

---

## Recommendations / Next Steps

- [ ] Outcome follow-up after merge: the plan's Outcome section, the `_index.md` row set to implemented, and backlog
  v36 with PR CI, merge and post-merge CI evidence (D-T02-7).
- [ ] Root: tick TRIAGE-02 in `WORKLIST_parabank-bank-automation.md` with the merge SHA.
- [ ] TRIAGE-11 and TRIAGE-16 are now unblocked; TRIAGE-16 adds request deadlines to these snapshot reads.

---

*Session logged: 2026-11-08. Author: Claude (Opus 5.5), delegated agent.*
