# PB-CODEX-09 Bill-Pay Oracle Wording — 2026-08-01

## Session Summary

This session aligned the A4 bill-pay feature wording with the UI evidence the step actually
collects. The UI step now asserts only the completion message and amount, while the later REST
step remains the explicit proof that the transaction names the generated payee. Targeted A4 and
the full five-command project contract passed locally on Node 24.

---

## Objectives

1. ✅ Remove the unsupported payee-name claim from the bill-pay UI confirmation step.
2. ✅ Preserve the later REST transaction assertion as the payee-name oracle.
3. ✅ Validate targeted A4 and the complete project contract.
4. ⏸️ Add implementation PR and post-merge default-branch CI evidence after owner review.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Cucumber UI | Targeted A4 bill-pay journey | Semantically overstated step wording | 1/1 scenario; 7/7 steps | ✅ PASS |
| TypeScript / Node 24.18.0 | Typecheck | PASS | PASS | ✅ PASS |
| TypeScript / Node 24.18.0 | SUT-independent unit tests | 15/15 | 15/15 | ✅ PASS |
| Cucumber API | Smoke scenarios | 2/2 | 2/2 | ✅ PASS |
| Cucumber UI | Smoke scenarios | 1/1 | 1/1 | ✅ PASS |
| Cucumber API | Full API lane | 14/14 scenarios; 49/49 steps | 14/14 scenarios; 49/49 steps | ✅ PASS |
| Serenity/JS + Playwright | Full UI lane | 8/8 scenarios; 49/49 steps | 8/8 scenarios; 49/49 steps | ✅ PASS |
| Serenity artefacts | Report-content check | 8/8 UI scenarios | 8/8 UI scenarios | ✅ PASS |
| Docker / PowerShell | Pinned build, boot gate, teardown | PASS | PASS | ✅ PASS |

The targeted scenario passed in 9.488 seconds. The local gate used
`pwsh ./scripts/build-sut.ps1`, `docker compose up -d`, `pwsh ./scripts/gate.ps1`, Node 24
`npm run verify`, and `docker compose down`; the pinned build completed in 149.6 seconds.
Java was unavailable locally, so the existing report command skipped HTML generation while the
JSON report-content guard passed; CI installs Java and enforces the HTML. `npm ci` continued to
report the separately recorded high advisory PBR-03; no dependency changes were included.

---

## Changes Implemented

### Honest bill-pay UI oracle wording

**Files changed:**

- `features/ui/a4-bill-pay.feature` — changed the confirmation step to say only that bill
  payment completed for the requested amount.
- `features/ui/steps/ui.steps.ts` — matched the revised phrase and removed the unused payee-name
  recall from the UI confirmation step. The step continues to check the completion text and the
  amount string exposed by ParaBank.

### Preserved REST payee proof and reconciled backlog

**Files changed:**

- `features/ui/a4-bill-pay.feature` — retained the following REST step that requires a
  `Bill Payment` transaction naming the generated payee.
- `features/ui/steps/ui.steps.ts` — retained the REST transaction assertion that recalls and
  verifies the payee name.
- `docs/backlog.md` — advanced to v16, closed PB-CODEX-08 with PR and post-merge CI evidence,
  and recorded the PB-CODEX-09 implementation state.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Keep the UI confirmation oracle limited to completion text and amount. | Those are the values exposed by the result component and asserted by the step. | Mentioning the payee in this step would continue to overstate its evidence. |
| Keep payee-name verification in the later REST transaction step. | The REST transaction description supplies direct, independent evidence that the generated payee was recorded. | Adding a duplicate UI locator would couple the test to presentation details without improving the existing cross-check. |
| Preserve ParaBank's observed integer-form amount check. | The step already uses the SUT-facing truncated amount string and this item concerns wording truth, not amount-format behaviour. | Expanding PB-CODEX-09 into a formatting refactor would exceed its approved scope. |

No ADR was created. These choices apply the approved PB-CODEX-09 acceptance criteria and existing
assert-as-observed contract rather than introducing a structural or process decision.

---

## Documentation Updates

- `features/ui/a4-bill-pay.feature` — made the executable specification describe the actual UI
  oracle while retaining the REST payee proof.
- `docs/backlog.md` — closed PB-CODEX-08, advanced to v16, and recorded PB-CODEX-09 progress.
- `docs/implementation-logs/2026-08-01_pb-codex-09-bill-pay-oracle-wording.md` — created this
  immutable implementation record.

---

## Lessons Learned

- A step phrase is part of the test oracle: every noun in it should be backed by an assertion in
  that step or clearly delegated to a following step.
- Separating the visible UI result from the REST state check makes the evidence boundary easy to
  review without weakening the end-to-end journey.
- Small wording fixes still merit the complete contract when they alter executable Cucumber step
  matching.

---

## Recommendations / Next Steps

- [ ] Complete PB-CODEX-09 with implementation PR CI, owner merge, and post-merge `main` CI
  evidence — current LOW priority.
- [ ] Implement PB-CODEX-10 SOAP envelope XML safety next — LOW priority.
- [ ] Leave PBR-01…PBR-05 open until their individual success criteria are satisfied.

---

*Session logged: 2026-08-01. Author: Codex.*
