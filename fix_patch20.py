#!/usr/bin/env python3
"""
Patch #20: Fix strategies health check + disable daily trade limit in simulation mode
"""
import os
import re

BASE = '/root/turbo-bot'

# ============================================================
# 1. Create logger.js (compiled from logger.ts)
# ============================================================
logger_js = '''"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs = require("fs");
const path = require("path");

class Logger {
    constructor(logFile) {
        this.fileStream = null;
        if (logFile) {
            const logDir = path.dirname(logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            this.fileStream = fs.createWriteStream(logFile, { flags: 'a' });
        }
    }
    info(message, data) {
        const msg = '[INFO] ' + new Date().toISOString() + ': ' + message + (data ? ' ' + JSON.stringify(data) : '');
        console.log(msg);
        if (this.fileStream) this.fileStream.write(msg + '\\n');
    }
    success(message, data) {
        const msg = '[SUCCESS] ' + new Date().toISOString() + ': ' + message + (data ? ' ' + JSON.stringify(data) : '');
        console.log(msg);
        if (this.fileStream) this.fileStream.write(msg + '\\n');
    }
    warn(message, data) {
        const msg = '[WARN] ' + new Date().toISOString() + ': ' + message + (data ? ' ' + JSON.stringify(data) : '');
        console.warn(msg);
        if (this.fileStream) this.fileStream.write(msg + '\\n');
    }
    error(message, error) {
        const msg = '[ERROR] ' + new Date().toISOString() + ': ' + message + (error ? ' ' + JSON.stringify(error) : '');
        console.error(msg);
        if (this.fileStream) this.fileStream.write(msg + '\\n');
    }
    debug(message, data) {
        const msg = '[DEBUG] ' + new Date().toISOString() + ': ' + message + (data ? ' ' + JSON.stringify(data) : '');
        console.debug(msg);
        if (this.fileStream) this.fileStream.write(msg + '\\n');
    }
    close() {
        if (this.fileStream) { this.fileStream.end(); }
    }
}
exports.Logger = Logger;
'''

logger_path = os.path.join(BASE, 'trading-bot/infrastructure/logging/logger.js')
with open(logger_path, 'w') as f:
    f.write(logger_js)
print(f'[OK] logger.js created: {os.path.getsize(logger_path)} bytes')

