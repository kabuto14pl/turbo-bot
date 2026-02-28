# ================================================================================
# 48-HOUR SIMULATION MONITORING SCRIPT
# ================================================================================
# Purpose: Monitor autonomous trading bot during 48h simulation deployment
# Created: 2026-02-09
# Requirements: Bot running in background terminal
# ================================================================================

param(
    [string]$LogFile = "logs\simulation_48h_$(Get-Date -Format 'yyyyMMdd_HHmmss').log",
    [int]$CheckIntervalMinutes = 15,
    [int]$DurationHours = 48,
    [string]$BotProcessName = "node"
)

# Configuration
$StartTime = Get-Date
$EndTime = $StartTime.AddHours($DurationHours)
$ReportFile = "reports\simulation_48h_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').md"
$HealthCheckInterval = $CheckIntervalMinutes * 60  # Convert to seconds

# Create directories if they don't exist
New-Item -ItemType Directory -Force -Path (Split-Path $LogFile) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $ReportFile) | Out-Null

# ================================================================================
# HELPER FUNCTIONS
# ================================================================================

function Write-MonitorLog {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Console output with color
    switch ($Level) {
        "ERROR"   { Write-Host $logEntry -ForegroundColor Red }
        "WARN"    { Write-Host $logEntry -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logEntry -ForegroundColor Green }
        "INFO"    { Write-Host $logEntry -ForegroundColor Cyan }
        default   { Write-Host $logEntry }
    }
    
    # File output
    Add-Content -Path $LogFile -Value $logEntry
}

function Get-BotProcessInfo {
    $processes = Get-Process -Name $BotProcessName -ErrorAction SilentlyContinue
    
    if (-not $processes) {
        return $null
    }
    
    $totalCPU = ($processes | Measure-Object -Property CPU -Sum).Sum
    $totalMemoryMB = ($processes | Measure-Object -Property WorkingSet64 -Sum).Sum / 1MB
    $processCount = $processes.Count
    
    return @{
        Count = $processCount
        TotalCPU = [math]::Round($totalCPU, 2)
        TotalMemoryMB = [math]::Round($totalMemoryMB, 2)
        Processes = $processes
    }
}

function Get-TradingMetrics {
    # Try to fetch metrics from bot API if available
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/status" -Method Get -TimeoutSec 5
        return $response
    } catch {
        # Fallback: Parse from latest log file
        $latestLog = Get-ChildItem -Path "logs" -Filter "*.log" -ErrorAction SilentlyContinue | 
                     Sort-Object LastWriteTime -Descending | 
                     Select-Object -First 1
        
        if ($latestLog) {
            $logContent = Get-Content $latestLog.FullName -Tail 100 | Out-String
            
            # Extract metrics using regex
            $portfolioMatch = $logContent | Select-String -Pattern 'Portfolio: \$?([\d,\.]+)'
            $tradesMatch = $logContent | Select-String -Pattern 'Trades: (\d+)'
            $healthMatch = $logContent | Select-String -Pattern 'Health: (\w+)'
            
            return @{
                Portfolio = if ($portfolioMatch) { $portfolioMatch.Matches[0].Groups[1].Value } else { "N/A" }
                Trades = if ($tradesMatch) { $tradesMatch.Matches[0].Groups[1].Value } else { 0 }
                Health = if ($healthMatch) { $healthMatch.Matches[0].Groups[1].Value } else { "unknown" }
                Source = "log_file"
            }
        }
        
        return @{
            Portfolio = "N/A"
            Trades = 0
            Health = "unknown"
            Source = "unavailable"
        }
    }
}

function Send-Alert {
    param(
        [string]$Subject,
        [string]$Message,
        [string]$Severity = "WARNING"
    )
    
    Write-MonitorLog "🚨 ALERT: $Subject - $Message" -Level "WARN"
    
    # TODO: Add email/Slack/Discord notification integration if needed
    # For now, just write to alert log
    $alertEntry = @"
================================================================================
ALERT: $Severity
Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Subject: $Subject
Message: $Message
================================================================================

"@
    Add-Content -Path "logs\alerts_48h.log" -Value $alertEntry
}

