# PB-CODEX-03 — Fast framework unit lane — 2026-07-31

## Session Summary

Implemented a SUT-independent TypeScript unit lane for the four non-trivial framework
areas named by PB-CODEX-03. Twelve focused tests now run immediately after typecheck and
before the live-SUT lanes in `npm run verify`; the complete five-command project contract
passes under Node 24 with Docker teardown successful. PB-CODEX-02 was also closed against
its merged PR and successful post-merge `main` CI evidence.

---

## Objectives

1. ✅ Close PB-CODEX-02 only after project PR #15 and post-merge `main` CI passed.
2. ✅ Add normal SOAP envelope and response-parsing unit coverage without implementing
   the separately scheduled PB-CODEX-10 hardening.
3. ✅ Unit-test OpenAPI operation/default-response and named-deviation selection offline.
4. ✅ Prove Cucumber feature-tag inheritance and the fixed smoke-safety policy.
5. ✅ Prove exact Serenity scenario evidence against valid JSON artefacts without a live SUT.
6. ✅ Place the unit command before every E2E gate and pass the full project contract.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript / Node 20 + 24 | `npm run test:unit` | No unit command | 12/12 tests on both supported runtimes | ✅ PASS |
| TypeScript | `npm run typecheck` | Existing source/features only | Source + scripts + tests | ✅ PASS |
| Cucumber | Store-safe smoke proof | 3/3 scenarios | 3/3 scenarios; seed byte-identical | ✅ PASS |
| Cucumber | API lane | 11/11 scenarios, 43/43 steps | 11/11 scenarios, 43/43 steps; FR-B1 14/14 | ✅ PASS |
| Serenity/JS | UI lane | 8/8 scenarios, 49/49 steps | 8/8 scenarios, 49/49 steps | ✅ PASS |
| Serenity | Local report integrity | 8/8 JSON scenario names | 8/8 exact names in valid JSON | ✅ PASS |
| Project contract | build → compose up → gate → verify → compose down | PB-CODEX-02 baseline green | Final all-five-command run in 202 seconds | ✅ PASS |

Local Serenity HTML generation remained intentionally skipped because Java is absent; the
JSON evidence check passed and CI will enforce the HTML artefact. A post-contract Node 20
compatibility run initially found no tests because Windows did not expand the Node-24-capable
`*.test.ts` glob; deterministic file discovery replaced the glob and 12/12 then passed on
both Node 20 and 24. `npm ci` continued to report the existing PBR-03 `brace-expansion`
advisory; this PR does not change dependencies.

---

## Changes Implemented

### Fast TypeScript unit command and gate ordering

**Files changed:**
- `package.json` — adds `npm run test:unit` and places it after
  typecheck but before tag, smoke, API, UI, and report gates.
- `scripts/run-unit-tests.mjs` — discovers sorted TypeScript tests and passes explicit paths
  to Node's test runner with the `tsx` loader, avoiding Windows/Node-version glob drift.
- `tsconfig.json` — includes TypeScript scripts and unit tests in the compile-time gate.
- `tests/unit/*.test.ts` — adds 12 focused tests across four required helper areas.

No new test-framework dependency was added; the lane uses Node's test runner through the
already-installed `tsx` toolchain.

### SOAP construction and parsing seams

**Files changed:**
- `src/api/soap.ts` — extracts `buildSoapEnvelope` and `parseAccountSoapResponse`, while
  the network-facing calls continue to use the same observed request/response behaviour.
- `tests/unit/soap.test.ts` — covers qualified and intentionally unqualified normal
  envelopes, namespace-tolerant tags, account parsing, and fault text extraction.

Reserved-character escaping and XML-name validation remain deliberately untouched because
they belong to PB-CODEX-10 and require their own focused review.

### Offline OpenAPI conformance evidence

**Files changed:**
- `src/api/spec-conformance.ts` — adds `fromDocument`, with live loading delegating to the
  same constructor path used by offline tests.
- `tests/unit/spec-conformance.test.ts` — proves direct/default response selection,
  status/media/schema validation, PBR-01 selection, PBR-04 selection, and rejection when
  an allowance does not belong to the selected operation.

### Pure policy and report-integrity helpers

