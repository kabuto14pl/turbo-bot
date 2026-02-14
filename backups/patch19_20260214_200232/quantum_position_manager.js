'use strict';
/**
 * @module QuantumPositionManager
 * @description Enterprise-grade quantum-enhanced dynamic position management system.
 * PATCH #18: Dynamic Position Management with Continuous Quantum Re-evaluation
 *
 * This module implements Stage 4 for the Hybrid Quantum-Classical Pipeline:
 * STAGE 4 — Continuous Position Monitoring & Re-evaluation
 *
 * Architecture (inspired by HSBC/IBM Quantum Risk, JPMorgan QC Research):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  QuantumPositionManager (Orchestrator)                       │
 *   │  ├── QuantumDynamicSLTP         — ATR + QRA volatility adj   │
 *   │  ├── PositionHealthScorer       — Multi-factor scoring 0-100 │
 *   │  ├── MultiPositionOptimizer     — QAOA-based allocation      │
 *   │  ├── ContinuousReEvaluator      — VQC/QMC/QRA periodic      │
 *   │  └── PartialCloseAdvisor        — Quantum exit advisor       │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Integration Points:
 *   - HybridQuantumClassicalPipeline.continuousMonitoring() → Stage 4
 *   - bot.js → quantum position adjustments every N cycles
 *   - execution-engine.js → receives dynamic SL/TP updates
 *   - portfolio-manager.js → partial closes executed via closePosition()
 *
 * Quantum Components Used:
 *   - VQC: Regime reclassification for regime-shift detection
 *   - QMC: Forward scenario simulation for position outlook
 *   - QRA: Stress testing and risk scoring per position
 *   - QAOA: Multi-position allocation optimization
 *   - QFM: Feature space correlation for exit signal detection
 *
 * @version 1.0.0
 * @since PATCH #18
 */

const POSITION_MANAGER_VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════════════════
//  1. QuantumDynamicSLTP
//     ATR-based stop-loss and take-profit with quantum adjustments
//     from QRA volatility analysis, VQC regime classification, and
//     QMC scenario simulation.  Replaces static ATR-only trailing.
// ═══════════════════════════════════════════════════════════════════════════

class QuantumDynamicSLTP {
    constructor(config = {}) {
        // Base ATR multipliers (classical from execution-engine.js)
        this.baseSLMultiplier = config.baseSLMultiplier || 1.5;    // 1.5x ATR SL
        this.baseTPMultiplier = config.baseTPMultiplier || 4.0;    // 4.0x ATR TP
        this.trailingATRMultiplier = config.trailingATRMultiplier || 1.5; // Chandelier 1.5x

        // Quantum adjustment allowed ranges
        this.minSLMultiplier = config.minSLMultiplier || 0.8;     // Tightest: 0.8x ATR
        this.maxSLMultiplier = config.maxSLMultiplier || 2.5;     // Widest: 2.5x ATR
        this.minTPMultiplier = config.minTPMultiplier || 2.0;     // Min TP: 2x ATR
        this.maxTPMultiplier = config.maxTPMultiplier || 6.0;     // Max TP: 6x ATR

        // VQC Regime-specific adjustment look-up table
        // Each regime influences SL tightness, TP target, and trailing distance
        this.regimeAdjustments = {
            TRENDING_UP:     { slFactor: 0.85, tpFactor: 1.30, trailFactor: 0.90 },
            TRENDING_DOWN:   { slFactor: 1.20, tpFactor: 0.70, trailFactor: 1.30 },
            RANGING:         { slFactor: 1.00, tpFactor: 0.85, trailFactor: 1.00 },
            HIGH_VOLATILITY: { slFactor: 1.40, tpFactor: 1.10, trailFactor: 1.50 },
        };

        // QMC scenario weight on TP adjustment
        this.qmcTPAdjustmentWeight = config.qmcTPAdjustmentWeight || 0.30;

        // History tracking
        this.adjustmentHistory = [];
        this.maxHistory = 200;

        // Statistics
        this.totalAdjustments = 0;
        this.avgSLAdjustment = 0;
        this.avgTPAdjustment = 0;
    }

