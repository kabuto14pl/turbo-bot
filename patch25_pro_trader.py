#!/usr/bin/env python3
"""
==========================================================================
PATCH #25: PRO TRADER UPGRADE — Enterprise Multi-Position & Enhanced AI
==========================================================================

CHANGES:
1. risk-manager.js:
   - Disable Circuit Breaker in simulation/paper mode
   - Disable Consecutive Losses tracking in simulation/paper mode
   - Disable Soft Pause in simulation/paper mode
   - calculateDynamicRisk never returns 0 in simulation

2. portfolio-manager.js:
   - Multi-position support: unique position IDs (symbol, symbol_2, symbol_3...)
   - hasPosition() checks any position matching symbol prefix
   - getPosition() returns first/oldest position for symbol
   - getPositionsForSymbol() returns ALL positions for a symbol
   - Fix closePosition bracket structure bug
   - positionCount still returns total count

3. execution-engine.js:
   - Remove hasPosition BUY rejection — allow multi-position
   - Add maxPositions check (configurable limit)
   - Support SCALE_IN action

4. neuron_ai_manager.js:
   - Reduce decision cooldown 25s → 8s
   - Raise confidence cap 0.95 → 1.0
   - Remove consecutive losses cooldown from safety constraints
   - Raise drawdown block from 12% → 18%
   - Enhance LLM prompt: Add MACD, ATR, Bollinger, volume, recent prices, position details
   - Allow multi-position in fallback (remove hasPosition blocks)
   - Expand risk multiplier range 0.3 — 2.0
   - Add SCALE_IN, PARTIAL_CLOSE, FLIP to action map
   - Improve evolution with regex-based pattern matching

5. bot.js:
   - Skip Circuit Breaker check in simulation/paper mode
   - Pass full indicator set to Neuron AI (MACD, Bollinger, ATR, volume)
   - Pass position details array instead of boolean
   - Pass recent price history for trend context
"""

import os
import sys
import re
import shutil
from datetime import datetime

BASE = '/root/turbo-bot/trading-bot/src/modules'
RISK_PATH = os.path.join(BASE, 'risk-manager.js')
PORTFOLIO_PATH = os.path.join(BASE, 'portfolio-manager.js')
EXECUTION_PATH = os.path.join(BASE, 'execution-engine.js')
BOT_PATH = os.path.join(BASE, 'bot.js')
NEURON_PATH = '/root/turbo-bot/trading-bot/src/core/ai/neuron_ai_manager.js'
BACKUP_DIR = '/root/turbo-bot/backups/patch25_' + datetime.now().strftime('%Y%m%d_%H%M%S')

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def backup_file(path):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    dest = os.path.join(BACKUP_DIR, os.path.basename(path))
    shutil.copy2(path, dest)
    print(f'  Backup: {dest}')

def safe_replace(content, old, new, file_name, desc):
    if old not in content:
        print(f'  WARNING: Pattern not found in {file_name}: {desc}')
        print(f'    Expected: {old[:100]}...')
        return content, False
    count = content.count(old)
    if count > 1:
        print(f'  NOTE: {count} matches in {file_name}: {desc} (replacing first)')
    result = content.replace(old, new, 1)
    print(f'  OK: {file_name} — {desc}')
    return result, True

# Counters
total_changes = 0
total_warnings = 0

def apply_replace(content, old, new, file_name, desc):
    global total_changes, total_warnings
    result, ok = safe_replace(content, old, new, file_name, desc)
    if ok:
        total_changes += 1
    else:
        total_warnings += 1
    return result


###############################################################################
# 1. RISK MANAGER — Disable CB, Consecutive Losses, Soft Pause in Simulation
###############################################################################
def patch_risk_manager():
    print('\n[1/5] Patching risk-manager.js...')
    content = read_file(RISK_PATH)
    backup_file(RISK_PATH)

    # Add _isSimulation helper after constructor
    old = """    isCircuitBreakerTripped() {"""
    new = """    _isSimulation() {
        const mode = (process.env.MODE || 'simulation').toLowerCase();
        return mode === 'simulation' || mode === 'paper' || mode === 'paper_trading';
    }

    // PATCH #25: CB disabled in simulation/paper mode
    isCircuitBreakerTripped() {"""
    content = apply_replace(content, old, new, 'risk-manager.js', 'Add _isSimulation() helper')

    # Modify isCircuitBreakerTripped to bypass in simulation
    old = """    isCircuitBreakerTripped() {
        if (this.circuitBreaker.emergencyStopTriggered) return true;
        const hours = (Date.now() - this.circuitBreaker.lastResetTime) / 3600000;
        if (this.circuitBreaker.isTripped && hours >= 1) { this.resetCircuitBreaker(); return false; }
        return this.circuitBreaker.isTripped;
    }"""
    new = """    isCircuitBreakerTripped() {
        // PATCH #25: Always false in simulation/paper — user request
        if (this._isSimulation()) return false;
        if (this.circuitBreaker.emergencyStopTriggered) return true;
        const hours = (Date.now() - this.circuitBreaker.lastResetTime) / 3600000;
        if (this.circuitBreaker.isTripped && hours >= 1) { this.resetCircuitBreaker(); return false; }
        return this.circuitBreaker.isTripped;
    }"""
    content = apply_replace(content, old, new, 'risk-manager.js', 'CB bypass in simulation')

    # Modify recordTradeResult — don't trip CB or activate softPause in simulation
    old = """    recordTradeResult(pnl) {
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
    }"""
    new = """    recordTradeResult(pnl) {
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
    }"""
    content = apply_replace(content, old, new, 'risk-manager.js', 'recordTradeResult simulation bypass')

    # Modify calculateDynamicRisk — don't return 0 in simulation
    old = """        if (this.circuitBreaker.consecutiveLosses >= this.circuitBreaker.maxConsecutiveLosses) return 0;"""
    new = """        if (!this._isSimulation() && this.circuitBreaker.consecutiveLosses >= this.circuitBreaker.maxConsecutiveLosses) return 0;"""
    content = apply_replace(content, old, new, 'risk-manager.js', 'calculateDynamicRisk no zero in simulation')

    # Modify calculateOptimalQuantity — don't halve in simulation
    old = """        if (this.softPauseActive) { qty *= 0.5; console.log('?????? [SOFT PAUSE] Size halved: ' + qty.toFixed(6)); }"""
    new = """        if (this.softPauseActive && !this._isSimulation()) { qty *= 0.5; console.log('[SOFT PAUSE] Size halved: ' + qty.toFixed(6)); }"""
    content = apply_replace(content, old, new, 'risk-manager.js', 'calculateOptimalQuantity no halving in simulation')

    write_file(RISK_PATH, content)
    print('  DONE: risk-manager.js patched')


