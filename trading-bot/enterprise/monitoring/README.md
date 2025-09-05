# 📊 Enterprise Monitoring System - Deployment Guide

## 🎯 Overview
Complete enterprise monitoring infrastructure for the Turbo Bot Deva Trading Platform with real-time performance tracking, system health monitoring, and automated alerting.

## 🏗️ System Architecture

### Core Components
1. **EnterprisePerformanceLogger** - Real-time trading performance metrics
2. **EnterpriseSystemHealthMonitor** - System resource and health monitoring  
3. **MonitoringController** - Unified monitoring coordination
4. **Automated Deployment** - Complete setup and configuration scripts

### Infrastructure
- **Database:** SQLite with enterprise-grade schemas
- **Metrics:** Prometheus integration for time-series data
- **Dashboards:** Grafana integration for visualization
- **Alerting:** Multi-channel notifications (webhook, email, Slack)
- **Automation:** Comprehensive startup and configuration scripts

## 🚀 Quick Start

### 1. Deploy Monitoring System
```bash
# Navigate to monitoring directory
cd /mnt/c/Users/katbo/Desktop/Turbo\ Bot\ Deva/trading-bot/enterprise/monitoring/

# Run automated deployment
./start_monitoring.sh --production

# Monitor deployment logs
tail -f ../../logs/monitoring_startup.log
```

### 2. Verify System Status
```bash
# Check process status
ps aux | grep monitoring

# Verify databases
ls -la ../../data/monitoring/

# Check configuration
ls -la ../../config/monitoring/
```

### 3. Access Monitoring Interfaces
- **Metrics Endpoint:** http://localhost:9090/metrics
- **Health Check:** http://localhost:9090/health
- **Dashboard API:** http://localhost:3001/api/monitoring
- **WebSocket:** ws://localhost:8080/monitoring

## 📊 Monitoring Features

### Performance Metrics
- **Portfolio Value:** Real-time portfolio tracking
- **Risk Metrics:** Sharpe ratio, VaR, maximum drawdown
- **Trading Analytics:** Win rate, profit factor, trade frequency
- **Execution Quality:** Slippage, latency, order fill rates

### System Health
- **Resource Monitoring:** CPU, Memory, Disk usage
- **Network Connectivity:** Exchange connections, latency monitoring
- **Process Health:** Trading bot, database, webserver status
- **Security Monitoring:** Failed logins, certificate expiry

### Alert System
- **Multi-Severity Levels:** Critical, High, Medium, Low
- **Category-Based:** Performance, Resource, Connectivity, Security
- **Real-time Notifications:** Immediate alert delivery
- **Escalation Management:** Automatic escalation workflows

## 🗄️ Database Schema

### Performance Metrics Table
```sql
CREATE TABLE performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    portfolioValue REAL NOT NULL,
    sharpeRatio REAL NOT NULL,
    maxDrawdown REAL NOT NULL,
    winRate REAL NOT NULL,
    totalTrades INTEGER NOT NULL,
    var95 REAL NOT NULL,
    var99 REAL NOT NULL,
    -- ... additional metrics
);
```

### System Health Table
```sql
CREATE TABLE health_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    systemHealth TEXT NOT NULL,
    cpuUsage REAL NOT NULL,
    memoryUsage REAL NOT NULL,
    diskUsage REAL NOT NULL,
    networkLatency REAL NOT NULL,
    activeAlerts INTEGER NOT NULL
);
```

### Alerts Table
```sql
CREATE TABLE alerts (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    severity TEXT NOT NULL,
    category TEXT NOT NULL,
    component TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    resolvedAt TEXT,
    assignee TEXT
);
```

## ⚙️ Configuration

### Performance Logger Config
```json
{
  "database": {
    "path": "../../data/monitoring/performance_metrics.db",
    "retentionDays": 365
  },
  "prometheus": {
    "enabled": true,
    "port": 9090,
    "endpoint": "/metrics"
  },
  "alerting": {
    "enabled": true,
    "conditions": [
      {
        "metricName": "maxDrawdown",
        "threshold": 20,
        "operator": ">",
        "severity": "HIGH",
        "description": "Maximum drawdown exceeded 20%",
        "enabled": true
      }
    ]
  }
}
```

### Health Monitor Config
```json
{
  "monitoring": {
    "intervalSeconds": 60,
    "enabledChecks": ["cpu", "memory", "disk", "network", "processes"],
    "thresholds": {
      "cpu": { "warning": 70, "critical": 90 },
      "memory": { "warning": 80, "critical": 95 },
      "disk": { "warning": 85, "critical": 95 }
    }
  },
  "alerts": {
    "enabled": true,
    "webhookUrl": "https://hooks.slack.com/...",
    "emailConfig": {
      "smtp": "smtp.gmail.com",
      "from": "monitoring@turbobotdeva.com",
      "to": ["admin@turbobotdeva.com"]
    }
  }
}
```

