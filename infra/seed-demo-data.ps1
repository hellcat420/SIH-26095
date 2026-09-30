$ErrorActionPreference = 'Stop'

$composeFile = Join-Path $PSScriptRoot 'docker-compose.yml'
$seedFile = Join-Path $PSScriptRoot 'demo-data.sql'

if (-not (Test-Path -LiteralPath $seedFile)) {
  throw "Demo seed file not found: $seedFile"
}

Get-Content -LiteralPath $seedFile -Raw | docker compose -f $composeFile exec -T postgres psql -U postgres -d dosje -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to load demo records into PostgreSQL.'
}

Write-Output 'Demo institutes, assignments, and inspections are ready.'
