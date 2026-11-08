<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-08_triage-01-fast-uri-lock-update.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-01: fast-uri lock update past its advisories, 2026-11-08

## Session Summary

The dev-only transitive `fast-uri`, reached through `ajv`, moved from the locked 3.1.5 to 3.1.9 with a lockfile-only
update. `package.json` is unchanged, and the lock diff is exactly the three lines of the `fast-uri` entry. A fresh
audit lists ten `fast-uri` advisories before the change and none after, and no other audit entry changed.
Typecheck passes and the unit tests pass 50/50. By the approved decision, the five-command contract is PR CI's. Plan:
[`../implementation-plans/2026-11-08_triage-01-fast-uri-lock-update.md`](../implementation-plans/2026-11-08_triage-01-fast-uri-lock-update.md)
(approved 2026-11-08, D-T01-1 to D-T01-5 as recommended).

---

## Objectives

1. ✅ Re-check the target at execution: `npm view fast-uri dist-tags.three` = `3.1.9` (D-T01-2).
2. ✅ Before evidence: the must-fail check exits 1 on the fresh audit.
3. ✅ Lockfile-only update (D-T01-1 A), with the lock diff limited to `fast-uri` and `package.json` unchanged.
4. ✅ After evidence: the must-fail check exits 0, `npm ls` shows 3.1.9, and there is no collateral audit change.
5. ✅ Local gates (D-T01-3): `npm ci`, both audits, typecheck, and unit tests 50/50.
6. ⏸️ Five-command contract: PR CI (D-T01-3).
7. ⏸️ Backlog v37 and the TRIAGE-07 target amendment: outcome follow-up and root tick (D-T01-4, D-T01-5).

---

## Evidence

The environment was a scratchpad worktree of `main` at `a9c9872`, with Node 24.18.0 and npm 11.16.0. The esbuild
install script was not approved.

**Must-fail check.** The check is a scratchpad script, not committed. It exits 1 while
`vulnerabilities["fast-uri"]` is present in `npm audit --json`.

| Point | `npm ls fast-uri` | Audit totals | Check |
|---|---|---|---|
| Before | `ajv@8.20.0` → `fast-uri@3.1.5` | 11 (1 low, 3 moderate, 7 high) | exit **1**: `FAIL: fast-uri 3.0.0 - 3.1.8 still in the audit (10 advisories: GHSA-5jgf-p345-68v8, GHSA-f65p-4m7j-42xc, GHSA-fph4-wmhf-6fwf, GHSA-jqff-g426-hqxp, GHSA-qw65-cvwx-89v3, GHSA-hrr3-gc8f-f4qj, GHSA-w74x-v6f9-j3xg, GHSA-xhq7-xmqj-769h, GHSA-wjr9-j795-jxcr, GHSA-333x-w4r6-6crp)` |
| After | `ajv@8.20.0` → `fast-uri@3.1.9` | 10 (1 low, 3 moderate, 6 high) | exit **0**: `PASS: fast-uri absent from the audit` |

**Collateral check.** For every other audit entry, the package, range and advisory list were compared before and
after: no changes. The remaining entries are `axios`, `follow-redirects` and `brace-expansion` (TRIAGE-07), `deepmerge`
(no patched release), `glob` and `minimatch` (`@cucumber/cucumber` 13, deferred), and the three Serenity/JS packages
that are flagged through `axios`.

**Lock diff.** `npm update fast-uri --package-lock-only --ignore-scripts --no-audit --no-fund` exited 0.
`git diff --stat` shows only `package-lock.json`, with 3 insertions and 3 deletions. `git diff --quiet package.json`
exits 0.

```text
@@ -2011,9 +2011,9 @@
-      "version": "3.1.5",
-      "resolved": "https://registry.npmjs.org/fast-uri/-/fast-uri-3.1.5.tgz",
-      "integrity": "sha512-gHwA1O9LDIcKunMKhObS/HimwtehO1nPUECKAu5TpKgaO19fcWEl4bliWe1jWxVFvIXztJjjQ4L8XQ1EU9f7Jw==",
+      "version": "3.1.9",
+      "resolved": "https://registry.npmjs.org/fast-uri/-/fast-uri-3.1.9.tgz",
+      "integrity": "sha512-hS/0Wt3Ya043oKXs0sIxrMpKQITXhMLIrVAKKXi4gozGC9v7YRWVnXIZzjNPTO02M9BdxLCWqK1yRXgNziVyJQ==",
```

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| npm | `npm ci` from the lock | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck` | n/a | exit 0 | ✅ PASS |
| TypeScript | `npm run test:unit` (includes `spec-conformance.test.ts`, which exercises `ajv`) | 50/50 | 50/50 | ✅ PASS |
| Project contract | Five-command gate | n/a | PR CI (D-T01-3) | ⏸️ CI |

---

## Changes Implemented

### Lockfile-only `fast-uri` update

**Files changed:**
- `package-lock.json`: the `node_modules/fast-uri` entry, 3.1.5 → 3.1.9 (`version`, `resolved`, `integrity`). No
  direct dependency or `overrides` entry was added; 3.1.9 satisfies `ajv`'s own `^3.0.1`.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Lockfile-only targeted update (D-T01-1 A) | Smallest diff; follows the PBR-03 precedent | `overrides` pin; `npm audit fix` (would touch the TRIAGE-07 packages); `fast-uri` 4.x (outside `ajv`'s range) |
| Five-command contract left to PR CI (D-T01-3) | No source change, and the only `ajv` call site has local unit coverage. FR-B1 runs on the new lock in CI | A local Docker run |

---

## Documentation Updates

- `docs/implementation-plans/2026-11-08_triage-01-fast-uri-lock-update.md` and `_index.md`: the plan is approved.
- This log.

---

## Lessons Learned

- **Re-read advisory ranges at execution.** The worklist's "below 3.1.7" was true at triage, but later advisories
  moved the safe floor to 3.1.9. The same drift has made TRIAGE-07's target versions stale.
- **Compare named advisories, not totals.** The total fell from 11 to 10, but only the per-entry comparison proves
  that nothing else moved.

---

## Recommendations / Next Steps

- [ ] Outcome follow-up after the merge: plan Outcome, `_index.md` set to implemented, and backlog v37 citing PR CI,
  the merge and post-merge `main` CI (D-T01-5).
- [ ] Root tick, with a dated TRIAGE-07 amendment (D-T01-4): `axios` ≥ 1.20.0, `follow-redirects` 1.16.2 and
  `brace-expansion` 5.0.12; `deepmerge` 4.3.1 has no patched release (its only fix path is
  `@serenity-js/playwright-test` 3.49.0).
- [ ] TRIAGE-07 next, on the same lockfile.

---

*Session logged: 2026-11-08. Author: Claude (Opus 5.5), delegated agent.*
