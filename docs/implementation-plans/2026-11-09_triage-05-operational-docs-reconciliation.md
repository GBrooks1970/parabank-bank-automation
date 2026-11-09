---
version: 1
created: 2026-11-09T19:45Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-05 (approved worklist item; proposed backlog candidate)
status: approved
approved: 2026-11-09 (owner)
presented: 2026-11-09
language: en-GB
---

# Implementation plan: TRIAGE-05, reconcile active operational documentation and status summaries

**Goal.** Reconcile operational documentation, architecture references, and backlog status summaries across the repository to reflect all delivered capabilities, image pin resolutions, and review triage outcomes. This resolves Claude v1 review finding R-02 (MEDIUM 14, docs reconciliation portion) and September review R-05, implementing owner-approved Amendment A-1.

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-05 (`review R-05 (LOW); Claude v1 R-02 (MEDIUM, 14)` with Amendment 2026-11-06 A-1).
- Review findings: Claude v1 review R-02 in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md` §2.
- Key files:
  - `docker-compose.yml:8` (seeding claim)
  - `README.md:126-127` (decision register range)
  - `docs/qa-strategy.md:32,35` (unit test areas and performance-smoke lane)
  - `docs/backlog.md:103-107,800-1035` (recorded risk PBR-09, active status, and recomputed Risk Summary)

---

## Evidence Gathered Before Planning

All reads conducted in worktree `wt-parabank-t05` on branch `worklist/triage-05-operational-docs-reconciliation` tracking `origin/main` at `468ff95` (following TRIAGE-04 delivery outcome merge), with Node 24.18.0 and npm 11.16.0.

| Finding | Consequence for the plan |
|---|---|
| **Compose Seeding Claim:** `docker-compose.yml:8` states `#   docker compose up -d # start; first boot self-seeds (~18 s)`. However, DR-PB-06 and `docs/backlog.md:140` state: "Fresh containers do NOT reliably self-seed; boot → seed → use is required." | Correct comment to reflect that fresh containers boot unseeded and `initializeDB` establishes the seed state. |
| **Decision Register Range:** `README.md:127` cites `DR-PB-01…10 with rationale`, but `docs/decision-register.md` contains 13 approved records (DR-PB-01 through DR-PB-13, including pin drift DR-PB-11, multi-style DR-PB-12, and local SUT target guard DR-PB-13). | Update citation in `README.md:127` to `DR-PB-01…13 with rationale`. |
| **Unit Test Areas in QA Strategy:** `docs/qa-strategy.md:32` lists only 6 original unit test areas from PB-CODEX-03 (36 unit tests). Today `tests/unit/` contains 16 test files (73 unit tests), covering target-guard, destructive call-sites, Pages evidence, perf evidence/lifecycle/promotion, backlog integrity, and currency validation. | Expand line 32 to enumerate all current framework unit test areas. |
| **Non-Functional / Perf Lane in QA Strategy:** `docs/qa-strategy.md:35` lists Non-functional as "Out of scope v1 (scoping plan); revisit post-P5". However, an optional k6 performance-smoke lane was added on 2026-08-05 and hardened under TRIAGE-03/TRIAGE-08. | Update line 35 to describe the optional k6 performance-smoke lane with isolated diagnostics and token-split snapshot publishing. |
| **Transitive Advisory Risk (PBR-09):** Prior to TRIAGE-01 and TRIAGE-07, `npm audit` reported 11 advisories (7 HIGH). These were cleared in-major via `fast-uri` 3.1.9, `axios` 1.20.0, `follow-redirects` 1.16.2, and `brace-expansion` 5.0.12. Residual dev advisories (`deepmerge` 4.3.1 and `glob`/`minimatch`) remain recorded triggers. | Record **Risk PBR-09** under Outstanding / Recorded Risks in `docs/backlog.md` with full details and deferred follow-up triggers. |
| **Risk Summary Recomputation:** `docs/backlog.md:1021-1028` lists only 7 resolved risks and 3 recorded risks from 2026-09-01/10-19. It does not reflect the November triage extension outcomes (PB-PIN-05, TRIAGE-01..04, 06..09 resolved; TRIAGE-10..16 tracked). | Recompute the summary table and prose in `docs/backlog.md` to accurately reflect the 4 accepted/recorded risks (PBR-01, 04, 05, 09) and the status of triage candidates. |

