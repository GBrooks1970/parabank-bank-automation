# Risks and Issues

[<- Back to Index](00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md)

**Reviewer:** AI assistant (Claude Opus 5.5)
**Date:** 2026-11-05T14:12Z
**Baseline:** `main` at `ccb74d5093c57bfdace8a6b7cfab8606ecddd35b` (clean working tree)

Scoring uses the backlog's own formula ([backlog.md](../../docs/backlog.md) (line 118)):
Security Impact (0-10) + Breakage Probability (0-10) + Maintenance Burden (0-10);
HIGH 20-30, MEDIUM 10-19, LOW 0-9. There is no HIGH finding. Four MEDIUM and six LOW
findings follow, ordered high to low.

Provenance note: R-01, R-04 and R-06 were first raised by the September review
(`.review/CODE_REVIEW_CODEX_v2_20260929T0630Z/`, its R-01, R-03 and R-04). Each was re-derived
here from current source and, where possible, current tool output, and each is still present at
`ccb74d5`. They are restated because they remain open, not because that review said so.

| # | Severity | Score | Title |
|---|---|---:|---|
| R-01 | MEDIUM | 15 | Smoke-safety proof cannot detect a mutating API `@smoke` scenario |
| R-02 | MEDIUM | 14 | The status of record contradicts the repository and an approved triage |
| R-03 | MEDIUM | 13 | Perf workflow runs third-party code with a `contents: write` token and pushes to `main` |
| R-04 | MEDIUM | 12 | `npm audit`: 11 advisories (7 high) with no backlog risk and no CI signal |
| R-05 | LOW | 9 | Main-lane report checks prove scenario presence, not scenario outcome |
| R-06 | LOW | 7 | UI money confirmations use truncated, unanchored substring oracles |
| R-07 | LOW | 6 | "Read-only against seed state" scenarios actually read post-mutation state |
| R-08 | LOW | 5 | Screenplay boundary leaks in the step glue; two actor systems per UI scenario |
| R-09 | LOW | 4 | REST client concatenates query values without URL encoding |
| R-10 | LOW | 4 | CI feedback latency and small reproducibility gaps |

---

## 1. R-01 - MEDIUM (15) - Smoke-safety proof cannot detect a mutating API `@smoke` scenario

**Priority Score:** Security (2) + Breakage (7) + Maintenance (6) = **15**

### Risk Description/Explanation

`check:smoke-safety` is the project's executable proof that `@smoke` is store-safe (design
doc section 5.9, magento C-01 lesson). It seeds, snapshots, runs the API smoke profile, runs the
UI smoke profile, then snapshots again. But every Cucumber process loads the shared
`features/support/hooks.ts`, whose `BeforeAll` unconditionally re-seeds. The UI process therefore
resets the datastore after the API smoke run and before the final snapshot, so any mutation made
by an API smoke scenario is erased before it can be observed. The header comment of the script
promises the opposite ("WITHOUT an intervening reset").

### Evidence Outline

- [smoke-safety.mjs](../../scripts/smoke-safety.mjs) (lines 1-3) states the no-reset promise;
  line 25 seeds, lines 28-31 run `api` then `ui`, line 33 takes the only post-run snapshot.
- [hooks.ts](../../features/support/hooks.ts) (lines 12-14): `BeforeAll` calls
  `seedDatabase(BASE_URL)` for every profile.
- [cucumber.js](../../cucumber.js) (lines 9 and 17): both profiles require
  `features/support/**/*.ts`.
- The snapshot covers only `GET /customers/12212/accounts`
  ([smoke-safety.mjs](../../scripts/smoke-safety.mjs) (line 18)); transactions, other customers and
  admin parameters are not observed.

```javascript
// scripts/smoke-safety.mjs (lines 25-33)
await seed();
const before = await snapshot();
for (const profile of ['api', 'ui']) {
  execSync(`npx cucumber-js --profile ${profile} --tags "@smoke"`, { stdio: 'inherit' });
}
const after = await snapshot();
```

### Impact Analysis

Two of the three smoke scenarios are API scenarios, so two-thirds of the store-safety claim is
not actually measured. Today's smoke steps are read-only by inspection (inference from
[b1-rest-contract.feature](../../features/api/b1-rest-contract.feature) (lines 7-12) and
[b3-rest-soap-parity.feature](../../features/api/b3-rest-soap-parity.feature) (lines 7-10)), so
this is a regression-detection defect, not evidence of a current mutation. It matters because the
gate is presented publicly as a proof, and because `@smoke` is the subset an operator would run
against a shared environment. The September review raised it; the root worklist approved it as
TRIAGE-02 on 2026-09-30; it is still unremediated.

