'use strict';
/**
 * @module MLIntegration
 * @description ML system bridge ??? confidence thresholds, learning, trade feedback.
 */
const ind = require('./indicators');

class MLIntegration {
    constructor(enterpriseML) {
        this.enterpriseML = enterpriseML;
        this.productionMLIntegrator = null;
        this.simpleRLAdapter = null;
        this.mlConfidenceThreshold = 0.15;
        this.mlTradingCount = 0;
        this.mlLearningPhase = 'WARMUP';
        this.mlPerformance = { episodes: 0, total_reward: 0, average_reward: 0, exploration_rate: 1.0 };
        this.lastProgressLog = Date.now();
    }

    get isReady() { return !!this.enterpriseML; }

    setProductionML(integrator) { this.productionMLIntegrator = integrator; }
    setSimpleRL(adapter) { this.simpleRLAdapter = adapter; }

    async getAction(price, rsi, volume, priceHistory, hasOpenPosition) {
        if (!this.enterpriseML) return null;
        try {
            const action = await this.enterpriseML.processStep(price, rsi, volume, hasOpenPosition, priceHistory);
            this.mlPerformance = this.enterpriseML.getPerformance();
            return action;
        } catch (e) { console.error('[ML] Error:', e.message); return null; }
    }

    learnFromTrade(pnl, duration, marketDataHistory) {
        if (!this.enterpriseML || !this.enterpriseML.agent || !this.enterpriseML.agent.learnFromResult) return;
        try {
            const vol = ind.calculateCurrentVolatility(marketDataHistory || []);
            this.enterpriseML.agent.learnFromResult(pnl, duration, { market_volatility: vol });
            console.log('[ML LEARN] PnL=$' + pnl.toFixed(2) + ', Duration=' + (duration / 60000).toFixed(1) + 'min');
        } catch (e) { console.warn('[ML LEARN] Error:', e.message); }
    }

    updateConfidenceThreshold() {
        if (this.mlTradingCount < 20) { this.mlConfidenceThreshold = 0.15; this.mlLearningPhase = 'WARMUP'; }
        else if (this.mlTradingCount < 50) { this.mlConfidenceThreshold = 0.15 + (this.mlTradingCount - 20) * (0.35 / 30); this.mlLearningPhase = 'LEARNING'; }
        else if (this.mlTradingCount < 100) { this.mlConfidenceThreshold = 0.50 + (this.mlTradingCount - 50) * (0.10 / 50); this.mlLearningPhase = 'ADVANCED'; }
        else { this.mlConfidenceThreshold = 0.60; this.mlLearningPhase = 'AUTONOMOUS'; }
    }

    /**
     * Create ML signal for ensemble voting
     * @param {object} mlAction
     * @param {number} price
     * @param {string} symbol
     * @returns {object} signal
     */
    createSignal(mlAction, price, symbol) {
        if (!mlAction) return { timestamp: Date.now(), symbol, action: 'HOLD', price, confidence: 0.5, strategy: 'EnterpriseML', reasoning: 'ML null', riskLevel: 0, quantity: 0 };
        this.updateConfidenceThreshold();
        if (mlAction.action_type !== 'HOLD' && mlAction.confidence > this.mlConfidenceThreshold) {
            this.mlTradingCount++;
            return { timestamp: Date.now(), symbol, action: mlAction.action_type, price, confidence: mlAction.confidence, strategy: 'EnterpriseML', reasoning: mlAction.reasoning || 'ML ' + mlAction.action_type, riskLevel: mlAction.confidence < 0.8 ? 1 : 2, quantity: 0 };
        }
        return { timestamp: Date.now(), symbol, action: 'HOLD', price, confidence: mlAction.confidence || 0.5, strategy: 'EnterpriseML', reasoning: mlAction.action_type === 'HOLD' ? 'ML HOLD' : 'ML below threshold', riskLevel: 0, quantity: 0 };
    }

    logProgress() {
        const now = Date.now();
        if (now - this.lastProgressLog < 300000) return;
        this.lastProgressLog = now;
        console.log('[ML PROGRESS] Phase: ' + this.mlLearningPhase + ' | Trades: ' + this.mlTradingCount + ' | Threshold: ' + (this.mlConfidenceThreshold * 100).toFixed(1) + '%');
        console.log('   Episodes: ' + this.mlPerformance.episodes + ' | Avg Reward: ' + (this.mlPerformance.average_reward || 0).toFixed(3) + ' | Exploration: ' + (this.mlPerformance.exploration_rate * 100).toFixed(1) + '%');
    }

    getConfidenceInfo() {
        return 'Phase: ' + this.mlLearningPhase + ', Trades: ' + this.mlTradingCount + ', Threshold: ' + (this.mlConfidenceThreshold * 100).toFixed(1) + '%';
    }

    exportState() {
        return { mlTradingCount: this.mlTradingCount, mlLearningPhase: this.mlLearningPhase, mlConfidenceThreshold: this.mlConfidenceThreshold, mlPerformance: this.mlPerformance };
    }

    restoreState(state) {
        if (state.mlTradingCount) this.mlTradingCount = state.mlTradingCount;
        if (state.mlLearningPhase) this.mlLearningPhase = state.mlLearningPhase;
        if (state.mlConfidenceThreshold) this.mlConfidenceThreshold = state.mlConfidenceThreshold;
        if (state.mlPerformance) this.mlPerformance = state.mlPerformance;
    }
}

module.exports = { MLIntegration };
