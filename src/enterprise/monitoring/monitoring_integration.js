"use strict";
/**
 * 🚀 [ENTERPRISE-MONITORING]
 * Enterprise Monitoring Integration for Trading Bot
 *
 * Features:
 * - Integration with trading bot main system
 * - Complete Prometheus and Grafana setup
 * - Real-time dashboard generation
 * - Advanced alerting system
 * - Performance monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseMonitoringSystem = exports.MonitoringIntegration = void 0;
const enterprise_monitoring_system_1 = require("./enterprise_monitoring_system");
Object.defineProperty(exports, "EnterpriseMonitoringSystem", { enumerable: true, get: function () { return enterprise_monitoring_system_1.EnterpriseMonitoringSystem; } });
const path_1 = __importDefault(require("path"));
class MonitoringIntegration {
    constructor() {
        this.isInitialized = false;
        this.monitoringSystem = new enterprise_monitoring_system_1.EnterpriseMonitoringSystem();
        console.log('[MONITORING INTEGRATION] System initialized');
    }
    // ==================== MAIN INTEGRATION METHOD ====================
    async integrateWithBot(tradingBot) {
        try {
            console.log('[MONITORING INTEGRATION] Starting complete integration with trading bot...');
            // Start monitoring system
            await this.monitoringSystem.start();
            // Integrate with all bot components
            await this.monitoringSystem.integrateWithTradingBot(tradingBot);
            if (tradingBot.mlSystem) {
                await this.monitoringSystem.integrateWithMLSystem(tradingBot.mlSystem);
            }
            if (tradingBot.portfolioManager) {
                await this.monitoringSystem.integrateWithPortfolioManager(tradingBot.portfolioManager);
            }
            if (tradingBot.riskManager) {
                await this.monitoringSystem.integrateWithRiskManager(tradingBot.riskManager);
            }
            // Export dashboards
            await this.exportDashboards();
            this.isInitialized = true;
            console.log('[MONITORING INTEGRATION] ✅ Complete enterprise monitoring integration successful!');
            this.logMonitoringEndpoints();
        }
        catch (error) {
            console.error('[MONITORING INTEGRATION] ❌ Integration failed:', error);
            throw error;
        }
    }
    async exportDashboards() {
        try {
            const outputDir = path_1.default.join(process.cwd(), 'monitoring', 'grafana', 'dashboards');
            await this.monitoringSystem.exportAllDashboards(outputDir);
            console.log('[MONITORING INTEGRATION] 📊 All Grafana dashboards exported');
        }
        catch (error) {
            console.warn('[MONITORING INTEGRATION] Dashboard export warning:', error);
        }
    }
    logMonitoringEndpoints() {
        console.log('\n🚀 [ENTERPRISE MONITORING] SYSTEM READY!');
        console.log('================================================');
        console.log('📊 Prometheus Metrics: http://localhost:9090/metrics');
        console.log('🔍 Health Check: http://localhost:9090/health');
        console.log('📈 Grafana Dashboard Import: monitoring/grafana/dashboards/');
        console.log('🚨 Alert System: Active and monitoring');
        console.log('================================================\n');
    }
    // ==================== STATUS METHODS ====================
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            systemStatus: this.monitoringSystem.getSystemStatus(),
            dashboards: this.monitoringSystem.getDashboards().map(d => ({
                id: d.id,
                title: d.title,
                panels: d.panels.length
            })),
            alerts: this.monitoringSystem.getAlerts().length,
            activeAlerts: this.monitoringSystem.getActiveAlerts().size
        };
    }
    async stop() {
        if (this.isInitialized) {
            await this.monitoringSystem.stop();
            this.isInitialized = false;
            console.log('[MONITORING INTEGRATION] System stopped');
        }
    }
    // ==================== DASHBOARD METHODS ====================
    async exportSpecificDashboard(dashboardId, filePath) {
        await this.monitoringSystem.saveDashboardToFile(dashboardId, filePath);
    }
    getDashboardJson(dashboardId) {
        return this.monitoringSystem.exportGrafanaDashboard(dashboardId);
    }
    // ==================== METRICS ACCESS ====================
    getMetrics() {
        return this.monitoringSystem.getPrometheusMetrics();
    }
    getActiveAlerts() {
        return this.monitoringSystem.getActiveAlerts();
    }
    // ==================== GETTERS ====================
    get monitoring() {
        return this.monitoringSystem;
    }
    get ready() {
        return this.isInitialized;
    }
}
exports.MonitoringIntegration = MonitoringIntegration;
exports.default = MonitoringIntegration;