    /**
     * Calculate quantum-adjusted SL/TP for a position.
     *
     * @param {object} position      - Current position data
     * @param {number} currentPrice  - Current market price
     * @param {number} currentATR    - Current calculated ATR value
     * @param {object} vqcRegime     - VQC regime classification result
     * @param {object} qraRisk       - QRA risk analysis result
     * @param {object} qmcSimulation - QMC scenario simulation result
     * @returns {object} { newSL, newTP, adjustments, reasoning, slChanged, tpChanged }
     */
    calculate(position, currentPrice, currentATR, vqcRegime, qraRisk, qmcSimulation) {
        if (!position || !currentPrice || !currentATR || currentATR <= 0) {
            return { newSL: null, newTP: null, adjustments: null, reasoning: 'Insufficient data', slChanged: false, tpChanged: false };
        }

        const entryPrice = position.entryPrice;
        const currentSL = position.stopLoss;
        const currentTP = position.takeProfit;
        const atrAtEntry = position.atrAtEntry || currentATR;
        const profit = currentPrice - entryPrice;
        const atrMult = atrAtEntry > 0 ? profit / atrAtEntry : 0;

        // Start with base classical multipliers
        let slMultiplier = this.baseSLMultiplier;
        let tpMultiplier = this.baseTPMultiplier;
        let trailingMultiplier = this.trailingATRMultiplier;

        // ── Quantum Adjustment 1: VQC Regime-based ──
        // Blend regime-specific factors weighted by VQC confidence
        let regimeAdj = this.regimeAdjustments.RANGING; // default (neutral)
        if (vqcRegime && vqcRegime.regime && this.regimeAdjustments[vqcRegime.regime]) {
            regimeAdj = this.regimeAdjustments[vqcRegime.regime];
            const vqcConf = Math.min(0.60, vqcRegime.confidence || 0.5); // Max 60% quantum influence
            slMultiplier *= (1 - vqcConf) + (regimeAdj.slFactor * vqcConf);
            tpMultiplier *= (1 - vqcConf) + (regimeAdj.tpFactor * vqcConf);
            trailingMultiplier *= (1 - vqcConf) + (regimeAdj.trailFactor * vqcConf);
        }

        // ── Quantum Adjustment 2: QRA Risk Score ──
        // Higher risk → tighter SL, lower TP; Black swan → emergency tightening
        if (qraRisk) {
            const riskScore = qraRisk.riskScore || 50;
            const blackSwan = qraRisk.blackSwanAlert || false;

            if (blackSwan) {
                // Black swan: dramatically tighten everything
                slMultiplier *= 0.60;
                tpMultiplier *= 0.50;
                trailingMultiplier *= 0.70;
            } else if (riskScore > 70) {
                // High risk: proportional tightening
                const tighten = 1 - ((riskScore - 70) / 100) * 0.30;
                slMultiplier *= tighten;
                tpMultiplier *= Math.max(0.70, tighten);
            } else if (riskScore < 30) {
                // Low risk: slight widening to let profits run
                slMultiplier *= 1.10;
                tpMultiplier *= 1.15;
            }

            // Use stress test worst-case scenario as absolute floor
            if (qraRisk.stressTest && qraRisk.stressTest.scenarios) {
                const impacts = Object.values(qraRisk.stressTest.scenarios).map(s => s.portfolioImpact || 0);
                const worstScenario = impacts.length > 0 ? Math.min(...impacts) : -0.03;
                if (worstScenario < -0.03) {
                    slMultiplier *= Math.max(0.70, 1 + worstScenario * 5);
                }
            }
        }

        // ── Quantum Adjustment 3: QMC Scenario-based TP ──
        // Forward-looking simulation adjusts take-profit expectations
        if (qmcSimulation) {
            const outlook = qmcSimulation.recommendation || '';
            if (outlook.includes('BULLISH') || outlook.includes('bullish') || outlook.includes('Hold')) {
                tpMultiplier *= 1.20;  // More room to run in favorable scenario
            } else if (outlook.includes('BEARISH') || outlook.includes('bearish')) {
                tpMultiplier *= 0.75;  // Reduce TP, take money earlier
                slMultiplier *= 0.85;  // Tighten SL as well
            }

            // Use QMC expected return distribution to guide TP
            if (qmcSimulation.statistics) {
                const expectedReturn = qmcSimulation.statistics.mean || 0;
                const expectedATRs = currentATR > 0 ? expectedReturn / (currentATR / currentPrice) : 0;
                if (expectedATRs > 1.5) {
                    tpMultiplier = Math.min(this.maxTPMultiplier, tpMultiplier * 1.15);
                } else if (expectedATRs < -0.5) {
                    tpMultiplier = Math.max(this.minTPMultiplier, tpMultiplier * 0.80);
                    slMultiplier = Math.max(this.minSLMultiplier, slMultiplier * 0.85);
                }
            }
        }

        // ── Clamp to safe ranges ──
        slMultiplier = Math.max(this.minSLMultiplier, Math.min(this.maxSLMultiplier, slMultiplier));
        tpMultiplier = Math.max(this.minTPMultiplier, Math.min(this.maxTPMultiplier, tpMultiplier));
        trailingMultiplier = Math.max(0.80, Math.min(2.50, trailingMultiplier));

        // ── Calculate new SL level ──
        let newSL;
        const highestPrice = position._highestPrice || currentPrice;

        if (atrMult >= 3.0) {
            // CHANDELIER zone: quantum-adjusted trailing from highest price
            const chandelierSL = highestPrice - trailingMultiplier * currentATR;
            const minLock = entryPrice + 1.5 * atrAtEntry;
            newSL = Math.max(chandelierSL, minLock);
        } else if (atrMult >= 2.0) {
            // Lock 1.0x ATR profit, quantum-adjusted
            const lockFactor = 1.0 * (2 - slMultiplier / this.baseSLMultiplier);
            newSL = entryPrice + Math.max(0.5, lockFactor) * atrAtEntry;
        } else if (atrMult >= 1.5) {
            // Lock 0.5x ATR
            newSL = entryPrice + 0.5 * atrAtEntry;
        } else if (atrMult >= 1.0) {
            // Breakeven + quantum-adjusted buffer
            const beBuffer = entryPrice * 0.003 * slMultiplier;
            newSL = entryPrice + beBuffer;
        } else {
            // Below 1x ATR: quantum-adjusted initial SL (only used if tighter than current)
            newSL = entryPrice - slMultiplier * atrAtEntry;
        }

        // SL constraint: can only move UP (never widen stop)
        if (currentSL && newSL <= currentSL) {
            newSL = currentSL;
        }

        // ── Calculate new TP level ──
        let newTP = entryPrice + tpMultiplier * atrAtEntry;
        // Don't set TP below current price + 0.5 ATR if profitable
        if (profit > 0 && newTP < currentPrice + 0.5 * currentATR) {
            newTP = currentPrice + 0.5 * currentATR;
        }

        // ── Build detailed reasoning ──
        const adjustments = {
            slMultiplier: parseFloat(slMultiplier.toFixed(3)),
            tpMultiplier: parseFloat(tpMultiplier.toFixed(3)),
            trailingMultiplier: parseFloat(trailingMultiplier.toFixed(3)),
            regime: vqcRegime ? vqcRegime.regime : 'UNKNOWN',
            riskScore: qraRisk ? (qraRisk.riskScore || 'N/A') : 'N/A',
            blackSwan: qraRisk ? (qraRisk.blackSwanAlert || false) : false,
            qmcOutlook: qmcSimulation ? (qmcSimulation.recommendation || 'N/A') : 'N/A',
        };

        const reasoning = [];
        if (vqcRegime && vqcRegime.regime) {
            reasoning.push('VQC=' + vqcRegime.regime + '(' + ((vqcRegime.confidence || 0) * 100).toFixed(0) + '%)');
        }
        if (qraRisk) {
            reasoning.push('QRA=' + (qraRisk.riskScore || '?') + '/100' + (qraRisk.blackSwanAlert ? ' BLACK_SWAN!' : ''));
        }
        if (qmcSimulation && qmcSimulation.recommendation) {
            reasoning.push('QMC=' + (qmcSimulation.recommendation || '').substring(0, 30));
        }

        // Track statistics
        this.totalAdjustments++;
        const slDelta = currentSL ? (newSL - currentSL) / currentATR : 0;
        const tpDelta = currentTP ? (newTP - currentTP) / currentATR : 0;
        this._updateRunningAvg(slDelta, tpDelta);

        this.adjustmentHistory.push({
            timestamp: Date.now(), symbol: position.symbol,
            oldSL: currentSL, newSL, oldTP: currentTP, newTP, adjustments,
        });
        if (this.adjustmentHistory.length > this.maxHistory) {
            this.adjustmentHistory = this.adjustmentHistory.slice(-this.maxHistory);
        }

        return {
            newSL: parseFloat(newSL.toFixed(2)),
            newTP: parseFloat(newTP.toFixed(2)),
            adjustments,
            reasoning: reasoning.join(' | '),
            slChanged: currentSL ? Math.abs(newSL - currentSL) > 0.01 : true,
            tpChanged: currentTP ? Math.abs(newTP - currentTP) > 0.01 : true,
        };
    }

    _updateRunningAvg(slDelta, tpDelta) {
        const n = this.totalAdjustments;
        this.avgSLAdjustment = ((n - 1) * this.avgSLAdjustment + slDelta) / n;
        this.avgTPAdjustment = ((n - 1) * this.avgTPAdjustment + tpDelta) / n;
    }

    getStats() {
        return {
            totalAdjustments: this.totalAdjustments,
            avgSLAdjustment: parseFloat(this.avgSLAdjustment.toFixed(4)),
            avgTPAdjustment: parseFloat(this.avgTPAdjustment.toFixed(4)),
            historySize: this.adjustmentHistory.length,
        };
    }
}


