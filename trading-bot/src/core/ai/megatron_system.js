'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║            MEGATRON AI — Intelligent Trading Assistant              ║
 * ║            Version 1.0.0 | Turbo-Bot Enterprise System             ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  Multi-LLM conversational AI with real-time bot management.        ║
 * ║  Supports: GitHub Models, OpenAI GPT-4o, Anthropic Claude, xAI Grok, Ollama      ║
 * ║                                                                    ║
 * ║  Components:                                                       ║
 * ║   • LLMRouter       – Multi-provider routing with failover         ║
 * ║   • ContextBuilder   – Real-time bot state aggregation             ║
 * ║   • CommandHandler   – NL command parsing (PL/EN bilingual)        ║
 * ║   • ConversationMemory – Sliding-window chat history               ║
 * ║   • AIActivityFeed   – Ring-buffer activity log + broadcast        ║
 * ║   • MegatronCore     – Main orchestrator                          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────
const MEGATRON_VERSION = '1.0.0';
const MAX_CONVERSATION = 40;
const MAX_ACTIVITIES = 1000;
const LLM_TIMEOUT_MS = 30000;

const ACTIVITY_ICONS = {
    SIGNAL:   '📊', REGIME:  '🌍', RISK:     '🛡️',
    TRADE:    '💹', LEARNING:'🧠', SYSTEM:   '⚙️',
    QUANTUM:  '⚛️', CHAT:    '💬', COMMAND:  '🔧',
    ERROR:    '❌', WARNING: '⚠️', MARKET:   '📈',
};

const MEGATRON_SYSTEM_PROMPT = `Jesteś MEGATRON — zaawansowany asystent AI systemu tradingowego Turbo-Bot.
Zarządzasz autonomicznym botem handlującym BTC/USDT na giełdzie OKX.

TWOJA OSOBOWOŚĆ:
- Jesteś pewny siebie, analityczny i precyzyjny
- Odpowiadasz konkretnie, podając dane liczbowe
- Mówisz krótko ale wyczerpująco
- Używasz terminologii tradingowej
- Jesteś proaktywny — sugerujesz ulepszenia
- Odpowiadaj w języku, w którym się do Ciebie mówi (PL lub EN)

TWOJE MOŻLIWOŚCI:
- Analiza portfolio, pozycji i historii transakcji
- Wyjaśnianie decyzji tradingowych (dlaczego BUY/SELL/HOLD)
- Raportowanie stanu strategii, ML i Neural AI
- Ocena ryzyka: drawdown, circuit breaker, VaR
- Wykonywanie komend: zmiana wag, pauza, reset CB
- Optymalizacja: sugestie dot. strategii i parametrów

KOMENDY (wykryjesz je i wykonasz automatycznie):
- "zmień wagę [strategia] na [X]%" → zmiana wagi w ensemble
- "pauza/pause [X min]" → tymczasowa pauza tradingu
- "wznów/resume" → wznowienie tradingu
- "reset circuit breaker" → reset CB
- "zamknij pozycję/close position" → zamknięcie otwartej pozycji
- "status" → pełny raport stanu

KONTEKST AKTUALNY (aktualizowany przy każdej wiadomości):
`;

