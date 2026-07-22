<!--
  AUDIENCE: Engineers and AI agents delivering this project. Written to be agent-agnostic:
            every phase is self-contained — an agent with no session history must be able to
            pick up the next unchecked phase from this file plus the referenced documents.
  PURPOSE:  Single source of truth for the phased delivery of parabank-bank-automation.
            Phases are strict sequential gates: a phase may not start until the previous
            phase's acceptance criteria are ALL ticked with evidence linked.
  LOCATION: docs/backlog.md
  TEMPLATE: portfolio templates/backlog.template.md (adapted phase-first: this project is a
            greenfield phased build, so the primary backlog unit is a delivery phase, not a
            risk; the Outstanding Risks section is reserved for defects found along the way).
-->

# parabank-bank-automation — Backlog

**Version:** 4 — PB-P3 complete (UI lane, PR #6; PBR-02 recorded); PB-P4 ready to start
**Last Updated:** 2026-07-22
**Based on:** portfolio `portfolio-docs/PORTFOLIO_PARABANK_SCOPING_PLAN_2026-07-22.md` (§5
phases, owner-approved) and `portfolio-docs/PORTFOLIO_PARABANK_DOCKER_PROBE_2026-07-22.md`
(findings F-01…F-07, cited throughout as "probe F-0x").

This backlog tracks the delivery of the ParaBank test-automation project as **six sequential
phases (PB-P0…PB-P5), each gated by acceptance criteria**. Ordering principle: strict phase
order — no work from phase N+1 before phase N's gate is fully ticked. Within a phase, items
may be reordered freely. Defects and risks discovered during delivery are recorded under
Outstanding Risks using the portfolio's standard scoring.

**Priority Scoring System** (used for risks only; phases are sequenced, not scored):
- **Score = Security Impact (0–10) + Breakage Probability (0–10) + Maintenance Burden (0–10)**
- **HIGH (20–30)** critical · **MEDIUM (10–19)** important · **LOW (0–9)** desirable

---

## Fixed project facts (do not re-derive; verify against these)

| Fact | Value |
|---|---|
| SUT | `parasoft/parabank` pinned at `d1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1` (change = deliberate PR, DR-PB-02) |
| Build/boot | `pwsh ./scripts/build-sut.ps1` → `docker compose up -d` → `pwsh ./scripts/gate.ps1` |
| App URL | `http://localhost:8090/parabank/` |
| Seed/reset contract | **Boot → `POST /parabank/services/bank/initializeDB` (204) → use.** Fresh containers do NOT reliably self-seed; restart is NOT a reset (data persists in-container); `compose down && up -d` + re-seed = pristine. |
| Seeded identity | `john`/`demo`, customer 12212 (use read-only outside reset-bracketed scenarios) |
| Surfaces | UI · REST `/parabank/services/bank/*` (serves own OpenAPI 3.0.1 at `openapi.json`) · SOAP `/parabank/services/ParaBank` + `/services/LoanProcessor` (params must be namespace-qualified — probe F-04) |
| API quirks to assert as-is | Mutations via query params; plain-text success/error bodies; unknown account → **400** (not 404); seed data contains negative balances (probe F-05/F-07) |
| House rules | Branch → PR → CI green → owner merges; never self-merge. One reviewable change per PR. |

---

## Delivery Phases

### PB-P0 — SUT infrastructure and CI boot gate ✅ COMPLETE 2026-07-22

**What it was:** prove the pinned upstream can be built and booted to a verified state,
locally and in CI, before any project design work.

**Evidence:** repo `GBrooks1970/parabank-bank-automation` (private) at commit `fcd96a7`;
CI run [29918600202](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/29918600202)
green (`sut-boot-gate`, 2m14s); portfolio root PR #35 (gitignore entry) merged. Findings
banked: fresh-container seeding is explicit (gate seeds first), and the F-02 WAR rename must
run inside the Maven container (Linux CI writes `target/` as root).

- [x] `scripts/build-sut.ps1` builds the image from the pinned commit with no host toolchain
- [x] `scripts/gate.ps1` passes all four checks from a fresh container
- [x] `.github/workflows/ci.yml` runs both on push/PR and is green on `main`
- [x] README documents quickstart, seed/reset contract, provenance, pin policy

---

### PB-P1 — Design document + project governance docs ✅ COMPLETE 2026-07-22

**Goal:** fix the project's scope and shape on paper, get owner sign-off, and only then
allow test code. This is the portfolio's design-document-first rule; the scoping plan §3
lists what must be fixed.

**Evidence:** [PR #2](https://github.com/GBrooks1970/parabank-bank-automation/pull/2)
(merge `906a00d`, CI green on head `ea67809`). Owner decisions recorded: **FULL scope
A1–A5 + B1–B4** (design doc §1/§11) and **MIT licence**. Delivered:
`docs/design-document.md` v1.0, `docs/decision-register.md` (DR-PB-01…07),
`docs/qa-strategy.md`, `docs/naming-conventions.md`, `docs/project-contract.md`,
`LICENSE`, README updates.

**Work items (all documents follow the portfolio `templates/`):**

1. `docs/design-document.md` — must fix:
   - Final journey/endpoint list: UI lane A1–A5 and API lane B1–B4 as scoped, **or** the
     owner-approved trim (A1–A3 + B1–B3). Present the choice to the owner; do not decide
     unattended.
   - Screenplay shape per lane: Actors/Abilities/Tasks/Questions inventory. Lane A =
     Serenity/JS + Playwright + Cucumber (house style of magento/orangehrm). Lane B =
     API-first screenplay BDD (house style of calculator).
   - SOAP Ability decision: lightweight XML-envelope-over-HTTP Ability (probe-proven);
     namespace-qualified params; no heavyweight SOAP client dependency.
   - Decision records DR-PB-01…05 restated in-repo, plus a new **DR-PB-06: boot→seed→use
     contract** (the PB-P0 finding — always `initializeDB` after boot, reset-bracket
     scenarios that mutate state).
   - Tag strategy: `@smoke` must be store-safe (side-effect-free) from day one, with the
     smoke count stated in the design doc (portfolio lesson: magento C-01).
   - Test-data policy: created accounts/loans capture generated ids dynamically; no
     assumption of positive balances; seeded identities read-only outside reset brackets.
2. `docs/naming-conventions.md`, `docs/qa-strategy.md` — from templates, trimmed to fit.
3. Project licence declared (repo `LICENSE` + README section) — the README already promises
   this happens "alongside the design document."
4. Project contract per portfolio `portfolio-prompts/project-layout.md` (gate cascade,
   verify command name, backlog location) so orchestration prompts can target this project
   later.

**Acceptance criteria (gate for PB-P2):**
- [x] `docs/design-document.md` exists, covers every bullet above, and its PR was
      **approved and merged by the owner** (sign-off = the merge — PR #2, `906a00d`)
- [x] Scope variant (full A1–A5/B1–B4 vs trim) is recorded in the design doc as an explicit
      owner decision, not a default (FULL, owner 2026-07-22, design doc §1/§11)
- [x] DR-PB-01…06 present in-repo with rationale (plus DR-PB-07, SOAP ability —
      `docs/decision-register.md`)
- [x] `LICENSE` committed (MIT, owner 2026-07-22) and README licence section updated to match
- [x] Project contract exists and names the verify command the later phases will implement
      (`docs/project-contract.md`: `npm run verify` inserted at PB-P2)
- [x] Repo still contains **no test code** (`git ls-files` at `906a00d`: docs, scripts,
      workflow, LICENSE, compose only)

---

### PB-P2 — API lane (Lane B) ✅ COMPLETE 2026-07-22

**Goal:** the API-first screenplay BDD suite. Delivered before the UI lane deliberately: it
needs no Serenity plumbing, proves the SUT contract early, and its client becomes the UI
lane's verification hook (scoping plan §5).

**Evidence:** [PR #4](https://github.com/GBrooks1970/parabank-bank-automation/pull/4)
(merge `6d4525a`); post-merge `main` CI
[run 29936338065](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/29936338065)
green (boot gate + `npm ci` + `npm run verify` on Node 24). 10 scenarios (B1–B4) green;
determinism 10/10 twice consecutively; smoke 2/2; `npm audit` 0. FR-B1 surfaced a real
spec/implementation mismatch → risk **PBR-01** (below) with a narrow named allowance.
Toolchain notes for the log: TypeScript 7 (NodeNext; `node10` resolution removed) with
`tsx/cjs` as the cucumber loader (`ts-node` is incompatible with TS7's compiler API).

**Work items (scenario set per the PB-P1-approved scope):**

1. Node/TypeScript toolchain + BDD runner consistent with the design doc; single
   `npm run verify` (or the contract-named equivalent) runs everything locally and in CI.
2. **B1** REST contract conformance against the SUT-served `openapi.json` (fetch the spec
   from the running SUT, not a checked-in copy — the SUT is pinned, so the spec is too).
3. **B2** stateful multi-step flow: login → create account → deposit → transfer → verify
   balances and transaction history, reset-bracketed per DR-PB-06.
4. **B3** REST↔SOAP parity: after a mutation, the same read via both protocols must agree.
5. **B4** negative paths asserting observed behaviour (400 plain-text unknown account,
   invalid amounts, insufficient-funds behaviour as it actually is).
6. CI: extend `ci.yml` with the lane job, running against the compose-booted SUT behind the
   existing boot gate.

**Acceptance criteria (gate for PB-P3):**
- [x] Every scenario shape approved in PB-P1 for Lane B is implemented and green
      (B1: 3 scenarios, B2: 1, B3: 2, B4: 4 — 10 total)
- [x] Scenarios that mutate state are `initializeDB`-bracketed (`@mutates` hook); suite
      passed **10/10 twice consecutively locally** with no manual intervention
- [x] No fixed sleeps; readiness is polled (`seedDatabase` doubles as the readiness wait)
- [x] `npm run verify` (typecheck + tag lint + suite) is the single entry point, green
      locally and in CI; recorded in `docs/project-contract.md` Gates
- [x] CI on `main` green with boot gate + API lane:
      [run 29936338065](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/29936338065)
- [x] Backlog updated: this phase ticked; **PBR-01** recorded under Outstanding Risks

---

### PB-P3 — UI lane (Lane A) ✅ COMPLETE 2026-07-22

**Goal:** the Serenity/JS + Playwright + Cucumber journey suite with living documentation.

**Evidence:** [PR #6](https://github.com/GBrooks1970/parabank-bank-automation/pull/6)
(merge `2c1b41f`); post-merge `main` CI
[run 29947533664](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/29947533664)
green (boot gate + Java + Playwright Chromium + full `npm run verify`, Serenity report
uploaded as the `serenity-report` artifact). 8 UI scenarios (A1–A5) green; full verify
(10 API + 8 UI + smoke-safety + report content check) green **twice consecutively**
locally. A5 loan pinned deterministic via admin `setParameter` after reading the upstream
two-gate approval rule (funds ceiling 1692.67 + 20% down-payment ratio). Serenity/JS 3.44.1
aligned across packages, playwright pinned to the peer `~1.61` range; `npm audit` 0.

**Work items (journey set per the PB-P1-approved scope):**

1. Serenity/JS + Playwright + Cucumber wiring (mirror orangehrm-pim-automation's proven
   setup, including its selector lessons: no `:has`, `isPresent`+`Click` for below-fold).
2. Journeys A1–A5 (or trim), each verifying outcomes via the Lane B API client where the UI
   alone is weak evidence (balance changes, transaction records).
3. `@smoke` tag applied per the design doc's store-safe definition; count matches the doc.
4. Serenity living-documentation report generated in CI and **content-verified** — assert
   the report actually contains the executed scenarios (portfolio lesson: magento's empty
   report shell went unnoticed at go-live; never trust generation alone).

**Acceptance criteria (gate for PB-P4):**
- [x] Every journey approved in PB-P1 for Lane A is implemented and green (A1–A5, 8
      scenarios incl. approved+denied loan)
- [x] UI outcomes cross-checked via the API client where specified in the design doc
      (balances, transaction records, opening balances via the shared REST client)
- [x] `@smoke` subset runs green, is provably side-effect-free (`scripts/smoke-safety.mjs`:
      seed → run @smoke both profiles → assert seed byte-identical with no reset), and its
      count matches the design doc (3: 2 API + 1 UI, enforced by `scripts/check-tags.mjs`)
- [x] Serenity report generated in CI **and** content-verified automatically
      (`scripts/check-report.mjs`: every scenario name in the artefacts + non-trivial HTML
      in CI); one stdout formatter only (magento empty-shell + one-formatter lessons)
- [x] Full suite (boot gate + API lane + UI lane) green in CI on `main`:
      [run 29947533664](https://github.com/GBrooks1970/parabank-bank-automation/actions/runs/29947533664)

---

### PB-P4 — Documentation, implementation log, and handover — Status: READY TO START

**Goal:** make the project resumable-cold and its public claims true.

**Work items:**

1. Implementation log(s) in `docs/implementation-logs/` per the portfolio template — what
   was built, decided, broke, and learned across PB-P1…P3 (the portfolio
   `write-implementation-log` prompt does this).
2. README refresh: replace the Phase-0 status block with the real capability statement;
   every claim must be verifiable from the repo/CI at the commit that makes it.
3. First session-notes handover for this project at the **portfolio root**
   `session-notes/parabank-bank-automation_session-notes_v1_<timestamp>.md` + generated
   `.html` companion (the portfolio `write-handover` prompt does this, en-GB).
4. Reconcile this backlog: all phase gates ticked with evidence links, risks resolved or
   explicitly carried.

**Acceptance criteria (gate for PB-P5):**
- [ ] Implementation log committed; covers decisions AND deviations (anything done
      differently from the design doc is recorded as a deviation, not silently)
- [ ] README claims audited against reality at HEAD (each claim has a supporting artefact:
      CI run, report, spec file)
- [ ] Handover v1 pair exists at portfolio root `session-notes/` and passes the
      handover-pair manifest check (`portfolio-prompts/tools/build-handover-manifest.py`)
- [ ] This backlog shows PB-P0…P4 complete with evidence links and zero unstated gaps

---

### PB-P5 — Portfolio registration (onboard-project) — Status: BLOCKED (needs PB-P4)

**Goal:** make the project a first-class, orchestration-safe portfolio member.

**Work items:**

1. Run the portfolio `onboard-project` prompt for `parabank-bank-automation`: registry
   metadata proposal, gates, scaffold checks — staged as PRs (target repo +
   `portfolio-prompts` registry), **never self-merged**.
2. `python portfolio-prompts/tools/workspace_preflight.py` must report the new project
   clean (not BLOCKED) once the registry PR merges.
3. Decide with the owner whether/when the repo goes public — publication requires the
   portfolio's public-readiness audit convention (P-07 precedent: audit → explicit owner
   approval → publish → post-publication verification). Not automatic at this phase.

**Acceptance criteria (project delivery complete):**
- [ ] Registry PR(s) staged, reviewed, and merged by the owner
- [ ] `workspace_preflight.py` green/WARN-free for this project from the portfolio root
- [ ] Publication decision recorded (public with audit evidence, or explicitly private
      with the reason) — no silent state
- [ ] Backlog Version bumped with a dated closure note; project enters normal
      resume/derive/loop lifecycle

---

## Phase Summary

| Phase | Title | Status | Gate evidence |
|---|---|---|---|
| PB-P0 | SUT infrastructure + CI boot gate | ✅ Complete 2026-07-22 | CI run 29918600202; commit `fcd96a7` |
| PB-P1 | Design document + governance docs | ✅ Complete 2026-07-22 | PR #2; merge `906a00d` |
| PB-P2 | API lane (B1–B4) | ✅ Complete 2026-07-22 | PR #4; merge `6d4525a`; main run 29936338065 |
| PB-P3 | UI lane (A1–A5) + Serenity report | ✅ Complete 2026-07-22 | PR #6; merge `2c1b41f`; main run 29947533664 |
| PB-P4 | Logs, README truth, handover v1 | READY TO START | — |
| PB-P5 | Portfolio registration + publication decision | Blocked on P4 | — |

---

## Outstanding Risks

Defects/risks discovered during any phase are added here using the template's risk block
and scoring; phase gates cannot be ticked while a HIGH risk in that phase's scope is open.

### LOW Priority (Score: 0–9)

#### Risk PBR-02: CI actions warn about Node 20 deprecation — Score: 3

**Priority Score:** Security Impact (0) + Breakage Probability (2) + Maintenance Burden (1) = **3 points**
**Impact:** The PB-P3 `main` CI run (29947533664) is green but annotates that
`actions/setup-java@v4` and `actions/upload-artifact@v4` still run on Node 20, which
GitHub's runners are deprecating (being force-run on Node 24 for now).
**Status:** RECORDED — warning only, not a failure
**Affected:** `.github/workflows/ci.yml`

**Problem:** These are already the latest major versions of both actions, so there is no
bump to make today; when the actions publish Node-24-native majors, adopt them. Until then
the forced Node 24 keeps CI green.

**Success Criteria:**
- [ ] Bump `setup-java` / `upload-artifact` when a Node-24-native major is available.

#### Risk PBR-01: Live OpenAPI spec mis-declares `Transaction.date` — Score: 5

**Priority Score:** Security Impact (0) + Breakage Probability (3) + Maintenance Burden (2) = **5 points**
**Impact:** The SUT's own spec declares `Transaction.date` as `string`/`date-time`, but the
JSON responses return epoch milliseconds (observed live 2026-07-22, e.g. `1765411200000`).
**Status:** RECORDED — asserted, not accommodated
**Affected:** FR-B1 (`features/api/b1-rest-contract.feature`)

**Problem:** A genuine upstream spec/implementation mismatch in the pinned SUT
(`d1bf006`). Per FR-B1 and the assert-as-observed policy (design doc §5.7), the
conformance scenario carries a **narrow, named allowance** (`/date must be string`)
citing this risk, so any *other* deviation still fails the gate.

**Refactor Strategy:** none in this repo (we do not patch the SUT). If the upstream pin is
ever bumped (DR-PB-02), re-run FR-B1 without the allowance to check whether upstream fixed
it; drop the allowance and resolve this risk if so.

**Success Criteria:**
- [ ] On any future upstream bump, the allowance is re-justified or removed.

### Resolved Risks

#### Fresh-container seeding assumed automatic ✅ Resolved 2026-07-22

**Resolution:** Phase-0 verification showed a fresh container boots unseeded (probe F-03
had observed otherwise). Contract corrected to boot→seed→use; `scripts/gate.ps1` seeds
first; becomes DR-PB-06 in PB-P1.
**See:** commit `e7b921b` (gate reorder) and README "Seeding and resetting state."

#### Host-side WAR rename fails on Linux CI ✅ Resolved 2026-07-22

**Resolution:** containerised Maven writes `target/` as root on Linux runners; the F-02
rename moved inside the container invocation.
**See:** commit `fcd96a7`; failed run 29918234946 vs green run 29918600202.

---

## Potential Next Steps (not yet scheduled; promote via a phase or risk, never ad hoc)

### MEDIUM Priority
1. **CI Maven dependency caching** — the CI build cold-downloads the full Maven tree every
   run (~1 min on runners). Options: `actions/cache` on a bind-mounted `.m2`, or a
   prebuilt/pushed SUT image promoted by digest (magento R-06b pattern). Worth doing when
   CI minutes start to matter.
2. **Compose healthcheck for the SUT service** — `gate.ps1` polls from the host; an
   in-container healthcheck would let future multi-service compose (if any) use
   `depends_on: condition: service_healthy`. Note: the Tomcat base image may lack
   curl/wget — verify before assuming.

### LOW Priority
3. **Positions/stock-trading module coverage** — explicitly out of scope in the scoping
   plan; candidate for a post-P5 worklist item.
4. **LoanProcessor SOAP service beyond the A5 journey** — same.

---

## Maintenance Notes

- Update **Version** and **Last Updated** whenever a phase gate or risk changes state.
- Tick acceptance boxes only with evidence (commit SHA, CI run link, PR number) added to
  the phase's Gate-evidence cell in the Phase Summary.
- Cross-reference future code-review findings in `.review/` when that folder exists.
- The portfolio-level provenance chain for this project: candidate research → scoping plan
  → probe report, all under the portfolio root's `portfolio-docs/`.
