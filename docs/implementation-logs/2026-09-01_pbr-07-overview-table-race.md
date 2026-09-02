# PBR-07 — Overview-table assertion raced the client-side row fetch — 2026-09-01

## Session Summary

Diagnosed and fixed the intermittent `@smoke` failure that had turned `main` red. ParaBank
serves the accounts overview with an **empty `<tbody>`** and fills it from a client-side fetch
after the welcome message renders, so an unsynchronised assertion could read the header row
alone. The step now waits for the specific account row before asserting, matching the pattern
already used by every other UI interaction in the suite. Six consecutive green runs of the
affected scenario, then the full five-command contract.

---

## Objectives

1. ✅ Establish the real cause rather than re-running until green.
2. ✅ Confirm it was not introduced by the PB-PIN cycle.
3. ✅ Fix it the way the suite already solves this class of problem.
4. ✅ Check whether any other assertion shares the race.
5. ✅ Restore `main`.

---

## Problem

The scenario "Seeded login shows the accounts overview" failed on its last step,
`the accounts overview lists account 12345`. Observed twice on 2026-09-01: locally during
PB-PIN-02 validation inside `check:smoke-safety`, then on `main` in the full UI lane
([run 33560814168](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/33560814168),
8 scenarios, 1 failed).

The failure text was the whole diagnosis, once it was not truncated away:

```
Expected string: 12345
Received string: Account	Balance*	Available Amount
                 *Balance includes deposits that may be subject to holds
```

Header and footnote, no rows. Two probes confirmed why:

1. `curl` of `overview.htm` returns `<tbody></tbody>` — the rows are **not** server-rendered.
2. Driving a real browser, at the instant `#leftPanel .smallText` (the welcome message) appears
   the table's `innerHTML` still contains `<tbody></tbody>`; only afterwards does it contain
   `<a href="activity.htm?id=12345">12345</a>` and the rest.

`LogInAs` ends with `Wait.until(NavPanel.welcome, isVisible())`, which is satisfied *before* the
account fetch resolves. The following `Ensure.that(TheOverviewTableText(), includes('12345'))`
is a point-in-time read with no retry, so whether it passed depended on whether the fetch had
landed during the intervening step overhead.

**Not caused by the PB-PIN cycle.** The first sighting was during PB-PIN-02 validation, before
PB-PIN-04 existed, and neither PR touched the UI lane. `main` had been green on 2026-08-05,
2026-08-07 and twice earlier on 2026-09-01, which is consistent with a low-frequency race
rather than a regression.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Browser probe | Overview table at welcome-time | `<tbody></tbody>` | unchanged (SUT behaviour, not ours) | ✅ characterised |
| Cucumber/Serenity | `@smoke` UI scenario, 6 consecutive runs | intermittent failure | **6/6 pass** | ✅ PASS |
| TypeScript | `tsc --noEmit` | clean | clean | ✅ PASS |
| TypeScript | Framework unit lane | 36/36 | 36/36 | ✅ PASS |
| Cucumber | API lane | 14/14 scenarios; 49/49 steps | 14/14; 49/49 | ✅ PASS |
| Cucumber/Serenity | UI lane | 8/8 when it passed | 8/8; 49/49 steps | ✅ PASS |
| Project | Five-command contract | — | All five green with teardown | ✅ PASS |

Repetition is weak evidence for a race on its own, so it is not the argument here: the wait
makes reading an empty `<tbody>` structurally impossible, and the repetition confirms no
regression.

---

## Changes Implemented

**Files changed:**
- `src/screenplay/ui/pages.ts` — added `OverviewPage.accountRow(accountId)`, locating
  `#accountTable a[href="activity.htm?id=<id>"]`, with a comment recording why the table alone
  is not a sufficient anchor.
- `features/ui/steps/ui.steps.ts` — the step now performs
  `Wait.until(OverviewPage.accountRow(accountId), isPresent())` before the unchanged
  `Ensure.that(...)`; `isPresent` imported from `@serenity-js/assertions`, as in `tasks.ts`.

Line 52 was the **only** reader of the overview table, so no other step needed changing. Every
other UI interaction already waits: ten `Wait.until(...)` call sites in `src/screenplay/ui/tasks.ts`.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Wait for the specific row, then assert. | Keeps the assertion an assertion and the wait a wait, and matches the existing house pattern exactly. | `Wait.until(TheOverviewTableText(), includes(...))`, which folds the two together and yields a timeout message instead of an assertion message. |
| Anchor on the row's account link. | Precise about *which* row, mirroring `OpenAccountPage.fromAccountOption(id)`. | `#accountTable tbody tr`, which would pass on any row, including another customer's. |
| Wait in the step, not in `LogInAs`. | The login task cannot know which account a scenario cares about, and not every login is followed by an overview assertion. | Adding a blanket row wait to `LogInAs`. |
| Diagnose before fixing. | The failure was intermittent and the first occurrence had already been lost to a truncated log; guessing would likely have produced a sleep. | Re-run until green; add a fixed delay. |

No decision record needed: this restores the suite's own stated discipline rather than changing it.

---

## Lessons Learned

- An intermittent failure is a specification of the bug, if the evidence survives. The first
  occurrence was diagnosable and was lost to a `| tail` in the command that ran it; the second
  cost nothing to diagnose because the full output was kept.
- "The page has loaded" is not "the data has arrived". The welcome message and the account rows
  come from different requests, and only one of them was being waited for.
- A single unsynchronised assertion in an otherwise disciplined suite is worth finding, because
  it produces exactly the failure mode that teaches people to re-run the gate instead of reading it.
- Probing the SUT directly — `curl` for the server HTML, a browser for the post-script DOM —
  turned a plausible story into a demonstrated one in two commands.

---

## Recommendations / Next Steps

- [ ] Merge and confirm post-merge `main` CI green, restoring the required lane — HIGH.
- [ ] Land the staged PBR-02 Node-24 action bumps, rebased onto this — LOW.
- [ ] Dispatch `pin-drift` once to prove its green path; it has still never executed — LOW.
- [ ] Retain PBR-01, PBR-04, PBR-05: the upstream source pin is unchanged — LOW.

---

*Session logged: 2026-09-01. Author: Claude Opus 5.*
