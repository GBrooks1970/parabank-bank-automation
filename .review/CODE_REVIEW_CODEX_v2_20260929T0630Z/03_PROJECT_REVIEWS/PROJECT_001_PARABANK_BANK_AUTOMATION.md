# Project Review: ParaBank

[<- Back to Index](../00_CODE_REVIEW_CODEX_v2_20260929T0630Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)

**Reviewer:** AI assistant (Codex GPT-6)
**Date:** 2026-09-29T06:30Z

## Project Assessment

- **Architecture:** Lane B uses a small Actor/Ability/Task/Question core; Lane A uses Serenity/JS and Playwright. Shared REST clients permit UI outcome checks without browser implementation duplication. See [core.ts](../../../src/screenplay/core.ts) (line 10) and [ui.steps.ts](../../../features/ui/steps/ui.steps.ts) (line 112).
- **Runtime lifecycle and isolation:** Profiles run serially. Scenarios get fresh API actor notes; UI actors are re-engaged per scenario and the shared browser closes after the run. Mutating scenarios reset before execution; loan/contract-matrix scenarios additionally reset afterwards. No parallel isolation guarantee is claimed. BeforeAll seeding undermines the separate smoke proof (R-01). See [hooks.ts](../../../features/support/hooks.ts) (line 12) and [serenity.setup.ts](../../../features/ui/support/serenity.setup.ts) (line 33).
- **Synchronisation and stability:** UI Tasks wait for concrete asynchronous options and completion sections; the overview assertion waits for its account row. REST/SOAP use abort-backed deadlines; reset uses bounded polling. Stability against a running SUT was not re-tested. See [tasks.ts](../../../src/screenplay/ui/tasks.ts) (line 68) and [reset.ts](../../../src/api/reset.ts) (line 7).
- **Coverage:** Fresh dry-run finds 14 API and 8 UI scenarios; 36 framework units pass. Features cover state transitions, zero/one-cent/exact-balance boundaries, negative observed responses, REST/SOAP parity and approved/denied loans. No quarantine or unscheduled feature is counted as passing. Positions/stock trading and broader LoanProcessor SOAP remain unscheduled. See [b2-stateful-flow.feature](../../../features/api/b2-stateful-flow.feature) (line 26) and [backlog.md](../../../docs/backlog.md) (line 988).
- **Data and authentication:** john/demo and generated customers are demo fixtures. REST login embeds credentials in its route because that is the observed SUT contract; subsequent mutations carry no session token. These tests do not establish production authorisation. Created IDs are captured; existing IDs/customer 12212 intentionally name seed fixtures. See [client.ts](../../../src/api/client.ts) (line 41) and [ui.steps.ts](../../../features/ui/steps/ui.steps.ts) (line 64).
- **Maintainability:** Type-bound operation coverage, named deviations, money rounding and unit-tested evidence packaging are strengths. UI substring matching and shared output directories weaken proof fidelity (R-02/R-04). The compact custom API core is analogous to Serenity, not an interchangeable reporting implementation.
- **Documentation and credibility:** README correctly limits REST cross-check claims to A2-A4 and identifies A1/A5 UI oracles. Decision records and immutable implementation logs retain useful rationale. Current-status drift requires R-05; historical successful runs are not fresh full-suite results. See [README.md](../../../README.md) (line 6).

## Deferred and Accepted Coverage

PBR-01 (transaction date), PBR-04 (unquoted JSON mutation confirmations) and PBR-05 (loan response date) are recorded upstream deviations with SUT-pin review triggers, not unimplemented delivery. The matrix covers approved client operations and reports excluded live endpoints. Broader positions/LoanProcessor coverage needs an explicit scope decision; it is not automatic remediation.

---

[<- Previous: Risks and Issues](../02_RISKS_AND_ISSUES.md) | [Back to Index](../00_CODE_REVIEW_CODEX_v2_20260929T0630Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)
