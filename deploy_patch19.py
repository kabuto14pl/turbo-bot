#!/usr/bin/env python3
"""
PATCH #19: Quantum Dynamic Position Management Enhancement
Applies all 8 improvements to 4 files on VPS.
"""

import os
import sys
import shutil
from datetime import datetime

BOT_DIR = '/root/turbo-bot/trading-bot'
BACKUP_DIR = '/root/turbo-bot/backups/patch19_' + datetime.now().strftime('%Y%m%d_%H%M%S')

def backup_file(filepath):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    name = os.path.basename(filepath)
    dest = os.path.join(BACKUP_DIR, name)
    shutil.copy2(filepath, dest)
    print(f'  Backup: {name} -> {dest}')

def patch_file(filepath, patches):
    with open(filepath, 'r') as f:
        content = f.read()
    original = content
    for i, (old, new) in enumerate(patches):
        if old not in content:
            print(f'  WARNING: Patch {i+1} pattern not found in {os.path.basename(filepath)}')
            print(f'  First 80 chars: {old[:80]}...')
            continue
        count = content.count(old)
        if count > 1:
            print(f'  WARNING: Patch {i+1} matches {count} times, applying first only')
        content = content.replace(old, new, 1)
        print(f'  Applied patch {i+1}/{len(patches)}')
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

def patch_portfolio_manager():
    filepath = os.path.join(BOT_DIR, 'src/modules/portfolio-manager.js')
    print(f'\n[1/4] Patching portfolio-manager.js...')
    backup_file(filepath)
    patches = [
        (
            """    openPosition(symbol, data) {
        const position = {
            symbol, side: 'LONG', entryPrice: data.entryPrice,
            quantity: data.quantity, entryTime: Date.now(),
            value: data.entryPrice * data.quantity,
            stopLoss: data.stopLoss, takeProfit: data.takeProfit,
            atrAtEntry: data.atrAtEntry || 0, _partialTpDone: false,
        };""",
            """    openPosition(symbol, data) {
        const side = data.side || 'LONG';
        const position = {
            symbol, side, entryPrice: data.entryPrice,
            quantity: data.quantity, entryTime: Date.now(),
            value: data.entryPrice * data.quantity,
            stopLoss: data.stopLoss, takeProfit: data.takeProfit,
            atrAtEntry: data.atrAtEntry || 0, _partialTpDone: false,
            _pyramidLevel: data.pyramidLevel || 0,
            _qpmManaged: false,
        };"""
        ),
        (
            """        const grossPnL = exitValue - entryValue;
        const fees = exitValue * this.config.tradingFeeRate;""",
            """        const grossPnL = pos.side === 'SHORT' ? (entryValue - exitValue) : (exitValue - entryValue);
        const fees = exitValue * this.config.tradingFeeRate;"""
        ),
        (
            """    updateStopLoss(symbol, newSL) {
        const p = this.positions.get(symbol);
        if (p && newSL > p.stopLoss) p.stopLoss = newSL;
    }

    updateUnrealizedPnL(currentPrices) {""",
            """    updateStopLoss(symbol, newSL) {
        const p = this.positions.get(symbol);
        if (!p) return;
        if (p.side === 'SHORT') {
            if (newSL < p.stopLoss) p.stopLoss = newSL;
        } else {
            if (newSL > p.stopLoss) p.stopLoss = newSL;
        }
    }

    updateTakeProfit(symbol, newTP) {
        const p = this.positions.get(symbol);
        if (!p || !newTP || newTP <= 0) return;
        if (p.side === 'SHORT') {
            if (newTP < p.entryPrice) p.takeProfit = newTP;
        } else {
            if (newTP > p.entryPrice) p.takeProfit = newTP;
        }
    }

    addToPosition(symbol, price, quantity, atrAtEntry) {
        const p = this.positions.get(symbol);
        if (!p) return null;
        const oldQty = p.quantity;
        const oldVal = p.entryPrice * oldQty;
        const addVal = price * quantity;
        const newQty = oldQty + quantity;
        p.entryPrice = (oldVal + addVal) / newQty;
        p.quantity = newQty;
        p.value = p.entryPrice * newQty;
        p._pyramidLevel = (p._pyramidLevel || 0) + 1;
        if (atrAtEntry) p.atrAtEntry = atrAtEntry;
        this.balance.usdtBalance -= addVal;
        this.balance.btcBalance += quantity;
        this.balance.lockedInPositions += addVal;
        console.log('[PYRAMID] Added ' + quantity.toFixed(6) + ' to ' + symbol +
            ' @ $' + price.toFixed(2) + ' | New avg: $' + p.entryPrice.toFixed(2) +
            ' | Level: ' + p._pyramidLevel + ' | Total qty: ' + newQty.toFixed(6));
        return p;
    }

    updateUnrealizedPnL(currentPrices) {"""
        ),
        (
            """        for (const [sym, pos] of this.positions) {
            const price = currentPrices.get(sym) || pos.entryPrice;
            total += (price - pos.entryPrice) * pos.quantity;
        }""",
            """        for (const [sym, pos] of this.positions) {
            const price = currentPrices.get(sym) || pos.entryPrice;
            if (pos.side === 'SHORT') {
                total += (pos.entryPrice - price) * pos.quantity;
            } else {
                total += (price - pos.entryPrice) * pos.quantity;
            }
        }"""
        ),
    ]
    success = patch_file(filepath, patches)
    with open(filepath, 'r') as f:
        content = f.read()
    for check in ['updateTakeProfit', 'addToPosition', '_pyramidLevel', '_qpmManaged', "pos.side === 'SHORT'"]:
        assert check in content, f'FAIL: {check} not found!'
    print(f'  OK portfolio-manager.js: {len(content)} bytes')

