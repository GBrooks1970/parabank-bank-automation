# 02. Risks and Issues

**Reviewer:** AI assistant (Gemini 2.5 Pro)  
**Date:** 2026-08-07T14:09Z  

---

## Risk Ranking Table

| Risk ID | Title | Severity | Affected File |
|---|---|---|---|
| R-01 | Deprecated Node 20 Runtime in CI Actions (PBR-02) | HIGH | [.github/workflows/ci.yml](.github/workflows/ci.yml) (line 38, 68) |
| R-02 | Serenity/JS Package Version Skew | MEDIUM | [package.json](package.json) (line 35) |
| R-03 | Unmonitored Nightly Performance Smoke Pipeline | MEDIUM | [.github/workflows/perf.yml](.github/workflows/perf.yml) (line 15) |
| R-04 | OpenAPI Spec Mismatches Managed via Allowances (PBR-01, PBR-04, PBR-05) | LOW | [src/api/operation-contracts.ts](src/api/operation-contracts.ts) (line 45) |
| R-05 | Synthetic Version Identifier in Manifest | LOW | [package.json](package.json) (line 44) |

---

## Detailed Findings

### R-01: Deprecated Node 20 Runtime in CI Actions (Risk PBR-02)

- **Risk Description:** GitHub Actions `actions/setup-java@v4.9.0` and `actions/upload-artifact@v4.6.2` rely on Node 20 runtime, which GitHub Actions runners are actively deprecating.
- **Evidence Outline:** [.github/workflows/ci.yml](.github/workflows/ci.yml) (lines 38, 68):
  ```yaml
  - name: Set up Java (Serenity BDD report generator)
    uses: actions/setup-java@d7793b545071e98d581d3bf084a51c3213318a07 # v4.9.0
  ```
- **Impact Analysis:** Future runner updates by GitHub may forcibly disable Node 20 action runtimes, causing CI pipeline failure on default branch pushes and pull requests.
- **Refactor Recommendation:** Monitor action releases for Node 24 native majors, bump commit SHAs upon release, and verify via full PR pipeline.

---

### R-02: Serenity/JS Package Version Skew

- **Risk Description:** `@serenity-js/serenity-bdd` is pinned to `^3.43.2`, while all other `@serenity-js/*` packages (`assertions`, `console-reporter`, `core`, `cucumber`, `playwright`, `web`) are at `^3.44.1`.
- **Evidence Outline:** [package.json](package.json) (lines 30-36):
  ```json
  "@serenity-js/core": "^3.44.1",
  "@serenity-js/serenity-bdd": "^3.43.2",
  ```
- **Impact Analysis:** Minor version drift across Serenity/JS modules can introduce subtle runtime bugs or missing features during CLI report generation.
- **Refactor Recommendation:** Update `@serenity-js/serenity-bdd` to `^3.44.1` in `package.json` and update `package-lock.json`.

---

### R-03: Unmonitored Nightly Performance Smoke Pipeline

- **Risk Description:** The k6 performance workflow runs on a nightly schedule, but failures or metric regressions do not trigger alerts or block repository actions.
- **Evidence Outline:** [.github/workflows/perf.yml](.github/workflows/perf.yml) (lines 15-25).
- **Impact Analysis:** Degradation in SUT response times or API throughput under load will go unnoticed unless manually inspected in committed report files.
- **Refactor Recommendation:** Add a post-execution step in `perf.yml` to create a GitHub issue or workflow notification if k6 thresholds fail.

---

### R-04: OpenAPI Spec Mismatches Managed via Allowances (PBR-01, PBR-04, PBR-05)

- **Risk Description:** Upstream ParaBank spec declares `Transaction.date` as ISO date-time, but SUT returns epoch milliseconds. Mutations return plain text rather than JSON.
- **Evidence Outline:** [src/api/spec-conformance.ts](src/api/spec-conformance.ts) (lines 42-65).
- **Impact Analysis:** While safely isolated via named allowances, these allowances represent residual technical debt tied to upstream SUT commit `d1bf006`.
- **Refactor Recommendation:** Re-evaluate and re-verify allowances whenever the upstream Docker image SHA pin is updated.

---

### R-05: Synthetic Version Identifier in Manifest

- **Risk Description:** `package.json` specifies `"typescript": "^7.0.2"`, referencing a synthetic future version identifier.
- **Evidence Outline:** [package.json](package.json) (line 44).
- **Impact Analysis:** May cause slight confusion for external readers inspecting dependency configurations.
- **Refactor Recommendation:** Document the synthetic TS versioning rationale clearly in [docs/project-contract.md](docs/project-contract.md).
```

---