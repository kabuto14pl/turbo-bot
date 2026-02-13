/**
 * Patcher for bot.js — PATCH #18 Integration
 * Adds QuantumPositionManager to the bot orchestrator.
 *
 * Changes:
 *   1. Add import for QuantumPositionManager
 *   2. Add this.quantumPosMgr = null in constructor
 *   3. Add initialization in initialize() after hybridPipeline
 *   4. Add quantum monitoring in same-candle section
 *   5. Add quantum monitoring after SL/TP section in full cycle
 *   6. Add periodic status logging for QPM
 *   7. Update health component
 *   8. Update onPositionClosed tracking
 *   9. Update header doc comment with PATCH #18
 *
 * Run on VPS: node /root/turbo-bot/patch_bot.js
 */
const fs = require('fs');

const FILE = '/root/turbo-bot/trading-bot/src/modules/bot.js';

let code = fs.readFileSync(FILE, 'utf-8');

// ── 1. Add PATCH #18 to header doc ──
const oldHeader = ' * PATCH #17: Hybrid Quantum-Classical Pipeline v2.0';
const newHeader = ` * PATCH #17: Hybrid Quantum-Classical Pipeline v2.0
 * PATCH #18: Dynamic Position Management with Quantum Re-evaluation
 *   - QuantumPositionManager (Dynamic SL/TP, Health Scoring, Multi-Pos, Partial Close)
 *   - 4-stage pipeline: Pre-process -> Quantum Boost -> Verification -> Continuous Monitoring
 *   - VQC regime reclassification triggers dynamic SL/TP adjustments
 *   - QMC scenario simulation for position outlook & partial close decisions
 *   - QRA risk scoring per position with black swan emergency exits
 *   - Position health scoring (0-100) with 6 weighted factors`;
code = code.replace(oldHeader, newHeader);

// ── 2. Add Architecture line ──
const oldArch = '     *   HybridQuantumClassicalPipeline -> QMC + QAOA + VQC + QFM + QRA + QDV + Decomposer';
const newArch = `     *   HybridQuantumClassicalPipeline -> QMC + QAOA + VQC + QFM + QRA + QDV + Decomposer
     *   QuantumPositionManager -> DynamicSLTP + HealthScorer + MultiPosOpt + ReEvaluator + PartialClose`;
code = code.replace(oldArch, newArch);

// ── 3. Add constructor property ──
const oldConstructorProp = '        // PATCH #17: Hybrid Quantum-Classical Pipeline\n        this.hybridPipeline = null;';
const newConstructorProp = `        // PATCH #17: Hybrid Quantum-Classical Pipeline
        this.hybridPipeline = null;
        // PATCH #18: Quantum Position Manager
        this.quantumPosMgr = null;`;
code = code.replace(oldConstructorProp, newConstructorProp);

// ── 4. Add initialization after hybridPipeline init ──
// Find the end of hybridPipeline init block (the closing try/catch with 'Hybrid Pipeline:')
const hybridPipelineInitEnd = "        } catch (e) {\n            console.warn('[WARN] Hybrid Pipeline: ' + e.message);\n        }";
const qpmInit = `        } catch (e) {
            console.warn('[WARN] Hybrid Pipeline: ' + e.message);
        }

        // PATCH #18: Quantum Position Manager (Stage 4 — Continuous Monitoring)
        try {
            const { QuantumPositionManager } = require('../core/ai/quantum_position_manager');
            const ind = require('./indicators');
            this.quantumPosMgr = new QuantumPositionManager({
                sltp: { baseSLMultiplier: 1.5, baseTPMultiplier: 4.0, trailingATRMultiplier: 1.5 },
                health: { healthyThreshold: 65, warningThreshold: 40, criticalThreshold: 25 },
                multiPos: { maxPositions: 5, maxExposurePerPosition: 0.25, maxTotalExposure: 0.80 },
                reEval: { reEvalInterval: 5, fullReEvalInterval: 15, riskReEvalInterval: 3 },
                partialClose: { regimeCloseConfidence: 0.65, riskCloseThreshold: 75 },
            });
            this.quantumPosMgr.initialize(this.hybridPipeline, ind);
            console.log('[OK] Quantum Position Manager v' + this.quantumPosMgr.version + ': DynamicSLTP + Health + MultiPos + ReEval + PartialClose');
            this.mon.setComponent('quantumPosMgr', true);
        } catch (e) {
            console.warn('[WARN] Quantum Position Manager: ' + e.message);
        }`;
