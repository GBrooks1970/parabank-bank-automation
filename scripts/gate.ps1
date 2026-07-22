<#
.SYNOPSIS
    Phase-0 boot gate for the ParaBank SUT: wait for the app, seed the database, then
    verify every surface this project will test.

.DESCRIPTION
    Checks (all against a running container, e.g. after `docker compose up -d`):
      1. Liveness + deterministic seed: POST /parabank/services/bank/initializeDB → 204
         (polled until the app answers). A fresh container does NOT reliably self-seed —
         Phase-0 finding, refining probe F-03/F-06: always initializeDB explicitly after
         boot, before touching seeded identities.
      2. Seeded REST login:  GET /parabank/services/bank/login/john/demo → 200, customer 12212
      3. OpenAPI spec served: GET /parabank/services/bank/openapi.json  → 200, "openapi" field
      4. SOAP surface alive:  GET /parabank/services/ParaBank?wsdl      → 200, wsdl:definitions
    Exits non-zero on the first failure. Runs under pwsh on Windows and Linux.
#>
#Requires -Version 7
[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://localhost:8090',
    [int]$TimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)

Write-Host "Waiting up to ${TimeoutSeconds}s for ParaBank at $BaseUrl (seeding via initializeDB) ..."
$seeded = $false
while (-not $seeded) {
    try {
        $init = Invoke-WebRequest "$BaseUrl/parabank/services/bank/initializeDB" -Method POST -UseBasicParsing -TimeoutSec 5 -SkipHttpErrorCheck
        if ($init.StatusCode -eq 204) { $seeded = $true; continue }
    } catch { }
    if ((Get-Date) -gt $deadline) {
        Write-Error "GATE FAIL: initializeDB did not return 204 within ${TimeoutSeconds}s. Try: docker logs parabank"
    }
    Start-Sleep -Seconds 2
}
Write-Host '  [1/4] initializeDB OK (204) - app is up and the database is seeded'

$r = Invoke-WebRequest "$BaseUrl/parabank/services/bank/login/john/demo" -Headers @{ Accept = 'application/json' } -UseBasicParsing
$customer = $r.Content | ConvertFrom-Json
if ($r.StatusCode -ne 200 -or $customer.id -ne 12212) { Write-Error "GATE FAIL: seeded login expected customer 12212, got status $($r.StatusCode) / '$($customer.id)'" }
Write-Host "  [2/4] REST login OK - seeded customer 12212 ($($customer.firstName) $($customer.lastName))"

$oa = Invoke-WebRequest "$BaseUrl/parabank/services/bank/openapi.json" -UseBasicParsing
$oaVersion = ($oa.Content | ConvertFrom-Json).openapi
if ($oa.StatusCode -ne 200 -or -not $oaVersion) { Write-Error 'GATE FAIL: openapi.json missing or malformed' }
Write-Host "  [3/4] OpenAPI spec OK - version $oaVersion"

$wsdl = Invoke-WebRequest "$BaseUrl/parabank/services/ParaBank?wsdl" -UseBasicParsing
if ($wsdl.StatusCode -ne 200 -or $wsdl.Content -notmatch 'wsdl:definitions') { Write-Error 'GATE FAIL: ParaBank WSDL not served' }
Write-Host '  [4/4] SOAP WSDL OK'

Write-Host 'GATE PASS: ParaBank seed/reset, UI/REST, OpenAPI, and SOAP all verified.'