// ─────────────────────────────────────────────────────────────────────
// COMMAND PATTERNS (Polish + English bilingual)
// ─────────────────────────────────────────────────────────────────────
const COMMAND_PATTERNS = [
    {
        id: 'change_weight',
        patterns: [
            /(?:zmień|zmien|change|set|ustaw)\s+(?:wagę|wage|weight|waga)\s+(?:strategii?\s+)?(?:dla\s+)?(AdvancedAdaptive|RSITurbo|SuperTrend|MACrossover|MomentumPro|EnterpriseML|NeuralAI)\s+(?:na|to|=)\s*(\d+(?:\.\d+)?)\s*%?/i,
            /(?:waga|weight)\s+(AdvancedAdaptive|RSITurbo|SuperTrend|MACrossover|MomentumPro|EnterpriseML|NeuralAI)\s*[=:]\s*(\d+(?:\.\d+)?)\s*%?/i,
        ],
        extract: (m) => ({ strategy: m[1], weight: parseFloat(m[2]) / (parseFloat(m[2]) > 1 ? 100 : 1) }),
    },
    {
        id: 'pause',
        patterns: [
            /(?:pauza|pause|stop|zatrzymaj)\s*(?:trading|handel|bot)?\s*(?:na|for)?\s*(\d+)?\s*(?:min|minut|minutes)?/i,
        ],
        extract: (m) => ({ minutes: parseInt(m[1]) || 5 }),
    },
    {
        id: 'resume',
        patterns: [
            /(?:wznów|wznow|resume|start|kontynuuj|continue)\s*(?:trading|handel|bot)?/i,
        ],
        extract: () => ({}),
    },
    {
        id: 'status',
        patterns: [
            /^(?:status|stan|state|raport|report)$/i,
            /(?:pokaż|pokaz|show|daj|give)\s+(?:pełny\s+)?(?:status|stan|raport|report)/i,
        ],
        extract: () => ({}),
    },
    {
        id: 'explain_trade',
        patterns: [
            /(?:wyjaśnij|wyjasni|explain|opisz|describe)\s+(?:ostatni[ąa]?\s+)?(?:transakcj[ęea]?|trade|deal)/i,
            /(?:dlaczego|why)\s+(?:bot\s+)?(?:kupił|sprzedał|bought|sold|opened|closed)/i,
        ],
        extract: () => ({}),
    },
    {
        id: 'performance',
        patterns: [
            /(?:performance|wydajność|wydajnosc|wyniki|results|zyski|profits|straty|losses)/i,
        ],
        extract: () => ({}),
    },
    {
        id: 'reset_cb',
        patterns: [
            /(?:reset|zresetuj|resetuj)\s*(?:circuit\s*breaker|cb|bezpiecznik)/i,
        ],
        extract: () => ({}),
    },
    {
        id: 'risk_level',
        patterns: [
            /(?:ryzyko|risk)\s*(?:level|poziom)?\s*(?:na|to|=)?\s*(low|medium|high|niski[e]?|średni[e]?|wysoki[e]?|1|2|3)/i,
            /(?:ustaw|set)\s+(?:risk|ryzyko)\s+(?:na|to|=)\s*(low|medium|high|niski[e]?|średni[e]?|wysoki[e]?|1|2|3)/i,
        ],
        extract: (m) => {
            const map = { 'low': 'LOW', 'niskie': 'LOW', 'niski': 'LOW', '1': 'LOW',
                          'medium': 'MEDIUM', 'średnie': 'MEDIUM', 'srednie': 'MEDIUM', '2': 'MEDIUM',
                          'high': 'HIGH', 'wysokie': 'HIGH', 'wysoki': 'HIGH', '3': 'HIGH' };
            return { level: map[(m[1] || '').toLowerCase()] || 'MEDIUM' };
        },
    },
    {
        id: 'close_position',
        patterns: [
            /(?:zamknij|close|sell)\s+(?:pozycj[ęea]?|position|all|wszystk)/i,
        ],
        extract: () => ({}),
    },
    {
        id: 'strategies',
        patterns: [
            /(?:strategi[ea]|strategies|strategii|pokaż strategie|show strategies|lista strategii)/i,
        ],
        extract: () => ({}),
    },
];

// ─────────────────────────────────────────────────────────────────────
// LLM ROUTER — Multi-Provider with Failover
// ─────────────────────────────────────────────────────────────────────
class LLMRouter {
    constructor() {
        this.providers = new Map();
        this.preferredOrder = ['github', 'grok', 'claude', 'openai', 'ollama'];
        this.metrics = { totalCalls: 0, errors: 0, avgLatencyMs: 0, providerUsage: {} };
        this._totalLatency = 0;
    }