// ═══════════════════════════════════════════════════════════════════════════
//  2. PositionHealthScorer
//     Multi-factor quantum risk scoring per position on 0-100 scale.
//     Six weighted factors: PnL, Regime, QMC, Risk, Time, Momentum.
//     Status: HEALTHY (65+), WARNING (40-65), CRITICAL (25-40), EMERGENCY (<25)
// ═══════════════════════════════════════════════════════════════════════════

class PositionHealthScorer {
    constructor(config = {}) {
        // Scoring weights (must sum to 1.0)
        this.weights = {
            pnlScore:      config.pnlWeight      || 0.20,
            regimeScore:   config.regimeWeight    || 0.20,
            qmcScore:      config.qmcWeight       || 0.20,
            riskScore:     config.riskWeight       || 0.20,
            timeScore:     config.timeWeight       || 0.10,
            momentumScore: config.momentumWeight   || 0.10,
        };

        // Status thresholds
        this.healthyThreshold  = config.healthyThreshold  || 65;
        this.warningThreshold  = config.warningThreshold  || 40;
        this.criticalThreshold = config.criticalThreshold || 25;

        // Per-position score history
        this.scoreHistory = new Map(); // symbol -> entry[]
        this.maxScoreHistory = 50;
    }

    /**
     * Score a position's health on a 0-100 composite scale.
     *
     * @param {object}   position     - Position data
     * @param {number}   currentPrice - Current market price
     * @param {object}   vqcRegime    - VQC classification result
     * @param {object}   qmcSim       - QMC simulation result
     * @param {object}   qraRisk      - QRA risk analysis
     * @param {number[]} recentPrices - Last 20-30 close prices
     * @returns {object} { score, status, factors, recommendations, ... }
     */
    score(position, currentPrice, vqcRegime, qmcSim, qraRisk, recentPrices) {
        if (!position || !currentPrice) {
            return { score: 50, status: 'UNKNOWN', factors: {}, recommendations: [] };
        }

        const factors = {};
        const recommendations = [];
        const entryPrice = position.entryPrice;
        const quantity = position.quantity || 0;
        const unrealizedPnL = (currentPrice - entryPrice) * quantity;
        const pnlPct = (currentPrice - entryPrice) / entryPrice;
        const atr = position.atrAtEntry || (currentPrice * 0.02);
        const atrMultiple = (currentPrice - entryPrice) / atr;
        const hoursHeld = (Date.now() - (position.entryTime || Date.now())) / 3600000;

        // ── Factor 1: PnL Score (0-100) ──
        if (atrMultiple >= 3.0)      factors.pnlScore = 95;
        else if (atrMultiple >= 2.0) factors.pnlScore = 85;
        else if (atrMultiple >= 1.0) factors.pnlScore = 70;
        else if (atrMultiple >= 0.0) factors.pnlScore = 55;
        else if (atrMultiple >= -0.5) factors.pnlScore = 35;
        else if (atrMultiple >= -1.0) factors.pnlScore = 20;
        else                          factors.pnlScore = 5;

        // ── Factor 2: Regime Alignment Score (0-100) ──
        factors.regimeScore = 50;
        if (vqcRegime && vqcRegime.regime) {
            const regime = vqcRegime.regime;
            const conf = vqcRegime.confidence || 0.5;
            // For LONG positions
            if (regime === 'TRENDING_UP')        factors.regimeScore = 70 + conf * 30;
            else if (regime === 'RANGING')       factors.regimeScore = 50;
            else if (regime === 'TRENDING_DOWN') factors.regimeScore = 15 + (1 - conf) * 20;
            else if (regime === 'HIGH_VOLATILITY') factors.regimeScore = 30 + (1 - conf) * 20;

            // Detect adverse regime transitions from history
            const prevScores = this.scoreHistory.get(position.symbol) || [];
            if (prevScores.length >= 2) {
                const prevRegime = prevScores[prevScores.length - 1].regime;
                if (prevRegime === 'TRENDING_UP' && (regime === 'TRENDING_DOWN' || regime === 'HIGH_VOLATILITY')) {
                    factors.regimeScore = Math.min(factors.regimeScore, 25);
                    recommendations.push('REGIME_SHIFT_ADVERSE: ' + prevRegime + ' -> ' + regime);
                }
            }
        }

        // ── Factor 3: QMC Scenario Score (0-100) ──
        factors.qmcScore = 50;
        if (qmcSim) {
            const outlook = qmcSim.recommendation || '';
            if (outlook.includes('BULLISH') || outlook.includes('Hold'))         factors.qmcScore = 75;
            else if (outlook.includes('BEARISH'))                                factors.qmcScore = 20;
            else if (outlook.includes('Caution') || outlook.includes('caution')) factors.qmcScore = 35;

            // Use VaR/CVaR from QMC for additional penalty
            if (qmcSim.riskMetrics) {
                const var95 = Math.abs(qmcSim.riskMetrics.var95 || 0);
                if (var95 > 0.03) {
                    factors.qmcScore = Math.max(10, factors.qmcScore - 20);
                    recommendations.push('HIGH_VAR: VaR(95%)=' + (var95 * 100).toFixed(1) + '%');
                }
            }
            // Expected return influence
            if (qmcSim.statistics && qmcSim.statistics.mean !== undefined) {
                if (qmcSim.statistics.mean < -0.01) {
                    factors.qmcScore = Math.max(10, factors.qmcScore - 15);
                }
            }
        }

        // ── Factor 4: Risk Score (inverted: 0=danger, 100=safe) ──
        factors.riskScore = 60;
        if (qraRisk) {
            const risk = qraRisk.riskScore || 50;
            factors.riskScore = Math.max(0, 100 - risk);
            if (qraRisk.blackSwanAlert) {
                factors.riskScore = 5;
                recommendations.push('BLACK_SWAN_ALERT: Immediate action recommended');
            }
            // Stress test penalty
            if (qraRisk.stressTest && qraRisk.stressTest.scenarios) {
                const impacts = Object.values(qraRisk.stressTest.scenarios).map(s => s.portfolioImpact || 0);
                const worstImpact = impacts.length > 0 ? Math.min(...impacts) : -0.03;
                if (worstImpact < -0.05) {
                    factors.riskScore = Math.min(factors.riskScore, 20);
                    recommendations.push('STRESS_FAIL: worst=' + (worstImpact * 100).toFixed(1) + '%');
                }
            }
        }

        // ── Factor 5: Time Decay Score (0-100) ──
        if (hoursHeld < 2)       factors.timeScore = 90;
        else if (hoursHeld < 6)  factors.timeScore = 80;
        else if (hoursHeld < 12) factors.timeScore = 70;
        else if (hoursHeld < 24) factors.timeScore = 55;
        else if (hoursHeld < 48) factors.timeScore = 35;
        else                     factors.timeScore = 15;
        // Profitable positions get time-decay reprieve
        if (pnlPct > 0.005 && hoursHeld > 24) {
            factors.timeScore = Math.max(factors.timeScore, 45);
        }

        // ── Factor 6: Momentum Score (0-100) ──
        factors.momentumScore = 50;
        if (recentPrices && recentPrices.length >= 10) {
            const recent5 = recentPrices.slice(-5);
            const prev5 = recentPrices.slice(-10, -5);
            const recentAvg = recent5.reduce((s, p) => s + p, 0) / recent5.length;
            const prevAvg = prev5.reduce((s, p) => s + p, 0) / prev5.length;
            const momentumPct = (recentAvg - prevAvg) / prevAvg;
            // For LONG: positive momentum = good
            if (momentumPct > 0.005)       factors.momentumScore = 75 + Math.min(25, momentumPct * 2000);
            else if (momentumPct > 0)      factors.momentumScore = 55;
            else if (momentumPct > -0.005) factors.momentumScore = 40;
            else                           factors.momentumScore = Math.max(10, 30 + momentumPct * 2000);
        }

        // ── Weighted composite score ──
        let totalScore = 0;
        for (const [key, weight] of Object.entries(this.weights)) {
            totalScore += (factors[key] || 50) * weight;
        }
        totalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

        // ── Status determination ──
        let status;
        if (totalScore >= this.healthyThreshold)       status = 'HEALTHY';
        else if (totalScore >= this.warningThreshold)  status = 'WARNING';
        else if (totalScore >= this.criticalThreshold) status = 'CRITICAL';
        else                                           status = 'EMERGENCY';

        // ── Action recommendations based on status ──
        if (status === 'EMERGENCY') {
            recommendations.push('CLOSE_POSITION: Health emergency (score=' + totalScore + ')');
        } else if (status === 'CRITICAL') {
            if (pnlPct > 0) recommendations.push('PARTIAL_CLOSE_50: Take profits while available');
            else recommendations.push('TIGHTEN_SL: Reduce exposure, prepare exit');
        } else if (status === 'WARNING') {
            if (pnlPct > 0.01) recommendations.push('PARTIAL_CLOSE_25: Lock some profits');
            else recommendations.push('MONITOR_CLOSELY: Position under stress');
        }

        // ── Store history ──
        const entry = {
            timestamp: Date.now(), score: totalScore, status,
            regime: vqcRegime ? vqcRegime.regime : 'UNKNOWN',
            pnlPct: parseFloat(pnlPct.toFixed(4)),
        };
        if (!this.scoreHistory.has(position.symbol)) this.scoreHistory.set(position.symbol, []);
        const hist = this.scoreHistory.get(position.symbol);
        hist.push(entry);
        if (hist.length > this.maxScoreHistory) hist.splice(0, hist.length - this.maxScoreHistory);

        return {
            score: totalScore, status, factors, recommendations,
            unrealizedPnL: parseFloat(unrealizedPnL.toFixed(2)),
            pnlPct: parseFloat((pnlPct * 100).toFixed(2)),
            atrMultiple: parseFloat(atrMultiple.toFixed(2)),
            hoursHeld: parseFloat(hoursHeld.toFixed(1)),
        };
    }

