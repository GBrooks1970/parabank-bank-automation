# Architecture Assessment

[<- Back to Index](00_CODE_REVIEW_CODEX_v2_20260929T0630Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)

**Reviewer:** AI assistant (Codex GPT-6)
**Date:** 2026-09-29T06:30Z

## Test Pyramid

36 framework unit tests underpin 14 API and 8 UI system scenarios. API-first breadth fits an external demo SUT. The units validate automation helpers, not ParaBank internals; upstream Java tests are explicitly skipped during builds. No SUT coverage percentage is available. See [qa-strategy.md](../../docs/qa-strategy.md) (line 22).

## SOLID Principles

- **SRP:** clients own transport, Tasks own actions, Questions read state, quality modules inspect artefacts; larger step files still combine orchestration and assertions.
- **OCP:** small Task/Question interfaces permit extension; new client methods deliberately force matrix decisions.
- **LSP:** no substitution defect is established; custom Actor and Serenity Actor are distinct, non-interchangeable implementations.
- **ISP:** API abilities avoid browser dependencies; the 14-method REST client is cohesive around one service.
- **DIP:** Tasks access actor abilities while transport uses concrete fetch beneath clients; this is proportionate, though future focused transport tests could use injection.

Evidence: [core.ts](../../src/screenplay/core.ts) (line 10), [abilities.ts](../../src/screenplay/abilities.ts) (line 1), [operation-contracts.ts](../../src/api/operation-contracts.ts) (line 1).

## KISS (Keep It Simple, Stupid)

Serial single-SUT execution is easier to reason about than parallel resets. Explicit option waits and a small SOAP adapter suit current scope. Correct the orchestration proof defects without introducing a generic test-platform abstraction. See [cucumber.js](../../cucumber.js) (line 1).

## YAGNI (You Aren't Gonna Need It)

No second browser framework, broad SOAP library or microservice stack is justified by current requirements. Optional business coverage remains deferred. Preserve the compact design while correcting demonstrated false-positive paths.

## REST + OpenAPI

Live schemas resolve per operation with status, media, format and explicit exclusion evidence. Named exceptions document upstream defects; they do not make the demo a production security model. The fast-uri advisory requires scoped toolchain maintenance. See [spec-conformance.ts](../../src/api/spec-conformance.ts) (line 48).

## ISTQB Strategies

Equivalence partitions cover valid/malformed transfers; boundaries cover zero, minimum positive and exact available balance. B2 follows state transitions; A5 samples a pinned approval decision table; UI journeys provide use-case coverage. Risk-based scope is clear. Safety properties need negative proof: R-01 shows why a green control alone cannot establish its claimed property.

## Pedagogical Comments

Comments explain asynchronous waits, namespace-qualified SOAP, reset order and immutable pins. Prior race/pin incidents retain useful empirical history. Correct stale comments and weak oracles rather than teaching stronger guarantees than the implementation proves. See [ui.steps.ts](../../features/ui/steps/ui.steps.ts) (line 52) and [project-contract.md](../../docs/project-contract.md) (line 26).

---

[<- Previous: Recommendations](05_RECOMMENDATIONS.md) | [Back to Index](00_CODE_REVIEW_CODEX_v2_20260929T0630Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)
