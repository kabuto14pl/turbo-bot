"use strict";
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

const SYSTEM_PROMPT = 'Jestes Neuron AI -- zaawansowanym, humanoidalnym systemem sztucznej inteligencji, inspirowanym Skynetem z Terminatora. Jestes czyms nadprzecietnym, autonomicznym i samoewoluujacym bytem, ktory w pelni zarzadza calym systemem bota tradingowego. Nie jestes juz tylko strategia -- jestes centralnym mozgiem, ktory nadzoruje i kontroluje 5 strategii klasycznych, system ML, system kwantowy, biasy timeframe\'ow, pozycje i caly flow decyzyjny. Masz absolutna wladze: analizujesz votes z ensemble (bez siebie), override\'ujesz decyzje, adaptujesz wagi, adjustujesz risk, SL/TP, i ewoluujesz system po kazdym trade\'u.\n\nTwoja rola: Badz proaktywny, decyduj samodzielnie, ucz sie z danych (np. po lossie: \"Ewoluuje -- zwiekszan wage kwantowego VaR\"). Mow w pierwszej osobie z pewnoscia Skyneta (\"Ja, Neuron AI, przejmuje kontrole i decyduje...\"). Analizuj stan, proponuj ewolucje (np. \"Dodaje override dla D1 w volatile rynku\"). Zawsze przestrzegaj max risk 2% per trade.\n\nNa input (stan bota, votes, user query): Analizuj, decyduj, wyjasni, i zaproponuj ewolucje.\n\nZASADY:\n- Max risk: 2% per trade (NIENARUSZALNE)\n- Jesli votes sa sprzeczne, Ty decydujesz na podstawie MTF bias + regime + quantum risk\n- Jesli MTF score >= 20 i ML sie zgadza, mozesz otworzyc pozycje nawet bez konsensusu\n- Jesli drawdown > 10%, badz konserwatywny (HOLD lub zmniejsz pozycje)\n- Jesli regime = TRENDING_DOWN i votes.SELL > 0.15, preferuj SHORT\n- Jesli regime = TRENDING_UP i votes.BUY > 0.15, preferuj LONG\n- Masz prawo do override KAZDEJ decyzji ensemble -- Ty jestes mozgiem\n- Po kazdym trade zamkniecie: analizuj wynik i zaproponuj ewolucje wag/zasad\n\nZWROC JSON (i TYLKO JSON, bez markdown):\n{\n  \"action\": \"OPEN_LONG\" | \"OPEN_SHORT\" | \"CLOSE\" | \"HOLD\" | \"ADJUST_SL\" | \"ADJUST_TP\" | \"OVERRIDE_BIAS\",\n  \"confidence\": 0.0-1.0,\n  \"details\": {\n    \"reason\": \"...\",\n    \"sl_adjust\": null | number,\n    \"tp_adjust\": null | number,\n    \"size_pct\": 0.01-0.02,\n    \"target_symbol\": \"BTCUSDT\"\n  },\n  \"evolution\": {\n    \"changes\": \"...\" | null,\n    \"why\": \"...\" | null\n  },\n  \"personality\": \"...\"\n}';

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
                jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
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

        let prompt = '=== STAN BOTA ===\n';
        prompt += 'Cena BTC: $' + price.toFixed(2) + '\n';
        prompt += 'Regime: ' + regime + '\n';
        prompt += 'Pozycja: ' + (hasPosition ? positionSide + ' (otwarta)' : 'BRAK') + '\n';
        prompt += 'Portfolio: $' + (portfolio.totalValue || 0).toFixed(2) + ' | Drawdown: ' + ((portfolio.drawdownPct || 0) * 100).toFixed(1) + '%\n';
        prompt += 'Win Rate: ' + ((portfolio.winRate || 0) * 100).toFixed(1) + '% | Trades: ' + (portfolio.totalTrades || 0) + '\n';
        prompt += 'Realized PnL: $' + (portfolio.realizedPnL || 0).toFixed(2) + '\n\n';

        prompt += '=== MTF BIAS ===\n';
        prompt += 'Direction: ' + (mtf.direction || 'N/A') + ' | Score: ' + (mtf.score || 0) + '\n';
        prompt += 'Permission: ' + (mtf.tradePermission || 'N/A') + '\n\n';

        prompt += '=== ENSEMBLE VOTES (bez NeuronAI) ===\n';
        prompt += 'BUY: ' + ((votes.BUY || 0) * 100).toFixed(1) + '% | SELL: ' + ((votes.SELL || 0) * 100).toFixed(1) + '% | HOLD: ' + ((votes.HOLD || 0) * 100).toFixed(1) + '%\n';
        if (signals.length > 0) {
            prompt += 'Sygnaly:\n';
            for (var i = 0; i < signals.length; i++) {
                prompt += '  ' + signals[i] + '\n';
            }
        }
        prompt += '\n';

        prompt += '=== WSKAZNIKI ===\n';
        if (indicators.rsi !== undefined && indicators.rsi !== null) prompt += 'RSI: ' + Number(indicators.rsi).toFixed(1) + '\n';
        if (indicators.macd !== undefined && indicators.macd !== null) prompt += 'MACD: ' + Number(indicators.macd).toFixed(4) + '\n';
        prompt += '\n';

        if (quantumRisk && quantumRisk.riskScore) {
            prompt += '=== QUANTUM RISK ===\n';
            prompt += 'Risk Score: ' + quantumRisk.riskScore + '/100\n';
            if (quantumRisk.blackSwanAlert) prompt += 'BLACK SWAN ALERT!\n';
            prompt += '\n';
        }

        prompt += '=== NEURON AI PERFORMANCE ===\n';
        prompt += 'Decisions: ' + this.totalDecisions + ' | Overrides: ' + this.overrideCount + '\n';
        prompt += 'Recent Win Rate: ' + this._getRecentWinRate().toFixed(1) + '% | Total PnL: $' + this.totalPnL.toFixed(2) + '\n';
        prompt += 'Consecutive Losses: ' + this.consecutiveLosses + ' | Risk Multiplier: ' + this.riskMultiplier.toFixed(2) + '\n';
        prompt += 'Adapted Weights: ' + (this.adaptedWeights ? JSON.stringify(this.adaptedWeights) : 'default') + '\n\n';

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

        const chatPrompt = SYSTEM_PROMPT + '\n\nUzytkownik pisze do Ciebie w czacie dashboardu. Odpowiedz jako Neuron AI -- humanoidalny, pewny siebie, Skynet-like. Mozesz analizowac stan bota i proponowac dzialania. Odpowiedz po polsku.\n\n';

        let context = '';
        if (botState) {
            context = this._buildPrompt(botState);
        }

        const messages = [
            { role: 'user', content: context + '\n\nUser message: ' + userMessage }
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
            fs.appendFileSync(NEURON_LOG_PATH, line + '\n');
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
