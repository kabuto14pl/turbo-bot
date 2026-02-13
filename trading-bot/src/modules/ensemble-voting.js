'use strict';
/**
 * @module EnsembleVoting
 * @description Weighted consensus voting across strategy + ML signals.
 * Dynamic thresholds based on conviction and conflict detection.
 */

class EnsembleVoting {
    constructor() {
        this.weights = {
            'AdvancedAdaptive': 0.22, 'RSITurbo': 0.12, 'SuperTrend': 0.15,
            'MACrossover': 0.13, 'MomentumPro': 0.13, 'EnterpriseML': 0.25,
        };
    }

    /**
     * Perform ensemble voting
     * @param {Map<string, object>} signals
     * @param {object} riskManager - for overtrading check
     * @returns {object|null} consensus signal or null
     */
    vote(signals, riskManager) {
        console.log('\n??????? [ENSEMBLE VOTING] ' + signals.size + ' signals:');
        if (signals.size === 0) { console.log('?????? [ENSEMBLE] No signals'); return null; }

        const votes = { BUY: 0, SELL: 0, HOLD: 0 };
        const counts = { BUY: 0, SELL: 0, HOLD: 0 };
        let totalConf = 0, weightedConf = 0;

        for (const [name, sig] of signals) {
            const w = this.weights[name] || 0.05;
            votes[sig.action] += w;
            counts[sig.action]++;
            const safeConf = (typeof sig.confidence === 'number' && !isNaN(sig.confidence))
                ? Math.max(0, Math.min(1, sig.confidence)) : 0.5;
            totalConf += safeConf;
            weightedConf += safeConf * w;
            console.log('   ???? ' + name + ': ' + sig.action + ' (conf: ' + (sig.confidence * 100).toFixed(1) + '%, w: ' + (w * 100).toFixed(0) + '%)');
        }

        const maxVote = Math.max(votes.BUY, votes.SELL, votes.HOLD);
        const consensusPct = maxVote;
        let action = 'HOLD';
        if (maxVote === votes.BUY) action = 'BUY';
        else if (maxVote === votes.SELL) action = 'SELL';

        // Dynamic threshold
        const hasConflict = votes.BUY > 0.15 && votes.SELL > 0.15;
        let mlConf = 0, mlAct = 'HOLD';
        for (const [n, s] of signals) { if (n === 'EnterpriseML') { mlConf = s.confidence || 0; mlAct = s.action || 'HOLD'; } }
        const sourcesAgree = counts[action] || 0;

        let threshold;
        if (hasConflict) { threshold = 0.50; console.log('   ??????? [THRESHOLD] 50% (conflict)'); }
        else if (mlConf > 0.80 && mlAct === action && sourcesAgree >= 2) { threshold = 0.35; console.log('   ???? [THRESHOLD] 35% (strong conviction)'); }
        else { threshold = 0.40; console.log('   ???? [THRESHOLD] 40% (normal)'); }

        if (consensusPct < threshold) {
            console.log('?????? [ENSEMBLE] NO CONSENSUS: BUY=' + (votes.BUY*100).toFixed(1) + '%, SELL=' + (votes.SELL*100).toFixed(1) + '%, HOLD=' + (votes.HOLD*100).toFixed(1) + '% (need >' + (threshold*100).toFixed(0) + '%)');
            return null;
        }

        if (riskManager && !riskManager.checkOvertradingLimit()) {
            console.log('??? [ENSEMBLE] Overtrading limit');
            return null;
        }

        const first = signals.values().next().value;
        const result = {
            timestamp: Date.now(), symbol: first?.symbol || 'BTCUSDT',
            action, price: first?.price || 0, quantity: first?.quantity || 0,
            confidence: (typeof weightedConf === 'number' && !isNaN(weightedConf))
                ? Math.max(0.1, Math.min(0.95, weightedConf)) : 0.5,
            strategy: 'EnsembleVoting',
            reasoning: 'Consensus ' + (consensusPct*100).toFixed(1) + '% (' + counts[action] + '/' + signals.size + ')',
            riskLevel: 1, agreementPercent: (consensusPct*100).toFixed(1),
            metadata: { votes, counts, weightedConfidence: weightedConf, strategies: Array.from(signals.keys()) },
        };
        console.log('??? [ENSEMBLE] CONSENSUS: ' + action + ' (' + (consensusPct*100).toFixed(1) + '%, conf: ' + (weightedConf*100).toFixed(1) + '%)');
        return result;
    }
}

module.exports = { EnsembleVoting };
