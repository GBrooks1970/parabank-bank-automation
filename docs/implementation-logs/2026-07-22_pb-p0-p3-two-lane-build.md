<!--
  AUDIENCE: Engineers and AI agents reviewing this project's development history.
  PURPOSE:  Record what was built, decided, broke, and learned across delivery phases
            PB-P0…PB-P3. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-07-22_pb-p0-p3-two-lane-build.md
  TEMPLATE: portfolio templates/implementation-log.template.md
-->

# PB-P0…PB-P3 — ParaBank two-lane build (SUT infra → API lane → UI lane) — 2026-07-22

## Session Summary

Took `parabank-bank-automation` from an empty repository to a green two-lane test suite
against the pinned ParaBank SUT, across four phase-gated PRs in one day. The result: a
Docker-backed SUT with a CI boot gate (PB-P0), an owner-approved design (PB-P1), an
API-first screenplay BDD lane of 10 scenarios (PB-P2), and a Serenity/JS + Playwright +
Cucumber UI lane of 8 scenarios (PB-P3) — 18 scenarios total, all green locally and in CI,
behind a single `npm run verify`.

---

## Objectives

1. ✅ PB-P0 — build the pinned SUT and prove it boots to a verified state, locally and in CI.
2. ✅ PB-P1 — fix scope and patterns on paper; get owner sign-off before any test code.
3. ✅ PB-P2 — API lane: FR-B1 live-spec conformance, FR-B2 stateful flow, FR-B3 REST↔SOAP
   parity, FR-B4 negative paths asserted as observed.
4. ✅ PB-P3 — UI lane: FR-A1…A5 journeys, each cross-checked via the REST client, with a
   store-safe `@smoke` proof and a content-verified Serenity report.

---

## Test Results

| Lane | Suite | Scenarios | Status |
|---|---|---|---|
| API (Lane B) | `features/api` | 10 (B1×3, B2×1, B3×2, B4×4) | ✅ PASS |
| UI (Lane A) | `features/ui` | 8 (A1×2, A2×2, A3×1, A4×1, A5×2) | ✅ PASS |
| **Full `npm run verify`** | typecheck + tag lint + smoke-safety + both lanes + report check | 18 | ✅ PASS ×2 consecutive |

CI evidence: PB-P0 run 29918600202; PB-P2 main run 29936338065; PB-P3 main run 29947533664
(all green). Determinism proven each phase by running the full local gate twice with no
intervention.

---

## Changes Implemented

### PB-P0 — SUT infrastructure and CI boot gate