def patch_execution_engine():
    filepath = os.path.join(BOT_DIR, 'src/modules/execution-engine.js')
    print(f'\n[2/4] Patching execution-engine.js...')
    backup_file(filepath)
    patches = [
        (
            """                // Track highest price seen (for Chandelier trailing)
                if (!pos._highestPrice || price > pos._highestPrice) {
                    pos._highestPrice = price;
                }

                const atr = pos.atrAtEntry;
                const profit = price - pos.entryPrice;
                const atrMult = atr > 0 ? profit / atr : 0;

                // ============================================
                // CHANDELIER TRAILING STOP-LOSS (ATR-based)
                // Continuous trailing from highest price minus N*ATR
                // ============================================
                if (atr > 0) {""",
            """                // Track highest/lowest price seen (for Chandelier trailing)
                if (!pos._highestPrice || price > pos._highestPrice) {
                    pos._highestPrice = price;
                }
                if (!pos._lowestPrice || price < pos._lowestPrice) {
                    pos._lowestPrice = price;
                }

                const atr = pos.atrAtEntry;
                const isShort = pos.side === 'SHORT';
                const profit = isShort ? (pos.entryPrice - price) : (price - pos.entryPrice);
                const atrMult = atr > 0 ? profit / atr : 0;

                // QPM COORDINATION (PATCH #19)
                const qpmManaged = pos._qpmManaged || false;

                // ============================================
                // CHANDELIER TRAILING STOP-LOSS (ATR-based)
                // Active only for LONG positions without QPM management.
                // ============================================
                if (atr > 0 && !qpmManaged && !isShort) {"""
        ),
        (
            """                // ============================================
                // SL / TP / TIME CHECK - execute close
                // ============================================
                let close = false, reason = '';
                if (timeExit) { close = true; reason = 'TIME_EXIT'; }
                else if (price <= pos.stopLoss) { close = true; reason = 'STOP_LOSS'; }
                else if (price >= pos.takeProfit) { close = true; reason = 'TAKE_PROFIT'; }""",
            """                // ============================================
                // SL / TP / TIME CHECK - execute close (direction-aware)
                // ============================================
                let close = false, reason = '';
                if (timeExit) { close = true; reason = 'TIME_EXIT'; }
                else if (isShort) {
                    if (price >= pos.stopLoss) { close = true; reason = 'STOP_LOSS'; }
                    else if (pos.takeProfit && price <= pos.takeProfit) { close = true; reason = 'TAKE_PROFIT'; }
                } else {
                    if (price <= pos.stopLoss) { close = true; reason = 'STOP_LOSS'; }
                    else if (price >= pos.takeProfit) { close = true; reason = 'TAKE_PROFIT'; }
                }"""
        ),
    ]
    success = patch_file(filepath, patches)
    with open(filepath, 'r') as f:
        content = f.read()
    for check in ['qpmManaged', 'isShort', '_lowestPrice', '!qpmManaged && !isShort']:
        assert check in content, f'FAIL: {check} not found!'
    print(f'  OK execution-engine.js: {len(content)} bytes')

