# Risks and Issues

[<- Back to Index](00_CODE_REVIEW_Antigravity_v1_20261105T0856Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_AUTOMATION.md)

**Reviewer:** AI assistant (Antigravity)
**Date:** 2026-11-05T08:56Z

This section details five prioritised, evidence-backed findings (three Medium and two Low priority). There are no Critical or High project-level findings that break core execution. Each finding provides empirical evidence from repository source files, architectural impact analysis, and practical remediation recommendations.

---

## 1. R-01 - MEDIUM - Smoke-safety runner resets between observation snapshots, erasing API smoke mutations

### Risk Description/Explanation
The `check:smoke-safety` script ([smoke-safety.mjs](scripts/smoke-safety.mjs) (line 1)) is intended to verify that the `@smoke` scenario subset is store-safe (completely side-effect free) by asserting that database state before and after running smoke tests is byte-identical without an intervening reset.

However, the wrapper executes Cucumber twice sequentially using `execSync`: first for the `api` profile, then for the `ui` profile ([smoke-safety.mjs](scripts/smoke-safety.mjs) (lines 28-31)). Each Cucumber process execution loads [features/support/hooks.ts](features/support/hooks.ts) via [cucumber.js](cucumber.js) (lines 9, 17). In `hooks.ts` (lines 12-14), `BeforeAll` unconditionally executes `seedDatabase(BASE_URL)`. Consequently, when the second profile (`ui`) starts, it triggers an immediate database reset, completely wiping any state mutations that might have occurred during the execution of the `api` smoke profile prior to taking the final snapshot comparison.

Furthermore, the snapshot function ([smoke-safety.mjs](scripts/smoke-safety.mjs) (lines 16-23)) inspects only customer 12212's accounts (`/customers/12212/accounts`), ignoring other state entities such as registered users, loan records, or global parameters.

### Evidence Outline
- [smoke-safety.mjs](scripts/smoke-safety.mjs) (lines 25-34):
```javascript
// scripts/smoke-safety.mjs (lines 25-34)
await seed();
const before = await snapshot();

for (const profile of ['api', 'ui']) {
  console.log(`Running @smoke (${profile} profile) ...`);
  execSync(`npx cucumber-js --profile ${profile} --tags "@smoke"`, { stdio: 'inherit' });
}

const after = await snapshot();
if (before !== after) {
```
- [hooks.ts](features/support/hooks.ts) (lines 12-17):
```typescript
// features/support/hooks.ts (lines 12-17)
BeforeAll({ timeout: 150_000 }, async function () {
  // DR-PB-06 boot->seed->use: seeding doubles as the readiness wait.
  await seedDatabase(BASE_URL);
  // FR-B1: the spec is fetched live, once per run.
  PBWorld.spec = await SpecConformance.fromLiveSpec(BASE_URL);
});
```

### Impact Analysis
The safety gate provides false confidence in API smoke isolation. If an engineer inadvertently introduces a state-mutating step (e.g. creating an account or executing a transfer) into an `@smoke`-tagged API scenario, the safety check will still pass green because the subsequent UI profile launch resets the database to seed state before `after` is evaluated.

### Refactor Recommendation and Strategy
1. **Per-Profile Snapshot Isolation:** Modify `smoke-safety.mjs` to snapshot and assert state immediately before and after *each* individual profile run:
   - Snapshot initial state.
   - Run `api` smoke.
   - Assert snapshot is byte-identical.
   - Run `ui` smoke.
   - Assert snapshot is byte-identical.
2. **Bypass Redundant Hook Seeding in Safety Mode:** Pass an environment variable (e.g. `SMOKE_SAFETY_RUN=1`) into child processes, instructing `BeforeAll` in `hooks.ts` to skip the `seedDatabase()` call when executing under the safety runner.
3. **Negative Safety Verification Test:** Add a unit/integration test in `tests/unit/` verifying that `smoke-safety.mjs` exits non-zero if a simulated mutating step executes during the run.

---

## 2. R-02 - MEDIUM - Nightly performance smoke workflow attaches stale committed artefacts on failure

### Risk Description/Explanation
The nightly k6 performance workflow ([.github/workflows/perf.yml](.github/workflows/perf.yml) (line 58)) configures artifact upload with `if: always()`, targeting `perf/report`. 

Because `perf/report/index.html` and `perf/report/perf-summary.json` are committed directly to the git repository (to enable GitHub Pages deployment on `main`), any early failure in the job—such as a Docker build failure, container boot timeout, Java setup failure, or k6 compilation error—causes the `Upload perf summary artifact` step to bundle the existing tracked files from the checked-out repository.

### Evidence Outline
- [.github/workflows/perf.yml](.github/workflows/perf.yml) (lines 57-64):
```yaml
# .github/workflows/perf.yml (lines 57-64)
      - name: Upload perf summary artifact
        if: always()
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: perf-summary
          path: perf/report
          if-no-files-found: warn
```
- Tracked files in git index:
  - `perf/report/index.html`
  - `perf/report/perf-summary.json`

### Impact Analysis
When a nightly performance run fails before k6 completes, the uploaded CI artifact contains valid metrics from a previous, unrelated run. A triage engineer downloading the artifact from a failed run will inspect stale data and may reach incorrect conclusions regarding performance regression, rather than diagnosing infrastructure failure.

### Refactor Recommendation and Strategy
1. **Dynamic Output Staging:** Configure `run-perf.mjs` to write run-specific reports into an ephemeral directory (e.g. `perf/target/report`) rather than overwriting tracked repository files in-place during the run.
2. **Conditional or Metadata-Enriched Upload:**
   - In `.github/workflows/perf.yml`, upload the ephemeral directory.
   - If the job fails before k6 produces valid output, generate an explicit failure report (e.g. `failure-context.json` containing step exit codes and container logs) instead of uploading stale committed files.
3. **Decouple Repository Tracking from CI Scratch Spaces:** Avoid checking mutable performance reports into git, or maintain a clean separation between the committed public baseline and the active CI output directory.

---

## 3. R-03 - MEDIUM - Known vulnerable transitive dependencies (11 CVEs, 7 High) remain in lockfile

### Risk Description/Explanation
Running `npm audit` against the current lockfile reports 11 vulnerabilities (7 High, 3 Moderate, 1 Low). While `docs/backlog.md` (v30) recorded the `fast-uri@3.1.5` vulnerability as an item for separate triage, multiple additional CVEs have accumulated in transitive dependencies across the toolchain.