### Refactor Recommendation and Strategy

- Snapshot after each profile, before the next process can reset: `before -> api -> snapshot
  -> ui -> snapshot`, comparing both against `before`.
- Alternatively let the safety runner own seeding: set an env flag (for example
  `PARABANK_SEED_OWNED=1`) that makes `BeforeAll` skip its seed, keeping boot->seed->use intact
  for every other caller.
- Widen the snapshot to the seeded customer's transactions for each account (cheap, same API).
- Add a must-fail proof: a temporary `@smoke` scenario that deposits $0.01 must turn the gate red
  in each lane. Record the proof in the implementation log, as the project already does for its
  other must-fail checks.

---

## 2. R-02 - MEDIUM (14) - The status of record contradicts the repository and an approved triage

**Priority Score:** Security (0) + Breakage (6) + Maintenance (8) = **14**

### Risk Description/Explanation

`docs/backlog.md` is declared the single source of truth, and the portfolio's orchestration
prompts read it first. At `ccb74d5` it is stale in several independent ways, and its headline
"Nothing requires action" is contradicted by the portfolio's own approved worklist.

### Evidence Outline

- **PB-STYLE-03 shown as pending although merged.** [backlog.md](../../docs/backlog.md) (line 16)
  reads "PB-STYLE-03 IMPLEMENTED, MERGE EVIDENCE PENDING" and line 768 "MERGE PENDING", with
  unticked closure boxes at lines 780-781. `git log` shows PR #53 merged as `bbca594`
  (2026-10-22), and that merge commit itself last edited the backlog.
- **PB-PIN-05 never closed; PB-PIN-06 absent.** The backlog's newest PB-PIN text (lines 19-34,
  109-110) leaves PB-PIN-05 "MERGE EVIDENCE PENDING". PB-PIN-06 was delivered in PRs #49
  (`25c83b8`) and #50 (`37c535f`) with a plan and log
  ([2026-10-07 log](../../docs/implementation-logs/2026-10-07_pb-pin-06-maven-builder-refresh.md)),
  but the backlog never mentions it (`grep PB-PIN-06 docs/backlog.md` returns nothing).
- **Approved remediation not recorded.** The root `WORKLIST_parabank-bank-automation.md`
  section "Extension (2026-09-30) - approved September review triage" holds six unchecked,
  owner-approved items (TRIAGE-01..05 plus PB-PIN-05). None is reflected in the backlog, whose
  Risk Summary ([backlog.md](../../docs/backlog.md) (lines 1004-1017)) reports 0 items requiring
  action. Three PB-STYLE items were delivered after that approval instead.
- **Self-noted dependency triage never done.** Line 32-34 says the `fast-uri` HIGH advisory "is
  recorded for separate backlog triage"; no such risk exists.
- **Other stale statements.** [README.md](../../README.md) (line 126) says the decision register
  holds "DR-PB-01...10" but it holds DR-PB-01..13
  ([decision-register.md](../../docs/decision-register.md) (lines 28-29)).
  [qa-strategy.md](../../docs/qa-strategy.md) (line 35) says non-functional testing is "Out of
  scope v1" although a nightly k6 lane exists; line 32 omits the target-guard, destructive
  call-site, Pages and perf-evidence unit areas. [docker-compose.yml](../../docker-compose.yml)
  (line 8) says "first boot self-seeds", contradicting DR-PB-06. The portfolio registry row
  (`portfolio-prompts/README.md` line 41) still cites backlog v30, 36 unit tests (43 now pass)
  and handover v5 (2026-09-02) as current.

### Impact Analysis

A cold-start agent following the house protocol (resume-session, derive-worklist) would read
"nothing requires action" and miss four open defects, then mis-state PB-STYLE-03 as unmerged.
For a portfolio whose selling point is evidence-backed status, the record of status is the
weakest artefact in the repo. Version-header formatting also drifts (`**Version:** 33` then bare
`v32`...`v29` lines, then `**Version:** 27`), which makes the history hard to parse by tools such
as the Kanban generator mentioned at line 42.

### Refactor Recommendation and Strategy

- One docs-only PR (v34): close PB-STYLE-03 with the #53 merge evidence; add and close PB-PIN-05
  and PB-PIN-06 entries with their PR/CI links; import TRIAGE-01..05 as scored risks (PBR-09
  onwards) so the Risk Summary is recomputed from real items; fix the README, QA strategy and
  compose comment lines cited above.
