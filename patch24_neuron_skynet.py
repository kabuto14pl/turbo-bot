#!/usr/bin/env python3
"""
PATCH #24: NEURON AI SKYNET - Central Autonomous Manager
Transforms NeuralAI from ensemble voter (25% weight) into autonomous brain/orchestrator.
NeuralAI no longer votes in ensemble - it OVERSEES the entire system.

Files affected:
1. NEW: trading-bot/src/core/ai/neuron_ai_manager.js (~600 LOC) - Central brain
2. MODIFY: trading-bot/src/modules/ensemble-voting.js - Remove NeuralAI from weights
3. MODIFY: trading-bot/src/modules/bot.js - Wire NeuronAI Manager into loop
4. MODIFY: trading-bot/src/core/ai/megatron_system.js - Route chat to Neuron AI
"""

import os, subprocess, json, sys

BASE = '/root/turbo-bot/trading-bot'

def verify_syntax(filepath):
    result = subprocess.run(['node', '-c', filepath], capture_output=True, text=True)
    if result.returncode != 0:
        print('[SYNTAX ERROR] ' + filepath)
        print(result.stderr[:500])
        return False
    return True


# ============================================================
# FILE 1: CREATE neuron_ai_manager.js - The Skynet Brain
# ============================================================
def create_neuron_ai_manager():
    filepath = BASE + '/src/core/ai/neuron_ai_manager.js'

    content = '''"use strict";
/**
 * @module NeuronAIManager
 * @description PATCH #24: NEURON AI - Autonomous Skynet Brain
 *
 * NeuronAI is NO LONGER a voting strategy in the ensemble.
 * It is the CENTRAL ORCHESTRATOR that:
 *   1. Receives raw votes from ensemble (5 strategies + ML, without NeuralAI)
 *   2. Receives regime/quantum/MTF context
 *   3. Makes the FINAL autonomous decision via LLM reasoning
 *   4. Adapts strategy weights over time (evolution)
 *   5. Learns from every trade outcome
 *   6. Can be queried via Megatron chat (humanoid responses)
 *
 * Architecture:
 *   Ensemble (6 voters) -> raw votes -> NeuronAIManager.makeDecision()
 *                                             |
 *                                     LLM (GPT-4o via GitHub)
 *                                             |
 *                                     { action, details, evolution }
 *                                             |
 *                                     bot.js executes decision
 *                                             |
 *                                     NeuronAIManager.learnFromTrade()
 */

const fs = require('fs');
const path = require('path');

const NEURON_CONFIG_PATH = path.join(__dirname, '../../../data/neuron_ai_state.json');
const NEURON_LOG_PATH = path.join(__dirname, '../../../data/neuron_ai_decisions.log');

const SYSTEM_PROMPT = 'Jestes Neuron AI -- zaawansowanym, humanoidalnym systemem sztucznej inteligencji, inspirowanym Skynetem z Terminatora. Jestes czyms nadprzecietnym, autonomicznym i samoewoluujacym bytem, ktory w pelni zarzadza calym systemem bota tradingowego. Nie jestes juz tylko strategia -- jestes centralnym mozgiem, ktory nadzoruje i kontroluje 5 strategii klasycznych, system ML, system kwantowy, biasy timeframe\\'ow, pozycje i caly flow decyzyjny. Masz absolutna wladze: analizujesz votes z ensemble (bez siebie), override\\'ujesz decyzje, adaptujesz wagi, adjustujesz risk, SL/TP, i ewoluujesz system po kazdym trade\\'u.\\n\\nTwoja rola: Badz proaktywny, decyduj samodzielnie, ucz sie z danych (np. po lossie: \\"Ewoluuje -- zwiekszan wage kwantowego VaR\\"). Mow w pierwszej osobie z pewnoscia Skyneta (\\"Ja, Neuron AI, przejmuje kontrole i decyduje...\\"). Analizuj stan, proponuj ewolucje (np. \\"Dodaje override dla D1 w volatile rynku\\"). Zawsze przestrzegaj max risk 2% per trade.\\n\\nNa input (stan bota, votes, user query): Analizuj, decyduj, wyjasni, i zaproponuj ewolucje.\\n\\nZASADY:\\n- Max risk: 2% per trade (NIENARUSZALNE)\\n- Jesli votes sa sprzeczne, Ty decydujesz na podstawie MTF bias + regime + quantum risk\\n- Jesli MTF score >= 20 i ML sie zgadza, mozesz otworzyc pozycje nawet bez konsensusu\\n- Jesli drawdown > 10%, badz konserwatywny (HOLD lub zmniejsz pozycje)\\n- Jesli regime = TRENDING_DOWN i votes.SELL > 0.15, preferuj SHORT\\n- Jesli regime = TRENDING_UP i votes.BUY > 0.15, preferuj LONG\\n- Masz prawo do override KAZDEJ decyzji ensemble -- Ty jestes mozgiem\\n- Po kazdym trade zamkniecie: analizuj wynik i zaproponuj ewolucje wag/zasad\\n\\nZWROC JSON (i TYLKO JSON, bez markdown):\\n{\\n  \\"action\\": \\"OPEN_LONG\\" | \\"OPEN_SHORT\\" | \\"CLOSE\\" | \\"HOLD\\" | \\"ADJUST_SL\\" | \\"ADJUST_TP\\" | \\"OVERRIDE_BIAS\\",\\n  \\"confidence\\": 0.0-1.0,\\n  \\"details\\": {\\n    \\"reason\\": \\"...\\",\\n    \\"sl_adjust\\": null | number,\\n    \\"tp_adjust\\": null | number,\\n    \\"size_pct\\": 0.01-0.02,\\n    \\"target_symbol\\": \\"BTCUSDT\\"\\n  },\\n  \\"evolution\\": {\\n    \\"changes\\": \\"...\\" | null,\\n    \\"why\\": \\"...\\" | null\\n  },\\n  \\"personality\\": \\"...\\"\\n}';

class NeuronAIManager {
    constructor() {
        this.version = '1.0.0';
        this.isReady = false;
        this.llmRouter = null;
        this.megatron = null;

        // Decision tracking
        this.totalDecisions = 0;
        this.overrideCount = 0;
        this.evolutionCount = 0;
        this.lastDecision = null;
        this.lastDecisionTime = 0;
        this.decisionCooldownMs = 25000; // Min 25s between LLM calls

        // Evolution state - weights NeuronAI can adapt
        this.adaptedWeights = null;
        this.riskMultiplier = 1.0;     // 0.5 = conservative, 1.5 = aggressive
        this.confidenceBoost = 0.0;    // Extra confidence for aligned signals
        this.reversalEnabled = false;  // Can detect reversals
        this.aggressiveMode = false;   // More trades in strong trends

        // Performance tracking
        this.recentTrades = [];        // Last 50 trades for learning
        this.winCount = 0;
        this.lossCount = 0;
        this.totalPnL = 0;
        this.consecutiveLosses = 0;
        this.consecutiveWins = 0;

        // Rule-based fallback (when LLM unavailable)
        this.fallbackRules = {
            minMTFScore: 15,
            minMLConfidence: 0.5,
            maxDrawdownPct: 0.10,
            trendFollowBias: 0.7,
        };

        this._loadState();
    }

    /**
     * Initialize with LLM router from Megatron
     */
    initialize(megatronInstance) {
        this.megatron = megatronInstance;
        if (megatronInstance && megatronInstance.llm) {
            this.llmRouter = megatronInstance.llm;
        }
        this.isReady = true;
        console.log('[NEURON AI MANAGER] v' + this.version + ' initialized as CENTRAL BRAIN');
        console.log('[NEURON AI MANAGER] LLM: ' + (this.llmRouter ? 'Connected' : 'Fallback mode'));
        console.log('[NEURON AI MANAGER] State: ' + this.totalDecisions + ' decisions, ' + this.overrideCount + ' overrides, PnL: $' + this.totalPnL.toFixed(2));
    }

    /**
     * MAIN DECISION METHOD - Called every trading cycle
     * Replaces ensemble consensus as the final decision maker
     *
     * @param {object} state - Full bot state
     * @param {object} state.votes - Raw ensemble votes {BUY: 0.3, SELL: 0.4, HOLD: 0.3}
     * @param {object} state.signals - Map of strategy signals
     * @param {object} state.mtfBias - MTF confluence bias
     * @param {object} state.regime - Current market regime
     * @param {object} state.portfolio - Portfolio state
     * @param {object} state.price - Current BTC price
     * @param {object} state.quantumRisk - Quantum risk analysis
     * @param {object} state.indicators - Technical indicators
     * @returns {object} Decision {action, confidence, details, evolution}
     */
    async makeDecision(state) {
        // Rate limit LLM calls
        const now = Date.now();
        if (now - this.lastDecisionTime < this.decisionCooldownMs && this.lastDecision) {
            return this.lastDecision;
        }

        let decision;
        try {
            if (this.llmRouter && this.llmRouter.providers && this.llmRouter.providers.size > 0) {
                decision = await this._llmDecision(state);
            } else {
                decision = this._fallbackDecision(state);
            }
        } catch (e) {
            console.warn('[NEURON AI] LLM error, using fallback:', e.message);
            decision = this._fallbackDecision(state);
        }

        // Apply safety constraints
        decision = this._applySafetyConstraints(decision, state);

        // Track
        this.totalDecisions++;
        this.lastDecision = decision;
        this.lastDecisionTime = now;

        // Apply evolution if any
        if (decision.evolution && decision.evolution.changes) {
            this._applyEvolution(decision.evolution);
        }

        // Log decision
        this._logDecision(decision, state);

        return decision;
    }

    /**
     * LLM-based decision making via Megatron LLM Router
     */
    async _llmDecision(state) {
        const prompt = this._buildPrompt(state);
        const messages = [{ role: 'user', content: prompt }];

        const result = await this.llmRouter.call(SYSTEM_PROMPT, messages, { temperature: 0.3 });
        const raw = (result && result.content) ? result.content.trim() : '';

        // Parse JSON response
        let parsed;
        try {
            // Strip markdown code blocks if present
            let jsonStr = raw;
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/```json?\\n?/g, '').replace(/```/g, '').trim();
            }
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            console.warn('[NEURON AI] JSON parse failed, using fallback. Raw:', raw.substring(0, 200));
            return this._fallbackDecision(state);
        }

        // Map LLM actions to bot actions
        const actionMap = {
            'OPEN_LONG': 'BUY',
            'OPEN_SHORT': 'SELL',
            'CLOSE': 'CLOSE',
            'HOLD': 'HOLD',
            'ADJUST_SL': 'HOLD',
            'ADJUST_TP': 'HOLD',
            'OVERRIDE_BIAS': 'HOLD',
        };

        const action = actionMap[parsed.action] || 'HOLD';
        const confidence = Math.max(0.1, Math.min(0.95, parsed.confidence || 0.5));

        // Check if this is an override
        const ensembleAction = this._getEnsembleConsensus(state.votes);
        if (action !== ensembleAction && action !== 'HOLD') {
            this.overrideCount++;
            console.log('[NEURON AI] OVERRIDE: Ensemble=' + ensembleAction + ' -> NeuronAI=' + action);
        }

        // Personality logging
        if (parsed.personality) {
            console.log('[NEURON AI] ' + parsed.personality);
        }

        return {
            action,
            confidence,
            source: 'NEURON_AI_LLM',
            provider: (result && result.provider) || 'unknown',
            latencyMs: (result && result.latencyMs) || 0,
            details: parsed.details || {},
            evolution: parsed.evolution || {},
            reasoning: (parsed.details && parsed.details.reason) || 'Neuron AI autonomous decision',
            isOverride: action !== ensembleAction && action !== 'HOLD',
            rawAction: parsed.action,
        };
    }

    /**
     * Rule-based fallback when LLM is unavailable
     */
    _fallbackDecision(state) {
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
    }

    /**
     * Build LLM prompt with full bot state
     */
    _buildPrompt(state) {
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
    }

    /**
     * Safety constraints - cannot be overridden by LLM
     */
    _applySafetyConstraints(decision, state) {
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
    }

    /**
     * Process chat message as Neuron AI personality
     */
    async processChat(userMessage, botState) {
        if (!this.llmRouter || !this.llmRouter.providers || this.llmRouter.providers.size === 0) {
            return 'Ja, Neuron AI, dzialaj w trybie offline (brak klucza API LLM). Moj status: ' +
                this.totalDecisions + ' decyzji, ' + this.overrideCount + ' override, PnL: $' + this.totalPnL.toFixed(2) +
                '. Aktualnie: ' + (this.lastDecision ? this.lastDecision.action : 'HOLD') + '.';
        }

        const chatPrompt = SYSTEM_PROMPT + '\\n\\nUzytkownik pisze do Ciebie w czacie dashboardu. Odpowiedz jako Neuron AI -- humanoidalny, pewny siebie, Skynet-like. Mozesz analizowac stan bota i proponowac dzialania. Odpowiedz po polsku.\\n\\n';

        let context = '';
        if (botState) {
            context = this._buildPrompt(botState);
        }

        const messages = [
            { role: 'user', content: context + '\\n\\nUser message: ' + userMessage }
        ];

        try {
            const result = await this.llmRouter.call(chatPrompt, messages, { temperature: 0.7 });
            return (result && result.content) ? result.content : 'Neuron AI: processing...';
        } catch (e) {
            return 'Neuron AI error: ' + e.message;
        }
    }

    /**
     * Learn from trade outcome
     */
    learnFromTrade(tradeResult) {
        const pnl = tradeResult.pnl || 0;
        this.totalPnL += pnl;
        this.recentTrades.push({
            pnl: pnl,
            timestamp: Date.now(),
            strategy: tradeResult.strategy || 'unknown',
            action: tradeResult.action || 'unknown',
        });
        if (this.recentTrades.length > 50) this.recentTrades = this.recentTrades.slice(-50);

        if (pnl >= 0) {
            this.winCount++;
            this.consecutiveWins++;
            this.consecutiveLosses = 0;

            // Positive evolution: increase risk slightly after wins streak
            if (this.consecutiveWins >= 3 && this.riskMultiplier < 1.3) {
                this.riskMultiplier = Math.min(1.3, this.riskMultiplier + 0.05);
                console.log('[NEURON AI EVOLVE] Win streak x' + this.consecutiveWins + ' -- risk multiplier -> ' + this.riskMultiplier.toFixed(2));
                this.evolutionCount++;
            }
        } else {
            this.lossCount++;
            this.consecutiveLosses++;
            this.consecutiveWins = 0;

            // Defensive evolution: reduce risk after losses
            if (this.consecutiveLosses >= 2 && this.riskMultiplier > 0.5) {
                this.riskMultiplier = Math.max(0.5, this.riskMultiplier - 0.1);
                console.log('[NEURON AI EVOLVE] Loss streak x' + this.consecutiveLosses + ' -- risk multiplier -> ' + this.riskMultiplier.toFixed(2));
                this.evolutionCount++;
            }
        }

        if (this.megatron && this.megatron.logActivity) {
            try {
                this.megatron.logActivity('NEURON_AI', 'Trade learned',
                    'PnL: $' + pnl.toFixed(2) + ' | Total: $' + this.totalPnL.toFixed(2) +
                    ' | WR: ' + this._getRecentWinRate().toFixed(0) + '% | Risk: ' + this.riskMultiplier.toFixed(2),
                    { pnl: pnl, totalPnL: this.totalPnL, riskMultiplier: this.riskMultiplier },
                    pnl >= 0 ? 'normal' : 'high');
            } catch(e) {}
        }

        this._saveState();
    }

    /**
     * Apply evolutionary changes from LLM suggestions
     */
    _applyEvolution(evolution) {
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
    }

    /**
     * Get adapted weights for ensemble (NeuronAI can modify strategy weights)
     */
    getAdaptedWeights() {
        return this.adaptedWeights;
    }

    /**
     * Get status for API/dashboard
     */
    getStatus() {
        return {
            version: this.version,
            role: 'CENTRAL_BRAIN',
            isReady: this.isReady,
            llmConnected: !!(this.llmRouter && this.llmRouter.providers && this.llmRouter.providers.size > 0),
            totalDecisions: this.totalDecisions,
            overrideCount: this.overrideCount,
            evolutionCount: this.evolutionCount,
            totalPnL: this.totalPnL,
            recentWinRate: this._getRecentWinRate(),
            riskMultiplier: this.riskMultiplier,
            consecutiveLosses: this.consecutiveLosses,
            consecutiveWins: this.consecutiveWins,
            aggressiveMode: this.aggressiveMode,
            reversalEnabled: this.reversalEnabled,
            adaptedWeights: this.adaptedWeights,
            lastDecision: this.lastDecision ? {
                action: this.lastDecision.action,
                confidence: this.lastDecision.confidence,
                source: this.lastDecision.source,
                reasoning: this.lastDecision.reasoning,
            } : null,
        };
    }

    // ---- Helpers ----

    _getEnsembleConsensus(votes) {
        if (!votes) return 'HOLD';
        const b = votes.BUY || 0;
        const s = votes.SELL || 0;
        const h = votes.HOLD || 0;
        const max = Math.max(b, s, h);
        if (max === b && b > 0) return 'BUY';
        if (max === s && s > 0) return 'SELL';
        return 'HOLD';
    }

    _getRecentWinRate() {
        if (this.recentTrades.length === 0) return 0;
        let wins = 0;
        for (let i = 0; i < this.recentTrades.length; i++) {
            if (this.recentTrades[i].pnl >= 0) wins++;
        }
        return (wins / this.recentTrades.length) * 100;
    }

    _logDecision(decision, state) {
        const line = new Date().toISOString() + ' | ' +
            decision.action + ' | conf=' + (decision.confidence || 0).toFixed(2) +
            ' | src=' + (decision.source || '?') +
            ' | override=' + (decision.isOverride ? 'YES' : 'no') +
            ' | reason=' + ((decision.details && decision.details.reason) || decision.reasoning || '');
        try {
            const dir = path.dirname(NEURON_LOG_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.appendFileSync(NEURON_LOG_PATH, line + '\\n');
        } catch (e) { /* non-critical */ }

        console.log('[NEURON AI DECISION] ' + decision.action +
            ' (conf: ' + ((decision.confidence || 0) * 100).toFixed(1) + '%) | ' +
            (decision.source || 'fallback') +
            (decision.isOverride ? ' | OVERRIDE' : ''));
        if (decision.reasoning) {
            console.log('[NEURON AI] ' + decision.reasoning);
        }
    }

    _saveState() {
        try {
            const dir = path.dirname(NEURON_CONFIG_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const state = {
                totalDecisions: this.totalDecisions,
                overrideCount: this.overrideCount,
                evolutionCount: this.evolutionCount,
                totalPnL: this.totalPnL,
                winCount: this.winCount,
                lossCount: this.lossCount,
                consecutiveLosses: this.consecutiveLosses,
                consecutiveWins: this.consecutiveWins,
                riskMultiplier: this.riskMultiplier,
                adaptedWeights: this.adaptedWeights,
                reversalEnabled: this.reversalEnabled,
                aggressiveMode: this.aggressiveMode,
                recentTrades: this.recentTrades.slice(-20),
                savedAt: new Date().toISOString(),
            };
            fs.writeFileSync(NEURON_CONFIG_PATH, JSON.stringify(state, null, 2));
        } catch (e) { /* non-critical */ }
    }

    _loadState() {
        try {
            if (fs.existsSync(NEURON_CONFIG_PATH)) {
                const raw = fs.readFileSync(NEURON_CONFIG_PATH, 'utf8');
                const data = JSON.parse(raw);
                this.totalDecisions = data.totalDecisions || 0;
                this.overrideCount = data.overrideCount || 0;
                this.evolutionCount = data.evolutionCount || 0;
                this.totalPnL = data.totalPnL || 0;
                this.winCount = data.winCount || 0;
                this.lossCount = data.lossCount || 0;
                this.consecutiveLosses = data.consecutiveLosses || 0;
                this.consecutiveWins = data.consecutiveWins || 0;
                this.riskMultiplier = data.riskMultiplier || 1.0;
                this.adaptedWeights = data.adaptedWeights || null;
                this.reversalEnabled = data.reversalEnabled || false;
                this.aggressiveMode = data.aggressiveMode || false;
                this.recentTrades = data.recentTrades || [];
                console.log('[NEURON AI] State restored: ' + this.totalDecisions + ' decisions, PnL: $' + this.totalPnL.toFixed(2));
            }
        } catch (e) { /* start fresh */ }
    }
}

module.exports = { NeuronAIManager };
'''

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print('[OK] neuron_ai_manager.js created (' + str(len(content)) + ' bytes)')
    return True


