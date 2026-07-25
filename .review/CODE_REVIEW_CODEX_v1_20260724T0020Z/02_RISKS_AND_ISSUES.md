# Risks and Issues

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md)

**Reviewer:** AI assistant (CODEX GPT-5)

Findings are ordered from highest to lowest severity. Existing backlog risks are assessed after
the new review findings.

## Risk #1 (HIGH) - FR-B1 proves only a narrow subset of its declared contract surface

**Risk Description:** The design makes FR-B1 responsible for exercising the in-scope REST client
surface against the live OpenAPI specification. The executable feature validates four read
operations, and the helper validates detached component schemas rather than resolving the schema,
media type, and status declared for each operation. The requirement is therefore marked complete
with materially narrower proof than its text promises.

**Evidence:**

- [design-document.md](../../docs/design-document.md) (lines 143-147) says the in-scope endpoints
  in section 5.4 are exercised and responses conform to the live spec's schemas and statuses.
- [design-document.md](../../docs/design-document.md) (lines 268-275) lists login, customer,
  accounts, transactions, create account, deposit, withdraw, transfer, bill pay, loan, initialise,
  and clean operations.
- [b1-rest-contract.feature](../../features/api/b1-rest-contract.feature) (lines 10-30) covers
  login, account list, one account, and transactions only. It checks documented status for login
  and account read, not every covered operation.
- [spec-conformance.ts](../../src/api/spec-conformance.ts) (lines 21-24, 31-50) registers the live
  document but compiles named component schemas directly. It does not bind an observed response
  to a path, method, response status, content type, and referenced response schema.
- [spec-conformance.ts](../../src/api/spec-conformance.ts) (line 21) disables all format
  validation, so valid `date-time` and other declared formats are not enforced.

**Impact Analysis:**

- A response can pass a named component check even if the operation documents a different schema
  or media type.
- Most mutating client operations can drift from the live contract without FR-B1 detecting the
  change.
- The backlog's completed FR-B1 claim overstates the evidence a hiring manager or maintainer can
  inspect.
- The narrow PBR-01 allowance is visible and disciplined, but the surrounding proof is not yet a
  full operation-level contract suite.

**Refactor Recommendation and Strategy:**

1. Decide whether FR-B1 means the full section 5.4 client surface or a deliberately smaller
   contract sample. Align the design, backlog, and feature wording before changing code.
2. Create an explicit operation matrix: path, method, expected status, content type, response
   schema, mutation/reset needs, and named allowed deviations.
3. Resolve and validate the response schema from each live operation instead of accepting an
   unconstrained component name from Gherkin.
4. Add coverage for every agreed in-scope operation, reusing state created in reset-bracketed
   scenarios where necessary.
5. Enable supported OpenAPI formats, with narrow documented exceptions only where the pinned SUT
   is known to deviate.

## Risk #2 (MEDIUM) - Non-trivial automation helpers have no unit-level safety net

**Risk Description:** The suite has no tracked unit/spec test files and no unit test command.
Complex test-infrastructure behaviours are verified only indirectly through Docker-backed system
scenarios or ad hoc scripts.

**Evidence:**

- [package.json](../../package.json) (lines 10-20) defines typecheck, policy scripts, Cucumber
  lanes, report generation, and the full verify chain, but no unit test lane.
- [qa-strategy.md](../../docs/qa-strategy.md) (lines 22-24) says unit-level checks apply to
  non-trivial helpers such as the SOAP envelope builder "where cheap".
- [soap.ts](../../src/api/soap.ts) (lines 19-48) constructs XML, supports qualified/unqualified
  parameters, and parses namespaced response text without a focused test.
- [spec-conformance.ts](../../src/api/spec-conformance.ts) (lines 44-60) filters named
  deviations and validates arrays without focused positive and negative fixtures.
- [check-report.mjs](../../scripts/check-report.mjs) (lines 15-47) and
  [check-tags.mjs](../../scripts/check-tags.mjs) (lines 27-65) contain their own parsers and
  policy logic, but are tested only against the current repository layout.