- Write handover v6 and refresh the registry row in the same cycle.
- Prevent recurrence cheaply: a unit test (the repo already parses its own docs in
  `check-tags.ts`) that fails when the backlog's top version line says "PENDING" for an item
  whose PR number appears in `git log` on `main`, or simply add "backlog reconciled" to the PR
  template checklist. The first option is stronger evidence; the second is simpler (KISS).

---

## 3. R-03 - MEDIUM (13) - Perf workflow runs third-party code with a `contents: write` token and pushes to `main`

**Priority Score:** Security (6) + Breakage (3) + Maintenance (4) = **13**

### Risk Description/Explanation

The nightly `perf` workflow grants `contents: write` at workflow level, checks out with the
default credential persistence, and then runs `npm ci` (dependency install scripts), esbuild,
`tsx` and a k6 container before its final step commits and pushes to `main`. Every step in the job
can therefore use a token that can write to the default branch. The same design produces a direct
bot push to `main` every night, outside the "branch -> PR -> CI green -> owner merges" house rule.

### Evidence Outline

- [perf.yml](../../.github/workflows/perf.yml) (lines 14-15): `permissions: contents: write`
  for the whole workflow.
- Line 30: `actions/checkout` without `persist-credentials: false`; lines 48-55 run `npm ci`,
  `perf:build` and `perf:run`; lines 65-77 `git commit` and `git push` to `main`.
- Line 67: `continue-on-error: true` "tolerate branch protection", which implies `main` is not
  protected against this push (inference; GitHub settings were not inspected).
- History: 82 of 189 commits on `main` (43 percent) are `github-actions[bot]`
  "refresh nightly performance-smoke summary" commits; the latest is `785c48d` on 2026-11-05.
- R-04 shows the installed tree currently carries 7 high advisories, which is the realistic
  route by which install-time code could misuse such a token (inference; no compromise is
  claimed).
- The September review's R-02 (stale committed `perf/report` attached to failed runs via
  lines 57-63 `if: always()`) is also still present.

### Impact Analysis

A compromised or typosquatted dev dependency executed during `npm ci` could push to `main`
without review. That is the classic supply-chain path that the project's own
[github-actions-pin-policy.md](../../docs/github-actions-pin-policy.md) works hard to close for
Actions, so the gap is inconsistent with the repo's stated least-privilege posture. Separately,
nightly commits drown functional history (`git log --oneline -10` at the baseline shows 8 bot
commits in 10).

### Refactor Recommendation and Strategy

- Split the workflow into two jobs: `perf-smoke` with `contents: read` and
  `persist-credentials: false` that uploads `perf/report` as an artifact; and a small `publish`
  job (`needs: perf-smoke`, `contents: write`) that downloads only that artifact and commits. No
  third-party code then runs while a write token exists.
- Better still (YAGNI permitting): stop committing. Have `deploy-pages` in `ci.yml` fetch the
  latest successful `perf-summary` artifact by API, or publish perf to Pages from its own
  workflow. This removes the bot-commit noise and the write permission entirely.
- Write each run's output to a clean, run-specific directory so a failed run can only upload its
  own evidence (closes the September R-02, root worklist TRIAGE-03).

---

## 4. R-04 - MEDIUM (12) - `npm audit`: 11 advisories (7 high) with no backlog risk and no CI signal

**Priority Score:** Security (5) + Breakage (2) + Maintenance (5) = **12**

### Risk Description/Explanation

A read-only `npm audit` run during this review (2026-11-05, exit 1) reports 11 vulnerabilities:
1 low, 3 moderate, 7 high. All are in the dev-only toolchain. The backlog records none of them as
a risk, although its own precedent (PBR-03, a single transitive `brace-expansion` HIGH) treated
exactly this class as a scored risk and resolved it.

### Evidence Outline

From `npm audit --json` and `npm ls` at the baseline:

| Package (installed) | Severity | Path | Direct parent in `package.json` |
|---|---|---|---|
| `axios@1.18.1` | high | `@serenity-js/rest`, `@serenity-js/serenity-bdd`, `@serenity-js/playwright-test` | `@serenity-js/rest` pinned exactly `3.44.1` ([package.json](../../package.json) (line 44)) |
| `follow-redirects@1.16.0` | high | via `axios` | as above |
| `fast-uri@3.1.5` | high | via `ajv@8.20.0` | `ajv` ([package.json](../../package.json) (line 49)) |
| `brace-expansion@5.0.9` | high | `@cucumber/cucumber@12.9.0 > glob@13.0.6 > minimatch@10.2.5` | `@cucumber/cucumber` (line 36) |
| `glob`, `minimatch`, `@cucumber/cucumber` | moderate | as above; full fix is `@cucumber/cucumber@13.3.0` (breaking) | line 36 |
| `deepmerge` | low | via `@serenity-js/playwright-test` | line 43 |