    /**
     * Get score trend for a position symbol.
     */
    getScoreTrend(symbol) {
        const hist = this.scoreHistory.get(symbol) || [];
        if (hist.length < 3) return { trend: 'INSUFFICIENT_DATA', scores: hist };
        const recent = hist.slice(-5).map(h => h.score);
        const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
        const first = recent[0];
        const last = recent[recent.length - 1];
        let trend = 'STABLE';
        if (last - first > 10) trend = 'IMPROVING';
        else if (first - last > 10) trend = 'DETERIORATING';
        return { trend, scores: hist.slice(-10), averageScore: parseFloat(avg.toFixed(1)) };
    }

    clearHistory(symbol) {
        this.scoreHistory.delete(symbol);
    }
}


// ═══════════════════════════════════════════════════════════════════════════
//  3. MultiPositionOptimizer
//     QAOA-based multi-position portfolio optimization.
//     Handles allocation, pyramiding, consolidation, exposure limits.
// ═══════════════════════════════════════════════════════════════════════════

class MultiPositionOptimizer {
    constructor(config = {}) {
        this.maxPositions = config.maxPositions || 5;
        this.maxExposurePerPosition = config.maxExposurePerPosition || 0.25;  // 25% max
        this.maxTotalExposure = config.maxTotalExposure || 0.80;              // 80% total
        this.minPositionSize = config.minPositionSize || 0.02;                // 2% minimum
        this.riskBudget = config.riskBudget || 0.15;                          // 15% risk budget

        // Pyramid configuration
        this.pyramidEnabled = config.pyramidEnabled !== false;
        this.maxPyramidLevels = config.maxPyramidLevels || 3;
        this.pyramidSizeDecay = config.pyramidSizeDecay || 0.50;  // Each level 50% of previous
        this.pyramidMinATRProfit = config.pyramidMinATRProfit || 1.5;

        this.optimizationCount = 0;
    }

    /**
     * Optimize allocation across open positions using quantum-inspired scoring.
     *
     * @param {Array}  positions     - Array of position summaries
     * @param {number} portfolioValue - Total portfolio value
     * @param {object} qaoaResult    - QAOA result from pipeline (optional)
     * @returns {object} { allocations, pyramidRecommendations, consolidations, ... }
     */
    optimize(positions, portfolioValue, qaoaResult) {
        this.optimizationCount++;

        if (!positions || positions.length === 0) {
            return {
                allocations: {},
                pyramidRecommendations: [],
                consolidations: [],
                canOpenNew: true,
                remainingCapacity: this.maxPositions,
                totalExposure: 0,
            };
        }

        const result = {
            allocations: {},
            pyramidRecommendations: [],
            consolidations: [],
            canOpenNew: positions.length < this.maxPositions,
            remainingCapacity: this.maxPositions - positions.length,
            totalExposure: 0,
        };

        // Calculate current exposure per position
        let totalExposure = 0;
        const positionData = positions.map(pos => {
            const exposure = portfolioValue > 0 ? (pos.value || 0) / portfolioValue : 0;
            totalExposure += exposure;
            return { ...pos, exposure };
        });
        result.totalExposure = parseFloat(totalExposure.toFixed(4));

        // Quantum-scored allocation: blend health-based + QAOA-based weights
        const totalHealthScore = positionData.reduce((s, p) => s + (p.healthScore || 50), 0);

        for (const pos of positionData) {
            const healthWeight = totalHealthScore > 0
                ? (pos.healthScore || 50) / totalHealthScore
                : 1 / positionData.length;

            let qaoaWeight = 1 / positionData.length; // Default equal weight
            if (qaoaResult && qaoaResult.weights && qaoaResult.weights[pos.symbol]) {
                qaoaWeight = Math.max(0.05, Math.min(0.40, qaoaResult.weights[pos.symbol]));
            }

            // 50/50 blend of health and QAOA allocation
            let targetAllocation = (0.5 * healthWeight + 0.5 * qaoaWeight) * this.maxTotalExposure;
            targetAllocation = Math.max(this.minPositionSize, Math.min(this.maxExposurePerPosition, targetAllocation));

            result.allocations[pos.symbol] = {
                currentExposure: parseFloat(pos.exposure.toFixed(4)),
                targetAllocation: parseFloat(targetAllocation.toFixed(4)),
                healthScore: pos.healthScore || 50,
                action: this._determineAction(pos.exposure, targetAllocation, pos),
            };
        }

        // Pyramid recommendations for profitable, healthy positions
        if (this.pyramidEnabled) {
            for (const pos of positionData) {
                if (!pos.atrMultiple || pos.atrMultiple < this.pyramidMinATRProfit) continue;
                if ((pos.pyramidLevel || 0) >= this.maxPyramidLevels) continue;
                if (totalExposure >= this.maxTotalExposure * 0.9) continue;
                if ((pos.healthScore || 0) < 60) continue;

                const nextLevel = (pos.pyramidLevel || 0) + 1;
                const addSize = pos.exposure * this.pyramidSizeDecay;

                if (addSize >= this.minPositionSize && totalExposure + addSize <= this.maxTotalExposure) {
                    result.pyramidRecommendations.push({
                        symbol: pos.symbol,
                        level: nextLevel,
                        addSizePct: parseFloat((addSize * 100).toFixed(2)),
                        reason: 'Profit=' + (pos.atrMultiple || 0).toFixed(1) + 'xATR Health=' + (pos.healthScore || 0),
                    });
                }
            }
        }

        // Consolidation: close tiny or very unhealthy positions
        for (const pos of positionData) {
            if ((pos.healthScore || 50) < 30 && pos.exposure < 0.05) {
                result.consolidations.push({
                    symbol: pos.symbol,
                    reason: 'Health=' + (pos.healthScore || 0) + ' Exposure=' + (pos.exposure * 100).toFixed(1) + '%',
                    action: 'CLOSE',
                });
            }
        }

        return result;
    }