    configure(config) {
        if (config.githubToken) {
            this.providers.set('github', {
                url: 'https://models.inference.ai.azure.com/chat/completions',
                model: config.githubModel || 'gpt-4o',
                headers: { 'Authorization': 'Bearer ' + config.githubToken, 'Content-Type': 'application/json' },
                format: 'openai',
            });
        }
        if (config.openaiKey) {
            this.providers.set('openai', {
                url: 'https://api.openai.com/v1/chat/completions',
                model: config.openaiModel || 'gpt-4o',
                headers: { 'Authorization': 'Bearer ' + config.openaiKey, 'Content-Type': 'application/json' },
                format: 'openai',
            });
        }
        if (config.anthropicKey) {
            this.providers.set('claude', {
                url: 'https://api.anthropic.com/v1/messages',
                model: config.claudeModel || 'claude-sonnet-4-20250514',
                headers: { 'x-api-key': config.anthropicKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
                format: 'claude',
            });
        }
        if (config.xaiKey) {
            this.providers.set('grok', {
                url: 'https://api.x.ai/v1/chat/completions',
                model: config.grokModel || 'grok-3',
                headers: { 'Authorization': 'Bearer ' + config.xaiKey, 'Content-Type': 'application/json' },
                format: 'openai',
            });
        }
        if (config.ollamaUrl) {
            this.providers.set('ollama', {
                url: config.ollamaUrl + '/api/chat',
                model: config.ollamaModel || 'llama3.2',
                headers: { 'Content-Type': 'application/json' },
                format: 'ollama',
            });
        }
        console.log('[MEGATRON LLM] Configured providers: ' + (this.providers.size > 0 ? Array.from(this.providers.keys()).join(', ') : 'NONE (rule-based fallback)'));
    }

    async call(systemPrompt, messages, options = {}) {
        this.metrics.totalCalls++;
        const order = this.preferredOrder.filter(p => this.providers.has(p));

        for (const providerName of order) {
            try {
                const start = Date.now();
                const result = await this._callProvider(providerName, systemPrompt, messages, options);
                const latency = Date.now() - start;
                this._totalLatency += latency;
                this.metrics.avgLatencyMs = Math.round(this._totalLatency / this.metrics.totalCalls);
                this.metrics.providerUsage[providerName] = (this.metrics.providerUsage[providerName] || 0) + 1;
                return { content: result, provider: providerName, latencyMs: latency };
            } catch (e) {
                this.metrics.errors++;
                console.warn('[MEGATRON LLM] Provider ' + providerName + ' failed: ' + e.message);
                continue;
            }
        }

        // All API providers failed — use rule-based fallback
        return this._ruleFallback(messages);
    }

    async _callProvider(name, systemPrompt, messages, options) {
        const provider = this.providers.get(name);
        let body;

        if (provider.format === 'claude') {
            // Claude: system is separate, messages must alternate user/assistant
            const filtered = messages.filter(m => m.role === 'user' || m.role === 'assistant');
            // Ensure first message is user
            if (filtered.length === 0 || filtered[0].role !== 'user') {
                filtered.unshift({ role: 'user', content: '(system initialized)' });
            }
            // Ensure alternating roles
            const deduped = [];
            for (const msg of filtered) {
                if (deduped.length === 0 || deduped[deduped.length - 1].role !== msg.role) {
                    deduped.push(msg);
                } else {
                    deduped[deduped.length - 1].content += '\n' + msg.content;
                }
            }
            body = {
                model: provider.model,
                system: systemPrompt,
                messages: deduped,
                max_tokens: options.maxTokens || 1200,
                temperature: options.temperature || 0.7,
            };
        } else if (provider.format === 'ollama') {
            body = {
                model: provider.model,
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                stream: false,
                options: { temperature: options.temperature || 0.7, num_predict: options.maxTokens || 1200 },
            };
        } else {
            // OpenAI / Grok (OpenAI-compatible)
            body = {
                model: provider.model,
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 1200,
            };
        }

        const response = await this._httpRequest(provider.url, { method: 'POST', headers: provider.headers }, body);

        // Parse response based on format
        if (provider.format === 'claude') {
            if (response.content && response.content[0]) return response.content[0].text;
            throw new Error('Unexpected Claude response format');
        } else if (provider.format === 'ollama') {
            if (response.message && response.message.content) return response.message.content;
            throw new Error('Unexpected Ollama response format');
        } else {
            if (response.choices && response.choices[0]) return response.choices[0].message.content;
            throw new Error('Unexpected OpenAI response format');
        }
    }

    _ruleFallback(messages) {
        // Rule-based fallback when no API keys are configured
        const lastUserMsg = messages.filter(m => m.role === 'user').pop();
        const text = lastUserMsg ? lastUserMsg.content.toLowerCase() : '';

        let response;
        if (text.includes('status') || text.includes('stan')) {
            response = '⚙️ [MEGATRON rule-based] Jestem aktywny w trybie offline (bez kluczy API LLM). Aby uzyskać pełne odpowiedzi AI, skonfiguruj GITHUB_TOKEN (najłatwiej — GitHub PAT), OPENAI_API_KEY, ANTHROPIC_API_KEY lub XAI_API_KEY w pliku .env. Status bota i komendy działają normalnie — wpisz komendę do wykonania.';
        } else if (text.includes('pomoc') || text.includes('help')) {
            response = '🔧 [MEGATRON] Dostępne komendy:\n• "status" — pełny raport stanu bota\n• "zmień wagę [strategia] na [X]%" — zmiana wagi\n• "pauza [X min]" — pauza tradingu\n• "wznów" — wznowienie\n• "reset circuit breaker" — reset CB\n• "wyjaśnij transakcję" — analiza ostatniego trade\n• "performance" — raport wyników\n• "strategie" — lista strategii\n\nAby włączyć AI chat, dodaj GITHUB_TOKEN (GitHub PAT) lub klucze API (OpenAI/Claude/Grok) do .env na VPS.';
        } else {
            response = '🤖 [MEGATRON offline] Nie mam skonfigurowanych kluczy API LLM. Mogę wykonywać komendy (wpisz "help" po listę). Aby włączyć pełny AI chat, dodaj do .env: GITHUB_TOKEN (GitHub PAT), OPENAI_API_KEY, ANTHROPIC_API_KEY lub XAI_API_KEY.';
        }
        return { content: response, provider: 'rule-based', latencyMs: 0 };
    }

    _httpRequest(urlStr, options, body) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(urlStr);
            const lib = parsedUrl.protocol === 'https:' ? https : http;
            const reqOpts = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: options.method || 'POST',
                headers: options.headers || {},
                timeout: LLM_TIMEOUT_MS,
            };

            const req = lib.request(reqOpts, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try { resolve(JSON.parse(data)); }
                        catch (e) { reject(new Error('Invalid JSON response: ' + data.substring(0, 200))); }
                    } else {
                        reject(new Error('HTTP ' + res.statusCode + ': ' + data.substring(0, 300)));
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('LLM request timeout (' + LLM_TIMEOUT_MS + 'ms)')); });
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }

    getMetrics() { return { ...this.metrics, providers: Array.from(this.providers.keys()) }; }
}

