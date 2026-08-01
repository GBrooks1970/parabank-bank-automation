# PB-CODEX-07 Request Deadlines — 2026-08-01

## Session Summary

This session bounded ParaBank REST, SOAP, and live OpenAPI traffic with one abort-backed
deadline policy. The policy remains active through response-body consumption, produces
credential-safe contextual errors, and preserves caller cancellation and the reset poller's
separate retry bounds. The complete five-command local contract passed on Node 24 after one
transient Docker Hub 502 was retried successfully.

---

## Objectives

1. ✅ Add one central deadline policy to general REST, SOAP, and live-spec requests.
2. ✅ Make timeout errors identify method, operation, safe route, and limit without secrets.
3. ✅ Prove deadline abort and caller-abort behaviour with SUT-independent unit tests.
4. ✅ Preserve the existing bounded reset poller and pass the full project contract.
5. ⏸️ Add PR/default-branch CI evidence after owner review and merge.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript / Node 24.18.0 | Typecheck | PASS | PASS | ✅ PASS |
| TypeScript / Node 24.18.0 | SUT-independent unit tests | 12/12 | 15/15 | ✅ PASS |
| Cucumber API | Smoke scenarios | 2/2 | 2/2 | ✅ PASS |
| Cucumber UI | Smoke scenarios | 1/1 | 1/1 | ✅ PASS |
| Cucumber API | Full API lane | 14/14 scenarios; 49/49 steps | 14/14 scenarios; 49/49 steps | ✅ PASS |
| Serenity/JS + Playwright | Full UI lane | 8/8 scenarios; 49/49 steps | 8/8 scenarios; 49/49 steps | ✅ PASS |
| Serenity artefacts | Report-content check | 8/8 UI scenarios | 8/8 UI scenarios | ✅ PASS |
| Docker / PowerShell | Pinned build, boot gate, teardown | PASS | PASS | ✅ PASS |

The local gate used `pwsh ./scripts/build-sut.ps1`, `docker compose up -d`,
`pwsh ./scripts/gate.ps1`, Node 24 `npm run verify`, and `docker compose down`. Java was
not present locally, so the existing report command skipped HTML generation while the JSON
content guard passed; CI installs Java and enforces HTML. The first build attempt encountered
a Docker Hub 502 while reading the pinned Tomcat manifest; an unchanged retry resolved both
approved digests and completed the build in 186.5 seconds.

---

## Changes Implemented

### Central abort-backed request policy

**Files changed:**

- `src/api/request-deadline.ts` — added the 10-second policy, caller-abort forwarding,
  contextual `RequestDeadlineError`, positive-limit validation, and defensive path redaction.
- `tests/unit/request-deadline.test.ts` — added three tests for deadline-triggered abort,
  unmodified caller cancellation, and removal of origins, query values, fragments, and
  login credentials from diagnostics.

The helper accepts the complete asynchronous request operation rather than only wrapping
`fetch()`. This keeps the timer and signal active while the response body is consumed, since
the fetch promise itself can settle as soon as response headers arrive.

### REST, SOAP, and live-spec integration

**Files changed:**

- `src/api/client.ts` — routes every public REST operation through the shared policy and
  derives safe route templates from the typed operation matrix.
- `src/api/soap.ts` — bounds each SOAP operation through XML body consumption while naming
  the logical SOAP operation in failures.
- `src/api/spec-conformance.ts` — bounds fetching, media validation, and JSON consumption of
  the live OpenAPI document.

`src/api/reset.ts` was intentionally not changed: its readiness loop already has a
120-second total bound and a 5-second bound per retry attempt.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Use one 10-second policy for REST, SOAP, and live-spec operations. | A single constant makes the behaviour reviewable and keeps ordinary ParaBank calls fast-failing while allowing the reset lifecycle its deliberate retry window. | Per-client magic numbers would drift; applying 10 seconds to the reset lifecycle would remove its readiness semantics. |
| Wrap response consumption, not only the initial `fetch()` promise. | Fetch can resolve when headers arrive, leaving a stalled body outside a prematurely cleared timeout. | Returning a response from a fetch-only wrapper would not bound the complete operation. |
| Use typed REST route templates for diagnostics and redact known login segments defensively. | `/login/{username}/{password}` gives actionable context without repeating credentials; origins and queries are unnecessary diagnostics. | Logging the actual URL would expose credentials and parameters; omitting the path entirely would be less actionable. |
| Preserve upstream caller cancellation as its original reason. | A caller-initiated abort is operationally distinct from a deadline and must not be misdiagnosed. | Converting every abort to `RequestDeadlineError` would obscure the cause. |

No ADR was created. These choices implement the already-approved PB-CODEX-07 acceptance
criteria and are recorded in design v1.7 rather than adding a new owner decision.

---

## Documentation Updates

- `docs/backlog.md` — closed PB-CODEX-06 with merge/main-CI evidence, advanced to v14,
  and recorded PB-CODEX-07 implementation and local-gate evidence.
- `docs/decision-register.md` — marked DR-PB-10 adopted now PB-CODEX-05/06 are merged.
- `docs/design-document.md` — advanced to v1.7 and defined the central deadline,
  diagnostic, response-consumption, and reset-poller boundaries.
- `docs/qa-strategy.md` — added timeout/abort diagnostics to the framework unit scope and
  PB-CODEX-07 exit criteria.
- `docs/implementation-logs/2026-08-01_pb-codex-07-request-deadlines.md` — created this
  immutable implementation record.

---

## Lessons Learned

- A timeout wrapped only around the initial fetch promise does not necessarily bound body
  consumption; scope the deadline around the complete operation.
- Route templates are better diagnostics than concrete credential-bearing paths, and a
  central redaction fallback provides defence in depth if a concrete URL is passed later.
- Digest drift checks introduce an external-registry availability dependency; a transient
  502 should be recorded and retried unchanged, never worked around by weakening the pin.

---

## Recommendations / Next Steps

- [ ] Complete PB-CODEX-07 with implementation PR CI, owner merge, and post-merge `main`
  CI evidence — current MEDIUM priority.
- [ ] Implement PB-CODEX-08 README truth reconciliation after PB-CODEX-07 closes — LOW
  priority, next worklist item.
- [ ] Leave PBR-01…PBR-05 open until their individual success criteria are satisfied.

---

*Session logged: 2026-08-01. Author: Codex.*