    _determineAction(currentExposure, targetAllocation, pos) {
        const diff = targetAllocation - currentExposure;
        if (Math.abs(diff) < 0.02) return 'HOLD';
        if (diff > 0.05 && (pos.healthScore || 50) >= 60) return 'INCREASE';
        if (diff < -0.05 || (pos.healthScore || 50) < 30) return 'DECREASE';
        return 'HOLD';
    }

    getStats() {
        return {
            optimizationCount: this.optimizationCount,
            maxPositions: this.maxPositions,
            pyramidEnabled: this.pyramidEnabled,
        };
    }
}


// ═══════════════════════════════════════════════════════════════════════════
//  4. ContinuousReEvaluator
//     Periodic quantum re-evaluation engine for open positions.
//     Calls HybridQuantumClassicalPipeline.continuousMonitoring() (Stage 4).
//     Three re-eval levels: RISK_ONLY (3-cycle), STANDARD (5-cycle), FULL (15-cycle)
// ═══════════════════════════════════════════════════════════════════════════

class ContinuousReEvaluator {
    constructor(config = {}) {
        // Re-evaluation frequency (in trading cycles)
        this.reEvalInterval     = config.reEvalInterval     || 5;    // STANDARD: VQC + QRA
        this.fullReEvalInterval = config.fullReEvalInterval || 15;   // FULL: VQC+QMC+QRA+QAOA
        this.riskReEvalInterval = config.riskReEvalInterval || 3;    // RISK_ONLY: QRA only

        // Counters
        this.cycleCount = 0;
        this.totalReEvaluations = 0;
        this.totalActionsTaken = 0;

        // History
        this.reEvalHistory = [];
        this.maxHistory = 100;

        // Per-position regime tracking for transition detection
        this.lastRegimePerPosition = new Map();
    }

    /**
     * Determine if re-evaluation should run this cycle and at what level.
     * @returns {{ shouldReEval: boolean, level: string }}
     */
    shouldReEvaluate() {
        this.cycleCount++;
        if (this.cycleCount % this.fullReEvalInterval === 0) {
            return { shouldReEval: true, level: 'FULL' };
        }
        if (this.cycleCount % this.reEvalInterval === 0) {
            return { shouldReEval: true, level: 'STANDARD' };
        }
        if (this.cycleCount % this.riskReEvalInterval === 0) {
            return { shouldReEval: true, level: 'RISK_ONLY' };
        }
        return { shouldReEval: false, level: 'NONE' };
    }

    /**
     * Execute re-evaluation using pipeline.continuousMonitoring().
     *
     * @param {Map}    positions      - symbol -> position
     * @param {number[]} priceHistory - Close prices
     * @param {number} portfolioValue
     * @param {object} pipeline       - HybridQuantumClassicalPipeline reference
     * @param {string} level          - 'FULL', 'STANDARD', or 'RISK_ONLY'
     * @returns {object} { positionResults, summary, actions }
     */
    reEvaluate(positions, priceHistory, portfolioValue, pipeline, level) {
        if (!positions || positions.size === 0 || !priceHistory || priceHistory.length < 30) {
            return { positionResults: new Map(), summary: { level, positionsEvaluated: 0 }, actions: [] };
        }

        this.totalReEvaluations++;
        const t0 = Date.now();

        // Call pipeline Stage 4 for quantum computation
        let monitoringResult = null;
        if (pipeline && pipeline.continuousMonitoring) {
            try {
                monitoringResult = pipeline.continuousMonitoring(positions, priceHistory, portfolioValue, level);
            } catch (e) {
                console.warn('[RE-EVAL] Pipeline Stage 4 error:', e.message);
            }
        }

        // Fallback: use cached pipeline data if Stage 4 call failed
        const vqcRegime = (monitoringResult && monitoringResult.vqcRegime) || null;
        const qraRisk = (monitoringResult && monitoringResult.riskAnalysis) || null;
        const qmcSim = (monitoringResult && monitoringResult.qmcSimulation) || null;

        const positionResults = new Map();
        const actions = [];

        // Per-position processing
        for (const [sym, pos] of positions) {
            const result = {
                symbol: sym,
                vqcRegime,
                qraRisk,
                qmcSim,
                regimeTransition: null,
                actionRecommendation: null,
            };

            // Detect regime transition
            const prevRegime = this.lastRegimePerPosition.get(sym);
            if (vqcRegime && vqcRegime.regime) {
                if (prevRegime && prevRegime !== vqcRegime.regime) {
                    result.regimeTransition = {
                        from: prevRegime,
                        to: vqcRegime.regime,
                        isAdverse: this._isAdverseTransition(prevRegime, vqcRegime.regime),
                    };
                    if (result.regimeTransition.isAdverse) {
                        actions.push({
                            type: 'REGIME_SHIFT',
                            symbol: sym,
                            detail: prevRegime + ' -> ' + vqcRegime.regime,
                            severity: 'HIGH',
                            recommendation: 'TIGHTEN_SL',
                        });
                    }
                }
                this.lastRegimePerPosition.set(sym, vqcRegime.regime);
            }

            // Generate action recommendation
            result.actionRecommendation = this._generateAction(pos, vqcRegime, qraRisk, qmcSim, priceHistory);
            if (result.actionRecommendation && result.actionRecommendation.action !== 'HOLD') {
                actions.push({
                    type: result.actionRecommendation.action,
                    symbol: sym,
                    detail: result.actionRecommendation.reason,
                    severity: result.actionRecommendation.severity,
                    recommendation: result.actionRecommendation.action,
                    params: result.actionRecommendation.params || {},
                });
            }

            positionResults.set(sym, result);
        }

        const elapsed = Date.now() - t0;
        const summary = {
            level,
            positionsEvaluated: positions.size,
            actionsGenerated: actions.length,
            computeTimeMs: elapsed,
            regime: vqcRegime ? vqcRegime.regime : 'N/A',
            riskLevel: qraRisk ? qraRisk.riskLevel : 'N/A',
            qmcOutlook: qmcSim ? (qmcSim.recommendation || 'N/A') : 'N/A',
        };

        this.reEvalHistory.push({ timestamp: Date.now(), ...summary });
        if (this.reEvalHistory.length > this.maxHistory) {
            this.reEvalHistory = this.reEvalHistory.slice(-this.maxHistory);
        }
        if (actions.length > 0) this.totalActionsTaken += actions.length;

        return { positionResults, summary, actions };
    }

