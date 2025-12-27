/**
 * @file MonitoringService.ts
 * @description Monitoring, health checks, and WebSocket broadcasting
 * 
 * ENTERPRISE-GRADE MONITORING SYSTEM
 * Extracted from autonomous_trading_bot_final.ts
 * Total methods: 16 public methods
 * Coverage: Health checks, uptime tracking, WebSocket broadcasts, metrics, alerts
 */

import { WebSocket } from 'ws';
import { 
    TradingConfig, 
    HealthStatus, 
    PortfolioMetrics, 
    KellyCriterion 
} from '../types/TradingTypes';
import * as express from 'express';

/**
 * MonitoringService - Health, metrics, and real-time broadcasting
 */
export class MonitoringService {
    private config: TradingConfig;
    private healthStatus: HealthStatus;
    private portfolio: PortfolioMetrics;
    private startTime: number;
    private app: express.Application;
    private wsClients: Set<WebSocket>;
    
    constructor(params: {
        config: TradingConfig;
        healthStatus: HealthStatus;
        portfolio: PortfolioMetrics;
        startTime: number;
        app: express.Application;
        wsClients: Set<WebSocket>;
    }) {
        this.config = params.config;
        this.healthStatus = params.healthStatus;
        this.portfolio = params.portfolio;
        this.startTime = params.startTime;
        this.app = params.app;
        this.wsClients = params.wsClients;
    }
    
    // ========================================================================
    // UPTIME & HEALTH STATUS
    // ========================================================================
    
    /**
     * Update uptime in health status
     */
    public updateUptime(uptime: number): void {
        this.healthStatus.uptime = uptime;
        this.healthStatus.lastUpdate = Date.now();
    }
    
    /**
     * Get formatted uptime string
     */
    public getUptimeString(): string {
        const uptimeMs = Date.now() - this.startTime;
        const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
        const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    
    /**
     * Update health status
     */
    public setHealthStatus(status: 'healthy' | 'degraded' | 'unhealthy'): void {
        this.healthStatus.status = status;
        this.healthStatus.lastUpdate = Date.now();
        this.broadcastHealthUpdate();
    }
    
    /**
     * Update component health
     */
    public updateComponentHealth(component: keyof HealthStatus['components'], healthy: boolean): void {
        this.healthStatus.components[component] = healthy;
        this.broadcastHealthUpdate();
    }
    
    // ========================================================================
    // WEBSOCKET BROADCASTING
    // ========================================================================
    
    /**
     * Broadcast message to all connected WebSocket clients
     */
    private broadcastToClients(message: any): void {
        const messageStr = JSON.stringify(message);
        this.wsClients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                try {
                    client.send(messageStr);
                } catch (error) {
                    console.error(`❌ [WebSocket] Failed to send message to client:`, error);
                }
            }
        });
    }
    
    /**
     * Broadcast portfolio update
     */
    public broadcastPortfolioUpdate(): void {
        this.broadcastToClients({
            type: 'portfolio_update',
            data: {
                totalValue: this.portfolio.totalValue,
                unrealizedPnL: this.portfolio.unrealizedPnL,
                realizedPnL: this.portfolio.realizedPnL,
                drawdown: this.portfolio.drawdown,
                sharpeRatio: this.portfolio.sharpeRatio,
                winRate: this.portfolio.winRate,
                totalTrades: this.portfolio.totalTrades,
                timestamp: Date.now()
            }
        });
    }
    
    /**
     * Broadcast VaR metrics update
     */
    public broadcastVaRUpdate(varMetrics: any): void {
        this.broadcastToClients({
            type: 'var_update',
            data: {
                parametric: varMetrics.parametric,
                historical: varMetrics.historical,
                monteCarlo: varMetrics.monteCarlo,
                confidence: varMetrics.confidence || 0.95,
                timestamp: Date.now()
            }
        });
    }
    
    /**
     * Broadcast Kelly Criterion metrics update
     */
    public broadcastKellyUpdate(kellyMetrics: KellyCriterion): void {
        this.broadcastToClients({
            type: 'kelly_update',
            data: {
                optimalFraction: kellyMetrics.optimalFraction,
                adjustedFraction: kellyMetrics.adjustedFraction,
                winRate: kellyMetrics.winRate,
                avgWin: kellyMetrics.avgWin,
                avgLoss: kellyMetrics.avgLoss,
                timestamp: Date.now()
            }
        });
    }
    
    /**
     * Broadcast health status update
     */
    public broadcastHealthUpdate(): void {
        this.broadcastToClients({
            type: 'health_update',
            data: {
                status: this.healthStatus.status,
                uptime: Date.now() - this.startTime,
                components: this.healthStatus.components,
                version: this.healthStatus.version,
                timestamp: Date.now()
            }
        });
    }
    
    /**
     * Broadcast alert message
     */
    public broadcastAlert(message: string, level: 'info' | 'warning' | 'error'): void {
        this.broadcastToClients({
            type: 'alert',
            data: {
                message,
                level,
                instanceId: this.config.instanceId,
                timestamp: Date.now()
            }
        });
    }
    
    /**
     * Broadcast trade execution
     */
    public broadcastTradeExecution(trade: any): void {
        this.broadcastToClients({
            type: 'trade_execution',
            data: {
                ...trade,
                instanceId: this.config.instanceId,
                timestamp: Date.now()
            }
        });
    }
    
    /**
     * Broadcast ML retrain event
     */
    public broadcastMLRetrain(event: any): void {
        this.broadcastToClients({
            type: 'ml_retrain',
            data: {
                ...event,
                instanceId: this.config.instanceId,
                timestamp: Date.now()
            }
        });
    }
    
    // ========================================================================
    // METRICS & LOGGING
    // ========================================================================
    
    /**
     * Log ML progress (every 5 minutes)
     */
    public logMLProgress(mlData: {
        phase: string;
        tradingCount: number;
        threshold: number;
        episodes: number;
        avgReward: number;
        explorationRate: number;
    }): void {
        console.log(`📊 [${this.config.instanceId}] ML Learning Progress:`);
        console.log(`   Phase: ${mlData.phase} | Trades: ${mlData.tradingCount} | Threshold: ${(mlData.threshold * 100).toFixed(1)}%`);
        console.log(`   Episodes: ${mlData.episodes} | Avg Reward: ${mlData.avgReward.toFixed(3)} | Exploration: ${(mlData.explorationRate * 100).toFixed(1)}%`);
    }
    
    /**
     * Get current WebSocket client count
     */
    public getWebSocketClientCount(): number {
        return this.wsClients.size;
    }
    
    /**
     * Get health status object
     */
    public getHealthStatus(): HealthStatus {
        return {
            ...this.healthStatus,
            uptime: Date.now() - this.startTime,
            lastUpdate: Date.now()
        };
    }
}
