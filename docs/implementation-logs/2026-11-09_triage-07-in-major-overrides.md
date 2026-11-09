<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-09_triage-07-in-major-overrides.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-07: in-major overrides for axios, follow-redirects and brace-expansion, 2026-11-09

## Session Summary

Every HIGH advisory remaining in the project dependencies after TRIAGE-01 has been cleared inside its current major
version. An `overrides` entry in `package.json` pins `axios` to `1.20.0` (matching upstream Serenity/JS 3.49.0), while
in-range lockfile updates move `follow-redirects` from 1.16.0 to 1.16.2 and `brace-expansion` from 5.0.9 to 5.0.12. The
Serenity/JS 3.44.1 exact pins remain intact.

The lock diff is limited strictly to 10 insertions and 10 deletions across the three packages. A fresh `npm audit` shows
0 HIGH vulnerabilities (down from 6 HIGH). A scratch must-fail audit check exited 1 before and 0 after. Local gates
passed cleanly: all three typecheck targets (root, style-02, style-03), tag linting, unit tests 50/50, and a functional
`serenity-bdd update` jar download probe exercising `axios` 1.20.0 and `follow-redirects` 1.16.2. By owner-approved
decision D-T07-4, the five-command contract and test-style lanes are delegated to PR CI.

Plan: [`../implementation-plans/2026-11-08_triage-07-in-major-overrides.md`](../implementation-plans/2026-11-08_triage-07-in-major-overrides.md)
(approved 2026-11-09 by owner, decisions D-T07-1 to D-T07-6 as recommended).

---

## Objectives

1. ✅ Re-check targets at execution: `axios` 1.20.0, `follow-redirects` 1.16.2, `brace-expansion` 5.0.12 verified present on npm registry (D-T07-2, D-T07-3).
2. ✅ Before evidence: scratch must-fail check exits 1 on fresh audit (10 total, 6 high).
3. ✅ Option H hybrid mechanism (D-T07-1): `overrides` for `axios: 1.20.0` in `package.json`, targeted lockfile updates for `follow-redirects` and `brace-expansion`.
4. ✅ Strict diff inspection: `package.json` gains only `overrides`; `package-lock.json` has exactly 10 insertions and 10 deletions.
5. ✅ After evidence: scratch must-fail check exits 0, `npm ls` shows `axios@1.20.0 overridden`, `follow-redirects@1.16.2`, `brace-expansion@5.0.12`, `npm ls --all` exits 0, and total audit drops to 5 (0 high).
6. ✅ Collateral audit check: all remaining advisories verified unchanged (`deepmerge` LOW, `@serenity-js/playwright-test` dropped HIGH -> LOW, `glob`/`minimatch`/`@cucumber/cucumber` MODERATE).
7. ✅ Local gates: `npm run typecheck`, `npm run typecheck:style-02`, `npm run typecheck:style-03`, `npm run test:unit` (50/50), `npm run lint:tags`, and best-effort `npx serenity-bdd update` CLI jar download probe.
8. ⏸️ Five-command contract and test styles: delegated to PR CI (D-T07-4).
9. ⏸️ Outcome follow-up and root tick: backlog v38 with PR CI / merge evidence and `deepmerge` note correction (D-T07-5, D-T07-6).

---

## Evidence

The environment was a scratchpad worktree (`wt-parabank-t07`) of `origin/main` at `c34787a`, with Node 24.18.0 and npm 11.16.0.

### Must-fail Check

The check is a scratch script (`check-audit.mjs`), run against `npm audit --json`. It exits 1 while `axios`,
`follow-redirects`, or `brace-expansion` are present in `audit.vulnerabilities` or while `metadata.vulnerabilities.high > 0`.

| Point | `npm ls axios follow-redirects brace-expansion` | Audit Totals | Check |
|---|---|---|---|
| Before | `axios@1.18.1`, `follow-redirects@1.16.0`, `brace-expansion@5.0.9` | 10 (1 low, 3 moderate, 6 high) | exit **1**: FAIL (targets present: `axios` 12 advisories, `follow-redirects` 3 advisories, `brace-expansion` 3 advisories; high: 6) |
| After | `axios@1.20.0 overridden`, `follow-redirects@1.16.2`, `brace-expansion@5.0.12` | 5 (2 low, 3 moderate, 0 high) | exit **0**: PASS (`axios`, `follow-redirects`, `brace-expansion` absent from audit; high: 0) |

