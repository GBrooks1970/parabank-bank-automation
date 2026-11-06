# Cross-Cutting Analysis (within the repository)

[<- Back to Index](00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)

**Reviewer:** AI assistant (Claude Opus 5.5)
**Date:** 2026-11-05T14:12Z
**Baseline:** `main` at `ccb74d5`

This is a single-project repository, so "cross-project" is read as cross-cutting between its
parts: the two Cucumber lanes, the two style folders, the perf lane, CI, the SUT build, and the
documentation set.

## Tool-Agnostic Tests

- The same fund-transfer brief exists in three runners (Cucumber + Serenity/JS,
  `@playwright/test`, Serenity/JS on Playwright Test), proving the scenarios are not bound to one
  tool. The 12 style tests share titles and expectations by design (DR-PB-12).
- Facts move between styles, code does not: each style re-declares its targets and loopback
  check ([test-style-02/playwright.config.ts](../../test-style-02/playwright.config.ts)
  (line 20), [test-style-03/playwright.config.ts](../../test-style-03/playwright.config.ts)
  (line 26)). That is a deliberate trade (independence over DRY) and is documented.
- The API lane's hand-rolled Screenplay core has no runner dependency at all
  ([core.ts](../../src/screenplay/core.ts) (lines 1-61)), so its Tasks could be driven from any
  runner; only the step files are Cucumber-specific.
- Limit: the main UI lane and style folders do not share Gherkin, so behaviour parity across tools
  is asserted by naming conventions and review, not by an executable cross-check.

## Code-Agnostic Tests

- The Gherkin is business-readable and free of selectors or HTTP detail, for example
  [a3-transfer-funds.feature](../../features/ui/a3-transfer-funds.feature) (lines 7-13); it could
  be re-implemented in another language without change.
- API features name operations and observed outcomes, not code
  ([b4-negative-paths.feature](../../features/api/b4-negative-paths.feature) (lines 1-6)), though
  FR-B1 step text ("conforms to approved operation login") leaks the client's method names.
- Expected values (status codes, plain-text bodies) live in feature files, keeping the
  observed-contract record outside TypeScript.
- N/A for non-JavaScript implementations - the repo is TypeScript-only by design.

## Single Source of Truth

- Strong where it is code: `OPERATION_CONTRACTS` is checked against the client surface by the
  compiler ([operation-contracts.ts](../../src/api/operation-contracts.ts) (lines 126-133)); image
  pins live only in [container-image-pins.psd1](../../config/container-image-pins.psd1);
  `@smoke` counts are linted ([check-tags.ts](../../scripts/check-tags.ts) (line 7)).
- Weak where it is prose: the backlog, registry row, README decision range, QA strategy and
  compose comment disagree with each other and with git (R-02).
- The pinned SUT commit appears twice (build script and compose image tag), unchecked
  ([build-sut.ps1](../../scripts/build-sut.ps1) (line 26),
  [docker-compose.yml](../../docker-compose.yml) (line 20)).
- The style-03 expected-scenario list is hand-maintained on purpose
  ([check-style-03-report.ts](../../scripts/check-style-03-report.ts) (lines 6-7)), while the main
  lane derives names from Gherkin; both are defensible, but the inconsistency should be a stated
  choice.

## API Contract Compliance

- FR-B1 resolves each response schema from the live method/path/status/media entry, not from a
  detached component, which is the correct reading of OpenAPI conformance
  ([spec-conformance.ts](../../src/api/spec-conformance.ts) (lines 29-36, 160-199)).
- Ajv runs with `allErrors` and `validateFormats`, plus OpenAPI numeric formats
  ([spec-conformance.ts](../../src/api/spec-conformance.ts) (lines 67-78)).
- Deviations are matched by substring on `instancePath + message`
  ([spec-conformance.ts](../../src/api/spec-conformance.ts) (line 243)). `/date must be string`
  would also absorb a future nested `.../date` error elsewhere in the same response; anchoring the
  allowance to a full instance-path pattern (for example `^/\d+/date$`) would make it as narrow as
  the backlog promises.
- The SUT is not RESTful (mutations by query string on POST, plain-text bodies under
  `application/json`, 400 for not-found); the suite documents and asserts this as observed, which
  is the right call for a pinned third-party SUT.
- SOAP parity covers `getAccount` only; the revisit trigger is recorded in
  [soap.ts](../../src/api/soap.ts) (line 8).

