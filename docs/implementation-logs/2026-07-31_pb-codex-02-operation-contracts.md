<!--
  AUDIENCE: Engineers and AI agents reviewing this project's development history.
  PURPOSE:  Record the PB-CODEX-02 operation-contract delivery, decisions, failures,
            and verification evidence. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-07-31_pb-codex-02-operation-contracts.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# PB-CODEX-02 — Operation-aware ParaBank REST contracts — 2026-07-31

## Session Summary

Implemented the DR-PB-08 operation-aware contract matrix for every one of the 14 public
`ParaBankRestClient` methods. FR-B1 now resolves response schemas from the live OpenAPI
method/path/status/media declaration, verifies observed status and content type, reports
14/14 coverage in CI output, and permits only five narrowly named observed-risk cases.
The full five-command project contract passes locally with Docker and Node 24.

---

## Objectives

1. ✅ Close PB-CODEX-01 against merged PR #14 and its successful post-merge main CI run.
2. ✅ Implement a machine-readable operation matrix that fails typecheck when the REST
   client and approved coverage drift apart.
3. ✅ Exercise all 14 approved client operations against deterministic live SUT state.
4. ✅ Replace detached component-schema checks with live operation response resolution.
5. ✅ Reconcile documentation, backlog risks, and verification evidence for PB-CODEX-02.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript | `npm run typecheck` | Existing client; no matrix completeness proof | 14/14 compile-time matrix binding | ✅ PASS |
| API | `features/api` | 10 scenarios; FR-B1 sampled four reads | 11 scenarios / 43 steps; all 14 methods exercised | ✅ PASS |
| UI | `features/ui` | 8 scenarios | 8 scenarios / 49 steps | ✅ PASS |
| Smoke | API + UI safety proof | 3 scenarios | 3 scenarios; seed byte-identical | ✅ PASS |
| Project contract | build → compose up → gate → Node 24 verify → compose down | Not run for this item | All five commands complete; teardown successful | ✅ PASS |

The first matrix execution failed honestly on `LoanResponse.responseDate`: the live SUT
returns epoch milliseconds while OpenAPI declares a `string` with `date-time` format. The
behaviour is now documented as PBR-05 and permitted only for `requestLoan`; all other
unapproved schema deviations still fail the gate. Local Serenity HTML generation was
skipped because Java is absent, as designed; JSON artefact validation passed and CI remains
responsible for enforcing the HTML report.

---

## Changes Implemented

### Machine-readable 14-operation contract

**Files changed:**
- `src/api/operation-contracts.ts` — defines the approved method/path/status/media/body
  contract and compile-time bidirectional completeness checks against the public client.
- `src/api/types.ts` — records the normalised response media type.
- `src/api/client.ts` — captures the actual `Content-Type` value from every response.

### Live OpenAPI operation resolution

**Files changed:**
- `src/api/spec-conformance.ts` — resolves the live response contract by operation, checks
  observed status and media type, validates standard formats, and records coverage,
  exclusions, and applied named deviations.
- `package.json`, `package-lock.json` — add exact `ajv-formats` 3.0.1 for OpenAPI format
  validation.

The `/openapi.json` bootstrap is intentionally handled as a special operation because the
document describes the service but does not list its own endpoint. It must still return
JSON containing OpenAPI 3.0.1 and a non-empty paths object.

### Deterministic full-matrix execution

**Files changed:**
- `src/screenplay/contract-tasks.ts` — exercises all approved reads, mutations,
  administration calls, and the OpenAPI bootstrap against controlled state.
- `features/api/b1-rest-contract.feature` — replaces detached schema-name assertions and
  adds the 14/14 operation-matrix scenario.
- `features/api/steps/api.steps.ts` — introduces operation-aware assertions and prints the
  complete coverage summary for CI evidence.
- `features/support/hooks.ts` — reinitialises the database after contract-matrix execution,
  including failure paths.

### Narrow observed-risk handling

The gate keeps the existing PBR-01 transaction-date allowance and adds two explicit risks:
PBR-04 permits unquoted text only for the JSON-labelled `deposit`, `withdraw`, and
`transfer` confirmations; PBR-05 permits epoch milliseconds only at
`requestLoan.responseDate`. No global coercion or permissive schema mode was introduced.

---

## Technical Decisions

DR-PB-08 already records the structural decision to bind conformance to live OpenAPI
operations. Session-level implementation decisions were:

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Bind the matrix to the public client type in both directions | Adding or removing a client method must fail typecheck until its contract disposition is explicit | A manually counted list that can silently drift |
| Report approved coverage, live exclusions, and applied risks separately | “14/14” is meaningful only when the reader can see what it covers and what it intentionally does not | A single opaque scenario-pass count |
| Keep PBR-04 and PBR-05 as operation/path-specific allowances | The test remains strict everywhere the observed implementation matches the contract | Global content parsing or Ajv coercion |
| Always re-seed after matrix execution | The scenario deliberately calls `cleanDB`; failure must not leave later suites or developers with destroyed seed state | Relying on the happy-path final `initializeDB` call |

---

## Documentation Updates

- `README.md` — updates the API lane to 11 operation-aware scenarios.
- `docs/design-document.md` — advances to v1.2 and records the approved DR-PB-08 matrix,
  including PBR-04/PBR-05 handling.
- `docs/qa-strategy.md` — documents 14-operation coverage and the CI summary evidence.
- `docs/backlog.md` — advances to v9, closes PB-CODEX-01, records PB-CODEX-02 progress,
  adds PBR-04/PBR-05, and refreshes the verified main baseline.
- `docs/templates/implementation-log.template.md` — copies the portfolio's canonical
  implementation-log template into the project as required by the logging workflow.
- `docs/implementation-logs/2026-07-31_pb-codex-02-operation-contracts.md` — records this
  immutable implementation history.

---

## Lessons Learned

- Resolving the response from the actual OpenAPI operation exposed a real contract defect
  that detached component validation could not represent: `responseDate` is numeric in the
  running SUT even though the document declares a formatted string.
- Media-type checks and body parsing are separate concerns. Three mutation endpoints label
  unquoted confirmation text as JSON, so a narrow operation-specific fallback is safer and
  more honest than weakening JSON handling globally.
- Coverage evidence should name every exercised and excluded operation. A total without the
  set behind it cannot prove the intended surface stayed covered.
- Cleanup belongs in a failure-safe hook whenever a conformance exercise includes destructive
  administration operations.

---

## Recommendations / Next Steps

- [ ] Merge PB-CODEX-02 and verify its default-branch CI before checking the backlog item
  complete — owner / HIGH.
- [ ] Implement PB-CODEX-03, the independent unit-test lane — next cycle item / MEDIUM.
- [ ] Resolve PBR-03 (`brace-expansion` audit advisory) in its own dependency-focused PR so
  this behaviour change remains reviewable — owner / MEDIUM.
- [ ] Reconcile the portfolio-root worklist after the project PR merges — Codex / governance.

---

*Session logged: 2026-07-31. Author: Codex.*
