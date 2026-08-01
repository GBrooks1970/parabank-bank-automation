<#
.SYNOPSIS
    Prepare the ParaBank SUT image: fetch the pinned upstream source, build the WAR
    in a digest-pinned containerised Maven (no host toolchain needed), rename it for a
    digest-pinned derivative of the upstream Dockerfile, and build via docker compose.

.NOTES
    Decision records DR-PB-01/DR-PB-02 (portfolio-docs/PORTFOLIO_PARABANK_SCOPING_PLAN_2026-07-22.md):
    - Two-step containerised build; upstream tests deliberately skipped (their suite
      needs exclusive HSQLDB/ActiveMQ ports — probe finding F-01).
    - Upstream source and both container images are pinned; bumps are deliberate,
      reviewed changes (DR-PB-10 / PB-CODEX-06).
    - The pom emits parabank-5.0.0-SNAPSHOT.war but the upstream Dockerfile expects
      target/parabank.war, so the rename below is required (probe finding F-02).
    Runs on Windows (Docker Desktop) and Linux CI runners under pwsh unchanged.
#>
#Requires -Version 7
[CmdletBinding()]
param(
    # parasoft/parabank commit this project is built against (DR-PB-02).
    [string]$UpstreamCommit = 'd1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1',
    [string]$UpstreamUrl = 'https://github.com/parasoft/parabank.git',
    [string]$ImagePinsPath = (Join-Path $PSScriptRoot '../config/container-image-pins.psd1'),
    [switch]$ValidateImagePinsOnly
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$app = Join-Path $root 'target-app/parabank'

function Resolve-PinnedImage {
    param(
        [Parameter(Mandatory)] [string]$Name,
        [Parameter()] [object]$Pin
    )

    if ($null -eq $Pin) {
        throw "Container image pin '$Name' is missing from $ImagePinsPath"
    }
    $tag = [string]$Pin.Tag
    $digest = [string]$Pin.Digest
    if ([string]::IsNullOrWhiteSpace($tag) -or $tag.Contains('@')) {
        throw "Container image pin '$Name' has an absent or invalid readable Tag in $ImagePinsPath"
    }
    if ($digest -notmatch '^sha256:[0-9a-f]{64}$') {
        throw "Container image pin '$Name' has an absent or invalid sha256 Digest in $ImagePinsPath"
    }

    [pscustomobject]@{
        Name      = $Name
        Tag       = $tag
        Digest    = $digest
        Reference = "$tag@$digest"
    }
}

function Assert-CurrentImagePin {
    param([Parameter(Mandatory)] [pscustomobject]$Pin)

    $resolvedJson = docker buildx imagetools inspect $Pin.Tag --format '{{json .Manifest.Digest}}'
    if ($LASTEXITCODE -ne 0) {
        throw "Could not resolve current registry digest for $($Pin.Name) tag '$($Pin.Tag)'; cannot validate immutable input"
    }
    $resolvedDigest = $resolvedJson | ConvertFrom-Json
    if ($resolvedDigest -ne $Pin.Digest) {
        throw "Container image pin '$($Pin.Name)' is stale: tag '$($Pin.Tag)' now resolves to '$resolvedDigest', but $ImagePinsPath records '$($Pin.Digest)'. Review and refresh the pin deliberately."
    }
    Write-Host "Image pin OK: $($Pin.Name) -> $($Pin.Reference)"
}

if (-not (Test-Path -LiteralPath $ImagePinsPath -PathType Leaf)) {
    throw "Container image pin file not found: $ImagePinsPath"
}
$imagePins = Import-PowerShellDataFile -LiteralPath $ImagePinsPath
$mavenBuilder = Resolve-PinnedImage -Name 'MavenBuilder' -Pin $imagePins.MavenBuilder
$parabankRuntime = Resolve-PinnedImage -Name 'ParaBankRuntime' -Pin $imagePins.ParaBankRuntime
Assert-CurrentImagePin -Pin $mavenBuilder
Assert-CurrentImagePin -Pin $parabankRuntime

if ($ValidateImagePinsOnly) {
    Write-Host 'IMAGE PIN VALIDATION PASS: all required tags resolve to their reviewed digests.'
    return
}

if (-not (Test-Path (Join-Path $app '.git'))) {
    Write-Host "Fetching parasoft/parabank @ $UpstreamCommit into target-app/parabank ..."
    New-Item -ItemType Directory $app -Force | Out-Null
    git -C $app init -q
    git -C $app remote add origin $UpstreamUrl
    # Windows checkout needs long paths (probe finding F-07); harmless elsewhere.
    git -C $app config core.longpaths true
}

$have = git -C $app rev-parse --quiet --verify "$UpstreamCommit^{commit}" 2>$null
if (-not $have) {
    git -C $app fetch --depth 1 origin $UpstreamCommit
    if ($LASTEXITCODE -ne 0) { throw "git fetch of pinned commit failed" }
}
git -C $app checkout -q --detach $UpstreamCommit
if ($LASTEXITCODE -ne 0) { throw "git checkout of pinned commit failed" }

$upstreamDockerfile = Join-Path $app 'Dockerfile'
$pinnedDockerfile = Join-Path $app 'Dockerfile.pinned'
if (-not (Test-Path -LiteralPath $upstreamDockerfile -PathType Leaf)) {
    throw "Pinned upstream checkout does not contain its expected Dockerfile: $upstreamDockerfile"
}
$dockerfileText = [System.IO.File]::ReadAllText($upstreamDockerfile)
$fromPattern = [regex]::new('(?m)^FROM\s+([^\s#]+)\s*$')
$fromMatch = $fromPattern.Match($dockerfileText)
if (-not $fromMatch.Success) {
    throw "Pinned upstream Dockerfile has no single readable FROM image to validate"
}
$upstreamRuntimeTag = $fromMatch.Groups[1].Value
if ($upstreamRuntimeTag -ne $parabankRuntime.Tag) {
    throw "ParaBank runtime pin is stale: upstream Dockerfile uses '$upstreamRuntimeTag', but $ImagePinsPath records '$($parabankRuntime.Tag)'. Review the upstream change and refresh the pin."
}
$pinnedFrom = "# Runtime image: $($parabankRuntime.Tag) (reviewed digest below)`nFROM $($parabankRuntime.Reference)"
$pinnedDockerfileText = $fromPattern.Replace($dockerfileText, $pinnedFrom, 1)
[System.IO.File]::WriteAllText($pinnedDockerfile, $pinnedDockerfileText)

Write-Host "Building parabank.war in $($mavenBuilder.Reference) (upstream tests skipped) ..."
# The F-02 rename (pom emits parabank-5.0.0-SNAPSHOT.war; upstream Dockerfile expects
# target/parabank.war) happens INSIDE the container: on Linux hosts the container writes
# target/ as root, so a host-side copy would be permission-denied on CI runners.
docker run --rm -v "${app}:/build" -v parabank-m2:/root/.m2 -w /build `
    $mavenBuilder.Reference sh -c 'mvn -B -q clean package -Dmaven.test.skip=true && cp target/parabank-5.0.0-SNAPSHOT.war target/parabank.war'
if ($LASTEXITCODE -ne 0) { throw "Maven build (or WAR rename) failed" }

Write-Host 'Building the SUT image (generated digest-pinned Dockerfile, via docker compose) ...'
docker compose --project-directory $root build
if ($LASTEXITCODE -ne 0) { throw "docker compose build failed" }

Write-Host 'SUT image ready. Start it with: docker compose up -d'
