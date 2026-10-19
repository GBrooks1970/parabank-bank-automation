---
version: 2
created: 2026-10-19T21:28Z
project: parabank-bank-automation
type: implementation-plan
item: PB-STYLE-03 (proposed new backlog item)
status: approved
approved: 2026-10-19, owner (Gary Brooks), v2 with D1–D4 as recommended
delivered: not yet
language: en-GB
---

# Implementation plan: PB-STYLE-03 — run test-style-02/03 against the live demo on request, safely

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
