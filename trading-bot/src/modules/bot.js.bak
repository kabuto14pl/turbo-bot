'use strict';
/**
 * @module Bot
 * @description Main orchestrator. Wires all modules together.
 * Entry point: node src/modules/bot.js
 *
 * Architecture:
 *   Config ??? DataPipeline ??? StrategyRunner ??? EnsembleVoting ??? ExecutionEngine
 *   PortfolioManager ?????? RiskManager ?????? MLIntegration
 *   Server (HTTP/WS) ??? MonitoringBridge
 *   StatePersistence ?????? All stateful modules
 */
const { loadConfig } = require('./config');
const { PortfolioManager } = require('./portfolio-manager');
const { RiskManager } = require('./risk-manager');
const { DataPipeline } = require('./data-pipeline');
const { StrategyRunner } = require('./strategy-runner');
const { EnsembleVoting } = require('./ensemble-voting');
const { ExecutionEngine } = require('./execution-engine');
const { MLIntegration } = require('./ml-integration');
const { StatePersistence } = require('./state-persistence');
const { MonitoringBridge } = require('./monitoring-bridge');
const { Server } = require('./server');

class AutonomousTradingBot {
    constructor() {
        // 1. Load configuration
        this.config = loadConfig();
        // 2. Core modules
        this.pm = new PortfolioManager(this.config);
        this.rm = new RiskManager(this.config, this.pm);
        this.dp = new DataPipeline(this.config);
        this.ml = null; // Initialized async
        this.ensemble = new EnsembleVoting();
        this.exec = new ExecutionEngine(this.config, this.pm, this.rm, null);
        this.strategies = new StrategyRunner(this.config, this.rm, this.dp);
        this.state = new StatePersistence();
        this.mon = new MonitoringBridge(this.config);
        this.server = new Server(this.config, {
            pm: this.pm, rm: this.rm, ml: this.ml,
            monitoring: this.mon, strategies: this.strategies, dataPipeline: this.dp,
        });
        // State
        this.isRunning = false;
        this._sameCandleCycleCount = 0;
        this._lastAnalyzedCandleTimestamp = null;
        // External subsystems (optional)
        this.advancedPositionManager = null;
        this.monitoringSystem = null;
        this.duckdbIntegration = null;
        this.queryBuilder = null;
        this.ensembleEngine = null;
        this.portfolioOptimizer = null;
        this.backtestEngine = null;
    }

    async initialize() {
        console.log('???? [' + this.config.instanceId + '] Initializing MODULAR ENTERPRISE Trading Bot');
        console.log('???? Config:', JSON.stringify({ symbol: this.config.symbol, capital: this.config.initialCapital, instance: this.config.instanceId }, null, 2));

        // HTTP + WS Server
        await this.server.start();

        // OKX Live Data
        try {
            const { OKXLiveDataClient } = require('../../infrastructure/okx_live_data_client');
            const okxClient = new OKXLiveDataClient();
            
            this.dp.setOkxClient(okxClient);
            console.log('??? OKX Live Data: Connected');
        } catch (e) { console.warn('?????? OKX Live Data: ' + e.message + ' (using mock)'); }

        // WebSocket Feeds
        try {
            const { MultiSourceWebSocketAggregator } = require('../../infrastructure/websocket');
            const wsAgg = new MultiSourceWebSocketAggregator();
            await wsAgg.connect();
            this.dp.setWsAggregator(wsAgg);
            console.log('??? WebSocket Feeds: Connected');
        } catch (e) { console.warn('?????? WebSocket Feeds: ' + e.message); }

        // Enterprise ML
        try {
            const { EnterpriseMLAdapter } = require('../core/ml/enterprise_ml_system');
            const mlSystem = new EnterpriseMLAdapter();
            await mlSystem.initialize();
            this.ml = new MLIntegration(mlSystem);
            this.exec.ml = this.ml;
            this.server.ml = this.ml;
            console.log('??? Enterprise ML: Active');
            this.mon.setComponent('ml', true);
            // Production ML Integrator
            try {
                const { ProductionMLIntegrator } = require('../core/ml/production_ml_integrator');
                const pml = new ProductionMLIntegrator();
                this.ml.setProductionML(pml);
            } catch(e) {}
            // Simple RL Adapter
            try {
                const { SimpleRLAdapter } = require('../core/ml/simple_rl_adapter');
                const srl = new SimpleRLAdapter();
                this.ml.setSimpleRL(srl);
            } catch(e) {}
        } catch (e) { console.warn('?????? ML: ' + e.message); }

        // Advanced Position Manager
        try {
            const { AdvancedPositionManager } = require('../../core/risk/advanced_position_manager');
            this.advancedPositionManager = new AdvancedPositionManager(this.config.initialCapital);
            this.exec.setAdvancedPositionManager(this.advancedPositionManager);
            console.log('??? Advanced Position Manager: Active');
        } catch (e) { console.warn('?????? APM: ' + e.message); }

        // DuckDB Analytics
        try {
            const { DuckDBIntegration } = require('../../analytics/duckdb_integration');
            const { QueryBuilder } = require('../../analytics/query_builder');
            this.duckdbIntegration = new DuckDBIntegration();
            await this.duckdbIntegration.initialize();
            this.queryBuilder = new QueryBuilder(this.duckdbIntegration);
            console.log('??? DuckDB Analytics: Active');
            this.mon.setComponent('database', true);
        } catch (e) { console.warn('?????? DuckDB: ' + e.message); }

        // Enterprise Monitoring
        try {
            const monitoring = require('../../../src/monitoring');
            this.monitoringSystem = monitoring;
            if (this.monitoringSystem.initialize) await this.monitoringSystem.initialize();
            if (this.monitoringSystem.startMonitoring) this.monitoringSystem.startMonitoring();
            this.exec.setMonitoringSystem(this.monitoringSystem);
            console.log('??? Monitoring: Active');
        } catch (e) { console.warn('?????? Monitoring: ' + e.message); }

        // Tier 3: Ensemble/Portfolio/Backtest
        try {
            const { EnsemblePredictionEngine } = require('../core/ml/ensemble_prediction_engine');
            this.ensembleEngine = new EnsemblePredictionEngine();
            console.log('??? Ensemble Prediction Engine: Active');
        } catch (e) {}
        try {
            const { PortfolioOptimizationEngine } = require('../core/optimization/portfolio_optimization_engine');
            this.portfolioOptimizer = new PortfolioOptimizationEngine();
            console.log('??? Portfolio Optimizer: Active');
        } catch (e) {}

        // Initialize strategies (needs class imports)
        try {
            const { SuperTrendStrategy } = require('../../core/strategy/supertrend');
            const { MACrossoverStrategy } = require('../../core/strategy/ma_crossover');
            const { MomentumProStrategy } = require('../../core/strategy/momentum_pro');
            const { Logger } = require('../../infrastructure/logging/logger');
            this.strategies.setPortfolioDataGetter(() => this._getPortfolioData());
            this.strategies.initialize({ SuperTrendStrategy, MACrossoverStrategy, MomentumProStrategy, Logger });
            this.mon.setComponent('strategies', true);
        } catch (e) { console.error('??? Strategy init:', e.message); }

        // Load saved state
        this.state.load(this.pm, this.rm, this.ml);

        this.mon.setComponent('monitoring', true);
        console.log('??? [' + this.config.instanceId + '] MODULAR ENTERPRISE Bot initialized');
        console.log('???? ML: ' + (this.ml ? this.ml.getConfidenceInfo() : 'disabled'));
    }