### Collateral Check

Every entry remaining in `npm audit --json` before and after was compared programmatically:
- `@cucumber/cucumber`: range 10.0.0 - 12.9.0, MODERATE (via `glob`), unchanged.
- `@serenity-js/playwright-test`: severity dropped from HIGH to LOW; flagged only through `deepmerge` now that `axios` is cleared.
- `@serenity-js/rest` and `@serenity-js/serenity-bdd`: cleared completely (were flagged only via `axios`).
- `deepmerge`: range >=4.2.0 <=4.3.1, LOW (GHSA-gcqx-w48m-w2h4), unchanged. As confirmed during planning (D-T07-5), upstream Serenity/JS 3.49.0 still declares `deepmerge: 4.3.1`, which is the latest release on npm; there is currently no upstream fix path anywhere.
- `glob`: range >=9.0.0 <=14.0.1, MODERATE (GHSA-3g3m-2fjr-6pw4), unchanged (deferred to `@cucumber/cucumber` 13).
- `minimatch`: range >=7.0.0 <11.0.1, MODERATE (GHSA-g3hv-75wg-m249), unchanged (deferred to `@cucumber/cucumber` 13).

### Lock and Package Diffs

`git diff --stat` shows only `package.json` and `package-lock.json`:
- `package.json`: 3 insertions (`"overrides": { "axios": "1.20.0" }`).
- `package-lock.json`: 10 insertions, 10 deletions.

