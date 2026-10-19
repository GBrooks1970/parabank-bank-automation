---
version: 3
created: 2026-10-19T21:28Z
project: parabank-bank-automation
type: implementation-plan
item: PB-STYLE-03 (proposed new backlog item)
status: approved
approved: 2026-10-19, owner (Gary Brooks), v2 with D1–D4 as recommended; v3 hardening on the owner's instruction ("Write plan v3 for #53 with the four hardening items, then implement it before merge")
delivered: not yet
language: en-GB
---

# Implementation plan: PB-STYLE-03 — run test-style-02/03 against the live demo on request, safely

**Changes in v3 (2026-10-19T22:02Z).** Before merging #53, the owner asked for confirmation that further changes to the main
lanes could not remove or delete live-demo data. The honest answer was no. v2 guards how the Cucumber lanes and
smoke-safety *read* their URL, not the destructive calls themselves. It also leaves `gate.ps1 -BaseUrl` and the perf lane's
`PARABANK_BASE_URL` unguarded. v3 adds four hardening items (section "v3 hardening" below) to the same PR. The v2 steps and
their Outcome evidence stand unchanged.

**Changes in v2 (2026-10-19T21:37Z).** The owner asked whether v1 was too complicated for its return; it was, in part. v2 keeps
the two safety changes and the overdraft skip, and drops the convenience layer. Running live stays a documented one-liner on the
existing `PARABANK_URL`. Removed from v1:
- the per-style `PARABANK_TARGET` resolver
- the `run-style.mjs` launcher and the `:live` npm scripts
- the refusal when `CI` is set
- remote-only timeout and retry tuning
- the target-aware style-03 report check and Serenity project name
- the `host.docker.internal` proof

That takes the change from about 15 touched files to about 7, with the same safety.

**Goal.** Let `test-style-02/` and `test-style-03/` run against the public ParaBank demo (`https://parabank.parasoft.com`)
**when explicitly directed**, by setting the existing `PARABANK_URL`. The local pinned Docker SUT stays the default and the only
target CI uses. Above all: **no lane may ever reset, wipe or re-configure a host that isn't the local SUT.** Today the main lanes would.

## Evidence gathered before planning

These are reads on `main` at `e7130f5` (#52; post-merge CI
[run 39327685933](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/39327685933) green), with no repository change.
The live-demo behaviour comes from the probe run on 2026-10-19 for the `sdet-technical-task` exercise (19:44:01Z–19:44:17Z).

| Finding | Consequence for the plan |
|---|---|
| Both style configs already read `process.env.PARABANK_URL ?? 'http://localhost:8090'` (`test-style-02/playwright.config.ts:13`, `test-style-03/playwright.config.ts:19`). | The parameter exists, so no new variable is needed. Running live is one documented command. |
| Both style `global-setup.ts` files POST `initializeDB` to whatever host `PARABANK_URL` names, unless `PARABANK_SKIP_RESET=1`. | Forgetting one variable would reset the shared public demo. The setup must **reset only a loopback host**. |
| **The main lanes read the same `PARABANK_URL`**: `features/support/world.ts:5` and `scripts/smoke-safety.mjs:6`. Their hooks call `initializeDB` before scenarios (`hooks.ts:14,22,33`), `@loan` hooks change admin parameters, the FR-B1 contract matrix exercises `cleanDB` (`contract-tasks.ts:59`), and smoke-safety seeds first (`smoke-safety.mjs:9`). | **A critical latent hazard**: a shell with `PARABANK_URL` exported at the demo, followed by `npm run verify`, would wipe, re-seed and re-configure the public site. The main lanes must refuse any host that isn't loopback. |
| The live demo matched the local SUT on 10/10 probe calls (valid transfer text, unknown source → 400 text, `amount=abc` → 404 empty, missing amount → 500, negative → 200, balance arithmetic, ledger row shape). The style-02-shaped UI test also passed live twice. | The assert-as-observed expectations should hold live. Step 0 probes the remaining cases. |
| Live state drifts: within a day, john's balances changed and the ledger held another user's identical $25 debit. The overdraft test moves the whole balance plus $1000 out of a funded account on every run. | Overdraft is **skipped on a remote host**, because it would drain the ≥ $100 CHECKING accounts every test needs. For the rare clash with a concurrent user, a live run can add `--retries=1` on the command line; this is documented, not configured. |

## Steps

