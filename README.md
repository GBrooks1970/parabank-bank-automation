# parabank-bank-automation

Test automation against **ParaBank** — Parasoft's open-source (Apache-2.0) Java/Spring
banking demo application — run as a local, Docker-backed, resettable system under test.

> **Status: build complete (Phases 0–4) — both test lanes implemented; registration in progress (PB-P5).**
> The SUT scaffold and CI boot gate are green (Phase 0); the design is owner-approved
> (Phase 1, [`docs/design-document.md`](docs/design-document.md)); the **API lane**
> (Phase 2) is 14 scenarios — FR-B1 operation-aware live-spec contract conformance, FR-B2 stateful
> multi-step flow, FR-B3 REST↔SOAP parity, FR-B4 negative paths asserted as observed;
> and the **Serenity/JS + Playwright + Cucumber UI lane** (Phase 3) is 8 scenarios —
> FR-A1 register/login, FR-A2 open account, FR-A3 transfer, FR-A4 bill pay, FR-A5 loan
> (approved & denied, pinned deterministic), each cross-checked through the REST client,
> with a store-safe `@smoke` subset and a content-verified Serenity report. All green
> behind `npm run verify`. **The delivery plan, current phase, and the acceptance
> criteria gating each phase live in [`docs/backlog.md`](docs/backlog.md)** — any agent
> picking this project up starts there.

## The system under test

| Fact | Value |
|---|---|
| Upstream | [`parasoft/parabank`](https://github.com/parasoft/parabank) (Apache-2.0) |
| Pinned commit | `d1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1` (see `scripts/build-sut.ps1`) |
| Runtime | Single container: Tomcat 10.1 / JRE 21, embedded HSQLDB (seeded explicitly via `initializeDB` — DR-PB-06) |
| App URL | http://localhost:8090/parabank/ |
| Surfaces | Web UI · REST (`/parabank/services/bank/*`, serves its own OpenAPI 3.0.1 spec) · SOAP (`/parabank/services/ParaBank`, `/parabank/services/LoanProcessor`) |
| Seeded identity | `john` / `demo` (customer 12212) |

Upstream is a demo app pinned at `5.0.0-SNAPSHOT`; upstream bumps are deliberate,
reviewed changes, never implicit (portfolio decision DR-PB-02).

## Quickstart

Requires Docker (Desktop on Windows) and PowerShell 7+ (`pwsh`); no Java/Maven needed to
build the SUT — the WAR is built inside a Maven container.

```bash
pwsh ./scripts/build-sut.ps1        # fetch pinned upstream, build WAR + image (~4 min cold)
docker compose up -d                # boot (~18 s)
pwsh ./scripts/gate.ps1             # verify UI/REST + OpenAPI + SOAP + reset
npm ci                              # test toolchain (Node >= 20)
npx playwright install chromium     # browser for the UI lane
npm run verify                      # fast unit lane + both E2E lanes + report checks
```

`npm run verify` = typecheck → SUT-independent framework unit tests → tag lint → `@smoke`
store-safety proof → API lane (14 scenarios) → UI lane (8 scenarios) → Serenity report
generation → report content check. The Serenity **HTML** report needs a JDK; without one the report step is a no-op
locally and the JSON artefacts are still content-verified (CI installs the JDK and
enforces the HTML).

Useful subsets: `npx cucumber-js --profile api --tags "@smoke"` /
`--profile ui --tags "@smoke"` (store-safe read-only), `--profile api --tags "@negative"`
(FR-B4 observed error contract), `--profile ui` (UI journeys only).

### Seeding and resetting state (important)

- **Always seed after boot:** a fresh container does not reliably self-seed. `gate.ps1`
  does it for you; manually it is
  `POST http://localhost:8090/parabank/services/bank/initializeDB` → **204** — the same
  call is also the deterministic in-place reset back to the built-in seed data.
- A container **restart is not a reset** — HSQLDB persists inside the container
  (`WEB-INF/db/`). For a pristine environment: `docker compose down && docker compose up -d`
  and seed again.

## CI

`.github/workflows/ci.yml` runs the same steps as local on every push/PR: build the image
from the pinned commit, boot it, pass the four-point boot gate (`initializeDB` seed → 204,
REST login as seeded customer 12212, OpenAPI spec served, WSDL served), then `npm ci` +
Playwright Chromium + a Temurin JDK and `npm run verify` on Node 24 for the unit and E2E lanes. The
generated Serenity report is uploaded as the `serenity-report` build artifact. External
actions are full-SHA pinned and the workflow token is limited to `contents: read`; see the
[GitHub Actions pin policy](docs/github-actions-pin-policy.md) for the reviewed versions and
refresh procedure.

## Documentation

- [`docs/design-document.md`](docs/design-document.md) — the approved design (scope,
  requirements FR-A1…A5 / FR-B1…B4, screenplay inventory, policies).
- [`docs/decision-register.md`](docs/decision-register.md) — DR-PB-01…07 with rationale.
- [`docs/qa-strategy.md`](docs/qa-strategy.md) — ISTQB levels, types, techniques, exit criteria.
- [`docs/naming-conventions.md`](docs/naming-conventions.md) — files, Gherkin, screenplay, git.
- [`docs/github-actions-pin-policy.md`](docs/github-actions-pin-policy.md) — immutable action
  pins, least-privilege policy, and the reviewed refresh procedure.
- [`docs/backlog.md`](docs/backlog.md) — phased delivery plan, gate status, and open risks
  (**start here to resume the project**).
- [`docs/implementation-logs/`](docs/implementation-logs/) — append-only build history
  (what was built, decided, broke, learned).

## Provenance

- Candidate selection: portfolio `portfolio-docs/PORTFOLIO_CANDIDATE_PROJECTS_RESEARCH_2026-07-20.md`
- Executed feasibility probe (findings F-01…F-07 cited in the scripts):
  `portfolio-docs/PORTFOLIO_PARABANK_DOCKER_PROBE_2026-07-22.md`
- Scoping plan and phase gates: `portfolio-docs/PORTFOLIO_PARABANK_SCOPING_PLAN_2026-07-22.md`

## Licence

This repository's own content is **MIT-licensed** (see [`LICENSE`](LICENSE); owner
decision 2026-07-22, recorded in the design document §11). The upstream ParaBank
application is Apache-2.0 (Parasoft) and is never committed here — `scripts/build-sut.ps1`
fetches it at build time at the pinned commit; the Apache-2.0 licence travels with that
checkout (`target-app/`, gitignored) and the built image.