**Impact Analysis:**

- Edge cases in XML escaping, namespace parsing, allowed-deviation filtering, tag inheritance, or
  report parsing require an expensive system run to expose.
- Refactoring helper code is risky because the current E2E suite demonstrates happy integration,
  not isolated behaviour boundaries.
- The architecture teaches a top-heavy Test Pyramid despite explicitly recognising unit-level
  helper tests in the QA strategy.

**Refactor Recommendation and Strategy:**

1. Add a small Node test runner (`node:test` is sufficient) or an already-approved lightweight
   unit runner.
2. Start with fixtures for SOAP XML escaping/parsing, live-spec operation/schema selection,
   allowed deviations, and duplicate/missing report scenarios.
3. Extract tag and report parsing into importable pure functions; keep their CLI wrappers thin.
4. Add the unit lane before Docker-backed tests in `npm run verify` and CI.
5. Keep the suite deliberately small: target automation logic, not the upstream ParaBank code.

## Risk #3 (MEDIUM) - The QA strategy overstates amount-boundary coverage

**Risk Description:** The ISTQB strategy says zero, minimal positive, exact available balance,
exceeding balance, and non-numeric amount partitions are applied. The executable specifications
cover excess and non-numeric transfer values, plus ordinary positive examples, but not the stated
zero, minimum-positive, or exact-balance boundaries.

**Evidence:**

- [qa-strategy.md](../../docs/qa-strategy.md) (lines 36-47) labels these techniques as applied
  and names all five amount partitions.
- [b4-negative-paths.feature](../../features/api/b4-negative-paths.feature) (lines 13-27) covers a
  non-numeric amount and an amount exceeding available balance.
- [b2-stateful-flow.feature](../../features/api/b2-stateful-flow.feature) (lines 13-16) uses
  ordinary positive deposit and transfer values.
- [a3-transfer-funds.feature](../../features/ui/a3-transfer-funds.feature) (lines 7-14) and
  [a4-bill-pay.feature](../../features/ui/a4-bill-pay.feature) (lines 7-14) use representative
  positive values, not the missing boundaries.

**Impact Analysis:**

- Boundary defects in zero handling, fractional minimum handling, and exact depletion are not
  protected despite the strategy saying they are.
- Readers cannot distinguish deliberately deferred partitions from accidentally omitted tests.
- The mismatch weakens ISTQB pedagogical credibility and the backlog's "all scope complete"
  message.

**Refactor Recommendation and Strategy:**

1. Confirm the SUT's observed values for zero, smallest meaningful positive amount, and exact
   available balance against the pinned commit.
2. Add a compact reset-bracketed Scenario Outline for the agreed boundaries, avoiding duplicated
   end-to-end journeys.
3. Record unconventional observed behaviour exactly as B4 already does.
4. If these cases are intentionally out of v1 scope, amend the QA strategy to describe them as
   candidate techniques rather than applied coverage.

## Risk #4 (MEDIUM) - CI and SUT build inputs are not fully immutable

**Risk Description:** ParaBank source and npm dependencies are pinned, but CI actions and the
containerised Maven builder are referenced by moving tags. The workflow also relies on repository
defaults for `GITHUB_TOKEN` permissions.

**Evidence:**

- [ci.yml](../../.github/workflows/ci.yml) (lines 6-16, 29-35, 49-55) has no explicit top-level
  `permissions` block and references `actions/checkout@v5`, `actions/setup-node@v5`,
  `actions/setup-java@v4`, and `actions/upload-artifact@v4`.
- [build-sut.ps1](../../scripts/build-sut.ps1) (lines 45-50) runs
  `maven:3.9-eclipse-temurin-17` by mutable tag.
- [build-sut.ps1](../../scripts/build-sut.ps1) (lines 19-43) correctly pins the upstream source
  commit, showing that immutability is already an explicit project goal.