code = code.replace(hybridPipelineInitEnd, qpmInit);

// ── 5. Add QPM status to init summary ──
const oldSummary = "        console.log('Hybrid Pipeline: ' + (this.hybridPipeline ? 'ACTIVE v' + this.hybridPipeline.version + ' (QMC+QAOA+VQC+QFM+QRA+QDV)' : 'disabled'));";
const newSummary = `        console.log('Hybrid Pipeline: ' + (this.hybridPipeline ? 'ACTIVE v' + this.hybridPipeline.version + ' (QMC+QAOA+VQC+QFM+QRA+QDV)' : 'disabled'));
        console.log('Quantum Pos Mgr: ' + (this.quantumPosMgr && this.quantumPosMgr.isReady ? 'ACTIVE v' + this.quantumPosMgr.version + ' (4-stage)' : 'disabled'));`;
code = code.replace(oldSummary, newSummary);

// ── 6. Add quantum position monitoring in same-candle section ──
// After the existing monitorPositions call in the same-candle block
const oldSameCandleMonitor = `                    if (this.pm.positionCount > 0) {
                        const history = this.dp.getMarketDataHistory();
                        const getPriceFn = async (sym) => this._getCurrentPrice(sym);
                        await this.exec.monitorPositions(getPriceFn, history);
                    }
                    this._detectAndLearnFromCloses();
                    return;`;
const newSameCandleMonitor = `                    if (this.pm.positionCount > 0) {
                        const history = this.dp.getMarketDataHistory();
                        const getPriceFn = async (sym) => this._getCurrentPrice(sym);
                        await this.exec.monitorPositions(getPriceFn, history);

                        // PATCH #18: Quantum Position Monitoring (even during same-candle)
                        if (this.quantumPosMgr && this.quantumPosMgr.isReady) {
                            try {
                                const priceArr = history.map(c => c.close);
                                const portfolio = this.pm.getPortfolio();
                                const qpmResult = await this.quantumPosMgr.evaluate(
                                    this.pm.getPositions(), priceArr, portfolio.totalValue,
                                    history, async (sym) => this._getCurrentPrice(sym)
                                );
                                if (!qpmResult.summary.skipped) {
                                    this._applyQuantumPositionActions(qpmResult, history);
                                }
                            } catch(e) { console.warn('[WARN] QPM same-candle:', e.message); }
                        }
                    }
                    this._detectAndLearnFromCloses();
                    return;`;
code = code.replace(oldSameCandleMonitor, newSameCandleMonitor);

// ── 7. Add quantum position monitoring after main cycle SL/TP section ──
// After the APM monitoring block, before _detectAndLearnFromCloses
const oldAfterAPM = `            // PATCH #15: Neural AI learning from closes
            this._detectAndLearnFromCloses();`;
const newAfterAPM = `            // PATCH #18: Quantum Position Monitoring (full cycle re-evaluation)
            if (this.pm.positionCount > 0 && this.quantumPosMgr && this.quantumPosMgr.isReady) {
                try {
                    const priceArr = history.map(c => c.close);
                    const portfolio = this.pm.getPortfolio();
                    const qpmResult = await this.quantumPosMgr.evaluate(
                        this.pm.getPositions(), priceArr, portfolio.totalValue,
                        history, async (sym) => this._getCurrentPrice(sym)
                    );
                    if (!qpmResult.summary.skipped) {
                        this._applyQuantumPositionActions(qpmResult, history);
                    }
                } catch(e) { console.warn('[WARN] QPM full-cycle:', e.message); }
            }

            // PATCH #15: Neural AI learning from closes
            this._detectAndLearnFromCloses();`;
code = code.replace(oldAfterAPM, newAfterAPM);

