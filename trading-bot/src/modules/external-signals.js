'use strict';
/**
 * @module ExternalSignals
 * @description External market data aggregator — COT positioning, economic calendar,
 * whale alerts, FRED macro indicators, CoinGecko market data, news sentiment.
 *
 * Provides:
 *   1. Composite signal for ensemble voting (ExternalSignals voter)
 *   2. Defense mode trigger for high-impact economic events
 *   3. Macro data feed for ML pipeline enrichment
 *
 * PATCH #152B: Initial implementation
 */

const https = require('https');
const http = require('http');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const EXTERNAL_SIGNALS_CONFIG = {
    // Cache TTLs (milliseconds)
    calendarCacheTtlMs: 15 * 60 * 1000,     // 15 min
    whaleAlertCacheTtlMs: 5 * 60 * 1000,    // 5 min
    coinGeckoCacheTtlMs: 2 * 60 * 1000,     // 2 min
    fredCacheTtlMs: 60 * 60 * 1000,         // 1 hour (daily data)
    sentimentCacheTtlMs: 10 * 60 * 1000,    // 10 min
    cotCacheTtlMs: 6 * 60 * 60 * 1000,      // 6 hours (weekly data, released Fridays)

    // Timeouts
    requestTimeoutMs: 5000,

    // Defense mode: minutes before high-impact event to activate
    defenseLeadMinutes: 30,

    // Signal weights within ExternalSignals composite
    // PATCH #152C: COT added as 5th sub-component, weights rebalanced
    subWeights: {
        whale: 0.22,
        sentiment: 0.18,
        macro: 0.22,
        fearGreed: 0.18,
        cot: 0.20,
    },

    // Whale alert thresholds (USD)
    whaleThresholdUsd: 10_000_000,   // $10M+ = whale
    megaWhaleUsd: 50_000_000,        // $50M+ = mega whale

    // High-impact economic events that trigger defense mode
    highImpactEvents: [
        'CPI', 'Consumer Price Index',
        'FOMC', 'Federal Funds Rate', 'Interest Rate Decision',
        'NFP', 'Non-Farm Payrolls', 'Nonfarm Payrolls',
        'GDP', 'Gross Domestic Product',
        'PCE', 'Core PCE',
        'PPI', 'Producer Price Index',
        'Unemployment Rate',
        'Retail Sales',
        'ISM Manufacturing',
        'Jackson Hole',
    ],
};

// ═══════════════════════════════════════════════════════════════
// HTTP UTILS
// ═══════════════════════════════════════════════════════════════

function fetchJSON(url, timeoutMs = EXTERNAL_SIGNALS_CONFIG.requestTimeoutMs) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, { timeout: timeoutMs }, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                res.resume();
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Invalid JSON')); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

// ═══════════════════════════════════════════════════════════════
// EXTERNAL SIGNALS SERVICE
// ═══════════════════════════════════════════════════════════════

class ExternalSignals {
    constructor(config = {}) {
        this.config = { ...EXTERNAL_SIGNALS_CONFIG, ...config };
        this.isReady = false;

        // API keys from environment
        this._fredApiKey = process.env.FRED_API_KEY || '';
        this._marketAuxApiKey = process.env.MARKETAUX_API_KEY || '';

        // Cached data
        this._cache = {
            calendar: { data: null, ts: 0 },
            whaleAlert: { data: null, ts: 0 },
            coinGecko: { data: null, ts: 0 },
            fred: { data: null, ts: 0 },
            sentiment: { data: null, ts: 0 },
            fearGreed: { data: null, ts: 0 },
            cot: { data: null, ts: 0 },
        };

        // Defense mode state
        this._defenseActive = false;
        this._defenseReason = '';
        this._defenseUntil = 0;

        // Last composite signal
        this._lastSignal = null;
        this._lastFetchTs = 0;
        this._fetchErrors = 0;
        this._fetchSuccesses = 0;

        console.log('[EXTERNAL] ExternalSignals module initialized');
        this.isReady = true;
    }

    // ───────────────────────────────────────────────────
    // PUBLIC API
    // ───────────────────────────────────────────────────

