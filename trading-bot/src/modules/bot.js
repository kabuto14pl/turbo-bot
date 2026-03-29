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
 * PATCH #20: SKYNET AUTONOMOUS BRAIN (Audyt Skynet)
 *   [P0] NeuronAI → Skynet Brain: executeOverride, emergencyHalt, globalParamEvolution,
 *        positionCommander, defenseMode, phaseRecovery, configEvolution
 *   [P0] QDV Starvation Fallback: cyclesWithoutTrade → force trade if >300 idle cycles
 *   [P0] Skynet Override Gate: veto/force consensus before QDV verification
 *   [P1] Position Sync Mutex: _withPositionLock() prevents APM/QPM/PM race conditions
 *   [P1] ML↔Quantum Cross-System Feedback: learnFromQuantumVerification()
 *   [P1] Ensemble Volatility-Adjusted Thresholds: regime-aware dynamic thresholds
 *   [P2] Execution Engine: Fixed dead _validateSignal(), proper balance-based validation
 *   [P2] Experience Buffer: Priority replay with 70% recency / 30% high-priority split
 *   [P3] Comprehensive logging with Skynet status fields throughout
 *
 * PATCH #44: SKYNET PRIME
 *   [P0-A] Fee Gate: reject trades where expected profit < 1.5× fees
 *   [P0-B] learnFromTrade dedup: single learn point in _detectAndLearnFromCloses()
 *   [P0-C] Min-hold: 15min cooldown between close and re-open
 *   [P0-D] Hard drawdown kill switch in RiskManager
 *   [P0-E] SHORT trailing SL: 5-phase Chandelier for SHORT positions
 *   [P1-A] RANGING stale position close: auto-close after 4h in dead zone
 *   [P1-B] Confidence-scaled sizing + RANGING/HIGH_VOL regime reduction
 *   [P1-D] Regime pass-through to execution for sizing awareness
 *
 * Architecture:
 *   Config -> DataPipeline -> StrategyRunner -> EnsembleVoting -> ExecutionEngine
 *   PortfolioManager <-> RiskManager <-> MLIntegration
 *   AdaptiveNeuralEngine (SKYNET BRAIN) -> Override/Veto -> EnsembleVoting (dynamic weights + signal)
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
const { bootstrapOpenLIT } = require('../core/observability/openlit_bootstrap');
const { MLIntegration } = require('./ml-integration');
const { StatePersistence } = require('./state-persistence');
const { MonitoringBridge } = require('./monitoring-bridge');
const { Server } = require('./server');
// P#212: Wire independent strategies (were dead code — never imported)
const { GridV2Strategy } = require('../strategies/grid-v2');
const { FundingRateArbitrage } = require('../strategies/funding-rate-arb');
const { MomentumHTFLTF } = require('../strategies/momentum-htf-ltf');

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
        // PATCH #44: NeuronAI LLM Brain (enhancement layer over Skynet)
        this.neuronManager = null;
        this._lastLLMCycle = 0;
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
        // PATCH #20: Position sync mutex — prevent concurrent PM/APM/QPM modifications
        this._positionMutex = Promise.resolve();
        // P#212: Independent strategies (bypass ensemble)
        this.gridStrategies = new Map();    // symbol → GridV2Strategy
        this.fundingStrategies = new Map(); // symbol → FundingRateArbitrage
        this.momentumStrategy = null;       // MomentumHTFLTF for BTC
        this._pairCandleCache = new Map();  // symbol → { data, time }
    }

    /**
     * PATCH #20: Async mutex for position operations.
     * Ensures only one position-modifying operation runs at a time.
     * Prevents race conditions between PM, APM, and QPM.
     */
    _withPositionLock(fn) {
        let release;
        const newMutex = new Promise(resolve => { release = resolve; });
        const prev = this._positionMutex;
        this._positionMutex = newMutex;
        return prev.then(() => fn()).finally(() => release());
    }

    async initialize() {
        console.log('[' + this.config.instanceId + '] Initializing MODULAR ENTERPRISE Trading Bot');
        console.log('Config:', JSON.stringify({ symbol: this.config.symbol, capital: this.config.initialCapital, instance: this.config.instanceId }, null, 2));

        bootstrapOpenLIT({
            applicationName: 'turbo-bot-runtime',
            environment: process.env.OTEL_DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV || 'development',
        });

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
            } catch(e) { /* Optional module */ }
            try {
                const { SimpleRLAdapter } = require('../core/ml/simple_rl_adapter');
                const srl = new SimpleRLAdapter();
                this.ml.setSimpleRL(srl);
            } catch(e) { /* Optional module */ }
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
        } catch (e) { /* Optional module */ }
        try {
            const { PortfolioOptimizationEngine } = require('../core/optimization/portfolio_optimization_engine');
            this.portfolioOptimizer = new PortfolioOptimizationEngine();
            console.log('[OK] Portfolio Optimizer: Active');
        } catch (e) { /* Optional module */ }

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

        // ═══════════════════════════════════════════════════════════════
        // P#212: Initialize independent strategies (Grid V2 + Funding Rate)
        // These BYPASS ensemble voting — operate on their own with per-pair config.
        // Backtest P#211 proved: SOL 1h grid = ONLY alpha, BNB 15m grid = marginal.
        // ═══════════════════════════════════════════════════════════════
        try {
            // Grid V2 — BNB (15m, ranging mean-reversion)
            this.gridStrategies.set('BNBUSDT', new GridV2Strategy('BNBUSDT', {
                adxThreshold: 18,
                bbLowerEntry: 0.12,
                bbUpperEntry: 0.88,
                rsiOversold: 36,
                rsiOverbought: 64,
                slAtr: 0.65,
                tpAtr: 1.50,       // P#211b: widened from 1.20 for fee economics
                cooldownMs: 8 * 3600000,  // 8 candles × 15m = 2h equiv (traded on 30s cycles)
                maxTradesDay: 6,
                riskPerTrade: 0.005,
            }));
            // Grid V2 — SOL (1h, primary alpha)
            this.gridStrategies.set('SOLUSDT', new GridV2Strategy('SOLUSDT', {
                adxThreshold: 22,
                bbLowerEntry: 0.15,
                bbUpperEntry: 0.85,
                rsiOversold: 35,
                rsiOverbought: 65,
                slAtr: 0.80,
                tpAtr: 1.40,
                cooldownMs: 5 * 3600000,  // P#211d: reduced cooldown
                maxTradesDay: 8,
                riskPerTrade: 0.012,      // P#211d: boosted risk (primary alpha slot)
            }));
            console.log('[OK] Grid V2: BNB (15m-ranging) + SOL (1h-alpha) | BYPASS ensemble');

            // Funding Rate Arbitrage — BTC, ETH, BNB, SOL, XRP
            const fundingPairs = {
                'BTCUSDT': { minRate: 0.00005, capitalPct: 0.50 },
                'ETHUSDT': { minRate: 0.00005, capitalPct: 0.30 },
                'BNBUSDT': { minRate: 0.00008, capitalPct: 0.20 },
                'SOLUSDT': { minRate: 0.00005, capitalPct: 0.20 },
                'XRPUSDT': { minRate: 0.00005, capitalPct: 0.50 },
            };
            for (const [sym, opts] of Object.entries(fundingPairs)) {
                this.fundingStrategies.set(sym, new FundingRateArbitrage(sym, opts));
            }
            console.log('[OK] Funding Rate Arb: ' + this.fundingStrategies.size + ' pairs | INDEPENDENT');

            // Momentum HTF/LTF — BTC only (uses main data pipeline directly)
            this.momentumStrategy = new MomentumHTFLTF('BTCUSDT', {
                adxMin: 20,
                slAtr: 2.0,
                tpAtr: 5.0,
                cooldownMs: 6 * 3600000,
                maxTradesDay: 3,
            });
            console.log('[OK] Momentum HTF/LTF: BTCUSDT | HTF trend + LTF pullback | Min RR 2.5');
        } catch (e) { console.error('[ERR] P#212 strategy init:', e.message); }

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

        // PATCH #17 + #37 + #38: Hybrid Quantum-Classical Pipeline v3.2 (GPU-Accelerated + Remote Offload)
        try {
            const { HybridQuantumClassicalPipeline } = require('../core/ai/hybrid_quantum_pipeline');
            this.hybridPipeline = new HybridQuantumClassicalPipeline({
                qmc: { nScenarios: 8000, nQuantumPaths: 1500, confidenceLevels: [0.95, 0.99], timeHorizons: [1, 5, 10] },
                qaoa: { nLayers: 4, nIterations: 150, learningRate: 0.05 },
                vqc: { nQubits: 4, nLayers: 3, nFeatures: 8, learningRate: 0.01 },
                featureMapper: { nQubits: 5, nReps: 2, maxCacheSize: 500 },
                riskAnalyzer: {},
                verifier: { minConfidence: 0.30, maxVaRPct: 0.04, minSharpe: 0.3 },
                decomposer: { maxSubProblemSize: 4, nReplicas: 6, maxIterations: 200 },
                riskAnalysisInterval: 10,
                weightOptimizationInterval: 30,
                vqcTrainInterval: 50,
                qmcSimulationInterval: 15,
                // PATCH #38: Remote GPU offload (local PC RTX via ngrok tunnel)
                gpuRemoteUrl: process.env.GPU_REMOTE_URL || '',
                gpuTimeoutMs: parseInt(process.env.GPU_TIMEOUT_MS) || 2000,
                gpuPingIntervalMs: parseInt(process.env.GPU_PING_INTERVAL_MS) || 10000,
                // P#198.5: Per-TF VQC override — pass from main config
                timeframe: this.config.timeframe,
                vqcEnabledTimeframes: this.config.vqcEnabledTimeframes,
            });
            this.hybridPipeline.initialize();
            // PATCH #37+38: Initialize GPU backend for quantum pipeline
            try {
                const { initGPU, getGPUStatus } = require('../core/ai/quantum_gpu_sim');
                const gpuResult = await initGPU();
                const gpuTag = gpuResult.enabled ? 'GPU:' + gpuResult.backend : 'CPU';
                const remoteUrl = process.env.GPU_REMOTE_URL;
                const remoteTag = remoteUrl ? ' + RemoteGPU(' + remoteUrl.replace(/https?:\/\//, '').slice(0, 30) + ')' : '';
                console.log('[OK] Hybrid Quantum Pipeline v' + this.hybridPipeline.version + ' [' + gpuTag + remoteTag + ']: QMC + QAOA(p=4) + VQC(4q,3L) + QFM(5q) + QRA + QDV(dynamic) + Decomposer');
                // Expose GPU status getter for API
                this._getGPUStatus = getGPUStatus;
            } catch (gpuErr) {
                console.log('[OK] Hybrid Quantum Pipeline v' + this.hybridPipeline.version + ' [CPU]: QMC + QAOA(p=4) + VQC(4q,3L) + QFM(5q) + QRA + QDV(dynamic) + Decomposer');
                console.warn('[WARN] GPU init: ' + gpuErr.message);
            }
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
            }
            // PATCH #36: Pass Megatron to ExecutionEngine for SL/TP/TIME activity logging (P1-5)
            this.exec.setMegatron(this.megatron);
            console.log('[OK] MEGATRON AI: Online | LLM Providers: ' + this.megatron.llm.providers.size);
            this.mon.setComponent('megatron', true);
        } catch (e) {
            console.warn('[WARN] Megatron: ' + e.message);
        }

        // PATCH #44: NeuronAI Manager — LLM Brain enhancement layer over Skynet
        // Wraps AdaptiveNeuralEngine with LLM cascade (Ollama → Grok → GPT-4o-mini)
        // for rich actions (SCALE_IN, PARTIAL_CLOSE, FLIP, ADJUST_SL/TP)
        try {
            const { NeuronAIManager } = require('../core/ai/neuron_ai_manager');
            this.neuronManager = new NeuronAIManager();
            // PATCH #47: CRITICAL FIX — initialize() was NEVER called!
            // Without this, llmRouter=null, isReady=false, all decisions used CPU fallback.
            // This connects NeuronAI to Megatron's LLM providers (GitHub/Grok).
            if (this.megatron) {
                this.neuronManager.initialize(this.megatron);
                console.log('[OK] NeuronAI LLM Brain: INITIALIZED with Megatron | LLM: ' + (this.neuronManager.llmRouter ? 'Connected (' + this.megatron.llm.providers.size + ' providers)' : 'Fallback') + ' | Actions: SCALE_IN, PARTIAL_CLOSE, FLIP, ADJUST_SL/TP, OVERRIDE_BIAS');
            } else {
                console.warn('[WARN] NeuronAI Manager: Megatron not available — LLM fallback mode');
            }
            this.mon.setComponent('neuronManager', true);
        } catch (e) {
            console.warn('[WARN] NeuronAI Manager: ' + e.message);
        }

        // Load saved state
        this.state.load(this.pm, this.rm, this.ml);

        this.mon.setComponent('monitoring', true);
        console.log('[' + this.config.instanceId + '] MODULAR ENTERPRISE Bot initialized');
        console.log('ML: ' + (this.ml ? this.ml.getConfidenceInfo() : 'disabled'));
        console.log('Neural AI: ' + (this.neuralAI ? 'ACTIVE (' + this.neuralAI.phase + ')' : 'disabled'));
        console.log('Quantum: ' + (this.quantumEngine ? 'ACTIVE (SQA+QWalk+QVaR)' : 'disabled'));
        console.log('Hybrid Pipeline: ' + (this.hybridPipeline ? 'ACTIVE v' + this.hybridPipeline.version + ' (QMC+QAOA+VQC+QFM+QRA+QDV+GPU)' : 'disabled'));
        console.log('Quantum Pos Mgr: ' + (this.quantumPosMgr && this.quantumPosMgr.isReady ? 'ACTIVE v' + this.quantumPosMgr.version + ' (4-stage)' : 'disabled'));
        console.log('Megatron: ' + (this.megatron ? 'ONLINE (' + this.megatron.llm.providers.size + ' LLM providers)' : 'disabled'));
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
        } catch(e) { /* Fallback to history */ }
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
                const shouldRun = hasPos && (this._sameCandleCycleCount % 3 === 0);
                if (!shouldRun) {
                    console.log('[CYCLE] Same candle - monitoring only');
                    for (const [sym, pos] of this.pm.getPositions()) {
                        try {
                            const cp = await this._getCurrentPrice(sym);
                            if (cp) this.pm.portfolio.unrealizedPnL = (cp - pos.entryPrice) * pos.quantity;
                        } catch(e) { /* Non-critical PnL update */ }
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
                                    this._applyQuantumPositionActions(qpmResult, history);
                                }
                            } catch(e) { console.warn('[WARN] QPM same-candle:', e.message); }
                        }
                    }
                    this._detectAndLearnFromCloses();
                    return;
                } else {
                    console.log('[CYCLE] Same candle but position open - strategies cycle ' + this._sameCandleCycleCount);
                }
            } else {
                this._lastAnalyzedCandleTimestamp = newTs;
                this._sameCandleCycleCount = 0;
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

            // ═══════════════════════════════════════════════════════════════
            // P#212: INDEPENDENT STRATEGIES — Grid V2 + Funding Rate Arb
            // These BYPASS ensemble voting. Evaluated every cycle.
            // Grid V2: fires when RANGING (ADX < threshold + BB + RSI)
            // Funding: fires on 8h settlement intervals
            // ═══════════════════════════════════════════════════════════════
            if (history.length > 30) {
                const ind = require('./indicators');
                const regime = (this.neuralAI && this.neuralAI.currentRegime) || 'UNKNOWN';

                // Helper: calculate full indicators from candle array
                const _calcIndicators = (candles) => {
                    const closes = candles.map(c => c.close);
                    const price = closes[closes.length - 1];
                    const rsi = ind.calculateRSI(closes.slice(-15), 14);
                    const candleData = candles.slice(-20).map(c => ({
                        symbol: 'X', timestamp: Date.now(),
                        open: c.open || c.close, high: c.high || c.close,
                        low: c.low || c.close, close: c.close, volume: c.volume || 0,
                    }));
                    const atr = ind.calculateATR(candleData, 14);
                    const adx = ind.calculateRealADX(candleData, 14);
                    const bb = ind.calculateBollingerBands(closes.slice(-20), 20);
                    const bbPctb = (bb.upper - bb.lower) > 0 ? (price - bb.lower) / (bb.upper - bb.lower) : 0.5;
                    const volumes = candles.map(c => c.volume || 0);
                    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
                    const volRatio = avgVol > 0 ? (volumes[volumes.length - 1] || 0) / avgVol : 1.0;
                    const sma20 = ind.calculateSMA(closes, 20);
                    const sma50 = ind.calculateSMA(closes, 50);
                    const sma200 = candles.length >= 200 ? ind.calculateSMA(closes, 200) : sma50;
                    const macd = ind.calculateMACD(closes);
                    return { rsi, adx, atr, bb_pctb: bbPctb, bb_upper: bb.upper, bb_lower: bb.lower,
                        volume_ratio: volRatio, sma20, sma50, sma200, macd_histogram: macd.histogram };
                };

                // Helper: fetch per-pair candles (OKX → cache → fallback to main history)
                const _getPairData = async (sym) => {
                    // If this IS the main symbol, use existing history
                    if (sym === this.config.symbol) {
                        return { candles: history, price: history[history.length - 1].close };
                    }
                    // Try OKX per-pair fetch with 5-min cache
                    if (this.dp.okxClient) {
                        try {
                            const cache = this._pairCandleCache.get(sym);
                            const cacheAge = cache ? Date.now() - cache.time : Infinity;
                            if (cache && cacheAge < 5 * 60000) {
                                // Update last candle with live price
                                let livePrice = cache.data[cache.data.length - 1].close;
                                try {
                                    const ticker = await this.dp.okxClient.getTicker(sym);
                                    if (ticker && ticker.last) livePrice = parseFloat(ticker.last);
                                } catch (_) { /* use cached close */ }
                                return { candles: cache.data, price: livePrice };
                            }
                            const rawCandles = await this.dp.okxClient.getCandles(sym, '1H', 100);
                            const pairCandles = rawCandles.map(c => ({
                                symbol: sym, timestamp: c.timestamp,
                                open: c.open, high: c.high, low: c.low,
                                close: c.close, volume: c.volume,
                            }));
                            this._pairCandleCache.set(sym, { data: pairCandles, time: Date.now() });
                            let livePrice = pairCandles[pairCandles.length - 1].close;
                            try {
                                const ticker = await this.dp.okxClient.getTicker(sym);
                                if (ticker && ticker.last) livePrice = parseFloat(ticker.last);
                            } catch (_) { /* use candle close */ }
                            return { candles: pairCandles, price: livePrice };
                        } catch (err) {
                            console.warn('[P#212b] ' + sym + ' OKX fetch failed:', err.message);
                        }
                    }
                    // Fallback: use main history (wrong symbol but better than nothing in mock mode)
                    return { candles: history, price: history[history.length - 1].close };
                };

                // --- Grid V2: Evaluate for each configured pair with PER-PAIR data ---
                for (const [sym, grid] of this.gridStrategies) {
                    try {
                        const { candles: pairCandles, price: pairPrice } = await _getPairData(sym);
                        if (!pairCandles || pairCandles.length < 30) continue;

                        const pairInd = _calcIndicators(pairCandles);
                        const hasPos = this.pm.hasPosition(sym);
                        const gridSignal = grid.evaluate({
                            currentPrice: pairPrice,
                            indicators: pairInd,
                            regime,
                            hasPosition: hasPos,
                        });

                        if (gridSignal && gridSignal.action !== 'HOLD') {
                            const tradeSignal = {
                                action: gridSignal.action,
                                symbol: sym,
                                confidence: gridSignal.confidence,
                                price: pairPrice,
                                strategy: 'GridV2_' + sym,
                                reasoning: gridSignal.reason,
                                timestamp: Date.now(),
                                isGrid: true,
                            };

                            console.log('[GRID V2] ' + sym + ' ' + gridSignal.action +
                                ' | Price: $' + pairPrice.toFixed(2) +
                                ' | Conf: ' + (gridSignal.confidence * 100).toFixed(1) + '%' +
                                ' | SL: $' + gridSignal.sl.toFixed(2) + ' TP: $' + gridSignal.tp.toFixed(2) +
                                ' | ' + gridSignal.reason);

                            await this.exec.executeTradeSignal(tradeSignal, this.dp);

                            if (this.megatron) {
                                this.megatron.logActivity('TRADE', 'Grid V2: ' + sym + ' ' + gridSignal.action,
                                    'Price: $' + pairPrice.toFixed(2) + ' | Conf: ' + (gridSignal.confidence * 100).toFixed(1) + '% | ' + gridSignal.reason,
                                    { sl: gridSignal.sl, tp: gridSignal.tp }, 'high');
                            }
                        }
                    } catch (gridErr) {
                        console.warn('[GRID V2] ' + sym + ' error:', gridErr.message);
                    }
                }

                // --- Funding Rate Arb: Evaluate for each configured pair ---
                for (const [sym, funding] of this.fundingStrategies) {
                    try {
                        const { price: fundPrice } = await _getPairData(sym);
                        const pairCapital = this.config.initialCapital * ({
                            'BTCUSDT': 0.08, 'ETHUSDT': 0.12, 'SOLUSDT': 0.30,
                            'BNBUSDT': 0.35, 'XRPUSDT': 0.15,
                        }[sym] || 0.10);

                        const fundResult = funding.processCycle({
                            currentPrice: fundPrice,
                            pairCapital,
                            indicators: null,
                            regime,
                            candleCount: this._cycleCount,
                        });

                        if (fundResult.fundingCollected > 0) {
                            console.log('[FUNDING] ' + sym + ' collected $' + fundResult.fundingCollected.toFixed(4) +
                                ' | Total: $' + funding.totalFundingCollected.toFixed(4) +
                                ' | ' + fundResult.reason);
                        }
                        if (fundResult.action === 'OPEN' || fundResult.action === 'CLOSE') {
                            console.log('[FUNDING] ' + sym + ' ' + fundResult.action + ' | ' + fundResult.reason);
                            if (this.megatron) {
                                this.megatron.logActivity('FUNDING', sym + ' ' + fundResult.action,
                                    fundResult.reason, funding.getStats());
                            }
                        }
                    } catch (fundErr) {
                        console.warn('[FUNDING] ' + sym + ' error:', fundErr.message);
                    }
                }

                // --- Momentum HTF/LTF: BTC only (uses main history) ---
                if (this.momentumStrategy && history.length >= 200) {
                    try {
                        const btcPrice = history[history.length - 1].close;
                        const btcInd = _calcIndicators(history);
                        const hasPos = this.pm.hasPosition('BTCUSDT');
                        const momSignal = this.momentumStrategy.evaluate({
                            currentPrice: btcPrice,
                            indicators: btcInd,
                            regime,
                            hasPosition: hasPos,
                            history,
                        });

                        if (momSignal && momSignal.action !== 'HOLD' && momSignal.action) {
                            const tradeSignal = {
                                action: momSignal.action,
                                symbol: 'BTCUSDT',
                                confidence: momSignal.confidence,
                                price: btcPrice,
                                strategy: 'MomentumHTFLTF',
                                reasoning: momSignal.reason,
                                timestamp: Date.now(),
                                isGrid: false,
                            };

                            console.log('[MOMENTUM] BTCUSDT ' + momSignal.action +
                                ' | Conf: ' + (momSignal.confidence * 100).toFixed(1) + '%' +
                                ' | SL: $' + momSignal.sl.toFixed(2) + ' TP: $' + momSignal.tp.toFixed(2) +
                                ' | ' + momSignal.reason);

                            await this.exec.executeTradeSignal(tradeSignal, this.dp);

                            if (this.megatron) {
                                this.megatron.logActivity('TRADE', 'Momentum: BTCUSDT ' + momSignal.action,
                                    'Conf: ' + (momSignal.confidence * 100).toFixed(1) + '% | ' + momSignal.reason,
                                    { sl: momSignal.sl, tp: momSignal.tp }, 'high');
                            }
                        }
                    } catch (momErr) {
                        console.warn('[MOMENTUM] BTCUSDT error:', momErr.message);
                    }
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
                        allSignals.set('NeuralAI', aiSignal);
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

                    hybridBoostResult = await this.hybridPipeline.quantumBoost(
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
            // PATCH #20: Pass regime info for volatility-adjusted thresholds
            let consensus = null;
            if (allSignals.size > 0) {
                const regimeInfo = this.neuralAI && this.neuralAI.isReady
                    ? { regime: this.neuralAI.currentRegime, volatility: 0 }
                    : null;
                consensus = this.ensemble.vote(allSignals, this.rm, regimeInfo);
                if (consensus && consensus.action !== 'HOLD') {
                    console.log('[CONSENSUS] ' + consensus.action + ' (conf: ' + (consensus.confidence*100).toFixed(1) + '%)');
                    this._lastConsensusStrategies = [];
                    for (const [name, sig] of allSignals) {
                        if (sig.action === consensus.action) this._lastConsensusStrategies.push(name);
                    }

                    // ═══════════════════════════════════════════════════════════════
                    // PATCH #20: SKYNET OVERRIDE GATE — before quantum verification
                    // If Skynet has an active override, it takes precedence.
                    // If Skynet is in defense mode, it may VETO BUY signals.
                    // ═══════════════════════════════════════════════════════════════
                    if (this.neuralAI && this.neuralAI.isReady) {
                        // Check Skynet override
                        if (this.neuralAI._activeOverride && this.neuralAI._activeOverride.expiresAt > Date.now()) {
                            const ovr = this.neuralAI._activeOverride;
                            if (ovr.action === 'HOLD') {
                                // Skynet VETO — block all trades
                                console.log('[SKYNET VETO] Trade blocked: ' + ovr.reason);
                                if (this.megatron) this.megatron.logActivity('SKYNET', 'VETO',
                                    consensus.action + ' blocked: ' + ovr.reason, {}, 'critical');
                                consensus = null;
                            } else if (ovr.action !== consensus.action) {
                                // Skynet wants a different action — override if confidence is high
                                if (ovr.confidence > this.neuralAI.evolvedConfig.ensembleOverrideThreshold) {
                                    console.log('[SKYNET OVERRIDE] ' + consensus.action + ' -> ' + ovr.action +
                                        ' (conf: ' + (ovr.confidence * 100).toFixed(1) + '%) — ' + ovr.reason);
                                    consensus.action = ovr.action;
                                    consensus.confidence = ovr.confidence;
                                    consensus.strategy = 'SkynetOverride';
                                    consensus.reasoning = 'Skynet override: ' + ovr.reason;
                                    if (this.megatron) this.megatron.logActivity('SKYNET', 'OVERRIDE',
                                        ovr.action + ' forced: ' + ovr.reason, ovr, 'critical');
                                }
                            }
                        }

                        // Defense mode — block BUY signals
                        // PATCH #39E: Allow BUY if starvation is extreme (>400 cycles)
                        if (consensus && this.neuralAI.defenseMode && consensus.action === 'BUY') {
                            if (this.neuralAI.cyclesWithoutTrade > 400) {
                                console.log('[SKYNET DEFENSE] BUY ALLOWED despite defense mode — EXTREME starvation (' + this.neuralAI.cyclesWithoutTrade + ' cycles idle)');
                                if (this.megatron) this.megatron.logActivity('SKYNET', 'Defense Override',
                                    'BUY allowed after ' + this.neuralAI.cyclesWithoutTrade + ' idle cycles (starvation break)', {}, 'critical');
                                // Reduce position size as safety measure
                                consensus.confidence = Math.min(consensus.confidence, 0.50);
                            } else {
                                console.log('[SKYNET DEFENSE] BUY blocked by defense mode (losses: ' + this.neuralAI.consecutiveLosses + ')');
                                if (this.megatron) this.megatron.logActivity('SKYNET', 'Defense Block',
                                    'BUY blocked — ' + this.neuralAI.consecutiveLosses + ' consecutive losses', {}, 'high');
                                consensus = null;
                            }
                        }
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // PATCH #20: SKYNET STARVATION OVERRIDE — if no trade for too long
            // Force lower thresholds to prevent the bot from starving
            // ═══════════════════════════════════════════════════════════════
            if (!consensus && this.neuralAI && this.neuralAI.isReady) {
                const starvation = this.neuralAI.checkStarvationOverride();
                if (starvation && allSignals.size > 0) {
                    // Re-vote with temporarily lowered thresholds
                    const origWeights = { ...this.ensemble.weights };
                    // PATCH #45: BUG #17 FIX — clone signals to avoid mutating originals in-place
                    const boostedSignals = new Map();
                    for (const [name, sig] of allSignals) {
                        const cloned = { ...sig };
                        if (cloned.action !== 'HOLD' && cloned.confidence > 0.2) {
                            cloned.confidence = Math.min(0.95, cloned.confidence * 1.15);
                        }
                        boostedSignals.set(name, cloned);
                    }
                    consensus = this.ensemble.vote(boostedSignals, this.rm);
                    this.ensemble.weights = origWeights; // Restore weights
                    if (consensus && consensus.action !== 'HOLD') {
                        console.log('[SKYNET STARVATION] Trade forced: ' + consensus.action + ' — ' + starvation.reason);
                        consensus.reasoning = starvation.reason;
                        if (this.megatron) this.megatron.logActivity('SKYNET', 'Starvation Override',
                            consensus.action + ': ' + starvation.reason, {}, 'high');
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // PATCH #20: SKYNET POSITION COMMANDS — execute AI-driven commands
            // ═══════════════════════════════════════════════════════════════
            if (this.neuralAI && this.neuralAI.isReady) {
                const commands = this.neuralAI.consumePositionCommands();
                for (const cmd of commands) {
                    try {
                        if (cmd.type === 'FORCE_EXIT' && this.pm.hasPosition(cmd.symbol)) {
                            const price = await this._getCurrentPrice(cmd.symbol);
                            if (price) {
                                const trade = this.pm.closePosition(cmd.symbol, price, null, 'SKYNET_' + cmd.type, 'Skynet');
                                if (trade) {
                                    this.rm.recordTradeResult(trade.pnl);
                                    console.log('[SKYNET CMD] FORCE_EXIT ' + cmd.symbol + ' | PnL: $' + trade.pnl.toFixed(2) + ' | ' + cmd.reason);
                                    if (this.megatron) this.megatron.logActivity('SKYNET', 'Force Exit',
                                        cmd.symbol + ' PnL: $' + trade.pnl.toFixed(2) + ' | ' + cmd.reason, trade, 'critical');
                                }
                            }
                        } else if (cmd.type === 'PARTIAL_CLOSE' && this.pm.hasPosition(cmd.symbol)) {
                            const pos = this.pm.getPosition(cmd.symbol);
                            const price = await this._getCurrentPrice(cmd.symbol);
                            if (price && pos) {
                                const closeQty = pos.quantity * cmd.pct;
                                if (closeQty > 0.000001) {
                                    const trade = this.pm.closePosition(cmd.symbol, price, closeQty, 'SKYNET_PARTIAL', 'Skynet');
                                    if (trade) {
                                        this.rm.recordTradeResult(trade.pnl);
                                        console.log('[SKYNET CMD] PARTIAL_CLOSE ' + cmd.symbol + ' ' + (cmd.pct * 100).toFixed(0) + '% | PnL: $' + trade.pnl.toFixed(2));
                                        if (this.megatron) this.megatron.logActivity('SKYNET', 'Partial Close',
                                            cmd.symbol + ' ' + (cmd.pct * 100).toFixed(0) + '% | ' + cmd.reason, trade, 'high');
                                    }
                                }
                            }
                        }
                        // FLIP and SCALE_IN handled by converting to consensus signal
                    } catch(e) { console.warn('[WARN] Skynet command:', e.message); }
                }
            }

            if (consensus && consensus.action !== 'HOLD') {
                if (!this._lastConsensusStrategies || this._lastConsensusStrategies.length === 0) {
                    this._lastConsensusStrategies = [];
                    for (const [name, sig] of allSignals) {
                        if (sig.action === consensus.action) this._lastConsensusStrategies.push(name);
                    }
                }

                // PATCH #17: Hybrid Pipeline -- STAGE 3: POST-PROCESSING (Quantum Decision Verification)
                // PATCH #20: With starvation fallback — if QDV rejects but bot is starved, override
                let shouldExecute = true;
                let qdvRejected = false;
                if (this.hybridPipeline && this.hybridPipeline.isReady) {
                    try {
                        const portfolio = this.pm.getPortfolio();
                        const verification = this.hybridPipeline.postProcess(consensus, portfolio.totalValue);

                        if (!verification.approved) {
                            qdvRejected = true;
                            shouldExecute = false;
                            console.log('[HYBRID VERIFIER] REJECTED: ' + consensus.action +
                                ' (conf: ' + (consensus.confidence * 100).toFixed(1) + '%) -> ' + verification.verificationResult.reason);
                            if (this.megatron) {
                                this.megatron.logActivity('QUANTUM', 'Trade ODRZUCONY',
                                    consensus.action + ' zablokowany przez Quantum Decision Verifier: ' + verification.verificationResult.reason,
                                    verification.verificationResult, 'high');
                            }

                            // PATCH #20: Cross-system feedback — inform Skynet about rejection
                            if (this.neuralAI && this.neuralAI.isReady) {
                                this.neuralAI.learnFromQuantumVerification(
                                    consensus.strategy || 'EnsembleVoting', false,
                                    verification.verificationResult.reason, consensus);
                            }

                            // PATCH #20: Starvation override — if QDV rejects but bot is starved, force through
                            if (this.neuralAI && this.neuralAI.cyclesWithoutTrade > 300) {
                                console.log('[SKYNET] QDV rejection overridden — STARVATION (' +
                                    this.neuralAI.cyclesWithoutTrade + ' cycles idle)');
                                shouldExecute = true;
                                qdvRejected = false;
                                if (this.megatron) this.megatron.logActivity('SKYNET', 'QDV Starvation Override',
                                    'QDV rejection bypassed after ' + this.neuralAI.cyclesWithoutTrade + ' idle cycles', {}, 'high');
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

                            // PATCH #20: Cross-system feedback — inform Skynet about approval
                            if (this.neuralAI && this.neuralAI.isReady) {
                                this.neuralAI.learnFromQuantumVerification(
                                    consensus.strategy || 'EnsembleVoting', true, null, consensus);
                            }
                        }
                    } catch(e) {
                        console.warn('[WARN] Hybrid verifier:', e.message);
                    }
                }

                if (shouldExecute) {
                        // PATCH #44: Pass regime for regime-aware sizing
                        if (this.neuralAI && this.neuralAI.currentRegime) {
                            consensus.regime = this.neuralAI.currentRegime;
                        }
                        await this.exec.executeTradeSignal(consensus, this.dp);
                        // PATCH #36: Track trade open time for ML learning duration (P0-1)
                        if (consensus.action === 'BUY') this._lastTradeOpenTime = Date.now();

                        // ═══════════════════════════════════════════════════════════
                        // PATCH #19: Quantum Initial SL/TP — replace static 1.5x/4.0x
                        // ATR with VQC regime + QRA risk + QMC scenario-adjusted levels
                        // immediately after position open for optimal risk management.
                        // ═══════════════════════════════════════════════════════════
                        if (consensus.action === 'BUY' && this.quantumPosMgr && this.quantumPosMgr.isReady
                            && this.pm.hasPosition(consensus.symbol)) {
                            try {
                                const pos = this.pm.getPosition(consensus.symbol);
                                pos._qpmManaged = true; // Mark position as QPM-managed

                                const currentPrice = pos.entryPrice;

                                // Get quantum data from hybrid pipeline boost result
                                let vqcRegime = null, qraRisk = null, qmcSim = null;
                                if (hybridBoostResult) {
                                    vqcRegime = hybridBoostResult.regimeClassification || null;
                                    qraRisk = hybridBoostResult.riskAnalysis || null;
                                    qmcSim = hybridBoostResult.qmcSimulation || null;
                                }

                                // Calculate current ATR from live market data
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

                                // Calculate quantum-adjusted initial SL/TP
                                const sltpResult = this.quantumPosMgr.dynamicSLTP.calculate(
                                    pos, currentPrice, currentATR, vqcRegime, qraRisk, qmcSim
                                );

                                if (sltpResult.newSL && Math.abs(sltpResult.newSL - pos.stopLoss) > 0.01) {
                                    const oldSL = pos.stopLoss;
                                    // Direct set for initial quantum SL (bypass direction check
                                    // since this is the first quantum calculation for the position)
                                    pos.stopLoss = sltpResult.newSL;
                                    console.log('[QUANTUM INIT SL] ' + consensus.symbol +
                                        ': $' + oldSL.toFixed(2) + ' -> $' + sltpResult.newSL.toFixed(2) +
                                        ' | ' + sltpResult.reasoning);
                                    if (this.megatron) {
                                        this.megatron.logActivity('QUANTUM', 'Initial SL (Quantum-Adjusted)',
                                            consensus.symbol + ': Static $' + oldSL.toFixed(2) +
                                            ' -> Quantum $' + sltpResult.newSL.toFixed(2) +
                                            ' | ' + sltpResult.reasoning, sltpResult.adjustments);
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
                                            ' -> Quantum $' + sltpResult.newTP.toFixed(2) +
                                            ' | ' + sltpResult.reasoning, sltpResult.adjustments);
                                    }
                                }

                                console.log('[QUANTUM INIT] Position ' + consensus.symbol +
                                    ' opened with quantum SL/TP | Regime: ' +
                                    (vqcRegime ? vqcRegime.regime : 'N/A') +
                                    ' | Risk: ' + (qraRisk ? qraRisk.riskScore + '/100' : 'N/A') +
                                    ' | QMC: ' + (qmcSim ? (qmcSim.recommendation || 'N/A').substring(0, 30) : 'N/A'));
                            } catch (e) {
                                console.warn('[WARN] Quantum initial SL/TP:', e.message);
                            }
                        }

                        // PATCH #20: Notify Skynet that a trade was executed
                        if (this.neuralAI && this.neuralAI.isReady) {
                            this.neuralAI.notifyTradeExecuted();
                        }

                        this.server.broadcastPortfolioUpdate();
                        if (this.megatron) {
                            this.megatron.logActivity('TRADE', consensus.action + ' executed',
                                'Conf: ' + (consensus.confidence*100).toFixed(1) + '% | Strategies: ' + this._lastConsensusStrategies.join(', '),
                                { action: consensus.action, confidence: consensus.confidence }, 'high');
                        }
                    }
                }

            // 7. SL/TP monitoring
            if (this.pm.positionCount > 0) {
                const getPriceFn = async (sym) => this._getCurrentPrice(sym);
                await this.exec.monitorPositions(getPriceFn, history);

                // ═══════════════════════════════════════════════════════════
                // PATCH #44A: RANGING STALE POSITION CLOSE
                // If regime is RANGING and position has been open > 4h with
                // PnL between -0.5x and +0.5x ATR, close to free capital.
                // Better to take small loss/gain than hold dead position.
                // ═══════════════════════════════════════════════════════════
                if (this.neuralAI && this.neuralAI.currentRegime === 'RANGING') {
                    for (const [sym, pos] of this.pm.getPositions()) {
                        const holdHours = (Date.now() - (pos.entryTime || Date.now())) / 3600000;
                        if (holdHours >= 4) {
                            try {
                                const price = await this._getCurrentPrice(sym);
                                if (!price) continue;
                                const atr = pos.atrAtEntry || (price * 0.02);
                                const profit = pos.side === 'SHORT'
                                    ? (pos.entryPrice - price) : (price - pos.entryPrice);
                                if (Math.abs(profit) < 0.5 * atr) {
                                    const trade = this.pm.closePosition(sym, price, null,
                                        'RANGING_STALE', 'SkynetPrime');
                                    if (trade) {
                                        this.rm.recordTradeResult(trade.pnl);
                                        console.log('[RANGING CLOSE] ' + sym + ' stale ' +
                                            holdHours.toFixed(1) + 'h in RANGING | PnL: $' +
                                            trade.pnl.toFixed(2));
                                        if (this.megatron) {
                                            this.megatron.logActivity('TRADE',
                                                '📉 RANGING Stale Close',
                                                sym + ' | ' + holdHours.toFixed(1) + 'h | PnL: $' +
                                                trade.pnl.toFixed(2) + ' | Capital freed',
                                                trade, 'normal');
                                        }
                                    }
                                }
                            } catch (e) { /* RANGING close non-critical */ }
                        }
                    }
                }

                // PATCH #20: Position operations under mutex lock to prevent race conditions
                if (this.advancedPositionManager) {
                    await this._withPositionLock(async () => {
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
                    });
                }

                // ═══════════════════════════════════════════════════════════════
                // PATCH #19: APM-PM State Sync — prevent divergence
                // Periodically verify APM's active positions match PM's positions.
                // Remove orphaned APM positions that no longer exist in PM.
                // ═══════════════════════════════════════════════════════════════
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
            // PATCH #20: Under position mutex to prevent race conditions with APM/PM
            if (this.pm.positionCount > 0 && this.quantumPosMgr && this.quantumPosMgr.isReady) {
                await this._withPositionLock(async () => {
                try {
                    const priceArr = history.map(c => c.close);
                    const portfolio = this.pm.getPortfolio();
                    const qpmResult = await this.quantumPosMgr.evaluate(
                        this.pm.getPositions(), priceArr, portfolio.totalValue,
                        history, async (s) => this._getCurrentPrice(s)
                    );
                    if (!qpmResult.summary.skipped) {
                        this._applyQuantumPositionActions(qpmResult, history);
                    }
                } catch(e) { console.warn('[WARN] QPM full-cycle:', e.message); }
                });
            }

            // ═══════════════════════════════════════════════════════════════
            // PATCH #44C: SKYNET PRIME — LLM ENHANCE CYCLE
            // Every 5 cycles, call NeuronAIManager.makeDecision() with full
            // bot state. LLM (Ollama→Grok→GPT-4o cascade) analyzes all
            // indicators, positions, regime, and proposes rich actions:
            // SCALE_IN, PARTIAL_CLOSE, FLIP, ADJUST_SL/TP, OVERRIDE_BIAS.
            // Actions are executed via portfolio-manager or positionCommand().
            // ═══════════════════════════════════════════════════════════════
            if (this.neuronManager && this._cycleCount >= 5 &&
                this._cycleCount % 5 === 0 && (this._cycleCount - this._lastLLMCycle) >= 5) {
                try {
                    this._lastLLMCycle = this._cycleCount;
                    const ind = require('./indicators');
                    const prices = history.map(c => c.close);
                    const currentPrice = prices[prices.length - 1] || 0;

                    // Build full indicator dashboard
                    const rsi = ind.calculateRSI(prices.slice(-15), 14);
                    const macdResult = ind.calculateMACD(prices);
                    const bb = ind.calculateBollingerBands(prices.slice(-20), 20);
                    const atr = ind.calculateATR(history, 14);
                    const volumes = history.map(c => c.volume || 0);
                    const lastVolume = volumes[volumes.length - 1] || 0;
                    const avgVolume = volumes.length >= 20
                        ? volumes.slice(-20).reduce((a, b) => a + b, 0) / 20 : lastVolume;
                    const sma20 = ind.calculateSMA(prices.slice(-20), 20);
                    const sma50 = prices.length >= 50 ? ind.calculateSMA(prices.slice(-50), 50) : sma20;
                    const sma200 = prices.length >= 200 ? ind.calculateSMA(prices.slice(-200), 200) : sma50;

                    // Build votes from allSignals (reconstruct ensemble proportions)
                    const voteCounts = { BUY: 0, SELL: 0, HOLD: 0 };
                    let voteTotal = 0;
                    if (allSignals && allSignals.size > 0) {
                        for (const [, sig] of allSignals) {
                            const a = sig.action || 'HOLD';
                            voteCounts[a] = (voteCounts[a] || 0) + (sig.confidence || 0.5);
                            voteTotal += (sig.confidence || 0.5);
                        }
                    }
                    const votes = {
                        BUY: voteTotal > 0 ? voteCounts.BUY / voteTotal : 0,
                        SELL: voteTotal > 0 ? voteCounts.SELL / voteTotal : 0,
                        HOLD: voteTotal > 0 ? voteCounts.HOLD / voteTotal : 0,
                    };

                    // Build signal summary
                    const signalSummary = [];
                    if (allSignals && allSignals.size > 0) {
                        for (const [name, sig] of allSignals) {
                            signalSummary.push(name + ': ' + sig.action + ' (' + ((sig.confidence || 0) * 100).toFixed(0) + '%)');
                        }
                    }

                    // Build position details
                    const positionDetails = [];
                    for (const [sym, pos] of this.pm.getPositions()) {
                        try {
                            const cp = await this._getCurrentPrice(sym);
                            const uPnL = cp
                                ? (pos.side === 'SHORT' ? (pos.entryPrice - cp) : (cp - pos.entryPrice)) * pos.quantity
                                : 0;
                            positionDetails.push({
                                symbol: sym, side: pos.side || 'LONG',
                                entryPrice: pos.entryPrice, quantity: pos.quantity,
                                unrealizedPnL: uPnL,
                                stopLoss: pos.stopLoss || 0, takeProfit: pos.takeProfit || 0,
                                holdingHours: (Date.now() - (pos.entryTime || Date.now())) / 3600000,
                            });
                        } catch (_) { /* Non-critical position data */ }
                    }

                    // Derive MTF bias from SMA alignment
                    let mtfDirection = 'NEUTRAL';
                    let mtfScore = 0;
                    if (currentPrice > sma20 && sma20 > sma50 && sma50 > sma200) {
                        mtfDirection = 'BULLISH'; mtfScore = 25;
                    } else if (currentPrice < sma20 && sma20 < sma50 && sma50 < sma200) {
                        mtfDirection = 'BEARISH'; mtfScore = -25;
                    } else if (currentPrice > sma50) {
                        mtfDirection = 'BULLISH'; mtfScore = 15;
                    } else if (currentPrice < sma50) {
                        mtfDirection = 'BEARISH'; mtfScore = -15;
                    }

                    // Build portfolio state
                    const portfolio = this.pm.getPortfolio();
                    const portfolioState = {
                        totalValue: portfolio.totalValue || 0,
                        drawdownPct: portfolio.drawdown || 0,
                        winRate: portfolio.winRate || 0,
                        realizedPnL: portfolio.realizedPnL || 0,
                        totalTrades: portfolio.totalTrades || 0,
                    };

                    // Quantum risk from hybrid pipeline (if available this cycle)
                    const qRisk = (hybridBoostResult && hybridBoostResult.riskAnalysis) ? {
                        riskScore: hybridBoostResult.riskAnalysis.riskScore,
                        riskLevel: hybridBoostResult.riskAnalysis.riskLevel,
                        blackSwanAlert: hybridBoostResult.riskAnalysis.blackSwanAlert,
                    } : {};

                    // Build full state for NeuronAIManager
                    const llmState = {
                        price: currentPrice,
                        regime: (this.neuralAI && this.neuralAI.currentRegime) || 'UNKNOWN',
                        votes: votes,
                        signals: allSignals,
                        mtfBias: { direction: mtfDirection, score: mtfScore, tradePermission: mtfDirection !== 'NEUTRAL' ? 'ALLOW' : 'CAUTIOUS' },
                        portfolio: portfolioState,
                        positionCount: this.pm.positionCount,
                        positionDetails: positionDetails,
                        indicators: {
                            rsi: rsi, macd: macdResult.macd, macdSignal: macdResult.signal,
                            macdHistogram: macdResult.histogram,
                            bollingerUpper: bb.upper, bollingerMiddle: bb.middle, bollingerLower: bb.lower,
                            bollingerBandwidth: bb.upper && bb.middle ? (bb.upper - bb.lower) / bb.middle : 0,
                            atr: atr, volume: lastVolume, avgVolume: avgVolume,
                            sma20: sma20, sma50: sma50, sma200: sma200,
                        },
                        recentPrices: prices.slice(-10),
                        quantumRisk: qRisk,
                        signalSummary: signalSummary,
                    };

                    // Call NeuronAIManager — CPU Neural + LLM cascade
                    const llmDecision = await this.neuronManager.makeDecision(llmState);

                    if (llmDecision) {
                        console.log('[SKYNET PRIME] LLM Decision: ' + llmDecision.action +
                            ' (conf: ' + ((llmDecision.confidence || 0) * 100).toFixed(1) + '%)' +
                            ' | Provider: ' + (llmDecision.provider || 'cpu') +
                            ' | Raw: ' + (llmDecision.rawAction || llmDecision.action));

                        // ═══════════════════════════════════════════════════════════
                        // PATCH #44D: RICH ACTION HANDLER
                        // Process LLM's rich actions beyond simple BUY/SELL/HOLD.
                        // These enable the AI to manage positions like a human trader.
                        // ═══════════════════════════════════════════════════════════
                        const rawAction = llmDecision.rawAction || llmDecision.action;
                        const llmConf = llmDecision.confidence || 0.5;
                        const llmDetails = llmDecision.details || {};
                        const llmReasoning = llmDecision.reasoning || 'Skynet Prime autonomous';

                        if (rawAction === 'SCALE_IN' && this.pm.positionCount > 0) {
                            // Add to existing position (pyramiding)
                            // PATCH #45: BUG #14 FIX — validate via Risk Manager before scaling in
                            try {
                                const firstPos = Array.from(this.pm.getPositions().entries())[0];
                                if (firstPos) {
                                    const [sym, pos] = firstPos;
                                    const scalePrice = await this._getCurrentPrice(sym);
                                    if (scalePrice && llmConf >= 0.40) {
                                        // BUG #14 FIX: Check risk manager before SCALE_IN
                                        const portfolio = this.pm.getPortfolio();
                                        const currentExposure = pos.quantity * scalePrice;
                                        const maxExposure = portfolio.totalValue * 0.15; // Max 15% per position
                                        if (currentExposure >= maxExposure) {
                                            console.log('[SKYNET PRIME] SCALE_IN BLOCKED — max exposure reached: $' +
                                                currentExposure.toFixed(2) + ' >= $' + maxExposure.toFixed(2));
                                        } else if (this.rm && !this.rm.checkMaxDrawdown()) {
                                            console.log('[SKYNET PRIME] SCALE_IN BLOCKED — drawdown kill switch active');
                                        } else {
                                            const scaleQty = pos.quantity * 0.25; // 25% of existing position
                                            // Cap scale qty so total doesn't exceed max exposure
                                            const maxScaleValue = maxExposure - currentExposure;
                                            const cappedQty = Math.min(scaleQty, maxScaleValue / scalePrice);
                                            if (cappedQty > 0.000001) {
                                                this.pm.addToPosition(sym, scalePrice, cappedQty, atr);
                                                console.log('[SKYNET PRIME] SCALE_IN ' + sym + ' +' + cappedQty.toFixed(6) +
                                                    ' @ $' + scalePrice.toFixed(2) + ' | ' + llmReasoning);
                                                if (this.megatron) this.megatron.logActivity('SKYNET', 'Scale In (LLM)',
                                                    sym + ' +' + cappedQty.toFixed(6) + ' @ $' + scalePrice.toFixed(2) +
                                                    ' | Conf: ' + (llmConf * 100).toFixed(1) + '% | ' + llmReasoning,
                                                    { provider: llmDecision.provider }, 'high');
                                            }
                                        }
                                    }
                                }
                            } catch (scaleErr) { console.warn('[SKYNET PRIME] SCALE_IN error:', scaleErr.message); }

                        } else if (rawAction === 'ADJUST_SL' && this.pm.positionCount > 0) {
                            // Tighten or loosen SL based on LLM analysis
                            // PATCH #45: BUG #15 FIX — apply SL relative to each position's entry price
                            try {
                                const slValue = llmDetails.stopLoss || llmDetails.sl || llmDetails.newSL;
                                if (slValue && slValue > 0) {
                                    for (const [sym, pos] of this.pm.getPositions()) {
                                        // BUG #15 FIX: Calculate SL relative to entry price
                                        let adjustedSL = slValue;
                                        if (pos && pos.entryPrice) {
                                            // If slValue looks like an absolute price, use it directly
                                            // If it looks like a percentage/distance, calculate relative to entry
                                            if (slValue < 1) {
                                                // Treat as percentage distance
                                                adjustedSL = pos.side === 'LONG'
                                                    ? pos.entryPrice * (1 - slValue)
                                                    : pos.entryPrice * (1 + slValue);
                                            }
                                            // Sanity check: SL shouldn't be more than 10% away from entry
                                            const slDistance = Math.abs(adjustedSL - pos.entryPrice) / pos.entryPrice;
                                            if (slDistance > 0.10) {
                                                console.log('[SKYNET PRIME] ADJUST_SL ' + sym + ' CAPPED — SL distance ' +
                                                    (slDistance * 100).toFixed(1) + '% too far from entry');
                                                adjustedSL = pos.side === 'LONG'
                                                    ? pos.entryPrice * 0.90
                                                    : pos.entryPrice * 1.10;
                                            }
                                        }
                                        this.pm.updateStopLoss(sym, adjustedSL);
                                        console.log('[SKYNET PRIME] ADJUST_SL ' + sym + ' -> $' + adjustedSL.toFixed(2) +
                                            ' (entry: $' + ((pos && pos.entryPrice) || 0).toFixed(2) + ') | ' + llmReasoning);
                                        if (this.megatron) this.megatron.logActivity('SKYNET', 'Adjust SL (LLM)',
                                            sym + ' SL -> $' + adjustedSL.toFixed(2) + ' | ' + llmReasoning,
                                            { provider: llmDecision.provider }, 'normal');
                                    }
                                }
                            } catch (slErr) { console.warn('[SKYNET PRIME] ADJUST_SL error:', slErr.message); }

                        } else if (rawAction === 'ADJUST_TP' && this.pm.positionCount > 0) {
                            // Extend or tighten TP target
                            try {
                                const newTP = llmDetails.takeProfit || llmDetails.tp || llmDetails.newTP;
                                if (newTP && newTP > 0) {
                                    for (const [sym] of this.pm.getPositions()) {
                                        this.pm.updateTakeProfit(sym, newTP);
                                        console.log('[SKYNET PRIME] ADJUST_TP ' + sym + ' -> $' + newTP.toFixed(2) + ' | ' + llmReasoning);
                                        if (this.megatron) this.megatron.logActivity('SKYNET', 'Adjust TP (LLM)',
                                            sym + ' TP -> $' + newTP.toFixed(2) + ' | ' + llmReasoning,
                                            { provider: llmDecision.provider }, 'normal');
                                    }
                                }
                            } catch (tpErr) { console.warn('[SKYNET PRIME] ADJUST_TP error:', tpErr.message); }

                        } else if (rawAction === 'PARTIAL_CLOSE' && this.pm.positionCount > 0) {
                            // Close a portion of position (default 30%)
                            try {
                                const closePct = llmDetails.closePct || llmDetails.percentage || 0.30;
                                for (const [sym, pos] of this.pm.getPositions()) {
                                    const closePrice = await this._getCurrentPrice(sym);
                                    if (closePrice) {
                                        const closeQty = pos.quantity * closePct;
                                        if (closeQty > 0.000001) {
                                            const trade = this.pm.closePosition(sym, closePrice, closeQty,
                                                'SKYNET_PRIME_PARTIAL', 'SkynetPrime');
                                            if (trade) {
                                                this.rm.recordTradeResult(trade.pnl);
                                                console.log('[SKYNET PRIME] PARTIAL_CLOSE ' + sym + ' ' +
                                                    (closePct * 100).toFixed(0) + '% | PnL: $' + trade.pnl.toFixed(2) +
                                                    ' | ' + llmReasoning);
                                                if (this.megatron) this.megatron.logActivity('SKYNET', 'Partial Close (LLM)',
                                                    sym + ' ' + (closePct * 100).toFixed(0) + '% PnL: $' + trade.pnl.toFixed(2) +
                                                    ' | ' + llmReasoning, trade, 'high');
                                            }
                                        }
                                    }
                                    break; // Only first position
                                }
                            } catch (pcErr) { console.warn('[SKYNET PRIME] PARTIAL_CLOSE error:', pcErr.message); }

                        } else if (rawAction === 'FLIP' && this.pm.positionCount > 0) {
                            // Close current position and open opposite direction
                            // PATCH #45: BUG #1/#16 FIX — execute opposite entry directly instead of FORCE_ENTRY
                            try {
                                const firstPos = Array.from(this.pm.getPositions().entries())[0];
                                if (firstPos && llmConf >= 0.50) {
                                    const [sym, pos] = firstPos;
                                    const flipPrice = await this._getCurrentPrice(sym);
                                    if (flipPrice) {
                                        // Close existing
                                        const closeTrade = this.pm.closePosition(sym, flipPrice, null,
                                            'SKYNET_PRIME_FLIP', 'SkynetPrime');
                                        if (closeTrade) {
                                            this.rm.recordTradeResult(closeTrade.pnl);
                                            console.log('[SKYNET PRIME] FLIP close ' + sym + ' ' + pos.side +
                                                ' | PnL: $' + closeTrade.pnl.toFixed(2));
                                        }
                                        // BUG #1/#16 FIX: Open opposite direction directly via execution engine
                                        // instead of using positionCommand('FORCE_ENTRY') which was not in validTypes
                                        const newSide = pos.side === 'LONG' ? 'SHORT' : 'LONG';
                                        const flipAction = newSide === 'LONG' ? 'BUY' : 'SELL';
                                        const flipSignal = {
                                            symbol: sym, action: flipAction, confidence: llmConf,
                                            price: flipPrice, strategy: 'SkynetPrime_FLIP',
                                            reasoning: 'FLIP: ' + llmReasoning, isFlip: true,
                                        };
                                        // Validate via risk manager before opening opposite
                                        if (this.rm && this.rm.checkMaxDrawdown()) {
                                            const flipQty = this.rm.calculateOptimalQuantity(
                                                flipPrice, llmConf, atr, sym, regime);
                                            if (flipQty > 0) {
                                                flipSignal.quantity = flipQty;
                                                const flipResult = await this.exec.executeTradeSignal(flipSignal, this.dp);
                                                console.log('[SKYNET PRIME] FLIP open ' + sym + ' ' + newSide +
                                                    ' qty: ' + flipQty.toFixed(6) + ' @ $' + flipPrice.toFixed(2));
                                            } else {
                                                console.log('[SKYNET PRIME] FLIP open BLOCKED — risk manager returned 0 qty');
                                            }
                                        } else {
                                            console.log('[SKYNET PRIME] FLIP open BLOCKED — drawdown kill switch active');
                                        }
                                        if (this.megatron) this.megatron.logActivity('SKYNET', 'FLIP (LLM)',
                                            sym + ' ' + pos.side + ' -> ' + newSide +
                                            ' | Close PnL: $' + (closeTrade ? closeTrade.pnl.toFixed(2) : '?') +
                                            ' | ' + llmReasoning, { provider: llmDecision.provider }, 'critical');
                                    }
                                }
                            } catch (flipErr) { console.warn('[SKYNET PRIME] FLIP error:', flipErr.message); }

                        } else if (rawAction === 'OVERRIDE_BIAS' && this.neuralAI && this.neuralAI.isReady) {
                            // LLM wants to override the neural engine's bias
                            // PATCH #45: BUG #18 FIX — raise confidence gate from 0.45 to 0.60
                            try {
                                if (llmConf >= 0.60) {
                                    this.neuralAI.executeOverride(
                                        llmDecision.action === 'BUY' ? 'BUY' : llmDecision.action === 'SELL' ? 'SELL' : 'HOLD',
                                        llmConf, 'SKYNET PRIME LLM: ' + llmReasoning
                                    );
                                    console.log('[SKYNET PRIME] OVERRIDE_BIAS -> ' + llmDecision.action +
                                        ' | Conf: ' + (llmConf * 100).toFixed(1) + '% | ' + llmReasoning);
                                    if (this.megatron) this.megatron.logActivity('SKYNET', 'Override Bias (LLM)',
                                        llmDecision.action + ' | ' + llmReasoning,
                                        { provider: llmDecision.provider, confidence: llmConf }, 'critical');
                                }
                            } catch (ovrErr) { console.warn('[SKYNET PRIME] OVERRIDE error:', ovrErr.message); }

                        } else if ((rawAction === 'BUY' || rawAction === 'SELL') && rawAction !== 'HOLD') {
                            // ═══════════════════════════════════════════════════════════════
                            // PATCH #47: SKYNET PRIME DIRECT TRADE — NeuronAI simple BUY/SELL
                            // Previously, simple BUY/SELL from NeuronAI were LOGGED but NEVER
                            // EXECUTED (no handler existed). This caused total trade starvation
                            // when ensemble consensus was always HOLD.
                            // Now: NeuronAI BUY/SELL generates a trade signal and executes it
                            // through QDV verification + execution engine.
                            // ═══════════════════════════════════════════════════════════════
                            try {
                                const maxPositions = (this.config.multiPosition && this.config.multiPosition.maxPositions) || 3;
                                if (llmConf >= 0.40 && this.pm.positionCount < maxPositions) {
                                    const tradePrice = await this._getCurrentPrice(this.config.symbol);
                                    if (tradePrice) {
                                        const tradeSignal = {
                                            symbol: this.config.symbol,
                                            action: rawAction,
                                            confidence: llmConf,
                                            price: tradePrice,
                                            strategy: 'SkynetPrime_' + (llmDecision.provider || 'cpu'),
                                            reasoning: 'SKYNET PRIME: ' + llmReasoning,
                                            timestamp: Date.now(),
                                        };
                                        // Apply QDV verification if available
                                        let shouldExecute = true;
                                        if (this.hybridPipeline && this.hybridPipeline.isReady) {
                                            try {
                                                const pf = this.pm.getPortfolio();
                                                const ver = this.hybridPipeline.postProcess(tradeSignal, pf.totalValue);
                                                if (!ver.approved) {
                                                    shouldExecute = false;
                                                    console.log('[SKYNET PRIME] QDV REJECTED: ' + rawAction +
                                                        ' (conf: ' + (llmConf*100).toFixed(1) + '%) -> ' +
                                                        ver.verificationResult.reason);
                                                } else {
                                                    tradeSignal.confidence = ver.finalConfidence;
                                                }
                                            } catch(qe) { /* QDV error, allow trade */ }
                                        }
                                        if (shouldExecute) {
                                            // Add regime for regime-aware sizing
                                            if (this.neuralAI && this.neuralAI.currentRegime) {
                                                tradeSignal.regime = this.neuralAI.currentRegime;
                                            }
                                            await this.exec.executeTradeSignal(tradeSignal, this.dp);
                                            console.log('[SKYNET PRIME] DIRECT TRADE: ' + rawAction +
                                                ' (conf: ' + (llmConf*100).toFixed(1) + '%) | Provider: ' +
                                                (llmDecision.provider || 'cpu') + ' | ' + llmReasoning);
                                            if (this.megatron) this.megatron.logActivity('SKYNET', 'Direct Trade (LLM)',
                                                rawAction + ' conf=' + (llmConf*100).toFixed(1) + '% | ' + llmReasoning,
                                                { provider: llmDecision.provider }, 'critical');
                                        }
                                    }
                                } else if (llmConf < 0.40) {
                                    console.log('[SKYNET PRIME] ' + rawAction + ' SKIPPED — conf ' +
                                        (llmConf*100).toFixed(1) + '% below 40% gate');
                                }
                            } catch (directErr) {
                                console.warn('[SKYNET PRIME] DIRECT TRADE error:', directErr.message);
                            }
                        }

                        // Log personality/reasoning to Megatron
                        if (this.megatron && llmDecision.reasoning) {
                            this.megatron.logActivity('AI', 'Skynet Prime Reasoning',
                                llmDecision.reasoning.substring(0, 300),
                                { action: rawAction, confidence: llmConf, provider: llmDecision.provider || 'cpu' });
                        }
                    }

                } catch (llmErr) {
                    console.warn('[SKYNET PRIME] LLM enhance cycle error:', llmErr.message);
                }
            }

            // PATCH #15: Neural AI learning from closes
            this._detectAndLearnFromCloses();

            // 8. Update health + state
            this.mon.updateHealth(this.pm, this.rm, this.ml, this.isRunning);

            // PATCH #15/20: Periodic Skynet AI status
            if (this.neuralAI && this.neuralAI.isReady && this._cycleCount % 20 === 0) {
                try {
                    const aiStatus = this.neuralAI.getStatus();
                    console.log('[SKYNET STATUS] Phase: ' + (aiStatus.phase || 'N/A') +
                        ' | Regime: ' + (aiStatus.currentRegime || 'N/A') +
                        ' | Candles: ' + (aiStatus.candlesProcessed || 0) +
                        ' | GRU: ' + (aiStatus.gruTrained ? 'TRAINED' : 'untrained') +
                        ' | Thompson: ' + (aiStatus.metaOptimizerUpdates || 0) +
                        ' | Defense: ' + (aiStatus.defenseMode ? 'ON' : 'off') +
                        ' | Streak: W' + (aiStatus.consecutiveWins || 0) + '/L' + (aiStatus.consecutiveLosses || 0) +
                        ' | Aggression: ' + (aiStatus.evolvedConfig ? aiStatus.evolvedConfig.aggressionLevel.toFixed(2) : 'N/A') +
                        ' | Risk: ' + (aiStatus.evolvedConfig ? (aiStatus.evolvedConfig.riskPerTrade * 100).toFixed(1) + '%' : 'N/A') +
                        ' | IdleCycles: ' + (aiStatus.cyclesWithoutTrade || 0));
                    if (this.megatron) {
                        this.megatron.logActivity('LEARNING', 'Skynet Status',
                            'Phase: ' + aiStatus.phase +
                            ' | GRU: ' + (aiStatus.gruTrained ? 'trained' : 'learning') +
                            ' | Thompson: ' + aiStatus.metaOptimizerUpdates + ' updates' +
                            ' | Defense: ' + (aiStatus.defenseMode ? 'ON' : 'off') +
                            ' | WinRate: ' + (aiStatus.rollingWinRate || 'N/A') +
                            ' | Evolutions: ' + (aiStatus.configEvolutions || 0));
                    }
                } catch(e) { /* Non-critical status log */ }
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
                } catch(e) { /* Non-critical status log */ }
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
                } catch(e) { /* Non-critical status log */ }
            }

            // PATCH #44E: NeuronAI / Skynet Prime periodic status
            if (this.neuronManager && this._cycleCount % 20 === 0) {
                try {
                    const naiStatus = this.neuronManager.getStatus();
                    console.log('[SKYNET PRIME] Decisions: ' + (naiStatus.totalDecisions || 0) +
                        ' | Overrides: ' + (naiStatus.overrideCount || 0) +
                        ' | PnL: $' + (naiStatus.totalPnL || 0).toFixed(2) +
                        ' | WinRate: ' + (naiStatus.recentWinRate || 0).toFixed(1) + '%' +
                        ' | Risk: ' + (naiStatus.riskMultiplier || 1).toFixed(2) +
                        ' | Provider: ' + (naiStatus.llmProvider ? naiStatus.llmProvider.lastUsed : 'none'));
                    if (this.megatron) {
                        this.megatron.logActivity('AI', 'Skynet Prime Status',
                            'Decyzje: ' + (naiStatus.totalDecisions || 0) +
                            ' | Overrides: ' + (naiStatus.overrideCount || 0) +
                            ' | PnL: $' + (naiStatus.totalPnL || 0).toFixed(2) +
                            ' | Provider: ' + (naiStatus.llmProvider ? naiStatus.llmProvider.label : 'offline'));
                    }
                } catch(e) { /* Non-critical status log */ }
            }

            // PATCH #16: Market activity log every 10 cycles
            if (this.megatron && this._cycleCount % 10 === 0 && history.length > 0) {
                const last = history[history.length - 1];
                const p = this.pm.getPortfolio();
                this.megatron.logActivity('MARKET', 'BTC $' + (last.close||0).toFixed(0),
                    'Portfolio: $' + (p.totalValue||0).toFixed(2) + ' | PnL: $' + (p.realizedPnL||0).toFixed(2) +
                    ' | Positions: ' + (this.pm.positionCount || 0));
            }

            // P#212: Grid V2 + Funding Rate + Momentum status every 20 cycles
            if (this._cycleCount % 20 === 0) {
                try {
                    for (const [sym, grid] of this.gridStrategies) {
                        const gs = grid.getStats();
                        if (gs.totalTrades > 0) {
                            console.log('[GRID V2] ' + sym + ': ' + gs.totalTrades + ' trades | WR: ' +
                                gs.winRate + '% | PnL: $' + gs.netPnL.toFixed(2) + ' | Fees: $' + gs.totalFees.toFixed(2));
                        }
                    }
                    for (const [sym, fund] of this.fundingStrategies) {
                        const fs = fund.getStats();
                        if (fs.positionsOpened > 0 || fs.fundingCollected > 0) {
                            console.log('[FUNDING] ' + sym + ': ' + fs.positionsOpened + ' positions | Collected: $' +
                                fs.fundingCollected.toFixed(4) + ' | Net: $' + fs.netPnL.toFixed(4));
                        }
                    }
                    if (this.momentumStrategy) {
                        const ms = this.momentumStrategy.getStats();
                        if (ms.totalTrades > 0 || ms.htfTrend !== 'NEUTRAL') {
                            console.log('[MOMENTUM] BTCUSDT: ' + ms.totalTrades + ' trades | WR: ' +
                                ms.winRate + '% | PnL: $' + ms.netPnL.toFixed(2) +
                                ' | Trend: ' + ms.htfTrend + '(' + ms.htfTrendStrength + ')' +
                                (ms.pullbackActive ? ' | PULLBACK ACTIVE' : ''));
                        }
                    }
                } catch(e) { /* Non-critical status log */ }
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
                    // Direction-aware SL update: updateStopLoss handles direction internally
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
                        // PATCH #44B: learnFromTrade removed from QPM partial close
                        // — single learn point in _detectAndLearnFromCloses() via PnL delta detection
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

            // ═══════════════════════════════════════════════════════════════════
            // PATCH #19: Execute pyramid recommendations from QAOA optimizer
            // Previously pyramid recs were only logged — now they are executed
            // as additional position layers with proper risk validation.
            // ═══════════════════════════════════════════════════════════════════
            if (qpmResult.portfolioOpt && qpmResult.portfolioOpt.pyramidRecommendations) {
                for (const pyrRec of qpmResult.portfolioOpt.pyramidRecommendations) {
                    const pos = this.pm.getPosition(pyrRec.symbol);
                    if (!pos) continue;

                    try {
                        const currentPrice = await this._getCurrentPrice(pyrRec.symbol);
                        if (!currentPrice) continue;

                        // Calculate pyramid quantity based on recommended size percentage
                        const portfolio = this.pm.getPortfolio();
                        const addValue = portfolio.totalValue * (pyrRec.addSizePct / 100);
                        const addQty = addValue / currentPrice;

                        if (addQty <= 0.000001) continue;

                        // Verify risk limits before pyramid execution
                        if (!this.rm.checkOvertradingLimit()) {
                            console.log('[PYRAMID SKIP] Overtrading limit reached for ' + pyrRec.symbol);
                            continue;
                        }

                        // Verify we have sufficient balance
                        if (addValue > this.pm.balance.usdtBalance * 0.9) {
                            console.log('[PYRAMID SKIP] Insufficient balance for ' + pyrRec.symbol);
                            continue;
                        }

                        // Execute pyramid add via PortfolioManager
                        const result = this.pm.addToPosition(pyrRec.symbol, currentPrice, addQty);
                        if (result) {
                            // Account for trading fees
                            const fees = currentPrice * addQty * this.config.tradingFeeRate;
                            this.pm.portfolio.realizedPnL -= fees;

                            // Recalculate SL/TP for the new average entry via QPM
                            if (this.quantumPosMgr && this.quantumPosMgr.isReady) {
                                try {
                                    const priceArr = marketDataHistory.map(c => c.close);
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
                                    // Recalculate quantum SL/TP with new average entry
                                    const sltpResult = this.quantumPosMgr.dynamicSLTP.calculate(
                                        result, currentPrice, currentATR, null, null, null
                                    );
                                    if (sltpResult.newSL) result.stopLoss = sltpResult.newSL;
                                    if (sltpResult.newTP) this.pm.updateTakeProfit(pyrRec.symbol, sltpResult.newTP);
                                } catch (e) { /* QPM recalc non-critical */ }
                            }

                            console.log('[QUANTUM PYRAMID] Level ' + pyrRec.level + ' ' + pyrRec.symbol +
                                ': +' + addQty.toFixed(6) + ' @ $' + currentPrice.toFixed(2) +
                                ' | New avg: $' + result.entryPrice.toFixed(2) +
                                ' | ' + pyrRec.reason);

                            if (this.megatron) {
                                this.megatron.logActivity('TRADE', 'Quantum Pyramid: L' + pyrRec.level,
                                    pyrRec.symbol + ' +' + addQty.toFixed(6) + ' @ $' + currentPrice.toFixed(2) +
                                    ' | New avg: $' + result.entryPrice.toFixed(2) +
                                    ' | Total qty: ' + result.quantity.toFixed(6) +
                                    ' | ' + pyrRec.reason, pyrRec, 'normal');
                            }

                            // Sync pyramid with APM
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

            // ═══════════════════════════════════════════════════════════════════
            // PATCH #19: Execute consolidation recommendations
            // Close tiny or very unhealthy positions as recommended by QAOA.
            // ═══════════════════════════════════════════════════════════════════
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
                                    cons.symbol + ' | PnL: $' + trade.pnl.toFixed(2) +
                                    ' | ' + cons.reason, trade, 'normal');
                            }
                            if (this.quantumPosMgr) {
                                this.quantumPosMgr.onPositionClosed(cons.symbol);
                            }
                            // Sync APM
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
                    console.log('[SKYNET] Trade close detected: PnL=$' + pnlDelta.toFixed(2));

                    // PATCH #20: Compute real features for learnFromTrade
                    const drawdownPct = portfolio.maxDrawdown || 0;
                    const history = this.dp.getMarketDataHistory();
                    let volatility = 0.02;
                    if (history && history.length > 20) {
                        const returns = [];
                        for (let i = 1; i < Math.min(history.length, 50); i++) {
                            returns.push((history[i].close - history[i-1].close) / history[i-1].close);
                        }
                        if (returns.length > 5) {
                            const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
                            volatility = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
                        }
                    }

                    // PATCH #36: Divide PnL among contributing strategies (P2-5)
                    const stratCount = Math.max(1, this._lastConsensusStrategies.length);
                    for (const stratName of this._lastConsensusStrategies) {
                        this.neuralAI.learnFromTrade({
                            pnl: pnlDelta / stratCount, strategy: stratName,
                            winRate: portfolio.winRate || 0,
                            consecutiveLosses: this.rm.consecutiveLosses || 0,
                            drawdownPct: drawdownPct,
                            volatility: volatility,
                            symbol: this.config.symbol,
                        });
                    }
                    this.neuralAI.learnFromTrade({
                        pnl: pnlDelta, strategy: 'EnsembleVoting',
                        winRate: portfolio.winRate || 0,
                        consecutiveLosses: this.rm.consecutiveLosses || 0,
                        drawdownPct: drawdownPct,
                        volatility: volatility,
                        symbol: this.config.symbol,
                    });
                    // PATCH #36: ML must also learn from SL/TP/TIME closes (P0-1)
                    if (this.ml) {
                        try {
                            this.ml.learnFromTrade(pnlDelta, Date.now() - (this._lastTradeOpenTime || Date.now()), history || []);
                        } catch(e) { console.warn('[ML LEARN] Error in _detectAndLearnFromCloses:', e.message); }
                    }
                    if (this.megatron) {
                        this.megatron.logActivity('LEARNING', 'Trade learned',
                            'PnL: $' + pnlDelta.toFixed(2) + ' | Strategies: ' + (this._lastConsensusStrategies.join(', ') || 'N/A') +
                            ' | Defense: ' + (this.neuralAI.defenseMode ? 'ON' : 'off') +
                            ' | W' + this.neuralAI.consecutiveWins + '/L' + this.neuralAI.consecutiveLosses,
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
                } catch(e) { /* Non-critical QPM notify */ }
            }
            this._lastPositionCount = currentPosCount;
            this._lastRealizedPnL = currentRealizedPnL;
        } catch(e) { /* Non-critical learning */ }
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
            try { await this.neuralAI.saveCheckpoint(); console.log('[NEURAL AI] Checkpoint saved'); } catch(e) { console.debug('[STOP] Checkpoint save failed:', e.message); }
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
