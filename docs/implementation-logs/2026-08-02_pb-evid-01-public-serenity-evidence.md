# PB-EVID-01 Public Serenity Evidence — 2026-08-02

## Session Summary

This session implemented the owner-approved GitHub Pages publication path for the existing
content-verified Serenity report. It added deterministic static packaging, provenance,
scenario/link/safety gates, least-privilege deployment, reporter-boundary masking and operator
documentation without adding a second test run or hosting the ParaBank SUT. All locally
available Node 24, pinned-SUT and end-to-end checks passed; the implementation PR's Java-backed
CI and the post-merge Pages deployment remain the closure evidence.

---

## Objectives

1. ✅ Stage a deterministic Pages site from the verified Serenity output without rewriting it.
2. ✅ Reject incomplete, broken or unsafe public evidence before artefact upload.
3. ✅ Prevent real test passwords and synthetic identity values appearing in Serenity narratives.
4. ✅ Add a main-success-only, least-privilege GitHub Pages deployment path.
5. ✅ Document snapshot semantics, action/renderer pins, ownership and recovery.
6. ⏸️ Capture exact implementation-PR, merged-main, deployed-site and portfolio-landing evidence.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript / Node 24.18.0 | SUT-independent unit tests | 17/17 | 25/25 | ✅ PASS |
| Static evidence | Determinism, coverage, traversal, reference and safety fixtures | Not present | 8/8 tests | ✅ PASS |
| Docker / PowerShell | Pinned build and four-point boot gate | PASS | PASS | ✅ PASS |
| Cucumber API | Smoke-safety subset | 2/2 scenarios; 6/6 steps | 2/2 scenarios; 6/6 steps | ✅ PASS |
| Serenity/JS + Playwright | Smoke-safety subset | 1/1 scenario; 4/4 steps | 1/1 scenario; 4/4 steps | ✅ PASS |
| Cucumber API | Full API lane | 14/14 scenarios; 49/49 steps | 14/14 scenarios; 49/49 steps | ✅ PASS |
| Serenity/JS + Playwright | Full UI lane | 8/8 scenarios; 49/49 steps | 8/8 scenarios; 49/49 steps | ✅ PASS |
| Serenity artefacts | JSON content and direct public-data scan | 8/8 scenarios; passwords exposed | 8/8 scenarios; masked/safe | ✅ PASS |

The final local contract used Node 24.18.0 with `npm ci`,
`pwsh ./scripts/build-sut.ps1`, `docker compose up -d`, `pwsh ./scripts/gate.ps1`,
`npm run verify`, and `docker compose down`. The pinned SUT build completed in 181.6 seconds,
the boot gate in 26 seconds, and the full verify in 47.4 seconds. Local Java was unavailable,
so the report command deliberately skipped HTML while the eight JSON artefacts passed; the
implementation PR installs Temurin 21 and is the authoritative renderer, packaging and full-link
check. `npm audit` remained at 0 critical, 1 high, 0 moderate, 0 low: the existing development-only
`brace-expansion` advisory is still PBR-03, and neither dependencies nor the lockfile changed.

---

## Changes Implemented

### Deterministic evidence packaging and validation

**Files changed:**

- `src/quality/pages-evidence.ts` — added safe staging, byte-preserving report copying,
  deterministic provenance wrappers, exact eight-scenario coverage, symlink/path containment,
  non-trivial entry-page, local-reference and public-data checks.
- `scripts/prepare-pages-report.ts` — exposed deterministic `target/pages/` preparation for a
  required full source commit.
- `scripts/check-pages-report.ts` — exposed independent validation of the staged directory and
  recorded ref.
- `tests/unit/pages-evidence.test.ts` — covered repeated byte-identical output, escaping,
  missing/empty entries, absent scenarios, staging/reference traversal, broken links, secrets,
  headers, cookies, runner paths and the deliberately public username plus masked values.
- `package.json` — registered `prepare:pages` and `check:pages` without changing dependencies.

The generated root `index.html`, `evidence.json` and `.nojekyll` are the only wrappers. The
Serenity subtree is copied without content rewriting and must still carry all eight UI scenarios.

### Report-safe credential and identity handling

**Files changed:**

- `src/screenplay/ui/tasks.ts` — wrapped login passwords, registration passwords and synthetic
  SSNs in Serenity/JS `Masked` values; Playwright still receives the real input while the report
  records `[a masked value]`.
- `features/ui/steps/ui.steps.ts` — retained the seeded password in executable code but removed it
  from the parameterised Gherkin narrative.
- `features/ui/a1-register-and-login.feature` through `features/ui/a5-request-loan.feature` —
  changed login wording to refer to the seeded password without printing it.

The original report data contained both the public demo password and the generated customer
password. No password was allow-listed: the leakage was removed at the reporting boundary, and
the staged-artefact gate rejects a regression.

### Main-success-only Pages publication

**Files changed:**

