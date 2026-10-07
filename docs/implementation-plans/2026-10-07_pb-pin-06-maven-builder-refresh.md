---
version: 1
created: 2026-10-07T08:03Z
project: parabank-bank-automation
type: implementation-plan
item: PB-PIN-06
status: implemented
approved: 2026-10-07, Gary Brooks (owner approval given in the session); PR to be opened, not merged, by the implementing agent; merge is the owner's
delivered: PR #49, squash commit 25c83b8, merged 2026-10-07T08:19:50Z by the owner
language: en-GB
---

# Implementation plan: PB-PIN-06 Refresh the stale MavenBuilder container image pin

**Goal.** Refresh the `MavenBuilder` digest in `config/container-image-pins.psd1` to the multi-platform index the exact tag `maven:3.9.16-eclipse-temurin-17-noble` now resolves to, so the `pin-drift` lane (DR-PB-11) is green again. This serves DR-PB-10 (reviewed, immutable execution inputs) and closes issue #47.

## Evidence gathered before planning

Read-only review on 2026-10-07 using `docker buildx imagetools inspect` against the registry. Nothing in the repository was changed.

| Finding | Consequence for the plan |
|---|---|
| The tag `maven:3.9.16-eclipse-temurin-17-noble`, image version `3.9.16-eclipse-temurin-17-noble` and `carlossg/docker-maven` revision `1efa2614402e9645749d6e235c93ada60762b267` are unchanged on all six Linux platforms (amd64, arm/v7, arm64/v8, ppc64le, riscv64, s390x). | Same class as PB-PIN-05: a base-image rebuild only. No change of tag is warranted. |
| The multi-platform index digest changed from `sha256:880934ae394bf91bc3e57d573e4fc04774f064f3c4df7ccd7cc10b3b126737bf` (recorded) to `sha256:1a352420f7aba21f5ad08df31bab55f74c013fb491f1ae8ab1dd7ff9ed698584`. | The recorded pin is stale; the new index is the candidate. |
| Only the base image `eclipse-temurin:17-jdk-noble` digest moved, on every platform (amd64 `fb9701fe...` to `1975bbe4...`). | Provenance review confirms rebuild-only. Temurin base contents and CVEs are not reviewed; provenance review is what the policy requires. |
| Issue #47 (opened 2026-09-21) names an older candidate (`42a3ac39...`); the registry has moved on. The riscv64 manifest was rebuilt as recently as 2026-10-01. | Re-resolve at implementation time and again immediately before opening the PR; stop if the digest changes after validation. |
| The `ParaBankRuntime` pin, the Tomcat digest and the pinned ParaBank source (`d1bf006`) are not affected. | Out of scope; must not change. |

## Steps

1. Branch `chore/pb-pin-06-maven-builder-refresh` from current `main`; preserve each file's line endings.
2. Re-resolve the tag and the old digest; record version, source revision, base-image digest and created date for all six platforms, old and new. Stop if version or revision changed or the tag does not resolve.
3. Commit this plan and `docs/implementation-plans/_index.md` on their own, before touching the pin.
4. Edit `config/container-image-pins.psd1`: replace only the `MavenBuilder` `Digest`; keep the tag; set the review-date comment to 2026-10-07 (previously 2026-09-14, 2026-09-01 and 2026-08-01); keep the base-image-rebuild-only note with revision and version re-confirmed.
5. Edit `docs/container-image-pin-policy.md`: the "Current reviewed pins" table row and provenance text for the Maven builder, the dated sentence on when the Maven digest was resolved, and the refresh-history paragraph (add PB-PIN-06). The ParaBank runtime row is unchanged.
6. `pwsh ./scripts/build-sut.ps1 -ValidateImagePinsOnly` must report both pins current (exit 0).
7. `pwsh ./scripts/build-sut.ps1`; confirm it names both complete `tag@sha256` references and that BuildKit loads `Dockerfile.pinned` from the reviewed Tomcat digest.
8. Run the five-command contract from `docs/project-contract.md` in order: `pwsh ./scripts/build-sut.ps1`, `docker compose up -d`, `pwsh ./scripts/gate.ps1`, `npm run verify`, `docker compose down`. `docker compose down` runs even if verify fails. Restore any tracked file `npm run verify` modifies that is not part of this change.
9. Re-resolve the tag once more before opening the PR; stop if the digest differs from the pinned one.
10. Two commits (plan; then pin plus policy), push, open a PR against `main` that closes #47. Do not merge and do not enable auto-merge.

## Verification

- `-ValidateImagePinsOnly` exits 0 with both pins current. Before the change it must report the Maven pin stale (the failing case, observed on the unmodified `main` by the pin-drift lane and re-confirmed in step 2).
- The real SUT build names both `tag@sha256` references and loads `Dockerfile.pinned` from the reviewed Tomcat digest.
- The five-command contract passes with teardown (PB-PIN-05 baseline: 36 unit tests, 3 smoke-safety scenarios, 14 API, 8 UI, 5/5 contract).
- `git diff` shows only the Maven digest and its comment, the policy text, and the plan files.

## Delivery

Branch `chore/pb-pin-06-maven-builder-refresh`; one PR against `main` containing two commits. The PR is opened, not merged; the owner merges. After merge, a separate PR adds the implementation log and appends this plan's Outcome section. No other repositories are involved.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| Refresh the Maven builder pin to the currently resolved index, keeping the exact tag | Refresh now; wait for upstream to settle; change tag | Refresh now (version and revision unchanged, rebuild only) | Approved, 2026-10-07 |
| Provenance depth | Index and platform annotations only; also review Temurin base contents and CVEs | Annotations only, as the policy requires; state that base contents and CVEs were not reviewed | Approved, 2026-10-07 |

## Outcome

Delivered as planned. PR [#49](https://github.com/GBrooks1970/parabank-bank-automation/pull/49) (two commits: `33fbef9` the plan, `45ff590` the pin and policy)
was merged by the owner as `25c83b8` on 2026-10-07 at 08:19:50Z and closed issue #47. The log is
[`docs/implementation-logs/2026-10-07_pb-pin-06-maven-builder-refresh.md`](../implementation-logs/2026-10-07_pb-pin-06-maven-builder-refresh.md).

- **Digest:** `MavenBuilder` moved from `sha256:880934ae…126737bf` to `sha256:1a352420…ed698584`; the tag and the `ParaBankRuntime` pin are unchanged. The digest was identical on re-resolution at the start, after validation and after the PR was opened.
- **Verification, as planned:** `-ValidateImagePinsOnly` was exit 1 on the unmodified pin and exit 0 after the change (and exit 0 again on `main` at `25c83b8`); the real build named both `tag@sha256` references and loaded `Dockerfile.pinned` from the reviewed Tomcat digest; the five-command contract passed with teardown (36 unit, 3 smoke-safety, 14 API, 8 UI, 4/4 boot probes). PR CI run `37592342888`, post-merge `ci` run `37593043391` and a dispatched `pin-drift` run `37593996309` all succeeded.
- **Differences from the plan:**
  - All six Linux platforms had been rebuilt, including `s390x`; the plan's evidence table said only that the base digest moved on every platform, so this is a clarification, not a change.
  - `docs/templates/implementation-plan.template.md` was added to the project (the convention's first-use copy); the plan's step list did not name it.
  - Nightly `perf` was not dispatched; it will pick up the new digest on its schedule.
- **Not reviewed, as stated in the plan:** Temurin base contents and CVEs.
