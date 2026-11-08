---
version: 1
created: 2026-11-08T06:05Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-01 (approved worklist item; proposed backlog candidate)
status: implemented
approved: 2026-11-08, owner (Gary Brooks), "Approved both" (relayed by the coordinating session); D-T01-1 to D-T01-5 as recommended; the main session merges the project PR only when every check is green
delivered: PR #60, merge commit adb9b51 (2026-11-08); implementation commit 594119e
language: en-GB
---

# Implementation plan: TRIAGE-01, update the locked fast-uri past its advisories

**Goal.** Move the dev-only transitive `fast-uri`, reached through `ajv`, from the locked 3.1.5 to a release outside
every applicable advisory range, with no broad upgrade and no forced audit fix. Inspect the exact lock diff, prove
the advisory is present before and absent after, and keep FR-B1's schema validation (the only `ajv` user) green.

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`, item TRIAGE-01 (approved 2026-09-30; carried into the 2026-11-06
  section).
- Codex v2 review R-03 and Claude v1 review R-04 (MEDIUM, 12).
- The precedent is PBR-03 (`docs/backlog.md:926-956`): a lockfile-only transitive fix, `brace-expansion` 5.0.7 →
  5.0.9, PR #28 (`5bd3674`).

## Evidence gathered before planning

All of this ran on 2026-11-08 in a scratchpad worktree of `main` at `a9c9872` (#59), with Node 24.18.0 and npm
11.16.0. `npm ci` exited 0 and added 220 packages. Its esbuild postinstall was reported as "not yet covered by
allowScripts" and deliberately **not** approved. The lock preview ran on copies of `package.json` and
`package-lock.json` in a separate scratchpad folder. Nothing in the repository changed.

| Finding | Consequence for the plan |
|---|---|
| `npm audit` (exit 1): **11 vulnerabilities (1 low, 3 moderate, 7 high)**. | This is the "before" baseline. Its counts are per package, not per advisory (`docs/implementation-logs/2026-10-19_pb-style-02-test-style-03.md:114`), so the proof compares named advisories. |
| `npm ls fast-uri`: one node only, root → `ajv@8.20.0` → `fast-uri@3.1.5`. `ajv` declares `"fast-uri": "^3.0.1"`. `package.json` has `"ajv": "^8.20.0"`, `"ajv-formats": "3.0.1"` and no `overrides` block. The lock entry is `node_modules/fast-uri` (`package-lock.json:2013-2015`, `"dev": true`). | A patched 3.x satisfies `^3.0.1`, so a **lockfile-only** update is possible. No direct dependency or override is needed. |
| `fast-uri` audit range **3.0.0 - 3.1.8**, ten advisories. HIGH: GHSA-5jgf-p345-68v8 (>=3.1.3 <3.1.6), GHSA-f65p-4m7j-42xc (<3.1.6), GHSA-fph4-wmhf-6fwf (>=3.1.2 <3.1.6), GHSA-jqff-g426-hqxp (<3.1.6), GHSA-qw65-cvwx-89v3 (<3.1.7). MODERATE: GHSA-hrr3-gc8f-f4qj (<3.1.8), GHSA-w74x-v6f9-j3xg (<3.1.9), GHSA-wjr9-j795-jxcr (>=3.1.3 <3.1.9). LOW: GHSA-xhq7-xmqj-769h (<3.1.9), GHSA-333x-w4r6-6crp (<3.1.9). | The safe version is **3.1.9 or later**. The worklist's "3.1.6 alone is insufficient; below 3.1.7" is confirmed and now extended: 3.1.7 and 3.1.8 are also affected. |
| `npm view fast-uri`: `dist-tags.three` = **3.1.9**, published 2026-10-19 (20 days before this plan); `latest` = 4.2.3. | Target **3.1.9**, the newest 3.x. Version 4.x is outside `ajv`'s `^3.0.1` and would need an override, so it is rejected. |
| Preview (`npm update fast-uri --package-lock-only --ignore-scripts` on copied manifests): exit 0. The lock diff is **exactly 3 lines** in `node_modules/fast-uri` (`version` 3.1.5 → 3.1.9, plus `resolved` and the new `integrity` `sha512-hS/0Wt3Y…ziVyJQ==`), and `package.json` is unchanged. A lock-only audit of the preview gives **10 vulnerabilities (1 low, 3 moderate, 6 high)**, with `fast-uri` absent. | The change is mechanical and narrow. The real execution must reproduce this diff exactly. |
| `ajv` is used only in `src/api/spec-conformance.ts:1-2,68-69` (`new Ajv({ strict: false, allErrors: true, validateFormats: true })` plus `addFormats`), which validates FR-B1 responses against the live OpenAPI spec. `ajv` uses `fast-uri` to resolve `$id`/`$ref`. | The functional risk sits in FR-B1. The unit test `tests/unit/spec-conformance.test.ts` (SUT-independent) and the API lane's FR-B1 matrix (needs the SUT; runs in PR CI) cover it. |
| `.github/workflows/ci.yml:44` runs `npm ci` from the lock, and `:50` runs `npm run verify` after build, boot and gate. | PR CI runs the full five-command contract on the updated lock. |
| PBR-03 precedent (`docs/backlog.md:943-956`): the lockfile-only fix was proven locally by clean `npm ci`, `npm audit` and `tsc`; the full contract ran in PR CI and post-merge `main` CI. | This plan follows that pattern (see Gates). |
| **TRIAGE-07 scope check** (worklist line 137). The audit now gives: `axios` 1.18.1, range 1.0.0 - 1.19.0, 12 advisories all fixed by **<1.20.0**, so the target is ≥ **1.20.0** (latest 1.21.0), not 1.18.1. `follow-redirects` 1.16.0, three HIGH advisories up to `<=1.16.1`, so the target is **1.16.2**, not 1.16.0. `brace-expansion` 5.0.9, three advisories up to `<5.0.12`, so the target is **5.0.12**, not 5.0.9. **New:** `deepmerge` 4.3.1 (GHSA-gcqx-w48m-w2h4, LOW, `<=4.3.1`) has **no patched release** (latest 4.3.1); its fix path is only `@serenity-js/playwright-test` 3.49.0. `glob` 13.0.6 / `minimatch` 10.2.5 (MODERATE) need `@cucumber/cucumber` 13, a major, which is already deferred. | TRIAGE-07's target versions are stale and must be corrected before it runs. The fix is to amend that item; nothing changes here. The `deepmerge` finding cannot be fixed inside the current majors while the Serenity/JS 3.44.1 exact pins stay; record it for TRIAGE-05's PBR-09. |

## Options

1. **A: lockfile-only, targeted update (recommended).** `npm update fast-uri --package-lock-only --ignore-scripts`,
   then `npm ci`. This gives the smallest diff (3 lock lines), adds no manifest change, and follows the PBR-03
   precedent. Version 3.1.9 satisfies `ajv`'s own range, so future installs keep it unless `ajv` changes.
2. **B: `overrides` entry** (`"fast-uri": "3.1.9"` in `package.json`). This guarantees the floor even if `ajv` is
   re-resolved, but adds a manifest rule that must be maintained and is unnecessary while `^3.0.1` admits 3.1.9.
   TRIAGE-07 will introduce `overrides` for packages that genuinely need them; reserve it for those.
3. **C: `npm audit fix`.** Rejected. In this tree it would also touch `brace-expansion`, `follow-redirects` and the
   Serenity/JS chain, which breaks the "limited to the named package" rule and front-runs TRIAGE-07.
4. **D: upgrade to `fast-uri` 4.x.** Rejected. It is outside `ajv`'s range, so it would need an override against
   `ajv`'s declared contract.

## Steps

1. **Branch and install.** Work in a scratchpad worktree from up-to-date `origin/main` on
   `worklist/triage-01-fast-uri` (this branch). Run `npm ci` and do not approve the esbuild script.
2. **Before evidence.** Save `npm audit --json` and `npm ls fast-uri`. Record the ten `fast-uri` advisory IDs and the
   totals (the must-fail baseline).
3. **Update.** Run `npm update fast-uri --package-lock-only --ignore-scripts --no-audit --no-fund`, then
   `npm ci --no-audit --no-fund` from the updated lock.
4. **Inspect the diff.**
   - `git diff --stat` must show `package-lock.json` only, with 3 insertions and 3 deletions.
   - `git diff package-lock.json` must touch only the `node_modules/fast-uri` entry (`version`, `resolved`,
     `integrity`).
   - `git diff --quiet package.json` must exit 0.
   - Anything else stops the item for review.
5. **After evidence.**
   - `npm ls fast-uri` must show `fast-uri@3.1.9`.
   - `npm audit --json` must show no `fast-uri` entry, with every other entry unchanged.
   - Record the new totals, expected 10 (1 low, 3 moderate, 6 high), and list the remaining advisories as TRIAGE-07,
     cucumber-13 or no-fix material.
6. **Local static gates.** Run `npm run typecheck` and `npm run test:unit`. The unit run includes
   `spec-conformance.test.ts`, which exercises `ajv` and so `fast-uri`. The expected count is 50/50.
7. **Implementation log.** Write `docs/implementation-logs/2026-11-DD_triage-01-fast-uri-lock-update.md` from the
   template. It records the before and after audits, the exact lock diff, the gate results and the TRIAGE-07 scope
   findings.
8. **Plan index.** Set this row to `approved` on approval. It becomes `implemented` in the outcome follow-up.
9. **Commit and PR.** Commit `package-lock.json`, this plan, its `_index.md` row and the log, using a message file.
   Push with upstream set and open the project PR. The agent does not merge.

## Verification

- **Must-fail, before:** the `npm audit --json` baseline lists `fast-uri` (range 3.0.0 - 3.1.8) with the ten advisory
  IDs above. A small check script in the scratchpad (not committed) that exits 1 when `vulnerabilities["fast-uri"]`
  exists must exit **1** on the baseline.
- **Must-fail, after:** the same check must exit **0** on the updated tree, and `npm ls fast-uri` must print
  `fast-uri@3.1.9`.
- **Lock diff limited to `fast-uri`:** Step 4's three checks, with the diff pasted into the log.
- **No collateral change:** every non-`fast-uri` audit entry has the same package, range and advisory IDs before and
  after (comparing the two JSON files).
- **Functional:** `npm run typecheck`; `npm run test:unit` 50/50; PR CI runs the full contract, including the 14 API
  scenarios with the FR-B1 14-operation matrix, the 8 UI scenarios, smoke-safety and the report checks.
- **Acceptance mapping:**
  - compatible release outside every range: 3.1.9 and the after audit;
  - exact lock diff inspected: Step 4;
  - fresh audit: Steps 2 and 5;
  - affected unit, type and contract gates: Step 6 and PR CI;
  - evidence recorded: Step 7;
  - no broad upgrade or forced fix: Option A and Step 4.

## Gates

The project contract (`docs/project-contract.md`, `## Gates`) is: `pwsh ./scripts/build-sut.ps1`,
`docker compose up -d`, `pwsh ./scripts/gate.ps1`, `npm run verify` and `docker compose down`.

