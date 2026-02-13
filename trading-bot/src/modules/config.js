'use strict';
/**
 * @module Config
 * @description Centralized configuration loader.
 * Single source of truth for all bot settings.
 */
const dotenv = require('dotenv');
dotenv.config();

function loadConfig() {
    return {
        symbol: process.env.TRADING_SYMBOL || 'BTCUSDT',
        symbols: process.env.TRADING_SYMBOLS
            ? process.env.TRADING_SYMBOLS.split(',').map(s => s.trim())
            : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT'],
        timeframe: process.env.TIMEFRAME || '1h',
        strategy: process.env.STRATEGY || 'AdvancedAdaptive',
        initialCapital: parseFloat(process.env.INITIAL_CAPITAL || '1000'),
        maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN || '0.15'),
        riskPerTrade: parseFloat(process.env.RISK_PER_TRADE || '0.02'),
        enableLiveTrading: process.env.ENABLE_LIVE_TRADING === 'true',
        enableAutoHedging: process.env.AUTO_HEDGING === 'true',
        instanceId: process.env.INSTANCE_ID || 'primary',
        healthCheckPort: parseInt(process.env.HEALTH_CHECK_PORT || '3001'),
        prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9091'),
        paperTrading: process.env.PAPER_TRADING !== 'false',
        enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false',
        portfolioOptimizationEnabled: process.env.PORTFOLIO_OPTIMIZATION !== 'false',
        rebalanceIntervalHours: parseFloat(process.env.REBALANCE_INTERVAL_HOURS || '12'),
        correlationThreshold: parseFloat(process.env.CORRELATION_THRESHOLD || '0.5'),
        tradingInterval: parseInt(process.env.TRADING_INTERVAL || '30000'),
        tradingFeeRate: parseFloat(process.env.TRADING_FEE_RATE || '0.001'),
    };
}

module.exports = { loadConfig };
