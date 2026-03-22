param(
    [string]$ReportPath = ".\reports\quantum_fidelity_replay_local_gpu.json",
    [double]$MinQmcMatch = 0.70,
    [double]$MinRegimeMatch = 0.70,
    [double]$MinQaoaCorr = 0.60
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

if (-not (Test-Path $ReportPath)) {
    throw "Report not found: $ReportPath"
}

python (Join-Path $rootDir "scripts\analyze_quantum_fidelity_report.py") `
    --report $ReportPath `
    --min-qmc-match $MinQmcMatch `
    --min-regime-match $MinRegimeMatch `
    --min-qaoa-corr $MinQaoaCorr