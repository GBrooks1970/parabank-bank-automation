---
version: 1
created: 2026-11-08T10:41Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-07 (approved worklist item; proposed backlog candidate)
status: approved
approved: 2026-11-09 (owner)
delivered: not yet
language: en-GB
---

# Implementation plan: TRIAGE-07, clear the axios, follow-redirects and brace-expansion advisories inside their current majors

**Goal.** Clear every HIGH `npm audit` advisory left after TRIAGE-01. These sit in the dev-only transitive `axios`,
`follow-redirects` and `brace-expansion`. Each moves to a patched release inside its current major. The Serenity/JS
`3.44.1` exact pins stay as they are, with no `@cucumber/cucumber` 13 upgrade and no forced audit fix. The lock diff
must be limited to the named packages, and every lane that uses them must stay green.

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-07, plus the dated amendment of 2026-11-08 (D-T01-4,
  owner-approved; root `main` `ca6d545`/`6fbb8b6`) that corrected its targets to `axios` ≥ 1.20.0,
  `follow-redirects` 1.16.2 and `brace-expansion` 5.0.12.
- Claude v1 review R-04 (MEDIUM, 12).
- Precedents:
  - PBR-03 (`docs/backlog.md`): `brace-expansion` 5.0.7 → 5.0.9 with a lockfile-only update;
  - TRIAGE-01 (#60, `adb9b51`): `fast-uri` 3.1.5 → 3.1.9 with a lockfile-only update.

## Evidence gathered before planning

All of this ran on 2026-11-08 in a scratchpad worktree of `origin/main` at `cb8d040` (`aa9cb2a` plus the nightly perf
bot commit, which touches only `perf/report/`), with Node 24.18.0 and npm 11.16.0. `npm ci` exited 0; the esbuild
install script was not approved. Previews ran on copies of `package.json` and `package-lock.json` in two separate
scratchpad folders, each also installed with `npm ci --ignore-scripts`. Nothing in the repository changed.

| Finding | Consequence for the plan |
|---|---|
| Fresh `npm audit` (exit 1): **10 vulnerabilities (1 low, 3 moderate, 6 high)**. The HIGH entries are `axios`, `follow-redirects`, `brace-expansion` and the three Serenity/JS packages, which are flagged only through `axios`. | This is the "before" baseline. The proof compares named advisories, not totals. |
| `axios` 1.18.1, range 1.0.0 - 1.19.0, **12 advisories, all fixed by 1.20.0**: GHSA-vh66-26gq-q6x8, -9fr6-4gfg-395g, -c29m-xwm3-cm6r, -mghh-pgcx-3jjj, -x97p-jq2g-jp4f, -3pq3-5fj3-cg6v, -542g-h47m-68v8, -j8rh-479h-cp32, -4hqw-qxg8-jxx2, -m8m8-qj5v-23w3, -44g4-m2mj-wpvx and -r4gj-5m52-g5wh (seven HIGH, five MODERATE). | Target **1.20.0 or later**. This confirms the amendment. |
| `npm ls`: `axios@1.18.1` is a dependency of `@serenity-js/playwright-test`, `@serenity-js/rest` and `@serenity-js/serenity-bdd` (all 3.44.1), and **each declares `"axios": "1.18.1"` exactly**. | No lockfile update can move `axios`. **An `overrides` entry is required.** |
| Upstream `@serenity-js/rest`, `serenity-bdd` and `playwright-test` **3.49.0 each declare `"axios": "1.20.0"` exactly**. `axios` 1.20.0 was published 2026-08-26 and 1.21.0 on 2026-10-27, which is 12 days before this plan. | Override to **exactly 1.20.0**: the version Serenity/JS itself now ships with, and well over two weeks old. 1.21.0 is newer than needed and younger than the portfolio's two-week age rule for new versions. |
| `follow-redirects` 1.16.0 (a dependency of `axios`, declared as `^1.16.0`), three HIGH advisories up to 1.16.1 (GHSA-q3jh-wrc6-jgq8, -8r9p-f939-6h3c, -mrwp-f3q8-3g9p). 1.16.2 was published 2026-10-25, 14 days ago. | **1.16.2** is inside `^1.16.0`, so it can be reached with a lockfile update. It is the only patched release, so its age is accepted as the minimum available. |
| `brace-expansion` 5.0.9 (`@cucumber/cucumber` → `glob@13.0.6` → `minimatch@10.2.5`, which declares `^5.0.5`), three advisories below 5.0.12 (GHSA-q2hr-2g5m-vwhr, -qhr7-859c-m2p7, -6j4f-fj2g-mc7p). 5.0.12 was published 2026-09-14. | **5.0.12** is inside `^5.0.5`, so it can be reached with a lockfile update. |
| **Preview H (hybrid):** `"overrides": { "axios": "1.20.0" }`, then `npm install --package-lock-only --ignore-scripts` and `npm update follow-redirects brace-expansion --package-lock-only --ignore-scripts`. **Preview A (all three overridden):** `axios` 1.20.0, `follow-redirects` 1.16.2 and `brace-expansion` 5.0.12. **Both give the same lock diff: 10 insertions and 10 deletions.** That is `version`, `resolved` and `integrity` for `axios`, `brace-expansion` and `follow-redirects`, plus `axios`'s own declared `form-data` range (`^4.0.5` → `^4.0.6`, already satisfied by the locked `form-data`). There are no new packages; `https-proxy-agent` and `proxy-from-env` were already locked. `npm ci` and **`npm ls --all` exit 0** in both. | The lock change is the same for either option. The difference is only how many override rules `package.json` carries. |
| A lock-only audit of either preview gives **5 vulnerabilities (2 low, 3 moderate, 0 high)**. What remains: `deepmerge` (LOW); `@serenity-js/playwright-test` (now LOW, only through `deepmerge`); and `glob`, `minimatch` and `@cucumber/cucumber` (MODERATE, which need the deferred `@cucumber/cucumber` 13). | Every HIGH advisory clears. The remainder is either out of scope or has no fix. |
| **Correction to the D-T01-4 amendment:** `@serenity-js/playwright-test` **3.49.0 still declares `"deepmerge": "4.3.1"`**, and 4.3.1 is the latest `deepmerge`. The audit's "fix available: 3.49.0" for `deepmerge` comes from the `axios` chain, not from `deepmerge`. | `deepmerge` GHSA-gcqx-w48m-w2h4 currently has **no fix path at all**, not even a Serenity/JS upgrade. TRIAGE-05's PBR-09 must record this; the root amendment's "only fix is 3.49.0" wording should be corrected in the root tick. |
| Where the packages are used. `axios` serves `@serenity-js/rest` `CallAnApi`, used only in `test-style-03` (API tests, endpoints, questions and tasks, in CI step "Test style 03"), and `@serenity-js/serenity-bdd`'s jar download (`scripts/report.mjs:29`, `scripts/report-style-03.mjs`, run only where Java exists, which is CI). `follow-redirects` is `axios`'s Node redirect handler. `brace-expansion` is used by Cucumber's feature-path globbing in both main lanes. | The SUT and Java paths run in PR CI. Locally, `npx serenity-bdd update` downloads the CLI jar through `axios` and `follow-redirects` with no SUT, which makes it a useful functional probe if it runs without Java. |
| `package.json` has no `overrides` block today. `ci.yml` installs with `npm ci` from the lock and runs `verify`, then the style-02 and style-03 steps and the report checks. | The override adds a new block. CI exercises every consumer. |

## Options

1. **H: hybrid (recommended).** Add `"overrides": { "axios": "1.20.0" }`. `axios` is the only package an override is
   needed for, because of the exact pins. Move `follow-redirects` and `brace-expansion` by a targeted lockfile update,
   as TRIAGE-01 and PBR-03 did. This keeps one override rule, leaves nothing to drift stale for the in-range packages,
   and produces the same lock diff as option A.
2. **A: override all three** (`axios` 1.20.0, `follow-redirects` 1.16.2, `brace-expansion` 5.0.12). This matches the
   worklist acceptance wording literally ("`package.json` `overrides` move…"). It also guarantees the floor if the lock
   is ever regenerated. However, it adds two rules that do nothing today, and those rules can later hold back a newer
   patched release unless someone maintains them. Choose A if the owner wants the acceptance satisfied word for word.
3. **U: upgrade Serenity/JS to 3.49.0.** Rejected for this item. It moves 10 direct dependencies and breaks the
   approved "keep the 3.44.1 exact pins" constraint, and it still leaves `deepmerge` unfixed. It is a separately
   reviewed upgrade candidate.
4. **F: `npm audit fix`.** Rejected. It would choose the Serenity/JS upgrade path and is not limited to the named
   packages.

## Steps

1. **Install.** Fresh scratchpad worktree from up-to-date `origin/main` on `worklist/triage-07-in-major-overrides`;
   `npm ci`; do not approve the esbuild script.
2. **Before evidence.**
   - Save `npm audit --json` and `npm ls axios follow-redirects brace-expansion`.
   - Run the scratch must-fail check (see Verification) and record its exit code, expected 1.
   - Re-check the targets: `npm view axios@1.20.0`, `follow-redirects dist-tags` and `brace-expansion dist-tags`. If a
     newer patched release, or a new advisory against a target, has appeared, stop and re-plan.
3. **Override (option H).** Add an `overrides` block after `devDependencies` in `package.json`:
   `"overrides": { "axios": "1.20.0" }`. Edit only this; leave the formatting and order of the other keys untouched.
4. **Lock.**
   - `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`
   - `npm update follow-redirects brace-expansion --package-lock-only --ignore-scripts --no-audit --no-fund`
   - then `npm ci --no-audit --no-fund`
5. **Inspect the diff.**
   - `git diff --stat` must show only `package.json` and `package-lock.json`.
   - `package.json` gains exactly the `overrides` block.
   - The lock diff must be the 10 lines previewed: `axios` 1.18.1 → 1.20.0 (with its `form-data` range line),
     `brace-expansion` 5.0.9 → 5.0.12 and `follow-redirects` 1.16.0 → 1.16.2.
   - Anything else stops the item for review.
6. **After evidence.**
   - `npm ls axios follow-redirects brace-expansion` shows `axios@1.20.0 overridden`, `follow-redirects@1.16.2` and
     `brace-expansion@5.0.12`.
   - `npm ls --all` exits 0.
   - The fresh `npm audit --json` has no entry for the three packages and **0 high**.
   - Record the remainder (5: 2 low, 3 moderate) and its owner: `deepmerge` has no fix (PBR-09 under TRIAGE-05), and
     `glob`/`minimatch`/`@cucumber/cucumber` wait for the deferred Cucumber 13 upgrade.
7. **Local gates.**
   - `npm run typecheck`, `npm run typecheck:style-02` and `npm run typecheck:style-03`;
   - `npm run test:unit`, 50/50;
   - `npm run lint:tags`, which globs feature files through `brace-expansion`;
   - **Best effort:** `npx serenity-bdd update --artifact net.serenity-bdd:serenity-cli:jar:4.3.4` downloads the CLI
     jar through `axios` 1.20.0 and `follow-redirects` 1.16.2. Record the outcome. If it insists on Java, record that
     and rely on CI.
8. **Implementation log.** Write `docs/implementation-logs/2026-11-DD_triage-07-in-major-overrides.md` from the
   template, with the before and after audits, the exact diffs, the gate results, and the `deepmerge` correction.
9. **Plan index.** Set this row to `approved` on approval; it becomes `implemented` in the outcome follow-up.
10. **Commit and PR.** Commit `package.json`, `package-lock.json`, this plan, its `_index.md` row and the log, using a
    message file. Push with upstream set and open the project PR. The agent does not merge.

## Verification

- **Must-fail check (scratch script, not committed).** It exits 1 while `npm audit --json` has an entry for `axios`,
  `follow-redirects` or `brace-expansion`, or while `metadata.vulnerabilities.high > 0`.
  - **Before:** it must exit 1, naming all three packages and 6 high.
  - **After:** it must exit 0.
- **Override effective:** `npm ls` marks `axios@1.20.0 overridden` under all three Serenity/JS packages, with a single
  deduplicated copy. `npm ls --all` exits 0.
- **Diff limited:** Step 5's checks, with both diffs pasted into the log.
- **No collateral change:** for every audit entry other than the three targets and the Serenity/JS entries flagged
  through `axios`, the package, range and advisory IDs are the same before and after. `@serenity-js/playwright-test`
  is expected to fall from HIGH to LOW, because it remains flagged only through `deepmerge`.
- **Functional, PR CI:** the five-command contract (`verify`: 14 API scenarios, 8 UI scenarios, smoke-safety and the
  report checks with HTML), `test:style-02` 12/12, `test:style-03` 12/12 (the `CallAnApi` path on `axios` 1.20.0),
  and `check:style-03-report`.
- **Acceptance mapping** (worklist TRIAGE-07 plus the 2026-11-08 amendment):
  - the three packages are on patched in-major releases: Steps 3, 4 and 6;
  - Serenity/JS pins intact: Step 5, with only an `overrides` block added;
  - lock diff inspected and limited: Step 5;
  - no high advisory for the three: Step 6 and the must-fail check;
  - typecheck and unit locally;
  - both lanes, style-02, style-03 and `check:style-03-report` in PR CI;
  - no Cucumber 13 upgrade: Option H.
  - The acceptance's literal "`overrides` move … `follow-redirects` … `brace-expansion`" is satisfied only by option A.
    Option H meets its intent (patched in-major releases, a limited diff) and is put to the owner as D-T07-1.

## Gates

The project contract is `pwsh ./scripts/build-sut.ps1`, `docker compose up -d`, `pwsh ./scripts/gate.ps1`,
`npm run verify` and `docker compose down`.

**Recommendation: rely on PR CI for the five-command contract and the style steps**, as approved for TRIAGE-01
(D-T01-3).
- There is no source change, and the locally runnable gates cover typecheck, unit and tag lint.
- The `axios` consumers are only reachable with the SUT (style-03 `CallAnApi`) or with Java (the Serenity BDD jar
  download), and CI has both.
- The best-effort local `serenity-bdd update` probe exercises the HTTP path without either.

This change is less trivial than TRIAGE-01: it is a minor-version jump of an HTTP client across 12 advisories. If
the owner wants local runtime evidence before the PR, the local contract plus `test:style-03` is the alternative
(D-T07-4). It needs Docker on `E:\_DockerData` and about 8 GB of RAM, must leave other sessions' containers alone,
and must end with `docker compose down`.

## Delivery

- **Project PR** from `worklist/triage-07-in-major-overrides` with the override, the lock, the approved plan, its
  index row and the implementation log. Commit messages end with the agreed `Co-Authored-By` line, and the PR body
  cites the before/after audit and the diffs. The main session merges only when every check is green.
- **Outcome follow-up (project):**
  - append the plan's Outcome;
  - set the index row to `implemented`;
  - add backlog v38 recording TRIAGE-07 with PR CI, the merge and the real post-merge `main` CI conclusion;
  - include an evidence note that `deepmerge` has no fix path (for PBR-09 under TRIAGE-05).
- **Root:**
  - tick TRIAGE-07, citing the merge SHA and the outcome PR;
  - add a dated correction to the D-T01-4 amendment's `deepmerge` sentence, since Serenity/JS 3.49.0 still ships
    `deepmerge` 4.3.1;
  - TRIAGE-15's audit step then starts from 0 high.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| D-T07-1 Mechanism | H: override `axios` only, plus a lockfile update for `follow-redirects` and `brace-expansion`; A: override all three; U: Serenity/JS 3.49.0 upgrade; F: `npm audit fix` | H (same lock diff as A, one rule instead of three) | approved (Option H hybrid: override `axios` only, in-range lock update for `follow-redirects` and `brace-expansion`) |
| D-T07-2 `axios` version | exact 1.20.0 (what Serenity/JS 3.49.0 ships, published 2026-08-26); exact 1.21.0 (12 days old); range `^1.20.0` | exact 1.20.0, re-checked at execution | approved (exact 1.20.0) |
| D-T07-3 `follow-redirects` age | accept 1.16.2 (14 days old, the only patched release); wait | accept 1.16.2 | approved (accept 1.16.2) |
| D-T07-4 Gates | local `npm ci`, audits, typechecks, unit and tag lint, plus the best-effort `serenity-bdd update` probe, with PR CI for the contract and style steps; also the local contract plus `test:style-03` | PR CI for the contract and style steps | approved (local gates + probe, PR CI for contract and style steps) |
| D-T07-5 `deepmerge` correction | correct the root D-T01-4 amendment in the TRIAGE-07 root tick and record it in backlog v38 for PBR-09; leave it to TRIAGE-05 | correct in the root tick and backlog v38 | approved (correct in root tick and backlog v38) |
| D-T07-6 Backlog write | outcome follow-up with merge evidence (v38); in the implementation PR | outcome follow-up | approved (outcome follow-up v38) |

## Outcome

Not yet delivered.
