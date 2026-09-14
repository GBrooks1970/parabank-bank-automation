# Container image pin policy

DR-PB-10 treats the Maven builder and ParaBank runtime base as immutable execution
inputs. Their single tracked source is `config/container-image-pins.psd1`: every entry
must contain a readable exact version tag and a reviewed `sha256` multi-platform index
digest.

## Current reviewed pins

`config/container-image-pins.psd1` is the single source of truth; this table is a derived
record of it and **must be updated in the same PR as any refresh**. The Maven builder digest
was resolved and reviewed on 2026-09-14 (PB-PIN-05); the unchanged ParaBank runtime digest
was resolved and reviewed on 2026-09-01 (PB-PIN-01):

| Purpose | Exact tag | Multi-platform index digest | Reviewed provenance |
|---|---|---|---|
| Maven builder | `maven:3.9.16-eclipse-temurin-17-noble` | `sha256:880934ae394bf91bc3e57d573e4fc04774f064f3c4df7ccd7cc10b3b126737bf` | Docker Official Maven image; all six Linux platform descriptors retain version `3.9.16-eclipse-temurin-17-noble` and `carlossg/docker-maven` revision `1efa2614402e9645749d6e235c93ada60762b267`, over `eclipse-temurin:17-jdk-noble`. Five platform manifests were rebuilt on 2026-09-09 with new base digests; `linux/s390x` is unchanged. |
| ParaBank runtime | `tomcat:10.1.57-jre21-temurin-noble` | `sha256:0d187897e49c9ef3f642f52d19db7f4eab20657f4ab086e680481e10eb69d3fa` | Docker Official Tomcat image; matches the `FROM` tag in `parasoft/parabank@d1bf006` and reports `docker-library/tomcat` revision `1609469c3fc33e26ee9b86820047588fb687220c`, over `eclipse-temurin:21-jre-noble`. |

**Refresh history.** The pins were first reviewed on 2026-08-01 under PB-CODEX-06
(`sha256:1ed5d1f5…`, `sha256:f6e69a64…`), refreshed once thereafter, and refreshed again on
2026-09-01 under PB-PIN-01 after upstream republished both exact tags with rebuilt
`eclipse-temurin`/noble bases. The intervening refresh updated the pin file without updating
this table, which is why the table now states its derived status explicitly. PB-PIN-05 refreshes
only the Maven builder after its scheduled drift signal on 2026-09-14; the exact Maven tag,
source revision, image version and Java version remain unchanged.

The local output image `parabank:d1bf006` is not an external input; it names the product
of the reviewed source, builder, and runtime pins for local Compose lifecycle commands.

## Enforcement, and where drift is detected

Two different things are enforced in two different places (DR-PB-11). Keeping them apart is
deliberate: one is a correctness requirement, the other is a maintenance signal.

**Fatal in the build.** `scripts/build-sut.ps1` fails before packaging when the pin file or a
required tag/digest is absent or malformed, and when the pinned upstream Dockerfile's `FROM`
tag disagrees with the reviewed runtime tag. Both mean the build would otherwise consume an
unreviewed input.

**Not fatal in the build: registry drift.** The build always consumes the reviewed
`tag@sha256` references, so an upstream rebuild of an exact tag cannot change what is built.
Drift means only that the recorded digest is due a deliberate refresh. `build-sut.ps1`
therefore resolves every tag, reports **every** drifted pin as a warning (plus a
`::warning` annotation and a step-summary entry under GitHub Actions), and continues from the
reviewed digests.

**Fatal in the pin-drift lane.** `.github/workflows/pin-drift.yml` runs
`-ValidateImagePinsOnly` weekly and on dispatch. There, drift *is* the failure: the job writes
a report, raises or updates a `Container image pin drift` issue, and fails. It never runs on
`pull_request`, because it reports on the state of the registry rather than on a change.

This split exists because the earlier inline hard failure turned an expected upstream rebuild
into an outage: PB-PIN-01 records 14 consecutive nightly `perf` failures with the required
`ci` lane latently broken behind them, for a drift that never affected reproducibility.

After checking out the pinned ParaBank source, the script also compares its Dockerfile
`FROM` tag with the reviewed runtime tag. It then generates the ignored
`target-app/parabank/Dockerfile.pinned`, preserving the pinned upstream instructions while
replacing `FROM` with `tag@sha256:digest`. `docker-compose.yml` builds only that generated
Dockerfile. This makes an upstream runtime-tag change fail as stale instead of silently
changing the image or bypassing the digest.

Use the non-building validation entry point when reviewing pins. It checks every pin and
reports all of them, so a stale-pin report is complete rather than stopping at the first
mismatch:

```powershell
pwsh ./scripts/build-sut.ps1 -ValidateImagePinsOnly
```

Add `-DriftReportPath <file>` to also write the Markdown drift report the `pin-drift`
workflow uses as its issue body.

## Review and refresh procedure

Container refreshes are deliberate reviewed changes:

1. Select an exact stable Docker Official Image tag. Read the upstream image change and
   base-image provenance; do not replace an exact tag with a floating family tag.
2. Resolve the multi-platform index and inspect its platform manifests:

   ```powershell
   docker buildx imagetools inspect maven:3.9.16-eclipse-temurin-17-noble
   docker buildx imagetools inspect tomcat:10.1.57-jre21-temurin-noble
   ```

   Record the top-level `Digest`, not a host-specific child manifest.
3. For the runtime pin, verify that the selected tag is exactly the `FROM` image in the
   reviewed pinned ParaBank source. An upstream source-pin change and its runtime-image
   review belong in the same deliberate PR when they are coupled.
4. Update `config/container-image-pins.psd1`, retaining the readable tags and review date
   comments, and update the "Current reviewed pins" table above in the same PR. Run
   `-ValidateImagePinsOnly`; it must resolve both tags to the recorded digests.
5. Run `pwsh ./scripts/build-sut.ps1` and confirm its output names both complete
   `tag@sha256` references and BuildKit loads `Dockerfile.pinned` from the reviewed Tomcat
   digest.
6. Run the complete five-command contract in `docs/project-contract.md` and require PR CI
   to pass with teardown.
7. Record the old/new tags, digests, provenance, validation, and any exception in the PR
   and a new immutable implementation log.

Scheduled pin *detection* is now in scope (`pin-drift`, DR-PB-11): it may raise an issue
naming a candidate digest. Scheduled pin *automation* remains outside the approved cycle — no
job may open a refresh PR or edit the pin file. Every refresh still passes provenance review,
drift validation, the full gate, and owner merge.
