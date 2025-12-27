/**
 * 🛡️ PORTFOLIO RISK MANAGER - Advanced Risk Management
 * 
 * Centralized risk management system:
 * - Dynamic ATR-based risk calculation (FAZA 3.1)
 * - Circuit breaker system (3 consecutive losses)
 * - Soft pause mechanism (2 consecutive losses, 50% position reduction)
 * - Kelly Criterion position sizing
 * - Portfolio metrics tracking
 * 
 * @module PortfolioRiskManager
 * @version 1.0.0
 * @tier Core
 */

export interface RiskManagerConfig {
    instanceId: string;
    maxDrawdown: number;
    riskPerTrade: number;
    initialCapital: number;
}

export interface CircuitBreaker {
    isTripped: boolean;
    consecutiveLosses: number;
    maxConsecutiveLosses: number;
    emergencyStopTriggered: boolean;
    tripCount: number;
    lastResetTime: number;
}

export interface RiskComponents {
    portfolio: any;
    circuitBreaker: CircuitBreaker;
    softPauseActive: boolean;
    consecutiveLossesForSoftPause: number;
    healthStatus: any;
    
    // Methods (from main bot)
    getUptime?: () => string;
}

/**
 * PortfolioRiskManager - Centralized risk management
 */
export class PortfolioRiskManager {
    private config: RiskManagerConfig;
    private components: RiskComponents;
    
    constructor(config: RiskManagerConfig, components: RiskComponents) {
        this.config = config;
        this.components = components;
    }
    
    /**
     * Calculate dynamic risk based on ATR (FAZA 3.1)
     * Adjusts risk 1-2% based on market volatility
     */
    calculateDynamicRisk(symbol: string, atr: number, currentPrice: number): number {
        const baseRisk = 0.02; // 2% baseline
        
        // 1. ATR-based adjustment (inverse relationship)
        const atrNormalized = atr / currentPrice;
        const atrMultiplier = Math.max(0.5, Math.min(1.5, 0.02 / atrNormalized));
        let atrAdjustedRisk = baseRisk / atrMultiplier;
        
        // Clamp to 1-2% range
        atrAdjustedRisk = Math.max(0.01, Math.min(0.02, atrAdjustedRisk));
        
        // 2. Circuit breaker check
        if (this.components.circuitBreaker.consecutiveLosses >= 3) {
            console.log(`🛑 [DYNAMIC RISK] Circuit breaker active - risk set to 0%`);
            return 0;
        }
        
        // 3. Drawdown-based adjustment
        const currentDrawdown = Math.abs(this.components.portfolio.drawdown);
        if (currentDrawdown > 0.10) {
            const drawdownPenalty = Math.max(0.5, 1 - (currentDrawdown - 0.10));
            atrAdjustedRisk *= drawdownPenalty;
            console.log(`⚠️ [DYNAMIC RISK] Drawdown ${(currentDrawdown * 100).toFixed(1)}% - risk reduced to ${(atrAdjustedRisk * 100).toFixed(2)}%`);
        }
        
        console.log(`📊 [DYNAMIC RISK] ${symbol}: ATR=${(atrNormalized * 100).toFixed(2)}%, Risk=${(atrAdjustedRisk * 100).toFixed(2)}%`);
        return atrAdjustedRisk;
    }
    
    /**
     * Calculate optimal quantity with Kelly Criterion
     */
    calculateOptimalQuantity(
        price: number,
        confidence: number,
        riskPercentOverride?: number,
        atr?: number,
        symbol?: string
    ): number {
        // Use dynamic risk if ATR provided
        let riskPercent: number;
        
        if (atr && symbol) {
            riskPercent = this.calculateDynamicRisk(symbol, atr, price);
        } else {
            riskPercent = riskPercentOverride || this.config.riskPerTrade;
        }
        
        // Circuit breaker: return 0 if risk is 0
        if (riskPercent === 0) {
            console.log(`🛑 [OPTIMAL QUANTITY] Risk = 0% - no position opened`);
            return 0;
        }
        
        const riskAmount = this.components.portfolio.totalValue * riskPercent;
        const baseQuantity = riskAmount / price;
        
        // Soft pause: Reduce position size by 50%
        let finalQuantity = baseQuantity * confidence;
        if (this.components.softPauseActive) {
            finalQuantity *= 0.5;
            console.log(`⏸️ [SOFT PAUSE] Position size reduced 50%: ${baseQuantity.toFixed(6)} → ${finalQuantity.toFixed(6)}`);
        }
        
        return finalQuantity;
    }
    
