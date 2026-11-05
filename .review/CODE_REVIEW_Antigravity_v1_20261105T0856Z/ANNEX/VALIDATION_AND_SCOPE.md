# Annex: Validation and Scope

[<- Back to Index](../00_CODE_REVIEW_Antigravity_v1_20261105T0856Z.md)

**Reviewer:** AI assistant (Antigravity)
**Date:** 2026-11-05T08:56Z

This annex documents the empirical execution logs, static analysis results, dependency vulnerability scans, and validation boundaries established during this code review.

---

## 1. Validation Scope and Gate Execution

In strict accordance with the portfolio review guidelines and the validation cascade defined in [portfolio-prompts/project-layout.md](../../../portfolio-prompts/project-layout.md), validation was conducted in **lightweight non-Docker mode**. Heavyweight container infrastructure (building the ParaBank WAR, spinning up Docker Compose, and running long E2E browser tests) was deliberately not booted.

The following non-Docker static and framework validation gates were executed directly against the local checkout:

| Gate / Command | Purpose | Result | Duration |
|---|---|---|---|
| `npm run typecheck` | Root TypeScript compilation (`tsc --noEmit`) | ✅ PASS (0 errors) | ~3.8s |
| `npm run typecheck:style-02` | Test Style 02 TypeScript compilation (`tsc -p test-style-02/tsconfig.json`) | ✅ PASS (0 errors) | ~2.5s |
| `npm run typecheck:style-03` | Test Style 03 TypeScript compilation (`tsc -p test-style-03/tsconfig.json`) | ✅ PASS (0 errors) | ~2.8s |
| `npm run test:unit` | Framework unit & architecture tests via `node:test` (43 tests) | ✅ PASS (43/43 pass) | ~16.7s |
| `npm run lint:tags` | Cucumber tag policy & smoke scenario count enforcement | ✅ PASS (OK) | ~1.2s |
| `npm run perf:typecheck` | k6 performance test TypeScript compilation (`tsc -p perf/tsconfig.json`) | ✅ PASS (0 errors) | ~1.9s |
| `npm audit` | Toolchain dependency security vulnerability audit | ⚠️ 11 CVEs (7 High) | ~8.5s |

---

## 2. Unit & Architecture Test Execution Log

The fast unit test lane executed 43 individual tests across 10 test modules in `tests/unit/` using the native Node test runner (`node scripts/run-unit-tests.mjs`). All 43 tests passed cleanly:

```text
> parabank-bank-automation@0.3.0 test:unit
> node scripts/run-unit-tests.mjs

✔ scenarioTagsFromFeature applies feature and scenario tag inheritance (15.2142ms)
✔ evaluateTagPolicy rejects inherited @smoke/@mutates and reports fixed-count drift (0.9521ms)
✔ evaluateTagPolicy accepts the intended inherited lane tags and smoke count (0.5293ms)
✔ only reviewed files name a destructive ParaBank operation (32.499ms)
✔ every reviewed file still exists, still names an operation, and keeps its guard (17.1106ms)
✔ ParaBankRestClient destructive operations refuse a remote host before any request (18.7308ms)
✔ ParaBankRestClient destructive operations still reach the local SUT (212.9845ms)
✔ seedDatabase refuses a remote host before any request (1.1733ms)
✔ preparePagesEvidence copies the complete report and produces deterministic provenance (1079.7619ms)
✔ a fresh, provenanced perf summary is staged at /perf/ and linked (631.3353ms)
✔ a stale perf summary is withheld without failing the deploy (461.1246ms)
✔ an unprovenanced perf summary is withheld (512.3947ms)
✔ generated provenance escaping encodes every HTML-significant character (3.6798ms)
✔ preparation rejects missing and empty Serenity entry pages (1122.3134ms)
✔ validation rejects an absent expected scenario (753.7128ms)
✔ staging and local references cannot traverse outside the repository root (823.8925ms)
✔ local-reference validation detects broken links (1078.7421ms)
✔ public-artefact safety rejects credentials, headers, tokens and machine paths (448.15ms)
✔ public-artefact safety accepts the named public username and masked interactions (374.6404ms)
✔ readPerfProvenance accepts a complete record and drops empty optionals (96.3788ms)
✔ readPerfProvenance rejects malformed JSON, absent, and ill-typed provenance (5.1597ms)
✔ assessPerfEvidence publishes a fresh, provenanced summary and reports its age (0.6639ms)
✔ assessPerfEvidence withholds an absent summary (0.6469ms)
✔ assessPerfEvidence withholds a summary with no provenance (9.243ms)
✔ assessPerfEvidence withholds a summary older than the limit (0.5841ms)
✔ assessPerfEvidence keeps a summary exactly at the limit publishable (3.5661ms)
✔ assessPerfEvidence tolerates small clock skew but rejects a future summary (0.5875ms)
✔ scenarioNamesFromFeature extracts scenarios and outlines but not comments (10.6842ms)
✔ inspectSerenityCoverage finds exact scenario strings in nested valid artefacts (0.9721ms)
✔ inspectSerenityCoverage reports invalid JSON and exact-name omissions (0.5251ms)
✔ deadline aborts the request and reports only contextual, credential-safe details (95.3071ms)
✔ caller abort is forwarded without being misreported as a deadline (1.787ms)
✔ credentialSafePath removes origins, queries, fragments, and login credentials (0.5037ms)
✔ buildSoapEnvelope emits the normal qualified document-literal request (2.6732ms)
✔ buildSoapEnvelope preserves the observed unqualified fault-path request option (1.1588ms)
✔ buildSoapEnvelope escapes XML-reserved parameter text (2.6594ms)
✔ buildSoapEnvelope rejects unsafe operation and parameter names (2.0303ms)
✔ SOAP response helpers parse namespace-tolerant account fields and faults (4.1496ms)
✔ operation selection validates the declared status, media type, and response schema (205.5016ms)
✔ default-response resolution applies only the named PBR-01 validation allowance (108.8084ms)
✔ PBR-04 raw-text handling is selected only for an approved mutation operation (157.1399ms)
✔ isLoopbackUrl accepts only loopback http(s) hosts (13.7775ms)
✔ assertLocalSut passes the local SUT and refuses a remote host with an explanatory message (1.5166ms)
ℹ tests 43
ℹ suites 0
ℹ pass 43
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 16702.372
```