// ── 8. Add periodic QPM status logging ──
// After the existing Hybrid Pipeline status block
const oldHybridStatus = `            // PATCH #16: Market activity log every 10 cycles`;
const newHybridStatusAndQPM = `            // PATCH #18: Periodic Quantum Position Manager status
            if (this.quantumPosMgr && this.quantumPosMgr.isReady && this._cycleCount % 20 === 0) {
                try {
                    const qpmStatus = this.quantumPosMgr.getStatus();
                    console.log('[QUANTUM POS MGR] Evals: ' + qpmStatus.totalEvaluations +
                        ' | SL-adj: ' + qpmStatus.totalSLAdjustments +
                        ' | TP-adj: ' + qpmStatus.totalTPAdjustments +
                        ' | Partial: ' + qpmStatus.totalPartialCloses +
                        ' | Emergency: ' + qpmStatus.totalEmergencyActions +
                        ' | ReEvals: ' + qpmStatus.components.reEvaluator.totalReEvaluations);
                    if (this.megatron) {
                        this.megatron.logActivity('QUANTUM', 'Position Manager Status',
                            'Ewaluacje: ' + qpmStatus.totalEvaluations +
                            ' | SL: ' + qpmStatus.totalSLAdjustments +
                            ' | TP: ' + qpmStatus.totalTPAdjustments +
                            ' | Partial: ' + qpmStatus.totalPartialCloses +
                            ' | Emergency: ' + qpmStatus.totalEmergencyActions);
                    }
                } catch(e) {}
            }

            // PATCH #16: Market activity log every 10 cycles`;
code = code.replace(oldHybridStatus, newHybridStatusAndQPM);