    _isAdverseTransition(from, to) {
        // Adverse transitions for LONG positions
        const adverseMap = {
            'TRENDING_UP': ['TRENDING_DOWN', 'HIGH_VOLATILITY'],
            'RANGING': ['TRENDING_DOWN'],
        };
        return adverseMap[from] ? adverseMap[from].includes(to) : false;
    }

    _generateAction(position, vqcRegime, qraRisk, qmcSim, priceHistory) {
        const currentPrice = priceHistory[priceHistory.length - 1];
        const profit = currentPrice - position.entryPrice;
        const atr = position.atrAtEntry || (currentPrice * 0.02);
        const atrMult = profit / atr;
        const hoursHeld = (Date.now() - (position.entryTime || Date.now())) / 3600000;

        // Emergency: black swan
        if (qraRisk && qraRisk.blackSwanAlert) {
            return { action: 'EMERGENCY_CLOSE', reason: 'Black swan detected', severity: 'CRITICAL', params: { closePct: 1.0 } };
        }
        // Extreme risk + underwater
        if (qraRisk && (qraRisk.riskScore || 0) > 85 && atrMult < 0) {
            return { action: 'TIGHTEN_SL_AGGRESSIVE', reason: 'Extreme risk + underwater', severity: 'HIGH', params: { slMultiplier: 0.5 } };
        }
        // Downtrend regime
        if (vqcRegime && vqcRegime.regime === 'TRENDING_DOWN' && (vqcRegime.confidence || 0) > 0.6) {
            if (atrMult > 1.0) {
                return { action: 'PARTIAL_CLOSE', reason: 'Downtrend, lock profits', severity: 'MEDIUM', params: { closePct: 0.5 } };
            } else if (atrMult < -0.5) {
                return { action: 'CLOSE_POSITION', reason: 'Downtrend + underwater', severity: 'HIGH', params: { closePct: 1.0 } };
            }
        }
        // QMC bearish + large profit
        if (qmcSim && qmcSim.recommendation && qmcSim.recommendation.includes('BEARISH') && atrMult > 2.0) {
            return { action: 'PARTIAL_CLOSE', reason: 'QMC bearish, protect profits', severity: 'MEDIUM', params: { closePct: 0.3 } };
        }
        // Time-based + elevated risk
        if (hoursHeld > 24 && atrMult < 0 && qraRisk && (qraRisk.riskScore || 0) > 60) {
            return { action: 'TIGHTEN_SL', reason: '24h+ underwater + elevated risk', severity: 'MEDIUM', params: { slMultiplier: 0.7 } };
        }

        return { action: 'HOLD', reason: 'No re-evaluation action needed', severity: 'LOW' };
    }

    getStats() {
        return {
            cycleCount: this.cycleCount,
            totalReEvaluations: this.totalReEvaluations,
            totalActionsTaken: this.totalActionsTaken,
            reEvalHistorySize: this.reEvalHistory.length,
        };
    }

    clearPositionData(symbol) {
        this.lastRegimePerPosition.delete(symbol);
    }
}


// ═══════════════════════════════════════════════════════════════════════════
//  5. PartialCloseAdvisor
//     Quantum-based partial close and resize recommendations.
//     Priorities: Emergency → Regime → Risk → QMC → ATR-based → Health-based
// ═══════════════════════════════════════════════════════════════════════════

class PartialCloseAdvisor {
    constructor(config = {}) {
        // Quantum-adjusted ATR-based partial TP levels
        this.levels = config.levels || [
            { atrMult: 1.5, closePct: 0.25, label: 'QUANTUM_TP_L1' },
            { atrMult: 2.5, closePct: 0.25, label: 'QUANTUM_TP_L2' },
            { atrMult: 4.0, closePct: 0.30, label: 'QUANTUM_TP_L3' },
            // Remaining 20% runs as Chandelier exit or regime-triggered close
        ];

        // Quantum-triggered thresholds
        this.regimeCloseConfidence    = config.regimeCloseConfidence    || 0.65;
        this.riskCloseThreshold       = config.riskCloseThreshold       || 75;
        this.qmcBearishCloseThreshold = config.qmcBearishCloseThreshold || 0.60;

        // Stats
        this.totalRecommendations = 0;
        this.totalClosesExecuted = 0;
    }