## Screenplay Parity

- Three Screenplay implementations coexist: hand-rolled (API lane), Serenity/JS on Cucumber (UI
  lane) and Serenity/JS on Playwright Test (style-03). Naming conventions (Tasks verb phrases,
  Questions noun phrases) are shared ([naming-conventions.md](../../docs/naming-conventions.md)).
- Style-03 is the most faithful: Given/When/Then are named Tasks, notes replace ad hoc state, and
  UI assertions use exact values
  ([fund-transfer-fe.spec.ts](../../test-style-03/tests/fund-transfer-fe.spec.ts) (lines 39-42)).
- The UI lane mixes two actors and two Screenplays in one scenario (R-08); the API lane's steps
  sometimes bypass Tasks (R-08).
- Recommendation: treat style-03 as the reference for oracles and step thickness and bring the
  main lanes up to it (R-06, R-08).

## Batch File Design

- PowerShell 7 scripts are cross-platform, `#Requires -Version 7`, `$ErrorActionPreference =
  'Stop'`, and explain their probe findings inline
  ([build-sut.ps1](../../scripts/build-sut.ps1) (lines 1-35)).
- `build-sut.ps1` validates the upstream `FROM` tag against the reviewed pin before generating
  `Dockerfile.pinned` (lines 186-203) and reports every drifted pin, not the first (lines 65-99).
- `gate.ps1` refuses non-loopback targets before any request (lines 28-32) but leaves three probes
  without timeouts (R-10).
- Node helper scripts are a mix of `.mjs` and `.ts`; `smoke-safety.mjs` is executed with `tsx`
  ([package.json](../../package.json) (line 25)) and is outside the root `tsconfig.json` include,
  so it is not typechecked.

## Documentation Alignment

- Against `docs/backlog.md` (the declared source of truth), the repository is ahead: PB-STYLE-03
  merged (`bbca594`), PB-PIN-06 delivered (#49/#50), unit count 43 (backlog headline line 16
  predates the v3 hardening; line 779 records 43). Details and remediation in R-02.
- Backlog claims verified true at baseline: 14 API scenarios and 8 UI scenarios (dry-run), 3
  smoke scenarios split 2 API / 1 UI (tag lint), 43 unit tests (run), DR-PB-13 guard present in
  every listed file (architecture test passed), MIT licence present.
- Claims that could not be verified locally: CI run outcomes, Pages content and the "6/6
  consecutive green" stability figures. They are linked evidence in the backlog and were not
  re-fetched (no network checks were made in this review).
- The design document, decision register, pin policies and public-evidence runbook are
  internally consistent with the code inspected.

## Logging Alignment

- Diagnostics are deliberate and credential-safe: `RequestDeadlineError` names operation, method
  and a redacted path ([request-deadline.ts](../../src/api/request-deadline.ts) (lines 13-27,
  77-88)); SOAP faults surface `faultstring`; assertion messages include status and body.
- Guards print the reason and the safe alternative
  ([target-guard.ts](../../src/quality/target-guard.ts) (lines 26-32)).
- The FR-B1 coverage summary is written with `console.log` from a step
  ([api.steps.ts](../../features/api/steps/api.steps.ts) (line 79)); with the `progress`
  formatter it appears inline in CI logs but not in any report artefact. Attaching it with
  Cucumber's `this.attach` would keep it with the scenario.
- CI annotations are used for pin drift (`::warning`), and step summaries for drift detail.

## Test Coverage Metrics

| Layer | Count (verified) | Runtime |
|---|---:|---|
| Framework unit (`tests/unit`, 10 files) | 43 | about 2 s locally |
| API scenarios (`features/api`, 4 features) | 14 (incl. 3 outline rows) | not run (SUT) |
| UI scenarios (`features/ui`, 5 features) | 8 | not run (SUT) |
| `@smoke` | 3 (2 API, 1 UI) | not run (SUT) |
| Style-02 / style-03 tests | 12 / 12 | not run (SUT) |
| Client operations with live contract evidence | 14 of 14 (by design; not re-run) | - |

- No line/branch coverage instrumentation exists for `src/`; for a test framework this is
  acceptable, but a `node --test --experimental-test-coverage` report would show that the guard
  and contract helpers are fully exercised.

---

[<- Previous: Project Review](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md) | [Back to Index](00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)
