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

import { EnterpriseMonitoringSystem } from './enterprise_monitoring_system';
import path from 'path';

export class MonitoringIntegration {
    private monitoringSystem: EnterpriseMonitoringSystem;
    private isInitialized: boolean = false;

    constructor() {
        this.monitoringSystem = new EnterpriseMonitoringSystem();
        console.log('[MONITORING INTEGRATION] System initialized');
    }

    // ==================== MAIN INTEGRATION METHOD ====================

    public async integrateWithBot(tradingBot: any): Promise<void> {
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
            
        } catch (error) {
            console.error('[MONITORING INTEGRATION] ❌ Integration failed:', error);
            throw error;
        }
    }

    private async exportDashboards(): Promise<void> {
        try {
            const outputDir = path.join(process.cwd(), 'monitoring', 'grafana', 'dashboards');
            await this.monitoringSystem.exportAllDashboards(outputDir);
            
            console.log('[MONITORING INTEGRATION] 📊 All Grafana dashboards exported');
        } catch (error) {
            console.warn('[MONITORING INTEGRATION] Dashboard export warning:', error);
        }
    }

    private logMonitoringEndpoints(): void {
        console.log('\n🚀 [ENTERPRISE MONITORING] SYSTEM READY!');
        console.log('================================================');
        console.log('📊 Prometheus Metrics: http://localhost:9090/metrics');
        console.log('🔍 Health Check: http://localhost:9090/health');
        console.log('📈 Grafana Dashboard Import: monitoring/grafana/dashboards/');
        console.log('🚨 Alert System: Active and monitoring');
        console.log('================================================\n');
    }

    // ==================== STATUS METHODS ====================

    public getStatus() {
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

    public async stop(): Promise<void> {
        if (this.isInitialized) {
            await this.monitoringSystem.stop();
            this.isInitialized = false;
            console.log('[MONITORING INTEGRATION] System stopped');
        }
    }

    // ==================== DASHBOARD METHODS ====================

    public async exportSpecificDashboard(dashboardId: string, filePath: string): Promise<void> {
        await this.monitoringSystem.saveDashboardToFile(dashboardId, filePath);
    }

    public getDashboardJson(dashboardId: string): Promise<string> {
        return this.monitoringSystem.exportGrafanaDashboard(dashboardId);
    }

    // ==================== METRICS ACCESS ====================

    public getMetrics() {
        return this.monitoringSystem.getPrometheusMetrics();
    }

    public getActiveAlerts() {
        return this.monitoringSystem.getActiveAlerts();
    }

    // ==================== GETTERS ====================

    public get monitoring() {
        return this.monitoringSystem;
    }

    public get ready() {
        return this.isInitialized;
    }
}

// Export for use in main trading bot
export { EnterpriseMonitoringSystem };
export default MonitoringIntegration;