---

## Design Options & Proposed Architecture

### 1. Docker Compose Comment Correction (D-T05-1)
- In `docker-compose.yml:7-11`:
  ```yaml
  # Lifecycle (probe finding F-06, DR-PB-06):
  #   docker compose up -d                      # start container (boots unseeded)
  #   POST /parabank/services/bank/initializeDB # in-place deterministic seed/reset (boot → seed → use)
  #   docker compose restart                    # NOT a reset — data persists in the container
  #   docker compose down && up -d              # clean slate (recreates container, boots unseeded)
  ```
  - Aligns verbatim with DR-PB-06 and `docs/backlog.md:140`.

### 2. QA Strategy Performance-Smoke Lane (D-T05-2)
- In `docs/qa-strategy.md:35`:
  - Replace "Out of scope v1" with description of the optional threshold-gated load smoke lane:
    `| Performance smoke (k6) | Optional nightly/dispatched load smoke (`npm run perf`); asserts error rate = 0 and p95 latency thresholds over ramping read/write REST traffic; diagnostics isolated in `perf/run-output/` (TRIAGE-03) and published snapshots promoted to `perf/report/` via a write-token-isolated publisher job (TRIAGE-08) |`

### 3. README Decision Register Reference (D-T05-3)
- In `README.md:127`:
  - Change `- [`docs/decision-register.md`](docs/decision-register.md) — DR-PB-01…10 with rationale.` to:
    `- [`docs/decision-register.md`](docs/decision-register.md) — DR-PB-01…13 with rationale.`

### 4. QA Strategy Unit Test Scope (D-T05-4)
- In `docs/qa-strategy.md:32`:
  - Expand the Framework Unit row:
    `| Framework unit | SOAP envelopes/parsing, OpenAPI operation/deviation selection, Cucumber tag inheritance, Serenity report/scenario integrity, request deadline/abort diagnostics, smoke-safety seed ownership/snapshot diff, SUT loopback target guard, destructive operation call-site enforcement, Pages evidence packaging/safety, perf evidence provenance/run lifecycle/snapshot promotion, backlog integrity, and currency formatting/minor-unit matching (73 unit tests in `tests/unit/`) |`

### 5. Record Risk PBR-09 in Backlog (D-T05-5)
- Under `docs/backlog.md` Outstanding Risks / LOW Priority:
  - Add **Risk PBR-09: Transitive dependency advisories in development/reporting toolchain — Score: 5**
  - Priority Score: Security (2) + Breakage (1) + Maintenance (2) = **5 points**
  - Record the resolution of HIGH advisories via TRIAGE-01 (`fast-uri` 3.1.9) and TRIAGE-07 (`axios` 1.20.0 override, `follow-redirects` 1.16.2, `brace-expansion` 5.0.12).
  - Document the two recorded maintenance triggers:
    1. `deepmerge@4.3.1` (LOW, GHSA-gcqx-w48m-w2h4): waiting for upstream Serenity/JS to update dependencies.
    2. `glob` / `minimatch` (MODERATE, GHSA-52f3-5v77-6656 / GHSA-f8mg-x85v-4845): waiting for the reviewed `@cucumber/cucumber` 13 upgrade.

### 6. Recompute Backlog Status and Risk Summary (D-T05-6)
- In `docs/backlog.md:103-107`:
  - Update `**Last Updated:** 2026-11-09`.
  - Reconcile status narrative: PBR-01, PBR-04, PBR-05, and PBR-09 remain recorded maintenance triggers (trigger-gated on upstream SUT/library bumps).