    /**
     * Generate composite external signal for ensemble voting.
     * @param {string} symbol - Trading pair (e.g. 'BTCUSDT')
     * @param {number} currentPrice - Current market price
     * @returns {object|null} Signal { action, confidence, ... } or null
     */
    async generateSignal(symbol, currentPrice) {
        try {
            // Parallel fetch all data sources (non-blocking, cached)
            const [fearGreed, whaleData, macroData, sentimentData, cotData] = await Promise.allSettled([
                this._fetchFearGreedIndex(),
                this._fetchWhaleAlerts(symbol),
                this._fetchFredMacro(),
                this._fetchNewsSentiment(symbol),
                this._fetchCOTData(symbol),
            ]);

            // Also check calendar (defense mode)
            await this._checkEconomicCalendar();

            // Build composite signal
            const components = {};
            let totalWeight = 0;
            let weightedBias = 0; // -1 = strong sell, +1 = strong buy

            // Fear & Greed Index
            if (fearGreed.status === 'fulfilled' && fearGreed.value) {
                const fgBias = this._interpretFearGreed(fearGreed.value);
                components.fearGreed = fgBias;
                weightedBias += fgBias.bias * this.config.subWeights.fearGreed;
                totalWeight += this.config.subWeights.fearGreed;
            }

            // Whale alerts
            if (whaleData.status === 'fulfilled' && whaleData.value) {
                const whaleBias = this._interpretWhaleAlert(whaleData.value);
                components.whale = whaleBias;
                weightedBias += whaleBias.bias * this.config.subWeights.whale;
                totalWeight += this.config.subWeights.whale;
            }

            // FRED macro indicators
            if (macroData.status === 'fulfilled' && macroData.value) {
                const macroBias = this._interpretMacro(macroData.value);
                components.macro = macroBias;
                weightedBias += macroBias.bias * this.config.subWeights.macro;
                totalWeight += this.config.subWeights.macro;
            }

            // News sentiment
            if (sentimentData.status === 'fulfilled' && sentimentData.value) {
                const sentBias = this._interpretSentiment(sentimentData.value);
                components.sentiment = sentBias;
                weightedBias += sentBias.bias * this.config.subWeights.sentiment;
                totalWeight += this.config.subWeights.sentiment;
            }

            // COT positioning (Commitments of Traders)
            if (cotData.status === 'fulfilled' && cotData.value) {
                const cotBias = this._interpretCOT(cotData.value);
                components.cot = cotBias;
                weightedBias += cotBias.bias * this.config.subWeights.cot;
                totalWeight += this.config.subWeights.cot;
            }

            if (totalWeight === 0) {
                this._fetchErrors++;
                return null; // No data available
            }

            // Normalize bias to [-1, +1]
            const normalizedBias = weightedBias / totalWeight;

            // Convert bias to action + confidence
            let action = 'HOLD';
            let confidence = Math.abs(normalizedBias);

            if (normalizedBias > 0.10) action = 'BUY';
            else if (normalizedBias < -0.10) action = 'SELL';

            // Defense mode override: force HOLD with low confidence
            if (this._defenseActive) {
                action = 'HOLD';
                confidence = Math.min(confidence, 0.20);
            }

            // Minimum confidence filter
            if (confidence < 0.15) {
                action = 'HOLD';
            }

            const signal = {
                timestamp: Date.now(),
                symbol,
                action,
                price: currentPrice,
                quantity: 0,
                confidence: Math.min(0.85, confidence),
                strategy: 'ExternalSignals',
                reasoning: this._buildReasoning(components, normalizedBias),
                riskLevel: 1,
                metadata: {
                    components,
                    normalizedBias,
                    defenseActive: this._defenseActive,
                    defenseReason: this._defenseReason,
                    dataSources: Object.keys(components).length,
                },
            };

            this._lastSignal = signal;
            this._lastFetchTs = Date.now();
            this._fetchSuccesses++;
            return signal;

        } catch (e) {
            this._fetchErrors++;
            console.warn('[EXTERNAL] Signal generation error:', e.message);
            return null;
        }
    }