Advisory identifiers are those `npm audit` printed (for example GHSA-w74x-v6f9-j3xg for
`fast-uri`, GHSA-q3jh-wrc6-jgq8 for `follow-redirects`); none is invented here. The PB-STYLE-01
walkthrough ([2026-10-19 walkthrough](../../docs/walkthroughs/2026-10-19_pb-style-01-test-style-02.md)
(line 48)) already recorded "14 high before and after" and recommended triage (line 86).

### Impact Analysis

Exploitability is low in normal use: the code talks to a loopback SUT. Two paths are worth naming.
`axios`/`follow-redirects` back `CallAnApi` in `test-style-03`, which DR-PB-13 now allows to
target a remote host (the public demo); the `follow-redirects` advisories concern credential
headers surviving cross-origin redirects. `@serenity-js/serenity-bdd` uses `axios` to download the
Serenity CLI jar in CI. Combined with R-03, install-time exposure is the larger concern. The
maintenance cost is real: the exact `3.44.1` pin (DR-PB-12, chosen to hold the
`@playwright/test ~1.61.1` peer) blocks the normal upgrade route for `axios`.

### Refactor Recommendation and Strategy

- Record one scored risk (PBR-09) covering the set; it is the backlog's own convention.
- Use `overrides` in `package.json` for `axios`, `follow-redirects` and `fast-uri` at patched
  releases inside their current majors, which leaves the Serenity/JS exact pin intact. Inspect the
  lock diff, then run typecheck, unit, both lanes and both styles.
- Treat `@cucumber/cucumber` 13 as its own reviewed upgrade (moderate only; breaking).
- Add a non-blocking `npm audit --audit-level=high --omit=optional` step to the fast CI job
  proposed under R-10, so drift becomes visible on the PR that introduces it.

---

## 5. R-05 - LOW (9) - Main-lane report checks prove scenario presence, not scenario outcome

**Priority Score:** Security (1) + Breakage (4) + Maintenance (4) = **9**

### Risk Description/Explanation

`inspectSerenityCoverage` flattens every string in every Serenity JSON file into one set and
checks that each scenario name is a member. It never reads a scenario's `result`. The same helper
backs both `check:report` and the public-evidence gate `prepare:pages`/`check:pages`. The newer
style-03 checker in the same repo does check `result === 'SUCCESS'`, so the two report gates have
diverged in strength.

### Evidence Outline

- [report-integrity.ts](../../src/quality/report-integrity.ts) (lines 18-39 and 41-49):
  string-set membership only.
- [check-report.ts](../../scripts/check-report.ts) (line 23, and the `missingScenarioNames` loop at
  line 35) and
  [pages-evidence.ts](../../src/quality/pages-evidence.ts) (lines 13 and 229) consume it.
- [check-style-03-report.ts](../../scripts/check-style-03-report.ts) (lines 40, 49 and 52) parses
  `name` and `result` per artefact and fails on anything other than `SUCCESS`, and also fails on
  unexpected scenarios.

### Impact Analysis

In CI the chain `test:ui && report && check:report` stops on a red UI lane, so a failed report
does not reach Pages today. The weakness bites locally: the README invites operators to run
`prepare:pages` against an existing report ([README.md](../../README.md) (lines 110-117)), and a
report from a red run would pass the content gate. A scenario name that also appears as free text
in another artefact (for example a description) would satisfy the check without its own result.

### Refactor Recommendation and Strategy

Promote the style-03 logic into `src/quality/report-integrity.ts` as the single implementation:
per-artefact `name` -> `result`, fail on missing, non-`SUCCESS` and unexpected names. Add the
existing must-fail style ("a FAILURE result is rejected") as a unit test. Use it for
`check:report`, `check:pages` and `check:style-03-report` alike.

---

## 6. R-06 - LOW (7) - UI money confirmations use truncated, unanchored substring oracles

**Priority Score:** Security (0) + Breakage (3) + Maintenance (4) = **7**

### Risk Description/Explanation