**Files:** `scripts/build-sut.ps1`, `scripts/gate.ps1`, `docker-compose.yml`,
`.github/workflows/ci.yml`, `README.md`, root `.gitignore` (portfolio repo, PR #35).

Two-step containerised build (DR-PB-01): the WAR is built in a `maven:3.9-eclipse-temurin-17`
container (upstream tests skipped — their suite needs exclusive HSQLDB/ActiveMQ ports), then
the upstream Dockerfile packages it onto Tomcat 10.1. `gate.ps1` is a four-point boot gate:
`initializeDB` seed (204) → seeded REST login (customer 12212) → OpenAPI 3.0.1 spec → SOAP
WSDL. Single container on host port 8090 (DR-PB-04).

### PB-P1 — Design document and governance

**Files:** `docs/design-document.md` v1.0, `docs/decision-register.md`, `docs/qa-strategy.md`,
`docs/naming-conventions.md`, `docs/project-contract.md`, `LICENSE` (MIT).

Owner fixed FULL scope (A1–A5 + B1–B4) and MIT. DR-PB-06 (boot→seed→use) and DR-PB-07
(lightweight SOAP ability) added. No test code until this merged (design-document-first rule).

### PB-P2 — API lane (Lane B)

**Files:** `src/api/{client,soap,reset,spec-conformance,types}.ts`,
`src/screenplay/{core,abilities,tasks,questions}.ts`, `features/api/**`,
`features/support/{world,hooks}.ts`, `scripts/check-tags.mjs`, `package.json`, `cucumber.js`,
`tsconfig.json`.

Fetch-based REST client returning the raw envelope (assert-as-observed); hand-rolled
screenplay core (Actor/Ability/Task/Question + scenario notes); `@mutates`-tagged reset
bracket (DR-PB-06); live-spec Ajv conformance (FR-B1); DR-PB-07 SOAP envelope client;
tag-lint pinning the smoke count.

### PB-P3 — UI lane (Lane A)

**Files:** `src/screenplay/ui/{pages,tasks,questions}.ts`, `features/ui/**`,
`features/ui/support/serenity.setup.ts`, `features/support/hooks.ts` (After `@loan`),
`src/api/client.ts` (setParameter), `scripts/{report,check-report,smoke-safety}.mjs`,
`package.json`, `cucumber.js` (api/ui profiles), `.github/workflows/ci.yml`.

Serenity/JS + Playwright screenplay; page targets verified against the pinned SUT's JSPs;
every money-movement outcome cross-checked via the Lane B REST client. A5 loan pinned
deterministic via admin `setParameter`, restored by an `After('@loan')` re-seed. Two gate
proofs automated: `smoke-safety.mjs` (seed unchanged after `@smoke`, no reset) and
`check-report.mjs` (scenario names in the Serenity artefacts; HTML enforced in CI).

---

## Technical Decisions

Structural decisions live in `docs/decision-register.md` (DR-PB-01…07). Session-level
decisions not already there:

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| WAR rename runs **inside** the Maven container | Linux CI writes `target/` as root; a host-side copy is permission-denied (run 29918234946) | Host-side `Copy-Item` (failed in CI) |
| Runtime TS via **`tsx/cjs`**, typecheck via **TS7** | `ts-node` is incompatible with TypeScript 7's compiler API; TS7 removed `moduleResolution: node10` → `NodeNext` | ts-node (crashes); downgrading TypeScript |
| **One stdout formatter** (`progress`); serenity adapter → file sink | Two stdout formatters make cucumber emit nothing (silent 0-byte exit-1); magento one-formatter lesson | `progress-bar` (not a TTY in CI) + adapter on stdout (collides) |
| Serenity **HTML** report is JDK-gated (`scripts/report.mjs`) | The Serenity BDD CLI is a Java tool; local dev has no JDK. JSON artefacts are validated regardless; CI installs Java and enforces the HTML | Requiring Java locally (blocks contributors) |
| A5 loan amounts chosen against the **two-gate** upstream rule | `AbstractLoanProcessor`: down payment must be ≤ available funds (seeded customer 12212 = 1692.67) **and** downPayment/amount ≥ threshold (20%) | Assuming a single ratio gate (produced a false "Denied") |

---

## Documentation Updates

- `docs/design-document.md`, `docs/decision-register.md`, `docs/qa-strategy.md`,
  `docs/naming-conventions.md`, `docs/project-contract.md` — created PB-P1; contract gates
  extended in PB-P2/P3.
- `docs/backlog.md` — v1 (phased plan) → v4 (PB-P0…P3 ticked; PBR-01, PBR-02 recorded).
- `README.md` — status advanced each phase; quickstart, seed/reset contract, CI, licence.

---

## Lessons Learned

- **The Docker probe paid for itself, but re-doing the build in earnest still found two new
  facts** the probe missed: fresh containers do not reliably self-seed (→ DR-PB-06), and the
  pom/Dockerfile WAR-name mismatch needs a scripted rename that must run in-container on CI.
- **Assert the SUT that exists.** FR-B1 found a genuine spec/impl mismatch (`Transaction.date`
  epoch-millis vs declared `date-time`); recording it as risk PBR-01 with a narrow named
  allowance is honest and keeps every *other* deviation failing the gate.
- **Read the SUT source before pinning behaviour.** The A5 loan approval has two gates; only
  reading `AbstractLoanProcessor` made the approved/denied cases deterministic.
- **Version-align the Serenity/Playwright stack deliberately.** Mixed `@serenity-js/*` minors
  and a too-new `playwright` broke typecheck (TS2322, missing `Wait` export). Pin all
  `@serenity-js/*` to one version and `playwright` to its peer range (`~1.61`).
- **One stdout formatter only** — the same lesson magento learned; two produce a silent
  no-output failure that is baffling until you know it.

---

## Recommendations / Next Steps

- [ ] PB-P4 — first session-notes handover + README truth audit (this log is its first half).
- [ ] PB-P5 — `onboard-project` registration + the public-vs-private decision.
- [ ] PBR-02 — bump `setup-java`/`upload-artifact` when a Node-24-native major ships (LOW).
- [ ] Deferred (backlog Potential Next Steps): CI Maven dependency caching — cold build
      dominates the ~10–15 min CI time.

---

*Session logged: 2026-07-22. Author: Claude (Fable 5) with Gary Brooks (owner).*
