<!--
  AUDIENCE: Engineers and AI agents implementing/reviewing the test lanes.
  PURPOSE:  ISTQB-aligned QA strategy: levels, types, techniques, environments, and
            entry/exit criteria for this project's two lanes.
  LOCATION: docs/qa-strategy.md
  TEMPLATE: portfolio templates/qa-strategy.template.md (trimmed to this project).
-->

# parabank-bank-automation — QA Strategy

## 1. Test object and levels

The test object is the **pinned ParaBank SUT** (`d1bf0068…`, single container, one
datastore behind UI + REST + SOAP). We operate at two ISTQB levels:

- **System testing** — Lane A UI journeys (FR-A1…A5) and Lane B API scenarios (FR-B1…B4)
  each exercise the SUT as a whole through one interface.
- **System integration testing (intra-SUT)** — the cross-surface assertions: Lane A
  verifying UI outcomes through the REST client, and FR-B3's REST↔SOAP parity, both prove
  the surfaces agree on shared state.

Unit/component testing of the SUT itself is upstream's business (deliberately skipped in
our build, DR-PB-01). The fast local unit lane targets only this repository's non-trivial
framework helpers and does not require a running SUT.

## 2. Test types

| Type | Where |
|---|---|
| Functional (behavioural) | All FR scenarios, both lanes |
| Contract conformance | FR-B1 binds all 14 approved client methods to live method/path/status-or-default/media/schema definitions and emits exercised/excluded coverage |
| Framework unit | SOAP envelope/parsing, OpenAPI operation/deviation selection, inherited Cucumber tags, Serenity JSON integrity |
| Negative / error handling | FR-B4 (+ the SOAP fault path, design doc §5.3) |
| Smoke (store-safe) | The fixed 3-scenario `@smoke` set (design doc §5.9) |
| Non-functional | Out of scope v1 (scoping plan); revisit post-P5 |

## 3. Test design techniques (ISTQB vocabulary, applied)

- **Equivalence partitioning + boundary value analysis** — transfer/deposit/bill-pay
  amounts follow the owner-approved DR-PB-09 partition set below. Boundaries are asserted
  per *observed* behaviour (design doc §5.7), including that overdrafts may be permitted.

  | Partition / boundary | Executable evidence at v1.4 |
  |---|---|
  | Representative positive | `b2-stateful-flow.feature` — end-to-end `$500` deposit / `$200` transfer; A3/A4 UI journeys |
  | Exceeding available balance | `b4-negative-paths.feature` — `Transferring more than the available balance succeeds and overdraws the account` |
  | Non-numeric | `b4-negative-paths.feature` — `A non-numeric transfer amount is a 404 with an empty body` |
  | Zero | `b2-stateful-flow.feature` outline example `zero` — HTTP 200, `$0` confirmation, no balance movement |
  | Minimum positive | Same outline example `minimum-positive` — `$0.01` debited/credited |
  | Exact available balance | Same outline example `exact-available` — amount captured from reset state, source becomes exactly zero |

  The outline deliberately expands the API lane from 11 to 14 scenarios. It adds no UI
  scenario, so the Serenity report-integrity guard correctly remains fixed at 8 UI scenarios.
- **State transition testing** — FR-B2's account lifecycle (created → funded → debited)
  with assertions at each transition, ids carried forward from responses.
- **Decision table (lightweight)** — FR-A5 loan outcomes across the pinned parameter set
  (approved vs denied inputs, design doc §5.6).
- **Use-case testing** — Lane A journeys mirror real user goals end to end.

## 4. Environments

| Environment | Bring-up | Use |
|---|---|---|
| Local (Windows/other) | `build-sut.ps1` → `compose up -d` → `gate.ps1` (seeds per DR-PB-06) | Development + the twice-in-a-row determinism proof |
| CI (ubuntu) | Same scripts, same order, in `ci.yml` | Every push/PR; lanes run only after the boot gate |

One SUT instance per environment; scenarios run **serially** (design doc §4 constraint);
`@mutates` scenarios are reset-bracketed; `@smoke` runs against untouched seed state.

## 5. Entry and exit criteria

Phase gates in [`docs/backlog.md`](backlog.md) are the authoritative exit criteria
(PB-P2/PB-P3 acceptance lists). Summarised:

- **Entry to implementation:** this strategy + the design document merged by the owner.
- **Exit PB-P2:** all B-shapes green; suite deterministic (2× consecutive local, CI
  green); single `npm run verify` entry point.
- **Exit PB-P3:** all A-journeys green; `@smoke` proven side-effect-free; Serenity report
  generated **and content-verified automatically** (scenario names + counts present) — a
  generated-but-empty report is a gate failure, not a warning.
- **Exit PB-CODEX-03:** the TypeScript unit command runs before E2E in `npm run verify`,
  covers the four approved helper areas without a live SUT, and the full project contract
  plus PR/default-branch CI pass.

## 6. Defect management

Defects/oddities in the SUT are **not fixed** (pinned upstream demo): they are either
(a) asserted as observed behaviour with a comment citing the design doc §5.7, or
(b) recorded as a risk in `docs/backlog.md` §Outstanding Risks when they genuinely block a
requirement. Defects in our own test code are fixed before their phase gate ticks — a
flaky scenario is a defect, not an environment fact.

## 7. Reporting and evidence

- Lane A: Serenity living documentation, published as a CI artefact; content-verified in
  the gate (portfolio lesson: magento's empty-shell report).
- Lane B: cucumber-js formatter output in CI logs + non-zero exit as the gate; FR-B1
  prints the 14/14 exercised matrix, intentionally excluded live operations, and any named
  PBR allowances actually applied.
- Framework unit lane: Node TAP output in local/CI logs, with no Docker or ParaBank
  precondition when run directly as `npm run test:unit`.
- Every backlog gate tick carries evidence links (CI run, commit) per the backlog's
  maintenance notes.
