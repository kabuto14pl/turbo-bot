# PATCH #43: GPU-ONLY Architecture - Start GPU + SSH Tunnel Services
#
# Starts 1 service + 2 SSH tunnels:
#   1. Python CUDA Service    (port 4001) - RTX 5070 Ti @ 40% utilization
#   2. SSH tunnel GPU          (VPS:4001 -> Local:4001)
#   3. SSH tunnel Ollama       (VPS:11434 -> Local:11434)
#
# Architecture: VPS bot -> SSH tunnel -> Python FastAPI -> RTX 5070 Ti CUDA
# Port 4001 avoids Windows AV Deep Packet Inspection on port 4000.
#
# Usage:
#   .\start-gpu-service.ps1              -- Start everything
#   .\start-gpu-service.ps1 -NoOllama    -- Skip Ollama tunnel
#   .\start-gpu-service.ps1 -LocalOnly   -- Start only local CUDA service (for backtests)
param(
    [switch]$NoOllama,
    [switch]$LocalOnly,
    [int]$MonitorIntervalSec = 5,
    [int]$HealthFailureThreshold = 6,
    [int]$ProbeTimeoutSec = 5
)

$ErrorActionPreference = "Continue"
$VPS = "root@64.226.70.149"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$logsDir = Join-Path $scriptDir "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

$cudaStdoutLog = Join-Path $logsDir "gpu-cuda-service.out.log"
$cudaStderrLog = Join-Path $logsDir "gpu-cuda-service.err.log"
$watchdogLog = Join-Path $logsDir "gpu-watchdog.log"

function Write-WatchdogLog {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $watchdogLog -Value "$timestamp [$Level] $Message" -ErrorAction SilentlyContinue
}

$Host.UI.RawUI.WindowTitle = "Turbo-Bot GPU Service (RTX 5070 Ti)"

Write-Host ""
Write-Host "  TURBO-BOT GPU-ONLY SERVICE (PATCH #43)" -ForegroundColor Green
Write-Host "  RTX 5070 Ti @ 40% utilization" -ForegroundColor Green
Write-Host ""
Write-WatchdogLog -Message "Watchdog session starting (LocalOnly=$LocalOnly, MonitorIntervalSec=$MonitorIntervalSec, HealthFailureThreshold=$HealthFailureThreshold, ProbeTimeoutSec=$ProbeTimeoutSec)."

# Pre-flight checks
try {
    $gpuInfo = nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>&1
    if ($LASTEXITCODE -ne 0) { throw "nvidia-smi failed" }
    Write-Host "[OK] GPU: $gpuInfo" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] NVIDIA GPU not detected! Install NVIDIA drivers." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    $pyVer = python --version 2>&1
    Write-Host "[OK] $pyVer" -ForegroundColor Green
    $cudaCheck = python -c "import torch; print(f'PyTorch {torch.__version__} CUDA={torch.cuda.is_available()}')" 2>&1
    if ($cudaCheck -match "CUDA=True") {
        Write-Host "[OK] $cudaCheck" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] PyTorch CUDA not available: $cudaCheck" -ForegroundColor Red
        Write-Host "        Install: pip install torch --index-url https://download.pytorch.org/whl/cu128" -ForegroundColor DarkGray
        Read-Host "Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "[ERROR] Python not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    python -c "import fastapi, uvicorn" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "missing" }
    Write-Host "[OK] FastAPI + Uvicorn installed" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Installing FastAPI..." -ForegroundColor Yellow
    pip install fastapi uvicorn pynvml 2>&1 | Out-Null
}

if (-not $LocalOnly) {
    try {
        $sshCheck = ssh -o ConnectTimeout=5 -o BatchMode=yes $VPS "echo OK" 2>&1
        if ($sshCheck -match "OK") {
            Write-Host "[OK] SSH to VPS ($VPS)" -ForegroundColor Green
        } else { throw "SSH failed" }
    } catch {
        Write-Host "[ERROR] Cannot SSH to $VPS" -ForegroundColor Red
    }
} else {
    Write-Host "[OK] Local-only mode: skipping VPS SSH checks" -ForegroundColor Green
}

Write-Host ""

$bgProcesses = @()
$manageCudaProcess = $false
$reusedExistingCuda = $false
$cudaProc = $null