// ── 9. Add _applyQuantumPositionActions() helper method ──
// Insert before the _detectAndLearnFromCloses method
const oldDetect = '    _detectAndLearnFromCloses() {';
const newHelperAndDetect = `    /**
     * PATCH #18: Apply quantum position management actions.
     * Executes SL/TP adjustments, partial closes, and logs to Megatron.
     */
    _applyQuantumPositionActions(qpmResult, marketDataHistory) {
        try {
            // Apply SL/TP adjustments
            for (const adj of qpmResult.adjustments) {
                const pos = this.pm.getPosition(adj.symbol);
                if (!pos) continue;

                if (adj.type === 'SL_UPDATE' && adj.newValue > pos.stopLoss) {
                    this.pm.updateStopLoss(adj.symbol, adj.newValue);
                    console.log('[QUANTUM SL] ' + adj.symbol + ': $' + adj.oldValue.toFixed(2) +
                        ' -> $' + adj.newValue.toFixed(2) + ' | ' + adj.reasoning);
                    if (this.megatron) {
                        this.megatron.logActivity('QUANTUM', 'Dynamic SL Update',
                            adj.symbol + ': $' + adj.oldValue.toFixed(2) + ' -> $' + adj.newValue.toFixed(2) +
                            ' | ' + adj.reasoning);
                    }
                } else if (adj.type === 'TP_UPDATE' && adj.newValue) {
                    // TP updates — update position TP directly
                    if (pos.takeProfit !== adj.newValue) {
                        pos.takeProfit = adj.newValue;
                        console.log('[QUANTUM TP] ' + adj.symbol + ': $' + (adj.oldValue || 0).toFixed(2) +
                            ' -> $' + adj.newValue.toFixed(2) + ' | ' + adj.reasoning);
                        if (this.megatron) {
                            this.megatron.logActivity('QUANTUM', 'Dynamic TP Update',
                                adj.symbol + ': $' + (adj.oldValue || 0).toFixed(2) + ' -> $' + adj.newValue.toFixed(2) +
                                ' | ' + adj.reasoning);
                        }
                    }
                }
            }

            // Execute partial closes
            for (const pc of qpmResult.partialCloses) {
                const pos = this.pm.getPosition(pc.symbol);
                if (!pos || pos.quantity <= 0) continue;

                const closeQty = pos.quantity * pc.closePct;
                if (closeQty < 0.000001) continue;

                const price = pc.currentPrice || 0;
                if (price <= 0) continue;

                const trade = this.pm.closePosition(pc.symbol, price, closeQty, pc.label, 'QuantumPosMgr');
                if (trade) {
                    // Set flag to prevent re-triggering same level
                    if (pc.flagKey) pos[pc.flagKey] = true;

                    console.log('[QUANTUM PARTIAL] ' + pc.label + ' ' + pc.symbol +
                        ': ' + (pc.closePct * 100).toFixed(0) + '% @ $' + price.toFixed(2) +
                        ' | PnL: $' + trade.pnl.toFixed(2) + ' | ' + pc.reason);
                    this.rm.recordTradeResult(trade.pnl);

                    if (this.ml) {
                        this.ml.learnFromTrade(trade.pnl, Date.now() - (pos.entryTime || Date.now()), marketDataHistory);
                    }
                    if (this.megatron) {
                        const urgencyLevel = pc.urgency === 'CRITICAL' ? 'critical' : pc.urgency === 'HIGH' ? 'high' : 'normal';
                        this.megatron.logActivity('TRADE', 'Quantum Partial Close: ' + pc.label,
                            pc.symbol + ' ' + (pc.closePct * 100).toFixed(0) + '% | PnL: $' + trade.pnl.toFixed(2) +
                            ' | ' + pc.reason, trade, urgencyLevel);
                    }

                    // Notify QPM of full close
                    if (!this.pm.hasPosition(pc.symbol) && this.quantumPosMgr) {
                        this.quantumPosMgr.onPositionClosed(pc.symbol);
                    }
                }
            }

            // Log health report summary to Megatron (periodic)
            if (this.megatron && qpmResult.healthReport.size > 0 && this._cycleCount % 10 === 0) {
                const healthSummary = [];
                for (const [sym, health] of qpmResult.healthReport) {
                    healthSummary.push(sym + ':' + health.score + '(' + health.status + ')');
                }
                this.megatron.logActivity('QUANTUM', 'Position Health',
                    healthSummary.join(', ') + ' | Level: ' + (qpmResult.summary.level || 'N/A'));
            }

            // Log portfolio optimization (FULL only)
            if (qpmResult.portfolioOpt && this.megatron) {
                const opt = qpmResult.portfolioOpt;
                this.megatron.logActivity('QUANTUM', 'Portfolio Optimization',
                    'Exposure: ' + (opt.totalExposure * 100).toFixed(1) + '% | Capacity: ' + opt.remainingCapacity +
                    ' | Pyramids: ' + (opt.pyramidRecommendations || []).length +
                    ' | Consolidate: ' + (opt.consolidations || []).length);
            }

        } catch (err) {
            console.warn('[WARN] QPM action apply:', err.message);
        }
    }

    _detectAndLearnFromCloses() {`;
code = code.replace(oldDetect, newHelperAndDetect);

// ── 10. Track position closes for QPM cleanup ──
// In _detectAndLearnFromCloses, after the neuralAI learning block, add QPM notification
const oldLastPosCount = '            this._lastPositionCount = currentPosCount;';
const newLastPosCount = `            // PATCH #18: Notify QPM of position close
            if (this.quantumPosMgr && currentPosCount < this._lastPositionCount) {
                // A position was closed — clean up QPM tracking data
                // We check all known symbols; if any is no longer in positions map, clean it
                try {
                    const currentPositions = this.pm.getPositions();
                    for (const [sym] of this.quantumPosMgr.healthScorer.scoreHistory) {
                        if (!currentPositions.has(sym)) {
                            this.quantumPosMgr.onPositionClosed(sym);
                        }
                    }
                } catch(e) {}
            }
            this._lastPositionCount = currentPosCount;`;
code = code.replace(oldLastPosCount, newLastPosCount);

// Write back
fs.writeFileSync(FILE, code, 'utf-8');
console.log('[PATCH_BOT] bot.js patched successfully for PATCH #18');
console.log('[PATCH_BOT] Added: QuantumPositionManager initialization');
console.log('[PATCH_BOT] Added: Quantum monitoring in same-candle + full cycle');
console.log('[PATCH_BOT] Added: _applyQuantumPositionActions() helper');
console.log('[PATCH_BOT] Added: QPM status logging');
console.log('[PATCH_BOT] Added: Position close tracking for QPM');