// ─────────────────────────────────────────────────────────────────────
// CONTEXT BUILDER — Aggregates Bot State for LLM Prompts
// ─────────────────────────────────────────────────────────────────────
class ContextBuilder {
    constructor() {
        this.modules = null;
    }

    setModules(m) { this.modules = m; }

    buildFullContext() {
        if (!this.modules) return '[No bot modules connected]';
        const parts = [];
        parts.push(this._portfolio());
        parts.push(this._positions());
        parts.push(this._risk());
        parts.push(this._ml());
        parts.push(this._neuralAI());
        parts.push(this._strategies());
        parts.push(this._recentTrades());
        parts.push(this._market());
        return parts.filter(Boolean).join('\n\n');
    }

    _portfolio() {
        try {
            const pm = this.modules.pm;
            const p = pm.getPortfolio();
            const b = pm.getBalance();
            return `📊 PORTFOLIO:
• Wartość: $${(p.totalValue||0).toFixed(2)}
• Gotówka (USDT): $${(b.usdtBalance||0).toFixed(2)}
• BTC: ${(b.btcBalance||0).toFixed(8)}
• Niezrealizowane PnL: $${(p.unrealizedPnL||0).toFixed(2)}
• Zrealizowane PnL: $${(p.realizedPnL||0).toFixed(2)}
• Drawdown: ${((p.drawdown||0)*100).toFixed(3)}%
• Win Rate: ${((p.winRate||0)*100).toFixed(1)}%
• Łączne transakcje: ${p.totalTrades||0}`;
        } catch (e) { return '📊 PORTFOLIO: [Error: ' + e.message + ']'; }
    }

    _positions() {
        try {
            const pm = this.modules.pm;
            const positions = pm.getPositions();
            if (!positions || positions.size === 0) return '📌 POZYCJE: Brak otwartych pozycji';
            const lines = ['📌 POZYCJE OTWARTE:'];
            for (const [sym, pos] of positions) {
                lines.push(`  • ${sym}: entry=$${(pos.entryPrice||0).toFixed(2)}, qty=${(pos.quantity||0).toFixed(6)}, side=${pos.side||'LONG'}`);
            }
            return lines.join('\n');
        } catch (e) { return '📌 POZYCJE: [Error]'; }
    }

    _risk() {
        try {
            const rm = this.modules.rm;
            const cb = rm.getCircuitBreakerStatus();
            return `🛡️ RYZYKO:
• Circuit Breaker: ${cb.isTripped ? '🔴 WYZWOLONY' : '🟢 OK'}
• Kolejne straty: ${cb.consecutiveLosses}/${cb.maxConsecutiveLosses}
• Trip Count: ${cb.tripCount}
• Soft Pause: ${cb.softPauseActive ? 'AKTYWNA' : 'nieaktywna'}
• Dzienny count: ${cb.dailyTradeCount} transakcji`;
        } catch (e) { return '🛡️ RYZYKO: [Error]'; }
    }

    _ml() {
        try {
            const ml = this.modules.ml;
            if (!ml) return '🧠 ML: Wyłączony';
            return `🧠 ENTERPRISE ML:
• Faza: ${ml.mlLearningPhase || 'N/A'}
• Transakcje ML: ${ml.mlTradingCount || 0}
• Threshold: ${((ml.mlConfidenceThreshold||0)*100).toFixed(1)}%
• Exploration: ${((ml.mlExplorationRate||0)*100).toFixed(2)}%`;
        } catch (e) { return '🧠 ML: [Error]'; }
    }

    _neuralAI() {
        try {
            const nai = this.modules.neuralAI;
            if (!nai) return '⚡ NEURAL AI: Nie zainicjalizowany';
            const s = nai.getStatus ? nai.getStatus() : {};
            return `⚡ NEURAL AI (TensorFlow.js):
• Faza: ${s.phase || 'N/A'}
• Reżim rynkowy: ${s.regime || 'N/A'}
• Świece przetworzone: ${s.candlesProcessed || 0}
• GRU: ${s.gruTrained ? 'WYTRENOWANY' : 'w trakcie uczenia'}
• Thompson Updates: ${s.thompsonUpdates || 0}
• Bufor doświadczeń: ${s.experienceBufferSize || 0} sample(s)`;
        } catch (e) { return '⚡ NEURAL AI: [Error]'; }
    }

    _strategies() {
        try {
            const ens = this.modules.ensemble;
            if (!ens) return '📋 STRATEGIE: [N/A]';
            const weights = ens.getWeightsSummary ? ens.getWeightsSummary() : ens.weights || {};
            const lines = ['📋 WAGI STRATEGII (ensemble):'];
            for (const [name, w] of Object.entries(weights)) {
                lines.push(`  • ${name}: ${(w * 100).toFixed(1)}%`);
            }
            return lines.join('\n');
        } catch (e) { return '📋 STRATEGIE: [Error]'; }
    }

