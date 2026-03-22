'use strict';

/**
 * 🧠 ML Client — Communicates with Python ML Service
 * 
 * Replaces: GRU PricePredictor (3K params), VQC, QMC CPU simulations
 * Protocol: HTTP POST to ML service (locally or via SSH tunnel)
 * Inference: ~5ms XGBoost + optional ~300ms Ollama validation
 * 
 * PATCH #58: Added LLM validation + sentiment analysis endpoints
 * 
 * Integration:
 *   - bot.js adds 'PythonML' signal to allSignals Map
 *   - Signal weight: 0.25 (tunable via Thompson Sampling)
 *   - ML acts as signal FILTER: validates/vetoes strategy signals
 *   - LLM validates ML signals (agree/disagree/veto)
 *   - Sentiment modifies confidence (contrarian logic)
 * 
 * @module ml_client
 */

const http = require('http');
const https = require('https');

class MLClient {
    /**
     * @param {Object} config
     * @param {string} config.mlServiceUrl - ML service URL (default: http://127.0.0.1:4000)
     * @param {number} config.timeoutMs - Request timeout (default: 3000ms)
     * @param {boolean} config.enabled - Enable/disable ML predictions
     */
    constructor(config = {}) {
        this.serviceUrl = config.mlServiceUrl || process.env.ML_SERVICE_URL || 'http://127.0.0.1:4000';
        this.timeoutMs = config.timeoutMs || 3000;
        this.enabled = config.enabled !== false;
        
        this.isOnline = false;
        this.lastPrediction = null;
        this.lastHealthCheck = null;
        
        this.stats = {
            calls: 0,
            successes: 0,
            failures: 0,
            avgLatencyMs: 0,
            totalLatencyMs: 0,
            lastError: null,
            lastErrorTime: null,
        };
        
        // Health check interval (every 60s)
        this._healthInterval = null;
    }

    /**
     * Initialize the ML client and check connectivity.
     */
    async init() {
        if (!this.enabled) {
            console.log('[ML Client] Disabled via config');
            return false;
        }

        console.log(`[ML Client] Connecting to ${this.serviceUrl}...`);
        
        try {
            const health = await this._get('/health');
            this.isOnline = true;
            this.lastHealthCheck = health;
            console.log(`[ML Client] ✅ Connected | Model trained: ${health.model_trained} | Features: ${health.feature_count}`);
            
            // Start periodic health checks
            this._healthInterval = setInterval(async () => {
                try {
                    const h = await this._get('/health');
                    this.isOnline = true;
                    this.lastHealthCheck = h;
                } catch (e) {
                    this.isOnline = false;
                }
            }, 60000);
            
            return true;
        } catch (e) {
            this.isOnline = false;
            console.warn(`[ML Client] ⚠️ ML service unavailable at ${this.serviceUrl}: ${e.message}`);
            console.warn('[ML Client] Bot will run without ML predictions (fallback to strategy ensemble)');
            
            // PATCH #150A: Start health check even on failed init — auto-reconnect when ML service comes up
            this._healthInterval = setInterval(async () => {
                try {
                    const h = await this._get('/health');
                    this.isOnline = true;
                    this.lastHealthCheck = h;
                    console.log(`[ML Client] ✅ Reconnected | Model trained: ${h.model_trained}`);
                } catch (_) {
                    this.isOnline = false;
                }
            }, 60000);
            
            return false;
        }
    }

