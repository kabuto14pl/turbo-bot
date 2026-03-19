param(
    [string]$RemoteUrl = "http://127.0.0.1:4001",
    [string]$CsvPath = ".\data\BTCUSDT\BTCUSDT_m15.csv",
    [string]$OutputPath = ".\reports\quantum_fidelity_replay_local_gpu.json",
    [int]$Samples = 12,
    [int]$WaitTimeoutSec = 120,
    [int]$WaitIntervalSec = 3
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

& (Join-Path $scriptDir "run_quantum_fidelity_replay.ps1") `
    -RemoteUrl $RemoteUrl `
    -CsvPath $CsvPath `
    -OutputPath $OutputPath `
    -Samples $Samples `
    -WaitTimeoutSec $WaitTimeoutSec `
    -WaitIntervalSec $WaitIntervalSec