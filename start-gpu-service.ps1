# PATCH #43: GPU-ONLY Architecture - Start GPU + SSH Tunnel Services
#
# Starts 1 service + 2 SSH tunnels:
#   1. Python CUDA Service    (port 4000) - RTX 5070 Ti @ 40% utilization
#   2. SSH tunnel GPU          (VPS:4001 -> Local:4000)
#   3. SSH tunnel Ollama       (VPS:11434 -> Local:11434)
#
# Architecture: VPS bot -> SSH tunnel -> Python FastAPI -> RTX 5070 Ti CUDA
# NO Node.js gateway. Direct Python CUDA on port 4000.
#
# Usage:
#   .\start-gpu-service.ps1              -- Start everything
#   .\start-gpu-service.ps1 -NoOllama    -- Skip Ollama tunnel
param(
    [switch]$NoOllama
)

$ErrorActionPreference = "Continue"
$VPS = "root@64.226.70.149"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$Host.UI.RawUI.WindowTitle = "Turbo-Bot GPU Service (RTX 5070 Ti)"

Write-Host ""
Write-Host "  TURBO-BOT GPU-ONLY SERVICE (PATCH #43)" -ForegroundColor Green
Write-Host "  RTX 5070 Ti @ 40% utilization" -ForegroundColor Green
Write-Host ""

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
        Write-Host "        Install: pip install torch --index-url https://download.pytorch.org/whl/cu124" -ForegroundColor DarkGray
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

try {
    $sshCheck = ssh -o ConnectTimeout=5 -o BatchMode=yes $VPS "echo OK" 2>&1
    if ($sshCheck -match "OK") {
        Write-Host "[OK] SSH to VPS ($VPS)" -ForegroundColor Green
    } else { throw "SSH failed" }
} catch {
    Write-Host "[ERROR] Cannot SSH to $VPS" -ForegroundColor Red
}

Write-Host ""

$bgProcesses = @()

function Stop-AllServices {
    Write-Host "
[STOP] Shutting down all services..." -ForegroundColor Yellow
    foreach ($p in $script:bgProcesses) {
        if (-not $p.HasExited) {
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        Where-Object { $_ -gt 0 } |
        ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Write-Host "[DONE] All services stopped." -ForegroundColor Green
}

Register-EngineEvent PowerShell.Exiting -Action { Stop-AllServices } -ErrorAction SilentlyContinue | Out-Null

# STEP 1: Python CUDA Service (port 4000)
Write-Host "[1/3] Starting Python CUDA Service (port 4000)..." -ForegroundColor Cyan

Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    Where-Object { $_ -gt 0 } |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; Write-Host "  Killed old PID $_ on port 4000" -ForegroundColor DarkGray }

$cudaProc = Start-Process -FilePath "python" -ArgumentList "gpu-cuda-service.py" -WorkingDirectory $scriptDir -PassThru -WindowStyle Hidden
$bgProcesses += $cudaProc
Write-Host "  PID: $($cudaProc.Id)" -ForegroundColor DarkGray

Write-Host "  Waiting for GPU initialization (up to 60s)..." -ForegroundColor DarkGray
$cudaReady = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    try {
        $h = (Invoke-WebRequest -Uri http://localhost:4000/health -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop).Content | ConvertFrom-Json
        if ($h.status -eq "online") {
            $cudaReady = $true
            Write-Host "[OK] GPU CUDA: $($h.gpu.device) | VRAM: $($h.gpu.vram_total_gb)GB" -ForegroundColor Green
            break
        }
    } catch {}
}
if (-not $cudaReady) {
    Write-Host "[ERROR] CUDA service did not start in 60s!" -ForegroundColor Red
}

# STEP 2: SSH Tunnel - GPU (VPS:4001 -> Local:4000)
Write-Host ""
Write-Host "[2/3] Opening SSH tunnel: VPS:4001 -> Local:4000 (GPU)..." -ForegroundColor Cyan
$gpuTunnel = Start-Process -FilePath "ssh" -ArgumentList "-R 4001:127.0.0.1:4000 $VPS -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes" -PassThru -WindowStyle Hidden
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

# Status summary
Write-Host ""
Write-Host "  GPU-ONLY SERVICE RUNNING (PATCH #43)" -ForegroundColor Green
Write-Host "  Python CUDA:    http://localhost:4000  (RTX 5070 Ti @ 40%)" -ForegroundColor White
Write-Host "  GPU Tunnel:     VPS:4001 -> Local:4000" -ForegroundColor White
if (-not $NoOllama) {
    Write-Host "  Ollama Tunnel:  VPS:11434 -> Local:11434" -ForegroundColor White
}
Write-Host "  VPS Bot:        http://64.226.70.149:3001" -ForegroundColor White
Write-Host "  Dashboard:      http://64.226.70.149:8080" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C to stop all services" -ForegroundColor DarkGray
Write-Host ""

# Keep alive - monitor processes
try {
    while ($true) {
        Start-Sleep -Seconds 30
        $dead = $bgProcesses | Where-Object { $_.HasExited }
        foreach ($d in $dead) {
            Write-Host "[WARN] Process PID $($d.Id) died - restarting..." -ForegroundColor Yellow
            if ($d.Id -eq $cudaProc.Id) {
                $cudaProc = Start-Process -FilePath "python" -ArgumentList "gpu-cuda-service.py" -WorkingDirectory $scriptDir -PassThru -WindowStyle Hidden
                $bgProcesses = @($bgProcesses | Where-Object { $_.Id -ne $d.Id }) + $cudaProc
                Write-Host "  Restarted CUDA (PID: $($cudaProc.Id))" -ForegroundColor Green
            }
            elseif ($d.Id -eq $gpuTunnel.Id) {
                $gpuTunnel = Start-Process -FilePath "ssh" -ArgumentList "-R 4001:127.0.0.1:4000 $VPS -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes" -PassThru -WindowStyle Hidden
                $bgProcesses = @($bgProcesses | Where-Object { $_.Id -ne $d.Id }) + $gpuTunnel
                Write-Host "  Restarted GPU tunnel (PID: $($gpuTunnel.Id))" -ForegroundColor Green
            }
            elseif (-not $NoOllama -and $d.Id -eq $ollamaTunnel.Id) {
                $ollamaTunnel = Start-Process -FilePath "ssh" -ArgumentList "-R 11434:127.0.0.1:11434 $VPS -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes" -PassThru -WindowStyle Hidden
                $bgProcesses = @($bgProcesses | Where-Object { $_.Id -ne $d.Id }) + $ollamaTunnel
                Write-Host "  Restarted Ollama tunnel (PID: $($ollamaTunnel.Id))" -ForegroundColor Green
            }
        }
    }
} finally {
    Stop-AllServices
}
