'use strict';
/**
 * @module Bot
 * @description Main orchestrator. Wires all modules together.
 * Entry point: node src/modules/bot.js
 *
 * PATCH #14: Fixed APM init, candle dedup return, SL/TP monitoring
 * PATCH #15: Neural AI (GRU + Thompson Sampling + Regime Detection)
 * PATCH #16: MEGATRON AI Chat + Quantum-Hybrid Engine + Activity Feed
 * PATCH #17: Hybrid Quantum-Classical Pipeline v2.0
 *   - HybridQuantumClassicalPipeline (QMC, QAOA, VQC, QFM, QRA, QDV, Decomposer)
 *   - 3-stage pipeline: Pre-processing -> Quantum Boost -> Post-processing
 *   - Quantum Decision Verification Gate before execution
 *   - Quantum weight optimization APPLIED to ensemble (bug fix from #16)
 *   - Quantum feedback loop to ML/Neural AI
 *   - Black Swan detection + stress testing
 * PATCH #18: Dynamic Position Management with Quantum Re-evaluation
 *   - QuantumPositionManager (Dynamic SL/TP, Health Scoring, Multi-Pos, Partial Close)
 *   - 4-stage pipeline: Pre-process -> Quantum Boost -> Verification -> Continuous Monitoring
 *   - VQC regime reclassification triggers dynamic SL/TP adjustments
 *   - QMC scenario simulation for position outlook & partial close decisions
 *   - QRA risk scoring per position with black swan emergency exits
 *   - Position health scoring (0-100) with 6 weighted factors
 *
 * Architecture:
 *   Config -> DataPipeline -> StrategyRunner -> EnsembleVoting -> ExecutionEngine
 *   PortfolioManager <-> RiskManager <-> MLIntegration
 *   AdaptiveNeuralEngine -> EnsembleVoting (dynamic weights + signal)
 *   MegatronCore -> LLM Chat + Activity Feed + Commands
 *   QuantumHybridEngine -> Signal Enhancement + Weight Optimization + VaR
 *   HybridQuantumClassicalPipeline -> QMC + QAOA + VQC + QFM + QRA + QDV + Decomposer
 *   QuantumPositionManager -> DynamicSLTP + HealthScorer + MultiPosOpt + ReEvaluator + PartialClose
 *   Server (HTTP/WS) -> MonitoringBridge
 *   StatePersistence <-> All stateful modules
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
        // PATCH #15: Neural AI
        this.neuralAI = null;
        this._lastPositionCount = 0;
        this._lastRealizedPnL = 0;
        this._lastConsensusStrategies = [];
        this._cycleCount = 0;
        // PATCH #16: Megatron + Quantum
        this.megatron = null;
        this.quantumEngine = null;
        this._forceCloseAll = false;
        this._pauseUntil = 0;
        // PATCH #17: Hybrid Quantum-Classical Pipeline
        this.hybridPipeline = null;
        // PATCH #18: Quantum Position Manager
        this.quantumPosMgr = null;
        // PATCH #24: Neuron AI Manager (Central Brain/Skynet)
        this.neuronManager = null;
    }

    async initialize() {
        console.log('[' + this.config.instanceId + '] Initializing MODULAR ENTERPRISE Trading Bot');
        console.log('Config:', JSON.stringify({ symbol: this.config.symbol, capital: this.config.initialCapital, instance: this.config.instanceId }, null, 2));

        // HTTP + WS Server
        await this.server.start();

        // OKX Live Data
        try {
            const { OKXLiveDataClient } = require('../../infrastructure/okx_live_data_client');
            const okxClient = new OKXLiveDataClient();
            this.dp.setOkxClient(okxClient);
            console.log('[OK] OKX Live Data: Connected');
        } catch (e) { console.warn('[WARN] OKX Live Data: ' + e.message + ' (using mock)'); }

        // WebSocket Feeds
        try {
            const { MultiSourceWebSocketAggregator } = require('../../infrastructure/websocket');
            const wsAgg = new MultiSourceWebSocketAggregator();
            await wsAgg.connect();
            this.dp.setWsAggregator(wsAgg);
            console.log('[OK] WebSocket Feeds: Connected');
        } catch (e) { console.warn('[WARN] WebSocket Feeds: ' + e.message); }

        // Enterprise ML
        try {
            const { EnterpriseMLAdapter } = require('../core/ml/enterprise_ml_system');
            const mlSystem = new EnterpriseMLAdapter();
            await mlSystem.initialize();
            this.ml = new MLIntegration(mlSystem);
            this.exec.ml = this.ml;
            this.server.ml = this.ml;
            console.log('[OK] Enterprise ML: Active');
            this.mon.setComponent('ml', true);
            try {
                const { ProductionMLIntegrator } = require('../core/ml/production_ml_integrator');
                const pml = new ProductionMLIntegrator();
                this.ml.setProductionML(pml);
            } catch(e) {}
            try {
                const { SimpleRLAdapter } = require('../core/ml/simple_rl_adapter');
                const srl = new SimpleRLAdapter();
                this.ml.setSimpleRL(srl);
            } catch(e) {}
        } catch (e) { console.warn('[WARN] ML: ' + e.message); }

        // PATCH #14: Advanced Position Manager
        try {
            const { AdvancedPositionManager } = require('../../core/risk/advanced_position_manager');
            const apmConfig = {
                maxPositions: 3, maxRiskPerTrade: 5, maxTotalRisk: 15,
                correlationThreshold: 10, rebalanceThreshold: 8,
                initialCapital: this.config.initialCapital
            };
            this.advancedPositionManager = new AdvancedPositionManager(apmConfig);
            this.exec.setAdvancedPositionManager(this.advancedPositionManager);
            console.log('[OK] Advanced Position Manager: Active');
        } catch (e) { console.warn('[WARN] APM: ' + e.message); }

        // DuckDB Analytics
        try {
            const { DuckDBIntegration } = require('../../analytics/duckdb_integration');
            const { QueryBuilder } = require('../../analytics/query_builder');
            this.duckdbIntegration = new DuckDBIntegration();
            await this.duckdbIntegration.initialize();
            this.queryBuilder = new QueryBuilder(this.duckdbIntegration);
            console.log('[OK] DuckDB Analytics: Active');
            this.mon.setComponent('database', true);
        } catch (e) { console.warn('[WARN] DuckDB: ' + e.message); }

        // Enterprise Monitoring
        try {
            const monitoring = require('../../../src/monitoring');
            this.monitoringSystem = monitoring;
            if (this.monitoringSystem.initialize) await this.monitoringSystem.initialize();
            if (this.monitoringSystem.startMonitoring) this.monitoringSystem.startMonitoring();
            this.exec.setMonitoringSystem(this.monitoringSystem);
            console.log('[OK] Monitoring: Active');
        } catch (e) { console.warn('[WARN] Monitoring: ' + e.message); }

        // Tier 3: Ensemble/Portfolio/Backtest
        try {
            const { EnsemblePredictionEngine } = require('../core/ml/ensemble_prediction_engine');
            this.ensembleEngine = new EnsemblePredictionEngine();
            console.log('[OK] Ensemble Prediction Engine: Active');
        } catch (e) {}
        try {
            const { PortfolioOptimizationEngine } = require('../core/optimization/portfolio_optimization_engine');
            this.portfolioOptimizer = new PortfolioOptimizationEngine();
            console.log('[OK] Portfolio Optimizer: Active');
        } catch (e) {}

        // Initialize strategies
        try {
            const { SuperTrendStrategy } = require('../../core/strategy/supertrend');
            const { MACrossoverStrategy } = require('../../core/strategy/ma_crossover');
            const { MomentumProStrategy } = require('../../core/strategy/momentum_pro');
            const { Logger } = require('../../infrastructure/logging/logger');
            this.strategies.setPortfolioDataGetter(() => this._getPortfolioData());
            this.strategies.initialize({ SuperTrendStrategy, MACrossoverStrategy, MomentumProStrategy, Logger });
            this.mon.setComponent('strategies', true);
        } catch (e) { console.error('[ERR] Strategy init:', e.message); }

        // PATCH #15: Adaptive Neural AI (TensorFlow.js)
        try {
            const { AdaptiveNeuralEngine } = require('../core/ai/adaptive_neural_engine');
            this.neuralAI = new AdaptiveNeuralEngine();
            await this.neuralAI.initialize();
            this.ensemble.setWeightProvider(this.neuralAI);
            console.log('[OK] Adaptive Neural AI: Phase=' + this.neuralAI.phase +
                ' | Regime=' + this.neuralAI.currentRegime +
                ' | Models: GRU+RegimeDetector+ThompsonSampling+NeuralRisk');
            this.mon.setComponent('neuralAI', true);
        } catch (e) {
            console.warn('[WARN] Neural AI: ' + e.message);
        }

        // PATCH #16: Quantum-Hybrid Engine (legacy — still used for per-signal enhancement)
        try {
            const { QuantumHybridEngine } = require('../core/ai/quantum_optimizer');
            this.quantumEngine = new QuantumHybridEngine({
                riskTolerance: 0.4,
                nReplicas: 8,
                annealingIterations: 300,
                walkSteps: 60,
                quantumWeight: 0.30,
                optimizeEvery: 50,
            });
            this.quantumEngine.initialize();
            console.log('[OK] Quantum-Hybrid Engine: SQA(8 replicas) + QWalk(60) + QVaR + HybridScorer');
            this.mon.setComponent('quantum', true);
        } catch (e) {
            console.warn('[WARN] Quantum Engine: ' + e.message);
        }

        // PATCH #17: Hybrid Quantum-Classical Pipeline v3.0
        try {
            const { HybridQuantumClassicalPipeline } = require('../core/ai/hybrid_quantum_pipeline');
            this.hybridPipeline = new HybridQuantumClassicalPipeline({
                qmc: { nScenarios: 8000, nQuantumPaths: 1500, confidenceLevels: [0.95, 0.99], timeHorizons: [1, 5, 10] },
                qaoa: { nLayers: 4, nIterations: 150, learningRate: 0.05 },
                vqc: { nQubits: 4, nLayers: 3, nFeatures: 8, learningRate: 0.01 },
                featureMapper: { nQubits: 5, nReps: 2, maxCacheSize: 500 },
                riskAnalyzer: {},
                verifier: { minConfidence: 0.40, maxVaRPct: 0.035, minSharpe: 0.4 },
                decomposer: { maxSubProblemSize: 4, nReplicas: 6, maxIterations: 200 },
                riskAnalysisInterval: 10,
                weightOptimizationInterval: 30,
                vqcTrainInterval: 50,
                qmcSimulationInterval: 15,
            });
            this.hybridPipeline.initialize();
            console.log('[OK] Hybrid Quantum Pipeline v' + this.hybridPipeline.version + ': QMC + QAOA(p=4) + VQC(4q,3L) + QFM(5q) + QRA + QDV + Decomposer');
            this.mon.setComponent('hybridPipeline', true);
        } catch (e) {
            console.warn('[WARN] Hybrid Pipeline: ' + e.message);
        }

        // PATCH #18: Quantum Position Manager (Stage 4 — Continuous Monitoring)
        try {
            const { QuantumPositionManager } = require('../core/ai/quantum_position_manager');
            const ind = require('./indicators');
            this.quantumPosMgr = new QuantumPositionManager({
                sltp: { baseSLMultiplier: 1.5, baseTPMultiplier: 4.0, trailingATRMultiplier: 1.5 },
                health: { healthyThreshold: 65, warningThreshold: 40, criticalThreshold: 25 },
                multiPos: { maxPositions: 5, maxExposurePerPosition: 0.25, maxTotalExposure: 0.80 },
                reEval: { reEvalInterval: 5, fullReEvalInterval: 15, riskReEvalInterval: 3 },
                partialClose: { regimeCloseConfidence: 0.65, riskCloseThreshold: 75 },
            });
            this.quantumPosMgr.initialize(this.hybridPipeline, ind);
            console.log('[OK] Quantum Position Manager v' + this.quantumPosMgr.version + ': DynamicSLTP + Health + MultiPos + ReEval + PartialClose');
            this.mon.setComponent('quantumPosMgr', true);
        } catch (e) {
            console.warn('[WARN] Quantum Position Manager: ' + e.message);
        }

        // PATCH #16: MEGATRON AI Chat System
        try {
            const { MegatronCore, attachMegatronRoutes } = require('../core/ai/megatron_system');
            this.megatron = new MegatronCore();
            this.megatron.initialize({
                pm: this.pm, rm: this.rm, ml: this.ml, dp: this.dp,
                ensemble: this.ensemble, exec: this.exec,
                neuralAI: this.neuralAI, quantumEngine: this.quantumEngine,
                strategies: this.strategies, mon: this.mon,
                botRef: this,
            });
            if (this.server.app && this.server.wss) {
                attachMegatronRoutes(this.server.app, this.server.wss, this.server.wsClients, this.megatron);

            // PATCH #24: Neuron AI Manager API endpoint
            this.server.app.get('/api/neuron-ai/status', (req, res) => {
                if (this.neuronManager) {
                    res.json(this.neuronManager.getStatus());
                } else {
                    res.json({ error: 'Neuron AI Manager not initialized' });
                }
            });
            }
            console.log('[OK] MEGATRON AI: Online | LLM Providers: ' + this.megatron.llm.providers.size);
            this.mon.setComponent('megatron', true);
        } catch (e) {
            console.warn('[WARN] Megatron: ' + e.message);
        }

        // Load saved state
        this.state.load(this.pm, this.rm, this.ml);

        this.mon.setComponent('monitoring', true);
        
        // PATCH #24: Initialize Neuron AI Manager (Central Brain/Skynet)
        try {
            const { NeuronAIManager } = require('../core/ai/neuron_ai_manager');
            this.neuronManager = new NeuronAIManager();
            this.neuronManager.initialize(this.megatron);
            // Apply NeuronAI adapted weights to ensemble if any
            const adaptedW = this.neuronManager.getAdaptedWeights();
            if (adaptedW && this.ensemble) {
                for (const [k, v] of Object.entries(adaptedW)) {
                    if (this.ensemble.staticWeights && this.ensemble.staticWeights[k] !== undefined) {
                        this.ensemble.staticWeights[k] = v;
                    }
                }
                const totalW = Object.values(this.ensemble.staticWeights).reduce((s, v) => s + v, 0);
                if (totalW > 0) {
                    for (const k of Object.keys(this.ensemble.staticWeights)) {
                        this.ensemble.staticWeights[k] /= totalW;
                    }
                }
                console.log('[NEURON AI] Adapted weights applied to ensemble');
            }
            // Wire to Megatron for chat routing
            if (this.megatron && this.megatron.setNeuronManager) {
                this.megatron.setNeuronManager(this.neuronManager);
            }
            this.mon.setComponent('neuronManager', true);
        } catch (e) {
            console.warn('[WARN] Neuron AI Manager: ' + e.message);
        }

        console.log('[' + this.config.instanceId + '] MODULAR ENTERPRISE Bot initialized');
        console.log('ML: ' + (this.ml ? this.ml.getConfidenceInfo() : 'disabled'));
        console.log('Neural AI: ' + (this.neuralAI ? 'ACTIVE (' + this.neuralAI.phase + ')' : 'disabled'));
        console.log('Quantum: ' + (this.quantumEngine ? 'ACTIVE (SQA+QWalk+QVaR)' : 'disabled'));
        console.log('Hybrid Pipeline: ' + (this.hybridPipeline ? 'ACTIVE v' + this.hybridPipeline.version + ' (QMC+QAOA+VQC+QFM+QRA+QDV)' : 'disabled'));
        console.log('Quantum Pos Mgr: ' + (this.quantumPosMgr && this.quantumPosMgr.isReady ? 'ACTIVE v' + this.quantumPosMgr.version + ' (4-stage)' : 'disabled'));
        console.log('Megatron: ' + (this.megatron ? 'ONLINE (' + this.megatron.llm.providers.size + ' LLM providers)' : 'disabled'));
        console.log('Neuron AI: ' + (this.neuronManager ? 'BRAIN ACTIVE v' + this.neuronManager.version + ' (' + this.neuronManager.totalDecisions + ' decisions, PnL: $' + this.neuronManager.totalPnL.toFixed(2) + ')' : 'disabled'));
    }

    _getPortfolioData() {
        const p = this.pm.getPortfolio();
        const b = this.pm.getBalance();
        const positions = this.pm.getPositions();
        const avgEntry = positions.size > 0 ? Array.from(positions.values())[0].entryPrice : 0;
        return { cash: b.usdtBalance, btc: b.btcBalance, totalValue: p.totalValue, unrealizedPnL: p.unrealizedPnL, realizedPnL: p.realizedPnL, averageEntryPrice: avgEntry };
    }

    async _getCurrentPrice(sym) {
        try {
            if (this.dp.okxClient) {
                const t = await this.dp.okxClient.getTicker(sym);
                if (t && t.last) return parseFloat(t.last);
            }
        } catch(e) {}
        const h = this.dp.getMarketDataHistory();
        return h.length > 0 ? h[h.length - 1].close : null;
    }

    async executeTradingCycle() {
        try {
            this._cycleCount++;

            // PATCH #16: Megatron pause check
            if (this._pauseUntil > 0 && Date.now() < this._pauseUntil) {
                console.log('[PAUSE] Trading paused by Megatron command (remaining: ' + Math.ceil((this._pauseUntil - Date.now()) / 60000) + ' min)');
                this.mon.updateHealth(this.pm, this.rm, this.ml, this.isRunning);
                return;
            } else if (this._pauseUntil > 0 && Date.now() >= this._pauseUntil) {
                this._pauseUntil = 0;
                console.log('[RESUME] Trading auto-resumed after Megatron pause');
                if (this.megatron) this.megatron.logActivity('SYSTEM', 'Auto-Resume', 'Pauza zakonczona, trading wznowiony');
            }

            // Circuit breaker check
            if (this.rm.isCircuitBreakerTripped()) {
                console.log('[CB] Circuit breaker tripped - skipping');
                if (this.megatron) this.megatron.logActivity('RISK', 'Circuit Breaker', 'Trading wstrzymany -- circuit breaker aktywny', {}, 'critical');
                return;
            }
            console.log('[' + this.config.instanceId + '] Trading cycle #' + this._cycleCount + '...');

            // 1. Fetch market data
            const marketData = await this.dp.getMarketData();
            const latestCandle = marketData[marketData.length - 1];
            const newTs = latestCandle ? latestCandle.timestamp : null;

            // 2. Candle dedup
            if (!this._sameCandleCycleCount) this._sameCandleCycleCount = 0;
            if (this._lastAnalyzedCandleTimestamp && newTs && newTs === this._lastAnalyzedCandleTimestamp) {
                this._sameCandleCycleCount++;
                const hasPos = this.pm.positionCount > 0;
                // PATCH #21: Allow periodic re-analysis every 10th cycle even without position
                // Without this fix, bot sits idle 97% of the time between candles
                const shouldRunPos = hasPos && (this._sameCandleCycleCount % 3 === 0);
                const shouldReAnalyze = !hasPos && (this._sameCandleCycleCount % 10 === 0);
                const shouldRun = shouldRunPos || shouldReAnalyze;
                if (!shouldRun) {
                    console.log('[CYCLE] Same candle - monitoring only');
                    for (const [sym, pos] of this.pm.getPositions()) {
                        try {
                            const cp = await this._getCurrentPrice(sym);
                            if (cp) this.pm.portfolio.unrealizedPnL = (cp - pos.entryPrice) * pos.quantity;
                        } catch(e) {}
                    }
                    this.mon.updateHealth(this.pm, this.rm, this.ml, this.isRunning);
                    if (this.pm.positionCount > 0) {
                        const history = this.dp.getMarketDataHistory();
                        const getPriceFn = async (sym) => this._getCurrentPrice(sym);
                        await this.exec.monitorPositions(getPriceFn, history);

                        // PATCH #18: Quantum Position Monitoring (even during same-candle)
                        if (this.quantumPosMgr && this.quantumPosMgr.isReady) {
                            try {
                                const priceArr = history.map(c => c.close);
                                const portfolio = this.pm.getPortfolio();
                                const qpmResult = await this.quantumPosMgr.evaluate(
                                    this.pm.getPositions(), priceArr, portfolio.totalValue,
                                    history, async (s) => this._getCurrentPrice(s)
                                );
                                if (!qpmResult.summary.skipped) {
                                    await this._applyQuantumPositionActions(qpmResult, history);
                                }
                            } catch(e) { console.warn('[WARN] QPM same-candle:', e.message); }
                        }
                    }
                    this._detectAndLearnFromCloses();
                    return;
                } else {
                    if (shouldReAnalyze) {
                        console.log('[CYCLE] PATCH #21: Periodic re-analysis without position (cycle ' + this._sameCandleCycleCount + ')');
                    } else {
                        console.log('[CYCLE] Same candle but position open - strategies cycle ' + this._sameCandleCycleCount);
                    }
                }
            } else {
                this._lastAnalyzedCandleTimestamp = newTs;
                this._sameCandleCycleCount = 0;
                // PATCH #21: Log new candle to Megatron
                if (this.megatron && latestCandle) {
                    this.megatron.logActivity('MARKET', '🕯️ New Candle',
                        'Price: $' + (latestCandle.close || 0).toFixed(2) + ' | Vol: ' + (latestCandle.volume || 0).toFixed(0),
                        { price: latestCandle.close, volume: latestCandle.volume }, 'low');
                }
            }

            // 3. Append to history
            this.dp.appendHistory(marketData);
            const history = this.dp.getMarketDataHistory();

            // PATCH #15: Neural AI -- process market update
            if (this.neuralAI && this.neuralAI.isReady) {
                try {
                    await this.neuralAI.processMarketUpdate(history);
                    if (this.megatron && this._cycleCount % 10 === 0) {
                        this.megatron.logActivity('REGIME', 'Regime: ' + (this.neuralAI.currentRegime || '?'),
                            'Phase: ' + this.neuralAI.phase + ' | Candles: ' + (this.neuralAI.candlesProcessed || 0));
                    }
                } catch(e) { console.warn('[WARN] Neural AI update:', e.message); }
            }

            // PATCH #17: Hybrid Pipeline -- STAGE 1: PRE-PROCESSING (Quantum Feature Enhancement)
            if (this.hybridPipeline && this.hybridPipeline.isReady && this.neuralAI && history.length > 20) {
                try {
                    let classicalFeatures = null;
                    try {
                        if (this.neuralAI.featurePipeline) {
                            classicalFeatures = this.neuralAI.featurePipeline.extractLSTMFeatures(history);
                        }
                    } catch(_fe) { classicalFeatures = null; }
                    if (classicalFeatures && classicalFeatures.length > 0) {
                        const priceArr = history.map(c => c.close);
                        const enhanced = this.hybridPipeline.preProcess(classicalFeatures, priceArr);
                        if (enhanced.quantumMetadata && this.megatron && this._cycleCount % 20 === 0) {
                            this.megatron.logActivity('QUANTUM', 'Feature Enhancement',
                                'Entropy: ' + enhanced.quantumMetadata.kernelEntropy +
                                ' | Correlation: ' + enhanced.quantumMetadata.correlationScore +
                                ' | QFeatures: ' + enhanced.quantumMetadata.nQuantumFeatures);
                        }
                    }
                } catch(e) { console.warn('[WARN] Hybrid pre-process:', e.message); }
            }

            // 4. PATCH #22: Compute MTF bias before strategy run
            try {
                var tfData = this.dp.getCachedTimeframeData();
                if (tfData && (tfData.h1 || tfData.h4 || tfData.d1)) {
                    var mtfModule = this.strategies.getMTFConfluence();
                    var mtfBias = mtfModule.computeBias(tfData);
                    if (this._cycleCount % 10 === 0) {
                        console.log('[MTF] Bias: ' + mtfBias.direction + ' (score=' + mtfBias.score + ', perm=' + mtfBias.tradePermission + ', reason=' + mtfBias.reason + ')');
                        console.log('[MTF] D1=' + mtfBias.timeframes.d1.direction + '(' + mtfBias.timeframes.d1.strength + ') H4=' + mtfBias.timeframes.h4.direction + '(' + mtfBias.timeframes.h4.strength + ') H1=' + mtfBias.timeframes.h1.direction + '(' + mtfBias.timeframes.h1.strength + ')');
                    }
                }
            } catch(e) { console.warn('[MTF] Bias computation failed:', e.message); }

            // 4. Run all strategies
            const allSignals = await this.strategies.runAll(history);

            // Log strategy signals to Megatron
            if (this.megatron && allSignals.size > 0) {
                const sigSummary = [];
                for (const [name, sig] of allSignals) {
                    if (sig.action !== 'HOLD') sigSummary.push(name + ':' + sig.action);
                }
                if (sigSummary.length > 0) {
                    this.megatron.logActivity('SIGNAL', 'Sygnaly strategii', sigSummary.join(', ') || 'All HOLD');
                }
            }

            // 5. ML analysis
            if (this.ml && this.ml.isReady && history.length > 10) {
                try {
                    const latest = history[history.length - 1];
                    const rsi = require('./indicators').calculateRSI(history.slice(-15).map(d => d.close), 14);
                    const priceHistory = history.map(d => d.close);
                    const hasPos = this.pm.positionCount > 0;
                    const mlAction = await this.ml.getAction(latest.close, rsi, latest.volume, priceHistory, hasPos);
                    if (mlAction) {
                        console.log('[ML] ' + (mlAction.action_type || 'NULL') + ' (conf: ' + ((mlAction.confidence||0)*100).toFixed(1) + '%)');
                        const mlSignal = this.ml.createSignal(mlAction, latest.close, this.config.symbol);
                        allSignals.set('EnterpriseML', mlSignal);
                    }
                    this.ml.logProgress();
                } catch (e) { console.error('[ML ERROR]', e.message); }
            }

            // PATCH #15: Neural AI signal
            if (this.neuralAI && this.neuralAI.isReady && history.length > 20) {
                try {
                    const hasPos = this.pm.positionCount > 0;
                    const aiSignal = await this.neuralAI.generateAISignal(history, hasPos);
                    if (aiSignal && aiSignal.action !== 'HOLD') {
                        // PATCH #24: NeuralAI removed from ensemble voting (now central brain manager)
                        // allSignals.set('NeuralAI', aiSignal);
                        console.log('[NEURAL AI] ' + aiSignal.action + ' (conf: ' + ((aiSignal.confidence||0)*100).toFixed(1) + '%, regime: ' + (aiSignal.regime || 'N/A') + ')');
                        if (this.megatron) {
                            this.megatron.logActivity('SIGNAL', 'Neural AI: ' + aiSignal.action,
                                'Conf: ' + ((aiSignal.confidence||0)*100).toFixed(1) + '% | Regime: ' + (aiSignal.regime || '?'));
                        }
                    }
                } catch(e) { console.warn('[WARN] Neural AI signal:', e.message); }
            }

            // PATCH #16: Quantum signal enhancement (per-signal via legacy QuantumHybridEngine)
            if (this.quantumEngine && this.quantumEngine.isReady && history.length > 20) {
                try {
                    const priceArr = history.map(c => c.close);
                    for (const [name, sig] of allSignals) {
                        if (sig.action !== 'HOLD' && sig.confidence > 0.3) {
                            const enhanced = this.quantumEngine.enhanceSignal(sig, priceArr);
                            if (enhanced.quantumBoost !== 0) {
                                sig.confidence = enhanced.confidence;
                                sig._quantumBoost = enhanced.quantumBoost;
                                sig._quantumAgreement = enhanced.agreement;
                            }
                        }
                    }
                    if (this.quantumEngine.shouldOptimize()) {
                        const returns = [];
                        for (let i = 1; i < history.length; i++) {
                            returns.push((history[i].close - history[i-1].close) / history[i-1].close);
                        }
                        if (returns.length > 30) {
                            const portfolio = this.pm.getPortfolio();
                            const qvar = this.quantumEngine.calculateVaR(returns, portfolio.totalValue);
                            if (qvar && this.megatron) {
                                this.megatron.logActivity('RISK', 'Quantum VaR (legacy)',
                                    'VaR(95%): $' + qvar.var1d.toFixed(2) + ' | CVaR: $' + qvar.cvar.toFixed(2), qvar);
                            }
                        }
                    }
                } catch(e) { console.warn('[WARN] Quantum:', e.message); }
            }

            // PATCH #17: Hybrid Pipeline -- STAGE 2: QUANTUM BOOST
            let hybridBoostResult = null;
            if (this.hybridPipeline && this.hybridPipeline.isReady && history.length > 30) {
                try {
                    const priceArr = history.map(c => c.close);
                    const portfolio = this.pm.getPortfolio();
                    const trades = this.pm.getTrades ? this.pm.getTrades() : [];
                    const positions = this.pm.getPositions();
                    const currentPosition = positions.size > 0 ? Array.from(positions.values())[0] : null;

                    hybridBoostResult = this.hybridPipeline.quantumBoost(
                        allSignals, priceArr, portfolio.totalValue,
                        portfolio, currentPosition, trades
                    );

                    // CRITICAL FIX (Patch #17): Apply quantum weight optimization to ensemble
                    if (hybridBoostResult.weightRecommendation && hybridBoostResult.weightRecommendation.weights) {
                        const qWeights = hybridBoostResult.weightRecommendation.weights;
                        const currentWeights = this.ensemble.weights;
                        for (const strategy of Object.keys(currentWeights)) {
                            if (qWeights[strategy] !== undefined) {
                                const blended = 0.6 * currentWeights[strategy] + 0.4 * qWeights[strategy];
                                this.ensemble.weights[strategy] = Math.max(0.03, Math.min(0.40, blended));
                            }
                        }
                        const totalW = Object.values(this.ensemble.weights).reduce((s, v) => s + v, 0);
                        for (const s of Object.keys(this.ensemble.weights)) {
                            this.ensemble.weights[s] /= totalW;
                        }

                        console.log('[HYBRID] Quantum weights APPLIED -- QAOA improvement: ' +
                            (hybridBoostResult.weightRecommendation.qaoaResult.improvement || 'N/A') +
                            ' | Decomposition groups: ' + (hybridBoostResult.weightRecommendation.decompositionResult.nGroups || '?') +
                            ' | Complexity reduction: ' + (hybridBoostResult.weightRecommendation.decompositionResult.complexityReduction || '?'));
                        if (this.megatron) {
                            const wSummary = Object.entries(this.ensemble.weights)
                                .map(function(pair) { return pair[0] + ':' + (pair[1] * 100).toFixed(1) + '%'; }).join(', ');
                            this.megatron.logActivity('QUANTUM', 'Wagi zoptymalizowane (QAOA+Decomposer)',
                                wSummary, hybridBoostResult.weightRecommendation, 'high');
                        }
                    }

                    // Log VQC regime
                    if (hybridBoostResult.regimeClassification && this.megatron && this._cycleCount % 10 === 0) {
                        const r = hybridBoostResult.regimeClassification;
                        this.megatron.logActivity('REGIME', 'VQC: ' + r.regime,
                            'Conf: ' + (r.confidence * 100).toFixed(1) + '% | Q-Advantage: ' + r.quantumAdvantage +
                            ' | Probs: UP=' + (r.probabilities.TRENDING_UP * 100).toFixed(0) + '% DOWN=' + (r.probabilities.TRENDING_DOWN * 100).toFixed(0) + '%');
                    }

                    // Log QMC simulation
                    if (hybridBoostResult.qmcSimulation && this.megatron) {
                        this.megatron.logActivity('RISK', 'QMC Symulacja scenariuszy',
                            hybridBoostResult.qmcSimulation.recommendation || 'N/A',
                            { computeTimeMs: hybridBoostResult.qmcSimulation.computeTimeMs }, 'normal');
                    }

                    // Log Risk Analysis + Black Swan
                    if (hybridBoostResult.riskAnalysis) {
                        const ra = hybridBoostResult.riskAnalysis;
                        if (this.megatron) {
                            const severity = ra.blackSwanAlert ? 'critical' : ra.riskLevel === 'HIGH' ? 'high' : 'normal';
                            this.megatron.logActivity('RISK', 'Analiza ryzyka: ' + ra.riskLevel + ' (' + ra.riskScore + '/100)',
                                (ra.blackSwanAlert ? 'BLACK SWAN ALERT! ' : '') +
                                'VaR compute: ' + (ra.totalComputeTimeMs || 0) + 'ms',
                                ra.stressTest, severity);
                        }
                        if (ra.blackSwanAlert) {
                            console.log('[HYBRID] BLACK SWAN ALERT -- Risk Score: ' + ra.riskScore + '/100');
                        }
                    }

                    // Log correlation analysis
                    if (hybridBoostResult.correlationAnalysis && hybridBoostResult.correlationAnalysis.hiddenClusters.length > 0 && this.megatron) {
                        this.megatron.logActivity('QUANTUM', 'Ukryte korelacje strategii',
                            'Klastry: ' + hybridBoostResult.correlationAnalysis.hiddenClusters.map(function(c) { return '[' + c.join(',') + ']'; }).join(', ') +
                            ' | Anomaly: ' + hybridBoostResult.correlationAnalysis.anomalyScore);
                    }

                } catch(e) { console.warn('[WARN] Hybrid Boost:', e.message); }
            }

            // PATCH #16: Force close all positions (Megatron command)
            if (this._forceCloseAll && this.pm.positionCount > 0) {
                for (const [sym] of this.pm.getPositions()) {
                    try {
                        const price = await this._getCurrentPrice(sym);
                        if (price) {
                            const trade = this.pm.closePosition(sym, price, null, 'MEGATRON_CMD', 'Megatron');
                            if (trade) {
                                console.log('[MEGATRON] Force closed ' + sym + ' | PnL: $' + trade.pnl.toFixed(2));
                                this.rm.recordTradeResult(trade.pnl);
                                if (this.megatron) this.megatron.logActivity('TRADE', 'Force Close: ' + sym, 'PnL: $' + trade.pnl.toFixed(2), trade, 'high');
                            }
                        }
                    } catch(e) { console.warn('[WARN] Force close:', e.message); }
                }
                this._forceCloseAll = false;
            }

            // 6. Ensemble voting (with dynamic Thompson Sampling weights)
            let consensus = null;
            if (allSignals.size > 0) {
                consensus = null; // PATCH #24: Neuron AI Manager decides instead of ensemble
                const mtfBiasForVote = this.strategies.getMTFConfluence ? this.strategies.getMTFConfluence().getLastBias() : null;

                if (this.neuronManager && this.neuronManager.isReady) {
                    // Get raw votes from ensemble (without NeuralAI)
                    const rawVotes = this.ensemble.getRawVotes(allSignals, this.rm, mtfBiasForVote);

                    // Build full state for Neuron AI
                    const portfolioState = this.pm.getPortfolio();
                    const hasPos = this.pm.positionCount > 0;
                    let positionSide = 'NONE';
                    if (hasPos) {
                        const positions = this.pm.getPositions();
                        if (positions && positions.size > 0) {
                            for (const [, p] of positions) {
                                positionSide = p.side === 'SHORT' ? 'SHORT' : 'LONG';
                                break;
                            }
                        }
                    }
                    let rsiVal = null;
                    try {
                        const prices = this.dp.getMarketDataHistory().slice(-15).map(function(c) { return c.close; });
                        if (prices.length >= 14) {
                            rsiVal = require('./indicators').calculateRSI(prices, 14);
                        }
                    } catch(e) {}

                    const neuronState = {
                        votes: rawVotes.votes,
                        signalSummary: rawVotes.signalSummary,
                        mlSignal: rawVotes.mlSignal || {},
                        mtfBias: mtfBiasForVote || {},
                        regime: (this.neuralAI && this.neuralAI.currentRegime) || 'UNKNOWN',
                        portfolio: {
                            totalValue: (portfolioState && portfolioState.totalValue) || 0,
                            realizedPnL: (portfolioState && portfolioState.realizedPnL) || 0,
                            winRate: (portfolioState && portfolioState.winRate) || 0,
                            totalTrades: (portfolioState && portfolioState.totalTrades) || 0,
                            drawdownPct: (portfolioState && portfolioState.drawdownPct) || 0,
                        },
                        price: ((this.dp.getMarketDataHistory().slice(-1)[0] || {}).close) || 0,
                        hasPosition: hasPos,
                        positionSide: positionSide,
                        indicators: { rsi: rsiVal },
                        quantumRisk: this._lastQuantumRisk || {},
                    };

                    try {
                        const neuronDecision = await this.neuronManager.makeDecision(neuronState);

                        if (neuronDecision && neuronDecision.action !== 'HOLD') {
                            let consensusPrice = ((this.dp.getMarketDataHistory().slice(-1)[0] || {}).close) || 0;
                            for (const [, sig] of allSignals) {
                                if (sig.price && sig.price > 0) { consensusPrice = sig.price; break; }
                            }
                            consensus = {
                                timestamp: Date.now(),
                                symbol: this.config.symbol || 'BTCUSDT',
                                action: neuronDecision.action,
                                price: consensusPrice,
                                quantity: 0,
                                confidence: neuronDecision.confidence,
                                strategy: 'NeuronAI',
                                reasoning: neuronDecision.reasoning || 'Neuron AI autonomous',
                                riskLevel: 1,
                                metadata: {
                                    votes: rawVotes.votes,
                                    source: neuronDecision.source,
                                    isOverride: neuronDecision.isOverride,
                                    neuronAI: true,
                                },
                            };

                            if (this.megatron && this.megatron.logActivity) {
                                this.megatron.logActivity('NEURON_AI',
                                    'DECISION: ' + neuronDecision.action,
                                    (neuronDecision.reasoning || '') + ' | Conf: ' + (neuronDecision.confidence * 100).toFixed(1) + '%' +
                                    (neuronDecision.isOverride ? ' | OVERRIDE' : ''),
                                    neuronDecision, 'high');
                            }
                        } else {
                            consensus = null;
                        }
                    } catch (neuronErr) {
                        console.warn('[WARN] Neuron AI decision failed, falling back to ensemble:', neuronErr.message);
                        consensus = this.ensemble.vote(allSignals, this.rm, mtfBiasForVote);
                    }
                } else {
                    consensus = this.ensemble.vote(allSignals, this.rm, mtfBiasForVote);
                }
                // PATCH #21: Log HOLD/no-consensus to Megatron too
                if (!consensus || consensus.action === 'HOLD') {
                    if (this.megatron && this._cycleCount % 5 === 0) {
                        this.megatron.logActivity('SIGNAL', 'HOLD - No trade signal',
                            'Cycle #' + this._cycleCount + ' | Strategies: ' + allSignals.size,
                            { action: 'HOLD', strategies: allSignals.size }, 'low');
                    }
                }
                if (consensus && consensus.action !== 'HOLD') {
                    console.log('[CONSENSUS] ' + consensus.action + ' (conf: ' + (consensus.confidence*100).toFixed(1) + '%)');
                    // PATCH #21: Log ensemble decision to Megatron activity feed
                    if (this.megatron) {
                        var eIcon = consensus.action === 'BUY' ? 'UP' : 'DOWN';
                        this.megatron.logActivity('SIGNAL', eIcon + ' Ensemble: ' + consensus.action,
                            'Consensus conf: ' + (consensus.confidence * 100).toFixed(1) + '%',
                            { action: consensus.action, conf: consensus.confidence });
                    }
                    this._lastConsensusStrategies = [];
                    for (const [name, sig] of allSignals) {
                        if (sig.action === consensus.action) this._lastConsensusStrategies.push(name);
                    }

                    // PATCH #17: Hybrid Pipeline -- STAGE 3: POST-PROCESSING (Quantum Decision Verification)
                    let shouldExecute = true;
                    if (this.hybridPipeline && this.hybridPipeline.isReady) {
                        try {
                            const portfolio = this.pm.getPortfolio();
                            const verification = this.hybridPipeline.postProcess(consensus, portfolio.totalValue);

                            if (!verification.approved) {
                                shouldExecute = false;
                                console.log('[HYBRID VERIFIER] REJECTED: ' + consensus.action +
                                    ' (conf: ' + (consensus.confidence * 100).toFixed(1) + '%) -> ' + verification.verificationResult.reason);
                                if (this.megatron) {
                                    this.megatron.logActivity('QUANTUM', 'Trade ODRZUCONY',
                                        consensus.action + ' zablokowany przez Quantum Decision Verifier: ' + verification.verificationResult.reason,
                                        verification.verificationResult, 'high');
                                }
                            } else {
                                const oldConf = consensus.confidence;
                                consensus.confidence = verification.finalConfidence;
                                if (Math.abs(oldConf - consensus.confidence) > 0.01) {
                                    console.log('[HYBRID VERIFIER] APPROVED: ' + consensus.action +
                                        ' (conf adjusted: ' + (oldConf * 100).toFixed(1) + '% -> ' + (consensus.confidence * 100).toFixed(1) + '%)');
                                } else {
                                    console.log('[HYBRID VERIFIER] APPROVED: ' + consensus.action +
                                        ' (conf: ' + (consensus.confidence * 100).toFixed(1) + '%)');
                                }
                                if (this.megatron) {
                                    this.megatron.logActivity('QUANTUM', 'Trade ZATWIERDZONY',
                                        consensus.action + ' przeszedl przez Quantum Decision Verifier | Conf: ' + (consensus.confidence * 100).toFixed(1) + '%',
                                        verification.verificationResult.modifications || {});
                                }
                            }
                        } catch(e) {
                            console.warn('[WARN] Hybrid verifier:', e.message);
                        }
                    }

                    if (shouldExecute) {
                        await this.exec.executeTradeSignal(consensus, this.dp);

                        // PATCH #19: Quantum Initial SL/TP
                        if ((consensus.action === 'BUY' || consensus.action === 'SELL') && this.quantumPosMgr && this.quantumPosMgr.isReady
                            && this.pm.hasPosition(consensus.symbol)) {
                            try {
                                const pos = this.pm.getPosition(consensus.symbol);
                                pos._qpmManaged = true;
                                const currentPrice = pos.entryPrice;
                                let vqcRegime = null, qraRisk = null, qmcSim = null;
                                if (hybridBoostResult) {
                                    vqcRegime = hybridBoostResult.regimeClassification || null;
                                    qraRisk = hybridBoostResult.riskAnalysis || null;
                                    qmcSim = hybridBoostResult.qmcSimulation || null;
                                }
                                let currentATR = pos.atrAtEntry || (currentPrice * 0.02);
                                if (history && history.length >= 20) {
                                    try {
                                        const candleData = history.slice(-20).map(c => ({
                                            symbol: consensus.symbol, timestamp: Date.now(),
                                            open: c.open || c.close, high: c.high, low: c.low,
                                            close: c.close, volume: c.volume || 0,
                                        }));
                                        const ind = require('./indicators');
                                        const liveATR = ind.calculateATR(candleData, 14);
                                        if (liveATR > 0) currentATR = liveATR;
                                    } catch (e) { /* use entry ATR */ }
                                }
                                const sltpResult = this.quantumPosMgr.dynamicSLTP.calculate(
                                    pos, currentPrice, currentATR, vqcRegime, qraRisk, qmcSim
                                );
                                if (sltpResult.newSL && Math.abs(sltpResult.newSL - pos.stopLoss) > 0.01) {
                                    const oldSL = pos.stopLoss;
                                    pos.stopLoss = sltpResult.newSL;
                                    console.log('[QUANTUM INIT SL] ' + consensus.symbol +
                                        ': $' + oldSL.toFixed(2) + ' -> $' + sltpResult.newSL.toFixed(2) +
                                        ' | ' + sltpResult.reasoning);
                                    if (this.megatron) {
                                        this.megatron.logActivity('QUANTUM', 'Initial SL (Quantum-Adjusted)',
                                            consensus.symbol + ': Static $' + oldSL.toFixed(2) +
                                            ' -> Quantum $' + sltpResult.newSL.toFixed(2), sltpResult.adjustments);
                                    }
                                }
                                if (sltpResult.newTP && Math.abs(sltpResult.newTP - pos.takeProfit) > 0.01) {
                                    const oldTP = pos.takeProfit;
                                    this.pm.updateTakeProfit(consensus.symbol, sltpResult.newTP);
                                    console.log('[QUANTUM INIT TP] ' + consensus.symbol +
                                        ': $' + (oldTP || 0).toFixed(2) + ' -> $' + sltpResult.newTP.toFixed(2) +
                                        ' | ' + sltpResult.reasoning);
                                    if (this.megatron) {
                                        this.megatron.logActivity('QUANTUM', 'Initial TP (Quantum-Adjusted)',
                                            consensus.symbol + ': Static $' + (oldTP || 0).toFixed(2) +
                                            ' -> Quantum $' + sltpResult.newTP.toFixed(2), sltpResult.adjustments);
                                    }
                                }
                                console.log('[QUANTUM INIT] Position ' + consensus.symbol +
                                    ' opened with quantum SL/TP | Regime: ' +
                                    (vqcRegime ? vqcRegime.regime : 'N/A') +
                                    ' | Risk: ' + (qraRisk ? qraRisk.riskScore + '/100' : 'N/A'));
                            } catch (e) {
                                console.warn('[WARN] Quantum initial SL/TP:', e.message);
                            }
                        }

                        this.server.broadcastPortfolioUpdate();
                        if (this.megatron) {
                            this.megatron.logActivity('TRADE', consensus.action + ' executed',
                                'Conf: ' + (consensus.confidence*100).toFixed(1) + '% | Strategies: ' + this._lastConsensusStrategies.join(', '),
                                { action: consensus.action, confidence: consensus.confidence }, 'high');
                        }
                    }
                }
            }

            // 7. SL/TP monitoring
            if (this.pm.positionCount > 0) {
                const getPriceFn = async (sym) => this._getCurrentPrice(sym);
                await this.exec.monitorPositions(getPriceFn, history);
                if (this.advancedPositionManager) {
                    try {
                        const prices = {};
                        for (const sym of this.pm.getPositions().keys()) {
                            const p = await this._getCurrentPrice(sym);
                            if (p) prices[sym] = p;
                        }
                        if (Object.keys(prices).length > 0) {
                            const closed = await this.advancedPositionManager.updatePositions(prices);
                            if (closed && closed.length > 0) {
                                for (const c of closed) {
                                    if (this.pm.hasPosition(c.symbol)) {
                                        const trade = this.pm.closePosition(c.symbol, c.currentPrice, null, 'APM_AUTO', 'APM');
                                        if (trade) {
                                            console.log('[APM SYNC] ' + c.symbol + ' auto-closed | PnL: $' + trade.pnl.toFixed(2));
                                            this.rm.recordTradeResult(trade.pnl);
                                            if (this.megatron) this.megatron.logActivity('TRADE', 'APM Close: ' + c.symbol, 'PnL: $' + trade.pnl.toFixed(2), trade);
                                        }
                                    }
                                }
                            }
                        }
                    } catch(e) { console.warn('[WARN] APM monitor:', e.message); }
                }

                // PATCH #19: APM-PM State Sync
                if (this.advancedPositionManager && this._cycleCount % 10 === 0) {
                    try {
                        const pmPositions = this.pm.getPositions();
                        const apmPositions = this.advancedPositionManager.activePositions;
                        if (apmPositions && apmPositions.size > 0) {
                            const orphaned = [];
                            for (const [pid, apmPos] of apmPositions) {
                                if (apmPos && apmPos.symbol && !pmPositions.has(apmPos.symbol)) {
                                    orphaned.push(pid);
                                }
                            }
                            for (const pid of orphaned) {
                                await this.advancedPositionManager.closePosition(pid, 'SYNC_CLEANUP');
                                console.log('[APM SYNC] Removed orphaned APM position: ' + pid);
                            }
                            if (orphaned.length > 0 && this.megatron) {
                                this.megatron.logActivity('SYSTEM', 'APM-PM Sync',
                                    'Cleaned ' + orphaned.length + ' orphaned APM position(s)');
                            }
                        }
                    } catch(e) { /* APM sync non-critical */ }
                }
            }

            // PATCH #18: Quantum Position Monitoring (full cycle re-evaluation)
            if (this.pm.positionCount > 0 && this.quantumPosMgr && this.quantumPosMgr.isReady) {
                try {
                    const priceArr = history.map(c => c.close);
                    const portfolio = this.pm.getPortfolio();
                    const qpmResult = await this.quantumPosMgr.evaluate(
                        this.pm.getPositions(), priceArr, portfolio.totalValue,
                        history, async (s) => this._getCurrentPrice(s)
                    );
                    if (!qpmResult.summary.skipped) {
                        await this._applyQuantumPositionActions(qpmResult, history);
                    }
                } catch(e) { console.warn('[WARN] QPM full-cycle:', e.message); }
            }

            // PATCH #15: Neural AI learning from closes
            this._detectAndLearnFromCloses();

            // 8. Update health + state
            this.mon.updateHealth(this.pm, this.rm, this.ml, this.isRunning);

            // PATCH #15: Periodic Neural AI status
            if (this.neuralAI && this.neuralAI.isReady && this._cycleCount % 20 === 0) {
                try {
                    const aiStatus = this.neuralAI.getStatus();
                    console.log('[NEURAL AI STATUS] Phase: ' + (aiStatus.phase || 'N/A') +
                        ' | Regime: ' + (aiStatus.regime || 'N/A') +
                        ' | Candles: ' + (aiStatus.candlesProcessed || 0) +
                        ' | GRU: ' + (aiStatus.gruTrained ? 'TRAINED' : 'untrained') +
                        ' | Thompson: ' + (aiStatus.thompsonUpdates || 0));
                    if (this.megatron) {
                        this.megatron.logActivity('LEARNING', 'Neural AI Status',
                            'Phase: ' + aiStatus.phase + ' | GRU: ' + (aiStatus.gruTrained ? 'trained' : 'learning') +
                            ' | Thompson: ' + aiStatus.thompsonUpdates + ' updates');
                    }
                } catch(e) {}
            }

            // PATCH #17: Periodic Hybrid Pipeline status
            if (this.hybridPipeline && this.hybridPipeline.isReady && this._cycleCount % 20 === 0) {
                try {
                    const hStatus = this.hybridPipeline.getStatus();
                    console.log('[HYBRID PIPELINE] Cycles: ' + hStatus.cycleCount +
                        ' | Enhancements: ' + hStatus.metrics.totalEnhancements +
                        ' | Rejections: ' + hStatus.metrics.totalRejections +
                        ' | WeightUpdates: ' + hStatus.metrics.totalWeightUpdates +
                        ' | AvgTime: ' + hStatus.metrics.avgProcessingTimeMs + 'ms' +
                        ' | VQC: ' + (hStatus.components.vqc.trained ? 'TRAINED' : 'learning') +
                        ' | QMC sims: ' + hStatus.components.qmc.simulationCount +
                        ' | QAOA opts: ' + hStatus.components.qaoa.optimizationCount +
                        ' | Risk: ' + hStatus.components.riskAnalyzer.lastRiskLevel);
                    if (this.megatron) {
                        this.megatron.logActivity('QUANTUM', 'Hybrid Pipeline Status',
                            'Cykle: ' + hStatus.cycleCount + ' | Zatwierdzenia: ' + hStatus.metrics.totalEnhancements +
                            ' | Odrzucenia: ' + hStatus.metrics.totalRejections +
                            ' | QMC: ' + hStatus.components.qmc.simulationCount + ' symulacji' +
                            ' | QAOA: ' + hStatus.components.qaoa.optimizationCount + ' optymalizacji' +
                            ' | Ryzyko: ' + hStatus.components.riskAnalyzer.lastRiskLevel);
                    }
                } catch(e) {}
            }

            // PATCH #18: Periodic Quantum Position Manager status
            if (this.quantumPosMgr && this.quantumPosMgr.isReady && this._cycleCount % 20 === 0) {
                try {
                    const qpmStatus = this.quantumPosMgr.getStatus();
                    console.log('[QUANTUM POS MGR] Evals: ' + qpmStatus.totalEvaluations +
                        ' | SL-adj: ' + qpmStatus.totalSLAdjustments +
                        ' | TP-adj: ' + qpmStatus.totalTPAdjustments +
                        ' | Partial: ' + qpmStatus.totalPartialCloses +
                        ' | Emergency: ' + qpmStatus.totalEmergencyActions +
                        ' | ReEvals: ' + qpmStatus.components.reEvaluator.totalReEvaluations);
                    if (this.megatron) {
                        this.megatron.logActivity('QUANTUM', 'Position Manager Status',
                            'Ewaluacje: ' + qpmStatus.totalEvaluations +
                            ' | SL: ' + qpmStatus.totalSLAdjustments +
                            ' | TP: ' + qpmStatus.totalTPAdjustments +
                            ' | Partial: ' + qpmStatus.totalPartialCloses +
                            ' | Emergency: ' + qpmStatus.totalEmergencyActions);
                    }
                } catch(e) {}
            }

            // PATCH #16: Market activity log every 10 cycles
            if (this.megatron && this._cycleCount % 10 === 0 && history.length > 0) {
                const last = history[history.length - 1];
                const p = this.pm.getPortfolio();
                this.megatron.logActivity('MARKET', 'BTC $' + (last.close||0).toFixed(0),
                    'Portfolio: $' + (p.totalValue||0).toFixed(2) + ' | PnL: $' + (p.realizedPnL||0).toFixed(2) +
                    ' | Positions: ' + (this.pm.positionCount || 0));
            }

            console.log('[' + this.config.instanceId + '] Cycle #' + this._cycleCount + ' complete');
        } catch (err) {
            console.error('[ERR] Trading cycle error:', err);
            if (this.megatron) this.megatron.logActivity('ERROR', 'Cycle Error', err.message, {}, 'critical');
            throw err;
        }
    }

    /**
     * PATCH #18: Apply quantum position management actions.
     * Executes SL/TP adjustments, partial closes, and logs to Megatron.
     */
    async _applyQuantumPositionActions(qpmResult, marketDataHistory) {
        try {
            // Apply SL/TP adjustments
            for (const adj of qpmResult.adjustments) {
                const pos = this.pm.getPosition(adj.symbol);
                if (!pos) continue;

                if (adj.type === 'SL_UPDATE' && adj.newValue) {
                    this.pm.updateStopLoss(adj.symbol, adj.newValue);
                    console.log('[QUANTUM SL] ' + adj.symbol + ': $' + adj.oldValue.toFixed(2) +
                        ' -> $' + adj.newValue.toFixed(2) + ' | ' + adj.reasoning);
                    if (this.megatron) {
                        this.megatron.logActivity('QUANTUM', 'Dynamic SL Update',
                            adj.symbol + ': $' + adj.oldValue.toFixed(2) + ' -> $' + adj.newValue.toFixed(2) +
                            ' | ' + adj.reasoning);
                    }
                } else if (adj.type === 'TP_UPDATE' && adj.newValue) {
                    if (pos.takeProfit !== adj.newValue) {
                        this.pm.updateTakeProfit(adj.symbol, adj.newValue);
                        console.log('[QUANTUM TP] ' + adj.symbol + ': $' + (adj.oldValue || 0).toFixed(2) +
                            ' -> $' + adj.newValue.toFixed(2) + ' | ' + adj.reasoning);
                        if (this.megatron) {
                            this.megatron.logActivity('QUANTUM', 'Dynamic TP Update',
                                adj.symbol + ': $' + (adj.oldValue || 0).toFixed(2) + ' -> $' + adj.newValue.toFixed(2) +
                                ' | ' + adj.reasoning);
                        }
                    }
                }
            }

            // Execute partial closes
            for (const pc of qpmResult.partialCloses) {
                const pos = this.pm.getPosition(pc.symbol);
                if (!pos || pos.quantity <= 0) continue;
                const closeQty = pos.quantity * pc.closePct;
                if (closeQty < 0.000001) continue;
                const price = pc.currentPrice || 0;
                if (price <= 0) continue;

                const trade = this.pm.closePosition(pc.symbol, price, closeQty, pc.label, 'QuantumPosMgr');
                if (trade) {
                    if (pc.flagKey) pos[pc.flagKey] = true;
                    console.log('[QUANTUM PARTIAL] ' + pc.label + ' ' + pc.symbol +
                        ': ' + (pc.closePct * 100).toFixed(0) + '% @ $' + price.toFixed(2) +
                        ' | PnL: $' + trade.pnl.toFixed(2) + ' | ' + pc.reason);
                    this.rm.recordTradeResult(trade.pnl);
                    if (this.ml) {
                        this.ml.learnFromTrade(trade.pnl, Date.now() - (pos.entryTime || Date.now()), marketDataHistory);
                    }
                    if (this.megatron) {
                        const urgencyLevel = pc.urgency === 'CRITICAL' ? 'critical' : pc.urgency === 'HIGH' ? 'high' : 'normal';
                        this.megatron.logActivity('TRADE', 'Quantum Partial Close: ' + pc.label,
                            pc.symbol + ' ' + (pc.closePct * 100).toFixed(0) + '% | PnL: $' + trade.pnl.toFixed(2) +
                            ' | ' + pc.reason, trade, urgencyLevel);
                    }
                    if (!this.pm.hasPosition(pc.symbol) && this.quantumPosMgr) {
                        this.quantumPosMgr.onPositionClosed(pc.symbol);
                    }
                }
            }

            // Log health report summary to Megatron (periodic)
            if (this.megatron && qpmResult.healthReport.size > 0 && this._cycleCount % 10 === 0) {
                const healthSummary = [];
                for (const [sym, health] of qpmResult.healthReport) {
                    healthSummary.push(sym + ':' + health.score + '(' + health.status + ')');
                }
                this.megatron.logActivity('QUANTUM', 'Position Health',
                    healthSummary.join(', ') + ' | Level: ' + (qpmResult.summary.level || 'N/A'));
            }

            // Log portfolio optimization (FULL only)
            if (qpmResult.portfolioOpt && this.megatron) {
                const opt = qpmResult.portfolioOpt;
                this.megatron.logActivity('QUANTUM', 'Portfolio Optimization',
                    'Exposure: ' + (opt.totalExposure * 100).toFixed(1) + '% | Capacity: ' + opt.remainingCapacity +
                    ' | Pyramids: ' + (opt.pyramidRecommendations || []).length +
                    ' | Consolidate: ' + (opt.consolidations || []).length);
            }

            // PATCH #19: Execute pyramid recommendations
            if (qpmResult.portfolioOpt && qpmResult.portfolioOpt.pyramidRecommendations) {
                for (const pyrRec of qpmResult.portfolioOpt.pyramidRecommendations) {
                    const pos = this.pm.getPosition(pyrRec.symbol);
                    if (!pos) continue;
                    try {
                        const currentPrice = await this._getCurrentPrice(pyrRec.symbol);
                        if (!currentPrice) continue;
                        const portfolio = this.pm.getPortfolio();
                        const addValue = portfolio.totalValue * (pyrRec.addSizePct / 100);
                        const addQty = addValue / currentPrice;
                        if (addQty <= 0.000001) continue;
                        if (!this.rm.checkOvertradingLimit()) {
                            console.log('[PYRAMID SKIP] Overtrading limit for ' + pyrRec.symbol);
                            continue;
                        }
                        if (addValue > this.pm.balance.usdtBalance * 0.9) {
                            console.log('[PYRAMID SKIP] Insufficient balance for ' + pyrRec.symbol);
                            continue;
                        }
                        const result = this.pm.addToPosition(pyrRec.symbol, currentPrice, addQty);
                        if (result) {
                            const fees = currentPrice * addQty * this.config.tradingFeeRate;
                            this.pm.portfolio.realizedPnL -= fees;
                            if (this.quantumPosMgr && this.quantumPosMgr.isReady) {
                                try {
                                    let currentATR = pos.atrAtEntry || (currentPrice * 0.02);
                                    if (marketDataHistory && marketDataHistory.length >= 20) {
                                        const candleData = marketDataHistory.slice(-20).map(c => ({
                                            symbol: pyrRec.symbol, timestamp: Date.now(),
                                            open: c.open || c.close, high: c.high, low: c.low,
                                            close: c.close, volume: c.volume || 0,
                                        }));
                                        const ind = require('./indicators');
                                        const liveATR = ind.calculateATR(candleData, 14);
                                        if (liveATR > 0) currentATR = liveATR;
                                    }
                                    const sltpResult = this.quantumPosMgr.dynamicSLTP.calculate(
                                        result, currentPrice, currentATR, null, null, null
                                    );
                                    if (sltpResult.newSL) result.stopLoss = sltpResult.newSL;
                                    if (sltpResult.newTP) this.pm.updateTakeProfit(pyrRec.symbol, sltpResult.newTP);
                                } catch (e) { /* QPM recalc non-critical */ }
                            }
                            console.log('[QUANTUM PYRAMID] Level ' + pyrRec.level + ' ' + pyrRec.symbol +
                                ': +' + addQty.toFixed(6) + ' @ $' + currentPrice.toFixed(2) +
                                ' | New avg: $' + result.entryPrice.toFixed(2) + ' | ' + pyrRec.reason);
                            if (this.megatron) {
                                this.megatron.logActivity('TRADE', 'Quantum Pyramid: L' + pyrRec.level,
                                    pyrRec.symbol + ' +' + addQty.toFixed(6) + ' @ $' + currentPrice.toFixed(2) +
                                    ' | New avg: $' + result.entryPrice.toFixed(2) + ' | ' + pyrRec.reason, pyrRec, 'normal');
                            }
                            if (this.advancedPositionManager) {
                                try {
                                    const pid = pyrRec.symbol + '-pyramid-' + Date.now();
                                    await this.advancedPositionManager.openPosition(
                                        pid, pyrRec.symbol, 'long', currentPrice, addQty, 'QuantumPyramid', 1.0
                                    );
                                } catch(e) { /* APM sync non-critical */ }
                            }
                        }
                    } catch (e) {
                        console.warn('[WARN] Pyramid execution ' + pyrRec.symbol + ':', e.message);
                    }
                }
            }

            // PATCH #19: Execute consolidation recommendations
            if (qpmResult.portfolioOpt && qpmResult.portfolioOpt.consolidations) {
                for (const cons of qpmResult.portfolioOpt.consolidations) {
                    if (cons.action !== 'CLOSE') continue;
                    const pos = this.pm.getPosition(cons.symbol);
                    if (!pos) continue;
                    try {
                        const currentPrice = await this._getCurrentPrice(cons.symbol);
                        if (!currentPrice) continue;
                        const trade = this.pm.closePosition(cons.symbol, currentPrice, null, 'QUANTUM_CONSOLIDATE', 'QuantumPosMgr');
                        if (trade) {
                            this.rm.recordTradeResult(trade.pnl);
                            console.log('[QUANTUM CONSOLIDATE] ' + cons.symbol +
                                ' closed | PnL: $' + trade.pnl.toFixed(2) + ' | ' + cons.reason);
                            if (this.ml) {
                                this.ml.learnFromTrade(trade.pnl, Date.now() - (pos.entryTime || Date.now()), marketDataHistory);
                            }
                            if (this.megatron) {
                                this.megatron.logActivity('TRADE', 'Quantum Consolidation',
                                    cons.symbol + ' | PnL: $' + trade.pnl.toFixed(2) + ' | ' + cons.reason, trade, 'normal');
                            }
                            if (this.quantumPosMgr) this.quantumPosMgr.onPositionClosed(cons.symbol);
                            if (this.advancedPositionManager) {
                                try {
                                    const ap = this.advancedPositionManager.activePositions;
                                    if (ap) {
                                        for (const [pid, p] of ap) {
                                            if (p && p.symbol === cons.symbol) {
                                                await this.advancedPositionManager.closePosition(pid, 'QUANTUM_CONSOLIDATE');
                                                break;
                                            }
                                        }
                                    }
                                } catch(e) { /* APM sync non-critical */ }
                            }
                        }
                    } catch (e) {
                        console.warn('[WARN] Consolidation ' + cons.symbol + ':', e.message);
                    }
                }
            }

        } catch (err) {
            console.warn('[WARN] QPM action apply:', err.message);
        }
    }

    _detectAndLearnFromCloses() {
        if (!this.neuralAI) return;
        try {
            const currentPosCount = this.pm.positionCount;
            const portfolio = this.pm.getPortfolio();
            const currentRealizedPnL = portfolio.realizedPnL || 0;
            if (currentPosCount < this._lastPositionCount || Math.abs(currentRealizedPnL - this._lastRealizedPnL) > 0.01) {
                const pnlDelta = currentRealizedPnL - this._lastRealizedPnL;
                if (Math.abs(pnlDelta) > 0.01) {
                    console.log('[NEURAL AI] Trade close detected: PnL=$' + pnlDelta.toFixed(2));
                    for (const stratName of this._lastConsensusStrategies) {
                        this.neuralAI.learnFromTrade({
                            pnl: pnlDelta, strategy: stratName,
                            winRate: portfolio.winRate || 0, consecutiveLosses: this.rm.consecutiveLosses || 0,
                        });
                    // PATCH #24: Neuron AI Manager learning
                    if (this.neuronManager) {
                        this.neuronManager.learnFromTrade({
                            pnl: pnlDelta,
                            strategy: 'EnsembleVoting',
                            action: 'close',
                        });
                    }
                    }
                    this.neuralAI.learnFromTrade({
                        pnl: pnlDelta, strategy: 'EnsembleVoting',
                        winRate: portfolio.winRate || 0, consecutiveLosses: this.rm.consecutiveLosses || 0,
                    });
                    if (this.megatron) {
                        this.megatron.logActivity('LEARNING', 'Trade learned',
                            'PnL: $' + pnlDelta.toFixed(2) + ' | Strategies: ' + (this._lastConsensusStrategies.join(', ') || 'N/A'),
                            { pnl: pnlDelta }, pnlDelta >= 0 ? 'normal' : 'high');
                    }
                }
            }
            // PATCH #18: Notify QPM of position close
            if (this.quantumPosMgr && currentPosCount < this._lastPositionCount) {
                try {
                    const currentPositions = this.pm.getPositions();
                    for (const [sym] of this.quantumPosMgr.healthScorer.scoreHistory) {
                        if (!currentPositions.has(sym)) {
                            this.quantumPosMgr.onPositionClosed(sym);
                        }
                    }
                } catch(e) {}
            }
            this._lastPositionCount = currentPosCount;
            this._lastRealizedPnL = currentRealizedPnL;
        } catch(e) {}
    }

    async start() {
        console.log('Starting MODULAR ENTERPRISE Autonomous Trading Bot');
        await this.initialize();
        console.log('ADAPTIVE ML: ' + (this.ml ? this.ml.getConfidenceInfo() : 'disabled'));
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
                console.error('[ERR] Cycle error:', err);
                this.server.broadcastAlert('Cycle error: ' + err.message, 'error');
                await this._sleep(5000);
            }
        }
    }

    async stop() {
        console.log('Stopping bot...');
        this.isRunning = false;
        this.state.save(this.pm, this.rm, this.ml);
        if (this.neuralAI) {
            try { await this.neuralAI.saveCheckpoint(); console.log('[NEURAL AI] Checkpoint saved'); } catch(e) {}
        }
        if (this.neuronManager) {
            try { this.neuronManager._saveState(); console.log('[NEURON AI MANAGER] State saved'); } catch(e) {}
        }
        if (this.megatron) this.megatron.logActivity('SYSTEM', 'Bot Shutdown', 'Graceful stop');
        console.log('Bot stopped. State saved.');
    }

    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

const bot = new AutonomousTradingBot();
process.on('SIGTERM', () => bot.stop().then(() => process.exit(0)));
process.on('SIGINT', () => bot.stop().then(() => process.exit(0)));
bot.start().catch(err => { console.error('FATAL:', err); process.exit(1); });

module.exports = { AutonomousTradingBot };