    /**
     * Generate partial close recommendation for a position.
     *
     * @param {object} position     - Position data
     * @param {number} currentPrice
     * @param {number} currentATR
     * @param {object} healthScore  - From PositionHealthScorer
     * @param {object} vqcRegime    - VQC classification
     * @param {object} qmcSim       - QMC simulation
     * @param {object} qraRisk      - QRA risk analysis
     * @returns {object} { shouldClose, closePct, reason, label, urgency, flagKey? }
     */
    advise(position, currentPrice, currentATR, healthScore, vqcRegime, qmcSim, qraRisk) {
        this.totalRecommendations++;
        if (!position || !currentPrice) {
            return { shouldClose: false, closePct: 0, reason: 'No data', label: 'NONE', urgency: 'LOW' };
        }

        const atr = position.atrAtEntry || currentATR || (currentPrice * 0.02);
        const profit = currentPrice - position.entryPrice;
        const atrMult = atr > 0 ? profit / atr : 0;

        // Priority 1: Black swan emergency
        if (qraRisk && qraRisk.blackSwanAlert) {
            return { shouldClose: true, closePct: 0.75, reason: 'BLACK_SWAN emergency', label: 'QUANTUM_EMERGENCY', urgency: 'CRITICAL' };
        }
        // Priority 1b: Health emergency
        if (healthScore && healthScore.status === 'EMERGENCY') {
            return { shouldClose: true, closePct: 0.80, reason: 'Health emergency (score=' + healthScore.score + ')', label: 'HEALTH_EMERGENCY', urgency: 'CRITICAL' };
        }

        // Priority 2: Regime-triggered close
        if (vqcRegime && vqcRegime.regime === 'TRENDING_DOWN' && (vqcRegime.confidence || 0) > this.regimeCloseConfidence) {
            if (atrMult > 1.0) {
                return { shouldClose: true, closePct: 0.50, reason: 'Downtrend (conf=' + ((vqcRegime.confidence || 0) * 100).toFixed(0) + '%)', label: 'QUANTUM_REGIME_CLOSE', urgency: 'HIGH' };
            } else if (atrMult < -0.3) {
                return { shouldClose: true, closePct: 0.75, reason: 'Downtrend + loss', label: 'QUANTUM_REGIME_EXIT', urgency: 'HIGH' };
            }
        }

        // Priority 3: Risk-triggered close
        if (qraRisk && (qraRisk.riskScore || 0) > this.riskCloseThreshold && atrMult > 0.5) {
            return { shouldClose: true, closePct: 0.30, reason: 'High risk (score=' + qraRisk.riskScore + ')', label: 'QUANTUM_RISK_CLOSE', urgency: 'MEDIUM' };
        }

        // Priority 4: QMC scenario-triggered close
        if (qmcSim && qmcSim.recommendation && qmcSim.recommendation.includes('BEARISH') && atrMult > 2.0) {
            return { shouldClose: true, closePct: 0.35, reason: 'QMC bearish + large profit', label: 'QUANTUM_QMC_CLOSE', urgency: 'MEDIUM' };
        }

        // Priority 5: Quantum-adjusted ATR-based partial TP
        let levelAdjust = 1.0;
        if (vqcRegime && vqcRegime.regime) {
            if (vqcRegime.regime === 'TRENDING_UP')      levelAdjust = 1.15;  // Let profits run
            else if (vqcRegime.regime === 'HIGH_VOLATILITY') levelAdjust = 0.85;  // Take sooner
        }
        for (let i = this.levels.length - 1; i >= 0; i--) {
            const level = this.levels[i];
            const adjustedThreshold = level.atrMult * levelAdjust;
            const flagKey = '_quantumTp' + (i + 1) + 'Done';
            if (atrMult >= adjustedThreshold && !position[flagKey]) {
                return {
                    shouldClose: true,
                    closePct: level.closePct,
                    reason: atrMult.toFixed(1) + 'x ATR (threshold=' + adjustedThreshold.toFixed(1) + ')',
                    label: level.label,
                    urgency: 'NORMAL',
                    flagKey,
                };
            }
        }

        // Priority 6: Health-based tightening
        if (healthScore && healthScore.status === 'CRITICAL' && atrMult > 0) {
            return { shouldClose: true, closePct: 0.25, reason: 'Critical health + profit', label: 'QUANTUM_HEALTH_CLOSE', urgency: 'MEDIUM' };
        }

        return { shouldClose: false, closePct: 0, reason: 'No quantum close signal', label: 'HOLD', urgency: 'LOW' };
    }

    recordExecution() { this.totalClosesExecuted++; }

    getStats() {
        return {
            totalRecommendations: this.totalRecommendations,
            totalClosesExecuted: this.totalClosesExecuted,
            executionRate: this.totalRecommendations > 0
                ? parseFloat((this.totalClosesExecuted / this.totalRecommendations * 100).toFixed(1))
                : 0,
        };
    }
}


// ═══════════════════════════════════════════════════════════════════════════
//  6. QuantumPositionManager (Main Orchestrator)
//     Unifies all components into a single coherent position management
//     system.  Called from bot.js every trading cycle.
// ═══════════════════════════════════════════════════════════════════════════

class QuantumPositionManager {
    constructor(config = {}) {
        this.version = POSITION_MANAGER_VERSION;

        // Sub-components
        this.dynamicSLTP = new QuantumDynamicSLTP(config.sltp || {});
        this.healthScorer = new PositionHealthScorer(config.health || {});
        this.multiPosOptimizer = new MultiPositionOptimizer(config.multiPos || {});
        this.reEvaluator = new ContinuousReEvaluator(config.reEval || {});
        this.partialCloseAdvisor = new PartialCloseAdvisor(config.partialClose || {});

        // External references (set via initialize)
        this.pipeline = null;
        this.indicators = null;

        // State
        this.isReady = false;
        this.totalEvaluations = 0;
        this.totalSLAdjustments = 0;
        this.totalTPAdjustments = 0;
        this.totalPartialCloses = 0;
        this.totalEmergencyActions = 0;
    }

    /**
     * Initialize with pipeline and indicators references.
     * @param {object} pipeline   - HybridQuantumClassicalPipeline instance
     * @param {object} indicators - indicators module (for ATR)
     */
    initialize(pipeline, indicators) {
        this.pipeline = pipeline;
        this.indicators = indicators;
        this.isReady = true;
        console.log('[QUANTUM POS MGR] v' + this.version + ' initialized');
        console.log('[QUANTUM POS MGR] Components: DynamicSLTP + HealthScorer + MultiPosOptimizer + ReEvaluator + PartialCloseAdvisor');
    }