    _getPortfolioData() {
        const p = this.pm.getPortfolio();
        const b = this.pm.getBalance();
        const positions = this.pm.getPositions();
        const avgEntry = positions.size > 0 ? Array.from(positions.values())[0].entryPrice : 0;
        return { cash: b.usdtBalance, btc: b.btcBalance, totalValue: p.totalValue, unrealizedPnL: p.unrealizedPnL, realizedPnL: p.realizedPnL, averageEntryPrice: avgEntry };
    }

    async executeTradingCycle() {
        try {
            // Circuit breaker check
            if (this.rm.isCircuitBreakerTripped()) {
                console.log('???? Circuit breaker tripped ??? skipping');
                return;
            }
            console.log('???? [' + this.config.instanceId + '] Trading cycle...');

            // 1. Fetch market data
            const marketData = await this.dp.getMarketData();
            const latestCandle = marketData[marketData.length - 1];
            const newTs = latestCandle ? latestCandle.timestamp : null;

            // 2. Candle dedup
            if (!this._sameCandleCycleCount) this._sameCandleCycleCount = 0;
            if (this._lastAnalyzedCandleTimestamp && newTs && newTs === this._lastAnalyzedCandleTimestamp) {
                this._sameCandleCycleCount++;
                const hasPos = this.pm.positionCount > 0;
                const shouldRun = hasPos && (this._sameCandleCycleCount % 3 === 0);
                if (!shouldRun) {
                    console.log('[CYCLE] Same candle ??? monitoring only');
                    // Update unrealized PnL
                    for (const [sym, pos] of this.pm.getPositions()) {
                        try {
                            let cp;
                            if (this.dp.okxClient) { const t = await this.dp.okxClient.getTicker(sym); if(t&&t.last) cp = parseFloat(t.last); }
                            if (!cp) { const fb = this.dp.getMarketDataHistory(); if(fb.length) cp = fb[fb.length-1].close; }
                            if (cp) this.pm.portfolio.unrealizedPnL = (cp - pos.entryPrice) * pos.quantity;
                        } catch(e) {}
                    }
                    this.mon.updateHealth(this.pm, this.rm, this.ml, this.isRunning);
                    // Still run SL/TP monitoring
                } else {
                    console.log('[CYCLE] Same candle but position open ??? strategies cycle ' + this._sameCandleCycleCount);
                }
            } else {
                this._lastAnalyzedCandleTimestamp = newTs;
                this._sameCandleCycleCount = 0;
            }

            // 3. Append to history
            this.dp.appendHistory(marketData);
            const history = this.dp.getMarketDataHistory();

            // 4. Run all strategies
            const allSignals = await this.strategies.runAll(history);

            // 5. ML analysis
            if (this.ml && this.ml.isReady && history.length > 10) {
                try {
                    const latest = history[history.length - 1];
                    const rsi = require('./indicators').calculateRSI(history.slice(-15).map(d => d.close), 14);
                    const priceHistory = history.map(d => d.close);
                    const hasPos = this.pm.positionCount > 0;
                    const mlAction = await this.ml.getAction(latest.close, rsi, latest.volume, priceHistory, hasPos);
                    if (mlAction) {
                        console.log('???? ML: ' + (mlAction.action_type || 'NULL') + ' (conf: ' + ((mlAction.confidence||0)*100).toFixed(1) + '%)');
                        const mlSignal = this.ml.createSignal(mlAction, latest.close, this.config.symbol);
                        allSignals.set('EnterpriseML', mlSignal);
                    }
                    this.ml.logProgress();
                } catch (e) { console.error('??? ML error:', e.message); }
            }

            // 6. Ensemble voting
            if (allSignals.size > 0) {
                const consensus = this.ensemble.vote(allSignals, this.rm);
                if (consensus && consensus.action !== 'HOLD') {
                    console.log('???? [CONSENSUS] ' + consensus.action + ' (conf: ' + (consensus.confidence*100).toFixed(1) + '%)');
                    await this.exec.executeTradeSignal(consensus, this.dp);
                    this.server.broadcastPortfolioUpdate();
                }
            }

            // 7. SL/TP monitoring for open positions
            if (this.pm.positionCount > 0) {
                const getPriceFn = async (sym) => {
                    try {
                        if (this.dp.okxClient) { const t = await this.dp.okxClient.getTicker(sym); if(t&&t.last) return parseFloat(t.last); }
                    } catch(e) {}
                    const h = this.dp.getMarketDataHistory();
                    return h.length > 0 ? h[h.length-1].close : null;
                };
                await this.exec.monitorPositions(getPriceFn, history);

                // APM monitoring
                if (this.advancedPositionManager) {
                    try {
                        const prices = {};
                        for (const sym of this.pm.getPositions().keys()) {
                            try {
                                if (this.dp.okxClient) { const t = await this.dp.okxClient.getTicker(sym); if(t&&t.last) prices[sym] = parseFloat(t.last); }
                            } catch(e) {}
                            if (!prices[sym] && history.length > 0) prices[sym] = history[history.length-1].close;
                        }
                        if (Object.keys(prices).length > 0) {
                            const closed = await this.advancedPositionManager.updatePositions(prices);
                            if (closed && closed.length > 0) {
                                for (const c of closed) {
                                    if (this.pm.hasPosition(c.symbol)) {
                                        const pos = this.pm.getPosition(c.symbol);
                                        const trade = this.pm.closePosition(c.symbol, c.currentPrice, null, 'APM_AUTO', 'APM');
                                        if (trade) {
                                            console.log('[APM SYNC] ' + c.symbol + ' auto-closed | PnL: $' + trade.pnl.toFixed(2));
                                            this.rm.recordTradeResult(trade.pnl);
                                        }
                                    }
                                }
                            }
                        }
                    } catch(e) { console.warn('?????? APM monitor:', e.message); }
                }
            }

            // 8. Update health + state
            this.mon.updateHealth(this.pm, this.rm, this.ml, this.isRunning);
            console.log('??? [' + this.config.instanceId + '] Cycle complete');
        } catch (err) {
            console.error('??? Trading cycle error:', err);
            throw err;
        }
    }