# ============================================================
# 2. Create base_strategy.js (compiled from base_strategy.ts)
# ============================================================
base_strategy_js = '''"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseStrategy = void 0;

class BaseStrategy {
    constructor(name, description, defaultWeight, config, logger) {
        this.name = name;
        this.description = description;
        this.defaultWeight = defaultWeight;
        this.weight = defaultWeight;
        this.config = config || {};
        this.logger = logger || { info: function(){}, warn: function(){}, error: function(){}, debug: function(){}, success: function(){}, close: function(){} };
    }

    setWeight(weight) { this.weight = weight; }
    getWeight() { return this.weight; }

    generateSignal(state) {
        return this.run(state);
    }

    run(state) {
        throw new Error('BaseStrategy.run() must be implemented by subclass');
    }

    validateConfig() { return true; }

    getRequiredIndicators() {
        return Object.keys(this.config.indicators || {});
    }

    getRequiredTimeframes() {
        return this.config.timeframes || ['m15'];
    }

    getConfig() {
        return Object.assign({}, this.config);
    }

    processSentiment(state) {
        if (!state.sentiment) {
            return { sentimentMultiplier: 1.0, riskAdjustment: 1.0, signalConfidence: 0.5, shouldTrade: true };
        }
        var sentiment = state.sentiment;
        var sentimentStrength = Math.abs(sentiment.overall) * sentiment.confidence;
        var sentimentMultiplier = 0.8 + (sentimentStrength * 0.4);
        var riskAdjustment = 1.0;
        switch (sentiment.riskLevel) {
            case 'low': riskAdjustment = 1.2; break;
            case 'medium': riskAdjustment = 1.0; break;
            case 'high': riskAdjustment = 0.7; break;
        }
        var signalConfidence = Math.min(1.0, 0.5 + (sentiment.confidence * 0.3) + (sentiment.signalConfidence * 0.2));
        var shouldTrade = sentiment.tradingSignal !== 'hold' && sentiment.confidence > 0.3;
        return { sentimentMultiplier: sentimentMultiplier, riskAdjustment: riskAdjustment, signalConfidence: signalConfidence, shouldTrade: shouldTrade };
    }

    enhanceSignalWithSentiment(baseSignal, state) {
        var sentimentData = this.processSentiment(state);
        if (!state.sentiment) {
            return {
                type: baseSignal.type, price: baseSignal.price,
                confidence: baseSignal.confidence, stopLoss: baseSignal.stopLoss,
                takeProfit: baseSignal.takeProfit, size: baseSignal.size,
                indicators: baseSignal.indicators,
                sentiment: { influenced: false, multiplier: 1.0, riskAdjustment: 1.0, conflictDetected: false }
            };
        }
        var enhancedConfidence = Math.min(1.0, baseSignal.confidence * sentimentData.sentimentMultiplier * sentimentData.signalConfidence);
        var adjustedSize = baseSignal.size ? baseSignal.size * sentimentData.riskAdjustment : undefined;
        var conflictDetected = false;
        if (state.sentiment.tradingSignal === 'strong_buy' && baseSignal.type === 'ENTER_LONG') {
            enhancedConfidence *= 1.2;
        } else if (state.sentiment.tradingSignal === 'strong_sell' && baseSignal.type === 'ENTER_SHORT') {
            enhancedConfidence *= 1.2;
        } else if ((state.sentiment.tradingSignal === 'sell' || state.sentiment.tradingSignal === 'strong_sell') && baseSignal.type === 'ENTER_LONG') {
            enhancedConfidence *= 0.7;
            conflictDetected = true;
        } else if ((state.sentiment.tradingSignal === 'buy' || state.sentiment.tradingSignal === 'strong_buy') && baseSignal.type === 'ENTER_SHORT') {
            enhancedConfidence *= 0.7;
            conflictDetected = true;
        }
        return {
            type: baseSignal.type, price: baseSignal.price,
            confidence: Math.max(0.1, Math.min(1.0, enhancedConfidence)),
            stopLoss: baseSignal.stopLoss, takeProfit: baseSignal.takeProfit,
            size: adjustedSize, indicators: baseSignal.indicators,
            sentiment: { influenced: true, multiplier: sentimentData.sentimentMultiplier, riskAdjustment: sentimentData.riskAdjustment, conflictDetected: conflictDetected }
        };
    }

    async executeWithSentiment(state) {
        if (!this.validateState(state)) {
            throw new Error('Invalid state for strategy execution');
        }
        var baseSignals = await this.run(state);
        var baseSignal = Array.isArray(baseSignals) && baseSignals.length > 0 ? baseSignals[0] : null;
        if (!baseSignal) {
            return { type: 'HOLD', confidence: 0.5, reason: 'No signal generated' };
        }
        var enhancedSignal = this.enhanceSignalWithSentiment(baseSignal, state);
        var sentimentData = this.processSentiment(state);
        if (!sentimentData.shouldTrade && enhancedSignal.type !== 'EXIT_LONG' && enhancedSignal.type !== 'EXIT_SHORT') {
            return { type: 'HOLD', confidence: 0.5, reason: 'Sentiment analysis suggests holding' };
        }
        return enhancedSignal;
    }

    recordSentimentTrade(signal, state, performanceTracker) {
        if (!performanceTracker) return;
        var sentimentData = this.processSentiment(state);
        if (!sentimentData.shouldTrade && signal.type !== 'HOLD') {
            if (performanceTracker.recordBlockedTrade) {
                performanceTracker.recordBlockedTrade(
                    'BTCUSDT',
                    signal.type === 'ENTER_LONG' || signal.type === 'EXIT_SHORT' ? 'BUY' : 'SELL',
                    signal.size || 0.1,
                    (state.prices && state.prices.m15) ? state.prices.m15.close : 0,
                    (state.sentiment) ? state.sentiment.overall : 0.5,
                    (state.sentiment) ? state.sentiment.tradingSignal : 'low confidence',
                    this.name
                );
            }
            this.logger.info('Sentiment blocked ' + signal.type + ' signal - recorded for tracking');
        }
    }

    async executeWithSentimentTracking(state, performanceTracker) {
        var signal = await this.executeWithSentiment(state);
        this.recordSentimentTrade(signal, state, performanceTracker);
        return signal;
    }

    validateState(state) {
        if (!state) return false;
        var timeframes = this.getRequiredTimeframes();
        for (var i = 0; i < timeframes.length; i++) {
            var tf = timeframes[i];
            if (state.prices && !state.prices[tf]) {
                this.logger.warn('Missing price data for timeframe ' + tf);
                return false;
            }
            if (state.indicators && !state.indicators[tf]) {
                this.logger.warn('Missing indicators for timeframe ' + tf);
                return false;
            }
        }
        return true;
    }

    hasIndicator(indicators, indicator) {
        if (!indicators) return false;
        switch (indicator) {
            case 'rsi': return typeof indicators.rsi === 'number';
            case 'adx': return typeof indicators.adx === 'number';
            case 'atr': return typeof indicators.atr === 'number';
            case 'ema': return typeof indicators.ema_9 === 'number' && typeof indicators.ema_21 === 'number' && typeof indicators.ema_50 === 'number' && typeof indicators.ema_200 === 'number';
            case 'macd': return indicators.macd && typeof indicators.macd.macd === 'number' && typeof indicators.macd.signal === 'number' && typeof indicators.macd.histogram === 'number';
            case 'supertrend': return indicators.supertrend && typeof indicators.supertrend.value === 'number' && typeof indicators.supertrend.direction === 'string';
            case 'roc': return typeof indicators.roc === 'number';
            default: return false;
        }
    }

    calculateConfidence(primarySignal, secondarySignal, volatility, trend) {
        var normalizedPrimary = Math.min(Math.abs(primarySignal), 1);
        var normalizedSecondary = Math.min(Math.abs(secondarySignal), 1);
        var confidence = (normalizedPrimary * 0.4 + normalizedSecondary * 0.3 + (1 - volatility) * 0.15 + Math.abs(trend) * 0.15);
        return Math.min(Math.max(confidence, 0), 1);
    }

    createSignal(type, price, confidence, state, indicators) {
        return {
            type: type, price: price, confidence: confidence,
            indicators: indicators || {},
            metadata: {
                strategy: this.name,
                timeframe: (state.marketContext && state.marketContext.timeframe) ? state.marketContext.timeframe : 'm15',
                regime: state.regime
            }
        };
    }

    shouldExitPosition(position, state, stopLoss, takeProfit) {
        var currentPrice = state.marketData ? state.marketData.lastPrice : 0;
        if (!currentPrice) return false;
        if (position.direction === 'long') {
            if (currentPrice <= stopLoss) { this.logger.info('Exiting long position - Stop Loss hit'); return true; }
            if (currentPrice >= takeProfit) { this.logger.info('Exiting long position - Take Profit hit'); return true; }
        } else {
            if (currentPrice >= stopLoss) { this.logger.info('Exiting short position - Stop Loss hit'); return true; }
            if (currentPrice <= takeProfit) { this.logger.info('Exiting short position - Take Profit hit'); return true; }
        }
        return false;
    }
}

exports.BaseStrategy = BaseStrategy;
'''