- [package-lock.json](../../package-lock.json) (lines 1-28) is lockfile version 3 and supports
  reproducible `npm ci`, a positive contrast.

**Impact Analysis:**

- The same repository commit can execute different action or builder code after an upstream tag
  moves.
- A compromised or incorrect action tag has more token authority than the workflow explicitly
  demonstrates it needs.
- "Pinned SUT" is true for application source but not for every build input, which should be
  stated precisely.

**Refactor Recommendation and Strategy:**

1. Add least privilege, starting with `permissions: contents: read`; grant anything else only at
   job or step level when demonstrated.
2. Pin third-party and first-party actions to reviewed full commit SHAs, retaining version
   comments for update tooling.
3. Pin the Maven builder and relevant runtime base images by digest, with a deliberate refresh
   procedure similar to the ParaBank source pin.
4. Enable automated update proposals for pins, but keep owner review and the full CI gate.
5. Treat Maven caching as a performance decision, separate from immutability.

## Risk #5 (MEDIUM) - General network calls are not request-time bounded

**Risk Description:** The reset/readiness call has a five-second request timeout and a bounded
polling deadline. The general REST client, SOAP client, and live-spec fetch have no abort signal.

**Evidence:**

- [reset.ts](../../src/api/reset.ts) (lines 7-24) uses `AbortSignal.timeout(5_000)` and a bounded
  120-second polling deadline.
- [client.ts](../../src/api/client.ts) (lines 16-30) awaits `fetch()` without a signal.
- [soap.ts](../../src/api/soap.ts) (lines 27-42) awaits `fetch()` without a signal.
- [spec-conformance.ts](../../src/api/spec-conformance.ts) (lines 15-24) fetches the live spec
  without a signal.
- [hooks.ts](../../features/support/hooks.ts) (lines 9-16) sets a 30-second Cucumber timeout, but
  a step timeout does not itself abort an in-flight fetch.

**Impact Analysis:**

- A half-open connection can outlive the failed step and delay process shutdown or consume the
  30-minute CI job timeout.
- Failure diagnostics report a Cucumber timeout rather than the operation and request deadline.
- The reliability policy is inconsistent between readiness and ordinary SUT calls.

**Refactor Recommendation and Strategy:**

1. Add a shared request timeout policy to REST, SOAP, and live-spec calls.
2. Pass `AbortSignal.timeout(...)` or a caller-provided signal to every fetch.
3. Include method, operation, URL path, and elapsed limit in timeout errors without exposing
   credentials.
4. Cover timeout and abort behaviour in the unit lane proposed by Risk #2.

## Risk #6 (LOW) - Post-closure documentation is not fully reconciled

**Risk Description:** The authoritative backlog and current history say the project is resting,
but the README still says PB-P5 registration is in progress. The latest handover is paired and
useful but predates the merge that closed its own open-item list.

**Evidence:**

- [README.md](../../README.md) (lines 6-17) reports "registration in progress (PB-P5)".
- [backlog.md](../../docs/backlog.md) (lines 14-17, 241-276) says PB-P0 through PB-P5 are
  complete and the project is resting.
- Git history places closure commit `f1de0cb` and merge `dc3a209` after handover v2.
- The paired v2 handover says closure PR #11 still needed confirmation; `dc3a209` is that merge.

**Impact Analysis:**

- The first public status a reviewer sees is stale even though the canonical backlog is correct.
- The preflight warning is honest, but a cold-resume agent must perform avoidable reconciliation.
- README line 13 also says every UI journey is REST cross-checked; the executable design requires
  REST cross-checks for money movement, not A1 registration or A5 loan rendering.

**Refactor Recommendation and Strategy:**

1. Refresh the README status to complete/resting and describe REST cross-checks as applying to
   monetary state outcomes.
