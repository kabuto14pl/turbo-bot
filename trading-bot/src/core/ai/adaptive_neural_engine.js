'use strict';
/**
 * @module AdaptiveNeuralEngine
 * @version 1.0.0
 * @description Real TensorFlow.js neural AI system for intelligent trading.
 *
 * Components:
 *   1. GRU Price Direction Predictor — recurrent network for price movement prediction
 *   2. Market Regime Detector — classifies market state (trending/ranging/volatile)
 *   3. Meta-Strategy Optimizer — Thompson Sampling (Bayesian MAB) for dynamic ensemble weights
 *   4. Neural Risk Manager — AI-driven position sizing regression
 *   5. Feature Engineering Pipeline — rolling normalization, 8 LSTM + 12 regime features
 *   6. Online Learning with Experience Replay Buffer
 *
 * Designed for low-resource VPS: 1 CPU core, 1GB RAM.
 * Total neural network parameters: ~3K (GRU ~2K, Regime ~500, Risk ~100)
 * Memory footprint: <5MB for models, <10MB for buffers.
 *
 * Phases:
 *   HEURISTIC (0-100 candles)  — all decisions via rules, collecting data
 *   LEARNING  (100-500 candles) — first model training, blend heuristic+AI (70/30 → 30/70)
 *   AI_ACTIVE (500+ candles)    — models fully active with continuous online learning
 */

let tf;
try {
    tf = require('@tensorflow/tfjs-node');
} catch (e) {
    try { tf = require('@tensorflow/tfjs'); } catch (e2) {
        console.error('[NEURAL AI] TensorFlow.js not available:', e2.message);
        tf = null;
    }
}
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONSTANTS
// ============================================================================
const LSTM_WINDOW = 20;           // Timesteps for GRU input
const LSTM_FEATURES = 8;          // Features per timestep
const REGIME_FEATURES = 12;       // Features for regime detection
const RISK_FEATURES = 6;          // Features for risk prediction
const REGIMES = ['TRENDING_UP', 'TRENDING_DOWN', 'RANGING', 'HIGH_VOLATILITY'];
const DIRECTIONS = ['DOWN', 'NEUTRAL', 'UP'];
const DIRECTION_THRESHOLD = 0.001; // 0.1% price change threshold
const MODEL_DIR = path.join(__dirname, '..', '..', '..', '..', 'data', 'ai_models');
const CHECKPOINT_INTERVAL = 100;   // Save every N candles processed
const TRAIN_INTERVAL = 200;        // Train every N new candles
const MIN_TRAIN_SAMPLES = 80;      // Minimum sequences for first training
const BUFFER_MAX_SIZE = 2000;      // Experience buffer capacity
const BLEND_AI_WEIGHT_INITIAL = 0.3;  // AI influence starts at 30%
const BLEND_AI_WEIGHT_MAX = 0.85;     // AI influence grows to 85%

// ============================================================================
// FEATURE PIPELINE — extracts and normalizes features from candle data
// ============================================================================
class FeaturePipeline {
    constructor() {
        // Rolling statistics for normalization (exponential moving avg)
        this.stats = {};
        this.decay = 0.995;
        this.epsilon = 1e-8;
        this.candleCount = 0;
    }

    /**
     * Update rolling mean/std for a feature
     */
    _updateStat(name, value) {
        if (!isFinite(value)) return;
        if (!this.stats[name]) {
            this.stats[name] = { mean: value, variance: 0.01, count: 0 };
        }
        const s = this.stats[name];
        s.count++;
        const d = this.decay;
        s.mean = d * s.mean + (1 - d) * value;
        const diff = value - s.mean;
        s.variance = d * s.variance + (1 - d) * diff * diff;
    }

    /**
     * Normalize a value using rolling statistics (z-score, clipped)
     */
    _normalize(name, value) {
        if (!this.stats[name] || !isFinite(value)) return 0;
        const s = this.stats[name];
        const std = Math.sqrt(s.variance + this.epsilon);
        const z = (value - s.mean) / std;
        return Math.max(-3, Math.min(3, z)) / 3; // Clip to [-1, 1]
    }

    /**
     * Calculate indicators for a price array at a specific index
     */
    _calcIndicatorsAt(prices, volumes, highs, lows, idx) {
        const end = idx + 1;
        const sliceP = prices.slice(Math.max(0, end - 60), end);
        const sliceV = volumes.slice(Math.max(0, end - 30), end);

        // Log return
        const logReturn = idx > 0 ? Math.log(prices[idx] / prices[idx - 1]) : 0;

        // RSI
        let rsi = 50;
        if (sliceP.length >= 15) {
            let gains = 0, losses = 0;
            for (let i = sliceP.length - 14; i < sliceP.length; i++) {
                const change = sliceP[i] - sliceP[i - 1];
                if (change > 0) gains += change; else losses -= change;
            }
            const avgGain = gains / 14, avgLoss = losses / 14;
            rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
        }

        // MACD histogram
        let macdHist = 0;
        if (sliceP.length >= 26) {
            const ema12 = this._ema(sliceP, 12);
            const ema26 = this._ema(sliceP, 26);
            const macdLine = ema12 - ema26;
            // Signal line approximation (9-period EMA of MACD)
            macdHist = macdLine * 0.2; // Simplified: use fraction of MACD line
        }

        // Bollinger %B
        let bbPctB = 0.5;
        if (sliceP.length >= 20) {
            const sma20 = sliceP.slice(-20).reduce((a, b) => a + b, 0) / 20;
            const std20 = Math.sqrt(sliceP.slice(-20).reduce((s, p) => s + (p - sma20) ** 2, 0) / 20);
            const upper = sma20 + 2 * std20, lower = sma20 - 2 * std20;
            bbPctB = std20 > 0 ? (prices[idx] - lower) / (upper - lower) : 0.5;
        }

        // ATR ratio
        let atrRatio = 0;
        if (idx >= 14 && highs && lows) {
            let sumTR = 0;
            for (let i = idx - 13; i <= idx; i++) {
                const tr = Math.max(
                    highs[i] - lows[i],
                    Math.abs(highs[i] - prices[i - 1]),
                    Math.abs(lows[i] - prices[i - 1])
                );
                sumTR += tr;
            }
            atrRatio = (sumTR / 14) / prices[idx];
        }

        // Volume ratio
        let volRatio = 1;
        if (sliceV.length >= 20 && volumes[idx] > 0) {
            const smaVol = sliceV.slice(-20).reduce((a, b) => a + b, 0) / 20;
            volRatio = smaVol > 0 ? volumes[idx] / smaVol : 1;
        }

        // SMA position
        let smaPosition = 0;
        if (sliceP.length >= 50) {
            const sma50 = sliceP.slice(-50).reduce((a, b) => a + b, 0) / 50;
            smaPosition = sma50 > 0 ? (prices[idx] - sma50) / sma50 : 0;
        }

        // EMA crossover
        let emaCross = 0;
        if (sliceP.length >= 21) {
            const ema9 = this._ema(sliceP, 9);
            const ema21 = this._ema(sliceP, 21);
            emaCross = prices[idx] > 0 ? (ema9 - ema21) / prices[idx] : 0;
        }

        return { logReturn, rsi, macdHist, bbPctB, atrRatio, volRatio, smaPosition, emaCross };
    }