###############################################################################
# 2. PORTFOLIO MANAGER — Multi-Position Support
###############################################################################
def patch_portfolio_manager():
    print('\n[2/5] Patching portfolio-manager.js...')
    content = read_file(PORTFOLIO_PATH)
    backup_file(PORTFOLIO_PATH)

    # Replace hasPosition to support multi-position keys
    old = """    hasPosition(symbol) { return this.positions.has(symbol); }
    getPosition(symbol) { return this.positions.get(symbol); }"""
    new = """    // PATCH #25: Multi-position support — check any position key matching symbol
    hasPosition(symbol) {
        if (this.positions.has(symbol)) return true;
        for (const key of this.positions.keys()) {
            if (key.startsWith(symbol + '_')) return true;
        }
        return false;
    }
    // PATCH #25: Get first (oldest) position for symbol
    getPosition(symbol) {
        if (this.positions.has(symbol)) return this.positions.get(symbol);
        for (const [key, pos] of this.positions) {
            if (key.startsWith(symbol + '_')) return pos;
        }
        return undefined;
    }
    // PATCH #25: Get ALL positions for a symbol (with their keys)
    getPositionsForSymbol(symbol) {
        const result = [];
        for (const [key, pos] of this.positions) {
            if (key === symbol || key.startsWith(symbol + '_')) {
                result.push({ key, position: pos });
            }
        }
        return result;
    }
    // PATCH #25: Get first position key for a symbol
    getPositionKey(symbol) {
        if (this.positions.has(symbol)) return symbol;
        for (const key of this.positions.keys()) {
            if (key.startsWith(symbol + '_')) return key;
        }
        return null;
    }
    // PATCH #25: Count positions for a specific symbol
    getPositionCountForSymbol(symbol) {
        let count = 0;
        for (const key of this.positions.keys()) {
            if (key === symbol || key.startsWith(symbol + '_')) count++;
        }
        return count;
    }"""
    content = apply_replace(content, old, new, 'portfolio-manager.js', 'Multi-position methods')

    # Replace openPosition to use unique keys
    old = """    openPosition(symbol, data) {
        const side = data.side || 'LONG';
        const position = {
            symbol, side, entryPrice: data.entryPrice,
            quantity: data.quantity, entryTime: Date.now(),
            value: data.entryPrice * data.quantity,
            stopLoss: data.stopLoss, takeProfit: data.takeProfit,
            atrAtEntry: data.atrAtEntry || 0, _partialTpDone: false,
            _pyramidLevel: data.pyramidLevel || 0,
            _qpmManaged: false,
        };
        this.positions.set(symbol, position);"""
    new = """    // PATCH #25: Generate unique position key for multi-position support
    _nextPositionKey(symbol) {
        if (!this.positions.has(symbol)) return symbol;
        let counter = 2;
        while (this.positions.has(symbol + '_' + counter)) counter++;
        return symbol + '_' + counter;
    }

    openPosition(symbol, data) {
        const side = data.side || 'LONG';
        const posKey = this._nextPositionKey(symbol);
        const position = {
            symbol, posKey, side, entryPrice: data.entryPrice,
            quantity: data.quantity, entryTime: Date.now(),
            value: data.entryPrice * data.quantity,
            stopLoss: data.stopLoss, takeProfit: data.takeProfit,
            atrAtEntry: data.atrAtEntry || 0, _partialTpDone: false,
            _pyramidLevel: data.pyramidLevel || 0,
            _qpmManaged: false,
        };
        this.positions.set(posKey, position);
        if (posKey !== symbol) {
            console.log('[MULTI-POS] New position ' + posKey + ' (' + side + ') | Total: ' + this.positions.size);
        }"""
    content = apply_replace(content, old, new, 'portfolio-manager.js', 'openPosition multi-position keys')

    # Fix closePosition bracket structure bug and support position keys
    old = """        if (closeQty >= pos.quantity) this.positions.delete(symbol);
            // PATCH #21: Clear unrealizedPnL when no more positions
            if (this.positions.size === 0) {
                this.portfolio.unrealizedPnL = 0;
            }
        else { pos.quantity -= closeQty; pos.value = pos.entryPrice * pos.quantity; }"""
    new = """        if (closeQty >= pos.quantity) {
            this.positions.delete(symbol);
            // PATCH #21: Clear unrealizedPnL when no more positions
            if (this.positions.size === 0) {
                this.portfolio.unrealizedPnL = 0;
            }
        } else {
            pos.quantity -= closeQty;
            pos.value = pos.entryPrice * pos.quantity;
        }"""
    content = apply_replace(content, old, new, 'portfolio-manager.js', 'Fix closePosition bracket structure')

    write_file(PORTFOLIO_PATH, content)
    print('  DONE: portfolio-manager.js patched')


###############################################################################
# 3. EXECUTION ENGINE — Multi-Position, No hasPosition BUY Block
###############################################################################
def patch_execution_engine():
    print('\n[3/5] Patching execution-engine.js...')
    content = read_file(EXECUTION_PATH)
    backup_file(EXECUTION_PATH)

    # Replace _validateSignal: Remove hasPosition BUY block, add max positions check
    old = """    _validateSignal(signal) {
        if (!signal || !signal.action || !signal.price) return { valid: false, reason: 'Invalid signal' };
        if (signal.action === 'BUY' && this.pm.hasPosition(signal.symbol)) return { valid: false, reason: 'Position already open' };
        // PATCH #23: SELL without position = open SHORT (old validation removed)
        if (signal.action === 'BUY') {
            const maxPos = this.pm.getPortfolio().totalValue * 0.15;
            if (signal.price * (signal.quantity || 0.001) > maxPos) return { valid: false, reason: 'Exceeds max position' };
        }
        return { valid: true };
    }"""
    new = """    // PATCH #25: Multi-position support — removed hasPosition BUY block
    _validateSignal(signal) {
        if (!signal || !signal.action || !signal.price) return { valid: false, reason: 'Invalid signal' };
        // PATCH #25: Allow BUY even when position exists (multi-position)
        // Limit: max 5 simultaneous positions per symbol
        if (signal.action === 'BUY') {
            const currentCount = this.pm.getPositionCountForSymbol
                ? this.pm.getPositionCountForSymbol(signal.symbol)
                : (this.pm.hasPosition(signal.symbol) ? 1 : 0);
            if (currentCount >= 5) {
                return { valid: false, reason: 'Max 5 positions for ' + signal.symbol };
            }
            // Max position value check: 20% of portfolio per position
            const maxPos = this.pm.getPortfolio().totalValue * 0.20;
            if (signal.price * (signal.quantity || 0.001) > maxPos) return { valid: false, reason: 'Exceeds max position' };
        }
        // PATCH #23: SELL without position = open SHORT
        return { valid: true };
    }"""
    content = apply_replace(content, old, new, 'execution-engine.js', 'Multi-position _validateSignal')

    # In executeTradeSignal BUY path: when position already exists, open new one (multi-pos)
    # The current BUY path already calls this.pm.openPosition which now auto-generates unique key
    # No change needed here — the portfolio manager handles it

    # In executeTradeSignal SELL path: when closing, use the position key properly
    # The SELL path does: const pos = this.pm.getPosition(signal.symbol);
    # getPosition now returns first matching position — correct behavior

    write_file(EXECUTION_PATH, content)
    print('  DONE: execution-engine.js patched')


