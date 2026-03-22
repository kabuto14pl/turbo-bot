# ============================================================================
# TURBO-BOT — Start Local GPU + Ollama Services (Windows)
# PATCH #149H: Simple toggle to start GPU and Ollama locally
#
# Usage:
#   .\start-local-services.ps1               # Start both
#   .\start-local-services.ps1 -Mode gpu     # GPU only
#   .\start-local-services.ps1 -Mode ollama  # Ollama only
#   .\start-local-services.ps1 -Mode status  # Check status
#   .\start-local-services.ps1 -Mode stop    # Stop services
# ============================================================================
param(
    [ValidateSet('all','gpu','ollama','status','stop')]
    [string]$Mode = 'all'
)

$GPU_PORT = 4001
$OLLAMA_PORT = 11434
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-GpuService {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:${GPU_PORT}/ping" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  GPU Service: ONLINE (port $GPU_PORT)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  GPU Service: OFFLINE (port $GPU_PORT)" -ForegroundColor Red
        return $false
    }
}

function Test-Ollama {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:${OLLAMA_PORT}/api/tags" -TimeoutSec 2 -ErrorAction Stop
        $data = $r.Content | ConvertFrom-Json
        $models = ($data.models | ForEach-Object { $_.name }) -join ', '
        Write-Host "  Ollama: ONLINE (port $OLLAMA_PORT) | Models: $models" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  Ollama: OFFLINE (port $OLLAMA_PORT)" -ForegroundColor Red
        return $false
    }
}

function Start-GpuService {
    Write-Host "`nStarting GPU CUDA Service on port $GPU_PORT..." -ForegroundColor Cyan
    
    if (Test-GpuService) {
        Write-Host "  Already running" -ForegroundColor Yellow
        return
    }
    
    $gpuScript = Join-Path $ScriptDir "gpu-cuda-service.py"
    if (-not (Test-Path $gpuScript)) {
        Write-Host "  gpu-cuda-service.py not found at: $gpuScript" -ForegroundColor Red
        return
    }
    
    $env:GPU_PORT = $GPU_PORT
    $proc = Start-Process -FilePath "python" -ArgumentList $gpuScript -PassThru -WindowStyle Minimized
    Write-Host "  GPU Service started (PID: $($proc.Id))" -ForegroundColor Green
    
    Write-Host "  Waiting for startup..." -NoNewline
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline
        try {
            Invoke-WebRequest -Uri "http://127.0.0.1:${GPU_PORT}/ping" -TimeoutSec 1 -ErrorAction Stop | Out-Null
            Write-Host ""
            
            $health = (Invoke-WebRequest -Uri "http://127.0.0.1:${GPU_PORT}/health" -TimeoutSec 2).Content | ConvertFrom-Json
            Write-Host "  Backend: $($health.backend)" -ForegroundColor Cyan
            return
        } catch {}
    }
    Write-Host "`n  GPU Service failed to start" -ForegroundColor Red
}

function Start-OllamaService {
    Write-Host "`nChecking Ollama on port $OLLAMA_PORT..." -ForegroundColor Cyan
    
    if (Test-Ollama) {
        Write-Host "  Already running" -ForegroundColor Yellow
        return
    }
    
    if (Get-Command ollama -ErrorAction SilentlyContinue) {
        Write-Host "  Starting Ollama serve..."
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Minimized
        
        Write-Host "  Waiting for Ollama..." -NoNewline
        for ($i = 0; $i -lt 20; $i++) {
            Start-Sleep -Seconds 1
            Write-Host "." -NoNewline
            try {
                $r = Invoke-WebRequest -Uri "http://127.0.0.1:${OLLAMA_PORT}/api/tags" -TimeoutSec 1 -ErrorAction Stop
                Write-Host ""
                Write-Host "  Ollama started" -ForegroundColor Green
                
                $model = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { "qwen3:14b" }
                $data = $r.Content | ConvertFrom-Json
                $hasModel = $data.models | Where-Object { $_.name -like "*$model*" }
                if (-not $hasModel) {
                    Write-Host "  Model '$model' not found. Pulling..." -ForegroundColor Yellow
                    & ollama pull $model
                }
                return
            } catch {}
        }
        Write-Host "`n  Ollama failed to start" -ForegroundColor Red
    } else {
        Write-Host "  Ollama not installed. Download: https://ollama.com/download" -ForegroundColor Red
    }
}

function Show-Status {
    Write-Host "`n  TURBO-BOT Local Services Status" -ForegroundColor Cyan
    Write-Host "  ================================" -ForegroundColor Cyan
    Test-GpuService | Out-Null
    Test-Ollama | Out-Null
    Write-Host "`n  Env variables for local mode:" -ForegroundColor Cyan
    Write-Host "    GPU_LOCAL_MODE=true"
    Write-Host "    OLLAMA_LOCAL_MODE=true"
    Write-Host "`n  Fallback when PC is off:" -ForegroundColor Cyan
    Write-Host "    GPU -> CPU fallback (built-in)"
    Write-Host "    Ollama -> next LLM provider chain"
}

# ── MAIN ──
switch ($Mode) {
    'gpu'    { Start-GpuService }
    'ollama' { Start-OllamaService }
    'status' { Show-Status }
    'stop'   { Write-Host "Stop GPU/Ollama manually from Task Manager" -ForegroundColor Yellow }
    'all'    { Start-GpuService; Start-OllamaService; Show-Status }
}
