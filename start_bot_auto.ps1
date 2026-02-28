# 🚀 AUTONOMOUS TRADING BOT - AUTO START SCRIPT (PowerShell)
# Automatyczne uruchomienie bota po zakończeniu instalacji

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  AUTONOMOUS TRADING BOT AUTO-STARTER  " -ForegroundColor Green  
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Check if we're in correct directory
$currentDir = Get-Location
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Not in project directory!" -ForegroundColor Red
    Write-Host "Please run from turbo-bot-local folder" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/5] Location verified: $currentDir" -ForegroundColor Green

# 2. Wait for npm install to complete
Write-Host "[2/5] Waiting for dependencies installation..." -ForegroundColor Cyan
$maxWait = 300 # 5 minutes max
$elapsed = 0
$interval = 10

while ($elapsed -lt $maxWait) {
    if (Test-Path "node_modules/dotenv" -and Test-Path "node_modules/express" -and Test-Path "node_modules/ts-node") {
        Write-Host "[2/5] Dependencies installed successfully!" -ForegroundColor Green
        break
    }
    
    Write-Host "  Waiting... ($elapsed/$maxWait seconds)" -ForegroundColor Yellow
    Start-Sleep -Seconds $interval
    $elapsed += $interval
}

if ($elapsed -ge $maxWait) {
    Write-Host "ERROR: Installation timeout!" -ForegroundColor Red
    Write-Host "Please run manually: npm install" -ForegroundColor Yellow
    exit 1
}

# 3. Count installed packages
$packageCount = (Get-ChildItem node_modules).Count
Write-Host "[3/5] Installed $packageCount packages" -ForegroundColor Cyan

# 4. Set environment variables
Write-Host "[4/5] Configuring simulation environment..." -ForegroundColor Cyan
$env:NODE_ENV = "production"
$env:TRADING_MODE = "simulation"
$env:MODE = "simulation"
$env:ML_ENABLED = "true"
$env:ML_RETRAIN_ENABLED = "true"
$env:ML_RETRAIN_INTERVAL = "3600000"  # 1 hour
$env:LOG_LEVEL = "info"

Write-Host "  NODE_ENV = $env:NODE_ENV" -ForegroundColor Gray
Write-Host "  TRADING_MODE = $env:TRADING_MODE" -ForegroundColor Gray
Write-Host "  ML_ENABLED = $env:ML_ENABLED" -ForegroundColor Gray

# 5. Create logs directory
if (-not (Test-Path "logs/simulation_48h")) {
    New-Item -ItemType Directory -Path "logs/simulation_48h" | Out-Null
    Write-Host "[5/5] Created logs directory" -ForegroundColor Green
} else {
    Write-Host "[5/5] Logs directory exists" -ForegroundColor Green
}

# LAUNCH BOT
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  LAUNCHING AUTONOMOUS TRADING BOT     " -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Mode: SIMULATION (safe, no real money)" -ForegroundColor Yellow
Write-Host "ML System: ENABLED with auto-retraining" -ForegroundColor Cyan
Write-Host "Features: Real market calculations (no random)" -ForegroundColor Cyan
Write-Host "Duration: 48 hours monitoring" -ForegroundColor Cyan
Write-Host "Entry Point: autonomous_trading_bot_final.ts`n" -ForegroundColor Gray

Write-Host "Starting bot... (press Ctrl+C to stop)`n" -ForegroundColor Green

# Execute bot with transpile-only (skip type checking for speed)
try {
    npx ts-node --transpile-only --project tsconfig.json trading-bot/autonomous_trading_bot_final.ts | Tee-Object -FilePath "logs/simulation_48h/bot_output.log"
} catch {
    Write-Host "`nERROR: Bot crashed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nCheck logs: logs/simulation_48h/bot_output.log" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  BOT STOPPED                          " -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan
