param(
    [string]$RemoteUrl = "http://127.0.0.1:4001",
    [string]$Timeframe = "15m",
    [switch]$All,
    [switch]$Brief,
    [switch]$FastProfile,
    [double]$GpuTimeoutSec = 15,
    [int]$WaitTimeoutSec = 120,
    [string[]]$ExtraRunnerArgs = @()
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

function Get-GpuHealth {
    param(
        [string]$Url
    )

    try {
        return (Invoke-WebRequest -Uri "$Url/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop).Content | ConvertFrom-Json
    } catch {
        return $null
    }
}

Write-Host ""
Write-Host "  TURBO-BOT LOCAL GPU REMOTE BACKTEST" -ForegroundColor Green
Write-Host ""

$health = Get-GpuHealth -Url $RemoteUrl
$gpuProc = $null

if ($health -and $health.status -eq "online") {
    Write-Host "[1/2] Reusing online local CUDA service: $($health.gpu.device)" -ForegroundColor Green
} else {
    $gpuArgs = @(
        "-ExecutionPolicy", "Bypass",
        "-File", (Join-Path $scriptDir "start-gpu-service.ps1"),
        "-LocalOnly"
    )

    Write-Host "[1/2] Starting local CUDA service only..." -ForegroundColor Cyan
    $gpuProc = Start-Process -FilePath "powershell" -ArgumentList $gpuArgs -PassThru
    Write-Host "[OK] start-gpu-service.ps1 -LocalOnly launched (PID: $($gpuProc.Id))" -ForegroundColor Green

    Write-Host "  Waiting for local CUDA health before backtest..." -ForegroundColor DarkGray
    $deadline = (Get-Date).AddSeconds($WaitTimeoutSec)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 1

        if ($gpuProc.HasExited) {
            Write-Host "[ERROR] Local CUDA starter process exited before becoming ready (exit code: $($gpuProc.ExitCode))." -ForegroundColor Red
            exit 70
        }

        $health = Get-GpuHealth -Url $RemoteUrl
        if (-not $health) {
            continue
        }

        if ($health.status -eq "online") {
            Write-Host "[OK] Local CUDA health is online: $($health.gpu.device)" -ForegroundColor Green
            break
        }

        if ($health.status -eq "degraded") {
            $reason = if ($health.init_error) { $health.init_error } elseif ($health.gpu.init_error) { $health.gpu.init_error } else { "GPU service is reachable, but degraded." }
            Write-Host "[ERROR] Local CUDA health is degraded: $reason" -ForegroundColor Red
            exit 70
        }
    }

    if (-not $health -or $health.status -ne "online") {
        Write-Host "[ERROR] Local CUDA health did not become online before backtest start." -ForegroundColor Red
        exit 70
    }
}

$runnerArgs = @("ml-service/backtest_pipeline/runner.py")
if ($All) {
    $runnerArgs += "--all"
} else {
    $runnerArgs += @("--timeframe", $Timeframe)
}

$runnerArgs += @(
    "--quantum-backend", "remote-gpu",
    "--gpu-url", $RemoteUrl,
    "--gpu-timeout-s", $GpuTimeoutSec
)

if ($Brief) {
    $runnerArgs += "--brief"
}

if ($FastProfile) {
    $runnerArgs += "--fast-profile"
}

if ($ExtraRunnerArgs.Count -gt 0) {
    $runnerArgs += $ExtraRunnerArgs
}

Write-Host ""
Write-Host "[2/2] Running remote-gpu backtest..." -ForegroundColor Cyan
Write-Host "  python $($runnerArgs -join ' ')" -ForegroundColor DarkGray
& python @runnerArgs
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    throw "Remote-gpu backtest failed with exit code $exitCode"
}

Write-Host ""
Write-Host "[DONE] Remote-gpu backtest finished. Local CUDA service remains running in the separate PowerShell process." -ForegroundColor Green