    /**
     * Get ML prediction for current market state.
     * 
     * @param {Array} candles - OHLCV candle array (last 200+)
     * @param {number} portfolioValue - Current portfolio value
     * @param {boolean} hasPosition - Whether bot has open position
     * @param {string} regime - Current market regime (from NeuralAI)
     * @param {string} strategySignal - Strategy consensus signal ('BUY'/'SELL'/'HOLD')
     * @param {number} strategyConfidence - Strategy confidence (0-1)
     * @returns {Object|null} ML prediction or null if unavailable
     */
    async predict(candles, portfolioValue, hasPosition, regime, strategySignal, strategyConfidence) {
        if (!this.enabled || !this.isOnline) {
            return null;
        }

        const t0 = Date.now();
        this.stats.calls++;

        try {
            // Send last 200 candles (min 50)
            const candleSlice = candles.slice(-200).map(c => ({
                open: c.open || c.o,
                high: c.high || c.h,
                low: c.low || c.l,
                close: c.close || c.c,
                volume: c.volume || c.v || 0,
                timestamp: c.timestamp || c.time || null,
            }));

            const result = await this._post('/predict', {
                candles: candleSlice,
                portfolio_value: portfolioValue,
                has_position: hasPosition,
                current_regime: regime || 'UNKNOWN',
                strategy_signal: strategySignal || null,
                strategy_confidence: strategyConfidence || null,
            });

            const latencyMs = Date.now() - t0;
            this.stats.successes++;
            this.stats.totalLatencyMs += latencyMs;
            this.stats.avgLatencyMs = this.stats.totalLatencyMs / this.stats.successes;

            this.lastPrediction = {
                ...result,
                receivedAt: new Date().toISOString(),
                latencyMs,
            };

            return result;
        } catch (e) {
            this.stats.failures++;
            this.stats.lastError = e.message;
            this.stats.lastErrorTime = new Date().toISOString();
            
            // After 5 consecutive failures, mark offline
            if (this.stats.failures > 5 && this.stats.successes === 0) {
                this.isOnline = false;
            }
            
            return null; // Fallback: bot uses ensemble without ML
        }
    }

    /**
     * Create a trading signal from ML prediction.
     * Compatible with bot.js allSignals Map format.
     * 
     * @param {Object} prediction - ML prediction result
     * @param {number} currentPrice - Current BTC price
     * @returns {Object} Signal in bot format
     */
    createSignal(prediction, currentPrice) {
        if (!prediction || prediction.direction === 'NEUTRAL' || !prediction.should_trade) {
            return null;
        }

        return {
            action: prediction.direction === 'UP' ? 'BUY' : 'SELL',
            confidence: prediction.confidence,
            price: currentPrice,
            strategy: 'PythonML',
            timestamp: Date.now(),
            metadata: {
                expectedReturn: prediction.expected_return,
                inferenceMs: prediction.inference_ms,
                featuresUsed: prediction.features_used,
                xgbProba: prediction.xgb_proba,
                lgbProba: prediction.lgb_proba,
                topFeatures: prediction.feature_importance,
            },
        };
    }

    /**
     * Request model retraining (called periodically, e.g., every 24h).
     * @param {string} timeframe - Timeframe to retrain on
     */
    async requestRetrain(timeframe = '15m') {
        if (!this.isOnline) return null;
        
        try {
            const result = await this._post('/train', { timeframe, horizon: 1 });
            console.log(`[ML Client] 🔧 Model retrained: ${JSON.stringify(result.metrics?.test_results || {})}`);
            return result;
        } catch (e) {
            console.warn(`[ML Client] Retrain failed: ${e.message}`);
            return null;
        }
    }

    /**
     * Get service metrics.
     */
    async getMetrics() {
        if (!this.isOnline) return null;
        try {
            return await this._get('/metrics');
        } catch (e) {
            return null;
        }
    }

    /**
     * P#152: Get current Kraken funding rate for a symbol.
     * @param {string} symbol - e.g. 'BTCUSDT'
     * @returns {Object|null} { current_rate_8h, signal, stats }
     */
    async getFundingRate(symbol = 'BTCUSDT') {
        if (!this.isOnline) return null;
        try {
            return await this._get(`/funding-rate?symbol=${symbol}`);
        } catch (e) {
            return null;
        }
    }

    /**
     * Get client statistics for logging/dashboard.
     */
    getStats() {
        return {
            enabled: this.enabled,
            online: this.isOnline,
            serviceUrl: this.serviceUrl,
            ...this.stats,
            lastPrediction: this.lastPrediction ? {
                direction: this.lastPrediction.direction,
                confidence: this.lastPrediction.confidence,
                should_trade: this.lastPrediction.should_trade,
                latencyMs: this.lastPrediction.latencyMs,
                receivedAt: this.lastPrediction.receivedAt,
            } : null,
        };
    }