    /**
     * EMA calculation helper
     */
    _ema(prices, period) {
        if (prices.length < period) return prices[prices.length - 1];
        const k = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        for (let i = period; i < prices.length; i++) {
            ema = prices[i] * k + ema * (1 - k);
        }
        return ema;
    }

    /**
     * Extract 8 LSTM features for a single candle at index
     * Returns array of 8 normalized values in [-1, 1]
     */
    extractSingleTimestepFeatures(prices, volumes, highs, lows, idx) {
        const raw = this._calcIndicatorsAt(prices, volumes, highs, lows, idx);

        // Update rolling stats
        this._updateStat('logReturn', raw.logReturn);
        this._updateStat('rsi', raw.rsi);
        this._updateStat('macdHist', raw.macdHist);
        this._updateStat('atrRatio', raw.atrRatio);
        this._updateStat('volRatio', raw.volRatio);
        this._updateStat('smaPosition', raw.smaPosition);
        this._updateStat('emaCross', raw.emaCross);

        return [
            this._normalize('logReturn', raw.logReturn),
            (raw.rsi - 50) / 50,   // RSI already bounded, normalize to [-1, 1]
            this._normalize('macdHist', raw.macdHist),
            (raw.bbPctB - 0.5) * 2, // BB%B: [0,1] -> [-1,1]
            this._normalize('atrRatio', raw.atrRatio),
            this._normalize('volRatio', raw.volRatio),
            this._normalize('smaPosition', raw.smaPosition),
            this._normalize('emaCross', raw.emaCross),
        ];
    }

    /**
     * Extract LSTM window features from candle array
     * @returns Float32Array[windowSize][8] or null if insufficient data
     */
    extractLSTMFeatures(candles, windowSize = LSTM_WINDOW) {
        if (!candles || candles.length < windowSize + 60) return null;
        const prices = candles.map(c => c.close);
        const volumes = candles.map(c => c.volume || 0);
        const highs = candles.map(c => c.high || c.close);
        const lows = candles.map(c => c.low || c.close);

        const features = [];
        const startIdx = candles.length - windowSize;
        for (let i = startIdx; i < candles.length; i++) {
            features.push(this.extractSingleTimestepFeatures(prices, volumes, highs, lows, i));
        }
        this.candleCount++;
        return features; // [windowSize][8]
    }

    /**
     * Extract 12 regime detection features from recent candle data
     */
    extractRegimeFeatures(candles) {
        if (!candles || candles.length < 60) return null;
        const prices = candles.map(c => c.close);
        const volumes = candles.map(c => c.volume || 0);
        const n = prices.length;

        // 1. Volatility 20 (stddev of log returns)
        const returns20 = [];
        for (let i = n - 20; i < n; i++) returns20.push(Math.log(prices[i] / prices[i - 1]));
        const vol20 = Math.sqrt(returns20.reduce((s, r) => s + r * r, 0) / returns20.length);

        // 2. Volatility 50
        const returns50 = [];
        for (let i = n - 50; i < n; i++) returns50.push(Math.log(prices[i] / prices[i - 1]));
        const vol50 = Math.sqrt(returns50.reduce((s, r) => s + r * r, 0) / returns50.length);

        // 3. Vol ratio
        const volRatio = vol50 > 0 ? vol20 / vol50 : 1;

        // 4. Trend direction (SMA20 vs SMA50)
        const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / 50;
        const trendDir = sma20 > sma50 ? 1 : -1;

        // 5. Trend strength
        const trendStrength = sma50 > 0 ? Math.abs(sma20 - sma50) / sma50 : 0;

        // 6. Mean reversion score
        const meanRev = sma50 > 0 ? (prices[n - 1] - sma50) / sma50 : 0;

        // 7. RSI zone
        let rsi = 50;
        let gains = 0, losses = 0;
        for (let i = n - 14; i < n; i++) {
            const ch = prices[i] - prices[i - 1];
            if (ch > 0) gains += ch; else losses -= ch;
        }
        const avgG = gains / 14, avgL = losses / 14;
        rsi = avgL === 0 ? 100 : 100 - (100 / (1 + avgG / avgL));
        const rsiZone = (rsi - 50) / 50; // [-1, 1]

        // 8. ATR percentile (current ATR rank over last 100 periods)
        const atrs = [];
        for (let i = Math.max(15, n - 100); i < n; i++) {
            let sumTR = 0;
            for (let j = i - 13; j <= i; j++) {
                const h = candles[j].high || candles[j].close;
                const l = candles[j].low || candles[j].close;
                const tr = Math.max(h - l, Math.abs(h - prices[j - 1]), Math.abs(l - prices[j - 1]));
                sumTR += tr;
            }
            atrs.push(sumTR / 14);
        }
        const currentATR = atrs[atrs.length - 1] || 0;
        const sortedATRs = [...atrs].sort((a, b) => a - b);
        const atrPctile = sortedATRs.length > 0
            ? sortedATRs.findIndex(a => a >= currentATR) / sortedATRs.length
            : 0.5;

        // 9. Bollinger bandwidth
        const std20 = Math.sqrt(prices.slice(-20).reduce((s, p) => s + (p - sma20) ** 2, 0) / 20);
        const bbBandwidth = sma20 > 0 ? (4 * std20) / sma20 : 0;

        // 10. MACD trend
        const ema12 = this._ema(prices.slice(-30), 12);
        const ema26 = this._ema(prices.slice(-30), 26);
        const macdTrend = ema12 > ema26 ? 1 : -1;

        // 11. Volume trend
        const volRecent = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
        const volOlder = volumes.slice(-30, -10).reduce((a, b) => a + b, 0) / 20;
        const volumeTrend = volOlder > 0 ? volRecent / volOlder : 1;

        // 12. Candle body ratio
        const lastC = candles[n - 1];
        const bodyRatio = (lastC.high - lastC.low) > 0
            ? Math.abs(lastC.close - (lastC.open || lastC.close)) / (lastC.high - lastC.low)
            : 0.5;

        // Normalize all to roughly [-1, 1] or [0, 1]
        return [
            Math.min(1, vol20 * 100),        // 0-1 range for crypto vol
            Math.min(1, vol50 * 100),
            Math.min(2, volRatio) - 1,        // -1 to 1
            trendDir,                         // -1 or 1
            Math.min(1, trendStrength * 20),  // 0-1
            Math.max(-1, Math.min(1, meanRev * 10)), // -1 to 1
            rsiZone,                          // -1 to 1
            atrPctile * 2 - 1,               // -1 to 1
            Math.min(1, bbBandwidth * 10),    // 0-1
            macdTrend,                        // -1 or 1
            Math.max(-1, Math.min(1, (volumeTrend - 1) * 2)), // -1 to 1
            bodyRatio * 2 - 1,               // -1 to 1
        ];
    }

