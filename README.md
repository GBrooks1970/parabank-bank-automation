# parabank-bank-automation

Test automation against **ParaBank** — Parasoft's open-source (Apache-2.0) Java/Spring
banking demo application — run as a local, Docker-backed, resettable system under test.

> **Status: delivery complete (PB-P0…PB-P5) and CODEX review-v1 remediation complete
> (PB-CODEX-01…10).** The delivered **API lane** contains 14 scenarios covering FR-B1
> operation-aware live-spec conformance, FR-B2 stateful flow, FR-B3 REST↔SOAP parity,
> and FR-B4 negative paths asserted as observed. The delivered **Serenity/JS + Playwright
> + Cucumber UI lane** contains 8 scenarios covering FR-A1 register/login, FR-A2 open
> account, FR-A3 transfer, FR-A4 bill pay, and deterministic approved/denied FR-A5 loans.
> The A2–A4 monetary state outcomes are cross-checked through the REST client; A1 and A5
> use their specified UI oracles. All 22 scenarios run behind `npm run verify`, alongside
> the store-safe `@smoke` proof and content-verified Serenity report. **The completed
> delivery gates, completed remediation evidence, and current outstanding risks live in
> [`docs/backlog.md`](docs/backlog.md)** — any agent picking this project up starts there.

## The system under test

| Fact | Value |
|---|---|
| Upstream | [`parasoft/parabank`](https://github.com/parasoft/parabank) (Apache-2.0) |
| Pinned commit | `d1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1` (see `scripts/build-sut.ps1`) |
| Pinned builder | Maven 3.9.16 / Temurin 17 by reviewed multi-platform digest |
| Pinned runtime | Tomcat 10.1.57 / Temurin JRE 21 by reviewed multi-platform digest |
| Runtime | Single container: Tomcat 10.1 / JRE 21, embedded HSQLDB (seeded explicitly via `initializeDB` — DR-PB-06) |
| App URL | http://localhost:8090/parabank/ |
| Surfaces | Web UI · REST (`/parabank/services/bank/*`, serves its own OpenAPI 3.0.1 spec) · SOAP (`/parabank/services/ParaBank`, `/parabank/services/LoanProcessor`) |
| Seeded identity | `john` / `demo` (customer 12212) |

Upstream is a demo app pinned at `5.0.0-SNAPSHOT`; upstream bumps are deliberate,
reviewed changes, never implicit (portfolio decision DR-PB-02). Builder/runtime tags and
digests live in [`config/container-image-pins.psd1`](config/container-image-pins.psd1) and
follow the [container image pin policy](docs/container-image-pin-policy.md).

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
Playwright Chromium + a Temurin JDK and `npm run verify` on Node 24 for the unit and E2E lanes.
The generated Serenity report is uploaded as the diagnostic `serenity-report` build artifact.
The same successful job builds and validates a deterministic public-evidence package on pull
requests. Only a successful `main` push uploads it for deployment; the dependent deploy job
alone receives `pages: write` and `id-token: write`. External actions are full-SHA pinned; see
the [GitHub Actions pin policy](docs/github-actions-pin-policy.md) for the reviewed versions,
permissions and refresh procedure.

## Public test evidence

The canonical Pages target is
[`https://gbrooks1970.github.io/parabank-bank-automation/`](https://gbrooks1970.github.io/parabank-bank-automation/).
It identifies the exact tested `main` commit and links to the content-verified Serenity report.
This is the latest successfully published static snapshot, not live CI health. The ParaBank
Docker SUT and its REST/SOAP APIs are **not hosted** on GitHub Pages.

With a Java-backed report already present, package and re-check it locally using the same full
commit ref:

```powershell
$sourceRef = git rev-parse HEAD
npm run prepare:pages -- --source-ref $sourceRef
npm run check:pages -- --source-ref $sourceRef
```

See [`docs/public-evidence.md`](docs/public-evidence.md) for the safety boundary, publication
ownership and recovery procedure.

## Documentation

- [`docs/design-document.md`](docs/design-document.md) — the approved design (scope,
  requirements FR-A1…A5 / FR-B1…B4, screenplay inventory, policies).
- [`docs/decision-register.md`](docs/decision-register.md) — DR-PB-01…10 with rationale.
- [`docs/qa-strategy.md`](docs/qa-strategy.md) — ISTQB levels, types, techniques, exit criteria.
- [`docs/naming-conventions.md`](docs/naming-conventions.md) — files, Gherkin, screenplay, git.
- [`docs/github-actions-pin-policy.md`](docs/github-actions-pin-policy.md) — immutable action
  pins, least-privilege policy, and the reviewed refresh procedure.
- [`docs/container-image-pin-policy.md`](docs/container-image-pin-policy.md) — immutable
  builder/runtime digests, drift enforcement, and the reviewed refresh procedure.
- [`docs/public-evidence.md`](docs/public-evidence.md) — Pages snapshot semantics, local
  packaging, public-data safety, ownership and recovery.
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