2. Keep the backlog authoritative; do not reopen PB-P5 merely to make the summary current.
3. Refresh the handover only if the portfolio's freshness policy calls for it; otherwise record
   that v2 is semantically current after confirming the closure merges.

## Risk #7 (LOW) - A bill-pay step phrase claims a UI assertion it does not make

**Risk Description:** The step "the UI confirms ... to that payee" reads the generated payee name
but asserts only generic completion text and the truncated numeric amount. The later REST step
does prove the transaction names the payee, so the end-to-end outcome is stronger than this local
step but the executable wording is inaccurate.

**Evidence:**

- [a4-bill-pay.feature](../../features/ui/a4-bill-pay.feature) (lines 11-14) separates the UI
  confirmation from the REST transaction assertion.
- [ui.steps.ts](../../features/ui/steps/ui.steps.ts) (lines 168-174) recalls `payeeName` but never
  uses it in either UI assertion.
- [ui.steps.ts](../../features/ui/steps/ui.steps.ts) (lines 181-187) correctly verifies the REST
  transaction contains both the bill-payment description and generated payee.

**Impact Analysis:**

- A UI regression that displays the wrong payee could pass the named UI step.
- Unused recalled data makes the omission easy to miss in review because `noUnusedLocals` is not
  enabled.
- Business-readable Gherkin and executed assertions are not exactly aligned.

**Refactor Recommendation and Strategy:**

1. Assert the payee text in the bill-payment result if the pinned UI renders it reliably.
2. Otherwise rename the step to claim only completion and amount, leaving payee identity to the
   explicit REST assertion.
3. Consider enabling unused-local checks if compatible with the framework typings and generated
   glue.

## Risk #8 (LOW) - SOAP XML values are interpolated without escaping

**Risk Description:** The lightweight SOAP builder inserts operation, parameter names, and values
directly into XML. Current calls use repository-controlled identifiers, so exploitability is low,
but the helper's general signature accepts arbitrary strings.

**Evidence:**

- [soap.ts](../../src/api/soap.ts) (lines 19-33) accepts an arbitrary operation and parameter
  record, then concatenates both keys and values into element names and text.
- [api.steps.ts](../../features/api/steps/api.steps.ts) (lines 192-203) currently calls the helper
  only with fixed `getAccount` and a numeric account ID.
- [decision-register.md](../../docs/decision-register.md) (line 19) says DR-PB-07 must be revisited
  if SOAP usage grows beyond simple reads.

**Impact Analysis:**

- Future text values containing `&`, `<`, or `>` will produce malformed XML.
- Future user-derived operation or key names could alter the envelope structure.
- The current bounded use is safe enough for v1, but the helper appears more general than its
  tested contract.

**Refactor Recommendation and Strategy:**

1. Restrict operation and parameter names to a typed allow-list for supported SOAP calls.
2. Escape XML text values or use a small standards-compliant XML builder.
3. Add fixture tests for reserved characters, namespaces, faults, and missing scalar fields.
4. Trigger the DR-PB-07 re-evaluation before accepting complex SOAP types.

## Existing Backlog Risks and Deferred Coverage

- **PBR-01 remains valid and LOW.** The `Transaction.date` deviation is narrow, named in the
  feature, and should be re-evaluated on any future upstream pin change.
- **PBR-02 remains valid and LOW.** The latest exact-SHA CI check is green but still has one
  annotation that `setup-java@v4` and `upload-artifact@v4` target the deprecated Node 20 action
  runtime and are being forced onto Node 24.
- **Maven caching and a compose healthcheck remain proposals, not commitments.** Their absence is
  not a defect; caching would improve runner efficiency, while the host polling gate already
  provides bounded readiness.
- **Positions/stock trading and broader LoanProcessor SOAP coverage remain explicitly out of
  scope.** Promote them through a new approved phase or worklist rather than silently treating
  them as missing PB-P5 work.

---

[<- Previous: Executive Summary](01_EXECUTIVE_SUMMARY.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_PARABANK_BANK_AUTOMATION.md)