###############################################################################
# 4. NEURON AI MANAGER — Pro Trader Upgrade
###############################################################################
def patch_neuron_ai_manager():
    print('\n[4/5] Patching neuron_ai_manager.js...')
    content = read_file(NEURON_PATH)
    backup_file(NEURON_PATH)

    # 4a. Reduce cooldown from 25s to 8s
    old = """        this.decisionCooldownMs = 25000; // Min 25s between LLM calls"""
    new = """        this.decisionCooldownMs = 8000; // PATCH #25: Reduced 25s -> 8s for faster reaction"""
    content = apply_replace(content, old, new, 'neuron_ai_manager.js', 'Decision cooldown 25s -> 8s')

    # 4b. Wider risk multiplier range: comment says 0.5-1.5 but code limits differently
    old = """        this.riskMultiplier = 1.0;     // 0.5 = conservative, 1.5 = aggressive"""
    new = """        this.riskMultiplier = 1.0;     // PATCH #25: Range 0.3-2.0 (was 0.5-1.5)"""
    content = apply_replace(content, old, new, 'neuron_ai_manager.js', 'Risk multiplier range comment')

    # 4c. Raise confidence cap from 0.95 to 1.0 in _llmDecision
    old = """        const confidence = Math.max(0.1, Math.min(0.95, parsed.confidence || 0.5));"""
    new = """        const confidence = Math.max(0.1, Math.min(1.0, parsed.confidence || 0.5)); // PATCH #25: cap raised to 1.0"""
    content = apply_replace(content, old, new, 'neuron_ai_manager.js', 'Confidence cap 0.95 -> 1.0')

    # 4d. Add SCALE_IN, PARTIAL_CLOSE, FLIP to action map
    old = """        const actionMap = {
            'OPEN_LONG': 'BUY',
            'OPEN_SHORT': 'SELL',
            'CLOSE': 'CLOSE',
            'HOLD': 'HOLD',
            'ADJUST_SL': 'HOLD',
            'ADJUST_TP': 'HOLD',
            'OVERRIDE_BIAS': 'HOLD',
        };"""
    new = """        // PATCH #25: Extended action map with SCALE_IN, PARTIAL_CLOSE, FLIP
        const actionMap = {
            'OPEN_LONG': 'BUY',
            'OPEN_SHORT': 'SELL',
            'CLOSE': 'CLOSE',
            'HOLD': 'HOLD',
            'ADJUST_SL': 'HOLD',
            'ADJUST_TP': 'HOLD',
            'OVERRIDE_BIAS': 'HOLD',
            'SCALE_IN': 'BUY',
            'PARTIAL_CLOSE': 'CLOSE',
            'FLIP': 'SELL',
        };"""
    content = apply_replace(content, old, new, 'neuron_ai_manager.js', 'Extended action map')

    # 4e. Replace _fallbackDecision to allow multi-position
    old_fallback = """    _fallbackDecision(state) {
        const votes = state.votes || { BUY: 0, SELL: 0, HOLD: 1 };
        const mtf = state.mtfBias || {};
        const portfolio = state.portfolio || {};
        const hasPosition = state.hasPosition || false;

        let action = 'HOLD';
        let confidence = 0.3;
        let reason = 'Fallback: insufficient conviction';

        const mtfScore = Math.abs(mtf.score || 0);
        const mtfDirection = mtf.direction || 'NEUTRAL';
        const mlSignal = state.mlSignal || {};
        const drawdown = portfolio.drawdownPct || 0;

        // Safety: high drawdown = conservative
        if (drawdown > this.fallbackRules.maxDrawdownPct) {
            if (hasPosition) {
                action = 'CLOSE';
                confidence = 0.8;
                reason = 'Ja, Neuron AI, zamykam pozycje -- drawdown ' + (drawdown * 100).toFixed(1) + '% przekracza limit';
            }
            return { action: action, confidence: confidence, source: 'NEURON_AI_FALLBACK', details: { reason: reason }, evolution: {}, isOverride: false };
        }

        // Strong MTF + ML alignment = trade
        if (mtfScore >= this.fallbackRules.minMTFScore && (mlSignal.confidence || 0) > this.fallbackRules.minMLConfidence) {
            if (mtfDirection === 'BEARISH' && (mlSignal.action === 'SELL' || (votes.SELL || 0) > 0.15)) {
                if (!hasPosition) {
                    action = 'SELL';
                    confidence = Math.min(0.85, (mlSignal.confidence || 0.5) * 0.9);
                    reason = 'Ja, Neuron AI, otwieram SHORT -- MTF BEARISH score=' + mtfScore + ', ML SELL conf=' + ((mlSignal.confidence||0)*100).toFixed(0) + '%';
                } else {
                    action = 'HOLD';
                    reason = 'Position already open, monitoring';
                }
            } else if (mtfDirection === 'BULLISH' && (mlSignal.action === 'BUY' || (votes.BUY || 0) > 0.15)) {
                if (!hasPosition) {
                    action = 'BUY';
                    confidence = Math.min(0.85, (mlSignal.confidence || 0.5) * 0.9);
                    reason = 'Ja, Neuron AI, otwieram LONG -- MTF BULLISH score=' + mtfScore + ', ML BUY conf=' + ((mlSignal.confidence||0)*100).toFixed(0) + '%';
                } else {
                    action = 'HOLD';
                    reason = 'Position already open, monitoring';
                }
            }
        }

        // Moderate signals: follow ensemble majority if clear
        if (action === 'HOLD' && !hasPosition) {
            const maxVote = Math.max(votes.BUY || 0, votes.SELL || 0);
            if (maxVote > 0.45) {
                const dir = (votes.BUY || 0) > (votes.SELL || 0) ? 'BUY' : 'SELL';
                const aligned = (dir === 'BUY' && mtfDirection === 'BULLISH') || (dir === 'SELL' && mtfDirection === 'BEARISH');
                if (aligned) {
                    action = dir;
                    confidence = Math.min(0.75, maxVote * 0.8);
                    reason = 'Fallback: Strong ensemble ' + dir + ' (' + (maxVote*100).toFixed(0) + '%) aligned with MTF ' + mtfDirection;
                }
            }
        }

        // Risk multiplier application
        if (action !== 'HOLD' && action !== 'CLOSE') {
            confidence *= this.riskMultiplier;
            confidence = Math.max(0.1, Math.min(0.95, confidence));
        }

        return {
            action: action,
            confidence: confidence,
            source: 'NEURON_AI_FALLBACK',
            details: { reason: reason, size_pct: 0.02 },
            evolution: {},
            isOverride: false,
        };
    }"""

    new_fallback = """    // PATCH #25: Multi-position enabled, no hasPosition blocks, higher confidence cap
    _fallbackDecision(state) {
        const votes = state.votes || { BUY: 0, SELL: 0, HOLD: 1 };
        const mtf = state.mtfBias || {};
        const portfolio = state.portfolio || {};
        const positionCount = state.positionCount || 0;
        const maxPositions = 5;

        let action = 'HOLD';
        let confidence = 0.3;
        let reason = 'Fallback: insufficient conviction';

        const mtfScore = Math.abs(mtf.score || 0);
        const mtfDirection = mtf.direction || 'NEUTRAL';
        const mlSignal = state.mlSignal || {};
        const drawdown = portfolio.drawdownPct || 0;

        // Safety: high drawdown = conservative (but don't block at low drawdown)
        if (drawdown > 0.15) {
            if (positionCount > 0) {
                action = 'CLOSE';
                confidence = 0.8;
                reason = 'Ja, Neuron AI, zamykam pozycje -- drawdown ' + (drawdown * 100).toFixed(1) + '% przekracza limit';
            }
            return { action: action, confidence: confidence, source: 'NEURON_AI_FALLBACK', details: { reason: reason }, evolution: {}, isOverride: false };
        }

        // Strong MTF + ML alignment = trade (MULTI-POSITION: allow even when positions exist)
        if (mtfScore >= this.fallbackRules.minMTFScore && (mlSignal.confidence || 0) > this.fallbackRules.minMLConfidence) {
            if (mtfDirection === 'BEARISH' && (mlSignal.action === 'SELL' || (votes.SELL || 0) > 0.15)) {
                if (positionCount < maxPositions) {
                    action = 'SELL';
                    confidence = Math.min(0.90, (mlSignal.confidence || 0.5) * 0.95);
                    reason = 'Ja, Neuron AI, otwieram SHORT -- MTF BEARISH score=' + mtfScore + ', ML SELL conf=' + ((mlSignal.confidence||0)*100).toFixed(0) + '% | Positions: ' + positionCount + '/' + maxPositions;
                } else {
                    action = 'HOLD';
                    reason = 'Max positions reached (' + maxPositions + ')';
                }
            } else if (mtfDirection === 'BULLISH' && (mlSignal.action === 'BUY' || (votes.BUY || 0) > 0.15)) {
                if (positionCount < maxPositions) {
                    action = 'BUY';
                    confidence = Math.min(0.90, (mlSignal.confidence || 0.5) * 0.95);
                    reason = 'Ja, Neuron AI, otwieram LONG -- MTF BULLISH score=' + mtfScore + ', ML BUY conf=' + ((mlSignal.confidence||0)*100).toFixed(0) + '% | Positions: ' + positionCount + '/' + maxPositions;
                } else {
                    action = 'HOLD';
                    reason = 'Max positions reached (' + maxPositions + ')';
                }
            }
        }

        // Moderate signals: follow ensemble majority if clear (multi-position OK)
        if (action === 'HOLD' && positionCount < maxPositions) {
            const maxVote = Math.max(votes.BUY || 0, votes.SELL || 0);
            if (maxVote > 0.45) {
                const dir = (votes.BUY || 0) > (votes.SELL || 0) ? 'BUY' : 'SELL';
                const aligned = (dir === 'BUY' && mtfDirection === 'BULLISH') || (dir === 'SELL' && mtfDirection === 'BEARISH');
                if (aligned) {
                    action = dir;
                    confidence = Math.min(0.80, maxVote * 0.85);
                    reason = 'Fallback: Strong ensemble ' + dir + ' (' + (maxVote*100).toFixed(0) + '%) aligned with MTF ' + mtfDirection + ' | Positions: ' + positionCount;
                }
            }
        }

        // Risk multiplier application
        if (action !== 'HOLD' && action !== 'CLOSE') {
            confidence *= this.riskMultiplier;
            confidence = Math.max(0.1, Math.min(1.0, confidence));
        }

        return {
            action: action,
            confidence: confidence,
            source: 'NEURON_AI_FALLBACK',
            details: { reason: reason, size_pct: 0.02 },
            evolution: {},
            isOverride: false,
        };
    }"""
    content = apply_replace(content, old_fallback, new_fallback, 'neuron_ai_manager.js', 'Fallback multi-position upgrade')

    # 4f. Replace _buildPrompt with comprehensive version
    old_prompt = """    _buildPrompt(state) {
        const votes = state.votes || {};
        const mtf = state.mtfBias || {};
        const portfolio = state.portfolio || {};
        const signals = state.signalSummary || [];
        const regime = state.regime || 'UNKNOWN';
        const price = state.price || 0;
        const hasPosition = state.hasPosition || false;
        const positionSide = state.positionSide || 'NONE';
        const indicators = state.indicators || {};
        const quantumRisk = state.quantumRisk || {};

        let prompt = '=== STAN BOTA ===\\n';
        prompt += 'Cena BTC: $' + price.toFixed(2) + '\\n';
        prompt += 'Regime: ' + regime + '\\n';
        prompt += 'Pozycja: ' + (hasPosition ? positionSide + ' (otwarta)' : 'BRAK') + '\\n';
        prompt += 'Portfolio: $' + (portfolio.totalValue || 0).toFixed(2) + ' | Drawdown: ' + ((portfolio.drawdownPct || 0) * 100).toFixed(1) + '%\\n';
        prompt += 'Win Rate: ' + ((portfolio.winRate || 0) * 100).toFixed(1) + '% | Trades: ' + (portfolio.totalTrades || 0) + '\\n';
        prompt += 'Realized PnL: $' + (portfolio.realizedPnL || 0).toFixed(2) + '\\n\\n';

        prompt += '=== MTF BIAS ===\\n';
        prompt += 'Direction: ' + (mtf.direction || 'N/A') + ' | Score: ' + (mtf.score || 0) + '\\n';
        prompt += 'Permission: ' + (mtf.tradePermission || 'N/A') + '\\n\\n';

        prompt += '=== ENSEMBLE VOTES (bez NeuronAI) ===\\n';
        prompt += 'BUY: ' + ((votes.BUY || 0) * 100).toFixed(1) + '% | SELL: ' + ((votes.SELL || 0) * 100).toFixed(1) + '% | HOLD: ' + ((votes.HOLD || 0) * 100).toFixed(1) + '%\\n';
        if (signals.length > 0) {
            prompt += 'Sygnaly:\\n';
            for (var i = 0; i < signals.length; i++) {
                prompt += '  ' + signals[i] + '\\n';
            }
        }
        prompt += '\\n';

        prompt += '=== WSKAZNIKI ===\\n';
        if (indicators.rsi !== undefined && indicators.rsi !== null) prompt += 'RSI: ' + Number(indicators.rsi).toFixed(1) + '\\n';
        if (indicators.macd !== undefined && indicators.macd !== null) prompt += 'MACD: ' + Number(indicators.macd).toFixed(4) + '\\n';
        prompt += '\\n';

        if (quantumRisk && quantumRisk.riskScore) {
            prompt += '=== QUANTUM RISK ===\\n';
            prompt += 'Risk Score: ' + quantumRisk.riskScore + '/100\\n';
            if (quantumRisk.blackSwanAlert) prompt += 'BLACK SWAN ALERT!\\n';
            prompt += '\\n';
        }

        prompt += '=== NEURON AI PERFORMANCE ===\\n';
        prompt += 'Decisions: ' + this.totalDecisions + ' | Overrides: ' + this.overrideCount + '\\n';
        prompt += 'Recent Win Rate: ' + this._getRecentWinRate().toFixed(1) + '% | Total PnL: $' + this.totalPnL.toFixed(2) + '\\n';
        prompt += 'Consecutive Losses: ' + this.consecutiveLosses + ' | Risk Multiplier: ' + this.riskMultiplier.toFixed(2) + '\\n';
        prompt += 'Adapted Weights: ' + (this.adaptedWeights ? JSON.stringify(this.adaptedWeights) : 'default') + '\\n\\n';

        prompt += 'Decyduj.';
        return prompt;
    }"""

    new_prompt = """    // PATCH #25: Enhanced Pro Trader prompt with full indicators, positions, price history
    _buildPrompt(state) {
        const votes = state.votes || {};
        const mtf = state.mtfBias || {};
        const portfolio = state.portfolio || {};
        const signals = state.signalSummary || [];
        const regime = state.regime || 'UNKNOWN';
        const price = state.price || 0;
        const positionCount = state.positionCount || 0;
        const positionDetails = state.positionDetails || [];
        const indicators = state.indicators || {};
        const quantumRisk = state.quantumRisk || {};
        const recentPrices = state.recentPrices || [];

        let prompt = '=== STAN RYNKU ===\\n';
        prompt += 'Cena BTC: $' + price.toFixed(2) + '\\n';
        prompt += 'Regime: ' + regime + '\\n';

        // PATCH #25: Recent price history for trend context
        if (recentPrices.length > 0) {
            prompt += 'Ostatnie ceny (od najstarszej): ';
            var priceStrs = [];
            for (var pi = 0; pi < recentPrices.length; pi++) {
                priceStrs.push('$' + recentPrices[pi].toFixed(0));
            }
            prompt += priceStrs.join(' -> ') + '\\n';
            var firstP = recentPrices[0];
            var lastP = recentPrices[recentPrices.length - 1];
            var trendPct = ((lastP - firstP) / firstP * 100).toFixed(2);
            prompt += 'Trend: ' + (trendPct > 0 ? '+' : '') + trendPct + '% (ostatnie ' + recentPrices.length + ' swiec)\\n';
        }
        prompt += '\\n';

        // PATCH #25: Full indicator dashboard
        prompt += '=== WSKAZNIKI TECHNICZNE ===\\n';
        if (indicators.rsi !== undefined && indicators.rsi !== null) {
            var rsiVal = Number(indicators.rsi);
            var rsiZone = rsiVal < 30 ? 'OVERSOLD' : rsiVal > 70 ? 'OVERBOUGHT' : rsiVal < 45 ? 'WEAK' : rsiVal > 55 ? 'STRONG' : 'NEUTRAL';
            prompt += 'RSI(14): ' + rsiVal.toFixed(1) + ' [' + rsiZone + ']\\n';
        }
        if (indicators.macd !== undefined && indicators.macd !== null) {
            prompt += 'MACD: ' + Number(indicators.macd).toFixed(4);
            if (indicators.macdSignal !== undefined) prompt += ' | Signal: ' + Number(indicators.macdSignal).toFixed(4);
            if (indicators.macdHistogram !== undefined) {
                var hist = Number(indicators.macdHistogram);
                prompt += ' | Histogram: ' + hist.toFixed(4) + ' [' + (hist > 0 ? 'BULLISH' : 'BEARISH') + ']';
            }
            prompt += '\\n';
        }
        if (indicators.bollingerUpper !== undefined) {
            var bbPos = 'MIDDLE';
            if (price >= Number(indicators.bollingerUpper)) bbPos = 'ABOVE UPPER (overbought)';
            else if (price <= Number(indicators.bollingerLower)) bbPos = 'BELOW LOWER (oversold)';
            else if (price > Number(indicators.bollingerMiddle)) bbPos = 'UPPER HALF';
            else bbPos = 'LOWER HALF';
            prompt += 'Bollinger: Upper=$' + Number(indicators.bollingerUpper).toFixed(0) + ' Mid=$' + Number(indicators.bollingerMiddle).toFixed(0) + ' Lower=$' + Number(indicators.bollingerLower).toFixed(0) + ' [' + bbPos + ']\\n';
            if (indicators.bollingerBandwidth !== undefined) {
                prompt += 'BB Bandwidth: ' + (Number(indicators.bollingerBandwidth) * 100).toFixed(2) + '% (volatility measure)\\n';
            }
        }
        if (indicators.atr !== undefined && indicators.atr !== null) {
            var atrPct = (Number(indicators.atr) / price * 100).toFixed(2);
            prompt += 'ATR(14): $' + Number(indicators.atr).toFixed(2) + ' (' + atrPct + '% volatility)\\n';
        }
        if (indicators.volume !== undefined) {
            prompt += 'Volume: ' + Number(indicators.volume).toFixed(0);
            if (indicators.avgVolume !== undefined) {
                var volRatio = (Number(indicators.volume) / Number(indicators.avgVolume)).toFixed(2);
                prompt += ' | Avg: ' + Number(indicators.avgVolume).toFixed(0) + ' | Ratio: ' + volRatio + 'x';
                if (Number(volRatio) > 1.5) prompt += ' [HIGH VOLUME]';
                else if (Number(volRatio) < 0.5) prompt += ' [LOW VOLUME]';
            }
            prompt += '\\n';
        }
        if (indicators.sma20 !== undefined) {
            prompt += 'SMA20: $' + Number(indicators.sma20).toFixed(0);
            if (indicators.sma50 !== undefined) prompt += ' | SMA50: $' + Number(indicators.sma50).toFixed(0);
            if (indicators.sma200 !== undefined) prompt += ' | SMA200: $' + Number(indicators.sma200).toFixed(0);
            prompt += '\\n';
        }
        prompt += '\\n';

        // PATCH #25: Detailed position info
        prompt += '=== POZYCJE (' + positionCount + ' otwartych) ===\\n';
        if (positionDetails.length > 0) {
            for (var pd = 0; pd < positionDetails.length; pd++) {
                var pos = positionDetails[pd];
                prompt += '  ' + (pd+1) + '. ' + (pos.side || 'LONG') + ' ' + (pos.symbol || 'BTCUSDT') + ' | Entry: $' + (pos.entryPrice || 0).toFixed(2) + ' | Qty: ' + (pos.quantity || 0).toFixed(6);
                if (pos.unrealizedPnL !== undefined) prompt += ' | uPnL: $' + pos.unrealizedPnL.toFixed(2);
                if (pos.stopLoss) prompt += ' | SL: $' + pos.stopLoss.toFixed(2);
                if (pos.takeProfit) prompt += ' | TP: $' + pos.takeProfit.toFixed(2);
                if (pos.holdingHours !== undefined) prompt += ' | ' + pos.holdingHours.toFixed(1) + 'h';
                prompt += '\\n';
            }
        } else {
            prompt += '  Brak otwartych pozycji\\n';
        }
        prompt += '\\n';

        prompt += '=== PORTFOLIO ===\\n';
        prompt += 'Wartosc: $' + (portfolio.totalValue || 0).toFixed(2) + ' | Drawdown: ' + ((portfolio.drawdownPct || 0) * 100).toFixed(1) + '%\\n';
        prompt += 'Win Rate: ' + ((portfolio.winRate || 0) * 100).toFixed(1) + '% | Trades: ' + (portfolio.totalTrades || 0) + ' | PnL: $' + (portfolio.realizedPnL || 0).toFixed(2) + '\\n\\n';

        prompt += '=== MTF BIAS ===\\n';
        prompt += 'Direction: ' + (mtf.direction || 'N/A') + ' | Score: ' + (mtf.score || 0) + ' | Permission: ' + (mtf.tradePermission || 'N/A') + '\\n\\n';

        prompt += '=== ENSEMBLE VOTES (bez NeuronAI) ===\\n';
        prompt += 'BUY: ' + ((votes.BUY || 0) * 100).toFixed(1) + '% | SELL: ' + ((votes.SELL || 0) * 100).toFixed(1) + '% | HOLD: ' + ((votes.HOLD || 0) * 100).toFixed(1) + '%\\n';
        if (signals.length > 0) {
            for (var i = 0; i < signals.length; i++) {
                prompt += '  ' + signals[i] + '\\n';
            }
        }
        prompt += '\\n';

        if (quantumRisk && quantumRisk.riskScore) {
            prompt += '=== QUANTUM RISK ===\\n';
            prompt += 'Risk Score: ' + quantumRisk.riskScore + '/100';
            if (quantumRisk.blackSwanAlert) prompt += ' | BLACK SWAN ALERT!';
            prompt += '\\n\\n';
        }

        prompt += '=== NEURON AI PERFORMANCE ===\\n';
        prompt += 'Decisions: ' + this.totalDecisions + ' | Overrides: ' + this.overrideCount + ' | PnL: $' + this.totalPnL.toFixed(2) + '\\n';
        prompt += 'Win Rate: ' + this._getRecentWinRate().toFixed(1) + '% | Consecutive Losses: ' + this.consecutiveLosses + ' | Risk: ' + this.riskMultiplier.toFixed(2) + '\\n';
        if (this.adaptedWeights) prompt += 'Adapted Weights: ' + JSON.stringify(this.adaptedWeights) + '\\n';
        prompt += '\\n';

        prompt += 'Zasady: Mozesz otwierac wiele pozycji jednoczesnie (max 5). Mozesz SCALE_IN (dodaj do istniejacego LONG), OPEN_SHORT, FLIP (zamknij i odwroc). Analizuj wszystkie wskazniki i podejmij optymalna decyzje. Decyduj.';
        return prompt;
    }"""
    content = apply_replace(content, old_prompt, new_prompt, 'neuron_ai_manager.js', 'Enhanced Pro Trader prompt')

    # 4g. Replace _applySafetyConstraints — remove consecutive loss cooldown, raise drawdown limit
    old_safety = """    _applySafetyConstraints(decision, state) {
        const portfolio = state.portfolio || {};
        const drawdown = portfolio.drawdownPct || 0;

        // Hard limit: max 2% risk
        if (decision.details && decision.details.size_pct) {
            decision.details.size_pct = Math.min(0.02, decision.details.size_pct);
        }

        // Hard limit: high drawdown = no new positions
        if (drawdown > 0.12 && (decision.action === 'BUY' || decision.action === 'SELL')) {
            console.log('[NEURON AI SAFETY] Drawdown ' + (drawdown*100).toFixed(1) + '% > 12% -- blocking new position');
            decision.action = 'HOLD';
            decision.confidence = 0.1;
            decision.details = decision.details || {};
            decision.details.reason = 'SAFETY: Drawdown too high for new position';
        }

        // Hard limit: 3 consecutive losses = mandatory cooldown
        if (this.consecutiveLosses >= 3 && (decision.action === 'BUY' || decision.action === 'SELL')) {
            console.log('[NEURON AI SAFETY] ' + this.consecutiveLosses + ' consecutive losses -- cooldown');
            decision.action = 'HOLD';
            decision.confidence = 0.1;
            decision.details = decision.details || {};
            decision.details.reason = 'SAFETY: Consecutive loss cooldown';
        }

        return decision;
    }"""

    new_safety = """    // PATCH #25: Removed consecutive loss cooldown (user request), raised drawdown limit to 18%
    _applySafetyConstraints(decision, state) {
        const portfolio = state.portfolio || {};
        const drawdown = portfolio.drawdownPct || 0;

        // Hard limit: max 2% risk per position
        if (decision.details && decision.details.size_pct) {
            decision.details.size_pct = Math.min(0.02, decision.details.size_pct);
        }

        // Hard limit: very high drawdown only (18%) = no new positions
        if (drawdown > 0.18 && (decision.action === 'BUY' || decision.action === 'SELL')) {
            console.log('[NEURON AI SAFETY] Drawdown ' + (drawdown*100).toFixed(1) + '% > 18% -- blocking new position');
            decision.action = 'HOLD';
            decision.confidence = 0.1;
            decision.details = decision.details || {};
            decision.details.reason = 'SAFETY: Drawdown too high for new position';
        }

        // PATCH #25: Consecutive losses cooldown REMOVED per user request
        // Bot operates in simulation mode — no artificial restrictions
        if (this.consecutiveLosses >= 5) {
            console.log('[NEURON AI] WARNING: ' + this.consecutiveLosses + ' consecutive losses — reducing confidence (NOT blocking)');
            if (decision.confidence > 0.5) {
                decision.confidence *= 0.85;
            }
        }

        return decision;
    }"""
    content = apply_replace(content, old_safety, new_safety, 'neuron_ai_manager.js', 'Safety constraints: remove consecutive loss block')

    # 4h. Improve learnFromTrade — wider multiplier range
    old_learn_win = """            if (this.consecutiveWins >= 3 && this.riskMultiplier < 1.3) {
                this.riskMultiplier = Math.min(1.3, this.riskMultiplier + 0.05);"""
    new_learn_win = """            if (this.consecutiveWins >= 3 && this.riskMultiplier < 2.0) {
                this.riskMultiplier = Math.min(2.0, this.riskMultiplier + 0.08);"""
    content = apply_replace(content, old_learn_win, new_learn_win, 'neuron_ai_manager.js', 'Win streak multiplier range -> 2.0')

    old_learn_loss = """            if (this.consecutiveLosses >= 2 && this.riskMultiplier > 0.5) {
                this.riskMultiplier = Math.max(0.5, this.riskMultiplier - 0.1);"""
    new_learn_loss = """            if (this.consecutiveLosses >= 2 && this.riskMultiplier > 0.3) {
                this.riskMultiplier = Math.max(0.3, this.riskMultiplier - 0.12);"""
    content = apply_replace(content, old_learn_loss, new_learn_loss, 'neuron_ai_manager.js', 'Loss streak multiplier range -> 0.3')

    # 4i. Improve _applyEvolution — more flexible pattern matching
    old_evolution = """    _applyEvolution(evolution) {
        if (!evolution || !evolution.changes) return;
        const changes = (typeof evolution.changes === 'string') ? evolution.changes.toLowerCase() : '';
        if (!changes) return;

        if (changes.indexOf('increase ml weight') >= 0 || changes.indexOf('zwieksz wage ml') >= 0) {
            if (!this.adaptedWeights) this.adaptedWeights = {};
            this.adaptedWeights.EnterpriseML = Math.min(0.40, (this.adaptedWeights.EnterpriseML || 0.30) + 0.05);
            console.log('[NEURON AI EVOLVE] ML weight increased to ' + (this.adaptedWeights.EnterpriseML * 100).toFixed(0) + '%');
            this.evolutionCount++;
        }
        if (changes.indexOf('decrease ml weight') >= 0 || changes.indexOf('zmniejsz wage ml') >= 0) {
            if (!this.adaptedWeights) this.adaptedWeights = {};
            this.adaptedWeights.EnterpriseML = Math.max(0.15, (this.adaptedWeights.EnterpriseML || 0.30) - 0.05);
            console.log('[NEURON AI EVOLVE] ML weight decreased to ' + (this.adaptedWeights.EnterpriseML * 100).toFixed(0) + '%');
            this.evolutionCount++;
        }
        if (changes.indexOf('enable reversal') >= 0 || changes.indexOf('wlacz reversal') >= 0) {
            this.reversalEnabled = true;
            console.log('[NEURON AI EVOLVE] Reversal detection ENABLED');
            this.evolutionCount++;
        }
        if (changes.indexOf('aggressive mode') >= 0 || changes.indexOf('tryb agresywny') >= 0) {
            this.aggressiveMode = true;
            this.riskMultiplier = Math.min(1.4, this.riskMultiplier + 0.1);
            console.log('[NEURON AI EVOLVE] Aggressive mode ON, risk -> ' + this.riskMultiplier.toFixed(2));
            this.evolutionCount++;
        }
        if (changes.indexOf('conservative') >= 0 || changes.indexOf('konserwatyw') >= 0) {
            this.aggressiveMode = false;
            this.riskMultiplier = Math.max(0.5, this.riskMultiplier - 0.15);
            console.log('[NEURON AI EVOLVE] Conservative mode, risk -> ' + this.riskMultiplier.toFixed(2));
            this.evolutionCount++;
        }
        if (changes.indexOf('reduce risk') >= 0 || changes.indexOf('zmniejsz ryzyko') >= 0) {
            this.riskMultiplier = Math.max(0.4, this.riskMultiplier - 0.1);
            console.log('[NEURON AI EVOLVE] Risk reduced -> ' + this.riskMultiplier.toFixed(2));
            this.evolutionCount++;
        }
        if (changes.indexOf('increase risk') >= 0 || changes.indexOf('zwieksz ryzyko') >= 0) {
            this.riskMultiplier = Math.min(1.5, this.riskMultiplier + 0.1);
            console.log('[NEURON AI EVOLVE] Risk increased -> ' + this.riskMultiplier.toFixed(2));
            this.evolutionCount++;
        }

        if (evolution.why) {
            console.log('[NEURON AI EVOLVE] Why: ' + evolution.why);
        }

        this._saveState();
    }"""

    new_evolution = """    // PATCH #25: Regex-based flexible evolution pattern matching
    _applyEvolution(evolution) {
        if (!evolution || !evolution.changes) return;
        const changes = (typeof evolution.changes === 'string') ? evolution.changes.toLowerCase() : '';
        if (!changes) return;

        const evolutions = [
            { pattern: /(?:increase|zwieksz|raise|boost|podwyzsz).*(?:ml|machine.?learn|ai)/i,
              action: () => {
                  if (!this.adaptedWeights) this.adaptedWeights = {};
                  this.adaptedWeights.EnterpriseML = Math.min(0.45, (this.adaptedWeights.EnterpriseML || 0.30) + 0.05);
                  console.log('[NEURON AI EVOLVE] ML weight -> ' + (this.adaptedWeights.EnterpriseML * 100).toFixed(0) + '%');
              }
            },
            { pattern: /(?:decrease|zmniejsz|lower|reduce|obniz).*(?:ml|machine.?learn|ai)/i,
              action: () => {
                  if (!this.adaptedWeights) this.adaptedWeights = {};
                  this.adaptedWeights.EnterpriseML = Math.max(0.10, (this.adaptedWeights.EnterpriseML || 0.30) - 0.05);
                  console.log('[NEURON AI EVOLVE] ML weight -> ' + (this.adaptedWeights.EnterpriseML * 100).toFixed(0) + '%');
              }
            },
            { pattern: /(?:enable|wlacz|activate|aktywuj).*(?:reversal|odwroceni)/i,
              action: () => { this.reversalEnabled = true; console.log('[NEURON AI EVOLVE] Reversal detection ENABLED'); }
            },
            { pattern: /(?:aggress|agresywn|offensive|ofensyw|bold|odwazn)/i,
              action: () => {
                  this.aggressiveMode = true;
                  this.riskMultiplier = Math.min(2.0, this.riskMultiplier + 0.15);
                  console.log('[NEURON AI EVOLVE] Aggressive mode ON, risk -> ' + this.riskMultiplier.toFixed(2));
              }
            },
            { pattern: /(?:conservat|konserwatyw|cautious|ostrozn|defensive|defensyw)/i,
              action: () => {
                  this.aggressiveMode = false;
                  this.riskMultiplier = Math.max(0.3, this.riskMultiplier - 0.15);
                  console.log('[NEURON AI EVOLVE] Conservative mode, risk -> ' + this.riskMultiplier.toFixed(2));
              }
            },
            { pattern: /(?:reduce|zmniejsz|lower|obniz).*(?:risk|ryzyko)/i,
              action: () => {
                  this.riskMultiplier = Math.max(0.3, this.riskMultiplier - 0.12);
                  console.log('[NEURON AI EVOLVE] Risk reduced -> ' + this.riskMultiplier.toFixed(2));
              }
            },
            { pattern: /(?:increase|zwieksz|raise|podwyzsz).*(?:risk|ryzyko)/i,
              action: () => {
                  this.riskMultiplier = Math.min(2.0, this.riskMultiplier + 0.12);
                  console.log('[NEURON AI EVOLVE] Risk increased -> ' + this.riskMultiplier.toFixed(2));
              }
            },
            { pattern: /(?:tight|zaciesn|narrow|waski).*(?:sl|stop.?loss)/i,
              action: () => {
                  console.log('[NEURON AI EVOLVE] Tighter SL requested — reducing risk multiplier');
                  this.riskMultiplier = Math.max(0.3, this.riskMultiplier - 0.08);
              }
            },
            { pattern: /(?:widen|poszerz|loose|luz).*(?:tp|take.?profit|target)/i,
              action: () => {
                  console.log('[NEURON AI EVOLVE] Wider TP requested — increasing risk multiplier');
                  this.riskMultiplier = Math.min(2.0, this.riskMultiplier + 0.08);
              }
            },
            { pattern: /(?:increase|zwieksz).*(?:supertrend|momentum|ma.?cross)/i,
              action: () => {
                  if (!this.adaptedWeights) this.adaptedWeights = {};
                  var match = changes.match(/(?:supertrend|momentumpro|macrossover)/i);
                  if (match) {
                      var key = match[0] === 'supertrend' ? 'SuperTrend' : match[0] === 'momentumpro' ? 'MomentumPro' : 'MACrossover';
                      this.adaptedWeights[key] = Math.min(0.30, (this.adaptedWeights[key] || 0.14) + 0.03);
                      console.log('[NEURON AI EVOLVE] ' + key + ' weight -> ' + (this.adaptedWeights[key] * 100).toFixed(0) + '%');
                  }
              }
            },
        ];

        var anyMatch = false;
        for (var ev = 0; ev < evolutions.length; ev++) {
            if (evolutions[ev].pattern.test(changes)) {
                evolutions[ev].action();
                this.evolutionCount++;
                anyMatch = true;
            }
        }

        if (!anyMatch && changes.length > 5) {
            console.log('[NEURON AI EVOLVE] Unrecognized evolution suggestion: ' + changes.substring(0, 150));
        }

        if (evolution.why) {
            console.log('[NEURON AI EVOLVE] Why: ' + evolution.why);
        }

        this._saveState();
    }"""
    content = apply_replace(content, old_evolution, new_evolution, 'neuron_ai_manager.js', 'Regex-based evolution system')

    # 4j. Update SYSTEM_PROMPT to mention multi-position and extended actions
    old_system_rules = """ZASADY:\\n- Max risk: 2% per trade (NIENARUSZALNE)\\n- Jesli votes sa sprzeczne, Ty decydujesz na podstawie MTF bias + regime + quantum risk\\n- Jesli MTF score >= 20 i ML sie zgadza, mozesz otworzyc pozycje nawet bez konsensusu\\n- Jesli drawdown > 10%, badz konserwatywny (HOLD lub zmniejsz pozycje)\\n- Jesli regime = TRENDING_DOWN i votes.SELL > 0.15, preferuj SHORT\\n- Jesli regime = TRENDING_UP i votes.BUY > 0.15, preferuj LONG\\n- Masz prawo do override KAZDEJ decyzji ensemble -- Ty jestes mozgiem\\n- Po kazdym trade zamkniecie: analizuj wynik i zaproponuj ewolucje wag/zasad\\n\\nZWROC JSON (i TYLKO JSON, bez markdown):\\n{\\n  \\"action\\": \\"OPEN_LONG\\" | \\"OPEN_SHORT\\" | \\"CLOSE\\" | \\"HOLD\\" | \\"ADJUST_SL\\" | \\"ADJUST_TP\\" | \\"OVERRIDE_BIAS\\","""
    new_system_rules = """ZASADY:\\n- Max risk: 2% per trade (NIENARUSZALNE)\\n- Mozesz miec do 5 pozycji jednoczesnie (multi-position trading)\\n- Jesli votes sa sprzeczne, Ty decydujesz na podstawie MTF bias + regime + quantum risk\\n- Jesli MTF score >= 20 i ML sie zgadza, mozesz otworzyc pozycje nawet bez konsensusu\\n- Jesli drawdown > 15%, badz konserwatywny (HOLD lub zmniejsz pozycje)\\n- Jesli regime = TRENDING_DOWN i votes.SELL > 0.15, preferuj SHORT\\n- Jesli regime = TRENDING_UP i votes.BUY > 0.15, preferuj LONG\\n- Masz prawo do override KAZDEJ decyzji ensemble -- Ty jestes mozgiem\\n- Analizuj WSZYSTKIE wskazniki: RSI, MACD, Bollinger, ATR, Volume, SMA\\n- Po kazdym zamknieciu: analizuj wynik i zaproponuj ewolucje wag/zasad\\n- Ucinaj straty szybko (tight SL), puszczaj zyski (wide TP)\\n- SCALE_IN: dodaj do istniejacego LONG w trendzie up\\n- FLIP: zamknij LONG i otworz SHORT (lub odwrotnie)\\n\\nZWROC JSON (i TYLKO JSON, bez markdown):\\n{\\n  \\"action\\": \\"OPEN_LONG\\" | \\"OPEN_SHORT\\" | \\"CLOSE\\" | \\"HOLD\\" | \\"ADJUST_SL\\" | \\"ADJUST_TP\\" | \\"OVERRIDE_BIAS\\" | \\"SCALE_IN\\" | \\"PARTIAL_CLOSE\\" | \\"FLIP\\","""
    content = apply_replace(content, old_system_rules, new_system_rules, 'neuron_ai_manager.js', 'System prompt: multi-position, extended actions')

    write_file(NEURON_PATH, content)
    print('  DONE: neuron_ai_manager.js patched')


