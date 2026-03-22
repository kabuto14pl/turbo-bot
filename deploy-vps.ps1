# ═══════════════════════════════════════════════════════════
# Turbo-Bot v6.0.0 — Direct VPS Deploy (no git)
# Wysyła zmienione pliki przez SCP i restartuje bota
# Użycie: .\deploy-vps.ps1 [-All] [-Restart] [-LogsAfter <seconds>]
# ═══════════════════════════════════════════════════════════

param(
    [switch]$All,          # Deploy ALL source files (not just changed)
    [switch]$Restart,      # Auto-restart PM2 after deploy
    [switch]$LogsOnly,     # Only show logs, no deploy
    [int]$LogsAfter = 10,  # Seconds to wait before showing logs after restart
    [int]$LogLines = 50    # Number of log lines to show
)

$VPS = "root@64.226.70.149"
$VPS_PATH = "/root/turbo-bot"
$LOCAL_PATH = $PSScriptRoot

# Core files that are most commonly changed
$CORE_FILES = @(
    "trading-bot/src/modules/bot.js",
    "trading-bot/src/core/ai/neuron_ai_manager.js",
    "trading-bot/src/core/ai/quantum_gpu_sim.js",
    "trading-bot/src/modules/strategy-runner.js",
    "trading-bot/src/modules/ensemble-voting.js",
    "trading-bot/src/modules/execution-engine.js",
    "trading-bot/src/core/ai/hybrid_quantum_pipeline.js",
    "trading-bot/src/modules/indicators.js",
    "trading-bot/src/modules/mtf-confluence.js"
)

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  TURBO-BOT v6.0.0 — VPS DEPLOY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Logs only mode
if ($LogsOnly) {
    Write-Host "[LOGS] Pobieranie logów z VPS..." -ForegroundColor Yellow
    ssh $VPS "pm2 logs turbo-bot --lines $LogLines --nostream"
    exit 0
}

# Detect changed files via git
if (-not $All) {
    Write-Host "[DETECT] Szukam zmienionych plików..." -ForegroundColor Yellow
    $changed = git diff --name-only HEAD 2>$null
    $staged = git diff --cached --name-only 2>$null
    $untracked = git ls-files --others --exclude-standard 2>$null
    
    # Combine all changes
    $allChanged = @()
    if ($changed) { $allChanged += $changed }
    if ($staged) { $allChanged += $staged }
    
    # Filter to only source files
    $deployFiles = $allChanged | Where-Object { 
        $_ -match "^trading-bot/" -or $_ -match "\.js$" -or $_ -match "\.json$"
    } | Sort-Object -Unique
    
    if ($deployFiles.Count -eq 0) {
        Write-Host "[INFO] Brak zmienionych plików. Użyj -All aby wysłać wszystkie core files." -ForegroundColor Yellow
        
        # Fallback: deploy core files
        Write-Host "[FALLBACK] Wysyłam core files..." -ForegroundColor Yellow
        $deployFiles = $CORE_FILES | Where-Object { Test-Path (Join-Path $LOCAL_PATH $_) }
    }
} else {
    Write-Host "[ALL] Wysyłam wszystkie core files..." -ForegroundColor Yellow
    $deployFiles = $CORE_FILES | Where-Object { Test-Path (Join-Path $LOCAL_PATH $_) }
}

# Deploy files
$success = 0
$failed = 0

foreach ($file in $deployFiles) {
    $localFile = Join-Path $LOCAL_PATH $file
    $remoteFile = "$VPS_PATH/$($file -replace '\\', '/')"
    
    if (Test-Path $localFile) {
        Write-Host "  [SCP] $file" -ForegroundColor Green -NoNewline
        try {
            scp -q $localFile "${VPS}:${remoteFile}" 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host " ✓" -ForegroundColor Green
                $success++
            } else {
                Write-Host " ✗" -ForegroundColor Red
                $failed++
            }
        } catch {
            Write-Host " ✗ $_" -ForegroundColor Red
            $failed++
        }
    } else {
        Write-Host "  [SKIP] $file (nie istnieje lokalnie)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "[DEPLOY] Wysłano: $success plików, błędy: $failed" -ForegroundColor $(if ($failed -gt 0) { "Yellow" } else { "Green" })

# Restart
if ($Restart -or $success -gt 0) {
    Write-Host ""
    Write-Host "[PM2] Restart turbo-bot..." -ForegroundColor Yellow
    ssh $VPS "cd $VPS_PATH && pm2 restart turbo-bot"
    
    if ($LogsAfter -gt 0) {
        Write-Host "[WAIT] Czekam ${LogsAfter}s na startup..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $LogsAfter
        Write-Host ""
        Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  STARTUP LOGS" -ForegroundColor Cyan  
        Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
        ssh $VPS "pm2 logs turbo-bot --lines $LogLines --nostream"
    }
}

Write-Host ""
Write-Host "[DONE] Deploy zakończony" -ForegroundColor Green