bs_path = os.path.join(BASE, 'trading-bot/core/strategy/base_strategy.js')
with open(bs_path, 'w') as f:
    f.write(base_strategy_js)
print(f'[OK] base_strategy.js created: {os.path.getsize(bs_path)} bytes')

# ============================================================
# 3. Patch risk-manager.js: disable daily trade limit in simulation
# ============================================================
rm_path = os.path.join(BASE, 'trading-bot/src/modules/risk-manager.js')
with open(rm_path, 'r') as f:
    rm_content = f.read()

old_check = "        if (Date.now() - this.lastTradeDayReset > 86400000) { this.dailyTradeCount = 0; this.lastTradeDayReset = Date.now(); }\n        return this.dailyTradeCount < 10;"
new_check = """        if (Date.now() - this.lastTradeDayReset > 86400000) { this.dailyTradeCount = 0; this.lastTradeDayReset = Date.now(); }
        // PATCH #20: Bypass daily trade limit in simulation/paper mode
        const mode = (process.env.MODE || 'simulation').toLowerCase();
        if (mode === 'simulation' || mode === 'paper' || mode === 'paper_trading') {
            return true; // No daily trade limit in simulation/paper
        }
        return this.dailyTradeCount < 10;"""

if old_check in rm_content:
    rm_content = rm_content.replace(old_check, new_check)
    with open(rm_path, 'w') as f:
        f.write(rm_content)
    print(f'[OK] risk-manager.js patched: daily trade limit bypassed in simulation mode ({os.path.getsize(rm_path)} bytes)')
else:
    print('[WARN] risk-manager.js: old pattern not found, checking if already patched...')
    if 'Bypass daily trade limit' in rm_content:
        print('[OK] risk-manager.js: already patched')
    else:
        print('[ERR] risk-manager.js: pattern mismatch!')

# ============================================================
# 4. Verify strategy loading
# ============================================================
print('\n=== VERIFICATION ===')
for f in ['trading-bot/infrastructure/logging/logger.js', 
          'trading-bot/core/strategy/base_strategy.js',
          'trading-bot/src/modules/risk-manager.js']:
    fp = os.path.join(BASE, f)
    if os.path.exists(fp):
        print(f'[OK] {f}: {os.path.getsize(fp)} bytes')
    else:
        print(f'[ERR] {f}: MISSING!')

print('\n=== ALL PATCHES APPLIED ===')