    /**
     * Extract 6 risk prediction features
     */
    extractRiskFeatures(regimeIdx, drawdownPct, winRate, volatility, consecutiveLosses, hoursSinceLastTrade) {
        return [
            regimeIdx / 3,                           // 0-1 regime encoding
            Math.min(1, drawdownPct * 10),           // 0-1 drawdown
            winRate,                                  // 0-1 win rate
            Math.min(1, volatility * 50),            // 0-1 volatility
            Math.min(1, consecutiveLosses / 5),      // 0-1 consecutive losses
            Math.min(1, hoursSinceLastTrade / 48),   // 0-1 time
        ];
    }

    getState() { return { stats: this.stats, candleCount: this.candleCount }; }
    setState(state) {
        if (state && state.stats) this.stats = state.stats;
        if (state && state.candleCount) this.candleCount = state.candleCount;
    }
}

// ============================================================================
// GRU PRICE DIRECTION PREDICTOR
// ============================================================================
class GRUPricePredictor {
    constructor() {
        this.model = null;
        this.trained = false;
        this.trainCount = 0;
        this.lastAccuracy = 0;
    }

    buildModel() {
        if (!tf) return;
        this.model = tf.sequential();
        // Layer 1: GRU with 24 units (lighter than LSTM, similar performance)
        this.model.add(tf.layers.gru({
            units: 24,
            returnSequences: true,
            inputShape: [LSTM_WINDOW, LSTM_FEATURES],
            recurrentDropout: 0,
            dropout: 0.15,
        }));
        // Layer 2: GRU with 12 units
        this.model.add(tf.layers.gru({
            units: 12,
            returnSequences: false,
            recurrentDropout: 0,
            dropout: 0.15,
        }));
        // Output: 3 classes (DOWN, NEUTRAL, UP)
        this.model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
        this.model.compile({
            optimizer: tf.train.adam(0.0008),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy'],
        });
        console.log('[NEURAL AI] GRU model built: ' + this.model.countParams() + ' parameters');
    }

    /**
     * Predict price direction from LSTM feature window
     * @returns {{ down: number, neutral: number, up: number, direction: string, confidence: number }}
     */
    async predict(features) {
        if (!tf || !this.model) return { down: 0.33, neutral: 0.34, up: 0.33, direction: 'NEUTRAL', confidence: 0.34 };
        return tf.tidy(() => {
            const input = tf.tensor3d([features], [1, LSTM_WINDOW, LSTM_FEATURES]);
            const pred = this.model.predict(input);
            const probs = pred.dataSync();
            const maxIdx = probs.indexOf(Math.max(...probs));
            return {
                down: probs[0], neutral: probs[1], up: probs[2],
                direction: DIRECTIONS[maxIdx],
                confidence: probs[maxIdx],
            };
        });
    }

    /**
     * Train on batch of sequences
     * @param {Array} sequences - Array of { features: [20][8], label: [3] }
     * @param {number} epochs
     */
    async train(sequences, epochs = 5) {
        if (!tf || !this.model || sequences.length < MIN_TRAIN_SAMPLES) return;
        const batchSize = Math.min(32, sequences.length);

        // Prepare tensors
        const xData = [], yData = [];
        for (const seq of sequences) {
            xData.push(seq.features);
            yData.push(seq.label);
        }

        const xs = tf.tensor3d(xData, [sequences.length, LSTM_WINDOW, LSTM_FEATURES]);
        const ys = tf.tensor2d(yData, [sequences.length, 3]);

        try {
            // Split 80/20 for validation
            const splitIdx = Math.floor(sequences.length * 0.8);
            const xTrain = xs.slice([0, 0, 0], [splitIdx, LSTM_WINDOW, LSTM_FEATURES]);
            const yTrain = ys.slice([0, 0], [splitIdx, 3]);
            const xVal = xs.slice([splitIdx, 0, 0], [sequences.length - splitIdx, LSTM_WINDOW, LSTM_FEATURES]);
            const yVal = ys.slice([splitIdx, 0], [sequences.length - splitIdx, 3]);

            const result = await this.model.fit(xTrain, yTrain, {
                epochs,
                batchSize,
                validationData: [xVal, yVal],
                verbose: 0,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        if (epoch === epochs - 1) {
                            this.lastAccuracy = logs.val_acc || logs.acc || 0;
                            console.log(`[GRU TRAIN] Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)}, acc=${(logs.acc || 0).toFixed(3)}, val_acc=${(logs.val_acc || 0).toFixed(3)}`);
                        }
                    }
                }
            });

            this.trained = true;
            this.trainCount++;

