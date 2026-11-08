---
version: 1
created: 2026-11-08T01:11Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-02 (approved worklist item; proposed backlog candidate)
status: approved
approved: 2026-11-08, owner (Gary Brooks), "Approved both as recommended" (relayed by the coordinating session); D-T02-1 to D-T02-8 as recommended; the main session merges the project PR only when every check is green
delivered: not yet
language: en-GB
---

# Implementation plan: TRIAGE-02, make smoke-safety detect mutations before another profile can reset them

**Goal.** `npm run check:smoke-safety` is the project's executable proof of NFR-4 store safety: `@smoke` is
side-effect-free (design doc §5.9). Today it cannot see a mutation made by an API `@smoke` scenario, because the UI
profile re-seeds before the only post-run snapshot is taken. This plan makes the proof honest in four ways:

- each lane is observed before anything can reset the datastore;
- the measured state is widened to the seeded customer's account transactions (D-4);
- a deliberate $0.01 deposit is shown to turn the gate red in the API lane and, separately, in the UI lane (D-4);
- the documentation names exactly the state scope that is measured, rather than claiming universal datastore
  immutability.

The normal boot→seed→use contract (DR-PB-06) is preserved for every other caller.

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`, item TRIAGE-02 and its amendment of 2026-11-06 (D-4,
  owner-approved).
- Review findings: Claude v1 R-01 (MEDIUM, 15) in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md`
  §1, and Codex v2 R-01 in `.review/CODE_REVIEW_CODEX_v2_20260929T0630Z/02_RISKS_AND_ISSUES.md` §1.

## Evidence gathered before planning

