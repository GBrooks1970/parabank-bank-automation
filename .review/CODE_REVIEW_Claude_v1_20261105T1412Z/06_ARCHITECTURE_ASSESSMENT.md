# Architecture Assessment

[<- Back to Index](00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)

**Reviewer:** AI assistant (Claude Opus 5.5)
**Date:** 2026-11-05T14:12Z
**Baseline:** `main` at `ccb74d5`

## Test Pyramid

- **Alignment:** a real base exists for the framework itself: 43 SUT-independent unit tests over
  SOAP construction, contract selection, tag inheritance, report integrity, deadlines, Pages and
  perf evidence, and the target guard.
- **Alignment:** the API lane (14 scenarios) is wider than the UI lane (8), and UI money outcomes
  are verified through the API rather than the screen, which is the correct inverted-cost
  trade-off for a bank journey.
- **Gap:** the SUT is a third-party black box, so there is no SUT unit/integration layer to
  balance; the pyramid is necessarily "framework unit + API + UI". That is appropriate, but the
  docs should say so explicitly rather than implying a conventional pyramid.
- **Gap:** unit tests run only after the SUT build in CI (R-10), so the cheapest layer gives the
  slowest feedback.

## SOLID Principles

- **SRP:** strong in `src/` (client, deadlines, SOAP, conformance, guard each own one concern);
  weaker in step files that both orchestrate and assert (R-08).
- **OCP:** the operation matrix is open for extension by data; a new client method fails to
  compile until its contract row exists
  ([operation-contracts.ts](../../src/api/operation-contracts.ts) (lines 126-133)).
- **LSP:** N/A - there are no class hierarchies beyond Cucumber's `World`, which `PBWorld`
  extends without changing behaviour.
- **ISP:** the hand-rolled `Task` and `Question` interfaces are single-method
  ([core.ts](../../src/screenplay/core.ts) (lines 11-17)).
- **DIP:** Abilities are injected into the actor in `Before`
  ([hooks.ts](../../features/support/hooks.ts) (lines 24-27)); Tasks depend on the Ability type, not
  on `fetch`. The UI lane's direct `this.actor` REST calls are the exception (R-08).

## KISS (Keep It Simple, Stupid)

- The hand-rolled API Screenplay is about 60 lines and readable in one sitting.
- The SOAP ability is string templating with escaping and a name allow-list, deliberately not a
  SOAP client (DR-PB-07).
- DR-PB-13 v1's resolver and launcher were rejected as over-built in favour of an existing env var
  plus a guard, a documented KISS decision.
- Counter-example: `pages-evidence.ts` is 406 lines of staging and scanning; justified by the
  public-safety boundary, but it is the module a newcomer would find hardest.

## YAGNI (You Aren't Gonna Need It)

- Scope was fixed by an owner decision before code (PB-P1); out-of-scope modules stay in the
  "Potential Next Steps" list rather than half-built.
- No speculative abstractions were found; the three test styles are intentional teaching
  artefacts rather than unused flexibility.
- The nightly bot commit for perf evidence (R-03) is more machinery than the goal needs; an
  artifact-based publication would be simpler and remove a permission.

## REST + OpenAPI

- The SUT is not a good REST exemplar (query-parameter mutations, plain text under
  `application/json`, 400 for not-found); the suite correctly documents rather than endorses this
  ([b4-negative-paths.feature](../../features/api/b4-negative-paths.feature) (lines 1-6)).
- Contract testing against the SUT-served OpenAPI 3.0.1 document is operation-aware and
  risk-linked, a strong example of consumer-side contract verification without a broker.
- Gap: deviation allowances match substrings rather than anchored instance paths
  ([spec-conformance.ts](../../src/api/spec-conformance.ts) (line 243)).
- Gap: request construction does not encode query values (R-09).

## ISTQB Strategies

- **Equivalence partitioning and boundary values:** zero, minimum-positive, exact-available and
  over-balance transfers plus a non-numeric partition
  ([b2-stateful-flow.feature](../../features/api/b2-stateful-flow.feature) (lines 24-33),
  [b4-negative-paths.feature](../../features/api/b4-negative-paths.feature) (lines 13-27)).
- **Decision table:** FR-A5 loan approval/denial with pinned processor, threshold and available
  funds rules stated in the feature description
  ([a5-request-loan.feature](../../features/ui/a5-request-loan.feature) (lines 1-11)); only two of
  the table's columns are exercised (approved and denied by threshold). A "down payment exceeds
  available funds" row would complete it cheaply.
- **State transition / use case:** FR-B2 login -> create -> deposit -> transfer -> history.
- **Experience-based:** the probe findings F-01..F-07 and assert-as-observed policy are explicit
  error-guessing outputs.
- **Risk-based:** backlog scoring drives remediation order; the risk register needs the
  reconciliation in R-02 to remain trustworthy.

## Pedagogical Comments

- Comments consistently explain why, citing decisions and incidents (PBR-07 row race, F-02 WAR
  rename, magento "one stdout formatter" lesson in [cucumber.js](../../cucumber.js) (lines 18-19)).
- Feature descriptions teach the domain rules (A5) and the testing policy (B4).
- The style folders' READMEs and the walkthroughs give learners a guided comparison.
- Improvement: one comment overstates its guarantee ("read-only against seed state", R-07), and
  [core.ts](../../src/screenplay/core.ts) (line 4) promises one-line steps that the glue does not
  keep (R-08). Pedagogical comments must be true to be useful.

---

[<- Previous: Recommendations](05_RECOMMENDATIONS.md) | [Back to Index](00_CODE_REVIEW_Claude_v1_20261105T1412Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)
