# Annex: Evidence and Metrics

[<- Back to Index](../00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md) | [Next: Index ->](../00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md)

**Reviewer:** AI assistant (CODEX GPT-5)

## Review Baseline

- Repository: `GBrooks1970/parabank-bank-automation`
- Reviewed branch point: `origin/main`
- Reviewed SHA: `dc3a209d0eaed197298ed4574eac6a7bd8641775`
- Review branch: `review/parabank-bank-automation-codex-v1`
- Repository state before review: clean
- Existing CODEX reviews in the registry-resolved `.review/` location: none; this is v1.

## Repository Metrics

| Metric | Value |
|---|---:|
| Tracked files at baseline | 49 |
| TypeScript lines under `src/` and `features/` | 1,089 |
| Gherkin lines | 184 |
| API scenarios | 10 |
| UI scenarios | 8 |
| Total scenarios | 18 |
| API dry-run steps | 47 |
| UI dry-run steps | 49 |
| Fixed smoke scenarios | 3 |
| Tracked unit/spec test files | 0 |
| Open PRs before publication of this review | 0 |

Counts are physical review-time measurements, not coverage percentages.

## Validation Commands Run

| Command | Result | Interpretation |
|---|---|---|
| `git status --short --branch` | PASS | Clean baseline on the dedicated review branch. |
| `git log --oneline -10` | PASS | Current history inspected through closure merge `dc3a209`. |
| `rg --files` plus hidden-file mapping | PASS | Tracked implementation, docs, workflow, and scripts mapped; generated/dependency-heavy output excluded from manual review. |
| `npm run typecheck` | PASS | TypeScript strict/no-emit compilation passed. |
| `npm run lint:tags` | PASS | Smoke/mutates separation and fixed smoke counts passed. |
| `npx cucumber-js --profile api --dry-run` | PASS | 10 scenarios, 47 steps, no undefined binding. |
| `npx cucumber-js --profile ui --dry-run` | PASS | 8 scenarios, 49 steps, no undefined binding. |
| `npm audit` | PASS | Zero vulnerabilities reported on 2026-07-24. |
| `npm outdated` | INFORMATIONAL, exit 1 | No `Wanted` version exceeded `Current`; the aligned installed Serenity 3.44.1 packages were above the registry `latest` values shown by npm. |
| Direct dependency manifest licence inspection | PASS | All direct packages reported MIT or Apache-2.0. |
| High-signal tracked-tree secret scan | PASS | No GitHub/AWS/Slack token or private-key signatures found. |
| `gh run view 29999689438` | PASS | Latest `main` CI succeeded for exact reviewed SHA `dc3a209`. |
| Latest CI check-run annotations | WARN | PBR-02 persists: `setup-java@v4` and `upload-artifact@v4` target Node 20 and are forced onto Node 24. |

## Project-Contract Commands Not Run Locally

The project contract resolves to:

1. `pwsh ./scripts/build-sut.ps1`
2. `docker compose up -d`
3. `pwsh ./scripts/gate.ps1`
4. `npm run verify`
5. `docker compose down`

All five were skipped locally under the review instruction not to fetch/build the SUT, start
Docker, or run the long E2E suite. `npm run verify` was not partially reported as green: only its
static and dry-run-safe components listed above were run. The latest exact-SHA GitHub Actions run
provides separate remote evidence that the complete workflow passed.

## Handover Preflight Warning

- Latest handover pair: v2, created 2026-07-22T22:20Z.
- Fetched default head: `dc3a209`.
- Classification: `WARN`, because the handover predates the fetched default head.
- Reconciliation: v2 says PB-P5 closure PR #11 was open and needed confirmation. The reviewed
  head is merge PR #11, and the backlog now records PB-P5 complete/resting.
- Conclusion: evidence is readable and substantially current, but the freshness warning must not
  be silently upgraded to READY.

## CI Assessment Evidence

- Correct order: build pinned source, start compose, run seed/surface gate, install Node/Java,
  install browser, run verify, upload report, log on failure, tear down.
- npm caching is configured through `actions/setup-node`.
- Maven dependencies and Docker layers are not explicitly persisted across hosted runs.
- The Serenity artifact is uploaded on every outcome; `check-report.mjs` makes missing HTML a CI
  failure before the upload step.
- No repository or deployment secret is consumed by the workflow.
- Workflow permissions are implicit and action references use moving major tags.

## Dependency, Security, and Licence Evidence

- [package.json](../../../package.json) (lines 1-35) declares Node 20+, MIT, and all direct
  development dependencies.
- [package-lock.json](../../../package-lock.json) (lines 1-28) is a lockfile v3 used by CI's
  `npm ci`.
- Installed direct packages report MIT or Apache-2.0 licences.
- [LICENSE](../../../LICENSE) (line 1) declares the repository's MIT terms.
- [README.md](../../../README.md) (lines 94-100) distinguishes the repository's MIT content from
  the fetched Apache-2.0 ParaBank source.
- No CVE is asserted by this review because `npm audit` reported none.

## Evidence Limitations

- No local Docker/SUT execution or live HTTP/SOAP observation was performed.
- No browser was launched.
- No local Serenity report was generated; Java is unavailable in the review environment.
- Generated `target/`, ignored `target-app/`, and `node_modules/` were not manually reviewed
  except for narrow version/licence evidence needed by this assessment.
- GitHub `main` CI status and annotations were inspected; no claim is made about future runs.

---

[<- Previous: Migration Plans](../07_MIGRATION_PLANS.md) | [Back to Index](../00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md) | [Next: Index ->](../00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md)
