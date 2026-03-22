param(
    [string]$ReportPath = ".\reports\quantum_fidelity_replay_local_gpu.json",
    [double]$MinQmcMatch = 0.70,
    [double]$MinRegimeMatch = 0.70,
    [double]$MinQaoaCorr = 0.60
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

& (Join-Path $scriptDir "scripts\analyze_quantum_fidelity_report.ps1") `
    -ReportPath $ReportPath `
    -MinQmcMatch $MinQmcMatch `
    -MinRegimeMatch $MinRegimeMatch `
    -MinQaoaCorr $MinQaoaCorr