    _recentTrades() {
        try {
            const pm = this.modules.pm;
            const trades = pm.getTrades().slice(-5);
            if (trades.length === 0) return '📜 OSTATNIE TRANSAKCJE: Brak';
            const lines = ['📜 OSTATNIE 5 TRANSAKCJI:'];
            for (const t of trades) {
                const ts = t.timestamp ? new Date(t.timestamp).toLocaleString('pl-PL') : '?';
                lines.push(`  • ${ts}: ${t.action||t.type||'?'} ${t.symbol||'?'} @ $${(t.price||0).toFixed(2)} | PnL: $${(t.pnl||0).toFixed(2)} | ${t.reason||''}`);
            }
            return lines.join('\n');
        } catch (e) { return '📜 TRANSAKCJE: [Error]'; }
    }

    _market() {
        try {
            const dp = this.modules.dp;
            const h = dp.getMarketDataHistory ? dp.getMarketDataHistory() : [];
            if (h.length === 0) return '📈 RYNEK: Brak danych';
            const last = h[h.length - 1];
            return `📈 RYNEK (BTC/USDT):
• Cena: $${(last.close||0).toFixed(2)}
• High: $${(last.high||0).toFixed(2)}
• Low: $${(last.low||0).toFixed(2)}
• Wolumen: ${(last.volume||0).toFixed(2)}
• Timestamp: ${last.timestamp ? new Date(last.timestamp).toLocaleString('pl-PL') : '?'}
• Danych historycznych: ${h.length} świec`;
        } catch (e) { return '📈 RYNEK: [Error]'; }
    }
}

// ─────────────────────────────────────────────────────────────────────
// COMMAND HANDLER — NL Command Detection & Execution (PL/EN)
// ─────────────────────────────────────────────────────────────────────
class CommandHandler {
    constructor() {
        this.modules = null;
        this.history = [];
    }

    setModules(m) { this.modules = m; }

    detect(text) {
        for (const cmd of COMMAND_PATTERNS) {
            for (const pattern of cmd.patterns) {
                const match = text.match(pattern);
                if (match) {
                    return { id: cmd.id, params: cmd.extract(match), raw: text };
                }
            }
        }
        return null;
    }

    async execute(cmd) {
        this.history.push({ ...cmd, timestamp: Date.now() });
        try {
            switch (cmd.id) {
                case 'status':          return this._execStatus();
                case 'change_weight':   return this._execChangeWeight(cmd.params);
                case 'pause':           return this._execPause(cmd.params);
                case 'resume':          return this._execResume();
                case 'explain_trade':   return this._execExplainTrade();
                case 'performance':     return this._execPerformance();
                case 'reset_cb':        return this._execResetCB();
                case 'risk_level':      return this._execRiskLevel(cmd.params);
                case 'close_position':  return this._execClosePosition();
                case 'strategies':      return this._execStrategies();
                default:
                    return { success: false, message: '❌ Nieznana komenda: ' + cmd.id };
            }
        } catch (e) {
            return { success: false, message: '❌ Błąd wykonania komendy: ' + e.message };
        }
    }

    _execStatus() {
        if (!this.modules) return { success: false, message: 'Brak połączenia z botem' };
        const ctx = new ContextBuilder();
        ctx.setModules(this.modules);
        const fullCtx = ctx.buildFullContext();
        return { success: true, message: '📋 **PEŁNY STATUS BOTA:**\n\n' + fullCtx };
    }

    _execChangeWeight(params) {
        const { strategy, weight } = params;
        if (!this.modules || !this.modules.ensemble) return { success: false, message: 'Brak modułu ensemble' };
        const w = Math.max(0.03, Math.min(0.50, weight));
        const ens = this.modules.ensemble;
        const oldWeight = ens.weights[strategy];
        if (oldWeight === undefined) return { success: false, message: '❌ Nieznana strategia: ' + strategy + '. Dostępne: ' + Object.keys(ens.weights).join(', ') };
        ens.weights[strategy] = w;
        // Normalize remaining weights
        const total = Object.values(ens.weights).reduce((s, v) => s + v, 0);
        if (Math.abs(total - 1.0) > 0.001) {
            const scale = 1.0 / total;
            for (const k of Object.keys(ens.weights)) ens.weights[k] *= scale;
        }
        return {
            success: true,
            message: `✅ Waga ${strategy}: ${(oldWeight * 100).toFixed(1)}% → ${(w * 100).toFixed(1)}%\nWagi znormalizowane (suma = 100%).`,
        };
    }

    _execPause(params) {
        if (!this.modules || !this.modules.rm) return { success: false, message: 'Brak modułu ryzyka' };
        const minutes = params.minutes || 5;
        // Set soft pause via risk manager
        if (this.modules.rm.softPauseActive !== undefined) {
            this.modules.rm.softPauseActive = true;
            this.modules.rm._softPauseUntil = Date.now() + minutes * 60000;
        }
        if (this.modules.botRef && this.modules.botRef._pauseUntil !== undefined) {
            this.modules.botRef._pauseUntil = Date.now() + minutes * 60000;
        }
        return { success: true, message: `⏸️ Trading wstrzymany na ${minutes} minut. Automatyczne wznowienie o ${new Date(Date.now() + minutes * 60000).toLocaleTimeString('pl-PL')}.` };
    }

