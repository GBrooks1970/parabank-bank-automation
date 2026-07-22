# parabank-bank-automation

Test automation against **ParaBank** — Parasoft's open-source (Apache-2.0) Java/Spring
banking demo application — run as a local, Docker-backed, resettable system under test.

> **Status: Phases 0–1 complete — infrastructure + approved design, no test code yet.**
> The SUT scaffold and CI boot gate are green (Phase 0), and the design is fixed and
> owner-approved (Phase 1): full scope — five UI journeys (A1–A5, Serenity/JS +
> Playwright + Cucumber) and four API scenario shapes (B1–B4, including REST↔SOAP
> parity) — see [`docs/design-document.md`](docs/design-document.md) and
> [`docs/decision-register.md`](docs/decision-register.md). Test code arrives with
> Phase 2 (API lane). **The delivery plan, current phase, and the acceptance criteria
> gating each phase live in [`docs/backlog.md`](docs/backlog.md)** — any agent picking
> this project up starts there.

## The system under test

| Fact | Value |
|---|---|
| Upstream | [`parasoft/parabank`](https://github.com/parasoft/parabank) (Apache-2.0) |
| Pinned commit | `d1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1` (see `scripts/build-sut.ps1`) |
| Runtime | Single container: Tomcat 10.1 / JRE 21, embedded HSQLDB (self-seeding) |
| App URL | http://localhost:8090/parabank/ |
| Surfaces | Web UI · REST (`/parabank/services/bank/*`, serves its own OpenAPI 3.0.1 spec) · SOAP (`/parabank/services/ParaBank`, `/parabank/services/LoanProcessor`) |
| Seeded identity | `john` / `demo` (customer 12212) |

Upstream is a demo app pinned at `5.0.0-SNAPSHOT`; upstream bumps are deliberate,
reviewed changes, never implicit (portfolio decision DR-PB-02).

## Quickstart

Requires Docker (Desktop on Windows) and PowerShell 7+ (`pwsh`); no Java/Maven needed —
the WAR is built inside a Maven container.

```bash
pwsh ./scripts/build-sut.ps1    # fetch pinned upstream, build WAR + image (~4 min cold)
docker compose up -d            # boot (~18 s)
pwsh ./scripts/gate.ps1         # verify UI/REST + OpenAPI + SOAP + reset
```

### Seeding and resetting state (important)

- **Always seed after boot:** a fresh container does not reliably self-seed. `gate.ps1`
  does it for you; manually it is
  `POST http://localhost:8090/parabank/services/bank/initializeDB` → **204** — the same
  call is also the deterministic in-place reset back to the built-in seed data.
- A container **restart is not a reset** — HSQLDB persists inside the container
  (`WEB-INF/db/`). For a pristine environment: `docker compose down && docker compose up -d`
  and seed again.

## CI

`.github/workflows/ci.yml` runs the same two scripts on every push/PR: build the image
from the pinned commit, boot it, and pass the four-point gate (`initializeDB` seed → 204,
REST login as seeded customer 12212, OpenAPI spec served, WSDL served).

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
