# 🔄 WAIT AND AUTO-START - Monitor npm install and launch bot automatically

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AUTONOMOUS BOT - SMART AUTO-STARTER  " -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$maxWaitMinutes = 10
$checkInterval = 15  # seconds
$maxChecks = ($maxWaitMinutes * 60) / $checkInterval
$checkCount = 0

Write-Host "Waiting for npm install to complete..." -ForegroundColor Yellow
Write-Host "Max wait time: $maxWaitMinutes minutes" -ForegroundColor Gray
Write-Host "Check interval: $checkInterval seconds`n" -ForegroundColor Gray

while ($checkCount -lt $maxChecks) {
    $checkCount++
    $elapsed = $checkCount * $checkInterval
    $elapsedMin = [math]::Floor($elapsed / 60)
    $elapsedSec = $elapsed % 60
    
    # Check if key packages are installed
    $dotenvExists = Test-Path "node_modules/dotenv"
    $tsNodeExists = Test-Path "node_modules/ts-node"
    $expressExists = Test-Path "node_modules/express"
    $typescriptExists = Test-Path "node_modules/typescript"
    
    if ($dotenvExists -and $tsNodeExists -and $expressExists -and $typescriptExists) {
        Write-Host "`n✅ SUCCESS! All dependencies installed!" -ForegroundColor Green
        
        # Count total packages
        $packageCount = (Get-ChildItem node_modules -Directory -ErrorAction SilentlyContinue).Count
        Write-Host "   Total packages: $packageCount" -ForegroundColor Cyan
        Write-Host "   Time elapsed: $elapsedMin minutes $elapsedSec seconds`n" -ForegroundColor Gray
        
        # Small delay before launch
        Write-Host "Starting bot in 3 seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        
        # LAUNCH BOT using the auto-start script
        Write-Host "`n========================================" -ForegroundColor Cyan
        Write-Host "  LAUNCHING BOT NOW...                 " -ForegroundColor Green
        Write-Host "========================================`n" -ForegroundColor Cyan
        
        & ".\start_bot_auto.ps1"
        
        exit 0
    }
    
    # Show progress
    $dots = "." * ($checkCount % 4)
    Write-Host "`r[Check $checkCount/$maxChecks] Waiting$dots " -NoNewline -ForegroundColor Yellow
    Write-Host "($elapsedMin m $elapsedSec s)" -NoNewline -ForegroundColor Gray
    
    Start-Sleep -Seconds $checkInterval
}

# Timeout reached
Write-Host "`n`n❌ TIMEOUT: Installation did not complete in $maxWaitMinutes minutes" -ForegroundColor Red
Write-Host "`nPossible solutions:" -ForegroundColor Yellow
Write-Host "1. Check if npm install is still running: Get-Process npm" -ForegroundColor White
Write-Host "2. Manually run: npm install" -ForegroundColor White
Write-Host "3. Check network connection" -ForegroundColor White
Write-Host "4. Try: npm install --verbose (to see detailed progress)" -ForegroundColor White

exit 1