**0. Live probe of the cases not yet probed live** (curl; about −$5 net on a john demo account):
- `fromAccountId` missing: expect 400, `Could not find account number 0 and/or …`
- unknown `toAccountId`: expect 400
- `fromAccountId=abc`: expect 404, empty
- a same-account transfer: expect 200 with the exact text

If anything differs from local, stop and put the expectation change to the owner.

**1. Main-lane guard** (the hazard fix):
- New `src/quality/target-guard.ts`:
  - `isLoopbackUrl(url)`: true only for hostnames `localhost`, `127.0.0.1` and `::1`
  - `assertLocalSut(url, purpose)`: throws a message explaining that the main lanes reset data, wipe it and change admin parameters, so they run only against the local pinned SUT
- Called before any request, in `features/support/world.ts` (when `BASE_URL` is computed) and in `scripts/smoke-safety.mjs` (before `seed()`).
- New `tests/unit/target-guard.test.ts`:
  - accepts `http://localhost:8090`, `http://127.0.0.1:8090` and `http://[::1]:8090`
  - rejects `https://parabank.parasoft.com`, `http://host.docker.internal:8090`, `http://192.168.1.10:8090` and `ftp://localhost`

**2. Reset only a loopback host** (`global-setup.ts`, in both styles, with the check written out in each, per DR-PB-12):
- **Loopback host:** reset as today, expecting 204. `PARABANK_SKIP_RESET=1` is still honoured.
- **Any other host:** **no reset**. Print one line: `ParaBank target is not the local SUT (<url>): no reset; tests move real money there`.

**3. Overdraft skipped on a remote host**, in both styles' `fund-transfer-api.spec.ts`, by adding one `test.skip(...)` line to that test:
```
test.skip(!isLocalTarget, 'live-skip: drains a funded demo account on every run');
```
`isLocalTarget` uses the same loopback rule as the style's `global-setup.ts`. A local run is unaffected: all 12 tests run, and the
style-03 report check stays strict, requiring 12/12 SUCCESS.

**4. Documentation.**
- Both style READMEs get a short "Run against the live demo" section:
  - the PowerShell and bash one-liners, using the npm script with no `--reporter` override
  - what the run does: no reset; 11 tests run and the overdraft one is skipped; real demo money moves
  - add `--retries=1` if a concurrent user causes a one-off failure
  - `check:style-03-report` applies to local runs only
- Both `.env.example` files: the `PARABANK_SKIP_RESET` advice changes, because remote hosts are never reset now.
- `docs/decision-register.md`: **DR-PB-13**, "Main lanes run only against a loopback host (guard); style folders may target a remote host, never reset it, and CI uses local only".
- `docs/design-document.md` v1.11: one line each in §5.5 (guard) and §5.11 (remote runs).
- `docs/backlog.md`: the PB-STYLE-03 item, plus a risk entry for the hazard, found while planning and resolved by this item.
- Plan `_index.md`: add a row.

**5. Post-delivery records.** Implementation log, walkthrough, the Outcome appended here, and the capability-matrix row (still
pending from PB-STYLE-01/02) in the root repo.

## Verification

1. **Local is unchanged:** `test:style-02` 12/12, `test:style-03` 12/12 and `check:style-03-report` OK. `npm run verify` green, with unit
   tests 36 → 36 + N and the same 3/14/8/8.
2. **Live run, both styles.** PowerShell: `$env:PARABANK_URL="https://parabank.parasoft.com"; npm run test:style-02`, then the same
   for style-03. Each gives **11 passed, 1 skipped**, and the output shows the "no reset" line.
3. **Guard must-fails:**
   - (a) With `PARABANK_URL=https://unreachable.invalid`, `npx cucumber-js --profile api` fails with the **guard message, not a DNS
     error**. That proves it stops before any request.
   - (b) `node scripts/smoke-safety.mjs` with the same URL fails the same way.
   - (c) The unit test fails if `isLoopbackUrl` is made to accept every host (checked by a temporary edit, then reverted).
4. **No reset on a remote host:** from the style `global-setup` code path itself, the unit-level rule plus the live run's "no reset"
   line. A direct proof against production isn't possible without resetting it.
5. `npm audit` unchanged (no new dependencies). `git diff --stat` touches only `src/quality/target-guard.ts`,
   `tests/unit/target-guard.test.ts`, `features/support/world.ts`, `scripts/smoke-safety.mjs`, both style `global-setup.ts` and
   `fund-transfer-api.spec.ts` files, both style READMEs and `.env.example` files, and `docs/`.
6. PR CI green on the final head, then the merge (only after every check result is green), then post-merge `main` CI green.

## Delivery

- Branch `feat/pb-style-03-live-demo-target` from `main` at `e7130f5`, one PR.
- Root-repo follow-up for the capability matrix, covering style-02, style-03 and the live option.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| D1 How "directed to live" is expressed | (a) the existing `PARABANK_URL`, with documented one-liners; (b) v1's `PARABANK_TARGET` + launcher + `:live` scripts | **(a)**: no new variable or tooling for an occasional run; (b) only saves typing | Recommended option, 2026-10-19 |
| D2 Main-lane hazard | (a) fix it in this PR with `assertLocalSut` + a unit test; (b) a separate PR first | **(a)**: this change gives a reason to export a remote URL, so it must make misuse impossible in the same change | Recommended option, 2026-10-19 |
| D3 Overdraft test on a remote host | (a) skip it on remote; (b) run it | **(a)**: one line per style, and it protects the shared demo's funded accounts | Recommended option, 2026-10-19 |
| D4 Decision record | (a) new DR-PB-13; (b) amend DR-PB-12 | **(a)**: the guard covers the main lanes, beyond the style folders | Recommended option, 2026-10-19 |

## v3 hardening (added 2026-10-19T22:02Z, before #53 merges)

**Goal.** Make "no lane resets, wipes or re-configures a non-local host" hold for **future** changes as well as today's code. Guard
the destructive operations themselves, close the two remaining entry points, and fail CI when a new destructive call site
appears outside the reviewed, guarded set.

### Evidence gathered (read-only, at `ac808bf`)

| Finding | Consequence |
|---|---|
| Every reset, wipe and admin call in code: `src/api/client.ts` (`initializeDB`, `cleanDB`, `setParameter`); `src/api/reset.ts` (`seedDatabase`, which POSTs `initializeDB`); `src/screenplay/contract-tasks.ts` and `features/ui/steps/ui.steps.ts:205` (through the client); `scripts/smoke-safety.mjs:12`; `scripts/gate.ps1:31`; `perf/src/parabank-load.ts:75,135`; `test-style-0{2,3}/global-setup.ts:21`. `src/api/soap.ts` has none. | Guarding the client methods and `seedDatabase()` covers every current **and future** TypeScript caller, whatever URL it's given. |
| `gate.ps1` takes `-BaseUrl` (default `http://localhost:8090`) and POSTs `initializeDB` to it. | Refuse a non-loopback `-BaseUrl`. CI calls it with no argument. |
| `scripts/run-perf.mjs:24` takes `PARABANK_BASE_URL` and starts k6 with `--network host`. The k6 script POSTs `initializeDB` twice. | Refuse a non-loopback URL in `run-perf.mjs` before k6 starts. The k6 script also checks itself in its init context, in case it's ever run directly. |

### Steps

1. **Guard the destructive operations.**
   - Call `assertLocalSut(this.baseUrl, …)` at the start of `ParaBankRestClient.initializeDB()`, `cleanDB()` and `setParameter()`, and of
     `seedDatabase()`. They throw before any `fetch`.
   - New unit tests stub `fetch`, so they prove no request is made: each of the four refuses `https://parabank.parasoft.com`, and the
     client still allows a loopback base URL.
2. **Guard the two remaining entry points.**
   - `gate.ps1`: just after `param(...)`, refuse a `-BaseUrl` whose host isn't `localhost` / `127.0.0.1` / `::1` (`exit 1`, with a message citing DR-PB-13).
   - `scripts/run-perf.mjs`: `assertLocalSut(baseUrl, 'The perf lane')` before any Docker call. `perf:run` moves from `node` to `tsx`, so
     it can import the TypeScript guard, as `check:smoke-safety` does.
   - `perf/src/parabank-load.ts`: an init-context check, `throw new Error(...)` when `BASE` isn't a loopback http(s) URL. k6 can't
     import the Node guard, so this is a small regex (an exception to the single-guard rule, noted in a code comment).