- `.github/workflows/ci.yml` — prepares and validates evidence after the existing sole verification
  run on both PRs and `main`; uploads only successful `main` evidence; deploys from a dependent
  `github-pages` job with job-scoped `pages: write` and `id-token: write`, non-cancelling
  concurrency and no repository secret.
- `scripts/report.mjs` — pinned the renderer to
  `net.serenity-bdd:serenity-cli:jar:4.3.4` for reproducibility and the upstream static-resource
  correction.
- `docs/github-actions-pin-policy.md` — recorded reviewed full-SHA pins for
  `actions/upload-pages-artifact@v5.0.0`, `actions/configure-pages@v6.0.0` and
  `actions/deploy-pages@v5.0.0`, plus their permission boundary.

Repository Pages was configured through GitHub's API with `build_type: workflow`; the canonical
target is `https://gbrooks1970.github.io/parabank-bank-automation/`. This setting creates no
deployment until a successful merged-main workflow uploads checked evidence.

### Documentation and backlog reconciliation

**Files changed:**

- `docs/public-evidence.md` — added the publication contract, local commands, public-data boundary,
  renderer rationale, ownership and recovery procedure.
- `README.md` — documented the public snapshot and the explicit SUT/API non-hosting limitation.
- `docs/project-contract.md` — added working norms for local packaging and main-only publication
  without changing the five-command project gate.
- `docs/backlog.md` — advanced to v21, recorded planning PR #26 and its exact-head/merge CI, and
  marked the implemented PB-EVID-01 criteria while preserving deployment/landing closure gates.
- `docs/implementation-logs/2026-08-02_pb-evid-01-public-serenity-evidence.md` — created this
  immutable implementation record.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Package from the existing `sut-boot-gate` output. | One run remains the sole test/report truth and PRs exercise the exact packaging gates. | A second Pages-only run could diverge and double the expensive SUT work. |
| Copy Serenity output unchanged beneath deterministic wrappers. | Generated evidence remains attributable to Serenity while the root can state exact commit and limitations. | Rewriting report files would weaken provenance and make renderer upgrades harder to review. |
| Mask sensitive values at the Serenity interaction boundary and scan the final site. | The browser still receives required values, while neither Gherkin nor generated narrative publishes them; defence in depth catches regressions. | Allow-listing demo/generated passwords would normalise credential publication; post-processing report files would violate the unchanged-copy contract. |
| Pin Serenity BDD CLI 4.3.4 explicitly. | Serenity/JS's default 4.2.34 renderer emits a stale `jquery-ui/1.14.1` reference while copying `jquery-ui-1.14.1`; the reviewed stable 4.3.4 contains the upstream resource fix. | Leaving the renderer floating preserves the broken reference; an unbounded latest 5.x renderer introduces unnecessary compatibility drift. |
| Grant Pages permissions only to a dependent main-only deployment job. | PR verification stays read-only and a failed/cancelled test run cannot replace the last good site. | Workflow-wide write/OIDC permissions or direct PR deployment enlarge trust unnecessarily. |

No ADR was created. These decisions implement the owner-approved PB-EVID-01 delivery contract;
the reporter masking and renderer pin are narrow publication blockers, not architectural changes.

---

## Documentation Updates

- `README.md` — public evidence purpose, URL, commands and non-hosting limitation.
- `docs/public-evidence.md` — complete operator and public-data contract.
- `docs/project-contract.md` — packaging and publication working norms.
- `docs/github-actions-pin-policy.md` — Pages action provenance and permissions.
- `docs/backlog.md` — v21 implementation state and evidence.
- `docs/implementation-logs/2026-08-02_pb-evid-01-public-serenity-evidence.md` — this record.

---

## Lessons Learned

- Living documentation is itself a publication surface: apparently harmless test data becomes a
  credential disclosure once a report is public, so masking must happen before rendering and the
  final static artefact must be scanned independently.
- Report generators can emit internally inconsistent asset paths even when scenario coverage is
  correct. Content, local-reference and public-data checks are separate necessary gates.
- Provenance wrappers should be deterministic and minimal; preserving generated files makes it
  possible to distinguish test evidence from publication metadata.
- Disposable Java renderer comparisons were too slow in the local Windows/Docker environment and
  were stopped rather than allowed to compete with the pinned SUT. The repository's Temurin 21 CI
  remains the correct Linux rendering proof.

---

## Recommendations / Next Steps

- [ ] Require the implementation PR to pass at its exact head; confirm PR execution neither uploads
  nor deploys a Pages artefact — PB-EVID-01 closure gate.
- [ ] After owner merge, record exact `main` verification and Pages deployment runs, then check both
  public URLs anonymously at desktop and 390px with asset, console and overflow checks.
- [ ] Only after the target URL passes, open the separate portfolio landing PR that adds ParaBank's
  `report` action and regenerated public-evidence count.
- [ ] Keep PBR-03 separate; update `brace-expansion` only through its own reviewed dependency PR.

---

*Session logged: 2026-08-02. Author: Codex.*