    /**
     * Check if defense mode is active (economic calendar trigger).
     * Used by risk-manager to reduce position sizing.
     * @returns {{ active: boolean, reason: string, minutesLeft: number }}
     */
    getDefenseStatus() {
        if (this._defenseActive && Date.now() > this._defenseUntil) {
            this._defenseActive = false;
            this._defenseReason = '';
            console.log('[EXTERNAL] ✅ Calendar defense mode expired');
        }
        return {
            active: this._defenseActive,
            reason: this._defenseReason,
            minutesLeft: this._defenseActive
                ? Math.max(0, Math.ceil((this._defenseUntil - Date.now()) / 60000))
                : 0,
        };
    }

    /**
     * Get macro data enrichment for ML pipeline.
     * @returns {object} Key macro indicators for feature injection
     */
    getMacroFeatures() {
        const fred = this._cache.fred.data;
        const fg = this._cache.fearGreed.data;
        const cot = this._cache.cot.data;

        return {
            fear_greed_index: fg ? fg.value : null,
            fear_greed_classification: fg ? fg.classification : null,
            dxy_trend: fred ? fred.dxyTrend : null,
            treasury_10y: fred ? fred.treasury10y : null,
            vix_level: fred ? fred.vix : null,
            calendar_defense: this._defenseActive ? 1 : 0,
            // PATCH #152C: COT features for ML
            cot_mm_net_ratio: cot ? cot.mmNetRatio : null,
            cot_mm_net_change: cot ? cot.mmNetChange : null,
            cot_oi_change: cot ? cot.oiChangePercent : null,
        };
    }

    /**
     * Get status for monitoring/dashboard.
     */
    getStatus() {
        return {
            isReady: this.isReady,
            lastFetchTs: this._lastFetchTs,
            fetchErrors: this._fetchErrors,
            fetchSuccesses: this._fetchSuccesses,
            defenseActive: this._defenseActive,
            defenseReason: this._defenseReason,
            cachedSources: Object.entries(this._cache)
                .filter(([, v]) => v.data !== null)
                .map(([k]) => k),
            lastSignal: this._lastSignal
                ? { action: this._lastSignal.action, confidence: this._lastSignal.confidence }
                : null,
        };
    }

    // ───────────────────────────────────────────────────
    // DATA FETCHERS (with caching)
    // ───────────────────────────────────────────────────

    async _fetchFearGreedIndex() {
        const cache = this._cache.fearGreed;
        if (cache.data && (Date.now() - cache.ts) < this.config.coinGeckoCacheTtlMs) {
            return cache.data;
        }
        try {
            // Alternative Fear & Greed API (free, no key)
            const data = await fetchJSON('https://api.alternative.me/fng/?limit=1');
            if (data && data.data && data.data[0]) {
                const fgData = {
                    value: parseInt(data.data[0].value, 10),
                    classification: data.data[0].value_classification,
                    timestamp: parseInt(data.data[0].timestamp, 10) * 1000,
                };
                cache.data = fgData;
                cache.ts = Date.now();
                return fgData;
            }
        } catch (e) {
            console.warn('[EXTERNAL] Fear & Greed fetch error:', e.message);
        }
        return cache.data;
    }

    async _fetchWhaleAlerts(symbol) {
        const cache = this._cache.whaleAlert;
        if (cache.data && (Date.now() - cache.ts) < this.config.whaleAlertCacheTtlMs) {
            return cache.data;
        }
        try {
            // CoinGecko free API: large transactions via market data proxy
            // We use CoinGecko market data as whale sentiment proxy
            const coin = this._symbolToCoinId(symbol);
            if (!coin) return cache.data;

            const data = await fetchJSON(
                `https://api.coingecko.com/api/v3/coins/${coin}?localization=false&tickers=false&community_data=false&developer_data=false`
            );
            if (data && data.market_data) {
                const whaleData = {
                    volume24h: data.market_data.total_volume?.usd || 0,
                    volumeChange24h: data.market_data.total_volume?.usd
                        ? ((data.market_data.total_volume.usd /
                            (data.market_data.total_volume.usd / (1 + (data.market_data.price_change_percentage_24h || 0) / 100))) - 1)
                        : 0,
                    marketCapRank: data.market_cap_rank || 999,
                    priceChange24h: data.market_data.price_change_percentage_24h || 0,
                    priceChange7d: data.market_data.price_change_percentage_7d || 0,
                    priceChange30d: data.market_data.price_change_percentage_30d || 0,
                    athRatio: data.market_data.current_price?.usd && data.market_data.ath?.usd
                        ? data.market_data.current_price.usd / data.market_data.ath.usd
                        : null,
                    sentiment_votes_up_percentage: data.sentiment_votes_up_percentage || 50,
                };
                cache.data = whaleData;
                cache.ts = Date.now();
                return whaleData;
            }
        } catch (e) {
            console.warn('[EXTERNAL] CoinGecko/Whale data error:', e.message);
        }
        return cache.data;
    }

