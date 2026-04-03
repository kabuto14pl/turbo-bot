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
            : ['SOLUSDT', 'BNBUSDT'],
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
        // P#204a: Fix fee rate parity — was 0.001 (0.10%), backtest uses 0.0005 taker (Board5)
        tradingFeeRate: parseFloat(process.env.TRADING_FEE_RATE || '0.0005'),
        // P#198.5: VQC per-TF override — backtest proved VQC helps 4h but destroys 1h
        vqcEnabledTimeframes: (process.env.VQC_ENABLED_TF || '4h').split(',').map(s => s.trim()),
        // P#214: OKX API credentials for live/demo trading
        okx: {
            apiKey: process.env.OKX_API_KEY || '',
            secretKey: process.env.OKX_SECRET_KEY || '',
            passphrase: process.env.OKX_PASSPHRASE || '',
            sandbox: process.env.OKX_SANDBOX !== 'false', // default: true (demo trading)
        },
    };
}

module.exports = { loadConfig };
