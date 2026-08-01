<!--
  AUDIENCE: Engineers and AI agents working on this project.
  PURPOSE:  In-repo register of structural decisions (DR-PB-xx). DR-PB-01..05 originate in
            the portfolio scoping plan and are restated here so the repo stands alone;
            DR-PB-06/07 were added by the PB-P1 design document; DR-PB-08..10 record the
            owner-selected CODEX review-remediation choices.
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
| DR-PB-08 | **Comprehensive FR-B1 operation coverage**: bind every public `ParaBankRestClient` method to the full operation matrix in design §5.4. Thirteen methods resolve live-spec operations; `openapi()` is the documented bootstrap exception because the served document does not list its own route. Non-client live-spec paths and exhaustive error permutations remain excluded. | CODEX review v1 Risk #1 found that four read checks did not support the existing “in-scope client surface” claim. Owner selected Option A on 2026-07-31. The explicit matrix preserves full-surface credibility without adding product scope. | Adopted (PB-CODEX-02) |
| DR-PB-09 | **Executable amount boundaries**: zero, minimum-positive, and exact-available-balance cases are required additions; the QA claim will not be narrowed. | CODEX review v1 Risk #3 found these named boundary partitions absent. Owner selected Option A on 2026-07-31; deterministic seed/reset makes the evidence proportionate. | Adopted (PB-CODEX-04) |
| DR-PB-10 | **End-to-end immutable execution inputs**: “pinned SUT” includes the source commit, full-SHA GitHub Actions, the Maven builder digest, and relevant runtime base-image digests, with readable version annotations and a deliberate refresh procedure. | CODEX review v1 Risk #4 found source reproducibility but mutable CI/build inputs. Owner selected Option A on 2026-07-31 for defensible reproducibility and supply-chain hardening. | Approved; PB-CODEX-05 adopted, PB-CODEX-06 implementation in progress |

**Amendment rule:** decisions change only via a PR that updates this register and the
design document together, with the owner's merge as sign-off.