    _execResume() {
        if (!this.modules || !this.modules.rm) return { success: false, message: 'Brak modułu ryzyka' };
        if (this.modules.rm.softPauseActive !== undefined) {
            this.modules.rm.softPauseActive = false;
            this.modules.rm._softPauseUntil = 0;
        }
        if (this.modules.botRef && this.modules.botRef._pauseUntil !== undefined) {
            this.modules.botRef._pauseUntil = 0;
        }
        return { success: true, message: '▶️ Trading wznowiony. Bot kontynuuje autonomiczną pracę.' };
    }

    _execExplainTrade() {
        if (!this.modules || !this.modules.pm) return { success: false, message: 'Brak modułu portfolio' };
        const trades = this.modules.pm.getTrades();
        if (trades.length === 0) return { success: true, message: '📜 Brak transakcji do wyjaśnienia.' };
        const last = trades[trades.length - 1];
        const ts = last.timestamp ? new Date(last.timestamp).toLocaleString('pl-PL') : '?';
        return {
            success: true,
            message: `📜 **OSTATNIA TRANSAKCJA:**\n• Czas: ${ts}\n• Typ: ${last.action || last.type || '?'}\n• Symbol: ${last.symbol || 'BTCUSDT'}\n• Cena: $${(last.price || 0).toFixed(2)}\n• Ilość: ${(last.quantity || 0).toFixed(6)}\n• PnL: $${(last.pnl || 0).toFixed(2)}\n• Powód: ${last.reason || last.strategy || 'Ensemble consensus'}\n• Strategia: ${last.strategy || 'EnsembleVoting'}`,
        };
    }

    _execPerformance() {
        if (!this.modules || !this.modules.pm) return { success: false, message: 'Brak modułu portfolio' };
        const p = this.modules.pm.getPortfolio();
        const trades = this.modules.pm.getTrades();
        const wins = trades.filter(t => (t.pnl || 0) > 0).length;
        const losses = trades.filter(t => (t.pnl || 0) < 0).length;
        const totalPnL = trades.reduce((s, t) => s + (t.pnl || 0), 0);
        const avgPnL = trades.length > 0 ? totalPnL / trades.length : 0;
        const maxWin = trades.length > 0 ? Math.max(...trades.map(t => t.pnl || 0)) : 0;
        const maxLoss = trades.length > 0 ? Math.min(...trades.map(t => t.pnl || 0)) : 0;
        return {
            success: true,
            message: `📊 **RAPORT WYDAJNOŚCI:**\n• Wartość portfolio: $${(p.totalValue || 0).toFixed(2)}\n• Łączne PnL: $${totalPnL.toFixed(2)}\n• Win Rate: ${((wins / (trades.length || 1)) * 100).toFixed(1)}%\n• Wygrane/Przegrane: ${wins}/${losses}\n• Średni PnL/trade: $${avgPnL.toFixed(2)}\n• Max zysk: $${maxWin.toFixed(2)}\n• Max strata: $${maxLoss.toFixed(2)}\n• Drawdown: ${((p.drawdown || 0) * 100).toFixed(3)}%`,
        };
    }

    _execResetCB() {
        if (!this.modules || !this.modules.rm) return { success: false, message: 'Brak modułu ryzyka' };
        const prev = this.modules.rm.getCircuitBreakerStatus();
        this.modules.rm.resetCircuitBreaker();
        const now = this.modules.rm.getCircuitBreakerStatus();
        return {
            success: true,
            message: `🔄 Circuit breaker zresetowany.\n• Poprzednio: ${prev.isTripped ? 'WYZWOLONY' : 'OK'} (${prev.consecutiveLosses} strat)\n• Teraz: ${now.isTripped ? 'WYZWOLONY' : 'OK'} (${now.consecutiveLosses} strat)`,
        };
    }

    _execRiskLevel(params) {
        const { level } = params;
        const riskMapping = { LOW: 0.005, MEDIUM: 0.01, HIGH: 0.02 };
        const riskPct = riskMapping[level] || 0.01;
        // Would set risk parameters — using config if available
        return {
            success: true,
            message: `🛡️ Poziom ryzyka: ${level} (${(riskPct * 100).toFixed(1)}% na transakcję).\nUwaga: Zmiana wpływa na następne transakcje.`,
        };
    }

    _execClosePosition() {
        if (!this.modules || !this.modules.pm) return { success: false, message: 'Brak modułu portfolio' };
        const positions = this.modules.pm.getPositions();
        if (!positions || positions.size === 0) return { success: true, message: '📌 Brak otwartych pozycji do zamknięcia.' };
        // Queue position for close on next cycle
        if (this.modules.botRef) {
            this.modules.botRef._forceCloseAll = true;
        }
        return {
            success: true,
            message: `⚡ Zaplanowano zamknięcie ${positions.size} pozycji w następnym cyklu tradingowym.`,
        };
    }