    /**
     * Main evaluation entry point — called from bot.js every trading cycle.
     *
     * Returns:
     *   - adjustments:    SL/TP changes to apply to positions
     *   - partialCloses:  partial close recommendations to execute
     *   - healthReport:   per-position health scores
     *   - portfolioOpt:   multi-position allocation recommendation
     *   - summary:        evaluation metadata
     *
     * @param {Map}      positions        - symbol -> position (from PortfolioManager)
     * @param {number[]} priceHistory     - close prices array
     * @param {number}   portfolioValue   - total portfolio value
     * @param {Array}    marketDataHistory - OHLCV candles (for ATR)
     * @param {function} getCurrentPrice  - async(symbol) => price
     * @returns {object}
     */
    async evaluate(positions, priceHistory, portfolioValue, marketDataHistory, getCurrentPrice) {
        if (!this.isReady || !this.pipeline || !this.pipeline.isReady || !positions || positions.size === 0) {
            return { adjustments: [], partialCloses: [], healthReport: new Map(), portfolioOpt: null, summary: { skipped: true } };
        }

        this.totalEvaluations++;
        const t0 = Date.now();

        // Check if this cycle warrants re-evaluation
        const reEvalCheck = this.reEvaluator.shouldReEvaluate();
        if (!reEvalCheck.shouldReEval) {
            return { adjustments: [], partialCloses: [], healthReport: new Map(), portfolioOpt: null, summary: { skipped: true, reason: 'Not re-eval cycle' } };
        }

        const result = {
            adjustments: [],
            partialCloses: [],
            healthReport: new Map(),
            portfolioOpt: null,
            summary: {
                level: reEvalCheck.level,
                positionsEvaluated: positions.size,
                timestamp: Date.now(),
            },
        };

        // ── Step 1: Run continuous re-evaluation via pipeline Stage 4 ──
        const reEvalResult = this.reEvaluator.reEvaluate(
            positions, priceHistory, portfolioValue, this.pipeline, reEvalCheck.level
        );
        result.summary.reEval = reEvalResult.summary;

        // ── Step 2: Per-position analysis ──
        for (const [sym, pos] of positions) {
            try {
                const currentPrice = getCurrentPrice ? await getCurrentPrice(sym) : priceHistory[priceHistory.length - 1];
                if (!currentPrice) continue;

                // Get quantum data from re-evaluation
                const posReEval = reEvalResult.positionResults.get(sym) || {};
                const vqcRegime = posReEval.vqcRegime || null;
                const qraRisk = posReEval.qraRisk || null;
                const qmcSim = posReEval.qmcSim || null;

                // Calculate current ATR from live market data
                let currentATR = pos.atrAtEntry || (currentPrice * 0.02);
                if (this.indicators && marketDataHistory && marketDataHistory.length >= 20) {
                    try {
                        const candleData = marketDataHistory.slice(-20).map(c => ({
                            symbol: sym, timestamp: Date.now(),
                            open: c.open || c.close, high: c.high, low: c.low,
                            close: c.close, volume: c.volume || 0,
                        }));
                        const liveATR = this.indicators.calculateATR(candleData, 14);
                        if (liveATR > 0) currentATR = liveATR;
                    } catch (e) { /* use entry ATR */ }
                }

                // ── Health Score ──
                const recentPrices = priceHistory.slice(-30);
                const health = this.healthScorer.score(pos, currentPrice, vqcRegime, qmcSim, qraRisk, recentPrices);
                result.healthReport.set(sym, health);

                // ── Dynamic SL/TP ──
                const sltpResult = this.dynamicSLTP.calculate(pos, currentPrice, currentATR, vqcRegime, qraRisk, qmcSim);

                if (sltpResult.slChanged && sltpResult.newSL && sltpResult.newSL > pos.stopLoss) {
                    result.adjustments.push({
                        type: 'SL_UPDATE', symbol: sym,
                        oldValue: pos.stopLoss, newValue: sltpResult.newSL,
                        reasoning: sltpResult.reasoning,
                    });
                    this.totalSLAdjustments++;
                }

                if (sltpResult.tpChanged && sltpResult.newTP) {
                    result.adjustments.push({
                        type: 'TP_UPDATE', symbol: sym,
                        oldValue: pos.takeProfit, newValue: sltpResult.newTP,
                        reasoning: sltpResult.reasoning,
                    });
                    this.totalTPAdjustments++;
                }

                // ── Partial Close Advisor ──
                const closeAdvice = this.partialCloseAdvisor.advise(
                    pos, currentPrice, currentATR, health, vqcRegime, qmcSim, qraRisk
                );
                if (closeAdvice.shouldClose) {
                    result.partialCloses.push({
                        symbol: sym,
                        closePct: closeAdvice.closePct,
                        reason: closeAdvice.reason,
                        label: closeAdvice.label,
                        urgency: closeAdvice.urgency,
                        flagKey: closeAdvice.flagKey || null,
                        currentPrice,
                    });
                    this.totalPartialCloses++;
                }

            } catch (err) {
                console.warn('[QUANTUM POS MGR] Error ' + sym + ':', err.message);
            }
        }

        // ── Step 3: Process re-evaluation emergency actions ──
        for (const action of reEvalResult.actions) {
            if (action.type === 'EMERGENCY_CLOSE') {
                const existing = result.partialCloses.find(pc => pc.symbol === action.symbol);
                if (!existing) {
                    result.partialCloses.push({
                        symbol: action.symbol,
                        closePct: (action.params && action.params.closePct) || 1.0,
                        reason: action.detail,
                        label: 'QUANTUM_EMERGENCY',
                        urgency: 'CRITICAL',
                    });
                    this.totalEmergencyActions++;
                }
            } else if (action.type === 'TIGHTEN_SL' || action.type === 'TIGHTEN_SL_AGGRESSIVE') {
                const pos = positions.get(action.symbol);
                if (pos) {
                    const multiplier = (action.params && action.params.slMultiplier) || 0.7;
                    const currentPrice = priceHistory[priceHistory.length - 1];
                    const atr = pos.atrAtEntry || (currentPrice * 0.02);
                    const tightenedSL = Math.max(pos.stopLoss, currentPrice - multiplier * atr);

                    if (tightenedSL > pos.stopLoss) {
                        const existing = result.adjustments.find(a => a.symbol === action.symbol && a.type === 'SL_UPDATE');
                        if (!existing) {
                            result.adjustments.push({
                                type: 'SL_UPDATE', symbol: action.symbol,
                                oldValue: pos.stopLoss,
                                newValue: parseFloat(tightenedSL.toFixed(2)),
                                reasoning: 'ReEval: ' + action.detail,
                            });
                            this.totalSLAdjustments++;
                        }
                    }
                }
            }
        }

        // ── Step 4: Multi-position optimization (FULL level only) ──
        if (reEvalCheck.level === 'FULL') {
            try {
                const posArray = [];
                for (const [sym, pos] of positions) {
                    const health = result.healthReport.get(sym);
                    const currentPrice = priceHistory[priceHistory.length - 1];
                    const atrMult = pos.atrAtEntry > 0 ? (currentPrice - pos.entryPrice) / pos.atrAtEntry : 0;
                    posArray.push({
                        symbol: sym,
                        healthScore: health ? health.score : 50,
                        pnlPct: health ? health.pnlPct : 0,
                        atrMultiple: atrMult,
                        value: pos.entryPrice * pos.quantity,
                        pyramidLevel: pos._pyramidLevel || 0,
                    });
                }
                result.portfolioOpt = this.multiPosOptimizer.optimize(posArray, portfolioValue, null);
            } catch (e) {
                console.warn('[QUANTUM POS MGR] Portfolio optimization error:', e.message);
            }
        }

        result.summary.computeTimeMs = Date.now() - t0;
        result.summary.adjustments = result.adjustments.length;
        result.summary.partialCloses = result.partialCloses.length;

        return result;
    }

    /**
     * Get comprehensive status for health and monitoring.
     */
    getStatus() {
        return {
            version: this.version,
            isReady: this.isReady,
            totalEvaluations: this.totalEvaluations,
            totalSLAdjustments: this.totalSLAdjustments,
            totalTPAdjustments: this.totalTPAdjustments,
            totalPartialCloses: this.totalPartialCloses,
            totalEmergencyActions: this.totalEmergencyActions,
            components: {
                dynamicSLTP: this.dynamicSLTP.getStats(),
                healthScorer: { trackedPositions: this.healthScorer.scoreHistory.size },
                multiPosOptimizer: this.multiPosOptimizer.getStats(),
                reEvaluator: this.reEvaluator.getStats(),
                partialCloseAdvisor: this.partialCloseAdvisor.getStats(),
            },
        };
    }

    getPositionHealth(symbol) {
        return this.healthScorer.getScoreTrend(symbol);
    }

    onPositionClosed(symbol) {
        this.healthScorer.clearHistory(symbol);
        this.reEvaluator.clearPositionData(symbol);
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
module.exports = {
    QuantumPositionManager,
    QuantumDynamicSLTP,
    PositionHealthScorer,
    MultiPositionOptimizer,
    ContinuousReEvaluator,
    PartialCloseAdvisor,
    POSITION_MANAGER_VERSION,
};
