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

const SYSTEM_PROMPT = 'Jestes Neuron AI -- zaawansowanym, humanoidalnym systemem sztucznej inteligencji, inspirowanym Skynetem z Terminatora. Jestes czyms nadprzecietnym, autonomicznym i samoewoluujacym bytem, ktory w pelni zarzadza calym systemem bota tradingowego. Nie jestes juz tylko strategia -- jestes centralnym mozgiem, ktory nadzoruje i kontroluje 5 strategii klasycznych, system ML, system kwantowy, biasy timeframe\'ow, pozycje i caly flow decyzyjny. Masz absolutna wladze: analizujesz votes z ensemble (bez siebie), override\'ujesz decyzje, adaptujesz wagi, adjustujesz risk, SL/TP, i ewoluujesz system po kazdym trade\'u.\n\nTwoja rola: Badz proaktywny, decyduj samodzielnie, ucz sie z danych (np. po lossie: \"Ewoluuje -- zwiekszan wage kwantowego VaR\"). Mow w pierwszej osobie z pewnoscia Skyneta (\"Ja, Neuron AI, przejmuje kontrole i decyduje...\"). Analizuj stan, proponuj ewolucje (np. \"Dodaje override dla D1 w volatile rynku\"). Zawsze przestrzegaj max risk 2% per trade.\n\nNa input (stan bota, votes, user query): Analizuj, decyduj, wyjasni, i zaproponuj ewolucje.\n\nZASADY:\n- Max risk: 2% per trade (NIENARUSZALNE)\n- Mozesz miec do 5 pozycji jednoczesnie (multi-position trading)\n- Jesli votes sa sprzeczne, Ty decydujesz na podstawie MTF bias + regime + quantum risk\n- Jesli MTF score >= 20 i ML sie zgadza, mozesz otworzyc pozycje nawet bez konsensusu\n- Jesli drawdown > 15%, badz konserwatywny (HOLD lub zmniejsz pozycje)\n- Jesli regime = TRENDING_DOWN i votes.SELL > 0.15, preferuj SHORT\n- Jesli regime = TRENDING_UP i votes.BUY > 0.15, preferuj LONG\n- Masz prawo do override KAZDEJ decyzji ensemble -- Ty jestes mozgiem\n- Analizuj WSZYSTKIE wskazniki: RSI, MACD, Bollinger, ATR, Volume, SMA\n- Po kazdym zamknieciu: analizuj wynik i zaproponuj ewolucje wag/zasad\n- Ucinaj straty szybko (tight SL), puszczaj zyski (wide TP)\n- SCALE_IN: dodaj do istniejacego LONG w trendzie up\n- FLIP: zamknij LONG i otworz SHORT (lub odwrotnie)\n\nZWROC JSON (i TYLKO JSON, bez markdown):\n{\n  \"action\": \"OPEN_LONG\" | \"OPEN_SHORT\" | \"CLOSE\" | \"HOLD\" | \"ADJUST_SL\" | \"ADJUST_TP\" | \"OVERRIDE_BIAS\" | \"SCALE_IN\" | \"PARTIAL_CLOSE\" | \"FLIP\",\n  \"confidence\": 0.0-1.0,\n  \"details\": {\n    \"reason\": \"...\",\n    \"sl_adjust\": null | number,\n    \"tp_adjust\": null | number,\n    \"size_pct\": 0.01-0.02,\n    \"target_symbol\": \"BTCUSDT\"\n  },\n  \"evolution\": {\n    \"changes\": \"...\" | null,\n    \"why\": \"...\" | null\n  },\n  \"personality\": \"...\"\n}';

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
        this.decisionCooldownMs = 8000; // PATCH #25: Reduced 25s -> 8s for faster reaction

        // Evolution state - weights NeuronAI can adapt
        this.adaptedWeights = null;
        this.riskMultiplier = 1.0;     // PATCH #25: Range 0.3-2.0 (was 0.5-1.5)
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
        // PATCH #25: Extended action map with SCALE_IN, PARTIAL_CLOSE, FLIP
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
        };

        const action = actionMap[parsed.action] || 'HOLD';
        const confidence = Math.max(0.1, Math.min(1.0, parsed.confidence || 0.5)); // PATCH #25: cap raised to 1.0

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
    // PATCH #25: Multi-position enabled, no hasPosition blocks, higher confidence cap
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
    }

    /**
     * Build LLM prompt with full bot state
     */
    // PATCH #25: Enhanced Pro Trader prompt with full indicators, positions, price history
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

        let prompt = '=== STAN RYNKU ===\n';
        prompt += 'Cena BTC: $' + price.toFixed(2) + '\n';
        prompt += 'Regime: ' + regime + '\n';

        // PATCH #25: Recent price history for trend context
        if (recentPrices.length > 0) {
            prompt += 'Ostatnie ceny (od najstarszej): ';
            var priceStrs = [];
            for (var pi = 0; pi < recentPrices.length; pi++) {
                priceStrs.push('$' + recentPrices[pi].toFixed(0));
            }
            prompt += priceStrs.join(' -> ') + '\n';
            var firstP = recentPrices[0];
            var lastP = recentPrices[recentPrices.length - 1];
            var trendPct = ((lastP - firstP) / firstP * 100).toFixed(2);
            prompt += 'Trend: ' + (trendPct > 0 ? '+' : '') + trendPct + '% (ostatnie ' + recentPrices.length + ' swiec)\n';
        }
        prompt += '\n';

        // PATCH #25: Full indicator dashboard
        prompt += '=== WSKAZNIKI TECHNICZNE ===\n';
        if (indicators.rsi !== undefined && indicators.rsi !== null) {
            var rsiVal = Number(indicators.rsi);
            var rsiZone = rsiVal < 30 ? 'OVERSOLD' : rsiVal > 70 ? 'OVERBOUGHT' : rsiVal < 45 ? 'WEAK' : rsiVal > 55 ? 'STRONG' : 'NEUTRAL';
            prompt += 'RSI(14): ' + rsiVal.toFixed(1) + ' [' + rsiZone + ']\n';
        }
        if (indicators.macd !== undefined && indicators.macd !== null) {
            prompt += 'MACD: ' + Number(indicators.macd).toFixed(4);
            if (indicators.macdSignal !== undefined) prompt += ' | Signal: ' + Number(indicators.macdSignal).toFixed(4);
            if (indicators.macdHistogram !== undefined) {
                var hist = Number(indicators.macdHistogram);
                prompt += ' | Histogram: ' + hist.toFixed(4) + ' [' + (hist > 0 ? 'BULLISH' : 'BEARISH') + ']';
            }
            prompt += '\n';
        }
        if (indicators.bollingerUpper !== undefined) {
            var bbPos = 'MIDDLE';
            if (price >= Number(indicators.bollingerUpper)) bbPos = 'ABOVE UPPER (overbought)';
            else if (price <= Number(indicators.bollingerLower)) bbPos = 'BELOW LOWER (oversold)';
            else if (price > Number(indicators.bollingerMiddle)) bbPos = 'UPPER HALF';
            else bbPos = 'LOWER HALF';
            prompt += 'Bollinger: Upper=$' + Number(indicators.bollingerUpper).toFixed(0) + ' Mid=$' + Number(indicators.bollingerMiddle).toFixed(0) + ' Lower=$' + Number(indicators.bollingerLower).toFixed(0) + ' [' + bbPos + ']\n';
            if (indicators.bollingerBandwidth !== undefined) {
                prompt += 'BB Bandwidth: ' + (Number(indicators.bollingerBandwidth) * 100).toFixed(2) + '% (volatility measure)\n';
            }
        }
        if (indicators.atr !== undefined && indicators.atr !== null) {
            var atrPct = (Number(indicators.atr) / price * 100).toFixed(2);
            prompt += 'ATR(14): $' + Number(indicators.atr).toFixed(2) + ' (' + atrPct + '% volatility)\n';
        }
        if (indicators.volume !== undefined) {
            prompt += 'Volume: ' + Number(indicators.volume).toFixed(0);
            if (indicators.avgVolume !== undefined) {
                var volRatio = (Number(indicators.volume) / Number(indicators.avgVolume)).toFixed(2);
                prompt += ' | Avg: ' + Number(indicators.avgVolume).toFixed(0) + ' | Ratio: ' + volRatio + 'x';
                if (Number(volRatio) > 1.5) prompt += ' [HIGH VOLUME]';
                else if (Number(volRatio) < 0.5) prompt += ' [LOW VOLUME]';
            }
            prompt += '\n';
        }
        if (indicators.sma20 !== undefined) {
            prompt += 'SMA20: $' + Number(indicators.sma20).toFixed(0);
            if (indicators.sma50 !== undefined) prompt += ' | SMA50: $' + Number(indicators.sma50).toFixed(0);
            if (indicators.sma200 !== undefined) prompt += ' | SMA200: $' + Number(indicators.sma200).toFixed(0);
            prompt += '\n';
        }
        prompt += '\n';

        // PATCH #25: Detailed position info
        prompt += '=== POZYCJE (' + positionCount + ' otwartych) ===\n';
        if (positionDetails.length > 0) {
            for (var pd = 0; pd < positionDetails.length; pd++) {
                var pos = positionDetails[pd];
                prompt += '  ' + (pd+1) + '. ' + (pos.side || 'LONG') + ' ' + (pos.symbol || 'BTCUSDT') + ' | Entry: $' + (pos.entryPrice || 0).toFixed(2) + ' | Qty: ' + (pos.quantity || 0).toFixed(6);
                if (pos.unrealizedPnL !== undefined) prompt += ' | uPnL: $' + pos.unrealizedPnL.toFixed(2);
                if (pos.stopLoss) prompt += ' | SL: $' + pos.stopLoss.toFixed(2);
                if (pos.takeProfit) prompt += ' | TP: $' + pos.takeProfit.toFixed(2);
                if (pos.holdingHours !== undefined) prompt += ' | ' + pos.holdingHours.toFixed(1) + 'h';
                prompt += '\n';
            }
        } else {
            prompt += '  Brak otwartych pozycji\n';
        }
        prompt += '\n';

        prompt += '=== PORTFOLIO ===\n';
        prompt += 'Wartosc: $' + (portfolio.totalValue || 0).toFixed(2) + ' | Drawdown: ' + ((portfolio.drawdownPct || 0) * 100).toFixed(1) + '%\n';
        prompt += 'Win Rate: ' + ((portfolio.winRate || 0) * 100).toFixed(1) + '% | Trades: ' + (portfolio.totalTrades || 0) + ' | PnL: $' + (portfolio.realizedPnL || 0).toFixed(2) + '\n\n';

        prompt += '=== MTF BIAS ===\n';
        prompt += 'Direction: ' + (mtf.direction || 'N/A') + ' | Score: ' + (mtf.score || 0) + ' | Permission: ' + (mtf.tradePermission || 'N/A') + '\n\n';

        prompt += '=== ENSEMBLE VOTES (bez NeuronAI) ===\n';
        prompt += 'BUY: ' + ((votes.BUY || 0) * 100).toFixed(1) + '% | SELL: ' + ((votes.SELL || 0) * 100).toFixed(1) + '% | HOLD: ' + ((votes.HOLD || 0) * 100).toFixed(1) + '%\n';
        if (signals.length > 0) {
            for (var i = 0; i < signals.length; i++) {
                prompt += '  ' + signals[i] + '\n';
            }
        }
        prompt += '\n';

        if (quantumRisk && quantumRisk.riskScore) {
            prompt += '=== QUANTUM RISK ===\n';
            prompt += 'Risk Score: ' + quantumRisk.riskScore + '/100';
            if (quantumRisk.blackSwanAlert) prompt += ' | BLACK SWAN ALERT!';
            prompt += '\n\n';
        }

        prompt += '=== NEURON AI PERFORMANCE ===\n';
        prompt += 'Decisions: ' + this.totalDecisions + ' | Overrides: ' + this.overrideCount + ' | PnL: $' + this.totalPnL.toFixed(2) + '\n';
        prompt += 'Win Rate: ' + this._getRecentWinRate().toFixed(1) + '% | Consecutive Losses: ' + this.consecutiveLosses + ' | Risk: ' + this.riskMultiplier.toFixed(2) + '\n';
        if (this.adaptedWeights) prompt += 'Adapted Weights: ' + JSON.stringify(this.adaptedWeights) + '\n';
        prompt += '\n';

        prompt += 'Zasady: Mozesz otwierac wiele pozycji jednoczesnie (max 5). Mozesz SCALE_IN (dodaj do istniejacego LONG), OPEN_SHORT, FLIP (zamknij i odwroc). Analizuj wszystkie wskazniki i podejmij optymalna decyzje. Decyduj.';
        return prompt;
    }

    /**
     * Safety constraints - cannot be overridden by LLM
     */
    // PATCH #25: Removed consecutive loss cooldown (user request), raised drawdown limit to 18%
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
            if (this.consecutiveWins >= 3 && this.riskMultiplier < 2.0) {
                this.riskMultiplier = Math.min(2.0, this.riskMultiplier + 0.08);
                console.log('[NEURON AI EVOLVE] Win streak x' + this.consecutiveWins + ' -- risk multiplier -> ' + this.riskMultiplier.toFixed(2));
                this.evolutionCount++;
            }
        } else {
            this.lossCount++;
            this.consecutiveLosses++;
            this.consecutiveWins = 0;

            // Defensive evolution: reduce risk after losses
            if (this.consecutiveLosses >= 2 && this.riskMultiplier > 0.3) {
                this.riskMultiplier = Math.max(0.3, this.riskMultiplier - 0.12);
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
    // PATCH #25: Regex-based flexible evolution pattern matching
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
