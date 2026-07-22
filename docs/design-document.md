<!--
  AUDIENCE: Engineers and AI agents implementing the test lanes of parabank-bank-automation.
  PURPOSE:  The PB-P1 design document — fixes scope, patterns, and policies BEFORE any test
            code exists. PB-P2/PB-P3 implement exactly what this document approves; anything
            done differently must be recorded as a deviation in the implementation log.
  LOCATION: docs/design-document.md
  TEMPLATE: portfolio templates/design-document.template.md (adapted: sections that do not
            apply to a greenfield test project are omitted or say N/A).
-->

# parabank-bank-automation — Design Document

**Version:** v1.0
**Date:** 2026-07-22
**Author:** Claude (Fable 5) with Gary Brooks (owner decisions §1/§11)
**Reviewer:** Gary Brooks (owner) — review vehicle is the PR; **merge = approval** (backlog PB-P1 gate)
**Status:** Approved (owner merge of PR #2, `906a00d`, 2026-07-22)

---

## 1. Executive Summary

### Purpose

Fix the design of a two-lane test-automation project against ParaBank (Parasoft's open-source
banking demo) before implementation: Serenity/JS + Playwright + Cucumber UI journeys (the
portfolio's magento/orangehrm house style) and API-first stateful screenplay BDD with
REST↔SOAP parity (extending the calculator house style). One SUT, one datastore, two proven
disciplines.

### Scope — **owner decision 2026-07-22: FULL scope**

**In scope (Lane A — UI journeys, Serenity/JS + Playwright + Cucumber):**

| ID | Journey |
|---|---|
| A1 | Register a new customer, then first login with the new credentials |
| A2 | Open a new account (checking/savings) funded from an existing account |
| A3 | Transfer funds between accounts; verify balances and transaction history |
| A4 | Bill pay to a payee; verify the resulting transaction |
| A5 | Request a loan; assert the approval/denial rendering (pinned deterministic — §5.6) |

**In scope (Lane B — API screenplay BDD):**

| ID | Scenario shape |
|---|---|
| B1 | REST contract conformance against the SUT-served OpenAPI 3.0.1 spec |
| B2 | Stateful multi-step flow: login → create account → deposit → transfer → verify balances + transactions |
| B3 | REST↔SOAP parity: the same read after a mutation must agree across both protocols |
| B4 | Negative paths asserting observed behaviour (plain-text 400s, invalid amounts, insufficient funds) |

**Out of scope** (unchanged from the scoping plan): bookstore/WS-Security endpoints,
JMS/ActiveMQ, direct HSQLDB access (port 9001), Parasoft DTP/Jtest/SOAtest tooling, the
positions/stock-trading module, performance/load testing, upstream-version chasing.

### Key Decisions

Recorded in [`docs/decision-register.md`](decision-register.md): DR-PB-01…05 (adopted from
the portfolio scoping plan) plus **DR-PB-06 boot→seed→use** and **DR-PB-07 lightweight SOAP
Ability** (new in this document).

### Success Criteria

- PB-P2 and PB-P3 implement every FR below with zero scope additions or silent removals.
- The backlog's phase gates (PB-P2/PB-P3 acceptance criteria) pass without amending this
  document; any amendment is a versioned change with owner re-approval.

---

## 2. Problem Analysis

### Current State

Phase 0 delivered a build/boot/gate scaffold (green in CI) and no test code. The SUT is
fully characterised by the executed probe
(`portfolio-docs/PORTFOLIO_PARABANK_DOCKER_PROBE_2026-07-22.md`, findings F-01…F-07) and the
Phase-0 refinement (explicit seeding). This document turns that characterisation into a
bounded implementation contract.

### Constraints and Assumptions

**Technical constraints:**
- The SUT is pinned (`parasoft/parabank@d1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1`) and its
  behaviour is asserted **as observed**, including unconventional API behaviour (§5.7). We
  test the demo app that exists, not the API we might prefer.
- Single container, single datastore: UI, REST, and SOAP mutate the same state. Test
  isolation therefore comes from the reset contract (DR-PB-06), not from parallelism.
  **Scenarios run serially in v1** (same lesson as calculator CAL-01 `fullyParallel:false`).
- SUT startup ~18 s + explicit seed; suites must poll readiness, never sleep.

**Assumptions:**
- Docker and pwsh 7+ available locally and on ubuntu CI runners (proven in Phase 0).
- Node LTS (≥ 20, target 24 to match portfolio CI convention) for the test toolchain.

### Stakeholders

| Stakeholder | Role | Interest |
|---|---|---|
| Gary Brooks | Owner | Portfolio-quality showcase; honest claims; phase gates respected |
| AI agents | Implementers | Unambiguous scope + policies; no re-derivation needed |

---

## 3. Requirements

Requirement IDs reuse the journey/shape IDs (FR-A1…FR-A5, FR-B1…FR-B4) so the backlog,
this document, and the feature files stay traceable by a single vocabulary.

### Lane A — UI journeys (all Must Have)

**FR-A1: Register + first login**
- Given the SUT is freshly seeded, When a new customer registers via the UI with generated
  unique details And logs in with those credentials, Then the account overview page greets
  the new customer by name.
- Note: registration mutates state → reset-bracketed (§5.5). Username uniqueness comes from
  the run-scoped data factory (§5.8), not from reset alone.

**FR-A2: Open a new account**
- Given a logged-in seeded customer, When they open a new CHECKING (and, in a second
  scenario, SAVINGS) account funded from an existing account, Then the new account appears
  in the overview with the transferred opening balance, And the funding account's balance
  decreased accordingly — the balance assertions verified **via the Lane B REST client**
  (§5.4), not only via the UI.

**FR-A3: Transfer funds**
- Given a logged-in seeded customer with two known accounts, When they transfer a fixed
  amount between them, Then the UI confirms the transfer And both balances and the two
  transaction records are verified via the REST client.

**FR-A4: Bill pay**
- Given a logged-in seeded customer, When they pay a bill to a generated payee from a known
  account, Then the UI confirms payment And the debit transaction is verified via the REST
  client.

**FR-A5: Request a loan**
- Given a logged-in seeded customer And the loan decision environment is pinned (§5.6),
  When they apply for a loan with amount/down-payment chosen to guarantee the pinned
  outcome, Then the UI shows exactly that outcome (approved: new loan account visible;
  denied: denial message).

### Lane B — API scenario shapes (all Must Have)

**FR-B1: REST contract conformance**
- Given the spec fetched **live** from `/parabank/services/bank/openapi.json` (never a
  checked-in copy — the SUT pin pins the spec), When the in-scope endpoints (§5.4 client
  surface) are exercised, Then responses conform to the spec's schemas/status codes, And
  deviations discovered are recorded as backlog risks, not silently accommodated.

**FR-B2: Stateful multi-step flow**
- Given a seeded SUT, When one scenario runs login → createAccount → deposit → transfer →
  read balances + transactions, Then every intermediate state assertion holds using only
  ids captured from earlier responses (no hardcoded created-entity ids).

**FR-B3: REST↔SOAP parity**
- Given a mutation performed via REST (e.g. a transfer), When the affected account is read
  via REST `GET /accounts/{id}` and via SOAP `getAccount`, Then the two reads agree on id,
  customerId, type, and balance. (Probe F-04/F-05 proved the mechanism.)

**FR-B4: Negative paths (observed behaviour)**
- Unknown account read → **400** with plain-text `Could not find account #…` (not 404, not
  JSON).
- Transfer with a non-numeric / missing amount → the observed 4xx.
- Transfer exceeding available funds → assert **whatever the SUT actually does** (the seed
  contains negative balances — overdraft may be permitted); the first implementation run
  fixes the expected value in the feature file with a comment citing the observing run.

### Non-functional requirements

- **NFR-1 Determinism:** full suite green twice consecutively with no manual intervention
  (backlog PB-P2 gate); no fixed sleeps anywhere — poll with timeouts.
- **NFR-2 Single entry point:** `npm run verify` runs everything the CI runs for the lanes.
- **NFR-3 Reporting:** Lane A produces a Serenity living-documentation report whose
  **content** is machine-verified (backlog PB-P3 gate; magento lesson).
- **NFR-4 Store safety:** `@smoke` scenarios are side-effect-free (§5.9).

---

## 4. Design Overview

### Architecture

```
features/ (Gherkin: a1…a5, b1…b4)
    │
    ├── Lane A steps ──► Serenity/JS Screenplay ──► Ability: BrowseTheWeb (Playwright)
    │                         │
    │                         └───────────► cross-checks via ──┐
    │                                                          ▼
    └── Lane B steps ──► Screenplay ──► Ability: CallParaBankRest (fetch-based client)
                                   └──► Ability: CallParaBankSoap (XML envelope over HTTP)
                                                          │
                                                          ▼
                                    ParaBank container (compose, :8090) — one datastore
```

- **One shared API client package** (`src/api/`) used by Lane B Abilities *and* Lane A
  verification steps — the client is written once in PB-P2 and reused in PB-P3.
- **Reset bracket** (§5.5) is a lane-agnostic helper around `initializeDB`.

### Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| Language | TypeScript (Node ≥ 20, CI on 24) | Portfolio convention |
| Lane A | Serenity/JS + Playwright + Cucumber | House style (magento, orangehrm); living documentation |
| Lane B | Cucumber-js + hand-rolled screenplay over the shared client | Matches API-first house style without dragging browser deps into the API lane |
| REST client | Native `fetch` wrapper (no axios) | Zero-dependency, sufficient (probe-proven surface) |
| SOAP client | Hand-built XML envelopes over `fetch` (DR-PB-07) | Probe-proven; avoids a heavyweight SOAP stack |
| Assertions | Serenity ensure / node:assert per lane norms | Consistency with each lane's house style |

### Design principles

- **Assert reality, not convention** — the SUT is a pinned demo app; its quirks are the
  spec (§5.7).
- **Screenplay throughout** — interactions are Tasks, checks are Questions; step
  definitions stay one line thick.
- **DRY across lanes** — one API client, one reset helper, one data factory.

---

## 5. Detailed Design

### 5.1 Screenplay inventory — Lane A (Serenity/JS)

| Kind | Name | Notes |
|---|---|---|
| Ability | `BrowseTheWeb` | Serenity/JS Playwright ability (framework-provided) |
| Ability | `CallParaBank` | Thin Serenity wrapper over the shared REST client, for verification steps |
| Tasks | `RegisterCustomer`, `LogIn`, `OpenNewAccount`, `TransferFunds`, `PayBill`, `RequestLoan` | One per journey mutation; parameterised by the data factory |
| Questions | `AccountOverview.accounts()`, `WelcomeMessage.text()`, `LoanDecision.outcome()` | UI-side reads |
| Questions | `ApiAccount.balance(id)`, `ApiTransactions.forAccount(id)` | REST-side verification (shared client) |

Selector norms inherited from orangehrm-pim-automation: no `:has()` pseudo-selectors;
`isPresent` + `Click` pattern for below-fold elements; explicit waits on rendered state.

### 5.2 Screenplay inventory — Lane B

| Kind | Name | Notes |
|---|---|---|
| Ability | `CallParaBankRest` | Wraps the shared REST client; captures last response for Questions |
| Ability | `CallParaBankSoap` | DR-PB-07 envelope client; exposes typed `getAccount`, extendable per parity need |
| Tasks | `Login`, `CreateAccount`, `Deposit`, `Transfer`, `RequestLoan(api)` | Mutations via REST (query-param style, §5.7) |
| Questions | `TheAccount(id)`, `TheTransactions(accountId)`, `TheSoapAccount(id)`, `TheLastResponse.status()/text()` | Reads + negative-path assertions |
| Helper | `SpecConformance` | Fetches live `openapi.json`, validates in-scope responses against its schemas |

### 5.3 SOAP Ability (DR-PB-07)

Hand-built document-literal envelopes over `fetch`:

```ts
// src/api/soap.ts (shape, not final code)
const NS = 'http://service.parabank.parasoft.com/';
export async function soapCall(base: string, op: string, params: Record<string, string>) {
  const body =
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:par="${NS}">` +
    `<soapenv:Body><par:${op}>` +
    Object.entries(params).map(([k, v]) => `<par:${k}>${v}</par:${k}>`).join('') +
    `</par:${op}></soapenv:Body></soapenv:Envelope>`;
  // POST text/xml to /parabank/services/ParaBank; parse response; SOAP fault → typed error
}
```

Constraints (probe F-04): parameters **must** be namespace-qualified; unqualified params
produce an unmarshalling fault — the fault path is itself asserted in one B4 scenario.
Response parsing uses a minimal XML text extraction (no DOM library) — parity checks read
four scalar fields; if this grows past `getAccount`-class reads, revisit DR-PB-07.

### 5.4 Shared REST client surface (`src/api/`)

In-scope endpoints (all under `/parabank/services/bank`): `login/{u}/{p}` ·
`customers/{id}` · `customers/{id}/accounts` · `accounts/{id}` ·
`accounts/{id}/transactions` · `createAccount` · `deposit` · `withdraw` · `transfer` ·
`billpay` · `requestLoan` · `initializeDB` · `cleanDB`. JSON via `Accept` header;
mutations use **query parameters** (§5.7). The client normalises nothing — it returns
status + raw body + parsed JSON when parseable, so tests can assert the quirks.

### 5.5 Reset bracket (DR-PB-06)

```
beforeEach mutating scenario:  POST initializeDB  → expect 204
   (read-only scenarios skip the bracket and are taggable @smoke, §5.9)
```

Implemented once (`src/api/reset.ts`), used by both lanes' hooks via tags: scenarios tagged
`@mutates` get the bracket automatically; a scenario without `@mutates` that fails a
seed-state precondition fails loudly, pointing at a missing tag.

### 5.6 Pinning the A5 loan decision

ParaBank's admin parameters control loan processing. The A5 hook sets, via the admin
surface (`POST /parabank/services/bank/setParameter/{name}/{value}`), the loan provider
and threshold values the feature file documents, making the approved and denied cases
deterministic. The exact parameter names/values are fixed during PB-P3 implementation from
the admin page's own options and recorded in the feature file + implementation log. If
determinism cannot be achieved, A5 falls back to asserting the *decision page renders a
valid outcome* and a backlog risk records the gap — that fallback requires owner sign-off
at the PB-P3 gate, not silent adoption.

### 5.7 API quirks policy (assert-as-observed)

The following are **the spec** for this SUT (probe F-05/F-07) and must be asserted as-is,
each with a comment linking here:

1. Mutations take query parameters, not JSON bodies.
2. Some success responses are plain text (e.g. transfer confirmation string).
3. Errors are plain text with unconventional codes: unknown account → **400**.
4. Seed data contains negative balances; no assertion may assume balance ≥ 0.
5. The framing in all public docs: these are *observed behaviours of a pinned demo app*,
   not endorsed API design.

### 5.8 Test-data policy

- Created entities (customers, accounts, payees, loans): ids/usernames **captured from
  responses**, never hardcoded; usernames generated unique per run (`pb-<runid>-<n>`).
- Seeded identities (`john`/`demo`, customer 12212, accounts 12345/12456/…): used
  **read-only** outside `@mutates` scenarios; inside `@mutates` scenarios the bracket
  guarantees their state.
- No test writes admin parameters except the A5 hook (§5.6), which restores defaults after.

### 5.9 Tag strategy

| Tag | Meaning |
|---|---|
| `@ui` / `@api` | Lane membership (feature-level) |
| `@mutates` | Scenario mutates SUT state → reset bracket runs |
| `@smoke` | **Store-safe** (side-effect-free) fast subset — read-only scenarios only; never combined with `@mutates` |
| `@soap` | Touches the SOAP surface |
| `@negative` | B4 shapes |

**Smoke set (fixed here, count = 3):** ① UI seeded login + account overview renders
(read-only A1 half); ② REST seeded login + accounts read (B1 subset); ③ SOAP `getAccount`
on a seeded account (B3 read half). The PB-P3 gate proves store-safety by running `@smoke`
then asserting seed state unchanged **without** an intervening reset. Changing the smoke
set or count is a design-doc amendment, not a drive-by edit (magento C-01 lesson).

### 5.10 Verify entry point & gates

From PB-P2 the project gate becomes:

```
npm run verify   =  typecheck (tsc --noEmit)
                  + lane B suite (and from PB-P3, lane A suite + report content check)
```

`docs/project-contract.md` names this; CI runs boot gate → `npm run verify`. The compose
boot + `gate.ps1` remain the SUT-readiness precondition, not part of `verify` itself.

---

## 6. Implementation Plan

Phases and their gates live in [`docs/backlog.md`](backlog.md) (PB-P2, PB-P3) — this
document does not duplicate them. Build order within PB-P2: shared client → reset bracket →
B2 → B1 → B4 → SOAP ability → B3. Within PB-P3: Serenity wiring → A3 (core journey, proves
the cross-check pattern) → A2 → A1 → A4 → A5 → report content verification.

### Risk register (design-time)

| Risk | Prob. | Impact | Mitigation |
|---|---|---|---|
| A5 loan decision not deterministic via setParameter | Med | Med | §5.6 fallback path with owner sign-off |
| Registration form validation differs from probe-era behaviour | Low | Low | A1 asserts observed validation; deviations → backlog risk |
| OpenAPI spec has schema gaps vs actual responses | Med | Low | FR-B1 records deviations as risks; assert-as-observed wins |
| Serenity/JS + Playwright version drift vs orangehrm reference | Low | Med | Pin versions in package.json at PB-P2/P3 time; note in implementation log |

---

## 7. Refactoring Strategy

N/A — greenfield. (The only inherited code is Phase-0 infrastructure, which is out of scope
for the lanes and changes only via its own PRs.)

---

## 8. Testing Strategy (for the test code itself)

- **Static:** `tsc --noEmit` in `verify`; cucumber dry-run/step-binding check per lane
  (undefined steps fail the gate).
- **Determinism:** the PB-P2 twice-in-a-row rule; CI re-runs on every PR.
- **Report integrity:** PB-P3's automated Serenity report content check (scenario names +
  counts present in the generated report artefact).
- Full detail: [`docs/qa-strategy.md`](qa-strategy.md).

---

## 9. Migration Path

N/A — no existing users or data. SUT lifecycle (build/boot/seed/reset) is Phase-0
infrastructure, unchanged by this design.

---

## 10. Alternatives Considered

1. **Serenity/JS for both lanes** — rejected: drags browser tooling into the API lane;
   calculator precedent shows a lean API lane reads better as a reference.
2. **Full SOAP client library (e.g. strong-soap)** — rejected (DR-PB-07): probe proved
   plain envelopes suffice for parity reads; a dependency tree for four scalar fields is
   bad economics. Revisit trigger recorded in the DR.
3. **Checked-in OpenAPI spec snapshot** — rejected: the SUT pin already pins the spec;
   fetching live prevents snapshot drift and asserts the SUT actually serves it (FR-B1).
4. **Parallel scenario execution** — rejected for v1: one shared datastore + reset bracket
   makes serial the only honest choice (calculator CAL-01 precedent). Revisit only with
   per-worker SUT containers.

---

## 11. Open Questions

None blocking.

### Resolved

- **Q1 Scope variant** — full A1–A5 + B1–B4. Resolved by owner, 2026-07-22 (recorded §1).
- **Q2 Licence** — MIT for this repository's own content. Resolved by owner, 2026-07-22
  (`LICENSE`, README §Licence).

---

## 12. Appendices

### References

1. Scoping plan: portfolio `portfolio-docs/PORTFOLIO_PARABANK_SCOPING_PLAN_2026-07-22.md`
2. Executed probe: portfolio `portfolio-docs/PORTFOLIO_PARABANK_DOCKER_PROBE_2026-07-22.md`
3. Delivery phases + gates: [`docs/backlog.md`](backlog.md)
4. Decisions: [`docs/decision-register.md`](decision-register.md)

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| v1.0 | 2026-07-22 | Claude (Fable 5) + owner decisions | Initial design for PB-P1; scope + licence fixed by owner |

## Approval

| Role | Name | Vehicle | Date |
|---|---|---|---|
| Owner | Gary Brooks | PR review + merge of [PR #2](https://github.com/GBrooks1970/parabank-bank-automation/pull/2) (`906a00d`) | 2026-07-22 |
