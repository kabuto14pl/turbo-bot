param(
    [string]$RemoteUrl = "http://127.0.0.1:4000",
    [string]$CsvPath = ".\data\BTCUSDT\BTCUSDT_m15.csv",
    [string]$OutputPath = ".\reports\quantum_fidelity_replay_local_gpu.json",
    [int]$Samples = 12,
    [int]$WaitTimeoutSec = 120,
    [int]$WaitIntervalSec = 3
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "" 
Write-Host "  TURBO-BOT LOCAL GPU BACKTEST + REPLAY" -ForegroundColor Green
Write-Host "" 

$gpuArgs = @(
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $scriptDir "start-gpu-service.ps1"),
    "-LocalOnly"
)

Write-Host "[1/2] Starting local CUDA service only..." -ForegroundColor Cyan
$gpuProc = Start-Process -FilePath "powershell" -ArgumentList $gpuArgs -PassThru
Write-Host "[OK] start-gpu-service.ps1 -LocalOnly launched (PID: $($gpuProc.Id))" -ForegroundColor Green

Write-Host "  Waiting for local CUDA health before replay..." -ForegroundColor DarkGray
$gpuReady = $false
for ($i = 0; $i -lt 70; $i++) {
    Start-Sleep -Seconds 1

    if ($gpuProc.HasExited) {
        Write-Host "[ERROR] Local CUDA starter process exited before becoming ready (exit code: $($gpuProc.ExitCode))." -ForegroundColor Red
        exit 70
    }

    try {
        $health = (Invoke-WebRequest -Uri "$RemoteUrl/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop).Content | ConvertFrom-Json
        if ($health.status -eq "online") {
            $gpuReady = $true
            Write-Host "[OK] Local CUDA health is online: $($health.gpu.device)" -ForegroundColor Green
            break
        }
        if ($health.status -eq "degraded") {
            $reason = if ($health.init_error) { $health.init_error } elseif ($health.gpu.init_error) { $health.gpu.init_error } else { "GPU service is reachable, but degraded." }
            Write-Host "[ERROR] Local CUDA health is degraded: $reason" -ForegroundColor Red
            exit 70
        }
    } catch {}
}

if (-not $gpuReady) {
    Write-Host "[ERROR] Local CUDA health did not become online before replay start." -ForegroundColor Red
    exit 70
}

Write-Host "" 
Write-Host "[2/2] Running local fidelity replay on localhost:4000..." -ForegroundColor Cyan
& (Join-Path $scriptDir "scripts\run_quantum_fidelity_replay.ps1") `
    -RemoteUrl $RemoteUrl `
    -CsvPath $CsvPath `
    -OutputPath $OutputPath `
    -Samples $Samples `
    -WaitTimeoutSec $WaitTimeoutSec `
    -WaitIntervalSec $WaitIntervalSec

Write-Host "" 
Write-Host "[DONE] Local quantum replay finished. Local CUDA service remains running in the separate PowerShell process." -ForegroundColor Green