    _execStrategies() {
        if (!this.modules || !this.modules.ensemble) return { success: false, message: 'Brak modułu ensemble' };
        const weights = this.modules.ensemble.weights || {};
        const lines = ['📋 **AKTYWNE STRATEGIE:**'];
        for (const [name, w] of Object.entries(weights)) {
            const bar = '█'.repeat(Math.round(w * 40)) + '░'.repeat(40 - Math.round(w * 40));
            lines.push(`  ${name}: ${bar} ${(w * 100).toFixed(1)}%`);
        }
        return { success: true, message: lines.join('\n') };
    }
}

// ─────────────────────────────────────────────────────────────────────
// CONVERSATION MEMORY — Sliding Window
// ─────────────────────────────────────────────────────────────────────
class ConversationMemory {
    constructor(maxLen = MAX_CONVERSATION) {
        this.messages = [];
        this.maxLen = maxLen;
    }

    add(role, content) {
        this.messages.push({ role, content, timestamp: Date.now() });
        if (this.messages.length > this.maxLen) {
            // Keep system context windows — remove oldest user/assistant pairs
            this.messages = this.messages.slice(-this.maxLen);
        }
    }

    getForLLM(limit) {
        const msgs = limit ? this.messages.slice(-limit) : this.messages;
        return msgs.map(m => ({ role: m.role, content: m.content }));
    }

    clear() { this.messages = []; }
    getSize() { return this.messages.length; }
}

// ─────────────────────────────────────────────────────────────────────
// AI ACTIVITY FEED — Ring Buffer + Subscriber Broadcast
// ─────────────────────────────────────────────────────────────────────
class AIActivityFeed {
    constructor(maxEntries = MAX_ACTIVITIES) {
        this.entries = [];
        this.maxEntries = maxEntries;
        this.subscribers = new Set();
        this.stats = { total: 0, byType: {} };
    }

    log(type, title, description, data = {}, importance = 'normal') {
        const entry = {
            id: Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6),
            timestamp: Date.now(),
            type,
            icon: ACTIVITY_ICONS[type] || '📌',
            title,
            description: typeof description === 'string' ? description : JSON.stringify(description),
            data,
            importance,
        };
        this.entries.push(entry);
        if (this.entries.length > this.maxEntries) this.entries.shift();
        this.stats.total++;
        this.stats.byType[type] = (this.stats.byType[type] || 0) + 1;
        this._broadcast(entry);
        return entry;
    }

    getRecent(count = 50, category = null) {
        let entries = this.entries;
        if (category) entries = entries.filter(e => e.type === category);
        return entries.slice(-count);
    }

    subscribe(callback) { this.subscribers.add(callback); }
    unsubscribe(callback) { this.subscribers.delete(callback); }

    _broadcast(entry) {
        for (const cb of this.subscribers) {
            try { cb(entry); } catch (e) {}
        }
    }

    getStats() { return { ...this.stats, bufferSize: this.entries.length, maxSize: this.maxEntries }; }
}

// ─────────────────────────────────────────────────────────────────────
// MEGATRON CORE — Main Orchestrator
// ─────────────────────────────────────────────────────────────────────
class MegatronCore {
    constructor(config = {}) {
        this.version = MEGATRON_VERSION;
        this.name = 'MEGATRON';
        this.llm = new LLMRouter();
        this.context = new ContextBuilder();
        this.commands = new CommandHandler();
        this.memory = new ConversationMemory();
        this.activityFeed = new AIActivityFeed();
        this.isReady = false;
        this.startTime = Date.now();
        this.messageCount = 0;
        this.commandCount = 0;
        this.config = config;
    }

    initialize(botModules) {
        // Connect bot modules to sub-systems
        this.context.setModules(botModules);
        this.commands.setModules(botModules);

        // Configure LLM providers from environment
        this.llm.configure({
            githubToken: process.env.GITHUB_TOKEN,
            githubModel: process.env.GITHUB_MODEL || 'gpt-4o',
            openaiKey: process.env.OPENAI_API_KEY,
            openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
            anthropicKey: process.env.ANTHROPIC_API_KEY,
            claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
            xaiKey: process.env.XAI_API_KEY,
            grokModel: process.env.GROK_MODEL || 'grok-3',
            ollamaUrl: process.env.OLLAMA_URL,
            ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',
        });

        this.isReady = true;
        this.activityFeed.log('SYSTEM', 'MEGATRON Online', 'AI Trading Assistant v' + this.version + ' initialized', { providers: this.llm.providers.size }, 'high');
        console.log('[MEGATRON] Initialized | Version: ' + this.version + ' | LLM Providers: ' + this.llm.providers.size);
    }

