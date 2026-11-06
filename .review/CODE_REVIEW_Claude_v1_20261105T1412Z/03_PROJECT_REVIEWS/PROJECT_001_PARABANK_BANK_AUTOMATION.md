# Project Review: PROJECT_001 - parabank-bank-automation

[<- Back to Index](../00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)

**Reviewer:** AI assistant (Claude Opus 5.5)
**Date:** 2026-11-05T14:12Z
**Baseline:** `main` at `ccb74d5`

## Stack and intent (from README and package.json)

- Package `parabank-bank-automation@0.3.0`, MIT, `engines.node >=20`; local Node v24.18.0.
- Lane B (API): Cucumber 12 + a hand-rolled Screenplay core (`src/screenplay/core.ts`) over a
  fetch-based REST client and a lightweight SOAP ability; Ajv + ajv-formats for live OpenAPI
  validation. 14 scenarios.
- Lane A (UI): Cucumber 12 + Serenity/JS 3.44 + Playwright 1.61 (Chromium), Serenity BDD
  report. 8 scenarios.
- Additional styles (outside `verify`, own CI steps): `test-style-02` (plain `@playwright/test`)
  and `test-style-03` (Serenity/JS Screenplay on Playwright Test), 12 tests each.
- Perf: k6 TypeScript scenario bundled by esbuild, run nightly in a digest-pinned container.
- SUT: ParaBank (Apache-2.0) at `d1bf006`, built in a digest-pinned Maven container, run as a
  single Tomcat/HSQLDB container on port 8090.

## Review

- **Architecture and design patterns.** The repository applies Screenplay in three flavours and,
  in the main lanes, keeps the seams clean: Abilities wrap transport
  ([abilities.ts](../../../src/screenplay/abilities.ts) (lines 6-45)), Tasks are verb phrases with
  fluent builders ([tasks.ts](../../../src/screenplay/tasks.ts) (lines 7-77)), Questions are noun
  phrases ([questions.ts](../../../src/screenplay/questions.ts) (lines 8-62)). The UI lane follows
  Serenity/JS idioms with described `PageElement` targets and `Task.where` compositions
  ([ui/tasks.ts](../../../src/screenplay/ui/tasks.ts) (lines 28-120)). The pattern erodes in the
  glue: direct Ability calls from steps and a two-actor model in the UI lane (R-08).
- **Code quality and maintainability.** Strict TypeScript, small modules, no dead code found.
  Comments explain why (probe findings F-0x, DR references, PBR lessons) rather than what, for
  example the async-populated `<option>` wait rationale in
  [ui/tasks.ts](../../../src/screenplay/ui/tasks.ts) (lines 70-71) and the PBR-07 row-fetch race
  in [ui/pages.ts](../../../src/screenplay/ui/pages.ts) (lines 34-41). Two divergent
  report-integrity checkers (R-05) and duplicated loopback lists in each style config (accepted
  by DR-PB-12's "no shared code" rule) are the main duplication.
- **Test coverage and approach.** FR-A1..A5 and FR-B1..B4 are all implemented; dry-runs bind 14
  API and 8 UI scenarios with no undefined steps. FR-B1's operation matrix covers all 14 client
  methods and reports excluded live operations, which is better contract evidence than a schema
  sample. Boundary values for transfer amounts are executable (DR-PB-09). Gaps: the smoke-safety
  proof does not measure API smoke (R-01); FR-A5 "Denied" has no REST cross-check that no loan
  account was created ([a5-request-loan.feature](../../../features/ui/a5-request-loan.feature)
  (lines 23-28)); UI money oracles are loose (R-06).
- **Runtime lifecycle and stability.** Boot -> seed -> use is enforced at three levels (gate
  script, `BeforeAll`, `@mutates` bracket), `seedDatabase` doubles as a bounded readiness wait
  ([reset.ts](../../../src/api/reset.ts) (lines 9-30)), every REST/SOAP call has a 10 s deadline,
  and UI waits target concrete elements (`isPresent` on options, `isVisible` on results) with no
  fixed sleeps in test code. Serial execution is deliberate and documented
  ([cucumber.js](../../../cucumber.js) (lines 1-2)). The before-only reset is the one stability
  hazard (R-07).
- **Data setup and API/auth assumptions.** All ids created by the suite are captured from
  responses; seeded ids (12212, 12345, 12456, 13344) are used as fixed reference data, which is
  appropriate because the SUT is pinned and reset. Credentials are the public seeded `john/demo`
  plus a generated customer whose password is masked in Serenity output
  ([ui/tasks.ts](../../../src/screenplay/ui/tasks.ts) (lines 35, 58-61)) and scanned for before
  publication ([pages-evidence.ts](../../../src/quality/pages-evidence.ts) (lines 268-281)).
  ParaBank's REST login places the password in the URL path; `credentialSafePath` redacts it from
  diagnostics. Admin `setParameter` calls are reset afterwards by `initializeDB`, which the hooks
  comment states resets parameters too ([hooks.ts](../../../features/support/hooks.ts)
  (lines 30-34)); that claim rests on observed SUT behaviour (not re-verified here).
- **Documentation quality.** Very rich and mostly precise: design document v1.11, 13 decision
  records, QA strategy with ISTQB vocabulary, pin policies, public-evidence runbook, 21
  implementation logs, 4 walkthroughs and an implementation-plan index. The weak spot is currency:
  the backlog, registry row and handover lag the repository by two to five weeks (R-02).
- **Strengths and weaknesses in one line each.** Strength: evidence discipline (must-fail proofs,
  content-checked reports, provenance-stamped perf evidence, architecture tests for safety).
  Weakness: maintenance hygiene after delivery (approved review triage left unactioned,
  dependency advisories untracked, a gate whose claim exceeds its measurement).

## Deferred, quarantined or planned-but-unimplemented coverage

| Item | Source | State in repo |
|---|---|---|
| Positions/stock-trading module | [backlog.md](../../../docs/backlog.md) (line 1051) | Not implemented; correctly listed as unscheduled LOW |
| LoanProcessor SOAP beyond A5 | [backlog.md](../../../docs/backlog.md) (line 1053) | Not implemented; A5 covers the UI journey only |
| Compose healthcheck | [backlog.md](../../../docs/backlog.md) (line 1045) | Not implemented; `gate.ps1` polls from the host |
| CI Maven caching | [backlog.md](../../../docs/backlog.md) (line 1041) | Not implemented; `parabank-m2` named volume helps locally only ([build-sut.ps1](../../../scripts/build-sut.ps1) (line 209)) |
| PBR-01/04/05 upstream defects | [backlog.md](../../../docs/backlog.md) (lines 794-847) | Implemented as named allowances in [operation-contracts.ts](../../../src/api/operation-contracts.ts) (lines 57, 72, 80, 88, 96); faithful to "asserted, not accommodated" |
| TRIAGE-01..05, PB-PIN-05 closure | root `WORKLIST_parabank-bank-automation.md`, Extension 2026-09-30 | Approved, not actioned, absent from the backlog (R-02) |
| Capability-matrix row for test styles | [backlog.md](../../../docs/backlog.md) (lines 753, 766) | Open (root-repo item) |
| Quarantined or `@wip` scenarios | `rg "@wip|@skip|@quarantine" features` | None found; the only skips are the documented `live-skip` overdraft tests in both styles |

---

[<- Previous: Risks and Issues](../02_RISKS_AND_ISSUES.md) | [Back to Index](../00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)
