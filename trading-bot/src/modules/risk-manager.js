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
        // PATCH #26: Anti-scalping cooldown — minimum time between trades
        this._lastTradeTimestamp = 0;
        this._minTradeCooldownMs = 10 * 60 * 1000; // PATCH #40: 10 minutes minimum between new entries (was 3min)
        this._consecutiveWins = 0;
    }

    _isSimulation() {
        const mode = (process.env.MODE || 'simulation').toLowerCase();
        return mode === 'simulation' || mode === 'paper' || mode === 'paper_trading';
    }

    // PATCH #25: CB disabled in simulation/paper mode
    isCircuitBreakerTripped() {
        // PATCH #25: Always false in simulation/paper — user request
        if (this._isSimulation()) return false;
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
        // PATCH #26: Track win streak for post-win cooldown
        this.recordWinStreak(pnl);
        if (pnl < 0) {
            this.circuitBreaker.consecutiveLosses++;
            // PATCH #25: In simulation/paper mode — track stats but don't trip CB or softPause
            if (!this._isSimulation()) {
                this.consecutiveLossesForSoftPause++;
                if (this.consecutiveLossesForSoftPause >= 2) {
                    this.softPauseActive = true;
                    console.log('[SOFT PAUSE] Activated after 2 consecutive losses');
                }
                if (this.circuitBreaker.consecutiveLosses >= this.circuitBreaker.maxConsecutiveLosses) {
                    this.tripCircuitBreaker(this.circuitBreaker.consecutiveLosses + ' consecutive losses');
                }
            } else {
                console.log('[RISK] Loss #' + this.circuitBreaker.consecutiveLosses + ' (CB/SoftPause disabled in simulation)');
            }
        } else {
            this.circuitBreaker.consecutiveLosses = 0;
            this.consecutiveLossesForSoftPause = 0;
            if (this.softPauseActive) { this.softPauseActive = false; console.log('[SOFT PAUSE] Deactivated'); }
        }
        this.dailyTradeCount++;
    }

    // PATCH #21: Reset daily counter
    resetDailyCounter() { this.dailyTradeCount = 0; console.log("[RISK] Daily trade counter reset to 0"); }

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
        if (!this._isSimulation() && this.circuitBreaker.consecutiveLosses >= this.circuitBreaker.maxConsecutiveLosses) return 0;
        const dd = Math.abs(this.pm.getPortfolio().drawdown);
        if (dd > 0.10) risk *= Math.max(0.5, 1 - (dd - 0.10));
        return risk;
    }

    calculateOptimalQuantity(price, confidence, atr, symbol) {
        let riskPct = (atr && symbol) ? this.calculateDynamicRisk(symbol, atr, price) : this.config.riskPerTrade;
        if (riskPct === 0) return 0;
        const portfolio = this.pm.getPortfolio();
        const riskAmt = portfolio.totalValue * riskPct;
        // PATCH #26: Wider SL distance (2.5x ATR vs old 2.0x) to reduce premature SL hits
        let slDist = (atr && atr > 0) ? Math.max(0.005, Math.min(0.05, (2.5 * atr) / price)) : 0.02;
        const notional = riskAmt / slDist;
        const baseQty = notional / price;
        const maxQty = (portfolio.totalValue * 0.15) / price;
        let qty = Math.min(baseQty, maxQty);
        // PATCH #26: Apply loss streak adaptive sizing (EVEN in simulation — this is learning behavior)
        const lossMultiplier = this.getConsecutiveLossSizeMultiplier();
        qty *= lossMultiplier;
        console.log('[POSITION SIZING] Risk: $' + riskAmt.toFixed(2) + ', SL: ' + (slDist * 100).toFixed(2) + '%, Qty: ' + qty.toFixed(6) + (lossMultiplier < 1 ? ' (loss streak x' + lossMultiplier + ')' : ''));
        if (this.softPauseActive && !this._isSimulation()) { qty *= 0.5; console.log('[SOFT PAUSE] Size halved: ' + qty.toFixed(6)); }
        return qty;
    }

    // PATCH #26: Anti-scalping — check if enough time passed since last trade
    checkTradeCooldown() {
        const elapsed = Date.now() - this._lastTradeTimestamp;
        if (elapsed < this._minTradeCooldownMs) {
            const remaining = Math.ceil((this._minTradeCooldownMs - elapsed) / 1000);
            console.log('[RISK P26] Trade cooldown active — ' + remaining + 's remaining');
            return false;
        }
        return true;
    }

    // PATCH #26: Mark trade execution timestamp
    markTradeExecuted() {
        this._lastTradeTimestamp = Date.now();
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

    // PATCH #26: Loss streak adaptive sizing — reduces position size after consecutive losses
    // 3 losses → 50% size, 5 losses → 25% size. 2 consecutive wins → restore normal.
    getConsecutiveLossSizeMultiplier() {
        const losses = this.circuitBreaker.consecutiveLosses;
        if (losses >= 5) {
            console.log('[RISK P26] 5+ consecutive losses — position size 25%');
            return 0.25;
        }
        if (losses >= 3) {
            console.log('[RISK P26] 3+ consecutive losses — position size 50%');
            return 0.50;
        }
        return 1.0;
    }

    // PATCH #26: Anti-overtrading after wins — cooldown multiplier
    // After 2 consecutive wins, next trade gets reduced confidence to prevent euphoria-driven overtrading
    getPostWinCooldownMultiplier() {
        if (!this._consecutiveWins) this._consecutiveWins = 0;
        if (this._consecutiveWins >= 2) {
            console.log('[RISK P26] Post-win cooldown active (2+ wins) — confidence * 0.80');
            return 0.80;
        }
        return 1.0;
    }

    // PATCH #26: Track consecutive wins (complement to consecutive losses)
    recordWinStreak(pnl) {
        if (pnl >= 0) {
            this._consecutiveWins = (this._consecutiveWins || 0) + 1;
        } else {
            this._consecutiveWins = 0;
        }
    }

    getCircuitBreakerStatus() {
        return { ...this.circuitBreaker, softPauseActive: this.softPauseActive, dailyTradeCount: this.dailyTradeCount,
            consecutiveLossSizeMultiplier: this.getConsecutiveLossSizeMultiplier(),
            postWinCooldownMultiplier: this.getPostWinCooldownMultiplier(),
        };
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
