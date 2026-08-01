# Container image pin policy

DR-PB-10 treats the Maven builder and ParaBank runtime base as immutable execution
inputs. Their single tracked source is `config/container-image-pins.psd1`: every entry
must contain a readable exact version tag and a reviewed `sha256` multi-platform index
digest.

## Current reviewed pins

The following Docker Official Images were resolved and reviewed on 2026-08-01:

| Purpose | Exact tag | Multi-platform index digest | Reviewed provenance |
|---|---|---|---|
| Maven builder | `maven:3.9.16-eclipse-temurin-17-noble` | `sha256:1ed5d1f54416b706707b4f3238f63a20bb06aab27c6d240090a2bb9ad895ed45` | Docker Official Maven image; manifest reports Maven 3.9.16 and `carlossg/docker-maven` revision `1efa2614402e9645749d6e235c93ada60762b267`. |
| ParaBank runtime | `tomcat:10.1.57-jre21-temurin-noble` | `sha256:f6e69a64d90e3b71b22e77fdfa87b3df9fa86be393cd01912e9bf34d0076b335` | Docker Official Tomcat image; matches the `FROM` tag in `parasoft/parabank@d1bf006` and reports `docker-library/tomcat` revision `1609469c3fc33e26ee9b86820047588fb687220c`. |

The local output image `parabank:d1bf006` is not an external input; it names the product
of the reviewed source, builder, and runtime pins for local Compose lifecycle commands.

## Enforcement in the build

`scripts/build-sut.ps1` fails before packaging when the pin file or a required tag/digest
is absent or malformed. It resolves each exact tag through Docker Buildx and compares the
registry's current index digest with the reviewed value; a mismatch reports both values and
requires a deliberate refresh.

After checking out the pinned ParaBank source, the script also compares its Dockerfile
`FROM` tag with the reviewed runtime tag. It then generates the ignored
`target-app/parabank/Dockerfile.pinned`, preserving the pinned upstream instructions while
replacing `FROM` with `tag@sha256:digest`. `docker-compose.yml` builds only that generated
Dockerfile. This makes an upstream runtime-tag change fail as stale instead of silently
changing the image or bypassing the digest.

Use the non-building validation entry point when reviewing pins:

```powershell
pwsh ./scripts/build-sut.ps1 -ValidateImagePinsOnly
```

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
4. Update only `config/container-image-pins.psd1`, retaining the readable tags and review
   date comments. Run `-ValidateImagePinsOnly`; it must resolve both tags to the recorded
   digests.
5. Run `pwsh ./scripts/build-sut.ps1` and confirm its output names both complete
   `tag@sha256` references and BuildKit loads `Dockerfile.pinned` from the reviewed Tomcat
   digest.
6. Run the complete five-command contract in `docs/project-contract.md` and require PR CI
   to pass with teardown.
7. Record the old/new tags, digests, provenance, validation, and any exception in the PR
   and a new immutable implementation log.

Scheduled pin automation remains outside the approved cycle. It may propose a candidate,
but it must not bypass provenance review, drift validation, the full gate, or owner merge.
