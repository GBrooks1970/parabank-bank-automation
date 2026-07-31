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
our build, DR-PB-01); unit-level checks in this repo apply only to our own non-trivial
helpers (e.g. the SOAP envelope builder) where cheap.

## 2. Test types

| Type | Where |
|---|---|
| Functional (behavioural) | All FR scenarios, both lanes |
| Contract conformance | FR-B1 against the live-fetched OpenAPI 3.0.1 spec |
| Negative / error handling | FR-B4 (+ the SOAP fault path, design doc §5.3) |
| Smoke (store-safe) | The fixed 3-scenario `@smoke` set (design doc §5.9) |
| Non-functional | Out of scope v1 (scoping plan); revisit post-P5 |

## 3. Test design techniques (ISTQB vocabulary, applied)

- **Equivalence partitioning + boundary value analysis** — transfer/deposit/bill-pay
  amounts follow the owner-approved DR-PB-09 partition set below. Boundaries are asserted
  per *observed* behaviour (design doc §5.7), including that overdrafts may be permitted.

  | Partition / boundary | Evidence state at v1.1 |
  |---|---|
  | Representative positive | Existing B2/A3/A4 evidence |
  | Exceeding available balance | Existing B4 evidence |
  | Non-numeric | Existing B4 evidence |
  | Zero | Required by PB-CODEX-04; not yet executable |
  | Minimum positive | Required by PB-CODEX-04; not yet executable |
  | Exact available balance | Required by PB-CODEX-04; not yet executable |

  PB-CODEX-04 must replace the three “not yet executable” entries with exact feature/scenario
  references and update deliberate scenario/report counts before it can close.
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

## 6. Defect management

Defects/oddities in the SUT are **not fixed** (pinned upstream demo): they are either
(a) asserted as observed behaviour with a comment citing the design doc §5.7, or
(b) recorded as a risk in `docs/backlog.md` §Outstanding Risks when they genuinely block a
requirement. Defects in our own test code are fixed before their phase gate ticks — a
flaky scenario is a defect, not an environment fact.

## 7. Reporting and evidence

- Lane A: Serenity living documentation, published as a CI artefact; content-verified in
  the gate (portfolio lesson: magento's empty-shell report).
- Lane B: cucumber-js formatter output in CI logs + non-zero exit as the gate.
- Every backlog gate tick carries evidence links (CI run, commit) per the backlog's
  maintenance notes.
