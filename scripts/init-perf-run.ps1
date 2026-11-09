# Initializes an isolated, clean run-specific output directory for performance diagnostics (TRIAGE-03).
# Ensures that pre-k6 failures upload only current-run metadata and never attach old committed metrics.
param(
  [string]$SourceRef = $env:GITHUB_SHA,
  [string]$RunUrl = ""
)

$ErrorActionPreference = 'Stop'
$rootDir = (Resolve-Path "$PSScriptRoot/..").Path
$outputDir = Join-Path $rootDir "perf/run-output"

if (Test-Path $outputDir) {
  Remove-Item -Recurse -Force $outputDir
}
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$now = [DateTime]::UtcNow.ToString("o")
$ref = if ($SourceRef) { $SourceRef } else { "dev" }

$meta = @{
  status = "in_progress"
  startedAt = $now
  sourceRef = $ref
}

if (-not $RunUrl -and $env:GITHUB_SERVER_URL -and $env:GITHUB_REPOSITORY -and $env:GITHUB_RUN_ID) {
  $RunUrl = "$($env:GITHUB_SERVER_URL)/$($env:GITHUB_REPOSITORY)/actions/runs/$($env:GITHUB_RUN_ID)"
}
if ($RunUrl) {
  $meta["runUrl"] = $RunUrl
}

$json = $meta | ConvertTo-Json -Depth 5
Set-Content -Path (Join-Path $outputDir "run-metadata.json") -Value $json -Encoding UTF8
Write-Host "perf: initialized clean diagnostics directory: $outputDir ($ref)"
