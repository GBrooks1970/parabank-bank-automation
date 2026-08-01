# PB-CODEX-08 README Truth Reconciliation — 2026-08-01

## Session Summary

This session reconciled the public README with the delivered PB-P0…PB-P5 phases and the
active CODEX review-remediation cycle. It replaced the stale PB-P5 registration status,
corrected the REST cross-check scope to A2–A4 monetary outcomes, and recorded the current
14 API + 8 UI scenario baseline. All relative links and the full five-command project
contract passed locally on Node 24.

---

## Objectives

1. ✅ Distinguish completed PB-P0…PB-P5 delivery from active PB-CODEX remediation.
2. ✅ Replace the claim that every UI journey is REST-cross-checked with implemented scope.
3. ✅ Reconcile scenario and decision-register counts with the live repository.
4. ✅ Validate every README-relative link and the full project contract.
5. ⏸️ Add implementation PR and post-merge default-branch CI evidence after owner review.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Documentation | README relative links | 13/13 | 13/13 | ✅ PASS |
| TypeScript / Node 24.18.0 | SUT-independent unit tests | 15/15 | 15/15 | ✅ PASS |
| Cucumber API | Smoke scenarios | 2/2 | 2/2 | ✅ PASS |
| Cucumber UI | Smoke scenarios | 1/1 | 1/1 | ✅ PASS |
| Cucumber API | Full API lane | 14/14 scenarios; 49/49 steps | 14/14 scenarios; 49/49 steps | ✅ PASS |
| Serenity/JS + Playwright | Full UI lane | 8/8 scenarios; 49/49 steps | 8/8 scenarios; 49/49 steps | ✅ PASS |
| Serenity artefacts | Report-content check | 8/8 UI scenarios | 8/8 UI scenarios | ✅ PASS |
| Docker / PowerShell | Pinned build, boot gate, teardown | PASS | PASS | ✅ PASS |

The local gate used `pwsh ./scripts/build-sut.ps1`, `docker compose up -d`,
`pwsh ./scripts/gate.ps1`, Node 24 `npm run verify`, and `docker compose down`. The pinned
build completed in 153 seconds. Java was unavailable locally, so the existing report
command skipped HTML generation while the JSON report-content guard passed; CI installs
Java and enforces the HTML. `npm ci` continued to report the separately recorded high
advisory PBR-03; no dependency changes were included in this docs-only item.

---

## Changes Implemented

### Public project status and scope

**Files changed:**

- `README.md` — changed the status from “Phases 0–4 complete; PB-P5 in progress” to
  completed PB-P0…PB-P5 delivery with an active PB-CODEX-01…10 remediation cycle.
- `README.md` — recorded 14 API and 8 UI scenarios (22 total), limited REST outcome
  cross-checks to A2 open-account, A3 transfer, and A4 bill-pay monetary state, and stated
  that A1 and A5 use their specified UI oracles.
- `README.md` — advanced the documentation inventory from DR-PB-01…07 to DR-PB-01…10.

### Authoritative backlog reconciliation

**Files changed:**

- `docs/backlog.md` — advanced to v15, closed PB-CODEX-07 with project PR #20 and
  post-merge `main` CI evidence, and recorded the PB-CODEX-08 implementation state.
- `docs/backlog.md` — updated PB-CODEX-08's truth target from the review-time v7/18-scenario
  snapshot to current backlog v15 and the executable 22-scenario baseline.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| State both completed delivery and active remediation. | PB-P0…PB-P5 remain complete historical gates while PB-CODEX work is active; collapsing either state would mislead readers. | “Project complete/resting” hides open remediation; “build in progress” reopens completed delivery phases. |
| Report the current 22-scenario baseline, not the review-time 18. | PB-CODEX-04 deliberately added three API boundary examples, growing the API lane from 11 to 14 while UI remains 8. | Preserving 18 would contradict executable `npm run verify` output and current backlog evidence. |
| Name A2–A4 as the REST-cross-checked UI scope. | Their opening-balance, transfer, and bill-pay outcomes query REST state; A1 asserts login/registration UI and A5 asserts the rendered loan decision/account id. | “Every journey” overclaims A1/A5; removing the REST claim entirely understates A2–A4 evidence. |

No ADR was created. These are documentation corrections against existing design and
executable evidence, not a new structural or owner decision.

---

## Documentation Updates

- `README.md` — reconciled delivery/remediation status, scenario counts, REST cross-check
  scope, and decision-register coverage.
- `docs/backlog.md` — closed PB-CODEX-07, advanced to v15, and recorded PB-CODEX-08.
- `docs/implementation-logs/2026-08-01_pb-codex-08-readme-truth.md` — created this
  immutable implementation record.

---

## Lessons Learned

- Scenario totals in review findings are historical snapshots; public documentation should
  follow current executable expansion counts and explain deliberate changes.
- “Cross-checked through REST” is strongest when tied to named outcomes and journeys rather
  than applied as a blanket architecture slogan.
- A completed delivery lifecycle and an active maintenance/remediation lifecycle can coexist;
  public status should name both explicitly.

---

## Recommendations / Next Steps

- [ ] Complete PB-CODEX-08 with implementation PR CI, owner merge, and post-merge `main`
  CI evidence — current LOW priority.
- [ ] Implement PB-CODEX-09 bill-pay wording/oracle alignment next — LOW priority.
- [ ] Leave PBR-01…PBR-05 open until their individual success criteria are satisfied.

---

*Session logged: 2026-08-01. Author: Codex.*