    async _fetchFredMacro() {
        const cache = this._cache.fred;
        if (cache.data && (Date.now() - cache.ts) < this.config.fredCacheTtlMs) {
            return cache.data;
        }

        if (!this._fredApiKey) return cache.data;

        try {
            // Fetch DXY (Dollar Index proxy via DGS10 + DFF)
            // FRED series: DFF = Federal Funds Rate, DGS10 = 10-Year Treasury
            const [dffRes, dgs10Res] = await Promise.allSettled([
                fetchJSON(`https://api.stlouisfed.org/fred/series/observations?series_id=DFF&api_key=${encodeURIComponent(this._fredApiKey)}&file_type=json&sort_order=desc&limit=5`),
                fetchJSON(`https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${encodeURIComponent(this._fredApiKey)}&file_type=json&sort_order=desc&limit=5`),
            ]);

            const fredData = { dxyTrend: null, treasury10y: null, fedFundsRate: null, vix: null };

            if (dffRes.status === 'fulfilled' && dffRes.value?.observations?.[0]) {
                const val = parseFloat(dffRes.value.observations[0].value);
                if (!isNaN(val)) fredData.fedFundsRate = val;
            }
            if (dgs10Res.status === 'fulfilled' && dgs10Res.value?.observations?.[0]) {
                const vals = dgs10Res.value.observations
                    .map(o => parseFloat(o.value))
                    .filter(v => !isNaN(v));
                if (vals.length >= 2) {
                    fredData.treasury10y = vals[0];
                    // Rising yields = bearish for risk assets
                    fredData.dxyTrend = vals[0] > vals[vals.length - 1] ? 'rising' : 'falling';
                }
            }

            cache.data = fredData;
            cache.ts = Date.now();
            return fredData;
        } catch (e) {
            console.warn('[EXTERNAL] FRED macro fetch error:', e.message);
        }
        return cache.data;
    }

    async _fetchNewsSentiment(symbol) {
        const cache = this._cache.sentiment;
        if (cache.data && (Date.now() - cache.ts) < this.config.sentimentCacheTtlMs) {
            return cache.data;
        }

        if (!this._marketAuxApiKey) {
            // Fallback: use CoinGecko sentiment if MarketAux unavailable
            return this._cache.whaleAlert.data
                ? { sentimentScore: (this._cache.whaleAlert.data.sentiment_votes_up_percentage - 50) / 50 }
                : null;
        }

        try {
            const ticker = this._symbolToTicker(symbol);
            const data = await fetchJSON(
                `https://api.marketaux.com/v1/news/all?symbols=${encodeURIComponent(ticker)}&filter_entities=true&language=en&api_token=${encodeURIComponent(this._marketAuxApiKey)}&limit=5`
            );
            if (data && data.data && data.data.length > 0) {
                // Average sentiment across recent articles
                let totalSentiment = 0;
                let count = 0;
                for (const article of data.data) {
                    if (article.entities) {
                        for (const entity of article.entities) {
                            if (entity.sentiment_score !== undefined) {
                                totalSentiment += entity.sentiment_score;
                                count++;
                            }
                        }
                    }
                }
                const sentimentData = {
                    sentimentScore: count > 0 ? totalSentiment / count : 0, // [-1, +1]
                    articleCount: data.data.length,
                };
                cache.data = sentimentData;
                cache.ts = Date.now();
                return sentimentData;
            }
        } catch (e) {
            console.warn('[EXTERNAL] MarketAux sentiment error:', e.message);
        }
        return cache.data;
    }

