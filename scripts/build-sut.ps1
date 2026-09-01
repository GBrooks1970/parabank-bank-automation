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
    - Registry drift is DETECTED here but not enforced here (DR-PB-11 / PB-PIN-02).
      The build always consumes the reviewed `tag@sha256` references, so a republished
      upstream tag cannot change what is built; it only means the reviewed digest is
      due a deliberate refresh. Drift therefore warns during a build and fails only
      under -ValidateImagePinsOnly, which the scheduled `pin-drift` workflow runs.
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
    [switch]$ValidateImagePinsOnly,
    # Optional Markdown drift report, written whether or not drift was found. The
    # scheduled pin-drift workflow uses it as the body of the tracking issue.
    [string]$DriftReportPath
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

function Get-ImagePinDrift {
    <#
        Returns $null when the tag still resolves to its reviewed digest, otherwise a drift
        record. It never throws on drift: every pin is checked so a report names ALL of them,
        and the caller decides whether drift is fatal. The old behaviour threw on the first
        mismatch, which under-reported a multi-pin drift (PB-PIN-01 lesson).
    #>
    param([Parameter(Mandatory)] [pscustomobject]$Pin)

    $resolvedJson = $null
    try {
        $resolvedJson = docker buildx imagetools inspect $Pin.Tag --format '{{json .Manifest.Digest}}'
    } catch {
        $resolvedJson = $null
    }
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($resolvedJson)) {
        return [pscustomobject]@{
            Name    = $Pin.Name
            Tag     = $Pin.Tag
            Message = "Could not resolve the current registry digest for $($Pin.Name) tag '$($Pin.Tag)', so its reviewed digest could not be validated."
        }
    }

    $resolvedDigest = $resolvedJson | ConvertFrom-Json
    if ($resolvedDigest -ne $Pin.Digest) {
        return [pscustomobject]@{
            Name    = $Pin.Name
            Tag     = $Pin.Tag
            Message = "Container image pin '$($Pin.Name)' is stale: tag '$($Pin.Tag)' now resolves to '$resolvedDigest', but $ImagePinsPath records '$($Pin.Digest)'. Review and refresh the pin deliberately."
        }
    }

    Write-Host "Image pin OK: $($Pin.Name) -> $($Pin.Reference)"
    return $null
}

function Write-DriftReport {
    param(
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$Drift,
        [Parameter(Mandatory)] [string]$Path
    )

    if ($Drift.Count -eq 0) {
        $lines = @('## Container image pin drift', '', 'No drift: every reviewed tag resolves to its recorded digest.')
    } else {
        $lines = @('## Container image pin drift', '')
        $lines += ($Drift | ForEach-Object { "- **$($_.Name)** (``$($_.Tag)``) - $($_.Message)" })
        $lines += @(
            '',
            'Builds are unaffected: they consume the reviewed `tag@sha256` references, which are',
            'immutable. Refresh the recorded digests deliberately through',
            '`docs/container-image-pin-policy.md`.'
        )
    }
    Set-Content -LiteralPath $Path -Value ($lines -join "`n")
}

function Write-DriftNotice {
    param([Parameter(Mandatory)] [object[]]$Drift)

    foreach ($record in $Drift) {
        Write-Warning $record.Message
        if ($env:GITHUB_ACTIONS -eq 'true') {
            Write-Host "::warning title=Container image pin drift ($($record.Name))::$($record.Message)"
        }
    }
    if ($env:GITHUB_STEP_SUMMARY) {
        $summary = @('### Container image pin drift', '')
        $summary += ($Drift | ForEach-Object { "- **$($_.Name)** - $($_.Message)" })
        $summary += @('', 'The build continued from the reviewed immutable digests. See the scheduled `pin-drift` workflow.')
        Add-Content -LiteralPath $env:GITHUB_STEP_SUMMARY -Value ($summary -join "`n")
    }
}

if (-not (Test-Path -LiteralPath $ImagePinsPath -PathType Leaf)) {
    throw "Container image pin file not found: $ImagePinsPath"
}
$imagePins = Import-PowerShellDataFile -LiteralPath $ImagePinsPath
$mavenBuilder = Resolve-PinnedImage -Name 'MavenBuilder' -Pin $imagePins.MavenBuilder
$parabankRuntime = Resolve-PinnedImage -Name 'ParaBankRuntime' -Pin $imagePins.ParaBankRuntime
$reviewedPins = @($mavenBuilder, $parabankRuntime)
$drift = @($reviewedPins | ForEach-Object { Get-ImagePinDrift -Pin $_ } | Where-Object { $null -ne $_ })

if ($DriftReportPath) {
    Write-DriftReport -Drift $drift -Path $DriftReportPath
}

if ($ValidateImagePinsOnly) {
    # Strict mode: the review/detection entry point, where drift IS the failure.
    if ($drift.Count -gt 0) {
        foreach ($record in $drift) { Write-Host "IMAGE PIN DRIFT: $($record.Message)" }
        throw "IMAGE PIN VALIDATION FAIL: $($drift.Count) of $($reviewedPins.Count) reviewed pins need a deliberate refresh ($(($drift | ForEach-Object { $_.Name }) -join ', '))."
    }
    Write-Host 'IMAGE PIN VALIDATION PASS: all required tags resolve to their reviewed digests.'
    return
}

if ($drift.Count -gt 0) {
    # Build path: warn, do not block (DR-PB-11). The reviewed digests below are immutable,
    # so the build stays reproducible; drift only means a refresh is due.
    Write-DriftNotice -Drift $drift
    Write-Warning 'Continuing the build from the reviewed digests: they are immutable references. Refresh them deliberately (docs/container-image-pin-policy.md); the scheduled pin-drift workflow tracks this.'
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
