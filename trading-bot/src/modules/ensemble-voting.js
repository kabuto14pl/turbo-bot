'use strict';
/**
 * @module EnsembleVoting
 * @description Weighted consensus voting across strategy + ML signals.
 * Dynamic thresholds based on conviction and conflict detection.
 *
 * PATCH #14:
 * - quantity removed (execution engine uses risk manager exclusively)
 * - price uses weighted average from consensus-action signals
 * - Improved conflict detection with signal quality filter
 *
 * PATCH #15 -- NEURAL AI INTEGRATION:
 * - NeuralAI as 7th signal source (20% base weight)
 * - Dynamic weight provider from Thompson Sampling (Bayesian MAB)
 * - Blended weights: 60% AI-optimal + 40% static (safety net)
 * - NeuralAI high-confidence signals also trigger strong conviction threshold
 * - Both AI systems (EnterpriseML + NeuralAI) agreeing = strong conviction
 */

class EnsembleVoting {
    constructor() {
        // PATCH #15: Updated weights -- NeuralAI added at 20%, others redistributed
        this.staticWeights = {
            'AdvancedAdaptive': 0.18, 'RSITurbo': 0.10, 'SuperTrend': 0.12,
            'MACrossover': 0.10, 'MomentumPro': 0.10, 'EnterpriseML': 0.20,
            'NeuralAI': 0.20,
        };
        this.weights = { ...this.staticWeights };
        this.weightProvider = null; // PATCH #15: Dynamic weight source
    }

    /**
     * PATCH #15: Set dynamic weight provider (AdaptiveNeuralEngine).
     * The provider must implement getOptimalStrategyWeights() returning { name: weight }.
     * Thompson Sampling weights are blended 60/40 with static weights for safety.
     * @param {object} provider - AdaptiveNeuralEngine instance
     */
    setWeightProvider(provider) {
        this.weightProvider = provider;
        console.log('[ENSEMBLE] Dynamic weight provider connected (Thompson Sampling Bayesian MAB)');
    }

