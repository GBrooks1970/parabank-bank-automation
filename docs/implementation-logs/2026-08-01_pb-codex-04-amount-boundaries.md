# PB-CODEX-04 — Executable amount boundaries — 2026-08-01

## Session Summary

Implemented the three executable amount-boundary examples required by PB-CODEX-04 for the stateful ParaBank transfer flow. The new Cucumber scenario outline covers zero, the minimum positive amount, and the source account's exact available balance. Each example is reset-bracketed and asserts the response contract plus both account-balance deltas.

The API suite increased from 11 scenarios and 43 steps to 14 scenarios and 49 steps. The existing unit, smoke, and UI coverage remained green, and the complete five-command project contract passed in 249.6 seconds.

## Objectives

- Convert the zero, minimum-positive, and exact-available transfer partitions into executable API acceptance examples.
- Derive the exact-available value from the live reset state instead of hardcoding a seed balance.
- Preserve the existing reset isolation and keep the UI Serenity scenario count unchanged.
- Reconcile the README, design document, QA strategy, and backlog with the implemented evidence.

## Test Results

| Check | Result |
|---|---|
| TypeScript typecheck | Passed |
| Unit tests | 12/12 passed |
| Tag-policy lint | Passed |
| Targeted `@amount-boundary` API run | 3 scenarios, 6 steps passed |
| Full API suite | 14 scenarios, 49 steps passed |
| FR-B1 operation coverage | 14/14 operations retained |
| Smoke suite | 3/3 passed; reset seed remained byte-identical |
| UI suite | 8 scenarios, 49 steps passed |
| Serenity JSON evidence | 8/8 UI scenarios present |
| Full project contract | Passed in 249.6 seconds |
| Docker teardown | Passed; no project containers left running |

The local environment did not have Java, so local Serenity HTML aggregation was skipped by the existing verification contract. Serenity JSON evidence was validated locally, while CI remains responsible for enforcing HTML generation.

The live reset-state observations used source account `12456` and target account `12345`:

| Boundary | Amount | HTTP/content type | Source balance | Target balance |
|---|---:|---|---:|---:|
| Zero | 0.00 | 200 / `application/json` | 10.45 → 10.45 | -2300.00 → -2300.00 |
| Minimum positive | 0.01 | 200 / `application/json` | 10.45 → 10.44 | -2300.00 → -2299.99 |
| Exact available | 10.45, captured dynamically | 200 / `application/json` | 10.45 → 0.00 | -2300.00 → -2289.55 |

## Changes Implemented

- Added a reset-bracketed `@mutates @amount-boundary` Scenario Outline with zero, minimum-positive, and exact-available examples.
- Added reusable API step logic that records pre-transfer balances, resolves each boundary amount, performs the transfer, preserves the transfer response before subsequent REST reads, and asserts the exact response and balance effects.
- Asserted HTTP 200, `application/json`, the exact success message, the source debit, and the target credit for every example.
- Added the exact-available invariant that the source account ends at zero.
- Increased the documented API scenario count from 11 to 14 without changing the eight-scenario UI Serenity guard.

## Technical Decisions

- Reused the stateful transfer feature and the existing reset hooks, consistent with DR-PB-09, rather than creating a separate feature with duplicated lifecycle behaviour.
- Captured the exact-available amount from the source account immediately before transfer. This keeps the example valid if the pinned seed balance changes and avoids encoding a fixture value in the feature.
- Selected account `12456` as the source because its reset balance is positive (`10.45`). Account `12345` resets to `-2300.00`, so treating it as available funds would produce misleading boundary evidence.
- Kept dependency remediation outside this change. The existing high-severity npm advisory remains tracked by PBR-03.
- No new ADR was required because the implementation follows the already-recorded structural decision.

## Documentation Updates

- Updated `README.md` with the 14-scenario API suite total.
- Advanced `docs/design-document.md` to v1.4 and documented the executable boundary flow.
- Updated `docs/qa-strategy.md` so all three partitions map to named executable examples and the UI reporting guard remains explicit.
- Advanced `docs/backlog.md` to v11, closed PB-CODEX-03 with merge and main-CI evidence, and recorded PB-CODEX-04 as implemented pending its PR merge and post-merge main CI.

## Lessons Learned

- A first typecheck caught an invalid generic argument on `Actor.remember`; removing the unsupported generic fixed the compile error before runtime validation.
- A shell-level timeout during an earlier orchestration attempt closed stdout while Cucumber was reporting, causing an `EPIPE`. This was not a project assertion failure. The exact contract was rerun with an adequate budget and completed successfully.
- A live balance probe was necessary before choosing the transfer direction because one nominal account has a negative reset balance.
- Dynamic fixture-derived values provide stronger boundary evidence than hardcoded balances while preserving deterministic assertions.

## Recommendations / Next Steps

- Merge the PB-CODEX-04 project PR and verify the default-branch CI before marking the backlog item complete.
- Reconcile and merge the portfolio-root ParaBank worklist update that points to the PB-CODEX-04 PR.
- Continue with PB-CODEX-05, which covers immutable GitHub Actions references and least-privilege workflow permissions.
- Keep PBR-02 and PBR-03 visible as separate environment/dependency risks; neither is resolved by this change.

---

*Session logged: 2026-08-01. Author: Codex.*