    async start() {
        console.log('???? Starting MODULAR ENTERPRISE Autonomous Trading Bot');
        await this.initialize();
        console.log('???? ADAPTIVE ML: ' + (this.ml ? this.ml.getConfidenceInfo() : 'disabled'));

        this.isRunning = true;
        let lastHealthBroadcast = Date.now();

        while (this.isRunning) {
            try {
                await this.executeTradingCycle();
                if (Date.now() - lastHealthBroadcast > 30000) {
                    this.server.broadcastHealthUpdate();
                    lastHealthBroadcast = Date.now();
                }
                this.state.save(this.pm, this.rm, this.ml);
                await this._sleep(this.config.tradingInterval);
            } catch (err) {
                console.error('??? Cycle error:', err);
                this.server.broadcastAlert('Cycle error: ' + err.message, 'error');
                await this._sleep(5000);
            }
        }
    }

    async stop() {
        console.log('???? Stopping bot...');
        this.isRunning = false;
        this.state.save(this.pm, this.rm, this.ml);
        console.log('??? Bot stopped. State saved.');
    }

    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// Auto-start
const bot = new AutonomousTradingBot();
process.on('SIGTERM', () => bot.stop().then(() => process.exit(0)));
process.on('SIGINT', () => bot.stop().then(() => process.exit(0)));
bot.start().catch(err => { console.error('FATAL:', err); process.exit(1); });

module.exports = { AutonomousTradingBot };