    /**
     * PATCH #58: LLM Override Validation.
     * Validates ML signal via Ollama LLM (or rule-based fallback).
     * 
     * @param {Object} prediction - ML prediction from /predict
     * @param {string} regime - Current market regime
     * @param {boolean} hasPosition - Whether bot has open position
     * @param {Object} indicators - Current indicators {rsi, adx, bb_pctb, vol_ratio, macd_hist}
     * @returns {Object|null} {agrees, confidence_adj, reasoning, risk_flag, override_action, source}
     */
    async validateWithLLM(prediction, regime, hasPosition, indicators = {}) {
        if (!this.enabled || !this.isOnline) return null;

        try {
            const result = await this._post('/validate-llm', {
                direction: prediction.direction,
                confidence: prediction.confidence,
                expected_return: prediction.expected_return || 0,
                regime: regime || 'UNKNOWN',
                has_position: hasPosition,
                rsi: indicators.rsi || 50,
                adx: indicators.adx || 20,
                bb_pctb: indicators.bb_pctb || 0.5,
                vol_ratio: indicators.vol_ratio || 1.0,
                macd_hist: indicators.macd_hist || 0,
            });
            return result;
        } catch (e) {
            return null; // Fallback: skip LLM validation
        }
    }

    /**
     * PATCH #58: Sentiment Analysis.
     * Gets market sentiment from price/volume microstructure.
     * 
     * @param {Array} candles - OHLCV candle array (last 200+)
     * @param {string} regime - Current market regime
     * @returns {Object|null} {score, regime, confidence_modifier, trading_bias, contrarian_signal}
     */
    async getSentiment(candles, regime) {
        if (!this.enabled || !this.isOnline) return null;

        try {
            const candleSlice = candles.slice(-200).map(c => ({
                open: c.open || c.o,
                high: c.high || c.h,
                low: c.low || c.l,
                close: c.close || c.c,
                volume: c.volume || c.v || 0,
                timestamp: c.timestamp || c.time || null,
            }));

            const result = await this._post('/sentiment', {
                candles: candleSlice,
                regime: regime || 'UNKNOWN',
            });
            return result;
        } catch (e) {
            return null; // Fallback: no sentiment modifier
        }
    }

    /**
     * PATCH #58: Extended health check with component status.
     */
    async getHealthV2() {
        if (!this.isOnline) return null;
        try {
            return await this._get('/health-v2');
        } catch (e) {
            return null;
        }
    }

    /**
     * Cleanup resources.
     */
    destroy() {
        if (this._healthInterval) {
            clearInterval(this._healthInterval);
            this._healthInterval = null;
        }
    }

    // ==============================================================
    // HTTP helpers
    // ==============================================================

    /**
     * HTTP POST request.
     */
    _post(path, data) {
        return new Promise((resolve, reject) => {
            const url = new URL(this.serviceUrl + path);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https : http;

            const body = JSON.stringify(data);
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                },
                timeout: this.timeoutMs,
            };

            const req = lib.request(options, (res) => {
                let chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    try {
                        const text = Buffer.concat(chunks).toString();
                        const json = JSON.parse(text);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(json);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${json.detail || text}`));
                        }
                    } catch (e) {
                        reject(new Error(`Parse error: ${e.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(body);
            req.end();
        });
    }

    /**
     * HTTP GET request.
     */
    _get(path) {
        return new Promise((resolve, reject) => {
            const url = new URL(this.serviceUrl + path);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'GET',
                timeout: this.timeoutMs,
            };

            const req = lib.request(options, (res) => {
                let chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    try {
                        const text = Buffer.concat(chunks).toString();
                        resolve(JSON.parse(text));
                    } catch (e) {
                        reject(new Error(`Parse error: ${e.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }
}

module.exports = { MLClient };