The UI confirmation steps assert that the result panel `includes(String(Math.trunc(amount)))`.
For $100.00 that is the substring `100`, for $75.00 the substring `75`. Displays of $1000.00,
$175.00, $750.00 or $75.99 would all pass, and the account ids in the same panel can supply the
digits.

### Evidence Outline

- [ui.steps.ts](../../features/ui/steps/ui.steps.ts) (lines 145-150) for transfer and
  (lines 175-180) for bill pay.
- Contrast: style-03 asserts the exact displayed amount and both account ids,
  [fund-transfer-fe.spec.ts](../../test-style-03/tests/fund-transfer-fe.spec.ts) (lines 39-42):
  `Ensure.that(TheTransferredAmount(), equals('$50.00'))`.

### Impact Analysis

The REST cross-check catches wrong money movement, so financial correctness is still verified.
What is weak is the UI-display oracle the scenario titles claim ("the UI confirms the transfer of
$100.00"). For a teaching repo, the side-by-side styles now show the less rigorous oracle in the
flagship lane.

### Refactor Recommendation and Strategy

Port style-03's dedicated amount/account targets (`#amountResult`, `#fromAccountIdResult`,
`#toAccountIdResult` equivalents) into `src/screenplay/ui/pages.ts` and assert exact formatted
currency. Acceptance: expected $75.00 rejects $175.00, $750.00 and $75.01.

---

## 7. R-07 - LOW (6) - "Read-only against seed state" scenarios actually read post-mutation state

**Priority Score:** Security (0) + Breakage (3) + Maintenance (3) = **6**

### Risk Description/Explanation

The reset bracket is a before-only reset: `@mutates` scenarios re-seed before they run, but
nothing restores state after them (except `@loan` and `@contract-matrix`). Non-`@mutates`
scenarios that run later in the same process read whatever the previous mutating scenario left.
Features run in path order, so the FR-B3 smoke scenario runs after all three FR-B2 mutating
scenarios without a reset, despite its comment.

### Evidence Outline

- [hooks.ts](../../features/support/hooks.ts) (lines 19-23) before-reset for `@mutates`;
  (lines 32-34) after-reset only for `@loan or @contract-matrix`.
- [b3-rest-soap-parity.feature](../../features/api/b3-rest-soap-parity.feature) (line 7): "Smoke
  scenario 3 of 3: read-only against seed state."
- [b2-stateful-flow.feature](../../features/api/b2-stateful-flow.feature) (lines 8-9 and 24-25):
  a mutating scenario and a three-row mutating outline precede it.

### Impact Analysis

The suite is green today only because every non-`@mutates` assertion is relative (parity,
schema, status). Adding an absolute balance assertion to any non-`@mutates` scenario would make it
pass under `--tags @smoke` and fail in the full run, an order-dependent flake that is hard to
diagnose. It also means the smoke subset and the full run exercise different data.

### Refactor Recommendation and Strategy

Either make the bracket symmetric (re-seed `After('@mutates')`, roughly one extra
`initializeDB` per mutating scenario) or correct the comments to "read-only; tolerates prior
state" and add a tag-lint rule that non-`@mutates` API scenarios may not use the absolute-balance
steps. The symmetric bracket is the more teachable option.

---

## 8. R-08 - LOW (5) - Screenplay boundary leaks in the step glue; two actor systems per UI scenario

**Priority Score:** Security (0) + Breakage (2) + Maintenance (3) = **5**

### Risk Description/Explanation

[core.ts](../../src/screenplay/core.ts) (line 4) promises that "step definitions stay one line
thick". Several API steps instead reach through the actor to an Ability and call the client
directly, and the boundary-transfer step holds business logic. In the UI lane each scenario uses
two actors from two Screenplay implementations: Serenity/JS `Paula` drives the browser while the
hand-rolled `Tess` (`this.actor`) performs REST cross-checks and even stores Paula's registration
details.

### Evidence Outline

- [api.steps.ts](../../features/api/steps/api.steps.ts) (lines 28-42 and 239-241):
  `this.actor.abilityTo(CallParaBankRest).call((c) => c.account(accountId))` instead of a Task or
  Question; lines 32-38 are two identical step bodies.
- [api.steps.ts](../../features/api/steps/api.steps.ts) (lines 154-194): amount resolution,
  balance capture and multi-assertion logic in glue.
- [ui.steps.ts](../../features/ui/steps/ui.steps.ts) (lines 33, 77, 103-110, 198-207): `paula()`
  versus `this.actor`; admin parameter pinning done inline in a step.

### Impact Analysis