**Recommendation: rely on PR CI for the five-command contract.** Locally, run only `npm ci`, the two audits,
`typecheck` and `test:unit`, as PBR-03 did. Reasons:
- the change is three lock lines in a dev-only transitive package, with no source change;
- the only `ajv` call site has SUT-independent unit coverage that runs locally;
- the SUT-dependent FR-B1 matrix runs on the updated lock in PR CI (`ci.yml:44,50`) and again post-merge;
- no must-fail proof needs a live SUT.

A local five-command run remains available if the owner prefers it (D-T01-3). It needs Docker on `E:\_DockerData`
and about 8 GB of RAM, must not disturb other sessions' containers, and must end with `docker compose down`.

## Delivery

- **Project PR** from `worklist/triage-01-fast-uri`: the lock change, the approved plan, its `_index.md` row and the
  implementation log, with commit messages ending in the agreed `Co-Authored-By` line. The PR body cites the
  before/after audit, the 3-line diff and the local gates, and says that the five-command contract is PR CI's. The
  main session merges only when every check is green.
- **Outcome follow-up (project)**, after the merge and with merge evidence:
  - append the plan's Outcome;
  - set the `_index.md` row to `implemented`;
  - add backlog v37 recording TRIAGE-01 (PR CI, merge, post-merge `main` CI run and its real conclusion) and the
    corrected TRIAGE-07 target versions as an evidence note.
  - PBR-09 itself stays with TRIAGE-05.