    /**
     * PATCH #152C: Fetch COT (Commitments of Traders) data.
     * Uses CFTC proxy API for Bitcoin CME futures positioning.
     * COT data reveals institutional long/short positioning — smart money signal.
     * Released weekly (Fridays), data is from Tuesday.
     */
    async _fetchCOTData(symbol) {
        const cache = this._cache.cot;
        if (cache.data && (Date.now() - cache.ts) < this.config.cotCacheTtlMs) {
            return cache.data;
        }

        // COT is only available for Bitcoin (CME futures)
        const cotSymbol = this._symbolToCOTContract(symbol);
        if (!cotSymbol) return cache.data;

        try {
            // CFTC Disaggregated Reports via open data API (free, no key)
            // Bitcoin CME contract code: 133741 (BTC futures)
            const data = await fetchJSON(
                `https://publicreporting.cftc.gov/resource/jun7-fc8e.json?$where=cftc_contract_market_code='${cotSymbol}'&$order=report_date_as_yyyy_mm_dd DESC&$limit=4`
            );

            if (data && data.length > 0) {
                const latest = data[0];
                const prev = data.length > 1 ? data[1] : null;

                // Disaggregated: Money Managers are the "smart money" for crypto
                const mmLong = parseFloat(latest.m_money_positions_long_all || 0);
                const mmShort = parseFloat(latest.m_money_positions_short_all || 0);
                const mmTotal = mmLong + mmShort;

                // Net positioning ratio: +1 = all long, -1 = all short
                const netRatio = mmTotal > 0 ? (mmLong - mmShort) / mmTotal : 0;

                // Change from previous week
                let netChange = 0;
                if (prev) {
                    const prevLong = parseFloat(prev.m_money_positions_long_all || 0);
                    const prevShort = parseFloat(prev.m_money_positions_short_all || 0);
                    const prevTotal = prevLong + prevShort;
                    const prevRatio = prevTotal > 0 ? (prevLong - prevShort) / prevTotal : 0;
                    netChange = netRatio - prevRatio;
                }

                // Open Interest
                const oi = parseFloat(latest.open_interest_all || 0);
                const prevOi = prev ? parseFloat(prev.open_interest_all || 0) : oi;
                const oiChange = prevOi > 0 ? (oi - prevOi) / prevOi : 0;

                // Dealer/Intermediary (counterparty to money managers)
                const dealerLong = parseFloat(latest.dealer_positions_long_all || 0);
                const dealerShort = parseFloat(latest.dealer_positions_short_all || 0);

                const cotData = {
                    reportDate: latest.report_date_as_yyyy_mm_dd,
                    mmNetRatio: netRatio,          // Money Manager net: [-1, +1]
                    mmNetChange: netChange,        // Week-over-week change
                    mmLong, mmShort,
                    dealerLong, dealerShort,
                    openInterest: oi,
                    oiChangePercent: oiChange,
                };

                cache.data = cotData;
                cache.ts = Date.now();
                if (this._fetchSuccesses % 20 === 0) {
                    console.log(`[EXTERNAL] COT update: MM net=${(netRatio * 100).toFixed(1)}% chg=${(netChange * 100).toFixed(1)}pp OI=${oi.toFixed(0)}`);
                }
                return cotData;
            }
        } catch (e) {
            // COT API may be slow or unavailable — non-critical
            console.warn('[EXTERNAL] COT data error:', e.message);
        }
        return cache.data;
    }

    async _checkEconomicCalendar() {
        const cache = this._cache.calendar;
        if (cache.data && (Date.now() - cache.ts) < this.config.calendarCacheTtlMs) {
            // Re-evaluate defense from cached data
            this._evaluateDefenseMode(cache.data);
            return cache.data;
        }

        try {
            // Use free nager.date API for upcoming events or a static built-in schedule
            // Since most free economics calendar APIs require keys, we use a built-in
            // high-impact event schedule as primary source
            const events = this._getUpcomingHighImpactEvents();
            cache.data = events;
            cache.ts = Date.now();
            this._evaluateDefenseMode(events);
            return events;
        } catch (e) {
            console.warn('[EXTERNAL] Calendar check error:', e.message);
        }
        return cache.data;
    }

    // ───────────────────────────────────────────────────
    // SIGNAL INTERPRETATION
    // ───────────────────────────────────────────────────