The REST cross-checks, which are the strongest UI-lane evidence, are plain `node:assert` calls
inside steps, so the Serenity report shows them only as an anonymous passed step, not as named
activities (inference from the reporting model; the HTML report was not regenerated here). For
learners, the mixed model blurs which Screenplay is being taught.

### Refactor Recommendation and Strategy

Introduce `ReadTheAccount`/`ReadTheTransactions` Tasks and a `PinTheLoanEnvironment` Task in
`src/screenplay`, keeping each step a one-line delegation. For the UI lane, give `Paula` a
Serenity `CallAnApi`-style ability (or wrap `ParaBankRestClient` in a Serenity Ability) so the REST
cross-checks become reported Serenity Questions, retiring the second actor in that lane.

---

## 9. R-09 - LOW (4) - REST client concatenates query values without URL encoding

**Priority Score:** Security (1) + Breakage (2) + Maintenance (1) = **4**

### Risk Description/Explanation

Path segments are encoded, but every query string is built by template concatenation. `amount`
is deliberately typed `number | string` so FR-B4 can send malformed values; any such value that
contains `&`, `+`, `#`, `%` or a space would silently change the request rather than test the
SUT's handling of that value.

### Evidence Outline

[client.ts](../../src/api/client.ts) (lines 66, 71, 75, 83 and 91), for example
`` `${this.services}/transfer?fromAccountId=${fromAccountId}&toAccountId=${toAccountId}&amount=${amount}` ``.
Path segments use `encodeURIComponent` at lines 43 and 99.

### Impact Analysis

No current scenario is affected: the only malformed value is `"abc"`
([b4-negative-paths.feature](../../features/api/b4-negative-paths.feature) (line 15)). It is a
latent trap for the next negative partition (for example `"1e3"` is safe but `"1 000"` or
`"5&amount=1"` is not) and a weak example for learners about request construction.

### Refactor Recommendation and Strategy

Build queries with `URLSearchParams`. If a raw, intentionally malformed query is ever needed, add
an explicit `rawQuery` escape hatch named as such, so intent is visible in review.

---

## 10. R-10 - LOW (4) - CI feedback latency and small reproducibility gaps

**Priority Score:** Security (1) + Breakage (1) + Maintenance (2) = **4**

### Risk Description/Explanation

A collection of small, independent items that each cost little to fix.

### Evidence Outline

- **Late fast lane.** [ci.yml](../../.github/workflows/ci.yml) (lines 21-50): typecheck, the
  43 SUT-independent unit tests and tag lint run only inside `npm run verify`, after the SUT build
  (about 4 minutes cold per [README.md](../../README.md) (line 42)). A type error is reported
  minutes later than necessary. No `concurrency` group cancels superseded PR runs; no Maven or
  Playwright cache (the backlog lists Maven caching as a MEDIUM next step, line 1041).
- **Floating k6 locally.** [run-perf.mjs](../../scripts/run-perf.mjs) (line 24) defaults to
  `grafana/k6:latest` when `K6_IMAGE` is unset, contrary to the digest-pin discipline that
  [perf.yml](../../.github/workflows/perf.yml) (line 23) applies in CI.
- **Unbounded gate probes.** [gate.ps1](../../scripts/gate.ps1) (lines 50, 55 and 60) call
  `Invoke-WebRequest` without `-TimeoutSec`; only the seed loop (line 40) is bounded.
  [smoke-safety.mjs](../../scripts/smoke-safety.mjs) (lines 11-23) uses `fetch` without the
  project's own `withRequestDeadline` policy.
- **Duplicated SUT identity.** The image tag `parabank:d1bf006`
  ([docker-compose.yml](../../docker-compose.yml) (line 20)) duplicates the commit pinned in
  [build-sut.ps1](../../scripts/build-sut.ps1) (line 26); a pin bump that forgets the compose
  tag would build a new SUT under an old name.

### Impact Analysis

Slower feedback and small foot-guns rather than correctness risks.

### Refactor Recommendation and Strategy

Add a `static` job (`npm ci`, three typechecks, `perf:typecheck`, `test:unit`, `lint:tags`,
non-blocking audit) that the SUT job `needs`; add `concurrency: { group: ci-${{ github.ref }},
cancel-in-progress: true }` for PRs; pin the k6 default to the same digest; add `-TimeoutSec 10` to
the three probes; derive the compose tag from the pin or assert it in `build-sut.ps1`.

---

[<- Previous: Executive Summary](01_EXECUTIVE_SUMMARY.md) | [Back to Index](00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md)