    /**
     * Perform ensemble voting
     * @param {Map<string, object>} signals - Map of strategy_name -> signal
     * @param {object} riskManager - for overtrading check
     * @returns {object|null} consensus signal or null
     */
    vote(signals, riskManager) {
        // PATCH #15: Update weights from Neural AI Thompson Sampling before voting
        if (this.weightProvider) {
            try {
                const aiWeights = this.weightProvider.getOptimalStrategyWeights();
                if (aiWeights && typeof aiWeights === 'object' && Object.keys(aiWeights).length > 0) {
                    const blended = {};
                    let total = 0;

                    // Blend AI-optimal weights with static weights (60% AI + 40% static for safety)
                    for (const [name, staticW] of Object.entries(this.staticWeights)) {
                        const aiW = aiWeights[name] !== undefined ? aiWeights[name] : staticW;
                        blended[name] = 0.6 * aiW + 0.4 * staticW;
                        total += blended[name];
                    }

                    // Include any new strategies from AI weights not in static defaults
                    for (const [name, w] of Object.entries(aiWeights)) {
                        if (!blended[name]) {
                            blended[name] = w;
                            total += w;
                        }
                    }

                    // Normalize to ensure weights sum to 1.0
                    if (total > 0) {
                        for (const k of Object.keys(blended)) {
                            blended[k] /= total;
                        }
                    }

                    this.weights = blended;
                }
            } catch(e) {
                // Fallback to static weights on any error
                this.weights = { ...this.staticWeights };
            }
        }

        console.log('\n[ENSEMBLE VOTING] ' + signals.size + ' signals:');
        if (signals.size === 0) { console.log('[ENSEMBLE] No signals'); return null; }

        const votes = { BUY: 0, SELL: 0, HOLD: 0 };
        const counts = { BUY: 0, SELL: 0, HOLD: 0 };
        let totalConf = 0, weightedConf = 0;
        // Collect prices from signals matching consensus action for weighted average
        const pricesByAction = { BUY: [], SELL: [], HOLD: [] };

        for (const [name, sig] of signals) {
            const w = this.weights[name] || 0.05;
            const action = sig.action || 'HOLD';
            votes[action] = (votes[action] || 0) + w;
            counts[action] = (counts[action] || 0) + 1;
            const safeConf = (typeof sig.confidence === 'number' && !isNaN(sig.confidence))
                ? Math.max(0, Math.min(1, sig.confidence)) : 0.5;
            totalConf += safeConf;
            weightedConf += safeConf * w;
            if (sig.price > 0) {
                pricesByAction[action].push({ price: sig.price, weight: w * safeConf });
            }
            console.log('   [' + name + '] ' + action + ' (conf: ' + (safeConf * 100).toFixed(1) + '%, w: ' + (w * 100).toFixed(0) + '%)');
        }

        const maxVote = Math.max(votes.BUY, votes.SELL, votes.HOLD);
        const consensusPct = maxVote;
        let action = 'HOLD';
        if (maxVote === votes.BUY) action = 'BUY';
        else if (maxVote === votes.SELL) action = 'SELL';

        // Dynamic threshold
        const hasConflict = votes.BUY > 0.15 && votes.SELL > 0.15;
        let mlConf = 0, mlAct = 'HOLD';
        let aiConf = 0, aiAct = 'HOLD'; // PATCH #15: Track Neural AI too
        for (const [n, s] of signals) {
            if (n === 'EnterpriseML') { mlConf = s.confidence || 0; mlAct = s.action || 'HOLD'; }
            if (n === 'NeuralAI') { aiConf = s.confidence || 0; aiAct = s.action || 'HOLD'; }
        }
        const sourcesAgree = counts[action] || 0;

        let threshold;
        if (hasConflict) {
            threshold = 0.50;
            console.log('   [THRESHOLD] 50% (conflict)');
        } else if (sourcesAgree >= 2 && (
            (mlConf > 0.80 && mlAct === action) ||
            (aiConf > 0.80 && aiAct === action) ||
            (mlConf > 0.65 && aiConf > 0.65 && mlAct === action && aiAct === action)
        )) {
            // PATCH #15: Strong conviction if either AI is highly confident,
            // or both AI systems agree with moderate-high confidence
            threshold = 0.35;
            console.log('   [THRESHOLD] 35% (strong AI conviction)');
        } else {
            threshold = 0.40;
            console.log('   [THRESHOLD] 40% (normal)');
        }

        if (consensusPct < threshold) {
            console.log('[ENSEMBLE] NO CONSENSUS: BUY=' + (votes.BUY*100).toFixed(1) + '%, SELL=' + (votes.SELL*100).toFixed(1) + '%, HOLD=' + (votes.HOLD*100).toFixed(1) + '% (need >' + (threshold*100).toFixed(0) + '%)');
            return null;
        }

        if (riskManager && !riskManager.checkOvertradingLimit()) {
            console.log('[ENSEMBLE] Overtrading limit');
            return null;
        }

        // PATCH #14: Use weighted-average price from signals voting for the consensus action
        const actionPrices = pricesByAction[action] || [];
        let consensusPrice = 0;
        if (actionPrices.length > 0) {
            const totalWeight = actionPrices.reduce((s, p) => s + p.weight, 0);
            consensusPrice = totalWeight > 0
                ? actionPrices.reduce((s, p) => s + p.price * p.weight, 0) / totalWeight
                : actionPrices[0].price;
        } else {
            // Fallback: use any available price
            for (const [, sig] of signals) {
                if (sig.price > 0) { consensusPrice = sig.price; break; }
            }
        }

        // Get symbol from any signal
        let symbol = 'BTCUSDT';
        for (const [, sig] of signals) {
            if (sig.symbol) { symbol = sig.symbol; break; }
        }

        const finalConf = (typeof weightedConf === 'number' && !isNaN(weightedConf))
            ? Math.max(0.1, Math.min(0.95, weightedConf)) : 0.5;

        const result = {
            timestamp: Date.now(),
            symbol,
            action,
            price: consensusPrice,
            quantity: 0, // PATCH #14: execution engine uses risk manager for sizing
            confidence: finalConf,
            strategy: 'EnsembleVoting',
            reasoning: 'Consensus ' + (consensusPct*100).toFixed(1) + '% (' + counts[action] + '/' + signals.size + ')',
            riskLevel: 1,
            agreementPercent: (consensusPct*100).toFixed(1),
            metadata: {
                votes, counts, weightedConfidence: weightedConf,
                strategies: Array.from(signals.keys()),
                hasConflict, threshold,
                mlConfidence: mlConf, mlAction: mlAct,
                aiConfidence: aiConf, aiAction: aiAct, // PATCH #15
                dynamicWeights: this.weightProvider ? true : false,
            },
        };
        console.log('[ENSEMBLE] CONSENSUS: ' + action + ' (' + (consensusPct*100).toFixed(1) + '%, conf: ' + (finalConf*100).toFixed(1) + '%)');
        return result;
    }
}

module.exports = { EnsembleVoting };