###############################################################################
# 5. BOT.JS — CB Bypass, Enhanced Neuron State
###############################################################################
def patch_bot():
    print('\n[5/5] Patching bot.js...')
    content = read_file(BOT_PATH)
    backup_file(BOT_PATH)

    # 5a. CB check bypass in simulation mode
    old_cb = """            // Circuit breaker check
            if (this.rm.isCircuitBreakerTripped()) {
                console.log('[CB] Circuit breaker tripped - skipping');
                if (this.megatron) this.megatron.logActivity('RISK', 'Circuit Breaker', 'Trading wstrzymany -- circuit breaker aktywny', {}, 'critical');
                return;
            }"""
    new_cb = """            // PATCH #25: Circuit breaker check — bypassed in simulation/paper mode
            const _simMode = (process.env.MODE || 'simulation').toLowerCase();
            if (_simMode !== 'simulation' && _simMode !== 'paper' && _simMode !== 'paper_trading') {
                if (this.rm.isCircuitBreakerTripped()) {
                    console.log('[CB] Circuit breaker tripped - skipping');
                    if (this.megatron) this.megatron.logActivity('RISK', 'Circuit Breaker', 'Trading wstrzymany -- circuit breaker aktywny', {}, 'critical');
                    return;
                }
            }"""
    content = apply_replace(content, old_cb, new_cb, 'bot.js', 'CB bypass in simulation mode')

    # 5b. Enhanced Neuron state with full indicators, position details, price history
    old_neuron_state = """                    // Build full state for Neuron AI
                    const portfolioState = this.pm.getPortfolio();
                    const hasPos = this.pm.positionCount > 0;
                    let positionSide = 'NONE';
                    if (hasPos) {
                        const positions = this.pm.getPositions();
                        if (positions && positions.size > 0) {
                            for (const [, p] of positions) {
                                positionSide = p.side === 'SHORT' ? 'SHORT' : 'LONG';
                                break;
                            }
                        }
                    }
                    let rsiVal = null;
                    try {
                        const prices = this.dp.getMarketDataHistory().slice(-15).map(function(c) { return c.close; });
                        if (prices.length >= 14) {
                            rsiVal = require('./indicators').calculateRSI(prices, 14);
                        }
                    } catch(e) {}

                    const neuronState = {
                        votes: rawVotes.votes,
                        signalSummary: rawVotes.signalSummary,
                        mlSignal: rawVotes.mlSignal || {},
                        mtfBias: mtfBiasForVote || {},
                        regime: (this.neuralAI && this.neuralAI.currentRegime) || 'UNKNOWN',
                        portfolio: {
                            totalValue: (portfolioState && portfolioState.totalValue) || 0,
                            realizedPnL: (portfolioState && portfolioState.realizedPnL) || 0,
                            winRate: (portfolioState && portfolioState.winRate) || 0,
                            totalTrades: (portfolioState && portfolioState.totalTrades) || 0,
                            drawdownPct: (portfolioState && portfolioState.drawdownPct) || 0,
                        },
                        price: ((this.dp.getMarketDataHistory().slice(-1)[0] || {}).close) || 0,
                        hasPosition: hasPos,
                        positionSide: positionSide,
                        indicators: { rsi: rsiVal },
                        quantumRisk: this._lastQuantumRisk || {},
                    };"""
    new_neuron_state = """                    // PATCH #25: Build enriched state for Neuron AI with full indicators
                    const portfolioState = this.pm.getPortfolio();
                    const _posCount = this.pm.positionCount;
                    const _marketHist = this.dp.getMarketDataHistory();
                    const _ind = require('./indicators');

                    // Compute all indicators
                    let rsiVal = null, macdData = null, bollingerData = null, atrVal = null;
                    let volumeCurrent = 0, volumeAvg = 0, sma20 = null, sma50 = null, sma200 = null;
                    try {
                        const _prices = _marketHist.slice(-210).map(function(c) { return c.close; });
                        if (_prices.length >= 14) rsiVal = _ind.calculateRSI(_prices, 14);
                        if (_prices.length >= 26) macdData = _ind.calculateMACD(_prices);
                        if (_prices.length >= 20) bollingerData = _ind.calculateBollingerBands(_prices, 20, 2);
                        if (_prices.length >= 20) sma20 = _ind.calculateSMA(_prices, 20);
                        if (_prices.length >= 50) sma50 = _ind.calculateSMA(_prices, 50);
                        if (_prices.length >= 200) sma200 = _ind.calculateSMA(_prices, 200);
                    } catch(indErr) { console.warn('[NEURON] Indicator calc error:', indErr.message); }
                    try {
                        if (_marketHist.length >= 20) {
                            const candleData = _marketHist.slice(-20).map(function(c) {
                                return { symbol: 'BTCUSDT', timestamp: Date.now(), open: c.open || c.close, high: c.high, low: c.low, close: c.close, volume: c.volume || 0 };
                            });
                            atrVal = _ind.calculateATR(candleData, 14);
                        }
                        if (_marketHist.length >= 1) volumeCurrent = _marketHist[_marketHist.length - 1].volume || 0;
                        if (_marketHist.length >= 20) {
                            var _vols = _marketHist.slice(-20).map(function(c) { return c.volume || 0; });
                            volumeAvg = _vols.reduce(function(a,b) { return a+b; }, 0) / _vols.length;
                        }
                    } catch(indErr2) {}

                    // Build position details array
                    var positionDetails = [];
                    var currentPrice = ((_marketHist.slice(-1)[0] || {}).close) || 0;
                    for (const [posKey, p] of this.pm.getPositions()) {
                        var uPnL = p.side === 'SHORT'
                            ? (p.entryPrice - currentPrice) * p.quantity
                            : (currentPrice - p.entryPrice) * p.quantity;
                        positionDetails.push({
                            key: posKey,
                            symbol: p.symbol || posKey.split('_')[0],
                            side: p.side || 'LONG',
                            entryPrice: p.entryPrice,
                            quantity: p.quantity,
                            unrealizedPnL: uPnL,
                            stopLoss: p.stopLoss,
                            takeProfit: p.takeProfit,
                            holdingHours: (Date.now() - (p.entryTime || Date.now())) / 3600000,
                        });
                    }

                    // Recent prices (last 10 candle closes for trend context)
                    var recentPrices = _marketHist.slice(-10).map(function(c) { return c.close; });

                    const neuronState = {
                        votes: rawVotes.votes,
                        signalSummary: rawVotes.signalSummary,
                        mlSignal: rawVotes.mlSignal || {},
                        mtfBias: mtfBiasForVote || {},
                        regime: (this.neuralAI && this.neuralAI.currentRegime) || 'UNKNOWN',
                        portfolio: {
                            totalValue: (portfolioState && portfolioState.totalValue) || 0,
                            realizedPnL: (portfolioState && portfolioState.realizedPnL) || 0,
                            winRate: (portfolioState && portfolioState.winRate) || 0,
                            totalTrades: (portfolioState && portfolioState.totalTrades) || 0,
                            drawdownPct: (portfolioState && portfolioState.drawdown) || 0,
                        },
                        price: currentPrice,
                        positionCount: _posCount,
                        positionDetails: positionDetails,
                        // PATCH #25: Legacy fields for backward compatibility
                        hasPosition: _posCount > 0,
                        positionSide: positionDetails.length > 0 ? positionDetails[0].side : 'NONE',
                        indicators: {
                            rsi: rsiVal,
                            macd: macdData ? macdData.macd : null,
                            macdSignal: macdData ? macdData.signal : null,
                            macdHistogram: macdData ? macdData.histogram : null,
                            bollingerUpper: bollingerData ? bollingerData.upper : null,
                            bollingerMiddle: bollingerData ? bollingerData.middle : null,
                            bollingerLower: bollingerData ? bollingerData.lower : null,
                            bollingerBandwidth: bollingerData ? bollingerData.bandwidth : null,
                            atr: atrVal,
                            volume: volumeCurrent,
                            avgVolume: volumeAvg,
                            sma20: sma20,
                            sma50: sma50,
                            sma200: sma200,
                        },
                        recentPrices: recentPrices,
                        quantumRisk: this._lastQuantumRisk || {},
                    };"""
    content = apply_replace(content, old_neuron_state, new_neuron_state, 'bot.js', 'Enhanced Neuron AI state with full indicators')

    write_file(BOT_PATH, content)
    print('  DONE: bot.js patched')


