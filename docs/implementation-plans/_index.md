---
version: 1
created: 2026-10-07T08:03Z
project: parabank-bank-automation
type: implementation-plan-index
language: en-GB
---

# Implementation plans

Every implementation plan is written to a file here before implementation starts, and kept. One row per plan. Format: [`docs/templates/implementation-plan.template.md`](../templates/implementation-plan.template.md).

| Plan | Item | Presented | Status | Delivered |
|---|---|---|---|---|
| [`2026-10-07_pb-pin-06-maven-builder-refresh.md`](2026-10-07_pb-pin-06-maven-builder-refresh.md) | PB-PIN-06 Refresh the stale MavenBuilder container image pin | 2026-10-07 | implemented | [#49](https://github.com/GBrooks1970/parabank-bank-automation/pull/49) (`25c83b8`, 2026-10-07) |
| [`2026-10-19_pb-style-01-playwright-test-style-02.md`](2026-10-19_pb-style-01-playwright-test-style-02.md) | PB-STYLE-01 `test-style-02/`: fund-transfer brief in plain Playwright Test style | 2026-10-19 | implemented | [#51](https://github.com/GBrooks1970/parabank-bank-automation/pull/51) (`daecf34`, 2026-10-19) |
| [`2026-10-19_pb-style-02-serenity-screenplay-test-style-03.md`](2026-10-19_pb-style-02-serenity-screenplay-test-style-03.md) | PB-STYLE-02 `test-style-03/`: the same 12 tests in Serenity/JS Screenplay on Playwright Test | 2026-10-19 | implemented | [#52](https://github.com/GBrooks1970/parabank-bank-automation/pull/52) (`e7130f5`, 2026-10-19) |
| [`2026-10-19_pb-style-03-live-demo-target.md`](2026-10-19_pb-style-03-live-demo-target.md) | PB-STYLE-03 Run the style folders against the live demo on request; main lanes guarded to the local SUT | 2026-10-19 | implemented | [#53](https://github.com/GBrooks1970/parabank-bank-automation/pull/53) (`bbca594`, 2026-10-22) |
| [`2026-11-08_triage-02-smoke-safety-mutation-detection.md`](2026-11-08_triage-02-smoke-safety-mutation-detection.md) | TRIAGE-02 Make smoke-safety detect mutations before another profile can reset them (with D-4: wider snapshot, per-lane $0.01 must-fail) | 2026-11-08 | implemented | [#58](https://github.com/GBrooks1970/parabank-bank-automation/pull/58) (`6ba613d`, 2026-11-08) |
| [`2026-11-08_triage-01-fast-uri-lock-update.md`](2026-11-08_triage-01-fast-uri-lock-update.md) | TRIAGE-01 Update the locked fast-uri (via ajv) from 3.1.5 past its advisories, lockfile only | 2026-11-08 | implemented | [#60](https://github.com/GBrooks1970/parabank-bank-automation/pull/60) (`adb9b51`, 2026-11-08) |
| [`2026-11-08_triage-07-in-major-overrides.md`](2026-11-08_triage-07-in-major-overrides.md) | TRIAGE-07 Clear the axios, follow-redirects and brace-expansion advisories inside their current majors (axios override; in-range lock updates) | 2026-11-08 | implemented | [#62](https://github.com/GBrooks1970/parabank-bank-automation/pull/62) (`e9abaec`, 2026-11-09) |
| [`2026-11-09_triage-03-perf-diagnostics-isolation.md`](2026-11-09_triage-03-perf-diagnostics-isolation.md) | TRIAGE-03 Isolate performance-run diagnostics from committed report snapshots | 2026-11-09 | implemented | [#64](https://github.com/GBrooks1970/parabank-bank-automation/pull/64) (`8ac8a7d`, 2026-11-09) |
| [`2026-11-09_triage-08-perf-token-split.md`](2026-11-09_triage-08-perf-token-split.md) | TRIAGE-08 Split the perf workflow so no job running third-party code holds a write token | 2026-11-09 | implemented | [#66](https://github.com/GBrooks1970/parabank-bank-automation/pull/66) (`7fb14e8`, 2026-11-09) |
| [`2026-11-09_triage-09-backlog-pending-test.md`](2026-11-09_triage-09-backlog-pending-test.md) | TRIAGE-09 Add a unit test that fails when the backlog marks a merged PR as pending | 2026-11-09 | implemented | [#68](https://github.com/GBrooks1970/parabank-bank-automation/pull/68) (`17818db`, 2026-11-09) |
| [`2026-11-09_triage-04-exact-amounts.md`](2026-11-09_triage-04-exact-amounts.md) | TRIAGE-04 Assert exact displayed transfer and bill-pay amounts | 2026-11-09 | implemented | [#70](https://github.com/GBrooks1970/parabank-bank-automation/pull/70) (`b3d85c3`, 2026-11-09) |
| [`2026-11-09_triage-05-operational-docs-reconciliation.md`](2026-11-09_triage-05-operational-docs-reconciliation.md) | TRIAGE-05 Reconcile active operational documentation and status summaries | 2026-11-09 | implemented | [#72](https://github.com/GBrooks1970/parabank-bank-automation/pull/72) (`bb2aa2c`, 2026-11-09) |
| [`2026-11-09_triage-10-report-scenario-results.md`](2026-11-09_triage-10-report-scenario-results.md) | TRIAGE-10 Make the main-lane report and Pages checks verify each scenario's result | 2026-11-09 | implemented | [#74](https://github.com/GBrooks1970/parabank-bank-automation/pull/74) (`8dd6b37`, 2026-11-09) |
| [`2026-11-09_triage-11-reseed-mutates.md`](2026-11-09_triage-11-reseed-mutates.md) | TRIAGE-11 Re-seed after every @mutates scenario so later scenarios read seed state | 2026-11-09 | implemented | [#76](https://github.com/GBrooks1970/parabank-bank-automation/pull/76) (`1b8c5c7`, 2026-11-09) |