---

## 3. Tag Policy Lint Log

Cucumber tag verification confirmed that `@smoke` and `@mutates` tags are mutually disjoint across all feature files, and that the total smoke scenario count strictly matches the design document (3 scenarios: 2 API, 1 UI):

```text
> parabank-bank-automation@0.3.0 lint:tags
> tsx scripts/check-tags.ts

Tag lint OK: @smoke/@mutates disjoint; smoke counts match the design doc.
```

---

## 4. Dependency Vulnerability Audit (`npm audit`)

Execution of `npm audit` on 2026-11-05 returned 11 vulnerabilities (1 Low, 3 Moderate, 7 High):

- **axios (1.0.0 - 1.19.0; High):**
  - GHSA-vh66-26gq-q6x8: Prototype pollution gadget in fetch adapter
  - GHSA-9fr6-4gfg-395g: Prototype pollution in default instance
  - GHSA-c29m-xwm3-cm6r: ReDoS in data: URL parser
  - GHSA-mghh-pgcx-3jjj: ReDoS in proxy host normalisation
  - GHSA-3pq3-5fj3-cg6v: HTTP/2 adapter proxy control bypass
  - GHSA-r4gj-5m52-g5wh: Redirect-based SSRF in fetch adapter
  - Dependency path: `@serenity-js/playwright-test` -> `@serenity-js/rest` -> `axios`
- **fast-uri (3.0.0 - 3.1.8; High):**
  - GHSA-5jgf-p345-68v8: Host confusion on scheme-relative references
  - GHSA-f65p-4m7j-42xc: SSRF via malformed IPv6 normalisation
  - GHSA-fph4-wmhf-6fwf: SSRF via repeated percent-decoding
  - Dependency path: `ajv` -> `fast-uri`
- **follow-redirects (1.16.0 - 1.16.1; High):**
  - GHSA-q3jh-wrc6-jgq8: Array-form headers bypass cross-origin credential stripping
- **brace-expansion (4.0.0 - 5.0.11; High):**
  - GHSA-q2hr-2g5m-vwhr: Quadratic-time expansion causes CPU denial of service
- **glob / minimatch (Moderate):**
  - GHSA-3g3m-2fjr-6pw4: AbortSignal cancellation bypass
  - GHSA-g3hv-75wg-m249: Denial of service via globparts amplification

---

## 5. Honest Limitations and Non-Executed Suites

In accordance with review guidelines:
- **E2E Test Suites (`test:api`, `test:ui`, `test:style-02`, `test:style-03`):** Were not executed locally because they require a live, booted ParaBank Tomcat container. Prior CI execution evidence recorded on `main` at commits `bbca594` and `e7130f5` confirms all suites passed green in GitHub Actions.
- **k6 Performance Execution (`perf:run`):** Was not executed locally as it requires a booted container and Dockerized k6 instance. Nightly automated CI runs documented in `.github/workflows/perf.yml` continue to execute and publish metrics.
- **GitHub Pages Deployment (`deploy-pages`):** Statically verified locally via `prepare:pages` and `check:pages` unit test assertions; actual deployment occurs exclusively on push to `main` in CI.

---

[Back to Index](../00_CODE_REVIEW_Antigravity_v1_20261105T0856Z.md)
