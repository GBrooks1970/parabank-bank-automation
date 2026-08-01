# PB-CODEX-05 — GitHub Actions hardening — 2026-08-01

## Session Summary

Implemented PB-CODEX-05 by restricting the workflow token to read-only repository content
and replacing all four mutable GitHub Action major tags with reviewed release commits. A
new in-repo policy records the selected releases and the deliberate review, SHA-resolution,
permission, and full-gate refresh procedure. Static workflow checks and the complete local
project contract passed; closure still depends on the implementation PR and post-merge
default-branch CI.

---

## Objectives

1. ✅ Declare least-privilege `contents: read` workflow permissions with no unjustified grant.
2. ✅ Pin every external action to a reviewed 40-character commit SHA with a readable release comment.
3. ✅ Document a repeatable, reviewed action-pin refresh procedure inside the project.
4. ✅ Reconcile PB-CODEX-04 closure evidence and record PB-CODEX-05 as implemented pending merge.
5. ✅ Validate workflow syntax, policy invariants, and the complete five-command project contract.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| GitHub Actions | YAML parse with PyYAML 6.0.3 | Mutable action tags | Parsed hardened workflow | ✅ PASS |
| GitHub Actions | `actionlint` v1.7.12 | Not run | No findings | ✅ PASS |
| GitHub Actions | Pin/permission audit | 0/4 full-SHA pins; implicit token defaults | 4/4 full-SHA pins; `contents: read`; no write grant | ✅ PASS |
| TypeScript | Framework unit lane | 12/12 | 12/12 | ✅ PASS |
| Cucumber | Smoke safety | 3/3 | 3/3; seed byte-identical | ✅ PASS |
| Cucumber | API lane | 14/14 scenarios; 49/49 steps | 14/14 scenarios; 49/49 steps | ✅ PASS |
| Cucumber/Serenity | UI lane | 8/8 scenarios; 49/49 steps | 8/8 scenarios; 49/49 steps | ✅ PASS |
| Serenity | Report content | 8/8 UI scenarios | 8/8 UI scenarios in JSON evidence | ✅ PASS |
| Project | Five-command contract | PB-CODEX-04 `main` run 30685906271 passed | Local contract passed in 381.4 seconds with teardown | ✅ PASS |

Java was not available locally, so the existing report command skipped HTML aggregation;
the JSON report content was verified. PR CI installs Java and remains the required HTML
enforcement point. `npm ci` also repeated the known PBR-03 high-severity development-only
transitive advisory; no dependency was changed in this CI-hardening item.

---

## Changes Implemented

### Least-privilege workflow and immutable actions

**Files changed:**
- `.github/workflows/ci.yml` — added top-level `contents: read` and pinned checkout,
  Node setup, Java setup, and artifact upload to exact reviewed release commits.

The selected official stable releases and resolved commits are:

| Action | Release | Commit |
|---|---|---|
| `actions/checkout` | `v5.1.0` | `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` |
| `actions/setup-node` | `v5.0.0` | `a0853c24544627f65ddf259abe73b1d18a591444` |
| `actions/setup-java` | `v4.9.0` | `d7793b545071e98d581d3bf084a51c3213318a07` |
| `actions/upload-artifact` | `v4.6.2` | `ea165f8d65b6e75b540449e92b4886f43607fa02` |

### Reviewed refresh procedure

**Files changed:**
- `docs/github-actions-pin-policy.md` — records the current pins and requires official
  release review, release-tag-to-commit resolution, permission review, immutable comments,
  syntax/policy checks, the complete project contract, PR CI, and implementation-log evidence.

### Project evidence reconciliation

**Files changed:**
- `README.md` — describes the full-SHA and least-privilege posture and links the policy.
- `docs/backlog.md` — advances to v12, closes PB-CODEX-04 using PR #17 and post-merge
  run 30685906271, and records PB-CODEX-05 as implemented pending its merge gates.
- `docs/design-document.md` — advances to v1.5 and links NFR-5 to the action-pin policy.
- `docs/decision-register.md` — aligns DR-PB-08/09 with their adopted implementations and
  records DR-PB-10 implementation as in progress across PB-CODEX-05/06.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Pin the latest reviewed stable release within each already-approved action major. | Removes moving references without combining unrelated major-version migration risk into PB-CODEX-05. | Retain mutable major tags; opportunistically upgrade action majors. |
| Grant only `contents: read` at workflow level. | Checkout needs repository read access; the other current steps need no additional `GITHUB_TOKEN` permission. | Default implicit permissions; speculative write grants. |
| Keep a deliberate manual refresh gate rather than scheduled mutation. | The approved cycle explicitly leaves scheduled pin automation unscheduled and requires human review plus full-gate evidence. | Automated updates that bypass release-note and permission review. |
| Keep PBR-02 open. | The reviewed `setup-java@v4.9.0` and `upload-artifact@v4.6.2` commits still declare Node 20 runtimes; immutability does not clear the warning. | Claim the warning resolved merely because the actions are pinned. |

No new ADR was required because DR-PB-10 already governs immutable execution inputs and
the reviewed refresh process.

---

## Documentation Updates

- `README.md` — added the CI hardening summary and policy link.
- `docs/github-actions-pin-policy.md` — added reviewed pins and the refresh procedure.
- `docs/backlog.md` — reconciled PB-CODEX-04 and PB-CODEX-05 status and current risks.
- `docs/design-document.md` — recorded v1.5 CI-input implementation detail.
- `docs/decision-register.md` — aligned DR-PB-08/09/10 implementation status.
- `docs/implementation-logs/2026-08-01_pb-codex-05-actions-hardening.md` — added this immutable record.

---

## Lessons Learned

- A readable release comment is useful context, but only the resolved 40-character commit
  removes time-dependent action execution.
- Release notes must be reviewed even when staying within the same major: checkout v5.1.0
  changed `pull_request_target` safety behaviour, although this project uses `pull_request`.
- Pinning an action and upgrading its JavaScript runtime are separate concerns; exact commits
  make current behaviour reproducible but do not eliminate the PBR-02 Node 20 annotation.
- Workflow linting complements YAML parsing by validating GitHub Actions semantics rather
  than syntax alone.

---

## Recommendations / Next Steps

- [ ] Merge the PB-CODEX-05 project PR and require its PR plus post-merge `main` CI to pass before closing the item — MEDIUM.
- [ ] Reconcile the portfolio-root ParaBank worklist with the PB-CODEX-04 closure and PB-CODEX-05 PR evidence — MEDIUM.
- [ ] Continue with PB-CODEX-06 to pin the Maven builder and ParaBank runtime base images by digest — MEDIUM.
- [ ] Retain PBR-02 until Node-24-native action majors are available and reviewed — LOW.
- [ ] Resolve the PBR-03 transitive advisory as its own dependency change — LOW.

---

*Session logged: 2026-08-01. Author: Codex.*