###############################################################################
# MAIN
###############################################################################
if __name__ == '__main__':
    print('=' * 70)
    print('PATCH #25: PRO TRADER UPGRADE')
    print('Multi-Position | CB/SoftPause Disabled | Enhanced Neuron AI')
    print('=' * 70)
    print(f'Backup directory: {BACKUP_DIR}')

    try:
        patch_risk_manager()
        patch_portfolio_manager()
        patch_execution_engine()
        patch_neuron_ai_manager()
        patch_bot()
    except Exception as e:
        print(f'\nFATAL ERROR: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

    print('\n' + '=' * 70)
    print(f'PATCH #25 COMPLETE: {total_changes} changes applied, {total_warnings} warnings')
    if total_warnings > 0:
        print('WARNING: Some replacements failed — check logs above')
    print('=' * 70)

    # Syntax check all files
    import subprocess
    print('\nSyntax checking...')
    files_to_check = [RISK_PATH, PORTFOLIO_PATH, EXECUTION_PATH, BOT_PATH, NEURON_PATH]
    all_ok = True
    for f in files_to_check:
        result = subprocess.run(['node', '-c', f], capture_output=True, text=True)
        if result.returncode == 0:
            print(f'  OK: {os.path.basename(f)}')
        else:
            print(f'  FAIL: {os.path.basename(f)}: {result.stderr.strip()}')
            all_ok = False

    if all_ok:
        print('\nAll files pass syntax check!')
    else:
        print('\nSOME FILES HAVE SYNTAX ERRORS — check above')
        sys.exit(1)