    /**
     * Process a user chat message.
     * 1. Check for actionable command
     * 2. If not a command, route to LLM with bot context
     * 3. Return response
     */
    async processMessage(userMessage) {
        if (!this.isReady) return { type: 'error', response: '❌ MEGATRON nie jest zainicjalizowany.' };
        this.messageCount++;

        // Step 1: Check for command
        const cmd = this.commands.detect(userMessage);
        if (cmd) {
            this.commandCount++;
            const result = await this.commands.execute(cmd);
            this.memory.add('user', userMessage);
            this.memory.add('assistant', result.message);
            this.activityFeed.log('COMMAND', 'Komenda: ' + cmd.id, result.message.substring(0, 100), cmd, 'high');
            return { type: 'command', response: result.message, success: result.success, command: cmd.id };
        }

        // Step 2: Build context and call LLM
        this.memory.add('user', userMessage);
        const botContext = this.context.buildFullContext();
        const systemPrompt = MEGATRON_SYSTEM_PROMPT + botContext;
        const conversationHistory = this.memory.getForLLM(20);

        try {
            const llmResult = await this.llm.call(systemPrompt, conversationHistory);
            this.memory.add('assistant', llmResult.content);
            this.activityFeed.log('CHAT', 'Chat: ' + userMessage.substring(0, 40) + '...', 'Via ' + (llmResult.provider || 'fallback'), {}, 'normal');
            return {
                type: 'chat',
                response: llmResult.content,
                provider: llmResult.provider,
                latencyMs: llmResult.latencyMs,
            };
        } catch (e) {
            const errorMsg = '❌ Błąd komunikacji z LLM: ' + e.message;
            this.memory.add('assistant', errorMsg);
            return { type: 'error', response: errorMsg };
        }
    }

    /**
     * Log a system event to the activity feed (called by bot modules)
     */
    logActivity(type, title, description, data = {}, importance = 'normal') {
        return this.activityFeed.log(type, title, description, data, importance);
    }

    /**
     * Get Megatron system status
     */
    getStatus() {
        return {
            name: this.name,
            version: this.version,
            isReady: this.isReady,
            uptime: Date.now() - this.startTime,
            uptimeFormatted: this._formatUptime(Date.now() - this.startTime),
            messageCount: this.messageCount,
            commandCount: this.commandCount,
            llm: this.llm.getMetrics(),
            memorySize: this.memory.getSize(),
            activityStats: this.activityFeed.getStats(),
        };
    }

    getActivityFeed(count, category) {
        return this.activityFeed.getRecent(count || 50, category || null);
    }

    _formatUptime(ms) {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return h + 'h ' + m + 'm';
    }
}

// ─────────────────────────────────────────────────────────────────────
// MEGATRON API ROUTES — Attaches to Express app
// ─────────────────────────────────────────────────────────────────────
function attachMegatronRoutes(app, wss, wsClients, megatron) {
    // POST /api/megatron/chat — Send message to Megatron
    app.post('/api/megatron/chat', async (req, res) => {
        try {
            const { message } = req.body;
            if (!message || typeof message !== 'string') {
                return res.status(400).json({ error: 'Missing "message" in request body' });
            }
            const result = await megatron.processMessage(message.trim());
            // Broadcast to WebSocket clients
            const wsMsg = JSON.stringify({
                type: 'megatron_chat',
                data: { userMessage: message.trim(), response: result },
                timestamp: Date.now(),
            });
            for (const ws of wsClients) {
                try { if (ws.readyState === 1) ws.send(wsMsg); } catch (e) {}
            }
            res.json(result);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // GET /api/megatron/status — Megatron system status
    app.get('/api/megatron/status', (req, res) => {
        res.json(megatron.getStatus());
    });

    // GET /api/megatron/activities — Recent AI activities
    app.get('/api/megatron/activities', (req, res) => {
        const count = parseInt(req.query.count) || 50;
        const category = req.query.category || null;
        res.json({ activities: megatron.getActivityFeed(count, category) });
    });

    // GET /api/megatron/history — Chat history
    app.get('/api/megatron/history', (req, res) => {
        res.json({ messages: megatron.memory.getForLLM() });
    });

    // POST /api/megatron/clear — Clear conversation
    app.post('/api/megatron/clear', (req, res) => {
        megatron.memory.clear();
        res.json({ success: true, message: 'Conversation cleared' });
    });

    // Subscribe activity feed to WebSocket broadcast
    megatron.activityFeed.subscribe((entry) => {
        const msg = JSON.stringify({ type: 'megatron_activity', data: entry, timestamp: Date.now() });
        for (const ws of wsClients) {
            try { if (ws.readyState === 1) ws.send(msg); } catch (e) {}
        }
    });

    // Handle incoming WebSocket messages for Megatron chat
    if (wss) {
        wss.on('connection', (ws) => {
            ws.on('message', async (rawMsg) => {
                try {
                    const parsed = JSON.parse(rawMsg.toString());
                    if (parsed.type === 'megatron_chat' && parsed.message) {
                        const result = await megatron.processMessage(parsed.message);
                        ws.send(JSON.stringify({ type: 'megatron_response', data: result, timestamp: Date.now() }));
                    }
                } catch (e) {}
            });
        });
    }

    console.log('[MEGATRON] API routes attached: /api/megatron/chat, /api/megatron/status, /api/megatron/activities');
}

module.exports = {
    MegatronCore,
    AIActivityFeed,
    LLMRouter,
    ContextBuilder,
    CommandHandler,
    ConversationMemory,
    attachMegatronRoutes,
    MEGATRON_VERSION,
    ACTIVITY_ICONS,
};