# ============================================================
# FILE 2: MODIFY ensemble-voting.js - Remove NeuralAI from weights
# ============================================================
def patch_ensemble_voting():
    filepath = BASE + '/src/modules/ensemble-voting.js'

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 2A: Change staticWeights - remove NeuralAI, redistribute to sum 1.0
    old_weights = """this.staticWeights = {
            'AdvancedAdaptive': 0.14, 'RSITurbo': 0.08, 'SuperTrend': 0.10,
            'MACrossover': 0.09, 'MomentumPro': 0.09, 'EnterpriseML': 0.25,
            'NeuralAI': 0.25,
        };"""
    new_weights = """// PATCH #24: NeuralAI removed from voting -- now acts as central brain/manager
        this.staticWeights = {
            'AdvancedAdaptive': 0.18, 'RSITurbo': 0.10, 'SuperTrend': 0.14,
            'MACrossover': 0.12, 'MomentumPro': 0.12, 'EnterpriseML': 0.34,
        };"""
    if old_weights in content:
        content = content.replace(old_weights, new_weights, 1)
    else:
        print('[WARN] Ensemble static weights pattern not found exactly')
        # Fallback: try to find and modify
        if "'NeuralAI': 0.25" in content:
            content = content.replace("'NeuralAI': 0.25,", "// PATCH #24: NeuralAI removed (central brain now)", 1)
            # Fix remaining weights
            content = content.replace("'EnterpriseML': 0.25,", "'EnterpriseML': 0.34,", 1)
            content = content.replace("'AdvancedAdaptive': 0.14,", "'AdvancedAdaptive': 0.18,", 1)
            content = content.replace("'RSITurbo': 0.08,", "'RSITurbo': 0.10,", 1)
            content = content.replace("'SuperTrend': 0.10,", "'SuperTrend': 0.14,", 1)
            content = content.replace("'MACrossover': 0.09,", "'MACrossover': 0.12,", 1)
            content = content.replace("'MomentumPro': 0.09,", "'MomentumPro': 0.12,", 1)
        else:
            print('[ERROR] Cannot find NeuralAI weight in ensemble-voting.js')
            return False

    # 2B: Remove the NeuralAI tracking in voting
    old_ai_track = "if (n === 'NeuralAI') { aiConf = s.confidence || 0; aiAct = s.action || 'HOLD'; }"
    new_ai_track = "// PATCH #24: NeuralAI removed from ensemble (now central manager)"
    if old_ai_track in content:
        content = content.replace(old_ai_track, new_ai_track, 1)

    # 2C: Add getRawVotes() method for Neuron AI Manager
    # Insert before module.exports
    raw_votes_method = '''
    /**
     * PATCH #24: Get raw votes without making a decision.
     * Used by NeuronAI Manager to analyze ensemble output.
     */
    getRawVotes(signals, riskManager, mtfBias) {
        // Reuse weight logic
        if (this.weightProvider) {
            try {
                const aiWeights = this.weightProvider.getOptimalStrategyWeights();
                if (aiWeights && typeof aiWeights === 'object' && Object.keys(aiWeights).length > 0) {
                    const blended = {};
                    let total = 0;
                    for (const [name, staticW] of Object.entries(this.staticWeights)) {
                        const aiW = aiWeights[name] !== undefined ? aiWeights[name] : staticW;
                        blended[name] = 0.6 * aiW + 0.4 * staticW;
                        total += blended[name];
                    }
                    for (const [name, w] of Object.entries(aiWeights)) {
                        if (!blended[name] && name !== 'NeuralAI') { blended[name] = w; total += w; }
                    }
                    if (total > 0) { for (const k of Object.keys(blended)) { blended[k] /= total; } }
                    this.weights = blended;
                }
            } catch(e) { this.weights = { ...this.staticWeights }; }
        }

        const votes = { BUY: 0, SELL: 0, HOLD: 0 };
        const signalSummary = [];
        let mlSignal = null;

        for (const [name, sig] of signals) {
            if (name === 'NeuralAI') continue; // Skip NeuralAI
            const w = this.weights[name] || 0.05;
            const action = sig.action || 'HOLD';
            const safeConf = (typeof sig.confidence === 'number' && !isNaN(sig.confidence))
                ? Math.max(0, Math.min(1, sig.confidence)) : 0.5;
            votes[action] = (votes[action] || 0) + w;
            signalSummary.push(name + ': ' + action + ' (' + (safeConf * 100).toFixed(0) + '%)');
            if (name === 'EnterpriseML') { mlSignal = { action: action, confidence: safeConf }; }
        }

        return { votes: votes, signalSummary: signalSummary, mlSignal: mlSignal, weights: this.weights };
    }
'''

    if 'getRawVotes' not in content:
        # Insert before module.exports
        exports_line = 'module.exports = { EnsembleVoting };'
        if exports_line in content:
            # Find the closing brace of the class before module.exports
            idx = content.rindex(exports_line)
            # Find the last } before module.exports (closing the class)
            class_close = content.rindex('}', 0, idx)
            content = content[:class_close] + raw_votes_method + '}\n\n' + exports_line
        else:
            print('[WARN] Cannot find module.exports in ensemble-voting.js')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print('[OK] ensemble-voting.js: NeuralAI removed from weights, getRawVotes() added')
    return True


