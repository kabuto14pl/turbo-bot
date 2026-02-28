/**
 * 🖥️ STANDALONE DASHBOARD RUNNER
 * 
 * Starts the Enterprise Dashboard System as an independent process.
 * This is the entry point for running the dashboard separately from the trading bot.
 * 
 * Usage:
 *   npx ts-node start_dashboard.ts
 *   
 * Environment Variables:
 *   DASHBOARD_PORT    - Dashboard HTTP port (default: 8080)
 *   DASHBOARD_HOST    - Dashboard bind host (default: 0.0.0.0)
 *   BOT_HEALTH_PORT   - Trading bot API port to proxy to (default: 3001)
 *   BOT_HOST          - Trading bot hostname (default: localhost)
 *   ENABLE_AUTH       - Enable authentication (default: false)
 *   LOG_LEVEL         - Logging level: debug|info|warn|error (default: info)
 *   DATA_UPDATE_MS    - Data refresh interval in ms (default: 1000)
 * 
 * The dashboard proxies API requests to the trading bot on BOT_HEALTH_PORT:
 *   /api/status     → bot /api/status    (config, health, trading, performance, circuitBreaker)
 *   /api/portfolio  → bot /api/portfolio  (portfolio data)
 *   /api/trades     → bot /api/trades     (recent trades)
 *   /api/signals    → bot /api/signals    (active signals)
 *   /health         → dashboard health (own health status)
 *   /               → dashboard HTML (full UI)
 */

import { EnterpriseDashboardSystem } from './trading-bot/core/dashboard/enterprise_dashboard_system';

// =====================================================
// CONFIGURATION FROM ENVIRONMENT
// =====================================================

const DASHBOARD_PORT = parseInt(process.env.DASHBOARD_PORT || '8080');
const DASHBOARD_HOST = process.env.DASHBOARD_HOST || '0.0.0.0';
const ENABLE_AUTH = process.env.ENABLE_AUTH === 'true';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error';
const DATA_UPDATE_MS = parseInt(process.env.DATA_UPDATE_MS || '1000');

// =====================================================
// STARTUP BANNER
// =====================================================

console.log('');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🖥️  ENTERPRISE TRADING BOT DASHBOARD - STANDALONE RUNNER   ║');
console.log('║  Version: 3.0.0 - Production Enterprise Grade              ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📌 Configuration:`);
console.log(`   Dashboard Port  : ${DASHBOARD_PORT}`);
console.log(`   Dashboard Host  : ${DASHBOARD_HOST}`);
console.log(`   Bot API Port    : ${process.env.BOT_HEALTH_PORT || '3001'}`);
console.log(`   Bot API Host    : ${process.env.BOT_HOST || 'localhost'}`);
console.log(`   Auth Enabled    : ${ENABLE_AUTH}`);
console.log(`   Log Level       : ${LOG_LEVEL}`);
console.log(`   Update Interval : ${DATA_UPDATE_MS}ms`);
console.log('');

// =====================================================
// DASHBOARD INSTANCE
// =====================================================

const dashboard = new EnterpriseDashboardSystem({
    port: DASHBOARD_PORT,
    host: DASHBOARD_HOST,
    enableAuth: ENABLE_AUTH,
    logLevel: LOG_LEVEL,
    dataUpdateInterval: DATA_UPDATE_MS,
    enableRealTimeCharts: true,
    enableAlertSystem: true,
    enableRiskMonitoring: true,
    maxConnections: 1000,
    sessionTimeout: 300000, // 5 minutes
    enableHTTPS: false,
    enableLogging: true
});

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('');
    console.log(`⚠️  Received ${signal} - starting graceful shutdown...`);
    
    try {
        await dashboard.stop();
        console.log('✅ Dashboard stopped gracefully');
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
    }
    
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Unhandled errors
process.on('uncaughtException', (error: Error) => {
    console.error('💥 Uncaught Exception:', error.message);
    console.error(error.stack);
    // Don't exit - try to keep the dashboard running
});

process.on('unhandledRejection', (reason: any) => {
    console.error('💥 Unhandled Rejection:', reason);
    // Don't exit - try to keep the dashboard running
});

// =====================================================
// START DASHBOARD
// =====================================================

(async () => {
    try {
        await dashboard.start();
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`🌐 Dashboard is live at: http://${DASHBOARD_HOST === '0.0.0.0' ? 'localhost' : DASHBOARD_HOST}:${DASHBOARD_PORT}`);
        console.log(`📊 Bot API proxied from: http://${process.env.BOT_HOST || 'localhost'}:${process.env.BOT_HEALTH_PORT || '3001'}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('Press Ctrl+C to stop the dashboard.');
        console.log('');
        
        // Periodic health log
        setInterval(() => {
            const health = dashboard.getSystemHealth();
            const memUsage = process.memoryUsage();
            console.log(
                `[DASHBOARD_HEALTH] Status: ${health.status} | ` +
                `Connections: ${health.connections} | ` +
                `Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB | ` +
                `Uptime: ${Math.floor(process.uptime())}s`
            );
        }, 60000); // Log every 60 seconds
        
    } catch (error) {
        console.error('');
        console.error('╔══════════════════════════════════════════════════════════════╗');
        console.error('║  ❌ DASHBOARD FAILED TO START                                ║');
        console.error('╚══════════════════════════════════════════════════════════════╝');
        console.error('');
        console.error('Error:', error);
        console.error('');
        console.error('Possible causes:');
        console.error(`  - Port ${DASHBOARD_PORT} is already in use`);
        console.error('  - Missing dependencies (run: npm install)');
        console.error('  - TypeScript compilation error');
        console.error('');
        process.exit(1);
    }
})();