- In `docs/backlog.md:1019-1033` (Risk Summary):
  - Table:
    | Priority | Outstanding | Accepted (RECORDED) | Status |
    |---|---:|---:|---|
    | HIGH (20–30) | 0 | 0 | All review findings resolved (R-01, R-02, R-03, R-04) |
    | MEDIUM (10–19) | 0 | 0 | PBR-06, PBR-07 resolved 2026-09-01; PBR-08 resolved 2026-10-19 |
    | LOW (0–9) | 0 | 4 | PBR-01, PBR-04, PBR-05, PBR-09 — asserted, not accommodated |
    | **Total requiring action** | **0** | **4** | — |
    | Resolved | 7 | — | PBR-02, PBR-03, PBR-06, PBR-07, PBR-08 + 2 phase-0 risks |
  - Note the active triage extension tracking: TRIAGE-01..04, 06..09 delivered; TRIAGE-05 in progress; TRIAGE-10..16 tracked (all LOW, scores 4–9).

### 7. Two-PR Cadence (D-T05-7)
- **Implementation PR (`worklist/triage-05-operational-docs-reconciliation`):**
  - Update `docker-compose.yml`, `README.md`, `docs/qa-strategy.md`, and `docs/backlog.md`.
  - Add implementation log `docs/implementation-logs/2026-11-09_triage-05-operational-docs-reconciliation.md`.
  - Open PR, pass CI, merge into `main`.
- **Outcome PR (`worklist/triage-05-outcome`):**
  - Bump `docs/backlog.md` to **v43** recording delivery of TRIAGE-05 (7 unchecked items remaining: TRIAGE-10 to TRIAGE-16).
  - Update plan status to `delivered` with merge SHA.
  - Tick root worklist `WORKLIST_parabank-bank-automation.md`.

---

## Verification Strategy

1. **Static and Quality Gates:**
   - `npm run test:unit` passes 73/73 (including `backlog-integrity.test.ts` verifying `docs/backlog.md`).
   - `npm run typecheck`, `npm run typecheck:style-02`, `npm run typecheck:style-03`, `npm run perf:typecheck`: all pass (exit 0).
   - `npm run lint:tags`: passes (exit 0).
   - `tools/ci/check-support.ps1 -Only Docs` passes 9/9 at portfolio root.

2. **Cross-Document Consistency:**
   - Verify that DR-PB range in `README.md` exactly matches `docs/decision-register.md` (13 records).
   - Verify that unit test areas enumerated in `docs/qa-strategy.md` match all 16 files in `tests/unit/`.
   - Verify that `docker-compose.yml` lifecycle comments agree with DR-PB-06.
   - Verify that Risk Summary in `docs/backlog.md` matches all recorded risks (PBR-01, 04, 05, 09) and triage extension state.

---

## Decision Points for Owner Review

1. **D-T05-1 (Compose Seeding Comment):** Approve correcting `docker-compose.yml:8` to explicitly state that fresh containers boot unseeded and `initializeDB` establishes seed state (DR-PB-06).
2. **D-T05-2 (Performance Lane in QA Strategy):** Approve describing the optional k6 performance-smoke lane in `docs/qa-strategy.md:35`.
3. **D-T05-3 (README Decision Register Range):** Approve updating `README.md:127` to cite DR-PB-01…13.
4. **D-T05-4 (QA Strategy Unit Test Inventory):** Approve expanding `docs/qa-strategy.md:32` to enumerate all 12 current framework unit test areas (73 tests).
5. **D-T05-5 (Record Risk PBR-09):** Approve adding Risk PBR-09 (Score 5, LOW) in `docs/backlog.md` recording the dependency advisory resolution and deferred follow-ups.
6. **D-T05-6 (Backlog Risk Summary Recomputation):** Approve recomputing the Risk Summary table and active status narrative in `docs/backlog.md`.
7. **D-T05-7 (Two-PR Cadence):** Approve implementation PR followed by outcome PR updating backlog to v43.

---

## Outcome

*(To be recorded upon PR merge)*
