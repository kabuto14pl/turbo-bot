param(
    [string]$RemoteUrl = "http://127.0.0.1:4000",
    [int]$MaxParallel = 1,
    [double]$GpuTimeoutSec = 15,
    [int]$WaitTimeoutSec = 120,
    [string]$ResultsDir = ".\ml-service\results",
    [string[]]$Jobs = @("single:15m", "single:1h", "single:4h", "multi:15m", "walkforward:15m"),
    [switch]$Trades,
    [switch]$SkipHealthCheck,
    [switch]$ShowHelp,
    [string[]]$ExtraOrchestratorArgs = @()
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

function Resolve-PythonLauncher {
    $candidates = @(
        @{ Command = "py"; PrefixArgs = @("-3") },
        @{ Command = "python"; PrefixArgs = @() },
        @{ Command = "python3"; PrefixArgs = @() }
    )

    foreach ($candidate in $candidates) {
        $commandInfo = Get-Command $candidate.Command -ErrorAction SilentlyContinue
        if (-not $commandInfo) {
            continue
        }

        try {
            & $candidate.Command @($candidate.PrefixArgs + @("--version")) *> $null
            if ($LASTEXITCODE -eq 0) {
                return [PSCustomObject]@{
                    Command = $candidate.Command
                    PrefixArgs = $candidate.PrefixArgs
                }
            }
        } catch {}
    }

    throw "Python launcher not found. Install Python or use py/python from PowerShell."
}

Write-Host ""
Write-Host "  TURBO-BOT LOCAL GPU FULL ORCHESTRATOR" -ForegroundColor Green
Write-Host ""

$gpuProc = $null
if (-not $ShowHelp -and -not $SkipHealthCheck) {
    $health = Get-GpuHealth -Url $RemoteUrl

    if ($MaxParallel -gt 1) {
        Write-Host "[WARN] MaxParallel=$MaxParallel can destabilize the local CUDA service on Windows host runs. Prefer 1 for authoritative manifests." -ForegroundColor Yellow
    }

    if ($health -and $health.status -eq "online") {
        $gpuActive = $health.gpu_active -eq $true
        $backend = $health.backend
        if (-not $gpuActive -or $backend -ne "cuda") {
            Write-Host ""
            Write-Host "  =====================================================" -ForegroundColor Red
            Write-Host "  BLOCKED: GPU service has NO CUDA active!" -ForegroundColor Red
            Write-Host "  gpu_active=$gpuActive backend=$backend" -ForegroundColor Red
            Write-Host "  Fix: pip install torch --index-url https://download.pytorch.org/whl/cu128" -ForegroundColor Red
            Write-Host "  Then restart gpu-cuda-service.py" -ForegroundColor Red
            Write-Host "  =====================================================" -ForegroundColor Red
            Write-Host ""
            exit 1
        }
        Write-Host "  GPU active: $($health.gpu.device) | backend: $backend" -ForegroundColor Green
        Write-Host "[1/2] Reusing local CUDA service ($($health.status)): $($health.gpu.device)" -ForegroundColor Green
    } else {
        $gpuArgs = @(
            "-ExecutionPolicy", "Bypass",
            "-File", (Join-Path $scriptDir "start-gpu-service.ps1"),
            "-LocalOnly",
            "-MonitorIntervalSec", "5",
            "-HealthFailureThreshold", "6",
            "-ProbeTimeoutSec", "5"
        )

        Write-Host "[1/2] Starting local CUDA service only..." -ForegroundColor Cyan
        $gpuProc = Start-Process -FilePath "powershell" -ArgumentList $gpuArgs -PassThru
        Write-Host "[OK] start-gpu-service.ps1 -LocalOnly launched (PID: $($gpuProc.Id))" -ForegroundColor Green

        Write-Host "  Waiting for local CUDA health before orchestrator start..." -ForegroundColor DarkGray
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
                $gpuActive2 = $health.gpu_active -eq $true
                $backend2 = $health.backend
                if (-not $gpuActive2 -or $backend2 -ne "cuda") {
                    Write-Host ""
                    Write-Host "  [BLOCKED] GPU service has NO CUDA active!" -ForegroundColor Red
                    Write-Host "  gpu_active=$gpuActive2 backend=$backend2" -ForegroundColor Red
                    Write-Host "  Fix: pip install torch --index-url https://download.pytorch.org/whl/cu128" -ForegroundColor Red
                    Write-Host ""
                    exit 1
                }
                Write-Host "[OK] Local CUDA health is $($health.status): $($health.gpu.device)" -ForegroundColor Green
                break
            }

            if ($health.status -eq "degraded") {
                $reason = if ($health.init_error) { $health.init_error } elseif ($health.gpu.init_error) { $health.gpu.init_error } else { "GPU service is reachable, but degraded." }
                Write-Host "[ERROR] Local CUDA health is degraded: $reason" -ForegroundColor Red
                exit 70
            }
        }

        if (-not $health -or $health.status -ne "online") {
            Write-Host "[ERROR] Local CUDA health did not become online before orchestrator start." -ForegroundColor Red
            exit 70
        }
    }
}

$python = Resolve-PythonLauncher
$orchestratorArgs = @() + $python.PrefixArgs + @("ml-service/backtest_pipeline/remote_gpu_full_orchestrator.py")

if ($ShowHelp) {
    $orchestratorArgs += "--help"
} else {
    $orchestratorArgs += @(
        "--remote-url", $RemoteUrl,
        "--max-parallel", "$MaxParallel",
        "--gpu-timeout-s", "$GpuTimeoutSec",
        "--results-dir", $ResultsDir
    )

    if ($Jobs.Count -gt 0) {
        $orchestratorArgs += "--jobs"
        $orchestratorArgs += $Jobs
    }

    if ($Trades) {
        $orchestratorArgs += "--trades"
    }

    if ($SkipHealthCheck) {
        $orchestratorArgs += "--skip-health-check"
    }
}

if ($ExtraOrchestratorArgs.Count -gt 0) {
    $orchestratorArgs += $ExtraOrchestratorArgs
}

Write-Host ""
Write-Host "[2/2] Running remote-gpu full orchestrator..." -ForegroundColor Cyan
Write-Host "  $($python.Command) $($orchestratorArgs -join ' ')" -ForegroundColor DarkGray
& $python.Command @orchestratorArgs
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    throw "Remote-gpu full orchestrator failed with exit code $exitCode"
}

if (-not $ShowHelp) {
    Write-Host ""
    Write-Host "[DONE] Remote-gpu full orchestrator finished. Local CUDA service remains running in the separate PowerShell process." -ForegroundColor Green
}