All reads were made in a worktree of `main` at `759eef6` (#57). They changed nothing in the repository, and no SUT, Docker
or test run took place. A re-fetch on 2026-11-08 showed `origin/main` at `81d11eb`. The only change since `759eef6` is a
nightly perf bot commit (`perf/report/index.html`, `perf/report/perf-summary.json`), so none of the evidence below has
moved. The plan branch was fast-forwarded to `81d11eb`.

| Finding | Consequence for the plan |
|---|---|
| `scripts/smoke-safety.mjs:1-3` promises the check runs "WITHOUT an intervening reset". `:25-26` seeds and takes the only "before" snapshot. `:28-31` runs `cucumber-js --profile api` and then `--profile ui` as two separate processes. `:33-39` takes one "after" snapshot and compares. | The defect is structural. The fix is to compare after each profile, and ideally to stop the intervening reset altogether. |
| `features/support/hooks.ts:12-17`: `BeforeAll` calls `seedDatabase(BASE_URL)` unconditionally (`:14`) in every Cucumber process. | The UI process erases any API-lane mutation before the final snapshot. This is R-01's root cause. |
| `cucumber.js:9` (api) and `:17` (ui): both profiles `require` `features/support/**/*.ts`. | Both child processes load the same hooks, so the fix belongs in the shared hooks, not in a profile. |
| `features/support/hooks.ts:19-23` re-seeds before `@mutates`, and `:32-34` re-seeds after `@loan or @contract-matrix`. | Any reset hook that fires during a smoke-safety run hides evidence. Today none does: the lint forbids `@smoke` with `@mutates` (`scripts/check-tags.ts:1-2`), and the `@contract-matrix` scenario at `features/api/b1-rest-contract.feature:26` is `@mutates`, not `@smoke`. Nothing stops a future `@smoke @loan` scenario, though. |
| `scripts/smoke-safety.mjs:16-23`: the snapshot is only `GET /customers/12212/accounts`, compared as raw text. | D-4 widens it to each listed account's `GET /accounts/{id}/transactions` (client equivalent: `src/api/client.ts:58-59`). Admin parameters, other customers and newly registered customers stay outside the measured scope, and the documentation must say so. |
| The smoke set is fixed at 3 (design doc §5.9, `docs/design-document.md:415-419`; lint counts at `scripts/check-tags.ts:7`): `features/ui/a1-register-and-login.feature:7-12`, `features/api/b1-rest-contract.feature:8-14` and `features/api/b3-rest-soap-parity.feature:7-10`. All are read-only by inspection. | This is a detection defect, not a current mutation. The smoke set and count do not change, so no design-doc set amendment is needed. Only the §5.9 wording of how the proof works changes. |
| `src/api/reset.ts:9-30`: `seedDatabase()` is the single guarded seed helper. The script uses its own `seed()` at `smoke-safety.mjs:11-14`, not the shared helper, and is guarded at entry by `assertLocalSut` (`:9`). | The script's own seed and its DR-PB-13 guard can stay as they are. Putting the script's requests under the request-deadline policy is TRIAGE-16's acceptance, so it is deliberately left out of this item; switching to the shared seed helper is not needed for this fix either. |
| `tests/unit/destructive-call-sites.test.ts:38` lists `scripts/smoke-safety.mjs` with the marker `assertLocalSut(BASE_URL, 'The smoke-safety check')`. `:36` lists `features/support/hooks.ts` as "resets through the guarded seedDatabase()". | Keep that marker line byte-identical. Any new module must not name a destructive operation, so that the architecture test stays green unchanged. If one has to, list it there. |
| `src/screenplay` already has a `Deposit` Task (used at `features/api/steps/api.steps.ts:103-106`). `client.ts:70-71` is `deposit`. The ParaBank web UI has no deposit form: its pages are open account, transfer, bill pay, find transactions, contact and loan. | The temporary must-fail fixtures can deposit $0.01 with the existing Task and no new production code. In the UI lane the deposit runs inside the UI profile process through the shared REST ability, after a UI login. |
| `package.json:25`: `check:smoke-safety` runs under `tsx`. `:33`: `verify` runs it after tag lint and before the API and UI lanes. `.github/workflows/ci.yml:49-50` runs `npm run verify` after build, `compose up` and `gate.ps1` (`:21-30`). | The new TypeScript helpers can be imported by the script. CI already exercises the changed gate on every PR. |
| Documentation that states the claim: `docs/design-document.md:417-418` ("asserting seed state unchanged **without** an intervening reset"), `docs/qa-strategy.md:34,68`, `README.md:14,50,56-57`, and the script header. | Each must name the measured scope and the per-lane comparison. Re-grep after editing. |
| The unit suite has 43 tests across 10 files in `tests/unit/` (`scripts/run-unit-tests.mjs` discovers `*.test.ts`). | New pure helpers get their own `*.test.ts`. The new count is recorded from the real run, never assumed. |

## Design options

1. **A: compare after each profile only** (the review's first suggestion). Flow: seed → before → api → snapshot → ui →
   snapshot, comparing both against before. This is the smallest change. However, the UI comparison then rests on the
   UI process's own re-seed reproducing the widened snapshot byte for byte, including transaction dates, which is
   unverified. The script's "no intervening reset" promise also stays false.
2. **B: the runner owns seeding.** The runner seeds once and passes `PARABANK_SEED_OWNER=smoke-safety` to its child
   processes, which makes `BeforeAll` skip its seed. The promise becomes literally true. With a single final comparison,
   though, a failure cannot say which lane mutated.
3. **C: B plus a comparison after each profile (recommended).** One seed, then three snapshots (before, after api,
   after ui), each later one compared with before. A failure names the lane and the accounts whose balance or
   transactions changed. While the runner owns the seed, any reset hook that would fire (`Before @mutates` or
   `After @loan or @contract-matrix`) throws instead of re-seeding, so a reset can never silently hide a mutation.
   Every other caller keeps boot→seed→use unchanged.
4. **D: one Cucumber process for both lanes.** Rejected. The profiles differ in `paths`, `require` and formatters
   (`cucumber.js:6-22`), and the UI profile's single-stdout-formatter rule would be at risk.

## Steps

0. **Step 0 local probe** (needs the local SUT; read-only apart from seeding). Record in the implementation log:
   - the number of accounts of customer 12212, and the transaction count for each;
   - that two consecutive widened snapshots with no action in between are identical;
   - whether seed → snapshot → seed → snapshot is identical (this tells us whether option A alone would ever have been
     enough, and is recorded for the record only);
   - the extra wall-clock cost of the widened snapshot;
   - the current `npm run check:smoke-safety` and `npm run test:unit` results as the baseline.

   **Pre-fix demonstration of the defect:** with the temporary API fixture from Verification (MF-1) in place on
   unmodified `main`, `npm run check:smoke-safety` is expected to pass green. That is the defect, observed. Remove the
   fixture afterwards.
1. **Seed-ownership helper** (new `src/quality/seed-ownership.ts`). It exports:
   - `SEED_OWNER_ENV = 'PARABANK_SEED_OWNER'`;
   - `SMOKE_SAFETY_OWNER = 'smoke-safety'`;
   - `seedOwnedExternally(env = process.env): boolean`, which is true only for the exact value `smoke-safety`. Unset,
     empty or any other value is false, so an accidental setting cannot silently disable seeding.

   The module must not name any destructive operation (see the call-site test). It gets a new
   `tests/unit/seed-ownership.test.ts` covering unset, empty, wrong value, exact value, and that the default reads
   `process.env`.
2. **Snapshot model and diff** (new `src/quality/smoke-snapshot.ts`), pure and SUT-independent:
   - type `SeedSnapshot = { accounts: unknown[]; transactions: Record<string, unknown> }`, keyed by account id;
   - `canonical(snapshot)`, a stable, key-sorted serialisation;
   - `diffSnapshots(before, after): string[]`, which returns a human-readable list. It names added or removed
     accounts, a changed account (id, field and both values), and a changed transaction list (account id plus the
     before and after counts, and the first differing entry).

   It gets a new `tests/unit/smoke-snapshot.test.ts` covering identical snapshots (empty diff), a balance change (names
   the account), an extra transaction (names the account), an added account, and order-insensitivity of object keys.
3. **Hooks** (`features/support/hooks.ts`):
   - `BeforeAll` still fetches the live spec. It calls `seedDatabase` only when `seedOwnedExternally()` is false, and
     otherwise writes one stderr line: `BeforeAll seed skipped: the smoke-safety runner owns the seed state`.
   - In the `Before` hook's `@mutates` branch and in the `After('@loan or @contract-matrix')` hook, when
     `seedOwnedExternally()` is true, throw
     `Error('smoke-safety owns the seed state; scenario "<name>" would reset it. @smoke scenarios must not trigger a reset hook.')`
     instead of seeding.
   - The comment-only call-site entry (`destructive-call-sites.test.ts:36`) stays true, because resets still go only
     through `seedDatabase()`.
4. **Runner** (`scripts/smoke-safety.mjs`):
   - Keep `:7-9` (base URL and DR-PB-13 guard, marker byte-identical) and the existing `seed()`.
   - `snapshot()` reads the accounts list, then each account's transactions in ascending id order, and returns a
     `SeedSnapshot`. The new requests use the same plain `fetch` shape as today; deadlines are TRIAGE-16's job.
   - Flow: `seed()`, then `before = snapshot()`. For each profile, `api` then `ui`:
     1. run `npx cucumber-js --profile <p> --tags "@smoke"` with `env: { ...process.env, PARABANK_SEED_OWNER: 'smoke-safety' }`;
     2. take `after = snapshot()`, then `diff = diffSnapshots(before, after)`;
     3. if the diff is not empty, print `Smoke-safety FAILED in the <p> lane:` followed by each diff line and exit 1,
        before the next profile can run.
   - A child exit other than 0 still fails, as now.
   - The success line names the scope:
     `Smoke-safety OK: api and ui @smoke left customer 12212's N accounts and their transactions unchanged, compared after each lane with no reset in between.`
   - Rewrite the header comment `:1-3` to state the mechanism and the measured scope, and what is not measured: admin
     parameters, other customers, and customers registered during the run.
5. **Documentation** (wording only; the smoke set and count are unchanged):
   - `docs/design-document.md` §5.9 (`:417-419`): describe the runner-owned seed, the per-lane comparison and the exact
     scope. Bump the version line (`:13`, v1.11 → v1.12) with a one-line change note.
   - `docs/qa-strategy.md:34,68`: name the scope.
   - `README.md:14,50`: "store-safe `@smoke` proof" gains the scope wording. `:56-57` is unchanged unless it repeats
     the claim.
   - Re-grep `grep -rn -i "smoke" README.md docs/*.md scripts/smoke-safety.mjs` and confirm that no file still claims
     universal immutability or a single end-of-run comparison.
6. **Implementation log** `docs/implementation-logs/2026-11-DD_triage-02-smoke-safety-mutation-detection.md`, from
   `docs/templates/implementation-log.template.md`. It records the Step 0 probe, the pre-fix green demonstration, every
   must-fail run with its exact console lines and exit codes, the positive runs, the unit count, the run-time cost and
   the five-command contract result.
7. **Plan index** `docs/implementation-plans/_index.md`: this row is set to `approved` when the owner approves. The
   status moves to `implemented` in the outcome follow-up.

## Verification

Must-fail fixtures are **temporary, local and never committed**, as D-4 requires. They are created, run and deleted
within the iteration, and `git status` must show none of them before the commit.

- **MF-1 (API lane):** `features/api/zz-smoke-safety-selftest.feature` (`@api`, one `@smoke` scenario
  `When the self-test deposits $0.01 into account 12345`) and `features/api/steps/zz-smoke-safety-selftest.steps.ts`
  (`Deposit.of(0.01).into(12345)` on the world's actor). `npm run check:smoke-safety` must exit 1 with
  `FAILED in the api lane`, naming account 12345's balance and its transaction list. The UI profile must not have run.
  This proof is red after the fix and green before it (Step 0).
- **MF-2 (UI lane):** `features/ui/zz-smoke-safety-selftest.feature` (`@ui`, one `@smoke` scenario that logs in through
  the UI as "john" with the existing A1 steps, then `When the self-test deposits $0.01 into account 12345`) and
  `features/ui/steps/zz-smoke-safety-selftest.steps.ts` (the same deposit through the shared REST ability inside the UI
  process). The gate must exit 1 with `FAILED in the ui lane` after the API lane passed its comparison.
- **MF-3 (reset hook during an owned run):** a temporary read-only `@smoke @contract-matrix` API scenario. The gate must
  go red with the "would reset it" error, which proves that a reset can no longer hide a mutation.
- **MF-4 (unit):** temporarily invert `seedOwnedExternally`'s comparison. `tests/unit/seed-ownership.test.ts` must fail.
  Then revert.
- **Positive runs:**
  - `npm run check:smoke-safety` is green with the fixtures removed: 2/2 API and 1/1 UI smoke, with the scoped success
    line.
  - `npm run lint:tags` is OK with counts 2 and 1, which confirms the fixtures are gone.
  - `npm run test:unit` passes, with 43 plus the new tests (exact count recorded).
  - `npm run typecheck` passes.
  - `npm run verify` is green end to end, and the normal lanes still log no "seed skipped" line, so boot→seed→use is
    intact.
- **Acceptance mapping:**
  - boot→seed→use preserved: positive `verify`;
  - seed ownership: Steps 1, 3 and 4;
  - controlled mutations fail in either lane: MF-1 and MF-2;
  - normal smoke passes: positive runs;
  - widened snapshot: Steps 2 and 4, MF-1 and MF-2;
  - documented scope: Step 5 and its re-grep;
  - must-fail per lane recorded: Step 6.

## Gates

The project contract (`docs/project-contract.md`, `## Gates`), all five must pass:

```text
pwsh ./scripts/build-sut.ps1
docker compose up -d
pwsh ./scripts/gate.ps1
npm run verify
docker compose down
```

These need Docker and the ParaBank container. Docker storage is on `E:\_DockerData`, and about 8 GB of RAM is the real
limit, so check `docker ps` first and do not stop another session's containers. If memory is short, stop and ask.

**Recommendation: run them locally, and treat PR CI as confirmation.** Step 0 and MF-1 to MF-3 need a live SUT and
uncommitted fixtures that must never reach CI, so this item cannot rely on PR CI alone (unlike the two records-only items
before it). Run the five commands once, with the fixtures removed, as the final local gate, and end with
`docker compose down` so that no ParaBank container is left behind. Never pipe a gate command into `tail` (handover v5
durable lesson).

## Delivery

- **Branch:** `worklist/triage-02-smoke-safety`, cut from up-to-date `origin/main` in a scratchpad worktree, never in the
  shared checkout. This plan file and its `_index.md` row are the branch's first commit once approved.
- **One project PR:** the plan (approved), Steps 1 to 7, and the implementation log, with the commit message ending in
  the agreed `Co-Authored-By` line. The PR body cites the must-fail evidence and says which gates ran locally. The main
  session merges it only when every check is green; the agent does not merge.
- **Outcome follow-up (project), after the merge:**
  - append the plan's Outcome section;
  - set the `_index.md` row to `implemented` with the PR and merge SHA;
  - add backlog v36 recording TRIAGE-02 with PR CI, the merge and post-merge `main` CI. The backlog is written only
    with merge evidence in hand, so no "pending" line is created.
- **Root:** tick TRIAGE-02 in `WORKLIST_parabank-bank-automation.md` with the project merge SHA, on its own root branch
  and worktree, with the `tools/ci/check-support.ps1 -Only Docs` summary in the PR body.
- **Unblocks:** TRIAGE-11 and TRIAGE-16 (both touch seeding or `smoke-safety.mjs`).

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| D-T02-1 Mechanism | A per-lane comparison only; B runner-owned seed; C both | C | C (approved 2026-11-08) |
| D-T02-2 Reset hook during an owned run | ignore it; throw so the gate goes red | throw | throw (approved 2026-11-08) |
| D-T02-3 UI-lane must-fail mutation | $0.01 REST deposit inside the UI process after a UI login (D-4 wording; the UI has no deposit form); $0.01 UI transfer 12345 → 12456 with the existing A3 steps | REST deposit (UI transfer optional as an extra proof) | REST deposit; UI transfer optional (approved 2026-11-08) |
| D-T02-4 Must-fail fixtures | temporary, local, never committed (D-4); a permanent opt-in self-test mode run in CI | temporary | temporary (approved 2026-11-08) |
| D-T02-5 Request deadlines for the snapshot reads | now; leave to TRIAGE-16, whose acceptance names them | TRIAGE-16 | left to TRIAGE-16 (approved 2026-11-08) |
| D-T02-6 Gates | five-command contract locally plus PR CI; PR CI only | locally plus PR CI | locally plus PR CI (approved 2026-11-08) |
| D-T02-7 Backlog write | in the implementation PR; in the outcome follow-up with merge evidence | outcome follow-up | outcome follow-up (approved 2026-11-08) |
| D-T02-8 Design doc §5.9 | wording amendment in the same PR (v1.12; smoke set and count unchanged); leave to TRIAGE-05 | same PR | same PR, v1.12 (approved 2026-11-08) |

## Outcome

Not yet delivered.
