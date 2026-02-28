# 🚀 48H SIMULATION - QUICK COMMAND REFERENCE

**Deployment Active Since:** 2026-02-09 21:56:04  
**Ends:** 2026-02-11 21:57:27

---

## ⚡ INSTANT STATUS CHECK

```powershell
# ONE-LINER: Full Status
Get-Process node -EA 0 | Format-Table Id,StartTime,CPU,@{N='Mem(MB)';E={[math]::Round($_.WS/1MB,2)}} -Auto; Get-Job Bot48hMonitoring

# Portfolio + Trades (from logs)
$l = Get-ChildItem logs -Filter "*.log" | Sort LastWriteTime -Desc | Select -First 1 | Get-Content -Tail 100 | Out-String; [regex]::Match($l,'Portfolio: \$?([\d,\.]+)').Groups[1].Value; [regex]::Match($l,'Trades: (\d+)').Groups[1].Value

# Monitoring Output (Last 3 checks)
Receive-Job Bot48hMonitoring -Keep | Select -Last 3
```

---

## 📊 VIEW MONITORING LOG

```powershell
# Tail live
Get-Content logs\monitoring_20260209_215604.log -Wait

# Last 10 lines
Get-Content logs\monitoring_20260209_215604.log -Tail 10

# Search for alerts
Get-Content logs\monitoring_20260209_215604.log | Select-String "ALERT"
```

---

## 🧠 CHECK ML PROGRESS

```powershell
# Check ML phase from recent logs
$logs = Get-ChildItem logs -Filter "*.log" | Sort LastWriteTime -Desc | Select -First 1
Get-Content $logs.FullName -Tail 200 | Select-String -Pattern "Learning Phase|WARMUP|AUTONOMOUS|Confidence"
```

---

## 🔄 IF BOT CRASHED - RESTART

```powershell
# 1. Verify bot stopped
Get-Process node -EA 0

# 2. Restart with same config
cd C:\Users\dudzi\turbo-bot-local
$env:NODE_ENV="production"; $env:TRADING_MODE="simulation"; $env:MODE="simulation"; $env:ML_ENABLED="true"; $env:REDIS_ENABLED="false"
npx ts-node --transpile-only trading-bot\autonomous_trading_bot_final.ts
```

---

## 🛑 EMERGENCY STOP

```powershell
# Stop bot
Get-Process node | Stop-Process -Force

# Stop monitoring
Remove-Job Bot48hMonitoring -Force

# Check all stopped
Get-Process node -EA 0; Get-Job
```

---

## 📈 PERFORMANCE SNAPSHOT

```powershell
# Create quick report
$log = Get-ChildItem logs -Filter "*.log" | Sort LastWriteTime -Desc | Select -First 1 | Get-Content -Tail 200 | Out-String
Write-Host "`n=== PERFORMANCE SNAPSHOT ===" -Fore Cyan
Write-Host "Portfolio: `$$([regex]::Match($log,'Portfolio: \$?([\d,\.]+)').Groups[1].Value)" -Fore Green
Write-Host "Trades: $([regex]::Match($log,'Trades: (\d+)').Groups[1].Value)" -Fore Yellow
Write-Host "Health: $([regex]::Match($log,'Health: (\w+)').Groups[1].Value)" -Fore Magenta
Write-Host "Processes: $(Get-Process node -EA 0 | Measure | Select -Exp Count)" -Fore White
Write-Host "Memory: $([math]::Round((Get-Process node -EA 0 | Measure WorkingSet64 -Sum).Sum/1MB,1))MB" -Fore Gray
Write-Host "========================`n" -Fore Cyan
```

---

## 🕐 TIME TRACKING

```powershell
# Time elapsed/remaining
$start = [DateTime]"2026-02-09 21:56:04"
$end = [DateTime]"2026-02-11 21:57:27"
$now = Get-Date
$elapsed = ($now - $start).TotalHours
$remaining = ($end - $now).TotalHours
Write-Host "Elapsed: $([math]::Round($elapsed,1))h / 48h" -Fore Green
Write-Host "Remaining: $([math]::Round($remaining,1))h" -Fore Yellow
Write-Host "Progress: $([math]::Round($elapsed/48*100,1))%" -Fore Cyan
```

---

## 🔔 SET CUSTOM ALERT

```powershell
# Check every 30min and alert if bot stopped
while ($true) {
    $procs = Get-Process node -EA 0
    if (-not $procs) {
        Write-Host "`n!!! ALERT: BOT STOPPED !!!`n" -Fore Red -Back Yellow
        # Add notification here (email, sound, etc.)
    } else {
        Write-Host "[$(Get-Date -F 'HH:mm:ss')] Bot OK - $($procs.Count) processes" -Fore Green
    }
    Start-Sleep -Seconds 1800  # 30 minutes
}
```

---

## 📁 ACCESS FULL LOGS

```powershell
# Open log directory
explorer.exe logs

# List all logs
Get-ChildItem logs -Filter "*.log" | Sort LastWriteTime -Desc | Format-Table Name,LastWriteTime,@{N='Size(KB)';E={[math]::Round($_.Length/1KB,1)}}

# View specific log
notepad logs\monitoring_20260209_215604.log
```

---

## 🎯 QUICK HEALTH CHECK

```powershell
# Run this anytime for instant health verification
function Quick-BotHealth {
    Write-Host "`n🔍 QUICK HEALTH CHECK" -Fore Cyan
    Write-Host "===================" -Fore Gray
    
    # Processes
    $procs = Get-Process node -EA 0
    if ($procs) {
        Write-Host "✅ Bot: RUNNING ($($procs.Count) processes)" -Fore Green
    } else {
        Write-Host "❌ Bot: STOPPED" -Fore Red
    }
    
    # Monitoring
    $job = Get-Job Bot48hMonitoring -EA 0
    if ($job -and $job.State -eq 'Running') {
        Write-Host "✅ Monitoring: ACTIVE" -Fore Green
    } else {
        Write-Host "❌ Monitoring: INACTIVE" -Fore Red
    }
    
    # Memory
    if ($procs) {
        $mem = [math]::Round(($procs | Measure WorkingSet64 -Sum).Sum/1MB,1)
        $status = if ($mem -lt 300) { "Normal" } elseif ($mem -lt 500) { "Elevated" } else { "HIGH" }
        Write-Host "📊 Memory: ${mem}MB ($status)" -Fore $(if ($mem -gt 500) { "Red" } else { "Green" })
    }
    
    # Time
    $start = [DateTime]"2026-02-09 21:56:04"
    $elapsed = [math]::Round(((Get-Date) - $start).TotalHours,1)
    Write-Host "⏱️  Runtime: ${elapsed}h / 48h" -Fore Yellow
    
    Write-Host "===================`n" -Fore Gray
}

# Run it
Quick-BotHealth
```

---

## 💾 SAVE FUNCTION TO PROFILE (Optional)

```powershell
# Add Quick-BotHealth to your PowerShell profile for permanent access
Add-Content $PROFILE -Value @'

function Quick-BotHealth {
    # ... (copy full function from above) ...
}
'@

# Then use it anytime with just:
# Quick-BotHealth
```

---

**💡 TIP:** Bookmark this file for instant command access during the 48h period!

---

## 🆘 EMERGENCY CONTACTS

- **Deployment Log:** `DEPLOYMENT_STATUS_48H.md`
- **Full Guide:** `QUICK_START_WINDOWS.md`
- **Simulation Guide:** `SIMULATION_DEPLOYMENT_GUIDE.md`
- **Project Instructions:** `.github/copilot-instructions.md`

---

**Last Updated:** 2026-02-09 22:00:00