Key affected packages include:
- `fast-uri` (3.0.0 - 3.1.8; High): multiple advisories including SSRF, host confusion, and URI scheme spoofing ([GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8), [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc)).
- `axios` (1.0.0 - 1.19.0; High): 12 distinct advisories including prototype pollution gadgets, SSRF bypass in fetch adapter, ReDoS, and header injection ([GHSA-vh66-26gq-q6x8](https://github.com/advisories/GHSA-vh66-26gq-q6x8), [GHSA-r4gj-5m52-g5wh](https://github.com/advisories/GHSA-r4gj-5m52-g5wh)).
- `follow-redirects` (1.16.0 - 1.16.1; High): credential header exposure on cross-origin redirects ([GHSA-q3jh-wrc6-jgq8](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8)).
- `brace-expansion` (4.0.0 - 5.0.11; High): DoS via uncontrolled recursion and CPU exhaustion ([GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr)).

### Evidence Outline
- `package-lock.json` dependency resolutions:
  - `fast-uri` locked at `3.1.5` under `ajv`
  - `axios` locked under `@serenity-js/rest` and `@serenity-js/playwright-test`
  - `brace-expansion` locked under `@cucumber/cucumber`
- `npm audit` CLI output:
  `11 vulnerabilities (1 low, 3 moderate, 7 high)`

### Impact Analysis
Because ParaBank test automation runs locally and against containerised test environments, direct exploitation in a production runtime is low. However:
1. In enterprise CI/CD environments, automated security gates (Dependabot, Snyk, Prisma) will flag these High-severity CVEs, blocking deployment or pull request merges.
2. Prototype pollution vulnerabilities in HTTP clients (`axios`) represent potential lateral risks if external mock responses or unvalidated third-party data are introduced.
3. Unaddressed vulnerabilities undermine portfolio credibility when evaluated by security-conscious technical leads.

### Refactor Recommendation and Strategy
1. **Targeted Transitive Bumps:** Apply targeted updates to `package-lock.json` without forcing breaking major version upgrades:
   - Update `fast-uri` to `>=3.1.9` under `ajv`.
   - Update `brace-expansion` to `>=5.0.12`.
2. **Review Serenity/JS Dependency Tree:** Investigate bumping `@serenity-js/*` packages to a patch/minor release that resolves newer `axios` dependencies (or apply package manager overrides if compatible).
3. **Formalise Vulnerability Triage in Backlog:** Move `fast-uri` and `axios` triage from unstructured notes into a dedicated maintenance risk item in `docs/backlog.md` with explicit closure criteria.

---

## 4. R-04 - LOW - Truncated and unanchored substring matching in UI monetary confirmations

### Risk Description/Explanation
In [features/ui/steps/ui.steps.ts](features/ui/steps/ui.steps.ts) (lines 148 and 178), the step definitions confirming UI transfer and bill payment results inspect displayed confirmation text using `Math.trunc()` and unanchored `includes()`:

```typescript
// features/ui/steps/ui.steps.ts (lines 145-150)
Then('the UI confirms the transfer of ${float}', async function (this: PBWorld, amount: number) {
  await paula().attemptsTo(
    Ensure.that(TheTransferResultText(), includes('Transfer Complete')),
    Ensure.that(TheTransferResultText(), includes(String(Math.trunc(amount))))
  );
});
```

Using `Math.trunc(amount)` truncates any cents/fractional amounts (e.g. `75.50` becomes `"75"`). Furthermore, calling `includes("75")` on unanchored result text matches any substring containing `"75"`, such as account numbers (`#7521`), phone numbers, dates, or altered currency figures like `$175.00` or `$750.00`.

### Evidence Outline
- [ui.steps.ts](features/ui/steps/ui.steps.ts) (line 148): `Ensure.that(TheTransferResultText(), includes(String(Math.trunc(amount))))`
- [ui.steps.ts](features/ui/steps/ui.steps.ts) (line 178): `Ensure.that(TheBillPayResultText(), includes(String(Math.trunc(amount))))`
- [a3-transfer-funds.feature](features/ui/a3-transfer-funds.feature) (line 11): `Then the UI confirms the transfer of $100.00`
- [a4-bill-pay.feature](features/ui/a4-bill-pay.feature) (line 11): `Then the UI confirms the bill payment completed for $75.00`

### Impact Analysis
The UI oracle is overly lenient. A visual regression in the UI where decimal places are dropped, or where an incorrect amount is rendered (e.g. displaying `$1000.00` instead of `$100.00`), would still pass the UI assertion step. While subsequent REST assertions independently verify exact ledger balance movements, the UI test fails to rigorously prove that the customer received an accurate visual confirmation.

### Refactor Recommendation and Strategy
1. **Exact Currency Formatting Regex:** Replace truncated substring matching with exact regular expression matching or a currency parsing helper:
   ```typescript
   const formattedAmount = new RegExp(`\\$${amount.toFixed(2)}(?!\\d)`);
   await paula().attemptsTo(
     Ensure.that(TheTransferResultText(), matches(formattedAmount))
   );
   ```
2. **Dedicated Target Element:** Where ParaBank markup isolates the transferred amount in a specific DOM element (e.g. `#amount`), assert against that element directly rather than scanning the entire result container text.

---

## 5. R-05 - LOW - Documentation drift in backlog status, Docker comments, and QA scope

### Risk Description/Explanation
A minor degree of documentation drift exists across three governance and configuration files:
1. **Backlog Status Drift:** In [docs/backlog.md](docs/backlog.md) (line 768), PB-STYLE-03 is listed as `🟡 IMPLEMENTED, MERGE PENDING` with unchecked merge boxes (lines 780-781). In reality, PR #53 was merged to `main` at commit `bbca594fa2c6fd206bcc7062cfbf462e060a3b3c`.
2. **Obsolete Docker Seeding Comment:** In [docker-compose.yml](docker-compose.yml) (line 8), the comment reads `# start; first boot self-seeds (~18 s)`. This reflects legacy probe finding F-06, which was formally superseded in PB-P0 and recorded in `docs/project-contract.md` (line 26) and `docs/backlog.md` (line 977) stating that fresh containers do *not* reliably self-seed.
3. **Outdated QA Scope Statement:** In [docs/qa-strategy.md](docs/qa-strategy.md) (line 35), the test type table states `Non-functional: Out of scope v1 (scoping plan); revisit post-P5`. However, the nightly k6 performance-smoke lane (`perf/`, `docs/perf-lane-design.md`, `.github/workflows/perf.yml`) has been fully implemented and operational since August 2026. Furthermore, test styles 02 and 03 are not mentioned in the strategy document.

### Evidence Outline
- [docs/backlog.md](docs/backlog.md) (lines 768, 780-781):
  `### PB-STYLE-03 ... — 🟡 IMPLEMENTED, MERGE PENDING`
  `- [ ] PR CI green on the final head, then merged only after every check is green`
  `- [ ] Post-merge main CI green`
- Git commit `bbca594`:
  `feat(test-styles): run the style folders against the live demo on request; guard main lanes to the local SUT (PB-STYLE-03) (#53)`
- [docker-compose.yml](docker-compose.yml) (line 8):
  `#   docker compose up -d                      # start; first boot self-seeds (~18 s)`
- [docs/qa-strategy.md](docs/qa-strategy.md) (line 35):
  `| Non-functional | Out of scope v1 (scoping plan); revisit post-P5 |`

### Impact Analysis
Documentation contradictions cause friction during onboarding and create ambiguity for automated status scrapers (e.g. portfolio kanban generators). An engineer reading `docker-compose.yml` might rely on automatic self-seeding rather than following the required `scripts/gate.ps1` lifecycle.

### Refactor Recommendation and Strategy
1. **Reconcile Backlog v33:** Update `docs/backlog.md` to record the merge of PR #53 (`bbca594`), mark PB-STYLE-03 as Complete, tick the merge checkboxes, and bump the backlog version note.
2. **Correct Compose Prose:** Update `docker-compose.yml` (line 8) to read `# start; does NOT reliably self-seed (run scripts/gate.ps1 to seed)`.
3. **Harmonise QA Strategy:** Update `docs/qa-strategy.md` to document the nightly k6 performance-smoke lane and reference the supplementary test styles (`test-style-02` and `test-style-03`).

---

[<- Previous: Executive Summary](01_EXECUTIVE_SUMMARY.md) | [Back to Index](00_CODE_REVIEW_Antigravity_v1_20261105T0856Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_AUTOMATION.md)
