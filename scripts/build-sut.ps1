<#
.SYNOPSIS
    Prepare the ParaBank SUT image: fetch the pinned upstream source, build the WAR
    in a containerised Maven (no host toolchain needed), rename it for the upstream
    Dockerfile, and build the Docker image via docker compose.

.NOTES
    Decision records DR-PB-01/DR-PB-02 (portfolio-docs/PORTFOLIO_PARABANK_SCOPING_PLAN_2026-07-22.md):
    - Two-step containerised build; upstream tests deliberately skipped (their suite
      needs exclusive HSQLDB/ActiveMQ ports — probe finding F-01).
    - Upstream pinned to a specific commit; bumps are deliberate, reviewed changes.
    - The pom emits parabank-5.0.0-SNAPSHOT.war but the upstream Dockerfile expects
      target/parabank.war, so the rename below is required (probe finding F-02).
    Runs on Windows (Docker Desktop) and Linux CI runners under pwsh unchanged.
#>
#Requires -Version 7
[CmdletBinding()]
param(
    # parasoft/parabank commit this project is built against (DR-PB-02).
    [string]$UpstreamCommit = 'd1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1',
    [string]$UpstreamUrl = 'https://github.com/parasoft/parabank.git'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$app = Join-Path $root 'target-app/parabank'

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

Write-Host 'Building parabank.war in maven:3.9-eclipse-temurin-17 (upstream tests skipped) ...'
docker run --rm -v "${app}:/build" -v parabank-m2:/root/.m2 -w /build `
    maven:3.9-eclipse-temurin-17 mvn -B -q clean package "-Dmaven.test.skip=true"
if ($LASTEXITCODE -ne 0) { throw "Maven build failed" }

# DR-PB-01 / probe F-02: upstream Dockerfile expects target/parabank.war.
Copy-Item (Join-Path $app 'target/parabank-5.0.0-SNAPSHOT.war') `
    (Join-Path $app 'target/parabank.war') -Force

Write-Host 'Building the SUT image (upstream Dockerfile, via docker compose) ...'
docker compose --project-directory $root build
if ($LASTEXITCODE -ne 0) { throw "docker compose build failed" }

Write-Host 'SUT image ready. Start it with: docker compose up -d'