def patch_quantum_position_manager():
    filepath = os.path.join(BOT_DIR, 'src/core/ai/quantum_position_manager.js')
    print(f'\n[3/4] Patching quantum_position_manager.js...')
    backup_file(filepath)
    patches = [
        # P1: Direction-aware profit
        (
            """        const entryPrice = position.entryPrice;
        const currentSL = position.stopLoss;
        const currentTP = position.takeProfit;
        const atrAtEntry = position.atrAtEntry || currentATR;
        const profit = currentPrice - entryPrice;
        const atrMult = atrAtEntry > 0 ? profit / atrAtEntry : 0;""",
            """        const entryPrice = position.entryPrice;
        const currentSL = position.stopLoss;
        const currentTP = position.takeProfit;
        const atrAtEntry = position.atrAtEntry || currentATR;
        const isShort = position.side === 'SHORT';
        const profit = isShort ? (entryPrice - currentPrice) : (currentPrice - entryPrice);
        const atrMult = atrAtEntry > 0 ? profit / atrAtEntry : 0;"""
        ),
        # P2: SHORT SL calculation
        (
            """        // ── Calculate new SL level ──
        let newSL;
        const highestPrice = position._highestPrice || currentPrice;""",
            """        // ── Calculate new SL level (Direction-aware) ──
        let newSL;
        if (isShort) {
            const lowestPrice = position._lowestPrice || currentPrice;
            if (atrMult >= 3.0) {
                const chandelierSL = lowestPrice + trailingMultiplier * currentATR;
                const maxLock = entryPrice - 1.5 * atrAtEntry;
                newSL = Math.min(chandelierSL, maxLock);
            } else if (atrMult >= 2.0) {
                const lockFactor = 1.0 * (2 - slMultiplier / this.baseSLMultiplier);
                newSL = entryPrice - Math.max(0.5, lockFactor) * atrAtEntry;
            } else if (atrMult >= 1.5) {
                newSL = entryPrice - 0.5 * atrAtEntry;
            } else if (atrMult >= 1.0) {
                const beBuffer = entryPrice * 0.003 * slMultiplier;
                newSL = entryPrice - beBuffer;
            } else {
                newSL = entryPrice + slMultiplier * atrAtEntry;
            }
            if (currentSL && newSL >= currentSL) {
                newSL = currentSL;
            }
        } else {
            const highestPrice = position._highestPrice || currentPrice;"""
        ),
        # P3: Close LONG else block + direction-aware TP
        (
            """        // SL constraint: can only move UP (never widen stop)
        if (currentSL && newSL <= currentSL) {
            newSL = currentSL;
        }

        // ── Calculate new TP level ──
        let newTP = entryPrice + tpMultiplier * atrAtEntry;
        // Don't set TP below current price + 0.5 ATR if profitable
        if (profit > 0 && newTP < currentPrice + 0.5 * currentATR) {
            newTP = currentPrice + 0.5 * currentATR;
        }""",
            """            // LONG SL constraint: can only move UP (never widen stop)
            if (currentSL && newSL <= currentSL) {
                newSL = currentSL;
            }
        }

        // ── Calculate new TP level (Direction-aware) ──
        let newTP;
        if (isShort) {
            newTP = entryPrice - tpMultiplier * atrAtEntry;
            if (profit > 0 && newTP > currentPrice - 0.5 * currentATR) {
                newTP = currentPrice - 0.5 * currentATR;
            }
        } else {
            newTP = entryPrice + tpMultiplier * atrAtEntry;
            if (profit > 0 && newTP < currentPrice + 0.5 * currentATR) {
                newTP = currentPrice + 0.5 * currentATR;
            }
        }"""
        ),
        # P4: HealthScorer direction-aware variables
        (
            """        const unrealizedPnL = (currentPrice - entryPrice) * quantity;
        const pnlPct = (currentPrice - entryPrice) / entryPrice;
        const atr = position.atrAtEntry || (currentPrice * 0.02);
        const atrMultiple = (currentPrice - entryPrice) / atr;
        const hoursHeld = (Date.now() - (position.entryTime || Date.now())) / 3600000;""",
            """        const unrealizedPnL = (currentPrice - entryPrice) * quantity;
        const pnlPct = (currentPrice - entryPrice) / entryPrice;
        const atr = position.atrAtEntry || (currentPrice * 0.02);
        const isShort = position.side === 'SHORT';
        const directedProfit = isShort ? (entryPrice - currentPrice) : (currentPrice - entryPrice);
        const atrMultiple = directedProfit / atr;
        const directedPnlPct = isShort ? (entryPrice - currentPrice) / entryPrice : pnlPct;
        const hoursHeld = (Date.now() - (position.entryTime || Date.now())) / 3600000;"""
        ),
        # P5: Regime score direction-aware
        (
            """        // ── Factor 2: Regime Alignment Score (0-100) ──
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
        }""",
            """        // ── Factor 2: Regime Alignment Score (0-100) — Direction-aware ──
        factors.regimeScore = 50;
        if (vqcRegime && vqcRegime.regime) {
            const regime = vqcRegime.regime;
            const conf = vqcRegime.confidence || 0.5;
            if (isShort) {
                if (regime === 'TRENDING_DOWN')       factors.regimeScore = 70 + conf * 30;
                else if (regime === 'RANGING')        factors.regimeScore = 50;
                else if (regime === 'TRENDING_UP')    factors.regimeScore = 15 + (1 - conf) * 20;
                else if (regime === 'HIGH_VOLATILITY') factors.regimeScore = 30 + (1 - conf) * 20;
            } else {
                if (regime === 'TRENDING_UP')        factors.regimeScore = 70 + conf * 30;
                else if (regime === 'RANGING')       factors.regimeScore = 50;
                else if (regime === 'TRENDING_DOWN') factors.regimeScore = 15 + (1 - conf) * 20;
                else if (regime === 'HIGH_VOLATILITY') factors.regimeScore = 30 + (1 - conf) * 20;
            }

            const prevScores = this.scoreHistory.get(position.symbol) || [];
            if (prevScores.length >= 2) {
                const prevRegime = prevScores[prevScores.length - 1].regime;
                const adverseFor = isShort
                    ? (prevRegime === 'TRENDING_DOWN' && (regime === 'TRENDING_UP' || regime === 'HIGH_VOLATILITY'))
                    : (prevRegime === 'TRENDING_UP' && (regime === 'TRENDING_DOWN' || regime === 'HIGH_VOLATILITY'));
                if (adverseFor) {
                    factors.regimeScore = Math.min(factors.regimeScore, 25);
                    recommendations.push('REGIME_SHIFT_ADVERSE: ' + prevRegime + ' -> ' + regime);
                }
            }
        }"""
        ),
        # P6: Momentum direction-aware + time-decay
        (
            """        // Profitable positions get time-decay reprieve
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
        }""",
            """        if (directedPnlPct > 0.005 && hoursHeld > 24) {
            factors.timeScore = Math.max(factors.timeScore, 45);
        }

        // ── Factor 6: Momentum Score (0-100) — Direction-aware ──
        factors.momentumScore = 50;
        if (recentPrices && recentPrices.length >= 10) {
            const recent5 = recentPrices.slice(-5);
            const prev5 = recentPrices.slice(-10, -5);
            const recentAvg = recent5.reduce((s, p) => s + p, 0) / recent5.length;
            const prevAvg = prev5.reduce((s, p) => s + p, 0) / prev5.length;
            const momentumPct = (recentAvg - prevAvg) / prevAvg;
            const directedMomentum = isShort ? -momentumPct : momentumPct;
            if (directedMomentum > 0.005)       factors.momentumScore = 75 + Math.min(25, directedMomentum * 2000);
            else if (directedMomentum > 0)      factors.momentumScore = 55;
            else if (directedMomentum > -0.005) factors.momentumScore = 40;
            else                                factors.momentumScore = Math.max(10, 30 + directedMomentum * 2000);
        }"""
        ),
        # P7: Return values fix
        (
            """            unrealizedPnL: parseFloat(unrealizedPnL.toFixed(2)),
            pnlPct: parseFloat((pnlPct * 100).toFixed(2)),""",
            """            unrealizedPnL: parseFloat(((isShort ? (entryPrice - currentPrice) : (currentPrice - entryPrice)) * quantity).toFixed(2)),
            pnlPct: parseFloat((directedPnlPct * 100).toFixed(2)),"""
        ),
        # P8: Market-aware acceleration state
        (
            """        // Re-evaluation frequency (in trading cycles)
        this.reEvalInterval     = config.reEvalInterval     || 5;    // STANDARD: VQC + QRA
        this.fullReEvalInterval = config.fullReEvalInterval || 15;   // FULL: VQC+QMC+QRA+QAOA
        this.riskReEvalInterval = config.riskReEvalInterval || 3;    // RISK_ONLY: QRA only

        // Counters""",
            """        // Re-evaluation frequency (in trading cycles)
        this.reEvalInterval     = config.reEvalInterval     || 5;    // STANDARD: VQC + QRA
        this.fullReEvalInterval = config.fullReEvalInterval || 15;   // FULL: VQC+QMC+QRA+QAOA
        this.riskReEvalInterval = config.riskReEvalInterval || 3;    // RISK_ONLY: QRA only

        // Market-aware acceleration state (PATCH #19)
        this._accelerated = false;
        this._tempRiskInterval = null;
        this._tempStdInterval = null;
        this._tempFullInterval = null;
        this._accelerationReason = null;

        // Counters"""
        ),
        # P9: shouldReEvaluate + setMarketConditions
        (
            """    /**
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
    }""",
            """    setMarketConditions(volatilityLevel, regimeTransition, healthEmergency) {
        const wasAccelerated = this._accelerated;
        if (healthEmergency) {
            this._accelerated = true;
            this._tempRiskInterval = 1;
            this._tempStdInterval = 2;
            this._tempFullInterval = 5;
            this._accelerationReason = 'HEALTH_EMERGENCY';
        } else if (regimeTransition) {
            this._accelerated = true;
            this._tempRiskInterval = Math.max(1, Math.floor(this.riskReEvalInterval / 2));
            this._tempStdInterval = Math.max(2, Math.floor(this.reEvalInterval / 2));
            this._tempFullInterval = Math.max(5, Math.floor(this.fullReEvalInterval / 2));
            this._accelerationReason = 'REGIME_TRANSITION';
        } else if (volatilityLevel === 'HIGH' || volatilityLevel === 'EXTREME') {
            this._accelerated = true;
            this._tempRiskInterval = Math.max(1, Math.floor(this.riskReEvalInterval / 1.5));
            this._tempStdInterval = Math.max(3, Math.floor(this.reEvalInterval / 1.5));
            this._tempFullInterval = Math.max(7, Math.floor(this.fullReEvalInterval / 1.5));
            this._accelerationReason = 'HIGH_VOLATILITY';
        } else {
            this._accelerated = false;
            this._tempRiskInterval = null;
            this._tempStdInterval = null;
            this._tempFullInterval = null;
            this._accelerationReason = null;
        }
        if (this._accelerated !== wasAccelerated) {
            console.log('[RE-EVAL] Market-aware acceleration ' +
                (this._accelerated ? 'ACTIVATED (' + this._accelerationReason + ')' : 'DEACTIVATED') +
                ' | Intervals: risk=' + (this._tempRiskInterval || this.riskReEvalInterval) +
                ' std=' + (this._tempStdInterval || this.reEvalInterval) +
                ' full=' + (this._tempFullInterval || this.fullReEvalInterval));
        }
    }

    shouldReEvaluate() {
        this.cycleCount++;
        const riskInterval = this._accelerated && this._tempRiskInterval ? this._tempRiskInterval : this.riskReEvalInterval;
        const stdInterval = this._accelerated && this._tempStdInterval ? this._tempStdInterval : this.reEvalInterval;
        const fullInterval = this._accelerated && this._tempFullInterval ? this._tempFullInterval : this.fullReEvalInterval;
        if (this.cycleCount % fullInterval === 0) {
            return { shouldReEval: true, level: 'FULL' };
        }
        if (this.cycleCount % stdInterval === 0) {
            return { shouldReEval: true, level: 'STANDARD' };
        }
        if (this.cycleCount % riskInterval === 0) {
            return { shouldReEval: true, level: 'RISK_ONLY' };
        }
        return { shouldReEval: false, level: 'NONE' };
    }"""
        ),
        # P10: _isAdverseTransition direction-aware
        (
            """    _isAdverseTransition(from, to) {
        // Adverse transitions for LONG positions
        const adverseMap = {
            'TRENDING_UP': ['TRENDING_DOWN', 'HIGH_VOLATILITY'],
            'RANGING': ['TRENDING_DOWN'],
        };
        return adverseMap[from] ? adverseMap[from].includes(to) : false;
    }""",
            """    _isAdverseTransition(from, to, positionSide) {
        if (positionSide === 'SHORT') {
            const adverseMap = {
                'TRENDING_DOWN': ['TRENDING_UP', 'HIGH_VOLATILITY'],
                'RANGING': ['TRENDING_UP'],
            };
            return adverseMap[from] ? adverseMap[from].includes(to) : false;
        } else {
            const adverseMap = {
                'TRENDING_UP': ['TRENDING_DOWN', 'HIGH_VOLATILITY'],
                'RANGING': ['TRENDING_DOWN'],
            };
            return adverseMap[from] ? adverseMap[from].includes(to) : false;
        }
    }"""
        ),
        # P11: Pass positionSide to _isAdverseTransition
        (
            """                if (prevRegime && prevRegime !== vqcRegime.regime) {
                    result.regimeTransition = {
                        from: prevRegime,
                        to: vqcRegime.regime,
                        isAdverse: this._isAdverseTransition(prevRegime, vqcRegime.regime),
                    };""",
            """                if (prevRegime && prevRegime !== vqcRegime.regime) {
                    result.regimeTransition = {
                        from: prevRegime,
                        to: vqcRegime.regime,
                        isAdverse: this._isAdverseTransition(prevRegime, vqcRegime.regime, pos.side),
                    };"""
        ),
        # P12: _generateAction direction-aware
        (
            """    _generateAction(position, vqcRegime, qraRisk, qmcSim, priceHistory) {
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
        }""",
            """    _generateAction(position, vqcRegime, qraRisk, qmcSim, priceHistory) {
        const currentPrice = priceHistory[priceHistory.length - 1];
        const isShort = position.side === 'SHORT';
        const profit = isShort ? (position.entryPrice - currentPrice) : (currentPrice - position.entryPrice);
        const atr = position.atrAtEntry || (currentPrice * 0.02);
        const atrMult = profit / atr;
        const hoursHeld = (Date.now() - (position.entryTime || Date.now())) / 3600000;

        if (qraRisk && qraRisk.blackSwanAlert) {
            return { action: 'EMERGENCY_CLOSE', reason: 'Black swan detected', severity: 'CRITICAL', params: { closePct: 1.0 } };
        }
        if (qraRisk && (qraRisk.riskScore || 0) > 85 && atrMult < 0) {
            return { action: 'TIGHTEN_SL_AGGRESSIVE', reason: 'Extreme risk + underwater', severity: 'HIGH', params: { slMultiplier: 0.5 } };
        }
        const adverseRegime = isShort
            ? (vqcRegime && vqcRegime.regime === 'TRENDING_UP' && (vqcRegime.confidence || 0) > 0.6)
            : (vqcRegime && vqcRegime.regime === 'TRENDING_DOWN' && (vqcRegime.confidence || 0) > 0.6);
        if (adverseRegime) {
            if (atrMult > 1.0) {
                return { action: 'PARTIAL_CLOSE', reason: 'Adverse regime, lock profits', severity: 'MEDIUM', params: { closePct: 0.5 } };
            } else if (atrMult < -0.5) {
                return { action: 'CLOSE_POSITION', reason: 'Adverse regime + underwater', severity: 'HIGH', params: { closePct: 1.0 } };
            }
        }"""
        ),
        # P13: PartialCloseAdvisor direction-aware
        (
            """        this.totalRecommendations++;
        if (!position || !currentPrice) {
            return { shouldClose: false, closePct: 0, reason: 'No data', label: 'NONE', urgency: 'LOW' };
        }

        const atr = position.atrAtEntry || currentATR || (currentPrice * 0.02);
        const profit = currentPrice - position.entryPrice;
        const atrMult = atr > 0 ? profit / atr : 0;""",
            """        this.totalRecommendations++;
        if (!position || !currentPrice) {
            return { shouldClose: false, closePct: 0, reason: 'No data', label: 'NONE', urgency: 'LOW' };
        }

        const atr = position.atrAtEntry || currentATR || (currentPrice * 0.02);
        const isShort = position.side === 'SHORT';
        const profit = isShort ? (position.entryPrice - currentPrice) : (currentPrice - position.entryPrice);
        const atrMult = atr > 0 ? profit / atr : 0;"""
        ),
        # P14: Regime close direction-aware
        (
            """        // Priority 2: Regime-triggered close
        if (vqcRegime && vqcRegime.regime === 'TRENDING_DOWN' && (vqcRegime.confidence || 0) > this.regimeCloseConfidence) {
            if (atrMult > 1.0) {""",
            """        // Priority 2: Regime-triggered close (direction-aware)
        const adverseRegime = isShort
            ? (vqcRegime && vqcRegime.regime === 'TRENDING_UP' && (vqcRegime.confidence || 0) > this.regimeCloseConfidence)
            : (vqcRegime && vqcRegime.regime === 'TRENDING_DOWN' && (vqcRegime.confidence || 0) > this.regimeCloseConfidence);
        if (adverseRegime) {
            if (atrMult > 1.0) {"""
        ),
        # P15+16: Fix regime close labels
        (
            """                return { shouldClose: true, closePct: 0.50, reason: 'Downtrend (conf=' + ((vqcRegime.confidence || 0) * 100).toFixed(0) + '%)', label: 'QUANTUM_REGIME_CLOSE', urgency: 'HIGH' };""",
            """                return { shouldClose: true, closePct: 0.50, reason: 'Adverse regime (conf=' + ((vqcRegime.confidence || 0) * 100).toFixed(0) + '%)', label: 'QUANTUM_REGIME_CLOSE', urgency: 'HIGH' };"""
        ),
        (
            """                return { shouldClose: true, closePct: 0.75, reason: 'Downtrend + loss', label: 'QUANTUM_REGIME_EXIT', urgency: 'HIGH' };""",
            """                return { shouldClose: true, closePct: 0.75, reason: 'Adverse regime + loss', label: 'QUANTUM_REGIME_EXIT', urgency: 'HIGH' };"""
        ),
        # P17: QPM evaluate - market-aware setup
        (
            """        // Check if this cycle warrants re-evaluation
        const reEvalCheck = this.reEvaluator.shouldReEvaluate();""",
            """        // Market-aware re-evaluation acceleration (PATCH #19)
        let volatilityLevel = 'MEDIUM';
        if (priceHistory && priceHistory.length >= 20) {
            const recent = priceHistory.slice(-20);
            const returns = [];
            for (let i = 1; i < recent.length; i++) {
                returns.push(Math.abs((recent[i] - recent[i-1]) / recent[i-1]));
            }
            const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
            if (avgReturn > 0.03)      volatilityLevel = 'EXTREME';
            else if (avgReturn > 0.015) volatilityLevel = 'HIGH';
            else if (avgReturn < 0.005) volatilityLevel = 'LOW';
        }
        const hasRegimeTransition = this.reEvaluator.lastRegimePerPosition.size > 0 &&
            Array.from(this.reEvaluator.lastRegimePerPosition.values()).some(
                r => this._recentRegimeChanged(r, priceHistory)
            );
        this.reEvaluator.setMarketConditions(volatilityLevel, hasRegimeTransition, false);

        const reEvalCheck = this.reEvaluator.shouldReEvaluate();"""
        ),
        # P18: Mark positions as QPM-managed
        (
            """                // ── Health Score ──
                const recentPrices = priceHistory.slice(-30);
                const health = this.healthScorer.score(pos, currentPrice, vqcRegime, qmcSim, qraRisk, recentPrices);
                result.healthReport.set(sym, health);""",
            """                // ── Health Score ──
                const recentPrices = priceHistory.slice(-30);
                const health = this.healthScorer.score(pos, currentPrice, vqcRegime, qmcSim, qraRisk, recentPrices);
                result.healthReport.set(sym, health);

                pos._qpmManaged = true;"""
        ),
        # P19: Health emergency acceleration
        (
            """        // ── Step 4: Multi-position optimization (FULL level only) ──""",
            """        const hasEmergency = Array.from(result.healthReport.values()).some(h => h.status === 'EMERGENCY');
        if (hasEmergency) {
            this.reEvaluator.setMarketConditions(volatilityLevel, true, true);
        }

        // ── Step 4: Multi-position optimization (FULL level only) ──"""
        ),
        # P20: Add _recentRegimeChanged helper
        (
            """    getPositionHealth(symbol) {
        return this.healthScorer.getScoreTrend(symbol);
    }

    onPositionClosed(symbol) {""",
            """    getPositionHealth(symbol) {
        return this.healthScorer.getScoreTrend(symbol);
    }

    _recentRegimeChanged(lastRegime, priceHistory) {
        if (!priceHistory || priceHistory.length < 20) return false;
        const recent10 = priceHistory.slice(-10);
        const recent20 = priceHistory.slice(-20);
        const sma10 = recent10.reduce((s, p) => s + p, 0) / 10;
        const sma20 = recent20.reduce((s, p) => s + p, 0) / 20;
        const smaRatio = (sma10 - sma20) / sma20;
        let impliedRegime = 'RANGING';
        if (smaRatio > 0.005) impliedRegime = 'TRENDING_UP';
        else if (smaRatio < -0.005) impliedRegime = 'TRENDING_DOWN';
        const returns = [];
        for (let i = 1; i < recent10.length; i++) {
            returns.push(Math.abs((recent10[i] - recent10[i-1]) / recent10[i-1]));
        }
        const avgVol = returns.reduce((s, r) => s + r, 0) / returns.length;
        if (avgVol > 0.02) impliedRegime = 'HIGH_VOLATILITY';
        return impliedRegime !== lastRegime;
    }

    onPositionClosed(symbol) {"""
        ),
    ]
    success = patch_file(filepath, patches)
    with open(filepath, 'r') as f:
        content = f.read()
    for check in ['isShort', 'setMarketConditions', '_recentRegimeChanged', 'adverseRegime',
                  'directedProfit', 'directedMomentum', '_accelerated', 'positionSide',
                  'HEALTH_EMERGENCY', '_qpmManaged = true']:
        assert check in content, f'FAIL: {check} not found!'
    print(f'  OK quantum_position_manager.js: {len(content)} bytes')