    _interpretFearGreed(fgData) {
        // Fear & Greed: 0=Extreme Fear, 100=Extreme Greed
        // Contrarian: extreme fear = buy opportunity, extreme greed = sell signal
        const value = fgData.value;
        let bias = 0;
        let desc = fgData.classification;

        if (value <= 20) { bias = 0.5; desc = 'Extreme Fear (contrarian BUY)'; }
        else if (value <= 35) { bias = 0.25; desc = 'Fear (mild BUY)'; }
        else if (value >= 80) { bias = -0.5; desc = 'Extreme Greed (contrarian SELL)'; }
        else if (value >= 65) { bias = -0.25; desc = 'Greed (mild SELL)'; }
        else { bias = 0; desc = 'Neutral'; }

        return { bias, value, desc, source: 'FearGreed' };
    }

    _interpretWhaleAlert(whaleData) {
        let bias = 0;
        const reasons = [];

        // Volume spike: high volume = continuation or reversal confirmation
        if (whaleData.priceChange24h > 3 && whaleData.volumeChange24h > 0.20) {
            bias += 0.3;
            reasons.push('High vol + bullish momentum');
        } else if (whaleData.priceChange24h < -3 && whaleData.volumeChange24h > 0.20) {
            bias -= 0.3;
            reasons.push('High vol + bearish momentum');
        }

        // Multi-timeframe trend
        if (whaleData.priceChange7d > 5 && whaleData.priceChange30d > 10) {
            bias += 0.2;
            reasons.push('Strong uptrend 7d+30d');
        } else if (whaleData.priceChange7d < -5 && whaleData.priceChange30d < -10) {
            bias -= 0.2;
            reasons.push('Strong downtrend 7d+30d');
        }

        // ATH proximity: near ATH = caution, far from ATH = opportunity
        if (whaleData.athRatio !== null) {
            if (whaleData.athRatio > 0.95) {
                bias -= 0.15;
                reasons.push('Near ATH (>95%)');
            } else if (whaleData.athRatio < 0.50) {
                bias += 0.15;
                reasons.push('Far from ATH (<50%)');
            }
        }

        // CoinGecko sentiment
        const sentUp = whaleData.sentiment_votes_up_percentage || 50;
        if (sentUp > 70) bias += 0.1;
        else if (sentUp < 30) bias -= 0.1;

        bias = Math.max(-1, Math.min(1, bias));
        return { bias, desc: reasons.join('; ') || 'Neutral', source: 'Whale/CoinGecko' };
    }

    _interpretMacro(fredData) {
        let bias = 0;
        const reasons = [];

        // Rising yields = tighter liquidity = bearish for crypto
        if (fredData.dxyTrend === 'rising') {
            bias -= 0.3;
            reasons.push('Rising yields (bearish liquidity)');
        } else if (fredData.dxyTrend === 'falling') {
            bias += 0.3;
            reasons.push('Falling yields (bullish liquidity)');
        }

        // Very high Fed Funds Rate = hawkish = bearish
        if (fredData.fedFundsRate !== null) {
            if (fredData.fedFundsRate > 5.0) {
                bias -= 0.2;
                reasons.push('FFR>5% (hawkish)');
            } else if (fredData.fedFundsRate < 2.0) {
                bias += 0.2;
                reasons.push('FFR<2% (dovish)');
            }
        }

        bias = Math.max(-1, Math.min(1, bias));
        return { bias, desc: reasons.join('; ') || 'Neutral macro', source: 'FRED' };
    }

    _interpretSentiment(sentimentData) {
        const score = sentimentData.sentimentScore || 0; // [-1, +1]
        const bias = score * 0.5; // Scale down — news sentiment is noisy
        return {
            bias: Math.max(-1, Math.min(1, bias)),
            desc: `Sentiment: ${score.toFixed(2)} (${sentimentData.articleCount || 0} articles)`,
            source: 'News',
        };
    }

