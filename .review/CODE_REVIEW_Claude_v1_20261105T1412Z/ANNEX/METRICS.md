# Annex - Metrics, Validation Evidence and Dependency/Security/Licence Pass

[<- Back to Index](../00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Previous: Annex - Test Strategy](TEST_STRATEGY.md)

**Reviewer:** AI assistant (Claude Opus 5.5)
**Date:** 2026-11-05T14:12Z
**Baseline:** `main` at `ccb74d5093c57bfdace8a6b7cfab8606ecddd35b`

## 1. Repository state

- `git status --short`: clean before and after every command below.
- `git log --oneline -10`: `ccb74d5` (merge of #54, the Antigravity review) on top of 8 nightly
  perf bot commits and `bbca594` (PB-STYLE-03, #53).
- 189 commits on `main`; 82 are `github-actions[bot]` perf refresh commits. 179 tracked files.
- Node v24.18.0 active (nvm-windows; not changed by this review). `node_modules` was already
  present; nothing was installed.

## 2. Gate resolution

Per `portfolio-prompts/project-layout.md` section "Validation gates", the first hit is the
`Gates` section of [project-contract.md](../../../docs/project-contract.md) (lines 16-22):
`build-sut.ps1`, `docker compose up -d`, `gate.ps1`, `npm run verify`, `docker compose down`.
The review brief forbids starting Docker and long E2E runs, so the SUT-backed gates were not run.
The SUT-independent parts of `verify` and the stack defaults were run individually instead.

## 3. Validation commands run

| Command | Exit | Result |
|---|---:|---|
| `npm run typecheck` | 0 | PASS (about 2 s) |
| `npm run typecheck:style-02` | 0 | PASS |
| `npm run typecheck:style-03` | 0 | PASS |
| `npm run perf:typecheck` | 0 | PASS |
| `npm run test:unit` | 0 | PASS: `tests 43`, `pass 43`, `fail 0`, `duration_ms 1976` |
| `npm run lint:tags` | 0 | PASS: "Tag lint OK: @smoke/@mutates disjoint; smoke counts match the design doc." |
| `npx cucumber-js --profile api --dry-run` | 0 | PASS: `14 scenarios (14 skipped)`, `49 steps (49 skipped)`, no undefined steps |
| UI profile dry-run via the Cucumber JS API, `format: ['summary']`, from a scratch script | 0 | PASS: `8 scenarios (8 skipped)`, `49 steps (49 skipped)` (run this way so the profile's Serenity file formatter did not write into `target/`) |
| `npx playwright test -c test-style-02/playwright.config.ts --list` | 0 | `Total: 12 tests in 2 files` |
| `npm audit` | 1 | FAIL: `11 vulnerabilities (1 low, 3 moderate, 7 high)` |
| `npm outdated --long` | - | Informational, see section 5 |

Not run (require the Docker SUT, Chromium against a live app, or a JDK report build):
`build-sut.ps1`, `gate.ps1`, `check:smoke-safety`, `test:api`, `test:ui`, `report`,
`check:report`, `test:style-02`, `test:style-03`, `report:style-03`, `check:style-03-report`,
`prepare:pages`/`check:pages`, `perf`. No CI run, Pages page or GitHub issue was fetched.

## 4. Size metrics

| Area | Files | Lines (approx.) |
|---|---:|---:|
| `src/` | 20 | 2,050 |
| `features/` step and support code | 5 | 590 |
| `features/*.feature` | 9 | - |
| `tests/unit` | 10 | 820 |
| `scripts/` | 12 | 720 |
| `test-style-02` + `test-style-03` top-level specs, configs and global setup | 8 | 610 |
| `perf/src` | 1 | 250 |
| Workflows | 3 | 300 |
| `docs/` top-level | 10 | 2,250 (backlog alone 1,064) |

## 5. Dependency, security and licence pass

**Lockfile freshness.** `package-lock.json` was last changed with PB-STYLE-01/02
(2026-10-19). `npm outdated` shows Serenity/JS 3.44.1 against 3.49.0, Playwright
1.61.1 against 1.64.1, Cucumber 12.9.0 against 13.3.0. The 1.61 Playwright hold is a recorded
decision (DR-PB-12); nothing appears abandoned.

**Range inconsistency.** [package.json](../../../package.json) (lines 38-46) mixes caret ranges for
most `@serenity-js/*` packages with exact `3.44.1` for `playwright-test` and `rest`. `npm ci` is
unaffected, but an `npm update` or fresh `npm install` could move `core`/`web`/`cucumber` to 3.49
while `rest`/`playwright-test` stay at 3.44.1, mixing Serenity/JS minor versions (inference from
semver; not executed). Pinning the whole family exactly, or using one shared range, removes this.

**Audit.** See [02_RISKS_AND_ISSUES.md](../02_RISKS_AND_ISSUES.md) R-04 for the package table.
Every advisory is in `devDependencies`; no runtime/production bundle exists.

**Secrets in the tree.** `rg` for credential assignments and structured token formats (GitHub
`gh*_`, AWS `AKIA`, private-key headers) across tracked sources found no real secret. Literal
credentials present are the public seeded demo account (`john`/`demo`) and the generated test
password literal ([ui.steps.ts](../../../features/ui/steps/ui.steps.ts) (lines 35, 75)),
plus obvious unit-test fixtures (`alice/swordfish` in
[request-deadline.test.ts](../../../tests/unit/request-deadline.test.ts) (line 30)). `.env.example`
files hold only the public demo defaults; no `.env` is tracked.

**Unsafe-input and injection surfaces.**

- SOAP: element names allow-listed and values XML-escaped
  ([soap.ts](../../../src/api/soap.ts) (lines 12, 25-40)); regex extraction is name-checked
  (line 96). Sound for its scope.
- REST: path segments encoded; query values not (R-09).
- Shell: `smoke-safety.mjs` interpolates a fixed profile name into `execSync`
  ([smoke-safety.mjs](../../../scripts/smoke-safety.mjs) (line 30)); no external input reaches it.
  `report.mjs` passes a constant artifact coordinate.
- Workflows: `pin-drift.yml` builds the issue body from a file the job itself writes and passes
  values through `env`, not inline `${{ }}` expansion in `run` (lines 47-63); no untrusted event
  fields (PR titles, branch names) are interpolated into shell anywhere.
- Destructive operations: guarded at source and enforced by an architecture test (DR-PB-13).

**Licence.** Repository content is MIT ([LICENSE](../../../LICENSE), "Copyright (c) 2026 Gary
Brooks"), declared in [package.json](../../../package.json) (line 6) and the README. Upstream
ParaBank (Apache-2.0) is fetched at build time into gitignored `target-app/` and never committed
([.gitignore](../../../.gitignore) (line 3)). k6 (AGPL-3.0) is used as an unmodified tool in a
container, as the backlog notes. Serenity BDD CLI (Apache-2.0) is downloaded at report time. No
licence conflict found.

---

[<- Previous: Annex - Test Strategy](TEST_STRATEGY.md) | [Back to Index](../00_CODE_REVIEW_Claude_v1_20261105T1412Z.md)