def patch_bot():
    filepath = os.path.join(BOT_DIR, 'src/modules/bot.js')
    print(f'\n[4/4] Patching bot.js...')
    backup_file(filepath)
    patches = [
        # P1: Quantum Initial SL/TP
        (
            """                    if (shouldExecute) {
                        await this.exec.executeTradeSignal(consensus, this.dp);
                        this.server.broadcastPortfolioUpdate();""",
            """                    if (shouldExecute) {
                        await this.exec.executeTradeSignal(consensus, this.dp);

                        // PATCH #19: Quantum Initial SL/TP
                        if (consensus.action === 'BUY' && this.quantumPosMgr && this.quantumPosMgr.isReady
                            && this.pm.hasPosition(consensus.symbol)) {
                            try {
                                const pos = this.pm.getPosition(consensus.symbol);
                                pos._qpmManaged = true;
                                const currentPrice = pos.entryPrice;
                                let vqcRegime = null, qraRisk = null, qmcSim = null;
                                if (hybridBoostResult) {
                                    vqcRegime = hybridBoostResult.regimeClassification || null;
                                    qraRisk = hybridBoostResult.riskAnalysis || null;
                                    qmcSim = hybridBoostResult.qmcSimulation || null;
                                }
                                let currentATR = pos.atrAtEntry || (currentPrice * 0.02);
                                if (history && history.length >= 20) {
                                    try {
                                        const candleData = history.slice(-20).map(c => ({
                                            symbol: consensus.symbol, timestamp: Date.now(),
                                            open: c.open || c.close, high: c.high, low: c.low,
                                            close: c.close, volume: c.volume || 0,
                                        }));
                                        const ind = require('./indicators');
                                        const liveATR = ind.calculateATR(candleData, 14);
                                        if (liveATR > 0) currentATR = liveATR;
                                    } catch (e) { /* use entry ATR */ }
                                }
                                const sltpResult = this.quantumPosMgr.dynamicSLTP.calculate(
                                    pos, currentPrice, currentATR, vqcRegime, qraRisk, qmcSim
                                );
                                if (sltpResult.newSL && Math.abs(sltpResult.newSL - pos.stopLoss) > 0.01) {
                                    const oldSL = pos.stopLoss;
                                    pos.stopLoss = sltpResult.newSL;
                                    console.log('[QUANTUM INIT SL] ' + consensus.symbol +
                                        ': $' + oldSL.toFixed(2) + ' -> $' + sltpResult.newSL.toFixed(2) +
                                        ' | ' + sltpResult.reasoning);
                                    if (this.megatron) {
                                        this.megatron.logActivity('QUANTUM', 'Initial SL (Quantum-Adjusted)',
                                            consensus.symbol + ': Static $' + oldSL.toFixed(2) +
                                            ' -> Quantum $' + sltpResult.newSL.toFixed(2), sltpResult.adjustments);
                                    }
                                }
                                if (sltpResult.newTP && Math.abs(sltpResult.newTP - pos.takeProfit) > 0.01) {
                                    const oldTP = pos.takeProfit;
                                    this.pm.updateTakeProfit(consensus.symbol, sltpResult.newTP);
                                    console.log('[QUANTUM INIT TP] ' + consensus.symbol +
                                        ': $' + (oldTP || 0).toFixed(2) + ' -> $' + sltpResult.newTP.toFixed(2) +
                                        ' | ' + sltpResult.reasoning);
                                    if (this.megatron) {
                                        this.megatron.logActivity('QUANTUM', 'Initial TP (Quantum-Adjusted)',
                                            consensus.symbol + ': Static $' + (oldTP || 0).toFixed(2) +
                                            ' -> Quantum $' + sltpResult.newTP.toFixed(2), sltpResult.adjustments);
                                    }
                                }
                                console.log('[QUANTUM INIT] Position ' + consensus.symbol +
                                    ' opened with quantum SL/TP | Regime: ' +
                                    (vqcRegime ? vqcRegime.regime : 'N/A') +
                                    ' | Risk: ' + (qraRisk ? qraRisk.riskScore + '/100' : 'N/A'));
                            } catch (e) {
                                console.warn('[WARN] Quantum initial SL/TP:', e.message);
                            }
                        }

                        this.server.broadcastPortfolioUpdate();"""
        ),
        # P2: TP via updateTakeProfit
        (
            """                } else if (adj.type === 'TP_UPDATE' && adj.newValue) {
                    if (pos.takeProfit !== adj.newValue) {
                        pos.takeProfit = adj.newValue;
                        console.log('[QUANTUM TP] ' + adj.symbol + ': $' + (adj.oldValue || 0).toFixed(2) +""",
            """                } else if (adj.type === 'TP_UPDATE' && adj.newValue) {
                    if (pos.takeProfit !== adj.newValue) {
                        this.pm.updateTakeProfit(adj.symbol, adj.newValue);
                        console.log('[QUANTUM TP] ' + adj.symbol + ': $' + (adj.oldValue || 0).toFixed(2) +"""
        ),
        # P3: SL direction-aware
        (
            """                if (adj.type === 'SL_UPDATE' && adj.newValue > pos.stopLoss) {
                    this.pm.updateStopLoss(adj.symbol, adj.newValue);""",
            """                if (adj.type === 'SL_UPDATE' && adj.newValue) {
                    this.pm.updateStopLoss(adj.symbol, adj.newValue);"""
        ),
        # P4: Pyramid + Consolidation execution
        (
            """            // Log portfolio optimization (FULL only)
            if (qpmResult.portfolioOpt && this.megatron) {
                const opt = qpmResult.portfolioOpt;
                this.megatron.logActivity('QUANTUM', 'Portfolio Optimization',
                    'Exposure: ' + (opt.totalExposure * 100).toFixed(1) + '% | Capacity: ' + opt.remainingCapacity +
                    ' | Pyramids: ' + (opt.pyramidRecommendations || []).length +
                    ' | Consolidate: ' + (opt.consolidations || []).length);
            }
""",
            """            // Log portfolio optimization (FULL only)
            if (qpmResult.portfolioOpt && this.megatron) {
                const opt = qpmResult.portfolioOpt;
                this.megatron.logActivity('QUANTUM', 'Portfolio Optimization',
                    'Exposure: ' + (opt.totalExposure * 100).toFixed(1) + '% | Capacity: ' + opt.remainingCapacity +
                    ' | Pyramids: ' + (opt.pyramidRecommendations || []).length +
                    ' | Consolidate: ' + (opt.consolidations || []).length);
            }

            // PATCH #19: Execute pyramid recommendations
            if (qpmResult.portfolioOpt && qpmResult.portfolioOpt.pyramidRecommendations) {
                for (const pyrRec of qpmResult.portfolioOpt.pyramidRecommendations) {
                    const pos = this.pm.getPosition(pyrRec.symbol);
                    if (!pos) continue;
                    try {
                        const currentPrice = await this._getCurrentPrice(pyrRec.symbol);
                        if (!currentPrice) continue;
                        const portfolio = this.pm.getPortfolio();
                        const addValue = portfolio.totalValue * (pyrRec.addSizePct / 100);
                        const addQty = addValue / currentPrice;
                        if (addQty <= 0.000001) continue;
                        if (!this.rm.checkOvertradingLimit()) {
                            console.log('[PYRAMID SKIP] Overtrading limit for ' + pyrRec.symbol);
                            continue;
                        }
                        if (addValue > this.pm.balance.usdtBalance * 0.9) {
                            console.log('[PYRAMID SKIP] Insufficient balance for ' + pyrRec.symbol);
                            continue;
                        }
                        const result = this.pm.addToPosition(pyrRec.symbol, currentPrice, addQty);
                        if (result) {
                            const fees = currentPrice * addQty * this.config.tradingFeeRate;
                            this.pm.portfolio.realizedPnL -= fees;
                            if (this.quantumPosMgr && this.quantumPosMgr.isReady) {
                                try {
                                    let currentATR = pos.atrAtEntry || (currentPrice * 0.02);
                                    if (marketDataHistory && marketDataHistory.length >= 20) {
                                        const candleData = marketDataHistory.slice(-20).map(c => ({
                                            symbol: pyrRec.symbol, timestamp: Date.now(),
                                            open: c.open || c.close, high: c.high, low: c.low,
                                            close: c.close, volume: c.volume || 0,
                                        }));
                                        const ind = require('./indicators');
                                        const liveATR = ind.calculateATR(candleData, 14);
                                        if (liveATR > 0) currentATR = liveATR;
                                    }
                                    const sltpResult = this.quantumPosMgr.dynamicSLTP.calculate(
                                        result, currentPrice, currentATR, null, null, null
                                    );
                                    if (sltpResult.newSL) result.stopLoss = sltpResult.newSL;
                                    if (sltpResult.newTP) this.pm.updateTakeProfit(pyrRec.symbol, sltpResult.newTP);
                                } catch (e) { /* QPM recalc non-critical */ }
                            }
                            console.log('[QUANTUM PYRAMID] Level ' + pyrRec.level + ' ' + pyrRec.symbol +
                                ': +' + addQty.toFixed(6) + ' @ $' + currentPrice.toFixed(2) +
                                ' | New avg: $' + result.entryPrice.toFixed(2) + ' | ' + pyrRec.reason);
                            if (this.megatron) {
                                this.megatron.logActivity('TRADE', 'Quantum Pyramid: L' + pyrRec.level,
                                    pyrRec.symbol + ' +' + addQty.toFixed(6) + ' @ $' + currentPrice.toFixed(2) +
                                    ' | New avg: $' + result.entryPrice.toFixed(2) + ' | ' + pyrRec.reason, pyrRec, 'normal');
                            }
                            if (this.advancedPositionManager) {
                                try {
                                    const pid = pyrRec.symbol + '-pyramid-' + Date.now();
                                    await this.advancedPositionManager.openPosition(
                                        pid, pyrRec.symbol, 'long', currentPrice, addQty, 'QuantumPyramid', 1.0
                                    );
                                } catch(e) { /* APM sync non-critical */ }
                            }
                        }
                    } catch (e) {
                        console.warn('[WARN] Pyramid execution ' + pyrRec.symbol + ':', e.message);
                    }
                }
            }

            // PATCH #19: Execute consolidation recommendations
            if (qpmResult.portfolioOpt && qpmResult.portfolioOpt.consolidations) {
                for (const cons of qpmResult.portfolioOpt.consolidations) {
                    if (cons.action !== 'CLOSE') continue;
                    const pos = this.pm.getPosition(cons.symbol);
                    if (!pos) continue;
                    try {
                        const currentPrice = await this._getCurrentPrice(cons.symbol);
                        if (!currentPrice) continue;
                        const trade = this.pm.closePosition(cons.symbol, currentPrice, null, 'QUANTUM_CONSOLIDATE', 'QuantumPosMgr');
                        if (trade) {
                            this.rm.recordTradeResult(trade.pnl);
                            console.log('[QUANTUM CONSOLIDATE] ' + cons.symbol +
                                ' closed | PnL: $' + trade.pnl.toFixed(2) + ' | ' + cons.reason);
                            if (this.ml) {
                                this.ml.learnFromTrade(trade.pnl, Date.now() - (pos.entryTime || Date.now()), marketDataHistory);
                            }
                            if (this.megatron) {
                                this.megatron.logActivity('TRADE', 'Quantum Consolidation',
                                    cons.symbol + ' | PnL: $' + trade.pnl.toFixed(2) + ' | ' + cons.reason, trade, 'normal');
                            }
                            if (this.quantumPosMgr) this.quantumPosMgr.onPositionClosed(cons.symbol);
                            if (this.advancedPositionManager) {
                                try {
                                    const ap = this.advancedPositionManager.activePositions;
                                    if (ap) {
                                        for (const [pid, p] of ap) {
                                            if (p && p.symbol === cons.symbol) {
                                                await this.advancedPositionManager.closePosition(pid, 'QUANTUM_CONSOLIDATE');
                                                break;
                                            }
                                        }
                                    }
                                } catch(e) { /* APM sync non-critical */ }
                            }
                        }
                    } catch (e) {
                        console.warn('[WARN] Consolidation ' + cons.symbol + ':', e.message);
                    }
                }
            }
"""
        ),
        # P5: APM-PM periodic sync
        (
            """                    } catch(e) { console.warn('[WARN] APM monitor:', e.message); }
                }
            }

            // PATCH #18: Quantum Position Monitoring""",
            """                    } catch(e) { console.warn('[WARN] APM monitor:', e.message); }
                }

                // PATCH #19: APM-PM State Sync
                if (this.advancedPositionManager && this._cycleCount % 10 === 0) {
                    try {
                        const pmPositions = this.pm.getPositions();
                        const apmPositions = this.advancedPositionManager.activePositions;
                        if (apmPositions && apmPositions.size > 0) {
                            const orphaned = [];
                            for (const [pid, apmPos] of apmPositions) {
                                if (apmPos && apmPos.symbol && !pmPositions.has(apmPos.symbol)) {
                                    orphaned.push(pid);
                                }
                            }
                            for (const pid of orphaned) {
                                await this.advancedPositionManager.closePosition(pid, 'SYNC_CLEANUP');
                                console.log('[APM SYNC] Removed orphaned APM position: ' + pid);
                            }
                            if (orphaned.length > 0 && this.megatron) {
                                this.megatron.logActivity('SYSTEM', 'APM-PM Sync',
                                    'Cleaned ' + orphaned.length + ' orphaned APM position(s)');
                            }
                        }
                    } catch(e) { /* APM sync non-critical */ }
                }
            }

            // PATCH #18: Quantum Position Monitoring"""
        ),
    ]
    success = patch_file(filepath, patches)
    with open(filepath, 'r') as f:
        content = f.read()
    for check in ['QUANTUM INIT SL', 'QUANTUM INIT TP', 'QUANTUM PYRAMID', 'QUANTUM CONSOLIDATE',
                  'APM-PM Sync', 'updateTakeProfit', 'addToPosition', '_qpmManaged = true',
                  'SYNC_CLEANUP', 'orphaned']:
        assert check in content, f'FAIL: {check} not found!'
    print(f'  OK bot.js: {len(content)} bytes')

def main():
    print('=' * 60)
    print(' PATCH #19: Quantum Dynamic Position Management')
    print('=' * 60)
    os.makedirs(BACKUP_DIR, exist_ok=True)
    print(f'Backup: {BACKUP_DIR}')
    try:
        patch_portfolio_manager()
        patch_execution_engine()
        patch_quantum_position_manager()
        patch_bot()
        print('\n' + '=' * 60)
        print(' ALL 4 FILES PATCHED SUCCESSFULLY')
        print('=' * 60)
        return 0
    except AssertionError as e:
        print(f'\nFAIL: {e}')
        for name in os.listdir(BACKUP_DIR):
            src = os.path.join(BACKUP_DIR, name)
            if name == 'quantum_position_manager.js':
                dst = os.path.join(BOT_DIR, 'src/core/ai', name)
            else:
                dst = os.path.join(BOT_DIR, 'src/modules', name)
            shutil.copy2(src, dst)
            print(f'  Restored: {name}')
        return 1
    except Exception as e:
        print(f'\nERROR: {e}')
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