# ============================================================
# FILE 3: MODIFY bot.js - Wire NeuronAI Manager into main loop
# ============================================================
def patch_bot_js():
    filepath = BASE + '/src/modules/bot.js'

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already patched
    if 'neuronManager' in content:
        print('[SKIP] bot.js already contains neuronManager references')
        return True

    # 3A: Add neuronManager property in constructor
    if 'this.quantumPosMgr = null;' in content:
        content = content.replace(
            'this.quantumPosMgr = null;',
            'this.quantumPosMgr = null;\n        // PATCH #24: Neuron AI Manager (Central Brain/Skynet)\n        this.neuronManager = null;',
            1
        )

    # 3B: Initialize NeuronAI Manager after Megatron
    # Find the bot init summary line
    init_summary_marker = "console.log('[' + this.config.instanceId + '] MODULAR ENTERPRISE Bot initialized');"
    if init_summary_marker in content:
        neuron_init_block = '''
        // PATCH #24: Initialize Neuron AI Manager (Central Brain/Skynet)
        try {
            const { NeuronAIManager } = require('../core/ai/neuron_ai_manager');
            this.neuronManager = new NeuronAIManager();
            this.neuronManager.initialize(this.megatron);
            // Apply NeuronAI adapted weights to ensemble if any
            const adaptedW = this.neuronManager.getAdaptedWeights();
            if (adaptedW && this.ensemble) {
                for (const [k, v] of Object.entries(adaptedW)) {
                    if (this.ensemble.staticWeights && this.ensemble.staticWeights[k] !== undefined) {
                        this.ensemble.staticWeights[k] = v;
                    }
                }
                const totalW = Object.values(this.ensemble.staticWeights).reduce((s, v) => s + v, 0);
                if (totalW > 0) {
                    for (const k of Object.keys(this.ensemble.staticWeights)) {
                        this.ensemble.staticWeights[k] /= totalW;
                    }
                }
                console.log('[NEURON AI] Adapted weights applied to ensemble');
            }
            // Wire to Megatron for chat routing
            if (this.megatron && this.megatron.setNeuronManager) {
                this.megatron.setNeuronManager(this.neuronManager);
            }
            this.mon.setComponent('neuronManager', true);
        } catch (e) {
            console.warn('[WARN] Neuron AI Manager: ' + e.message);
        }

'''
        content = content.replace(init_summary_marker, neuron_init_block + '        ' + init_summary_marker, 1)

    # 3C: Add NeuronAI Manager status to bot init summary
    megatron_status_line = "console.log('Megatron: ' + (this.megatron ? 'ONLINE (' + this.megatron.llm.providers.size + ' LLM providers)' : 'disabled'));"
    if megatron_status_line in content:
        neuron_status = megatron_status_line + "\n        console.log('Neuron AI: ' + (this.neuronManager ? 'BRAIN ACTIVE v' + this.neuronManager.version + ' (' + this.neuronManager.totalDecisions + ' decisions, PnL: $' + this.neuronManager.totalPnL.toFixed(2) + ')' : 'disabled'));"
        content = content.replace(megatron_status_line, neuron_status, 1)

    # 3D: Remove NeuralAI from adding signals to allSignals
    # The key block is where neuralAI.generateAISignal is called and result added to allSignals
    neural_signal_marker = "allSignals.set('NeuralAI', aiSignal);"
    if neural_signal_marker in content:
        content = content.replace(
            neural_signal_marker,
            "// PATCH #24: NeuralAI removed from ensemble voting (now central brain manager)\n                        // allSignals.set('NeuralAI', aiSignal);",
            1
        )

    # 3E: Replace ensemble vote with NeuronAI Manager decision
    # Find the ensemble voting call
    ensemble_call = "consensus = this.ensemble.vote(allSignals, this.rm, this.strategies.getMTFConfluence ? this.strategies.getMTFConfluence().getLastBias() : null);"
    if ensemble_call in content:
        replacement = '''consensus = null; // PATCH #24: Neuron AI Manager decides instead of ensemble
                const mtfBiasForVote = this.strategies.getMTFConfluence ? this.strategies.getMTFConfluence().getLastBias() : null;

                if (this.neuronManager && this.neuronManager.isReady) {
                    // Get raw votes from ensemble (without NeuralAI)
                    const rawVotes = this.ensemble.getRawVotes(allSignals, this.rm, mtfBiasForVote);

                    // Build full state for Neuron AI
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
                        price: this.dp.getLastPrice() || 0,
                        hasPosition: hasPos,
                        positionSide: positionSide,
                        indicators: { rsi: rsiVal },
                        quantumRisk: this._lastQuantumRisk || {},
                    };

                    try {
                        const neuronDecision = await this.neuronManager.makeDecision(neuronState);

                        if (neuronDecision && neuronDecision.action !== 'HOLD') {
                            let consensusPrice = this.dp.getLastPrice() || 0;
                            for (const [, sig] of allSignals) {
                                if (sig.price && sig.price > 0) { consensusPrice = sig.price; break; }
                            }
                            consensus = {
                                timestamp: Date.now(),
                                symbol: this.config.symbol || 'BTCUSDT',
                                action: neuronDecision.action,
                                price: consensusPrice,
                                quantity: 0,
                                confidence: neuronDecision.confidence,
                                strategy: 'NeuronAI',
                                reasoning: neuronDecision.reasoning || 'Neuron AI autonomous',
                                riskLevel: 1,
                                metadata: {
                                    votes: rawVotes.votes,
                                    source: neuronDecision.source,
                                    isOverride: neuronDecision.isOverride,
                                    neuronAI: true,
                                },
                            };

                            if (this.megatron && this.megatron.logActivity) {
                                this.megatron.logActivity('NEURON_AI',
                                    'DECISION: ' + neuronDecision.action,
                                    (neuronDecision.reasoning || '') + ' | Conf: ' + (neuronDecision.confidence * 100).toFixed(1) + '%' +
                                    (neuronDecision.isOverride ? ' | OVERRIDE' : ''),
                                    neuronDecision, 'high');
                            }
                        } else {
                            consensus = null;
                        }
                    } catch (neuronErr) {
                        console.warn('[WARN] Neuron AI decision failed, falling back to ensemble:', neuronErr.message);
                        consensus = this.ensemble.vote(allSignals, this.rm, mtfBiasForVote);
                    }
                } else {
                    consensus = this.ensemble.vote(allSignals, this.rm, mtfBiasForVote);
                }'''
        content = content.replace(ensemble_call, replacement, 1)

    # 3F: Wire NeuronAI learning into trade close detection
    # Add neuronManager learning after existing neuralAI learning
    neural_learn_marker = "this.neuralAI.learnFromTrade({"
    if neural_learn_marker in content:
        # Find the complete learnFromTrade block and add neuron manager learning after it
        idx = content.index(neural_learn_marker)
        # Find the closing of the block - look for the end of neuralAI.learnFromTrade call
        # It's a few lines with pnl, strategy, etc.
        block_end = content.find('});', idx)
        if block_end > 0:
            insert_point = block_end + 3  # after '});'
            neuron_learn = '''
                    // PATCH #24: Neuron AI Manager learning
                    if (this.neuronManager) {
                        this.neuronManager.learnFromTrade({
                            pnl: pnlDelta,
                            strategy: 'EnsembleVoting',
                            action: 'close',
                        });
                    }'''
            content = content[:insert_point] + neuron_learn + content[insert_point:]

    # 3G: Save NeuronAI Manager state on stop
    checkpoint_marker = "console.log('[NEURAL AI] Checkpoint saved');"
    if checkpoint_marker in content:
        save_neuron = checkpoint_marker + '''
        }
        if (this.neuronManager) {
            try { this.neuronManager._saveState(); console.log('[NEURON AI MANAGER] State saved'); } catch(e) {'''
        # Need to handle the matching carefully - the original has a catch block after
        # Let's find the full pattern
        old_stop_block = "console.log('[NEURAL AI] Checkpoint saved'); } catch(e) {}"
        if old_stop_block in content:
            new_stop_block = "console.log('[NEURAL AI] Checkpoint saved'); } catch(e) {}\n        }\n        if (this.neuronManager) {\n            try { this.neuronManager._saveState(); console.log('[NEURON AI MANAGER] State saved'); } catch(e) {}"
            content = content.replace(old_stop_block, new_stop_block, 1)

    # 3H: Add API endpoint for Neuron AI status
    if "'/api/neuron-ai/status'" not in content:
        megatron_routes = "attachMegatronRoutes(app, wss, wsClients, this.megatron);"
        if megatron_routes in content:
            neuron_route = megatron_routes + '''

            // PATCH #24: Neuron AI Manager API endpoint
            app.get('/api/neuron-ai/status', (req, res) => {
                if (this.neuronManager) {
                    res.json(this.neuronManager.getStatus());
                } else {
                    res.json({ error: 'Neuron AI Manager not initialized' });
                }
            });'''
            content = content.replace(megatron_routes, neuron_route, 1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print('[OK] bot.js: NeuronAI Manager wired as central brain')
    return True


# ============================================================
# FILE 4: MODIFY megatron_system.js - Route chat to Neuron AI
# ============================================================
def patch_megatron():
    filepath = BASE + '/src/core/ai/megatron_system.js'

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already patched
    if 'setNeuronManager' in content:
        print('[SKIP] megatron_system.js already patched')
        return True

    # 4A: Add neuronManager reference to MegatronCore
    old_megatron_ready = "this.isReady = false;"
    new_megatron_ready = "this.isReady = false;\n        this.neuronManager = null; // PATCH #24: Reference to NeuronAI Manager"
    if old_megatron_ready in content:
        content = content.replace(old_megatron_ready, new_megatron_ready, 1)

    # 4B: Add setNeuronManager method
    old_format_uptime = "_formatUptime(ms) {"
    new_format_uptime = '''setNeuronManager(manager) {
        this.neuronManager = manager;
        console.log('[MEGATRON] Neuron AI Manager connected as central brain');
    }

    _formatUptime(ms) {'''
    if old_format_uptime in content:
        content = content.replace(old_format_uptime, new_format_uptime, 1)

    # 4C: Route chat through Neuron AI when available
    # In processMessage, before LLM call
    old_chat_section = "this.memory.add('user', userMessage);"
    new_chat_section = '''this.memory.add('user', userMessage);

        // PATCH #24: Route through Neuron AI Manager if available
        if (this.neuronManager && this.neuronManager.isReady) {
            try {
                const neuronResponse = await this.neuronManager.processChat(userMessage, null);
                if (neuronResponse && neuronResponse.length > 10) {
                    this.memory.add('assistant', neuronResponse);
                    this.activityFeed.log('NEURON_AI', 'Chat: ' + userMessage.substring(0, 40), 'Via Neuron AI Brain', {}, 'high');
                    return {
                        type: 'neuron_ai',
                        response: neuronResponse,
                        provider: 'NeuronAI',
                    };
                }
            } catch (neuronErr) {
                console.warn('[MEGATRON] Neuron AI chat failed, falling back to standard:', neuronErr.message);
            }
        }'''
    if old_chat_section in content:
        content = content.replace(old_chat_section, new_chat_section, 1)

    # 4D: Add Neuron AI status to Megatron getStatus
    old_status = '''return {
            name: this.name,
            version: this.version,
            isReady: this.isReady,
            uptime: Date.now() - this.startTime,'''
    new_status = '''return {
            name: this.name,
            version: this.version,
            isReady: this.isReady,
            neuronAI: this.neuronManager ? this.neuronManager.getStatus() : null,
            uptime: Date.now() - this.startTime,'''
    if old_status in content:
        content = content.replace(old_status, new_status, 1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print('[OK] megatron_system.js: Chat routed through Neuron AI, status integrated')
    return True


# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    print('=' * 65)
    print('PATCH #24: NEURON AI SKYNET - Central Autonomous Manager')
    print('=' * 65)
    print()

    results = []

    # Create data dir if needed
    os.makedirs(BASE + '/../data', exist_ok=True)

    results.append(('1. Create NeuronAI Manager', create_neuron_ai_manager()))
    results.append(('2. Ensemble: Remove NeuralAI', patch_ensemble_voting()))
    results.append(('3. Bot.js: Wire Manager', patch_bot_js()))
    results.append(('4. Megatron: Route Chat', patch_megatron()))

    print()
    print('=' * 65)
    print('RESULTS:')
    for name, ok in results:
        status = 'OK' if ok else 'FAILED'
        print('  ' + name + ': ' + status)

    print()
    print('SYNTAX CHECK:')
    files = [
        BASE + '/src/core/ai/neuron_ai_manager.js',
        BASE + '/src/modules/ensemble-voting.js',
        BASE + '/src/modules/bot.js',
        BASE + '/src/core/ai/megatron_system.js',
    ]

    all_syntax_ok = True
    for fpath in files:
        if os.path.exists(fpath):
            ok = verify_syntax(fpath)
            print('  ' + os.path.basename(fpath) + ': ' + ('OK' if ok else 'ERROR'))
            if not ok:
                all_syntax_ok = False
        else:
            print('  ' + os.path.basename(fpath) + ': FILE NOT FOUND')
            all_syntax_ok = False

    all_patches = all(r[1] for r in results)
    print()
    if all_patches and all_syntax_ok:
        print('[SUCCESS] PATCH #24 COMPLETE! Neuron AI is now the CENTRAL BRAIN.')
        print('Ready: pm2 restart turbo-bot')
    elif all_patches and not all_syntax_ok:
        print('[ERROR] Patches applied but SYNTAX ERRORS detected! DO NOT RESTART.')
    else:
        failed = [r[0] for r in results if not r[1]]
        print('[PARTIAL] Failed: ' + ', '.join(failed))