function Write-ProgressReport {
    param([hashtable]$BotInfo, [hashtable]$Metrics)
    
    $elapsed = (Get-Date) - $StartTime
    $remaining = $EndTime - (Get-Date)
    $progressPercent = [math]::Round(($elapsed.TotalHours / $DurationHours) * 100, 2)
    
    $report = @"

================================================================================
📊 48H SIMULATION PROGRESS REPORT
================================================================================
⏰ Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
📈 Progress: $progressPercent% ($($elapsed.Hours)h $($elapsed.Minutes)m / ${DurationHours}h)
⏳ Remaining: $($remaining.Hours)h $($remaining.Minutes)m

🤖 BOT STATUS:
   Processes Running: $($BotInfo.Count)
   Total CPU Time: $($BotInfo.TotalCPU)s
   Total Memory: $($BotInfo.TotalMemoryMB) MB

💰 TRADING METRICS:
   Portfolio Value: `$$($Metrics.Portfolio)
   Total Trades: $($Metrics.Trades)
   System Health: $($Metrics.Health)
   Data Source: $($Metrics.Source)

================================================================================

"@
    
    Write-Host $report -ForegroundColor Cyan
    Add-Content -Path $LogFile -Value $report
}

function Generate-FinalReport {
    param([datetime]$ActualEndTime)
    
    $duration = $ActualEndTime - $StartTime
    $finalMetrics = Get-TradingMetrics
    
    $report = @"
# 48-HOUR SIMULATION FINAL REPORT

**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## ⏱️ Execution Summary

- **Start Time:** $($StartTime.ToString('yyyy-MM-dd HH:mm:ss'))
- **End Time:** $($ActualEndTime.ToString('yyyy-MM-dd HH:mm:ss'))
- **Total Duration:** $($duration.Hours)h $($duration.Minutes)m $($duration.Seconds)s
- **Planned Duration:** ${DurationHours}h
- **Completion:** $(if ($duration.TotalHours -ge $DurationHours) { "✅ FULL" } else { "⚠️ PARTIAL" })

## 💰 Trading Performance

- **Initial Portfolio:** `$10,000.00
- **Final Portfolio:** `$$($finalMetrics.Portfolio)
- **Total Trades:** $($finalMetrics.Trades)
- **P&L:** `$(if ($finalMetrics.Portfolio -ne "N/A") { [math]::Round([double]$finalMetrics.Portfolio - 10000, 2) } else { "N/A" })
- **Final Health:** $($finalMetrics.Health)

## 🧠 ML System Performance

- **ML System:** Enterprise FAZA 1-5 (PPO Algorithm)
- **Initial Phase:** WARMUP (15% confidence threshold)
- **Learning Progression:** WARMUP → LEARNING → AUTONOMOUS
- **TensorFlow Backend:** CPU (browser backend)

## 🔧 Configuration

- **Mode:** SIMULATION
- **ML Enabled:** true
- **Redis:** DISABLED (simulation mode)
- **Check Interval:** ${CheckIntervalMinutes} minutes
- **Node.js Version:** $(node --version)

## 📝 Notes

- Full detailed logs available in: ``$LogFile``
- Alert log: ``logs\alerts_48h.log``
- Bot monitoring performed every $CheckIntervalMinutes minutes

---
*Report generated by monitor_48h_simulation.ps1*
"@
    
    Set-Content -Path $ReportFile -Value $report
    Write-MonitorLog "📄 Final report generated: $ReportFile" -Level "SUCCESS"
    Write-Host "`n$report`n" -ForegroundColor Green
}

# ================================================================================
# MAIN MONITORING LOOP
# ================================================================================

Write-MonitorLog "🚀 Starting 48-hour simulation monitoring" -Level "SUCCESS"
Write-MonitorLog "📊 Configuration: Check every ${CheckIntervalMinutes}min, Duration ${DurationHours}h" -Level "INFO"
Write-MonitorLog "📝 Log file: $LogFile" -Level "INFO"
Write-MonitorLog "📄 Report file: $ReportFile" -Level "INFO"
Write-MonitorLog "⏰ Start: $($StartTime.ToString('yyyy-MM-dd HH:mm:ss'))" -Level "INFO"
Write-MonitorLog "🏁 Expected end: $($EndTime.ToString('yyyy-MM-dd HH:mm:ss'))" -Level "INFO"

$checkCount = 0
$alertsSent = 0

try {
    while ((Get-Date) -lt $EndTime) {
        $checkCount++
        
        Write-MonitorLog "🔍 Health check #$checkCount" -Level "INFO"
        
        # Check bot process
        $botInfo = Get-BotProcessInfo
        
        if (-not $botInfo) {
            Send-Alert -Subject "Bot Process Stopped" `
                      -Message "No Node.js processes found. Bot may have crashed!" `
                      -Severity "CRITICAL"
            $alertsSent++
            
            # Wait a bit and recheck before giving up
            Start-Sleep -Seconds 30
            $botInfo = Get-BotProcessInfo
            
            if (-not $botInfo) {
                Write-MonitorLog "🚨 CRITICAL: Bot confirmed stopped. Ending monitoring." -Level "ERROR"
                break
            }
        }
        
        # Get trading metrics
        $metrics = Get-TradingMetrics
        
        # Check for anomalies
        if ($metrics.Health -eq "unhealthy") {
            Send-Alert -Subject "Bot Health Degraded" `
                      -Message "Bot reports unhealthy status. Check logs immediately." `
                      -Severity "HIGH"
            $alertsSent++
        }
        
        # Memory check (alert if >500MB)
        if ($botInfo.TotalMemoryMB -gt 500) {
            Send-Alert -Subject "High Memory Usage" `
                      -Message "Bot using $($botInfo.TotalMemoryMB)MB memory. Potential memory leak?" `
                      -Severity "MEDIUM"
            $alertsSent++
        }
        
        # Progress report
        Write-ProgressReport -BotInfo $botInfo -Metrics $metrics
        
        # Wait for next check
        $remainingTime = $EndTime - (Get-Date)
        if ($remainingTime.TotalSeconds -gt 0) {
            $sleepSeconds = [math]::Min($HealthCheckInterval, $remainingTime.TotalSeconds)
            Write-MonitorLog "💤 Sleeping for $([math]::Round($sleepSeconds/60, 1)) minutes until next check..." -Level "INFO"
            Start-Sleep -Seconds $sleepSeconds
        }
    }
    
    Write-MonitorLog "🏁 48-hour monitoring period completed!" -Level "SUCCESS"
    Write-MonitorLog "📊 Total checks performed: $checkCount" -Level "INFO"
    Write-MonitorLog "🚨 Total alerts sent: $alertsSent" -Level "INFO"
    
} catch {
    Write-MonitorLog "❌ Monitoring error: $($_.Exception.Message)" -Level "ERROR"
    Send-Alert -Subject "Monitoring Script Error" `
              -Message "Exception: $($_.Exception.Message)" `
              -Severity "CRITICAL"
} finally {
    # Generate final report
    Generate-FinalReport -ActualEndTime (Get-Date)
    Write-MonitorLog "✅ Monitoring script completed" -Level "SUCCESS"
}
