# Annex - Test Strategy, Lifecycle, Data and CI Assessment

[<- Back to Index](../00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Annex - Metrics and Security Pass ->](METRICS.md)

**Reviewer:** AI assistant (Claude Opus 5.5)
**Date:** 2026-11-05T14:12Z
**Baseline:** `main` at `ccb74d5`

This annex holds the specific assessments the review prompt requires: runtime lifecycle, test
isolation, waits and synchronisation, suite stability, data setup and auth assumptions, and CI.

## 1. Runtime lifecycle

| Stage | Mechanism | Assessment |
|---|---|---|
| Build | [build-sut.ps1](../../../scripts/build-sut.ps1): shallow fetch of pinned commit, Maven in pinned container, generated digest-pinned Dockerfile | Strong; reproducible inputs, fails clearly on a stale upstream `FROM` |
| Boot | `docker compose up -d`, single container, port 8090 | Simple and adequate |
| Readiness + seed | [gate.ps1](../../../scripts/gate.ps1) polls `initializeDB` until 204, then 3 surface probes | Strong; three probes lack timeouts (R-10) |
| Per run | `BeforeAll` seeds and fetches the live spec once ([hooks.ts](../../../features/support/hooks.ts) (lines 12-17)) | Correct; also the cause of R-01 inside smoke-safety |
| Per scenario | `@mutates` re-seeds before; `@loan` and `@contract-matrix` re-seed after (lines 19-34) | Before-only for ordinary mutations (R-07) |
| Browser | One Chromium per UI run, Serenity `Cast` per scenario ([serenity.setup.ts](../../../features/ui/support/serenity.setup.ts) (lines 18-42)) | Efficient; scenario isolation relies on Serenity's per-scene browser context (inference from the Serenity/JS model) |
| Teardown | `docker compose down` in the contract and CI (`if: always()`) | Correct |

## 2. Test isolation

- Each Cucumber scenario gets a fresh hand-rolled actor and a fresh Serenity cast, so in-memory
  state never leaks ([hooks.ts](../../../features/support/hooks.ts) (lines 24-27)).
- Datastore isolation is achieved by serial execution plus the reset bracket. Mutating scenarios
  are isolated from what came before them, not from what comes after (R-07).
- The API and UI lanes run in separate processes inside `verify`; each re-seeds at start.
- Style folders seed once per suite in `globalSetup` and then run 12 tests serially on shared
  state; tests capture balances before and after, so they are relative and order-tolerant
  ([fund-transfer-api.spec.ts](../../../test-style-02/tests/fund-transfer-api.spec.ts)
  (lines 77-89)).
- Remote targets: DR-PB-13 and the architecture test give a defensible guarantee that no main-lane
  code path can reset a non-loopback host.

## 3. Waits and synchronisation

- No fixed sleeps in test code. The only `setTimeout` waits are the 2 s seed-poll interval
  ([reset.ts](../../../src/api/reset.ts) (line 25)) and the deadline timer.
- UI waits target concrete elements: options with `isPresent`, results with `isVisible`, account
  rows after the client-side fetch (PBR-07 fix,
  [ui.steps.ts](../../../features/ui/steps/ui.steps.ts) (lines 51-59)).
- Transfer waits only for the source option, not the destination
  ([ui/tasks.ts](../../../src/screenplay/ui/tasks.ts) (line 83)); both selects are filled by the
  same fetch, so this is safe today but relies on an SUT implementation detail (inference).
- All REST/SOAP/spec calls are bounded at 10 s with credential-safe errors; the default Cucumber
  step timeout is 30 s ([hooks.ts](../../../features/support/hooks.ts) (line 10)).

## 4. Suite stability

- The backlog records determinism runs (10/10 twice at PB-P2; 6/6 after PBR-07) and must-fail
  checks for each recent change. These were not re-run here (SUT not started).
- Retries are 0 in both style configs and absent from Cucumber, so flakiness is visible rather
  than masked ([test-style-02/playwright.config.ts](../../../test-style-02/playwright.config.ts)
  (line 27)).
- Main stability hazards found: the order dependence in R-07 and the reliance on generated
  `Date.now().toString(36)` uniqueness for registration
  ([ui.steps.ts](../../../features/ui/steps/ui.steps.ts) (line 64)); safe while serial and reset,
  not safe if the suite were ever parallelised.

## 5. Data setup and API/token/auth assumptions

- Seed data is the SUT's built-in set; ids 12212/12345/12456/13344 are treated as reference data,
  justified by the pinned SUT and reset contract. Exact-available amounts are read live, never
  hard-coded ([api.steps.ts](../../../features/api/steps/api.steps.ts) (lines 154-173)).
- Created entities (accounts, customers, payees) capture their ids from responses or the UI.
- Auth: ParaBank's REST API has no tokens; login is `GET /login/{username}/{password}`. The suite
  accepts that as observed and redacts it in diagnostics. Seeded `john/demo` is public demo data;
  the generated customer password (a fixed literal) is masked in Serenity output and also scanned for before
  publication ([pages-evidence.ts](../../../src/quality/pages-evidence.ts) (line 279)).
- Style folders accept `PARABANK_USERNAME`/`PARABANK_PASSWORD` from the environment
  ([accounts.ts](../../../test-style-02/tests/support/accounts.ts) (line 27)). With custom
  credentials against a remote host, style-03's `CallAnApi` login URL would carry the password
  into that style's Serenity JSON, which is uploaded as a CI artifact (inference; style-03 output
  is not published to Pages and CI uses only the local SUT).
- Admin parameters (`loanProvider`, `loanProcessor`, `loanProcessorThreshold`) are pinned per A5
  scenario and reset afterwards.

## 6. CI assessment

| Aspect | Finding |
|---|---|
| Workflow correctness | `ci.yml` mirrors the five-command contract; styles run as separate failing steps; Pages deploy gated on job success and `main` push only ([ci.yml](../../../.github/workflows/ci.yml) (lines 94-139)) |
| Caching / image strategy | npm cache via `setup-node`; no Maven, Playwright or SUT image cache; SUT rebuilt every run (R-10) |
| Secrets | No repository secrets are used; `GITHUB_TOKEN` only. `ci` is `contents: read`; deploy job alone gets `pages`/`id-token`; `pin-drift` adds `issues: write` at job level. `perf` grants `contents: write` to a job running third-party code (R-03) |
| Supply chain | All actions pinned to full SHAs with version comments; k6 pinned by digest in CI; no audit or dependency-review step (R-04) |
| Published artefacts | Serenity report (artifact + Pages), style-02/03 reports (artifacts), perf summary (artifact + committed file), pin-drift report (artifact) |
| Local reproducibility | Same scripts locally and in CI under `pwsh`; HTML report degrades to JSON-only without Java; local k6 default floats (R-10) |
| Feedback time | Unit/typecheck feedback arrives only after the SUT build (R-10) |

---

[<- Previous: Migration Plans](../07_MIGRATION_PLANS.md) | [Back to Index](../00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Annex - Metrics and Security Pass ->](METRICS.md)