## 📈 Usage Examples

### Manual Performance Logging
```typescript
import { EnterpriseMonitoringController } from './monitoring_controller';

const monitor = new EnterpriseMonitoringController();
await monitor.startMonitoring();

// Log performance metrics
await monitor.logPerformanceMetrics({
  portfolioValue: 12500.00,
  totalPnL: 2500.00,
  sharpeRatio: 1.85,
  maxDrawdown: 8.5,
  winRate: 65.2,
  totalTrades: 150
});

// Get current dashboard
const dashboard = monitor.getCurrentDashboard();
console.log('System Status:', dashboard?.summary.status);
```

### Health Monitoring
```typescript
import { EnterpriseSystemHealthMonitor } from './system_health';

const healthMonitor = new EnterpriseSystemHealthMonitor();
await healthMonitor.startMonitoring();

// Get current health status
const health = healthMonitor.getCurrentHealthStatus();
console.log('CPU Usage:', health?.cpu.usage);
console.log('Memory Usage:', health?.memory.usage);

// Acknowledge alert
healthMonitor.acknowledgeAlert('alert-id-123', 'admin@company.com');
```

### Automated Reports
```typescript
// Generate comprehensive monitoring report
const report = await monitor.generateMonitoringReport();
console.log('Report ID:', report.reportId);
console.log('Overall Status:', report.dashboard.summary.status);
console.log('Recommendations:', report.recommendations);
```

## 🔧 Maintenance

### Database Maintenance
```bash
# Compact databases
sqlite3 ../../data/monitoring/performance_metrics.db "VACUUM;"
sqlite3 ../../data/monitoring/system_health.db "VACUUM;"

# Check database sizes
du -h ../../data/monitoring/*.db

# Backup databases
cp ../../data/monitoring/*.db ../../backups/monitoring/
```

### Log Management
```bash
# View monitoring logs
tail -f ../../logs/monitoring_output.log

# Archive old logs
find ../../logs -name "*.log" -mtime +30 -exec gzip {} \;

# Clean temporary files
rm -rf ../../tmp/monitoring/*
```

### Alert Management
```bash
# View active alerts via SQLite
sqlite3 ../../data/monitoring/system_health.db "SELECT * FROM alerts WHERE status='ACTIVE';"

# Clear resolved alerts
sqlite3 ../../data/monitoring/system_health.db "DELETE FROM alerts WHERE status='RESOLVED' AND timestamp < datetime('now', '-7 days');"
```

## 🛑 Shutdown Procedures

### Graceful Shutdown
```bash
# Stop monitoring services
kill $(cat ../../logs/monitoring.pid)

# Wait for graceful shutdown
sleep 10

# Verify shutdown
ps aux | grep monitoring
```

### Emergency Shutdown
```bash
# Force stop all monitoring processes
pkill -f "monitoring"

# Clean up PID files
rm -f ../../logs/monitoring.pid

# Check for zombie processes
ps aux | grep -E "(monitoring|defunct)"
```

## 📋 Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Check database permissions
ls -la ../../data/monitoring/
chmod 664 ../../data/monitoring/*.db
```

**2. Port Already in Use**
```bash
# Find processes using port 9090
sudo lsof -i :9090
kill -9 <PID>
```

**3. Memory Issues**
```bash
# Check system memory
free -h
# Adjust monitoring interval
# Edit config: "intervalSeconds": 120
```

**4. Disk Space Issues**
```bash
# Check disk usage
df -h
# Clean old logs and reports
find ../../results -mtime +30 -type f -delete
```

### Log Analysis
```bash
# Monitor startup logs
tail -f ../../logs/monitoring_startup.log

# Check for errors
grep -i error ../../logs/monitoring_output.log

# Monitor performance
grep -i "performance" ../../logs/monitoring_output.log | tail -20
```

## 🔐 Security

### Access Control
- Database files with restricted permissions (644)
- PID files in protected logs directory
- Configuration files with sensitive data encryption
- Webhook URLs and API keys in environment variables

### Data Protection
- SQLite databases with WAL mode for consistency
- Automated backups with retention policies
- Encrypted communication channels
- Audit logging for all administrative actions

## 📞 Support

### Monitoring Health
- **System Status:** Check `getCurrentHealthStatus()` method
- **Performance Metrics:** Review `generatePerformanceReport()` output
- **Alert History:** Query alerts table for patterns
- **Resource Usage:** Monitor CPU/Memory/Disk trends

### Contact Information
- **Technical Support:** monitoring@turbobotdeva.com
- **Emergency Contact:** +48 XXX XXX XXX
- **Documentation:** https://docs.turbobotdeva.com/monitoring
- **Issues:** https://github.com/turbobotdeva/issues

---

**🎯 Enterprise Monitoring System v1.0.0**  
**Turbo Bot Deva Trading Platform**  
**Generated:** September 21, 2025