- **Root:** tick TRIAGE-01 in `WORKLIST_parabank-bank-automation.md`, citing the merge SHA and the outcome PR. If
  D-T01-4 is approved, also amend TRIAGE-07's target versions there, as a dated amendment rather than a rewrite.
- **Unblocks:** TRIAGE-07 (same lockfile) and, after it, TRIAGE-15's clean audit step.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| D-T01-1 Mechanism | A lockfile-only targeted update; B `overrides` pin; C `npm audit fix`; D 4.x | A | A (approved 2026-11-08) |
| D-T01-2 Target version | 3.1.9 (newest 3.x, outside every range); a later 3.x if one is published before execution | 3.1.9, re-checked at execution | 3.1.9, re-checked at execution (approved 2026-11-08) |
| D-T01-3 Gates | local `npm ci`, audits, typecheck and unit tests, with PR CI for the five-command contract; the full contract locally as well | PR CI for the contract | PR CI for the contract (approved 2026-11-08) |
| D-T01-4 TRIAGE-07 targets | amend TRIAGE-07 in the root tick to axios ≥ 1.20.0, follow-redirects 1.16.2 and brace-expansion 5.0.12, and note deepmerge as having no in-major fix; leave TRIAGE-07 to correct itself at execution | amend in the root tick | amend in the root tick (approved 2026-11-08) |
| D-T01-5 Backlog write | outcome follow-up with merge evidence (v37); in the implementation PR | outcome follow-up | outcome follow-up, v37 (approved 2026-11-08) |

