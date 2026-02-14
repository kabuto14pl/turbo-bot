'use strict';
/**
 * @module RiskManager
 * @description Circuit breaker, dynamic risk, position sizing, overtrading.
 */

class RiskManager {
    constructor(config, portfolioManager) {
        this.config = config;
        this.pm = portfolioManager;
        this.circuitBreaker = {
            isTripped: false, consecutiveLosses: 0, maxConsecutiveLosses: 5,
            emergencyStopTriggered: false, lastResetTime: Date.now(), tripCount: 0,
        };
        this.dailyTradeCount = 0;
        this.lastTradeDayReset = Date.now();
        this.softPauseActive = false;
        this.consecutiveLossesForSoftPause = 0;
    }

    isCircuitBreakerTripped() {
        if (this.circuitBreaker.emergencyStopTriggered) return true;
        const hours = (Date.now() - this.circuitBreaker.lastResetTime) / 3600000;
        if (this.circuitBreaker.isTripped && hours >= 1) { this.resetCircuitBreaker(); return false; }
        return this.circuitBreaker.isTripped;
    }

    tripCircuitBreaker(reason) {
        this.circuitBreaker.isTripped = true;
        this.circuitBreaker.tripCount++;
        this.circuitBreaker.lastResetTime = Date.now();
        console.log('???? [CIRCUIT BREAKER] TRIPPED: ' + reason + ' (trip #' + this.circuitBreaker.tripCount + ')');
    }

    resetCircuitBreaker() {
        this.circuitBreaker.isTripped = false;
        this.circuitBreaker.consecutiveLosses = 0;
        this.circuitBreaker.lastResetTime = Date.now();
        console.log('[CIRCUIT BREAKER] Reset ??? trading resumed');
    }

    recordTradeResult(pnl) {
        if (pnl < 0) {
            this.circuitBreaker.consecutiveLosses++;
            this.consecutiveLossesForSoftPause++;
            if (this.consecutiveLossesForSoftPause >= 2) {
                this.softPauseActive = true;
                console.log('?????? [SOFT PAUSE] Activated after 2 consecutive losses');
            }
            if (this.circuitBreaker.consecutiveLosses >= this.circuitBreaker.maxConsecutiveLosses) {
                this.tripCircuitBreaker(this.circuitBreaker.consecutiveLosses + ' consecutive losses');
            }
        } else {
            this.circuitBreaker.consecutiveLosses = 0;
            this.consecutiveLossesForSoftPause = 0;
            if (this.softPauseActive) { this.softPauseActive = false; console.log('?????? [SOFT PAUSE] Deactivated'); }
        }
        this.dailyTradeCount++;
    }

    checkOvertradingLimit() {
        if (Date.now() - this.lastTradeDayReset > 86400000) { this.dailyTradeCount = 0; this.lastTradeDayReset = Date.now(); }
        // PATCH #20: Bypass daily trade limit in simulation/paper mode
        const mode = (process.env.MODE || 'simulation').toLowerCase();
        if (mode === 'simulation' || mode === 'paper' || mode === 'paper_trading') {
            return true; // No daily trade limit in simulation/paper
        }
        return this.dailyTradeCount < 10;
    }

    calculateDynamicRisk(symbol, atr, currentPrice) {
        const baseRisk = 0.02;
        const atrNorm = atr / currentPrice;
        const atrMult = Math.max(0.5, Math.min(1.5, 0.02 / atrNorm));
        let risk = baseRisk / atrMult;
        risk = Math.max(0.01, Math.min(0.02, risk));
        if (this.circuitBreaker.consecutiveLosses >= this.circuitBreaker.maxConsecutiveLosses) return 0;
        const dd = Math.abs(this.pm.getPortfolio().drawdown);
        if (dd > 0.10) risk *= Math.max(0.5, 1 - (dd - 0.10));
        return risk;
    }

    calculateOptimalQuantity(price, confidence, atr, symbol) {
        let riskPct = (atr && symbol) ? this.calculateDynamicRisk(symbol, atr, price) : this.config.riskPerTrade;
        if (riskPct === 0) return 0;
        const portfolio = this.pm.getPortfolio();
        const riskAmt = portfolio.totalValue * riskPct;
        let slDist = (atr && atr > 0) ? Math.max(0.005, Math.min(0.05, (2 * atr) / price)) : 0.02;
        const notional = riskAmt / slDist;
        const baseQty = notional / price;
        const maxQty = (portfolio.totalValue * 0.15) / price;
        let qty = Math.min(baseQty, maxQty);
        console.log('???? [POSITION SIZING] Risk: $' + riskAmt.toFixed(2) + ', SL: ' + (slDist * 100).toFixed(2) + '%, Qty: ' + qty.toFixed(6));
        if (this.softPauseActive) { qty *= 0.5; console.log('?????? [SOFT PAUSE] Size halved: ' + qty.toFixed(6)); }
        return qty;
    }

    calculateDynamicRiskLegacy(volatility) {
        if (volatility > 0.05) return 0.005;
        if (volatility > 0.03) return 0.01;
        return 0.02;
    }

    calculateMarketVolatility(marketDataHistory) {
        if (!marketDataHistory || marketDataHistory.length < 2) return 0.01;
        const prices = marketDataHistory.slice(-20).map(d => d.close);
        const rets = [];
        for (let i = 1; i < prices.length; i++) rets.push(Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]));
        return rets.reduce((a, b) => a + b, 0) / rets.length;
    }

    calculateRiskLevel(confidence) { return Math.max(0.1, Math.min(1.0, 1 - confidence)); }

    getCircuitBreakerStatus() {
        return { ...this.circuitBreaker, softPauseActive: this.softPauseActive, dailyTradeCount: this.dailyTradeCount };
    }

    exportState() {
        return {
            circuitBreaker: this.circuitBreaker, dailyTradeCount: this.dailyTradeCount,
            consecutiveLossesForSoftPause: this.consecutiveLossesForSoftPause,
            softPauseActive: this.softPauseActive,
        };
    }

    restoreState(state) {
        if (state.circuitBreaker) this.circuitBreaker = state.circuitBreaker;
        if (state.dailyTradeCount) this.dailyTradeCount = state.dailyTradeCount;
        if (state.consecutiveLossesForSoftPause) this.consecutiveLossesForSoftPause = state.consecutiveLossesForSoftPause;
        if (state.softPauseActive) this.softPauseActive = state.softPauseActive;
    }
}

module.exports = { RiskManager };
