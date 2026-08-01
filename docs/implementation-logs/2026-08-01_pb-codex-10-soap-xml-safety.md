# PB-CODEX-10 SOAP XML Safety — 2026-08-01

## Session Summary

This session hardened the lightweight DR-PB-07 SOAP envelope builder against unsafe XML names
and reserved characters in parameter values. Operation, parameter, and response-tag names now
use a conservative prefix-free XML-name subset, while parameter text escapes all five reserved
characters. Focused SOAP tests, live REST↔SOAP coverage, and the full project contract passed on
Node 24 with clean Docker teardown.

---

## Objectives

1. ✅ Constrain SOAP operation and parameter names to known-safe XML names.
2. ✅ Escape ampersands, angle brackets, and both quote styles in parameter text.
3. ✅ Preserve qualified requests, the deliberate unqualified fault path, and response parsing.
4. ✅ Validate focused SOAP behaviour, live parity, and the full project contract.
5. ⏸️ Add implementation PR and post-merge default-branch CI evidence after owner review.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript / Node 24.18.0 | SUT-independent unit tests | 15/15 | 17/17 | ✅ PASS |
| Cucumber API | Targeted SOAP selection: B3 parity + B4 fault | Not separately targeted | 3/3 scenarios; 11/11 steps | ✅ PASS |
| Cucumber API | Smoke scenarios | 2/2 | 2/2 | ✅ PASS |
| Cucumber UI | Smoke scenarios | 1/1 | 1/1 | ✅ PASS |
| Cucumber API | Full API lane | 14/14 scenarios; 49/49 steps | 14/14 scenarios; 49/49 steps | ✅ PASS |
| Serenity/JS + Playwright | Full UI lane | 8/8 scenarios; 49/49 steps | 8/8 scenarios; 49/49 steps | ✅ PASS |
| Serenity artefacts | Report-content check | 8/8 UI scenarios | 8/8 UI scenarios | ✅ PASS |
| Docker / PowerShell | Pinned build, boot gate, teardown | Overlapping Maven retry failed | PASS | ✅ PASS |

The local contract used `pwsh ./scripts/build-sut.ps1`, `docker compose up -d`,
`pwsh ./scripts/gate.ps1`, Node 24 `npm run verify`, and `docker compose down`. The final
single-writer pinned build passed in 154.7 seconds. An earlier retry failed while copying a CXF
JAR because the first build invocation, whose command wrapper had timed out, still had a Maven
container writing to the same bind mount. That original container exited successfully; after
confirming no competing writer remained, the unchanged contractual build passed.

Java was unavailable locally, so the existing report command skipped HTML generation while the
JSON report-content guard passed; CI installs Java and enforces the HTML. `npm ci` continued to
report the separately recorded high advisory PBR-03; no dependency changes were included.

---

## Changes Implemented

### Safe XML element names and text emission

**Files changed:**

- `src/api/soap.ts` — added a conservative ASCII XML-name validator that forbids caller-supplied
  prefixes and markup characters while retaining names used by current ParaBank operations.
- `src/api/soap.ts` — added `escapeXmlText` to encode `&`, `<`, `>`, `"`, and `'` before a
  parameter value is emitted between element tags.
- `src/api/soap.ts` — applied name validation to response-tag extraction so the tag argument
  cannot alter the regular expression used for minimal DR-PB-07 scalar parsing.

The module continues to own the `par:` namespace prefix. Both the normal qualified request shape
and the deliberately unqualified PB-B4 fault-path option remain supported.

### Focused executable safety evidence

**Files changed:**

- `tests/unit/soap.test.ts` — added exact escaping checks for all five reserved characters,
  invalid operation and parameter-name cases, and invalid response-tag rejection.
- `tests/unit/soap.test.ts` — retained and reran the exact current qualified envelope,
  unqualified fault-path envelope, namespace-tolerant account parsing, and SOAP fault extraction.

### Authoritative backlog reconciliation

**Files changed:**

- `docs/backlog.md` — advanced to v17, closed PB-CODEX-09 with project PR #22 and post-merge
  main-CI evidence, and recorded the PB-CODEX-10 implementation state.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Accept a conservative prefix-free ASCII XML-name subset. | Current ParaBank operation and parameter names need only letters, digits after the first character, underscore, dot, and hyphen; the module must retain control of `par:`. | A complete Unicode XML Name parser adds complexity without a current use case; accepting colons would allow callers to replace the namespace prefix. |
| Escape all five predefined XML entities in text values. | Encoding quotes as well as required text delimiters gives one predictable safe text emitter and directly satisfies PB-CODEX-10 evidence. | Escaping only `&` and `<` is technically sufficient for most element text but leaves inconsistent handling and weaker tests. |
| Validate response tag names before building the extraction expression. | All response tags are internal known names, and applying the same subset prevents regex/meta-character injection at negligible cost. | A separate regex-escaping helper would permit names that are not valid for this deliberately small SOAP surface. |
| Keep the lightweight hand-built envelope rather than add an XML/SOAP dependency. | DR-PB-07 remains appropriate for scalar `getAccount`-class reads, and the hardening is small and fully unit-tested. | A SOAP library or DOM builder would increase dependency and integration cost without crossing DR-PB-07's revisit trigger. |

No ADR was created. The implementation hardens the already-adopted DR-PB-07 lightweight SOAP
approach and does not change its architecture, supported surface, or revisit trigger.

---

## Documentation Updates

- `docs/backlog.md` — closed PB-CODEX-09, advanced to v17, and recorded PB-CODEX-10 progress.
- `docs/implementation-logs/2026-08-01_pb-codex-10-soap-xml-safety.md` — created this immutable
  implementation record.

---

## Lessons Learned

- XML values can be escaped, but element names must be validated; treating those two inputs
  differently keeps the builder small and reviewable.
- Escape ampersands before inserting the other entity references so newly introduced entity
  ampersands are not escaped a second time.
- A timed-out host command can leave its Docker child running against a bind mount. Before
  retrying a containerised build, inspect active containers and avoid concurrent writers.
- Preserving the intentional unqualified request gives the negative-path scenario continuing
  value while normal envelopes become safer.

---

## Recommendations / Next Steps

- [ ] Complete PB-CODEX-10 with implementation PR CI, owner merge, and post-merge `main` CI
  evidence — current LOW priority.
- [ ] Reconcile the project worklist after PB-CODEX-10 merges; PB-CODEX-01…10 will then be closed.
- [ ] Leave PBR-01…PBR-05 open until their individual success criteria are satisfied.

---

*Session logged: 2026-08-01. Author: Codex.*