```text
diff --git a/package.json b/package.json
@@ -52,5 +52,8 @@
     "playwright": "~1.61.1",
     "tsx": "^4.23.1",
     "typescript": "^7.0.2"
+  },
+  "overrides": {
+    "axios": "1.20.0"
   }
 }

diff --git a/package-lock.json b/package-lock.json
@@ -1560,14 +1560,14 @@
     "node_modules/axios": {
-      "version": "1.18.1",
-      "resolved": "https://registry.npmjs.org/axios/-/axios-1.18.1.tgz",
-      "integrity": "sha512-3nTvFlvpn9Zu/RkHUqtc7/+al4UpRW5az71ap5zccp6e8RAYEzhMTecX8Dz1wWDYrPpUoB1HAQEGEAEvUr7S9g==",
+      "version": "1.20.0",
+      "resolved": "https://registry.npmjs.org/axios/-/axios-1.20.0.tgz",
+      "integrity": "sha512-r8aOh8j9cGKpgQAqpzrUHnSIc6a59Y3Xf/cv8sy1DrHCkZHzQGEuoq1tARk6qSyDdtQGSDgpb9kFlruzPvrgwg==",
       "dev": true,
       "license": "MIT",
       "dependencies": {
         "follow-redirects": "^1.16.0",
-        "form-data": "^4.0.5",
+        "form-data": "^4.0.6",
         "https-proxy-agent": "^5.0.1",
         "proxy-from-env": "^2.1.0"
       }
@@ -1610,9 +1610,9 @@
     "node_modules/brace-expansion": {
-      "version": "5.0.9",
-      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.9.tgz",
-      "integrity": "sha512-ScQ4IuvIEF1TMlP7Zt+vjJ//9zlPb2SDcxWxM3bk8s6t6GGdJ7KO1dCcTidOPJKePW30LE/2cT7wCyPho9/Wxg==",
+      "version": "5.0.12",
+      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.12.tgz",
+      "integrity": "sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ==",
       "dev": true,
       "license": "MIT",
       "dependencies": {
@@ -2129,9 +2129,9 @@
     "node_modules/follow-redirects": {
-      "version": "1.16.0",
-      "resolved": "https://registry.npmjs.org/follow-redirects/-/follow-redirects-1.16.0.tgz",
-      "integrity": "sha512-y5rN/uOsadFT/JfYwhxRS5R7Qce+g3zG97+JrtFZlC9klX/W5hD7iiLzScI4nZqUS7DNUdhPgw4xI8W2LuXlUw==",
+      "version": "1.16.2",
+      "resolved": "https://registry.npmjs.org/follow-redirects/-/follow-redirects-1.16.2.tgz",
+      "integrity": "sha512-/kVP2U8z596Ia0gwFrwyIeo74ta5aVmSeU1FfAUMAmcEP5EP7zydmag3SLiN64NaRKef3lxsq7i/g7ltJQDGow==",
       "dev": true,
```

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| npm | `npm ci` from lockfile | exit 0 | exit 0 (added 220 packages) | ✅ PASS |
| npm | `npm ls --all` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-02` | exit 0 | exit 0 | ✅ PASS |
| TypeScript | `npm run typecheck:style-03` | exit 0 | exit 0 | ✅ PASS |
| Cucumber / tsx | `npm run lint:tags` (globs via `brace-expansion@5.0.12`) | exit 0 | exit 0 | ✅ PASS |
| Node.js test runner | `npm run test:unit` | 50/50 | 50/50 | ✅ PASS |
| HTTP probe | `npx serenity-bdd update --artifact net.serenity-bdd:serenity-cli:jar:4.3.4` (exercises `axios@1.20.0` + `follow-redirects@1.16.2`) | n/a | exit 0 (downloaded CLI jar & verified checksums) | ✅ PASS |
| Project contract | Five-command contract (`npm run verify`) & style steps | n/a | PR CI (D-T07-4) | ⏸️ CI |

---

## Changes Implemented

### `package.json`
- Added `"overrides": { "axios": "1.20.0" }`.

### `package-lock.json`
- `node_modules/axios`: updated from 1.18.1 to 1.20.0 (`form-data` dependency range declaration `^4.0.6`).
- `node_modules/brace-expansion`: updated from 5.0.9 to 5.0.12.
- `node_modules/follow-redirects`: updated from 1.16.0 to 1.16.2.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Hybrid mechanism (D-T07-1 Option H) | Override `axios` to 1.20.0 to satisfy exact pin in Serenity/JS 3.44.1; lockfile update for `follow-redirects` and `brace-expansion` which already satisfy parent ranges (`^1.16.0` and `^5.0.5`). Lock diff is identical to Option A (10 insertions, 10 deletions) without unnecessary override baggage. | Option A (override all three); Option U (upgrade Serenity/JS 3.49.0); Option F (`npm audit fix`). |
| Exact `axios` 1.20.0 (D-T07-2) | Shipped by upstream Serenity/JS 3.49.0, >2 months old, clears all 12 advisories. | 1.21.0 (only ~13 days old, violates two-week age rule); `^1.20.0`. |
| Accept `follow-redirects` 1.16.2 (D-T07-3) | 15 days old, clears 3 HIGH advisories up to 1.16.1. 1.16.3 published on 2026-11-08 is only 1 day old and violates the portfolio two-week age rule. | Waiting for older release; 1.16.3 (too new). |
| PR CI contract gating (D-T07-4) | No source code changed; all local static, unit, lint, and functional jar download gates passed cleanly. Five-command SUT contract runs on PR CI to conserve memory and avoid unnecessary local Docker churn. | Full local Docker run. |
| `deepmerge` correction recorded (D-T07-5) | `deepmerge` 4.3.1 has no upstream fix path anywhere (Serenity/JS 3.49.0 still uses 4.3.1). Recorded for backlog v38 / PBR-09. | Deferring to TRIAGE-05 without recording. |
| Outcome follow-up PR v38 (D-T07-6) | Follows two-PR delivery pattern established in TRIAGE-02 and TRIAGE-01. | Single PR bundling backlog merge predictions. |

---

## Documentation Updates

- `docs/implementation-plans/2026-11-08_triage-07-in-major-overrides.md`: status set to `approved` (owner).
- `docs/implementation-plans/_index.md`: row updated to `approved`.
- `docs/implementation-logs/2026-11-09_triage-07-in-major-overrides.md`: created with empirical evidence and diffs.
