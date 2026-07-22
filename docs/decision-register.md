<!--
  AUDIENCE: Engineers and AI agents working on this project.
  PURPOSE:  In-repo register of structural decisions (DR-PB-xx). DR-PB-01..05 originate in
            the portfolio scoping plan and are restated here so the repo stands alone;
            DR-PB-06/07 were added by the PB-P1 design document.
  LOCATION: docs/decision-register.md
-->

# parabank-bank-automation — Decision Register

| DR | Decision | Rationale / evidence | Status |
|---|---|---|---|
| DR-PB-01 | **Two-step containerised SUT build**: WAR via `maven:3.9-eclipse-temurin-17` with upstream tests skipped, then the upstream Dockerfile; the WAR rename (`parabank-5.0.0-SNAPSHOT.war` → `parabank.war`) runs **inside** the Maven container. | Probe F-01/F-02; upstream test suite needs exclusive ports; Linux CI writes `target/` as root (Phase-0 finding, run 29918234946 → fixed `fcd96a7`). | Adopted (Phase 0) |
| DR-PB-02 | **Upstream pinned** to `parasoft/parabank@d1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1`; bumps are deliberate, reviewed PRs. | Upstream is a moving `5.0.0-SNAPSHOT` master with no release tags (probe F-07); magento R-06b pin-and-promote precedent. | Adopted (Phase 0) |
| DR-PB-03 | **Reset via the app, not via data machinery**: `POST /parabank/services/bank/initializeDB` for reset; container recreate for pristine; **no** OrangeHRM-style snapshot/seed apparatus. | Probe F-06: initializeDB is a deterministic 204 reset; HSQLDB lives in the container layer. | Adopted (Phase 0) |
| DR-PB-04 | **Only Tomcat 8080 is mapped** (host 8090); HSQLDB 9001 and ActiveMQ 61616 stay unmapped. | No lane needs them; avoids the upstream-documented HSQLDB port-clash class. | Adopted (Phase 0) |
| DR-PB-05 | **CI runs the same scripts as local** (`build-sut.ps1`, `gate.ps1` under pwsh) on ubuntu runners; boot gate precedes all test lanes. | One code path for both environments; proven green (run 29918600202). | Adopted (Phase 0) |
| DR-PB-06 | **Boot → seed → use**: a fresh container is NOT assumed seeded; every environment bring-up calls `initializeDB` before touching seeded identities, and `@mutates` scenarios are reset-bracketed. | Phase-0 verification: fresh container booted unseeded (`john/demo` login failed until initializeDB). Refines probe F-03/F-06. | Adopted (PB-P1) |
| DR-PB-07 | **Lightweight SOAP Ability**: hand-built document-literal XML envelopes over `fetch`, namespace-qualified params, minimal text extraction for response fields; no SOAP client library. | Probe F-04: plain envelopes worked first try; parity checks read four scalar fields. **Revisit trigger:** if SOAP usage grows beyond `getAccount`-class reads or needs complex types, re-evaluate a real client. | Adopted (PB-P1) |

**Amendment rule:** decisions change only via a PR that updates this register and the
design document together, with the owner's merge as sign-off.
