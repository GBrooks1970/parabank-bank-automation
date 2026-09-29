# Validation and Scope

[<- Back to Index](../00_CODE_REVIEW_CODEX_v2_20260929T0630Z.md) | [Next: Executive Summary ->](../01_EXECUTIVE_SUMMARY.md)

**Reviewer:** AI assistant (Codex GPT-6)
**Date:** 2026-09-29T06:30Z

## Baseline and Scope

- Local clean main before review: `b9d3d904640f78a1b47e1e143e0067e14226c35b`.
- Already-fetched origin/main: `4904f74e556513a48bbf7fa8f68d4481926b09f5`; `git rev-list --left-right --count HEAD...origin/main` returned `0 14`.
- `git diff --stat HEAD..origin/main`: two files, 231 insertions and 231 deletions, solely perf/report/index.html and perf/report/perf-summary.json. Reviewed source findings also apply to that fetched baseline.
- Existing CODEX v1 and Gemini v1 bundles are preserved. This is CODEX v2; stale handover v5 does not override backlog v30.
- Inspection covered implementation layers, features/steps/hooks, unit-test areas, runner/TypeScript configuration, three workflows, build/boot/perf/report scripts, pins, README, backlog, strategy, design/decisions and maintenance evidence. Generated reports, dependency implementations, upstream target-app and prior review prose were excluded from exhaustive manual inspection.

## Gate Resolution and Fresh Commands

First-hit gate source: [project-contract.md](../../../docs/project-contract.md) (line 17). Its commands are `pwsh ./scripts/build-sut.ps1`, `docker compose up -d`, `pwsh ./scripts/gate.ps1`, `npm run verify`, `docker compose down`. None ran: scope authorised lightweight validation without Docker/full-contract infrastructure. Supplemental checks below do not replace the contract.

| Command | Fresh result |
|---|---|
| `npm run typecheck` | Passed, no diagnostics |
| `npm run test:unit` | 36 tests, 36 pass, 0 fail/cancelled/skipped/todo; 7002.9854 ms |
| `npm run lint:tags` | Passed: smoke/mutates disjoint and fixed counts match design |
| `npm run perf:typecheck` | Passed, no diagnostics |
| `npx --no-install cucumber-js --profile api --dry-run` | Passed bindings: 14 scenarios/49 steps, all skipped; 0m00.128s |
| `npx --no-install cucumber-js --profile ui --dry-run` | Passed bindings: 8 scenarios/49 steps, all skipped; 0m00.363s |
| `npm audit --json` | One HIGH vulnerable dependency, zero critical/moderate/low; fixAvailable true |
| `npm outdated --json` | Exit 1: 13 newer direct entries; informational drift, not a test failure |

Captured unit summary:

```text
tests 36
suites 0
pass 36
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 7002.9854
```

The chained lightweight command ended with exit 0 and produced each expected command's output. Earlier individual exit codes were not separately captured; pass conclusions use diagnostics and successful summaries, not an invented per-command exit ledger. Dependencies were already available; no install or lock mutation occurred.

## Dependency, Security and Licence Pass

[package-lock.json](../../../package-lock.json) (line 1959) resolves fast-uri 3.1.5. Live npm audit returned five advisories for that one dependency:

- [GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8): IDN canonicalisation, affected >=3.1.3 <3.1.6.
- [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc): IPv6 normalisation, affected >=3.0.0 <3.1.6.
- [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf): repeated hostname percent-decoding, affected >=3.1.2 <3.1.6.
- [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp): scheme normalisation, affected >=3.0.0 <3.1.6.
- [GHSA-qw65-cvwx-89v3](https://github.com/advisories/GHSA-qw65-cvwx-89v3): unvalidated port in serialize, affected >=3.0.0 <3.1.7.

Identifiers/ranges come from npm audit, not invented CVEs or inferred exploits. Audit totals are one vulnerable package, not five installed vulnerable packages. No implementation exploit was tested.

Outdated results: Cucumber 12.9.0 -> latest 13.2.1; seven Serenity packages 3.44.1 -> 3.48.0; @types/k6 2.0.1 -> 2.3.0; @types/node 26.1.1 -> 26.6.3; esbuild 0.28.1 -> 0.28.2; Playwright 1.61.1 -> 1.63.0; tsx 4.23.1 -> 4.23.15. These are registry observations, not blanket upgrade recommendations. Cucumber's declared ^12.9.0 and Playwright's ~1.61.1 intentionally constrain upgrades. No dependency abandonment was established. See [package.json](../../../package.json) (line 28).

A targeted credential-pattern inspection of source/scripts/workflows found public demo fixtures and runtime GitHub token references, not a verified live secret. This was not a full-history secret scan. UI inputs are masked, SOAP values escaped and XML names restricted. REST string amounts are trusted test inputs; encoding would be appropriate if inputs became externally supplied. The demo/reset/admin API assumes an isolated environment. Compose maps host port 8090 without explicit loopback binding; external reachability was not tested. See [client.ts](../../../src/api/client.ts) (line 41), [soap.ts](../../../src/api/soap.ts) (line 28), [docker-compose.yml](../../../docker-compose.yml) (line 21).

Repository content declares MIT in [package.json](../../../package.json) (line 6) and [LICENSE](../../../LICENSE) (line 1). README identifies upstream ParaBank as Apache-2.0; perf design identifies k6 as AGPL-3.0. These are repository declarations, not an exhaustive fresh transitive licence/legal audit. No incompatibility is asserted.

## Limits and Unverified Claims

- No Docker build/start, SUT probe, E2E, smoke-safety, k6, report generation or public-site visual check ran.
- No current GitHub workflow/PR/issue status was queried; backlog run links remain attributed historical evidence.
- Host Docker storage was not inspected; E:\_DockerData is the required location for future authorised work.
- R-01/R-02/R-04 are source-level failure paths; no real SUT mutation or intentional CI failure was induced.
- No coverage percentage, capacity result, production exploitability or full transitive licence inventory was measured.

## Review Artefact Validation

Final bundle checks passed: nine ASCII Markdown files, all required files/headings, complete index, navigation, 117 local links and 58 cited source-line bounds. Repository scope must remain confined to this new directory. These checks do not claim that external URLs or current remote evidence were revalidated.

---

[<- Previous: Migration Plans](../07_MIGRATION_PLANS.md) | [Back to Index](../00_CODE_REVIEW_CODEX_v2_20260929T0630Z.md) | [Next: Executive Summary ->](../01_EXECUTIVE_SUMMARY.md)