            // Cleanup
            xTrain.dispose(); yTrain.dispose();
            xVal.dispose(); yVal.dispose();
        } catch (e) {
            console.error('[GRU TRAIN ERROR]', e.message);
        } finally {
            xs.dispose(); ys.dispose();
        }
    }

    async save(dir) {
        if (!this.model || !tf) return;
        const modelDir = path.join(dir, 'gru_predictor');
        if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true });
        await this.model.save('file://' + modelDir);
    }

    async load(dir) {
        if (!tf) return false;
        const modelDir = path.join(dir, 'gru_predictor');
        const modelJson = path.join(modelDir, 'model.json');
        if (!fs.existsSync(modelJson)) return false;
        try {
            this.model = await tf.loadLayersModel('file://' + modelDir + '/model.json');
            this.model.compile({ optimizer: tf.train.adam(0.0008), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
            this.trained = true;
            console.log('[GRU] Checkpoint loaded');
            return true;
        } catch (e) {
            console.warn('[GRU] Load failed:', e.message);
            return false;
        }
    }
}

// ============================================================================
// MARKET REGIME DETECTOR
// ============================================================================
class MarketRegimeDetector {
    constructor() {
        this.model = null;
        this.trained = false;
        this.currentRegime = 'RANGING';
        this.regimeProbabilities = [0, 0, 1, 0]; // Start with RANGING
        this.regimeHistory = [];
    }

    buildModel() {
        if (!tf) return;
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [REGIME_FEATURES] }));
        this.model.add(tf.layers.dropout({ rate: 0.15 }));
        this.model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
        this.model.add(tf.layers.dense({ units: 4, activation: 'softmax' }));
        this.model.compile({ optimizer: tf.train.adam(0.001), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
        console.log('[NEURAL AI] Regime model built: ' + this.model.countParams() + ' parameters');
    }

    /**
     * Heuristic regime detection (always available, used for labels + fallback)
     */
    detectHeuristic(regimeFeatures) {
        if (!regimeFeatures) return { regime: 'RANGING', index: 2, confidence: 0.5 };
        const [vol20, vol50, volRatio, trendDir, trendStr, meanRev, rsiZone, atrPctile, bbBw, macdTrend, volTrend, bodyRatio] = regimeFeatures;

        // High volatility: high ATR percentile + wide Bollinger bands
        if (atrPctile > 0.3 && bbBw > 0.5) {
            return { regime: 'HIGH_VOLATILITY', index: 3, confidence: 0.6 + atrPctile * 0.2 };
        }
        // Trending up: bullish trend + MACD + RSI
        if (trendDir > 0 && trendStr > 0.2 && macdTrend > 0 && rsiZone > -0.2) {
            return { regime: 'TRENDING_UP', index: 0, confidence: 0.55 + trendStr * 0.3 };
        }
        // Trending down: bearish trend + MACD + RSI
        if (trendDir < 0 && trendStr > 0.2 && macdTrend < 0 && rsiZone < 0.2) {
            return { regime: 'TRENDING_DOWN', index: 1, confidence: 0.55 + trendStr * 0.3 };
        }
        // Default: ranging
        return { regime: 'RANGING', index: 2, confidence: 0.5 + (1 - trendStr) * 0.2 };
    }

    /**
     * Detect regime using neural model (if trained) or heuristic
     */
    async detect(regimeFeatures) {
        const heuristic = this.detectHeuristic(regimeFeatures);

        if (!tf || !this.model || !this.trained) {
            this.currentRegime = heuristic.regime;
            this.regimeProbabilities = [0, 0, 0, 0];
            this.regimeProbabilities[heuristic.index] = 1;
            return heuristic;
        }

        const result = tf.tidy(() => {
            const input = tf.tensor2d([regimeFeatures], [1, REGIME_FEATURES]);
            const pred = this.model.predict(input);
            const probs = pred.dataSync();
            const maxIdx = probs.indexOf(Math.max(...probs));
            return { probs: Array.from(probs), maxIdx, maxProb: probs[maxIdx] };
        });

        // Blend neural prediction with heuristic for stability
        const blendedProbs = result.probs.map((p, i) => {
            const hProb = i === heuristic.index ? 0.7 : 0.1;
            return 0.6 * p + 0.4 * hProb;
        });
        const sum = blendedProbs.reduce((a, b) => a + b, 0);
        const normalized = blendedProbs.map(p => p / sum);
        const finalIdx = normalized.indexOf(Math.max(...normalized));

        this.currentRegime = REGIMES[finalIdx];
        this.regimeProbabilities = normalized;
        this.regimeHistory.push({ regime: this.currentRegime, time: Date.now() });
        if (this.regimeHistory.length > 500) this.regimeHistory = this.regimeHistory.slice(-500);

        return {
            regime: this.currentRegime,
            index: finalIdx,
            confidence: normalized[finalIdx],
            probabilities: { TRENDING_UP: normalized[0], TRENDING_DOWN: normalized[1], RANGING: normalized[2], HIGH_VOLATILITY: normalized[3] },
            source: this.trained ? 'NEURAL+HEURISTIC' : 'HEURISTIC',
        };
    }

    /**
     * Generate heuristic labels for training data
     */
    generateLabel(regimeFeatures) {
        const h = this.detectHeuristic(regimeFeatures);
        const label = [0, 0, 0, 0];
        // Soft labels: 80% to primary, 20% distributed
        label[h.index] = 0.8;
        for (let i = 0; i < 4; i++) if (i !== h.index) label[i] = 0.2 / 3;
        return label;
    }

    async train(samples, epochs = 8) {
        if (!tf || !this.model || samples.length < 50) return;
        const xs = tf.tensor2d(samples.map(s => s.features), [samples.length, REGIME_FEATURES]);
        const ys = tf.tensor2d(samples.map(s => s.label), [samples.length, 4]);
        try {
            await this.model.fit(xs, ys, { epochs, batchSize: Math.min(32, samples.length), verbose: 0 });
            this.trained = true;
            console.log('[REGIME TRAIN] Trained on ' + samples.length + ' samples');
        } catch (e) { console.error('[REGIME TRAIN ERROR]', e.message); }
        finally { xs.dispose(); ys.dispose(); }
    }

    async save(dir) {
        if (!this.model || !tf) return;
        const d = path.join(dir, 'regime_detector');
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        await this.model.save('file://' + d);
    }

    async load(dir) {
        if (!tf) return false;
        const d = path.join(dir, 'regime_detector');
        if (!fs.existsSync(path.join(d, 'model.json'))) return false;
        try {
            this.model = await tf.loadLayersModel('file://' + d + '/model.json');
            this.model.compile({ optimizer: tf.train.adam(0.001), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
            this.trained = true;
            console.log('[REGIME] Checkpoint loaded');
            return true;
        } catch (e) { return false; }
    }
}

// ============================================================================
// META-STRATEGY OPTIMIZER — Thompson Sampling (Bayesian Multi-Armed Bandit)
// ============================================================================
class MetaStrategyOptimizer {
    constructor() {
        // Beta distribution parameters: { regime: { strategy: { alpha, beta } } }
        this.distributions = {};
        this.defaultStrategies = ['AdvancedAdaptive', 'RSITurbo', 'SuperTrend', 'MACrossover', 'MomentumPro', 'EnterpriseML', 'NeuralAI'];
        this.staticWeights = {
            'AdvancedAdaptive': 0.18, 'RSITurbo': 0.10, 'SuperTrend': 0.12,
            'MACrossover': 0.10, 'MomentumPro': 0.10, 'EnterpriseML': 0.20, 'NeuralAI': 0.20,
        };
        this.totalUpdates = 0;
    }

    /**
     * Initialize Beta(1,1) uniform priors for all strategy-regime pairs
     */
    _ensureDistributions(regime, strategies) {
        if (!this.distributions[regime]) this.distributions[regime] = {};
        for (const s of strategies) {
            if (!this.distributions[regime][s]) {
                this.distributions[regime][s] = { alpha: 1, beta: 1 };
            }
        }
    }

    /**
     * Sample from Beta(alpha, beta) distribution using Gamma distribution method
     */
    _sampleBeta(alpha, beta) {
        const x = this._sampleGamma(alpha, 1);
        const y = this._sampleGamma(beta, 1);
        return (x + y) > 0 ? x / (x + y) : 0.5;
    }

    /**
     * Marsaglia and Tsang's Gamma distribution sampler
     */
    _sampleGamma(shape, scale) {
        if (shape < 1) {
            return this._sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1.0 / shape);
        }
        const d = shape - 1.0 / 3.0;
        const c = 1.0 / Math.sqrt(9.0 * d);
        while (true) {
            let x, v;
            do {
                x = this._normalRandom();
                v = 1.0 + c * x;
            } while (v <= 0);
            v = v * v * v;
            const u = Math.random();
            if (u < 1.0 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
            if (Math.log(u) < 0.5 * x * x + d * (1.0 - v + Math.log(v))) return d * v * scale;
        }
    }

    _normalRandom() {
        const u1 = Math.random(), u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    }

    /**
     * Get optimal strategy weights for current regime via Thompson Sampling
     * @param {string} regime - current market regime
     * @param {string[]} strategies - available strategy names
     * @returns {object} - { strategyName: weight }
     */
    getOptimalWeights(regime, strategies) {
        strategies = strategies || this.defaultStrategies;
        this._ensureDistributions(regime, strategies);

        // Not enough data yet — return blended static weights
        if (this.totalUpdates < 10) return { ...this.staticWeights };

        const samples = {};
        let total = 0;
        for (const s of strategies) {
            const dist = this.distributions[regime][s];
            const sample = this._sampleBeta(dist.alpha, dist.beta);
            samples[s] = sample;
            total += sample;
        }

        // Normalize to sum to 1, with minimum 3% per strategy (exploration floor)
        const minWeight = 0.03;
        const weights = {};
        const excess = strategies.length * minWeight;
        for (const s of strategies) {
            weights[s] = minWeight + (1 - excess) * (samples[s] / (total || 1));
        }

        // Blend with static weights for safety: AI_blend * thompson + (1-AI_blend) * static
        const aiBlend = Math.min(BLEND_AI_WEIGHT_MAX,
            BLEND_AI_WEIGHT_INITIAL + (this.totalUpdates / 200) * (BLEND_AI_WEIGHT_MAX - BLEND_AI_WEIGHT_INITIAL));

        const result = {};
        for (const s of strategies) {
            const staticW = this.staticWeights[s] || (1 / strategies.length);
            result[s] = aiBlend * weights[s] + (1 - aiBlend) * staticW;
        }

        // Final normalization
        const finalTotal = Object.values(result).reduce((a, b) => a + b, 0);
        for (const s of Object.keys(result)) result[s] /= finalTotal;

        return result;
    }

    /**
     * Record trade result for a strategy in a regime
     * Updates the Beta distribution parameters
     */
    recordResult(regime, strategy, pnl) {
        this._ensureDistributions(regime, [strategy]);
        const dist = this.distributions[regime][strategy];

        if (pnl > 0) {
            // Win: increase alpha proportionally to profit magnitude
            const bonus = Math.min(3, 1 + Math.abs(pnl) / 20);
            dist.alpha += bonus;
        } else if (pnl < 0) {
            // Loss: increase beta proportionally to loss magnitude
            const penalty = Math.min(3, 1 + Math.abs(pnl) / 20);
            dist.beta += penalty;
        } else {
            // Breakeven: small increase to both (shrinks variance)
            dist.alpha += 0.2;
            dist.beta += 0.2;
        }

        // Decay old data: periodically reduce alpha/beta to adapt to changing markets
        // Every 50 updates, decay by 5%
        this.totalUpdates++;
        if (this.totalUpdates % 50 === 0) {
            for (const r of Object.keys(this.distributions)) {
                for (const s of Object.keys(this.distributions[r])) {
                    const d = this.distributions[r][s];
                    d.alpha = Math.max(1, d.alpha * 0.95);
                    d.beta = Math.max(1, d.beta * 0.95);
                }
            }
        }
    }

    /**
     * Get expected win rate per strategy for a regime
     */
    getExpectedWinRates(regime) {
        if (!this.distributions[regime]) return {};
        const rates = {};
        for (const [s, d] of Object.entries(this.distributions[regime])) {
            rates[s] = d.alpha / (d.alpha + d.beta);
        }
        return rates;
    }

    getState() { return { distributions: this.distributions, totalUpdates: this.totalUpdates }; }
    setState(state) {
        if (state && state.distributions) this.distributions = state.distributions;
        if (state && state.totalUpdates) this.totalUpdates = state.totalUpdates;
    }
}

// ============================================================================
// NEURAL RISK MANAGER
// ============================================================================
class NeuralRiskManager {
    constructor() {
        this.model = null;
        this.trained = false;
        this.defaultRisk = 0.015; // 1.5% default
    }

    buildModel() {
        if (!tf) return;
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({ units: 8, activation: 'relu', inputShape: [RISK_FEATURES] }));
        this.model.add(tf.layers.dense({ units: 4, activation: 'relu' }));
        this.model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' })); // 0-1 output
        this.model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
        console.log('[NEURAL AI] Risk model built: ' + this.model.countParams() + ' parameters');
    }

    /**
     * Predict optimal risk percentage
     * @returns {{ riskPercent: number, confidence: number, source: string }}
     */
    async predict(riskFeatures) {
        if (!tf || !this.model || !this.trained) {
            return { riskPercent: this.defaultRisk, confidence: 0.3, source: 'DEFAULT' };
        }
        const result = tf.tidy(() => {
            const input = tf.tensor2d([riskFeatures], [1, RISK_FEATURES]);
            const pred = this.model.predict(input);
            return pred.dataSync()[0];
        });
        // Scale sigmoid output [0,1] to risk range [0.005, 0.03] (0.5% - 3.0%)
        const riskPercent = 0.005 + result * 0.025;
        return { riskPercent, confidence: 0.6, source: 'NEURAL' };
    }

    async train(samples, epochs = 10) {
        if (!tf || !this.model || samples.length < 30) return;
        const xs = tf.tensor2d(samples.map(s => s.features), [samples.length, RISK_FEATURES]);
        // Target: optimal risk normalized to [0,1] where 0=0.5% and 1=3%
        const ys = tf.tensor2d(samples.map(s => [s.targetRisk]), [samples.length, 1]);
        try {
            await this.model.fit(xs, ys, { epochs, batchSize: Math.min(16, samples.length), verbose: 0 });
            this.trained = true;
            console.log('[RISK TRAIN] Trained on ' + samples.length + ' samples');
        } catch (e) { console.error('[RISK TRAIN ERROR]', e.message); }
        finally { xs.dispose(); ys.dispose(); }
    }

    async save(dir) {
        if (!this.model || !tf) return;
        const d = path.join(dir, 'risk_manager');
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        await this.model.save('file://' + d);
    }

    async load(dir) {
        if (!tf) return false;
        const d = path.join(dir, 'risk_manager');
        if (!fs.existsSync(path.join(d, 'model.json'))) return false;
        try {
            this.model = await tf.loadLayersModel('file://' + d + '/model.json');
            this.model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
            this.trained = true;
            console.log('[RISK] Checkpoint loaded');
            return true;
        } catch (e) { return false; }
    }
}

// ============================================================================
// EXPERIENCE BUFFER — stores market data + trade outcomes for training
// ============================================================================
class ExperienceBuffer {
    constructor(maxSize = BUFFER_MAX_SIZE) {
        this.maxSize = maxSize;
        this.lstmSequences = [];    // { features, label }
        this.regimeSamples = [];    // { features, label }
        this.riskSamples = [];      // { features, targetRisk }
        this.candlesProcessed = 0;
        this.lastTrainCandle = 0;
    }

    addLSTMSequence(features, label) {
        this.lstmSequences.push({ features, label });
        if (this.lstmSequences.length > this.maxSize) this.lstmSequences.shift();
    }

    addRegimeSample(features, label) {
        this.regimeSamples.push({ features, label });
        if (this.regimeSamples.length > this.maxSize) this.regimeSamples.shift();
    }

    addRiskSample(features, targetRisk) {
        this.riskSamples.push({ features, targetRisk });
        if (this.riskSamples.length > this.maxSize / 2) this.riskSamples.shift();
    }

    shouldTrain() {
        return this.candlesProcessed - this.lastTrainCandle >= TRAIN_INTERVAL
            && this.lstmSequences.length >= MIN_TRAIN_SAMPLES;
    }

    markTrained() { this.lastTrainCandle = this.candlesProcessed; }

    getState() {
        return {
            candlesProcessed: this.candlesProcessed,
            lastTrainCandle: this.lastTrainCandle,
            lstmCount: this.lstmSequences.length,
            regimeCount: this.regimeSamples.length,
            riskCount: this.riskSamples.length,
        };
    }
}

// ============================================================================
// ADAPTIVE NEURAL ENGINE — Main Orchestrator
// ============================================================================
class AdaptiveNeuralEngine {
    constructor() {
        this.featurePipeline = new FeaturePipeline();
        this.pricePredictor = new GRUPricePredictor();
        this.regimeDetector = new MarketRegimeDetector();
        this.metaOptimizer = new MetaStrategyOptimizer();
        this.riskPredictor = new NeuralRiskManager();
        this.buffer = new ExperienceBuffer();

        this.isReady = false;
        this.phase = 'HEURISTIC'; // HEURISTIC → LEARNING → AI_ACTIVE
        this.currentRegime = 'RANGING';
        this.lastPrediction = null;
        this.lastRegimeResult = null;
        this.lastRiskResult = null;
        this.trainingInProgress = false;
        this.totalSignalsGenerated = 0;
        this.correctPredictions = 0;
        this.initialized = false;
    }

    /**
     * Initialize all models, load checkpoints if available
     */
    async initialize() {
        console.log('[NEURAL AI] Initializing Adaptive Neural Engine...');

        // Ensure model directory exists
        if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });

        // Build models
        this.pricePredictor.buildModel();
        this.regimeDetector.buildModel();
        this.riskPredictor.buildModel();

        // Try loading checkpoints
        const gruLoaded = await this.pricePredictor.load(MODEL_DIR);
        const regimeLoaded = await this.regimeDetector.load(MODEL_DIR);
        const riskLoaded = await this.riskPredictor.load(MODEL_DIR);

        // Load meta-optimizer and feature stats
        try {
            const metaPath = path.join(MODEL_DIR, 'meta_state.json');
            if (fs.existsSync(metaPath)) {
                const state = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                this.metaOptimizer.setState(state.meta);
                this.featurePipeline.setState(state.features);
                this.buffer.candlesProcessed = state.candlesProcessed || 0;
                this.buffer.lastTrainCandle = state.lastTrainCandle || 0;
                this.phase = state.phase || 'HEURISTIC';
                this.totalSignalsGenerated = state.totalSignals || 0;
                this.correctPredictions = state.correctPredictions || 0;
                console.log('[NEURAL AI] State restored: phase=' + this.phase + ', candles=' + this.buffer.candlesProcessed);
            }
        } catch (e) { console.warn('[NEURAL AI] No saved state, starting fresh'); }

        // Determine initial phase
        if (gruLoaded && this.buffer.candlesProcessed >= 500) {
            this.phase = 'AI_ACTIVE';
        } else if (this.buffer.candlesProcessed >= 100) {
            this.phase = 'LEARNING';
        } else {
            this.phase = 'HEURISTIC';
        }

        this.isReady = true;
        this.initialized = true;
        console.log('[NEURAL AI] Engine ready | Phase: ' + this.phase + ' | TF: ' + (tf ? tf.version.tfjs : 'N/A'));
        console.log('[NEURAL AI] Models: GRU=' + (gruLoaded ? 'loaded' : 'new') +
            ', Regime=' + (regimeLoaded ? 'loaded' : 'new') +
            ', Risk=' + (riskLoaded ? 'loaded' : 'new'));
    }

    /**
     * Process market data update — extract features, buffer data, detect regime
     * Call this every trading cycle with latest candle history
     */
    async processMarketUpdate(candles) {
        if (!this.isReady || !candles || candles.length < 80) return;

        this.buffer.candlesProcessed++;

        // Extract features
        const lstmFeatures = this.featurePipeline.extractLSTMFeatures(candles);
        const regimeFeatures = this.featurePipeline.extractRegimeFeatures(candles);

        // Detect market regime
        if (regimeFeatures) {
            this.lastRegimeResult = await this.regimeDetector.detect(regimeFeatures);
            this.currentRegime = this.lastRegimeResult.regime;

            // Buffer regime sample with heuristic label
            const label = this.regimeDetector.generateLabel(regimeFeatures);
            this.buffer.addRegimeSample(regimeFeatures, label);
        }

        // Buffer LSTM sequence with direction label (from previous prediction)
        if (lstmFeatures && candles.length >= LSTM_WINDOW + 62) {
            const prices = candles.map(c => c.close);
            const n = prices.length;
            // Label: direction of CURRENT candle vs previous
            const currentReturn = (prices[n - 1] - prices[n - 2]) / prices[n - 2];
            const label = currentReturn > DIRECTION_THRESHOLD ? [0, 0, 1]  // UP
                : currentReturn < -DIRECTION_THRESHOLD ? [1, 0, 0]  // DOWN
                : [0, 1, 0]; // NEUTRAL

            this.buffer.addLSTMSequence(lstmFeatures, label);

            // Track prediction accuracy
            if (this.lastPrediction) {
                const predictedDir = this.lastPrediction.direction;
                const actualDir = label[2] > 0.5 ? 'UP' : label[0] > 0.5 ? 'DOWN' : 'NEUTRAL';
                if (predictedDir === actualDir) this.correctPredictions++;
            }
        }

        // Phase transitions
        if (this.phase === 'HEURISTIC' && this.buffer.candlesProcessed >= 100) {
            this.phase = 'LEARNING';
            console.log('[NEURAL AI] Phase transition: HEURISTIC -> LEARNING');
        }
        if (this.phase === 'LEARNING' && this.buffer.candlesProcessed >= 500 && this.pricePredictor.trained) {
            this.phase = 'AI_ACTIVE';
            console.log('[NEURAL AI] Phase transition: LEARNING -> AI_ACTIVE');
        }

        // Trigger training if enough new data
        if (this.buffer.shouldTrain() && !this.trainingInProgress) {
            this._triggerTraining();
        }

        // Save checkpoint periodically
        if (this.buffer.candlesProcessed % CHECKPOINT_INTERVAL === 0) {
            await this._saveCheckpoint();
        }
    }

    /**
     * Generate AI trading signal based on GRU prediction + regime context
     * @param {Array} candles - market data history
     * @param {boolean} hasPosition - whether we currently have an open position
     * @returns {object|null} - signal { action, confidence, symbol, strategy, ... }
     */
    async generateAISignal(candles, hasPosition) {
        if (!this.isReady || this.phase === 'HEURISTIC') return null;

        const lstmFeatures = this.featurePipeline.extractLSTMFeatures(candles);
        if (!lstmFeatures) return null;

        // GRU prediction
        const prediction = await this.pricePredictor.predict(lstmFeatures);
        this.lastPrediction = prediction;
        this.totalSignalsGenerated++;

        // Combine with regime context
        const regime = this.currentRegime;
        let action = 'HOLD';
        let confidence = prediction.confidence;

        // AI blend factor based on phase and training maturity
        const aiTrust = this.phase === 'AI_ACTIVE'
            ? Math.min(0.9, 0.5 + this.pricePredictor.trainCount * 0.05)
            : Math.min(0.5, 0.2 + this.pricePredictor.trainCount * 0.03);

        // Regime-aware signal generation
        if (prediction.direction === 'UP' && confidence > 0.45) {
            if (regime === 'TRENDING_UP') {
                action = 'BUY';
                confidence = Math.min(0.95, confidence * 1.15 * aiTrust); // Boost in favorable regime
            } else if (regime === 'RANGING') {
                action = 'BUY';
                confidence = confidence * 0.85 * aiTrust; // Moderate in ranging
            } else if (regime === 'TRENDING_DOWN') {
                action = 'HOLD'; // Don't buy against trend
                confidence *= 0.5;
            } else { // HIGH_VOLATILITY
                action = 'BUY';
                confidence = confidence * 0.7 * aiTrust; // Cautious in high vol
            }
        } else if (prediction.direction === 'DOWN' && confidence > 0.45) {
            if (regime === 'TRENDING_DOWN' && hasPosition) {
                action = 'SELL';
                confidence = Math.min(0.95, confidence * 1.15 * aiTrust);
            } else if (regime === 'RANGING' && hasPosition) {
                action = 'SELL';
                confidence = confidence * 0.85 * aiTrust;
            } else if (regime === 'HIGH_VOLATILITY' && hasPosition) {
                action = 'SELL';
                confidence = confidence * 0.75 * aiTrust;
            } else if (!hasPosition) {
                action = 'HOLD'; // Don't sell what we don't have
            }
        }

        // Minimum confidence filter
        if (confidence < 0.35) action = 'HOLD';

        if (action === 'HOLD') return null;

        const price = candles[candles.length - 1].close;
        return {
            symbol: 'BTCUSDT',
            action,
            confidence,
            price,
            timestamp: Date.now(),
            strategy: 'NeuralAI',
            riskLevel: 1,
            quantity: 0,
            metadata: {
                gruPrediction: prediction,
                regime,
                regimeConfidence: this.lastRegimeResult ? this.lastRegimeResult.confidence : 0,
                phase: this.phase,
                aiTrust,
                trainCount: this.pricePredictor.trainCount,
            },
        };
    }

    /**
     * Get optimal strategy weights from Thompson Sampling meta-optimizer
     * @returns {object} - { strategyName: weight }
     */
    getOptimalStrategyWeights() {
        return this.metaOptimizer.getOptimalWeights(this.currentRegime);
    }

    /**
     * Get optimal risk percentage from neural risk manager
     */
    async getOptimalRiskPercent(drawdownPct, winRate, volatility, consecutiveLosses, hoursSinceLastTrade) {
        const regimeIdx = REGIMES.indexOf(this.currentRegime);
        const features = this.featurePipeline.extractRiskFeatures(
            regimeIdx >= 0 ? regimeIdx : 2,
            drawdownPct, winRate, volatility, consecutiveLosses, hoursSinceLastTrade
        );
        this.lastRiskResult = await this.riskPredictor.predict(features);
        return this.lastRiskResult;
    }

    /**
     * Learn from a completed trade
     */
    async learnFromTrade(tradeResult) {
        if (!tradeResult) return;

        const { pnl, strategy, regime } = tradeResult;
        const actualRegime = regime || this.currentRegime;

        // Update meta-optimizer (Thompson Sampling)
        if (strategy) {
            this.metaOptimizer.recordResult(actualRegime, strategy, pnl);
        }

        // Buffer risk training sample
        // Target risk: if trade was profitable, current risk was good; if loss, should have been lower
        const currentRisk = this.lastRiskResult ? this.lastRiskResult.riskPercent : 0.015;
        let targetRisk;
        if (pnl > 0) {
            // Profitable: slightly increase risk (up to 3%)
            targetRisk = Math.min(0.03, currentRisk * 1.1);
        } else {
            // Loss: decrease risk
            targetRisk = Math.max(0.005, currentRisk * 0.7);
        }
        // Normalize to [0, 1] for sigmoid output
        const normalizedTarget = (targetRisk - 0.005) / 0.025;

        const regimeIdx = REGIMES.indexOf(actualRegime);
        // Get approximate features for risk sample
        const riskFeatures = [
            (regimeIdx >= 0 ? regimeIdx : 2) / 3,
            0.5, // placeholder drawdown
            tradeResult.winRate || 0.5,
            0.5, // placeholder volatility
            (tradeResult.consecutiveLosses || 0) / 5,
            0.5, // placeholder time
        ];
        this.buffer.addRiskSample(riskFeatures, normalizedTarget);

        console.log(`[NEURAL AI] Trade learned: PnL=$${pnl.toFixed(2)} | Regime=${actualRegime} | Strategy=${strategy} | MetaUpdates=${this.metaOptimizer.totalUpdates}`);
    }

    /**
     * Trigger asynchronous model training
     */
    async _triggerTraining() {
        if (this.trainingInProgress) return;
        this.trainingInProgress = true;

        try {
            console.log('[NEURAL AI] Training cycle started...');
            const t0 = Date.now();

            // 1. Train GRU price predictor
            if (this.buffer.lstmSequences.length >= MIN_TRAIN_SAMPLES) {
                // Shuffle and take last N sequences
                const sequences = this.buffer.lstmSequences.slice(-Math.min(1000, this.buffer.lstmSequences.length));
                // Shuffle
                for (let i = sequences.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [sequences[i], sequences[j]] = [sequences[j], sequences[i]];
                }
                await this.pricePredictor.train(sequences, 5);
            }

            // 2. Train regime detector
            if (this.buffer.regimeSamples.length >= 50) {
                const samples = this.buffer.regimeSamples.slice(-500);
                await this.regimeDetector.train(samples, 8);
            }

            // 3. Train risk predictor
            if (this.buffer.riskSamples.length >= 30) {
                await this.riskPredictor.train(this.buffer.riskSamples.slice(-200), 10);
            }

            this.buffer.markTrained();
            const elapsed = Date.now() - t0;
            console.log(`[NEURAL AI] Training complete in ${elapsed}ms | GRU: ${this.pricePredictor.trainCount} trains, acc: ${(this.pricePredictor.lastAccuracy * 100).toFixed(1)}%`);

        } catch (e) {
            console.error('[NEURAL AI] Training error:', e.message);
        } finally {
            this.trainingInProgress = false;
        }
    }

    /**
     * Save all model checkpoints and state
     */
    async _saveCheckpoint() {
        try {
            await this.pricePredictor.save(MODEL_DIR);
            await this.regimeDetector.save(MODEL_DIR);
            await this.riskPredictor.save(MODEL_DIR);

            // Save meta-optimizer, feature stats, and engine state
            const state = {
                meta: this.metaOptimizer.getState(),
                features: this.featurePipeline.getState(),
                candlesProcessed: this.buffer.candlesProcessed,
                lastTrainCandle: this.buffer.lastTrainCandle,
                phase: this.phase,
                totalSignals: this.totalSignalsGenerated,
                correctPredictions: this.correctPredictions,
                savedAt: new Date().toISOString(),
            };
            fs.writeFileSync(path.join(MODEL_DIR, 'meta_state.json'), JSON.stringify(state, null, 2));
        } catch (e) {
            console.error('[NEURAL AI] Checkpoint save error:', e.message);
        }
    }

    /**
     * Get comprehensive status for API/dashboard
     */
    getStatus() {
        const accuracy = this.totalSignalsGenerated > 10
            ? (this.correctPredictions / this.totalSignalsGenerated * 100).toFixed(1) + '%'
            : 'N/A (collecting data)';

        return {
            phase: this.phase,
            isReady: this.isReady,
            currentRegime: this.currentRegime,
            regimeProbabilities: this.regimeDetector.regimeProbabilities,
            gruTrained: this.pricePredictor.trained,
            gruTrainCount: this.pricePredictor.trainCount,
            gruAccuracy: (this.pricePredictor.lastAccuracy * 100).toFixed(1) + '%',
            predictionAccuracy: accuracy,
            totalSignals: this.totalSignalsGenerated,
            metaOptimizerUpdates: this.metaOptimizer.totalUpdates,
            expectedWinRates: this.metaOptimizer.getExpectedWinRates(this.currentRegime),
            riskModelTrained: this.riskPredictor.trained,
            candlesProcessed: this.buffer.candlesProcessed,
            lstmBufferSize: this.buffer.lstmSequences.length,
            regimeBufferSize: this.buffer.regimeSamples.length,
            riskBufferSize: this.buffer.riskSamples.length,
            lastPrediction: this.lastPrediction,
            lastRegime: this.lastRegimeResult,
            lastRisk: this.lastRiskResult,
            tfVersion: tf ? tf.version.tfjs : 'N/A',
        };
    }
}

module.exports = { AdaptiveNeuralEngine };