3. **Architecture test** `tests/unit/destructive-call-sites.test.ts`.
   - It scans the source (`src/`, `features/`, `scripts/`, `perf/src/`, `test-style-02/`, `test-style-03/`; extensions `.ts` `.mjs`
     `.js` `.ps1`; excluding `node_modules`, `target`, `perf/dist` and `tests/unit` itself) for `initializeDB`, `cleanDB` and `setParameter`.
   - Each matching file must be in a reviewed allowlist, which maps the file to the **guard marker** it must still contain, with a reason.
   - It fails if a new file mentions a destructive operation, if a listed file loses its marker (the guard was removed), or if a listed
     file no longer exists (a stale list).
4. **Re-verify** (below).

### Verification

1. Unit: 38 + new tests, all green. **Must-fail checks** (reverted after each):
   - (a) remove the guard line from `client.initializeDB` → the client unit test fails, and the architecture test fails (marker missing)
   - (b) add an unlisted file that calls `initializeDB` → the architecture test fails, naming the file
2. `gate.ps1 -BaseUrl https://parabank.parasoft.com` refuses with exit 1 before any request. The default run still gives `GATE PASS`.
3. `PARABANK_BASE_URL=https://parabank.parasoft.com/parabank/services/bank npm run perf:run` refuses before Docker starts. A local
   `npm run perf` still produces its summary, run against the local container.
4. `npm run verify` green (unit 38 + N, 3/14/8/8). Local style-02 and style-03 12/12. The style code is unchanged in v3, so the live
   runs aren't repeated.
5. PR #53 CI green on the final head, and merged only after every check result is green.

### Decisions

None are open. The owner chose all four items. Implementation choices are recorded in the Outcome: `perf:run` under `tsx`, and the
k6-side regex.

## Outcome

Implemented 2026-10-19 on branch `feat/pb-style-03-live-demo-target`, from `main` at `e7130f5`. PR and merge evidence are in
`docs/backlog.md` PB-STYLE-03 and the index row.

**Step 0 live probe** (2026-10-19T21:41:33Z–21:41:36Z, `https://parabank.parasoft.com`). All four match local:

| Request | Live |
|---|---|
| `fromAccountId` missing | 400 `text/plain`, `Could not find account number 0 and/or 12678` |
| unknown `toAccountId` | 400, `Could not find account number 12789 and/or 99999` |
| `fromAccountId=abc` | 404, empty body |
| same account | 200, `Successfully transferred $5 from account #12789 to account #12789` |