## Outcome

**Delivered 2026-11-08** as [#60](https://github.com/GBrooks1970/parabank-bank-automation/pull/60):
- implementation commit `594119e`, merge commit `adb9b51`;
- PR CI `sut-boot-gate` [run 42462812281](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/42462812281)
  passed on head `594119e`, running the full five-command contract on the updated lock;
- post-merge `main` CI [run 42463042460](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/42463042460)
  passed on `adb9b51` (`sut-boot-gate` and `Deploy GitHub Pages` both successful).

Evidence is in
[`../implementation-logs/2026-11-08_triage-01-fast-uri-lock-update.md`](../implementation-logs/2026-11-08_triage-01-fast-uri-lock-update.md).

**Delivered as planned (option A, lockfile only).**
- 3.1.9 was re-checked at execution as the newest 3.x.
- The lock diff was exactly the three lines of the `fast-uri` entry, and `package.json` was unchanged.
- The must-fail audit check exited 1 before (10 advisories, range 3.0.0 - 3.1.8) and 0 after.
- Audit totals went from 11 (7 high) to 10 (6 high), with no collateral change.
- `npm ci`, typecheck and `test:unit` 50/50 passed locally. The five-command contract ran in PR CI and post-merge CI,
  as D-T01-3 decided.

**Differences from the plan:** none.
- The esbuild install script was left unapproved during `npm ci`, as planned.
- Backlog v37, this Outcome and the index status were written in this follow-up (D-T01-5).
- The TRIAGE-07 target correction (D-T01-4) goes in the root worklist as a dated amendment.