function Stop-AllServices {
    Write-WatchdogLog -Message "Stopping all managed services."
    Write-Host "
[STOP] Shutting down all services..." -ForegroundColor Yellow
    foreach ($p in $script:bgProcesses) {
        if (-not $p.HasExited) {
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        }
    }
    if ($script:manageCudaProcess -and $script:cudaProc -and -not $script:cudaProc.HasExited) {
        Stop-Process -Id $script:cudaProc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[DONE] All services stopped." -ForegroundColor Green
}

function Get-LogTail {
    param(
        [string]$Path,
        [int]$Lines = 20
    )

    if (Test-Path $Path) {
        return Get-Content -Path $Path -Tail $Lines -ErrorAction SilentlyContinue
    }

    return @()
}

function Start-CudaService {
    Remove-Item $cudaStdoutLog, $cudaStderrLog -ErrorAction SilentlyContinue
    $proc = Start-Process -FilePath "python" -ArgumentList "gpu-cuda-service.py" -WorkingDirectory $scriptDir -PassThru -WindowStyle Hidden -RedirectStandardOutput $cudaStdoutLog -RedirectStandardError $cudaStderrLog
    Write-WatchdogLog -Message "Started CUDA service process PID $($proc.Id)."
    return $proc
}

function Get-Port4000Owners {
    return @(Get-NetTCPConnection -LocalPort 4001 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        Where-Object { $_ -gt 0 })
}

function Get-CudaHealth {
    try {
        return (Invoke-WebRequest -Uri http://localhost:4001/health -UseBasicParsing -TimeoutSec $ProbeTimeoutSec -ErrorAction Stop).Content | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Get-CudaPing {
    try {
        return (Invoke-WebRequest -Uri http://localhost:4001/ping -UseBasicParsing -TimeoutSec $ProbeTimeoutSec -ErrorAction Stop).Content | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Wait-Port4000Released {
    param(
        [int]$TimeoutSec = 15
    )

    for ($i = 0; $i -lt $TimeoutSec; $i++) {
        if ((Get-Port4000Owners).Count -eq 0) {
            return $true
        }
        Start-Sleep -Seconds 1
    }

    return $false
}

function Wait-CudaOnline {
    param(
        [int]$TimeoutSec = 30
    )

    for ($i = 0; $i -lt $TimeoutSec; $i++) {
        Start-Sleep -Seconds 1

        if ($script:cudaProc -and $script:cudaProc.HasExited) {
            return $null
        }

        $health = Get-CudaHealth
        if ($health -and $health.status -eq "online") {
            $gpuOk = $health.gpu_active -eq $true
            if (-not $gpuOk -or $health.backend -ne "cuda") {
                Write-Host "  [BLOCKED] GPU service has NO CUDA! gpu_active=$gpuOk backend=$($health.backend)" -ForegroundColor Red
                return $null
            }
            return $health
        }
    }

    return $null
}

function Describe-Process {
    param(
        [int]$ProcessId
    )

    try {
        $proc = Get-Process -Id $ProcessId -ErrorAction Stop
        return "$($proc.ProcessName) (PID $ProcessId)"
    } catch {
        return "PID $ProcessId"
    }
}

function Restart-CudaService {
    param(
        [string]$Reason
    )

    $oldPid = if ($script:cudaProc) { $script:cudaProc.Id } else { $null }
    Write-WatchdogLog -Message "Restarting CUDA service ($Reason). Previous PID: $oldPid" -Level "WARN"
    Write-Host "[WARN] Restarting CUDA service ($Reason)..." -ForegroundColor Yellow

    if ($script:cudaProc -and -not $script:cudaProc.HasExited) {
        Stop-Process -Id $script:cudaProc.Id -Force -ErrorAction SilentlyContinue
    }

    if (-not (Wait-Port4000Released -TimeoutSec 15)) {
        $remainingOwners = (Get-Port4000Owners | ForEach-Object { Describe-Process -ProcessId $_ }) -join ", "
        Write-Host "[ERROR] Port 4001 did not release before CUDA restart." -ForegroundColor Red
        if ($remainingOwners) {
            Write-Host "        Owners: $remainingOwners" -ForegroundColor Red
        }
        return $null
    }

    $script:cudaProc = Start-CudaService
    $script:manageCudaProcess = $true
    if ($oldPid) {
        $script:bgProcesses = @($script:bgProcesses | Where-Object { $_.Id -ne $oldPid }) + $script:cudaProc
    } else {
        $script:bgProcesses += $script:cudaProc
    }

    Write-Host "  Restarted CUDA (PID: $($script:cudaProc.Id))" -ForegroundColor Green
    Write-WatchdogLog -Message "Restarted CUDA service as PID $($script:cudaProc.Id). Waiting for health recovery."
    $health = Wait-CudaOnline -TimeoutSec 45
    if ($health -and $health.status -eq "online" -and $health.gpu_active -eq $true) {
        Write-WatchdogLog -Message "CUDA health restored after restart (PID: $($script:cudaProc.Id))."
        Write-Host "[OK] CUDA health restored: $($health.gpu.device)" -ForegroundColor Green
        return $health
    }

    Write-WatchdogLog -Message "CUDA service restart failed to recover health within timeout." -Level "ERROR"
    Write-Host "[ERROR] CUDA service restart did not recover health within 45s." -ForegroundColor Red
    $stdoutTail = Get-LogTail -Path $cudaStdoutLog
    $stderrTail = Get-LogTail -Path $cudaStderrLog
    if ($stdoutTail.Count -gt 0) {
        Write-Host "  Last CUDA stdout:" -ForegroundColor Yellow
        $stdoutTail | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    if ($stderrTail.Count -gt 0) {
        Write-Host "  Last CUDA stderr:" -ForegroundColor Yellow
        $stderrTail | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }

    return $null
}

Register-EngineEvent PowerShell.Exiting -Action { Stop-AllServices } -ErrorAction SilentlyContinue | Out-Null

# STEP 1: Python CUDA Service (port 4001)
Write-Host "[1/3] Starting Python CUDA Service (port 4001)..." -ForegroundColor Cyan

$cudaReady = $false
$cudaHealth = $null
$cudaFailureReason = $null
$existingCudaHealth = Get-CudaHealth
$existingPortOwners = Get-Port4000Owners

if ($existingCudaHealth -and $existingCudaHealth.status -eq "online" -and $existingCudaHealth.gpu_active -eq $true -and $existingCudaHealth.backend -eq "cuda") {
    $reusedExistingCuda = $true
    $cudaReady = $true
    $cudaHealth = $existingCudaHealth
    $ownerText = if ($existingPortOwners.Count -gt 0) { Describe-Process -ProcessId $existingPortOwners[0] } else { "existing listener" }
    Write-WatchdogLog -Message "Reusing existing CUDA service on port 4001 ($ownerText)."
    Write-Host "  Reusing existing CUDA service on port 4001 ($ownerText)" -ForegroundColor DarkGray
    Write-Host "[OK] GPU CUDA: $($existingCudaHealth.gpu.device) | VRAM: $($existingCudaHealth.gpu.vram_total_gb)GB" -ForegroundColor Green
} else {
    foreach ($ownerId in $existingPortOwners) {
        Stop-Process -Id $ownerId -Force -ErrorAction SilentlyContinue
        Write-Host "  Killed old $(Describe-Process -ProcessId $ownerId) on port 4001" -ForegroundColor DarkGray
    }

    if ($existingPortOwners.Count -gt 0 -and -not (Wait-Port4000Released)) {
        $remainingOwners = (Get-Port4000Owners | ForEach-Object { Describe-Process -ProcessId $_ }) -join ", "
        Write-Host "[ERROR] Port 4001 is still busy after attempting cleanup." -ForegroundColor Red
        if ($remainingOwners) {
            Write-Host "        Owners: $remainingOwners" -ForegroundColor Red
        }
        exit 71
    }

    $cudaProc = Start-CudaService
    $script:cudaProc = $cudaProc
    $manageCudaProcess = $true
    $script:manageCudaProcess = $true
    $bgProcesses += $cudaProc
    Write-Host "  PID: $($cudaProc.Id)" -ForegroundColor DarkGray
    Write-Host "  Logs: $cudaStdoutLog | $cudaStderrLog" -ForegroundColor DarkGray

    Write-Host "  Waiting for GPU initialization (up to 60s)..." -ForegroundColor DarkGray
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 1
        if ($cudaProc.HasExited) {
            $cudaFailureReason = "CUDA service process exited early with code $($cudaProc.ExitCode)."
            break
        }

        $h = Get-CudaHealth
        if ($null -ne $h) {
            $cudaHealth = $h
            if ($h.status -eq "online") {
                $gpuOk2 = $h.gpu_active -eq $true
                if (-not $gpuOk2 -or $h.backend -ne "cuda") {
                    Write-Host "  [BLOCKED] GPU service has NO CUDA! gpu_active=$gpuOk2 backend=$($h.backend)" -ForegroundColor Red
                    Write-Host "  Fix: pip install torch --index-url https://download.pytorch.org/whl/cu128" -ForegroundColor Red
                    exit 1
                }
                $cudaReady = $true
                Write-WatchdogLog -Message "CUDA health reached $($h.status) state for PID $($cudaProc.Id)."
                Write-Host "[OK] GPU CUDA: $($h.gpu.device) | VRAM: $($h.gpu.vram_total_gb)GB" -ForegroundColor Green
                break
            }
            if ($h.status -eq "degraded") {
                $cudaFailureReason = if ($h.init_error) { $h.init_error } elseif ($h.gpu.init_error) { $h.gpu.init_error } else { "GPU service is reachable, but CUDA is degraded." }
                break
            }
        }
    }
}
if (-not $cudaReady) {
    Write-WatchdogLog -Message "CUDA service failed startup readiness check. Reason: $cudaFailureReason" -Level "ERROR"
    Write-Host "[ERROR] CUDA service did not start in 60s!" -ForegroundColor Red
    if ($cudaFailureReason) {
        Write-Host "        Reason: $cudaFailureReason" -ForegroundColor Red
    }
    if ($cudaHealth -and $cudaHealth.status -eq "degraded") {
        Write-Host "        Health endpoint is up, but GPU is not online." -ForegroundColor Yellow
    }

    $stdoutTail = Get-LogTail -Path $cudaStdoutLog
    $stderrTail = Get-LogTail -Path $cudaStderrLog
    if ($stdoutTail.Count -gt 0) {
        Write-Host "" 
        Write-Host "  Last CUDA stdout:" -ForegroundColor Yellow
        $stdoutTail | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    if ($stderrTail.Count -gt 0) {
        Write-Host "" 
        Write-Host "  Last CUDA stderr:" -ForegroundColor Yellow
        $stderrTail | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }

    Write-Host "" 
    Write-Host "[FATAL] GPU service is not ready. Aborting startup." -ForegroundColor Red
    Stop-AllServices
    exit 70
}

if (-not $LocalOnly) {
    # STEP 2: SSH Tunnel - GPU (VPS:4001 -> Local:4001)
    Write-Host ""
    Write-Host "[2/3] Opening SSH tunnel: VPS:4001 -> Local:4001 (GPU)..." -ForegroundColor Cyan
    $gpuTunnel = Start-Process -FilePath "ssh" -ArgumentList "-R 4001:127.0.0.1:4001 $VPS -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes" -PassThru -WindowStyle Hidden
    $bgProcesses += $gpuTunnel
    Write-Host "  PID: $($gpuTunnel.Id)" -ForegroundColor DarkGray
    Start-Sleep -Seconds 3

    try {
        $tunnelCheck = ssh -o ConnectTimeout=5 $VPS "curl -s -m 3 http://127.0.0.1:4001/health" 2>&1
        if ($tunnelCheck -match "online") {
            Write-Host "[OK] GPU tunnel verified" -ForegroundColor Green
        } else {
            Write-Host "[WARN] GPU tunnel may not be working" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[WARN] Could not verify GPU tunnel" -ForegroundColor Yellow
    }

    # STEP 3: SSH Tunnel - Ollama (VPS:11434 -> Local:11434)
    if (-not $NoOllama) {
        Write-Host ""
        Write-Host "[3/3] Opening SSH tunnel: VPS:11434 -> Local:11434 (Ollama)..." -ForegroundColor Cyan
        $ollamaTunnel = Start-Process -FilePath "ssh" -ArgumentList "-R 11434:127.0.0.1:11434 $VPS -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes" -PassThru -WindowStyle Hidden
        $bgProcesses += $ollamaTunnel
        Write-Host "  PID: $($ollamaTunnel.Id)" -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
        Write-Host "[OK] Ollama tunnel opened" -ForegroundColor Green
    } else {
        Write-Host "[SKIP] Ollama tunnel (-NoOllama flag)" -ForegroundColor DarkGray
    }

    # Restart VPS bot
    Write-Host ""
    Write-Host "Restarting VPS bot to connect to GPU service..." -ForegroundColor Cyan
    try {
        ssh -o ConnectTimeout=5 $VPS "pm2 restart turbo-bot" 2>&1 | Out-Null
        Start-Sleep -Seconds 8
        Write-Host "[OK] VPS bot restarted" -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Could not restart VPS bot" -ForegroundColor Yellow
    }
} else {
    Write-Host "" 
    Write-Host "[2/2] Local-only mode enabled - no SSH tunnels, no VPS restart" -ForegroundColor Cyan
    Write-WatchdogLog -Message "Local-only CUDA mode is active."
}

# Status summary
Write-Host ""
Write-Host "  GPU-ONLY SERVICE RUNNING (PATCH #43)" -ForegroundColor Green
Write-Host "  Python CUDA:    http://localhost:4001  (RTX 5070 Ti @ 40%)" -ForegroundColor White
if (-not $LocalOnly) {
    Write-Host "  GPU Tunnel:     VPS:4001 -> Local:4001" -ForegroundColor White
    if (-not $NoOllama) {
        Write-Host "  Ollama Tunnel:  VPS:11434 -> Local:11434" -ForegroundColor White
    }
    Write-Host "  VPS Bot:        http://64.226.70.149:3001" -ForegroundColor White
    Write-Host "  Dashboard:      http://64.226.70.149:8080" -ForegroundColor White
} else {
    Write-Host "  Mode:           LOCAL BACKTEST / REPLAY ONLY" -ForegroundColor White
    Write-Host "  Replay URL:     http://127.0.0.1:4001" -ForegroundColor White
}
Write-Host ""
Write-Host "  Press Ctrl+C to stop all services" -ForegroundColor DarkGray
Write-Host ""

# Keep alive - monitor processes
$consecutiveCudaHealthFailures = 0
try {
    while ($true) {
        Start-Sleep -Seconds $MonitorIntervalSec
        $dead = $bgProcesses | Where-Object { $_.HasExited }
        foreach ($d in $dead) {
            Write-WatchdogLog -Message "Managed process PID $($d.Id) exited. Evaluating restart path." -Level "WARN"
            Write-Host "[WARN] Process PID $($d.Id) died - restarting..." -ForegroundColor Yellow
            if ($manageCudaProcess -and $cudaProc -and $d.Id -eq $cudaProc.Id) {
                $cudaHealth = Restart-CudaService -Reason "process exited"
                if ($cudaHealth -and $cudaHealth.status -eq "online" -and $cudaHealth.gpu_active -eq $true) {
                    $cudaProc = $script:cudaProc
                    $bgProcesses = $script:bgProcesses
                    $consecutiveCudaHealthFailures = 0
                }
            }
            elseif (-not $LocalOnly -and $d.Id -eq $gpuTunnel.Id) {
                $gpuTunnel = Start-Process -FilePath "ssh" -ArgumentList "-R 4001:127.0.0.1:4001 $VPS -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes" -PassThru -WindowStyle Hidden
                $bgProcesses = @($bgProcesses | Where-Object { $_.Id -ne $d.Id }) + $gpuTunnel
                Write-Host "  Restarted GPU tunnel (PID: $($gpuTunnel.Id))" -ForegroundColor Green
            }
            elseif (-not $LocalOnly -and -not $NoOllama -and $d.Id -eq $ollamaTunnel.Id) {
                $ollamaTunnel = Start-Process -FilePath "ssh" -ArgumentList "-R 11434:127.0.0.1:11434 $VPS -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes" -PassThru -WindowStyle Hidden
                $bgProcesses = @($bgProcesses | Where-Object { $_.Id -ne $d.Id }) + $ollamaTunnel
                Write-Host "  Restarted Ollama tunnel (PID: $($ollamaTunnel.Id))" -ForegroundColor Green
            }
        }

        if ($manageCudaProcess) {
            $cudaPing = Get-CudaPing
            if ($cudaPing -and $cudaPing.status -eq "ok") {
                $consecutiveCudaHealthFailures = 0
            } else {
                $consecutiveCudaHealthFailures += 1
                $healthStatus = if ($cudaPing) { $cudaPing.status } else { "offline" }
                Write-WatchdogLog -Message "CUDA liveness probe failed ($consecutiveCudaHealthFailures/$HealthFailureThreshold, status=$healthStatus)." -Level "WARN"
                Write-Host "[WARN] CUDA liveness probe failed ($consecutiveCudaHealthFailures/$HealthFailureThreshold, status=$healthStatus)." -ForegroundColor Yellow

                if ($consecutiveCudaHealthFailures -ge $HealthFailureThreshold) {
                    $restartReason = if ($cudaProc -and $cudaProc.HasExited) {
                            "liveness probes failing and process already exited"
                    } else {
                            "liveness endpoint unavailable"
                    }
                    $restoredHealth = Restart-CudaService -Reason $restartReason
                    if ($restoredHealth -and $restoredHealth.status -eq "online" -and $restoredHealth.gpu_active -eq $true) {
                        $cudaProc = $script:cudaProc
                        $bgProcesses = $script:bgProcesses
                        $consecutiveCudaHealthFailures = 0
                    }
                }
            }
        }
    }
} finally {
    Stop-AllServices
}