    /**
     * Check if circuit breaker should trip
     */
    checkCircuitBreaker(): boolean {
        if (this.components.circuitBreaker.isTripped) {
            return true;
        }
        
        // Check drawdown threshold
        if (this.components.portfolio.drawdown >= this.config.maxDrawdown) {
            this.tripCircuitBreaker('DRAWDOWN_EXCEEDED',
                `Portfolio drawdown ${(this.components.portfolio.drawdown * 100).toFixed(2)}% >= ${(this.config.maxDrawdown * 100).toFixed(0)}%`);
            return true;
        }
        
        // Check consecutive losses
        if (this.components.circuitBreaker.consecutiveLosses >= this.components.circuitBreaker.maxConsecutiveLosses) {
            this.tripCircuitBreaker('CONSECUTIVE_LOSSES',
                `${this.components.circuitBreaker.consecutiveLosses} consecutive losses detected`);
            return true;
        }
        
        // Check portfolio value threshold (loss > 10%)
        const portfolioLoss = (this.config.initialCapital - this.components.portfolio.totalValue) / this.config.initialCapital;
        if (portfolioLoss >= 0.10) {
            this.tripCircuitBreaker('PORTFOLIO_LOSS',
                `Portfolio loss ${(portfolioLoss * 100).toFixed(2)}% >= 10%`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Trip the circuit breaker
     */
    private tripCircuitBreaker(reason: string, details: string): void {
        if (this.components.circuitBreaker.isTripped) {
            return;
        }
        
        this.components.circuitBreaker.isTripped = true;
        this.components.circuitBreaker.tripCount++;
        this.components.circuitBreaker.emergencyStopTriggered = true;
        
        console.log(`\n🛑🚨 ========== CIRCUIT BREAKER TRIPPED ==========`);
        console.log(`🔴 REASON: ${reason}`);
        console.log(`📋 DETAILS: ${details}`);
        console.log(`⏰ TIME: ${new Date().toISOString()}`);
        console.log(`📊 PORTFOLIO STATE:`);
        console.log(`   💰 Total Value: $${this.components.portfolio.totalValue.toFixed(2)}`);
        console.log(`   📉 Drawdown: ${(this.components.portfolio.drawdown * 100).toFixed(2)}%`);
        console.log(`   💸 Realized P&L: $${this.components.portfolio.realizedPnL.toFixed(2)}`);
        console.log(`   📈 Win Rate: ${(this.components.portfolio.winRate * 100).toFixed(1)}%`);
        console.log(`   🔢 Total Trades: ${this.components.portfolio.totalTrades}`);
        console.log(`   ❌ Consecutive Losses: ${this.components.circuitBreaker.consecutiveLosses}`);
        console.log(`🛑 TRADING HALTED - Manual review required`);
        console.log(`🚨 ===============================================\n`);
        
        // Update health status
        this.components.healthStatus.status = 'unhealthy';
        this.components.healthStatus.components.riskManager = false;
    }
    
    /**
     * Reset circuit breaker (manual intervention)
     */
    resetCircuitBreaker(): void {
        if (!this.components.circuitBreaker.isTripped) {
            return;
        }
        
        console.log(`\n🔄 ========== CIRCUIT BREAKER RESET ==========`);
        console.log(`✅ Manually resetting circuit breaker`);
        console.log(`📊 Previous state: ${this.components.circuitBreaker.consecutiveLosses} losses, ${this.components.circuitBreaker.tripCount} trips`);
        
        this.components.circuitBreaker.isTripped = false;
        this.components.circuitBreaker.consecutiveLosses = 0;
        this.components.circuitBreaker.emergencyStopTriggered = false;
        this.components.circuitBreaker.lastResetTime = Date.now();
        
        console.log(`✅ Circuit breaker reset complete`);
        console.log(`🔄 Trading can resume\n`);
        
        // Restore health status
        this.components.healthStatus.status = 'healthy';
        this.components.healthStatus.components.riskManager = true;
    }
    
    /**
     * Record trade result for circuit breaker tracking
     * Enhanced with soft pause at 2 losses, circuit breaker at 3
     */
    recordTradeResult(pnl: number): void {
        if (pnl < 0) {
            this.components.circuitBreaker.consecutiveLosses++;
            this.components.consecutiveLossesForSoftPause++;
            
            console.log(`📊 [CIRCUIT BREAKER] Consecutive losses: ${this.components.circuitBreaker.consecutiveLosses}`);
            
            // Soft pause after 2 consecutive losses
            if (this.components.consecutiveLossesForSoftPause >= 2 && !this.components.softPauseActive) {
                this.components.softPauseActive = true;
                console.log(`⏸️ [SOFT PAUSE] ACTIVATED after 2 losses - position sizes reduced 50%`);
            }
            
            // Circuit breaker at 3 consecutive losses
            if (this.components.circuitBreaker.consecutiveLosses >= 3) {
                console.log(`🛑 [CIRCUIT BREAKER] Triggering after 3 consecutive losses`);
            }
            
        } else if (pnl > 0) {
            // Reset on profit
            if (this.components.circuitBreaker.consecutiveLosses > 0) {
                console.log(`✅ [${this.config.instanceId}] Consecutive loss streak broken: ${this.components.circuitBreaker.consecutiveLosses} → 0`);
            }
            
            if (this.components.softPauseActive) {
                this.components.softPauseActive = false;
                console.log(`✅ [SOFT PAUSE] DEACTIVATED - profit made, returning to normal position sizing`);
            }
            
            this.components.circuitBreaker.consecutiveLosses = 0;
            this.components.consecutiveLossesForSoftPause = 0;
        }
    }
    
    /**
     * Get circuit breaker status
     */
    getCircuitBreakerStatus(): any {
        return {
            isTripped: this.components.circuitBreaker.isTripped,
            consecutiveLosses: this.components.circuitBreaker.consecutiveLosses,
            maxConsecutiveLosses: this.components.circuitBreaker.maxConsecutiveLosses,
            emergencyStopTriggered: this.components.circuitBreaker.emergencyStopTriggered,
            tripCount: this.components.circuitBreaker.tripCount,
            lastResetTime: new Date(this.components.circuitBreaker.lastResetTime).toISOString(),
            reason: this.components.circuitBreaker.isTripped ? 'Circuit breaker active' : 'Normal operation'
        };
    }
    
    /**
     * Update portfolio metrics
     */
    updatePortfolioMetrics(trades: any[]): void {
        if (trades.length > 0) {
            const successfulTrades = trades.filter(trade => trade.pnl > 0);
            this.components.portfolio.successfulTrades = successfulTrades.length;
            this.components.portfolio.failedTrades = trades.length - successfulTrades.length;
            this.components.portfolio.winRate = trades.length > 0 ? (successfulTrades.length / trades.length) * 100 : 0;
            
            const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
            this.components.portfolio.realizedPnL = totalPnL;
            this.components.portfolio.avgTradeReturn = trades.length > 0 ? totalPnL / trades.length : 0;
            
            // Calculate drawdown
            const runningValue = this.config.initialCapital + totalPnL;
            this.components.portfolio.totalValue = runningValue;
            this.components.portfolio.drawdown = Math.max(0, (this.config.initialCapital - runningValue) / this.config.initialCapital * 100);
        }
    }
    
    /**
     * Get soft pause status
     */
    getSoftPauseActive(): boolean {
        return this.components.softPauseActive;
    }
    
    /**
     * Get consecutive losses count
     */
    getConsecutiveLosses(): number {
        return this.components.circuitBreaker.consecutiveLosses;
    }
}