**Files changed:**
- `src/quality/cucumber-tags.ts` — parses feature/scenario tags and evaluates smoke counts
  and inherited `@smoke`/`@mutates` conflicts without filesystem access.
- `scripts/check-tags.ts` — becomes a thin filesystem adapter over the tested helper,
  replacing `scripts/check-tags.mjs`.
- `src/quality/report-integrity.ts` — extracts expected scenario names, parses Serenity
  artefacts as JSON, and checks exact nested string values.
- `scripts/check-report.ts` — retains filesystem, Java, and HTML checks while delegating
  JSON scenario evidence to the pure helper; replaces `scripts/check-report.mjs`.
- `tests/unit/cucumber-tags.test.ts`, `tests/unit/report-integrity.test.ts` — cover inherited
  tags, count drift, scenarios/outlines, invalid JSON, exact matches, and omissions.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Use Node's built-in test runner with the `tsx` loader and explicit discovered paths | Adds a fast TypeScript lane without another dependency and works on Windows under Node 20 and 24 | Adding Vitest/Jest; relying on shell glob expansion |
| Keep filesystem/process handling in thin scripts and move policy into `src/quality` | Pure functions are deterministic and unit-testable without fixtures, Java, Docker, or subprocesses | Spawning the production scripts and asserting exit codes only |
| Parse Serenity artefacts and compare exact nested string values | Valid JSON and exact scenario names are stronger evidence than substring matches | Retaining the former concatenated-text search |
| Provide one `SpecConformance.fromDocument` path used by live and offline callers | Unit tests exercise the same Ajv setup and operation resolution as production | Duplicating validator configuration in tests |
| Preserve current SOAP interpolation unchanged | PB-CODEX-03 needs normal-path seams; PB-CODEX-10 owns safe XML names and escaping | Quietly combining SOAP hardening into this PR |

No new ADR was required: the lane is the direct implementation of the already-approved
PB-CODEX-03 backlog acceptance criteria and does not alter product scope or architecture.

---

## Documentation Updates

- `README.md` — adds the framework unit lane to quickstart, verify ordering, and CI wording;
  corrects the API lane count in the verify description to 11.
- `docs/design-document.md` — advances to v1.3 and records the unit lane in the verify and
  test-code strategy.
- `docs/qa-strategy.md` — records the framework-unit level, coverage areas, evidence, and
  PB-CODEX-03 exit criteria.
- `docs/project-contract.md` — adds the SUT-independent unit step to the single-entry-point
  gate description.
- `docs/backlog.md` — advances to v10, closes PB-CODEX-02 with PR/CI evidence, and records
  PB-CODEX-03 implementation progress against baseline `d894e54`.
- `docs/implementation-logs/2026-07-31_pb-codex-03-fast-unit-lane.md` — records this
  append-only implementation history.

---

## Lessons Learned

- A thin I/O adapter over a pure policy function gives better failure examples and faster
  feedback than subprocess-testing a script whose logic and side effects are intertwined.
- Exact parsed-JSON matching strengthened the report gate while making it easier to test;
  the existing Serenity artefacts contain scenario names as exact nested values.
- A document-based factory is a small, reusable seam for contract testing: it avoids live
  fetches without creating a second validator implementation.
- Test discovery must not rely on shell glob expansion in a cross-platform Node ≥20 project;
  passing sorted explicit paths makes zero-test failures visible and runtime-independent.
- Explicitly preserving PB-CODEX-10's boundary kept the unit-lane PR reviewable and prevents
  normal-path tests from being mistaken for SOAP security hardening.

---

## Recommendations / Next Steps

- [ ] Merge PB-CODEX-03 and verify post-merge `main` CI before checking it complete —
  owner / MEDIUM.
- [ ] Implement PB-CODEX-04's zero, minimum-positive, and exact-available amount boundaries
  under DR-PB-09 — next cycle item / MEDIUM.
- [ ] Use the new unit lane when implementing PB-CODEX-07 request deadlines and
  PB-CODEX-10 SOAP hardening — future dependent items / MEDIUM and LOW.
- [ ] Resolve PBR-03 in a separate lockfile-only dependency PR — owner / LOW exposure.

---

*Session logged: 2026-07-31. Author: Codex.*