    /**
     * PATCH #152C: Interpret COT (Commitments of Traders) positioning.
     * Money Managers increasing longs = institutional bullish conviction.
     * Net change from previous week is more informative than absolute level.
     */
    _interpretCOT(cotData) {
        let bias = 0;
        const reasons = [];

        // Money Manager net positioning
        const netRatio = cotData.mmNetRatio || 0;
        const netChange = cotData.mmNetChange || 0;
        const oiChange = cotData.oiChangePercent || 0;

        // Net positioning level (primary signal)
        if (netRatio > 0.30) {
            bias += 0.25;
            reasons.push(`MM strong long (${(netRatio * 100).toFixed(0)}%)`);
        } else if (netRatio > 0.10) {
            bias += 0.10;
            reasons.push(`MM mild long (${(netRatio * 100).toFixed(0)}%)`);
        } else if (netRatio < -0.30) {
            bias -= 0.25;
            reasons.push(`MM strong short (${(netRatio * 100).toFixed(0)}%)`);
        } else if (netRatio < -0.10) {
            bias -= 0.10;
            reasons.push(`MM mild short (${(netRatio * 100).toFixed(0)}%)`);
        }

        // Weekly change (momentum of positioning — most actionable signal)
        if (netChange > 0.10) {
            bias += 0.30;
            reasons.push(`Aggressively adding longs (+${(netChange * 100).toFixed(1)}pp)`);
        } else if (netChange > 0.03) {
            bias += 0.15;
            reasons.push(`Adding longs (+${(netChange * 100).toFixed(1)}pp)`);
        } else if (netChange < -0.10) {
            bias -= 0.30;
            reasons.push(`Aggressively adding shorts (${(netChange * 100).toFixed(1)}pp)`);
        } else if (netChange < -0.03) {
            bias -= 0.15;
            reasons.push(`Adding shorts (${(netChange * 100).toFixed(1)}pp)`);
        }

        // Open interest change: rising OI + rising price = bullish confirmation
        if (oiChange > 0.05 && netChange > 0) {
            bias += 0.10;
            reasons.push('↑ OI confirms long buildup');
        } else if (oiChange > 0.05 && netChange < 0) {
            bias -= 0.10;
            reasons.push('↑ OI confirms short buildup');
        } else if (oiChange < -0.05) {
            // Declining OI = position liquidation, reduce conviction
            bias *= 0.7;
            reasons.push('↓ OI (liquidation)');
        }

        bias = Math.max(-1, Math.min(1, bias));
        return {
            bias,
            desc: reasons.join('; ') || 'COT neutral',
            source: 'COT/CFTC',
            reportDate: cotData.reportDate,
        };
    }

    // ───────────────────────────────────────────────────
    // DEFENSE MODE (ECONOMIC CALENDAR)
    // ───────────────────────────────────────────────────

    /**
     * Built-in schedule of recurring high-impact US economic events.
     * Updated monthly — dates for current and next month.
     * This serves as a reliable fallback when API is unavailable.
     */
    _getUpcomingHighImpactEvents() {
        const now = new Date();
        const events = [];

        // Generate recurring monthly events (approximate dates)
        // CPI: ~10-13th of each month
        // FOMC: 8 meetings/year (~every 6 weeks)
        // NFP: first Friday of each month
        // GDP: end of month (quarterly)

        for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
            const year = now.getFullYear();
            const month = now.getMonth() + monthOffset;
            const d = new Date(year, month, 1);

            // NFP: first Friday
            const firstDay = d.getDay();
            const firstFriday = firstDay <= 5 ? (5 - firstDay + 1) : (12 - firstDay + 1);
            events.push({
                name: 'NFP',
                date: new Date(year, month, firstFriday, 13, 30, 0), // 8:30 ET = 13:30 UTC
                impact: 'high',
            });

            // CPI: typically 12th-14th
            events.push({
                name: 'CPI',
                date: new Date(year, month, 13, 13, 30, 0),
                impact: 'high',
            });

            // FOMC: roughly every 6 weeks (months: 1,3,5,6,7,9,11,12)
            const fomcMonths = [0, 2, 4, 5, 6, 8, 10, 11];
            if (fomcMonths.includes(month % 12)) {
                // FOMC typically mid-month on Wednesday
                events.push({
                    name: 'FOMC',
                    date: new Date(year, month, 18, 19, 0, 0), // 2:00 PM ET = 19:00 UTC
                    impact: 'high',
                });
            }

            // GDP: last Thursday of month (quarterly: 1,4,7,10)
            const gdpMonths = [0, 3, 6, 9];
            if (gdpMonths.includes(month % 12)) {
                events.push({
                    name: 'GDP',
                    date: new Date(year, month, 27, 13, 30, 0),
                    impact: 'high',
                });
            }

            // PCE: last Friday of month
            const lastDay = new Date(year, month + 1, 0).getDate();
            const lastDayOfWeek = new Date(year, month, lastDay).getDay();
            const lastFriday = lastDay - (lastDayOfWeek >= 5 ? lastDayOfWeek - 5 : lastDayOfWeek + 2);
            events.push({
                name: 'PCE',
                date: new Date(year, month, lastFriday, 13, 30, 0),
                impact: 'high',
            });
        }

