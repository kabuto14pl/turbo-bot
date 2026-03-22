param(
    [switch]$NoOllama,
    [string]$RemoteUrl = "http://127.0.0.1:4001",
    [string]$CsvPath = ".\data\BTCUSDT\BTCUSDT_m15.csv",
    [string]$OutputPath = ".\reports\quantum_fidelity_replay_gpu.json",
    [int]$Samples = 12,
    [int]$WaitTimeoutSec = 240,
    [int]$WaitIntervalSec = 5
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "" 
Write-Host "  TURBO-BOT GPU START + QUANTUM REPLAY" -ForegroundColor Green
Write-Host "" 

$gpuArgs = @(
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $scriptDir "start-gpu-service.ps1")
)
if ($NoOllama) {
    $gpuArgs += "-NoOllama"
}

Write-Host "[1/2] Starting GPU host service and reverse tunnel..." -ForegroundColor Cyan
$gpuProc = Start-Process -FilePath "powershell" -ArgumentList $gpuArgs -PassThru
Write-Host "[OK] start-gpu-service.ps1 launched in separate process (PID: $($gpuProc.Id))" -ForegroundColor Green

Write-Host "" 
Write-Host "[2/2] Waiting for tunnel and running fidelity replay..." -ForegroundColor Cyan
& (Join-Path $scriptDir "scripts\run_quantum_fidelity_replay.ps1") `
    -RemoteUrl $RemoteUrl `
    -CsvPath $CsvPath `
    -OutputPath $OutputPath `
    -Samples $Samples `
    -WaitTimeoutSec $WaitTimeoutSec `
    -WaitIntervalSec $WaitIntervalSec

Write-Host "" 
Write-Host "[DONE] Quantum replay finished. GPU services remain running in the separate PowerShell process." -ForegroundColor Green