**Differences from the plan, and why:**
- **`check:smoke-safety` now runs with `tsx`, not `node`** (a `package.json` script change the v2 file list didn't name). The `.mjs`
  script imports the TypeScript guard, so it uses the single unit-tested `assertLocalSut` instead of a duplicate. `tsx` already runs
  `lint:tags` and `check:report`.
- **The loopback rule lives in each style's `playwright.config.ts`** as `IS_LOCAL_TARGET`, next to the existing `PARABANK_URL`. The
  style's `global-setup.ts` and spec import it from there, so there is no new file per style. Styles still share no code with each other
  or with the main lanes (DR-PB-12).
- **The guard's message names the fix** ("use test-style-02 or test-style-03") and DR-PB-13, so a refused run explains itself.
- **Verification step 4** was met from the local side: during the two local runs the container's Tomcat access log showed exactly 2
  `initializeDB` calls (one per suite). The live runs printed the "no reset" line. As the plan said, resetting production was never an
  option for proof.

**Verification evidence** (local, Windows, Node 24.18.0, Docker 29.0.1; live = `https://parabank.parasoft.com`):
- `npm run typecheck`, `typecheck:style-02` and `typecheck:style-03` all exit 0. Unit tests **38/38** (36 + 2 new).
- **Local:** style-02 12/12 (11.0 s), style-03 12/12 (16.5 s), `check:style-03-report` OK, 2 `initializeDB` in the container log.
- **Live** (2026-10-19T21:44:31Z–21:45:32Z): style-02 **11 passed, 1 skipped** (14.1 s) and style-03 **11 passed, 1 skipped** (40.9 s). Each
  printed `ParaBank target is not the local SUT (https://parabank.parasoft.com): no reset; tests move real money there.`
- **Must-fail:**
  - (a) `PARABANK_URL=https://unreachable.invalid` made `cucumber-js --profile api` fail with `The Cucumber lanes refuses PARABANK_URL=…`,
    with no DNS error, so it stopped before any request. With the demo URL, the UI lane fails the same way.
  - (b) `check:smoke-safety` with the same URL gave `The smoke-safety check refuses …`, exit 1.
  - (c) With `isLoopbackUrl` forced to `true`, both new unit tests failed (36 pass, 2 fail). Restored, it is 38/38 again.
  - Extra: after a live run, `check:style-03-report` fails, naming the SKIPPED overdraft scenario. This shows the check stays strict
    and live runs can't stand in for CI evidence.
- `npm run verify` exit 0 in 49.0 s: unit 38/38; tag lint OK; smoke 2 + 1, with smoke-safety OK under `tsx` and the seed byte-identical;
  API 14/14; UI 8/8; report OK on 8.
- `npm audit`: unchanged (no dependency change).

Implementation log: [`../implementation-logs/2026-10-19_pb-style-03-live-demo-target.md`](../implementation-logs/2026-10-19_pb-style-03-live-demo-target.md).
Walkthrough: [`../walkthroughs/2026-10-19_pb-style-03-live-demo-target.md`](../walkthroughs/2026-10-19_pb-style-03-live-demo-target.md).

### Outcome — v3 hardening (2026-10-19, before #53 merges)

Delivered on the same branch, after the v2 commits (`70d3ed5`, `ac808bf`).

**What changed:**
- `src/api/client.ts`: `initializeDB`, `cleanDB` and `setParameter` call `assertLocalSut(this.baseUrl, …)` first.
- `src/api/reset.ts`: `seedDatabase()` calls `assertLocalSut(baseUrl, 'seedDatabase')` first.
- `scripts/gate.ps1`: refuses a non-loopback `-BaseUrl` with `GATE REFUSED: … (DR-PB-13)` and exit 1, before the wait loop.
- `scripts/run-perf.mjs`: `assertLocalSut(baseUrl, 'The perf lane')` before any Docker call. `perf:run` now runs under `tsx`.
- `perf/src/parabank-load.ts`: an init-context loopback regex that throws. It's a deliberate, commented duplicate, because k6 can't import the Node guard.
- New `tests/unit/destructive-operations-guard.test.ts` (3 tests; `fetch` is stubbed and must see **no** request for a remote host) and
  `tests/unit/destructive-call-sites.test.ts` (2 architecture tests over 13 reviewed files, each with its guard marker).

**Differences from the v3 steps, and why:**
- **The client's allowlist entry requires all three method guards by name.** Must-fail (a) showed that with one generic marker,
  removing the `initializeDB` guard alone left the architecture test green; only the client unit test caught it. With the
  per-method markers, the same edit fails both.
- **The guard message names `PARABANK_URL` even for the perf lane,** whose variable is `PARABANK_BASE_URL`. It was left unchanged
  because the v2 evidence quotes it. A wording fix can come later without changing behaviour.

**Verification evidence** (local, Windows, Node 24.18.0, Docker 29.0.1):
- Unit **43/43** (38 + 5). Typechecks pass. `npm run perf:build` bundles the k6 check.
- **Must-fail:**
  - (a) guard line removed from `client.initializeDB`: the client unit test **and** the architecture test fail, the latter with
    `src/api/client.ts lost its guard (expected to contain: assertLocalSut(this.baseUrl, 'ParaBankRestClient.initializeDB'))`
  - (b) an unlisted `src/api/unguarded-probe.ts` calling `initializeDB`:
    `New destructive call site(s): src/api/unguarded-probe.ts. Guard them … (DR-PB-13).`
- `gate.ps1 -BaseUrl https://parabank.parasoft.com`: `GATE REFUSED …`, exit 1. Default `gate.ps1`: `GATE PASS`, exit 0.
- `PARABANK_BASE_URL=https://parabank.parasoft.com/… npm run perf:run`: refused by the guard, exit 1, before Docker. Running the k6
  bundle directly with that URL also refuses: `The perf lane refuses PARABANK_BASE_URL=https://parabank.parasoft.com/parabank/services/bank`.
- Local `npm run perf`: both scenarios ✓, summary written, exit 0 (63 s). The regenerated `perf/report/` files were restored, so this
  branch doesn't change the nightly lane's committed evidence.
- `npm run verify` exit 0 (81.8 s): unit 43/43; tag lint OK; smoke 2 + 1, seed byte-identical; API 14/14; UI 8/8; report OK on 8.
- Local `test:style-02` 12/12 and `test:style-03` 12/12; `check:style-03-report` OK. The style code didn't change in v3, so the live runs weren't repeated.

Walkthrough: [`../walkthroughs/2026-10-19_pb-style-03-v3-hardening.md`](../walkthroughs/2026-10-19_pb-style-03-v3-hardening.md).