        // Filter to upcoming events only (within next 48h for relevance)
        const upcoming = events
            .filter(e => e.date > now && (e.date - now) < 48 * 60 * 60 * 1000)
            .sort((a, b) => a.date - b.date);

        return upcoming;
    }

    _evaluateDefenseMode(events) {
        if (!events || events.length === 0) {
            // No upcoming events — check if defense should expire
            if (this._defenseActive && Date.now() > this._defenseUntil) {
                this._defenseActive = false;
                this._defenseReason = '';
            }
            return;
        }

        const now = Date.now();
        const leadMs = this.config.defenseLeadMinutes * 60 * 1000;
        const postEventMs = 15 * 60 * 1000; // 15 min post-event volatility window

        for (const event of events) {
            const eventMs = event.date.getTime();
            const timeToEvent = eventMs - now;

            // Activate defense mode if within lead time window
            if (timeToEvent > 0 && timeToEvent <= leadMs) {
                if (!this._defenseActive) {
                    console.log(`[EXTERNAL] 🛡️ DEFENSE MODE ACTIVATED: ${event.name} in ${Math.ceil(timeToEvent / 60000)} minutes`);
                }
                this._defenseActive = true;
                this._defenseReason = `${event.name} in ${Math.ceil(timeToEvent / 60000)}min`;
                this._defenseUntil = eventMs + postEventMs;
                return;
            }

            // Still in post-event volatility window
            if (timeToEvent < 0 && Math.abs(timeToEvent) < postEventMs) {
                if (!this._defenseActive) {
                    console.log(`[EXTERNAL] 🛡️ DEFENSE MODE: Post-${event.name} volatility window`);
                }
                this._defenseActive = true;
                this._defenseReason = `Post-${event.name} volatility`;
                this._defenseUntil = eventMs + postEventMs;
                return;
            }
        }

        // No events in window — deactivate
        if (this._defenseActive && now > this._defenseUntil) {
            this._defenseActive = false;
            this._defenseReason = '';
            console.log('[EXTERNAL] ✅ Calendar defense mode deactivated');
        }
    }

    // ───────────────────────────────────────────────────
    // UTILITIES
    // ───────────────────────────────────────────────────

    _symbolToCoinId(symbol) {
        const map = {
            'BTCUSDT': 'bitcoin', 'ETHUSDT': 'ethereum',
            'SOLUSDT': 'solana', 'BNBUSDT': 'binancecoin',
            'XRPUSDT': 'ripple',
        };
        return map[symbol] || null;
    }

    _symbolToTicker(symbol) {
        const map = {
            'BTCUSDT': 'BTCUSD', 'ETHUSDT': 'ETHUSD',
            'SOLUSDT': 'SOLUSD', 'BNBUSDT': 'BNBUSD',
            'XRPUSDT': 'XRPUSD',
        };
        return map[symbol] || symbol;
    }

    /**
     * PATCH #152C: Map trading symbol to CFTC COT contract code.
     * Only BTC has a CME futures contract with CFTC COT reporting.
     * ETH CME futures exist but COT data is less reliable.
     */
    _symbolToCOTContract(symbol) {
        const map = {
            'BTCUSDT': '133741',  // CME Bitcoin Futures
            'ETHUSDT': '244077',  // CME Ether Futures (smaller market)
        };
        return map[symbol] || null;
    }

    _buildReasoning(components, normalizedBias) {
        const parts = [];
        for (const [key, val] of Object.entries(components)) {
            if (val.desc) parts.push(`${val.source || key}: ${val.desc}`);
        }
        const direction = normalizedBias > 0.10 ? 'BULLISH' : normalizedBias < -0.10 ? 'BEARISH' : 'NEUTRAL';
        return `External ${direction} (bias: ${normalizedBias.toFixed(3)}) | ${parts.join(' | ')}`;
    }
}

module.exports = { ExternalSignals, EXTERNAL_SIGNALS_CONFIG };
