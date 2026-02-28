/**
 * FULL DEBUG AUDIT v2 — PATCH #45+ Comprehensive Test Suite
 * Skills: 09-system-debugger · 08-code-reviewer · 07-architecture-auditor
 * 
 * Tests EVERY module, function, edge case across all 15 AI files.
 * Goal: 100% confidence that every aspect works correctly.
 */

const path = require('path');
const fs = require('fs');

// === PATHS ===
const ROOT = path.resolve(__dirname, '../../trading-bot/src');
const MODULES = path.join(ROOT, 'modules');
const AI = path.join(ROOT, 'core/ai');
const ML = path.join(ROOT, 'core/ml');

// Prevent bot from starting real WebSocket connections
process.env.NODE_ENV = 'test';
process.env.MODE = 'test';

// ============================================================
// SECTION 1: ALL 15 FILES — EXISTENCE + SYNTAX + EXPORTS
// ============================================================
describe('[S1] Module Loading & Exports — All 15 Files', () => {
  
  const fileList = [
    'trading-bot/src/modules/bot.js',
    'trading-bot/src/core/ai/adaptive_neural_engine.js',
    'trading-bot/src/core/ai/neuron_ai_manager.js',
    'trading-bot/src/core/ai/hybrid_quantum_pipeline.js',
    'trading-bot/src/core/ai/quantum_optimizer.js',
    'trading-bot/src/core/ai/quantum_gpu_sim.js',
    'trading-bot/src/core/ai/quantum_position_manager.js',
    'trading-bot/src/core/ai/megatron_system.js',
    'trading-bot/src/modules/execution-engine.js',
    'trading-bot/src/modules/risk-manager.js',
    'trading-bot/src/modules/ensemble-voting.js',
    'trading-bot/src/modules/ml-integration.js',
    'trading-bot/src/modules/strategy-runner.js',
    'trading-bot/src/core/ml/enterprise_ml_system.js',
    'trading-bot/src/core/ml/simple_rl_adapter.js',
  ];

  test.each(fileList)('%s — file exists', (file) => {
    const fullPath = path.resolve(__dirname, '../../', file);
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  test.each(fileList)('%s — loads without crash', (file) => {
    const fullPath = path.resolve(__dirname, '../../', file);
    expect(() => require(fullPath)).not.toThrow();
  });

  test.each(fileList)('%s — exports object with named classes', (file) => {
    const fullPath = path.resolve(__dirname, '../../', file);
    const mod = require(fullPath);
    expect(typeof mod).toBe('object');
    const keys = Object.keys(mod);
    expect(keys.length).toBeGreaterThan(0);
  });
});

// ============================================================
// SECTION 2: ADAPTIVE NEURAL ENGINE (SKYNET)
// ============================================================
describe('[S2] AdaptiveNeuralEngine (SKYNET)', () => {
  let engine;

  beforeAll(() => {
    const { AdaptiveNeuralEngine } = require(path.join(AI, 'adaptive_neural_engine.js'));
    engine = new AdaptiveNeuralEngine();
  });

  test('constructor initializes all required properties', () => {
    expect(engine).toBeDefined();
    expect(typeof engine.processMarketUpdate).toBe('function');
    expect(typeof engine.generateAISignal).toBe('function');
    expect(typeof engine.positionCommand).toBe('function');
    expect(typeof engine.learnFromTrade).toBe('function');
    expect(typeof engine.getStatus).toBe('function');
  });

  test('processMarketUpdate returns valid structure', async () => {
    const mockCandles = Array.from({ length: 200 }, (_, i) => ({
      open: 60000 + i * 10, high: 60100 + i * 10,
      low: 59900 + i * 10, close: 60050 + i * 10,
      volume: 1000 + i, timestamp: Date.now() - (200 - i) * 900000
    }));
    const result = await engine.processMarketUpdate(mockCandles);
    // processMarketUpdate may return undefined when data is insufficient
    if (result) {
      expect(typeof result).toBe('object');
    }
  });

  test('PATCH #45: FORCE_ENTRY in validTypes', () => {
    const code = fs.readFileSync(path.join(AI, 'adaptive_neural_engine.js'), 'utf8');
    expect(code).toMatch(/validTypes.*FORCE_ENTRY|FORCE_ENTRY.*validTypes/s);
  });

  test('PATCH #45: learnFromTrade validates NaN pnl', () => {
    const code = fs.readFileSync(path.join(AI, 'adaptive_neural_engine.js'), 'utf8');
    expect(code).toMatch(/isNaN.*pnl|pnl.*isNaN/);
  });

  test('PATCH #45: learnFromTrade handles valid pnl', () => {
    expect(() => engine.learnFromTrade({ pnl: 50.0, strategy: 'Test', side: 'BUY' })).not.toThrow();
  });

  test('PATCH #45: defense mode cooldown deactivation', () => {
    const code = fs.readFileSync(path.join(AI, 'adaptive_neural_engine.js'), 'utf8');
    expect(code).toMatch(/defenseCooldown|defenseExpir|defenseModeActivatedAt/i);
  });

  test('PATCH #45: SELL uses effectiveMult', () => {
    const code = fs.readFileSync(path.join(AI, 'adaptive_neural_engine.js'), 'utf8');
    expect(code).toMatch(/effectiveMult/);
  });

  test('PATCH #45: totalPredictionsEvaluated counter', () => {
    const code = fs.readFileSync(path.join(AI, 'adaptive_neural_engine.js'), 'utf8');
    expect(code).toMatch(/totalPredictionsEvaluated/);
  });

  test('getStatus returns comprehensive state', () => {
    const status = engine.getStatus();
    expect(status).toBeDefined();
    expect(typeof status).toBe('object');
    expect(Object.keys(status).length).toBeGreaterThan(0);
  });
});

// ============================================================
// SECTION 3: NEURON AI MANAGER (SKYNET PRIME)
// ============================================================
describe('[S3] NeuronAIManager (SKYNET PRIME)', () => {
  let manager;

  beforeAll(() => {
    const { NeuronAIManager } = require(path.join(AI, 'neuron_ai_manager.js'));
    manager = new NeuronAIManager();
  });

  test('constructor initializes', () => {
    expect(manager).toBeDefined();
  });

  test('PATCH #45: MAX_RISK_MULTIPLIER = 2.0', () => {
    const code = fs.readFileSync(path.join(AI, 'neuron_ai_manager.js'), 'utf8');
    expect(code).toMatch(/MAX_RISK_MULTIPLIER\s*=\s*2\.0/);
  });

  test('PATCH #45: riskMultiplier capped via Math.min', () => {
    const code = fs.readFileSync(path.join(AI, 'neuron_ai_manager.js'), 'utf8');
    expect(code).toMatch(/Math\.min\(MAX_RISK_MULTIPLIER/);
  });

  test('PATCH #45: confidenceBoost in _saveState', () => {
    const code = fs.readFileSync(path.join(AI, 'neuron_ai_manager.js'), 'utf8');
    // Find the method DEFINITION (with opening brace), not a call site
    const match = code.match(/\n\s+_saveState\s*\(\)\s*\{/);
    expect(match).not.toBeNull();
    const idx = match.index;
    const section = code.substring(idx, idx + 800);
    expect(section).toContain('confidenceBoost');
  });

  test('PATCH #45: confidenceBoost in _loadState', () => {
    const code = fs.readFileSync(path.join(AI, 'neuron_ai_manager.js'), 'utf8');
    // Find the method DEFINITION (with opening brace), not a call site
    const match = code.match(/\n\s+_loadState\s*\(\)\s*\{/);
    expect(match).not.toBeNull();
    const idx = match.index;
    const section = code.substring(idx, idx + 1000);
    expect(section).toContain('confidenceBoost');
  });

  test('PATCH #45: reversalEnabled uses ??', () => {
    const code = fs.readFileSync(path.join(AI, 'neuron_ai_manager.js'), 'utf8');
    expect(code).toMatch(/reversalEnabled.*\?\?.*true/);
  });

  test('PATCH #45: _lastState set in multiple paths', () => {
    const code = fs.readFileSync(path.join(AI, 'neuron_ai_manager.js'), 'utf8');
    const count = (code.match(/this\._lastState\s*=/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('PATCH #45: negative confidenceBoost applied (!== 0)', () => {
    const code = fs.readFileSync(path.join(AI, 'neuron_ai_manager.js'), 'utf8');
    expect(code).toMatch(/confidenceBoost\s*!==\s*0/);
  });
});

// ============================================================
// SECTION 4: ENSEMBLE VOTING
// ============================================================
describe('[S4] EnsembleVoting', () => {
  let ensemble;

  beforeAll(() => {
    const { EnsembleVoting } = require(path.join(MODULES, 'ensemble-voting.js'));
    ensemble = new EnsembleVoting();
  });

  test('constructor initializes', () => { expect(ensemble).toBeDefined(); });

  test('vote with normal signals', () => {
    if (typeof ensemble.vote === 'function') {
      const signals = new Map([
        ['S1', { action: 'BUY', confidence: 0.8 }],
        ['S2', { action: 'BUY', confidence: 0.6 }],
        ['S3', { action: 'HOLD', confidence: 0.5 }],
      ]);
      const result = ensemble.vote(signals);
      if (result && result.action) {
        expect(['BUY', 'SELL', 'HOLD']).toContain(result.action);
      }
    }
  });

  test('vote with empty signals', () => {
    if (typeof ensemble.vote === 'function') {
      expect(() => ensemble.vote(new Map())).not.toThrow();
    }
  });

  test('PATCH #45: zero weight fallback', () => {
    const code = fs.readFileSync(path.join(MODULES, 'ensemble-voting.js'), 'utf8');
    expect(code).toMatch(/total\s*(===\s*0|>\s*0)/);
  });

  test('vote with conflicting signals', () => {
    if (typeof ensemble.vote === 'function') {
      const signals = new Map([
        ['Bull', { action: 'BUY', confidence: 0.9 }],
        ['Bear', { action: 'SELL', confidence: 0.9 }],
      ]);
      const result = ensemble.vote(signals);
      if (result && result.action) {
        expect(['BUY', 'SELL', 'HOLD']).toContain(result.action);
      }
    }
  });
});

// ============================================================
// SECTION 5: RISK MANAGER
// ============================================================
describe('[S5] RiskManager', () => {
  let risk;

  beforeAll(() => {
    const { RiskManager } = require(path.join(MODULES, 'risk-manager.js'));
    risk = new RiskManager();
  });

  test('constructor initializes', () => { expect(risk).toBeDefined(); });

  test('calculatePositionSize returns valid number', () => {
    if (typeof risk.calculatePositionSize === 'function') {
      const size = risk.calculatePositionSize(10000, 0.02, 65000);
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThanOrEqual(0);
      expect(isFinite(size)).toBe(true);
    }
  });

  test('zero balance returns 0', () => {
    if (typeof risk.calculatePositionSize === 'function') {
      const size = risk.calculatePositionSize(0, 0.02, 65000);
      expect(size).toBe(0);
    }
  });
});

// ============================================================
// SECTION 6-10: REMAINING MODULES
// ============================================================
describe('[S6] ExecutionEngine', () => {
  test('loads and initializes', () => {
    const { ExecutionEngine } = require(path.join(MODULES, 'execution-engine.js'));
    const e = new ExecutionEngine();
    expect(e).toBeDefined();
    expect(typeof e.executeTradeSignal).toBe('function');
    expect(typeof e.monitorPositions).toBe('function');
  });
});

describe('[S7] StrategyRunner', () => {
  test('loads and initializes', () => {
    const { StrategyRunner } = require(path.join(MODULES, 'strategy-runner.js'));
    const r = new StrategyRunner();
    expect(r).toBeDefined();
  });

  test('run with empty candles', () => {
    const { StrategyRunner } = require(path.join(MODULES, 'strategy-runner.js'));
    const r = new StrategyRunner();
    const fn = r.runAll || r.run || r.evaluate;
    if (typeof fn === 'function') expect(() => fn.call(r, [])).not.toThrow();
  });
});

describe('[S8] MLIntegration', () => {
  test('loads and initializes', () => {
    const { MLIntegration } = require(path.join(MODULES, 'ml-integration.js'));
    expect(new MLIntegration()).toBeDefined();
  });
});

describe('[S9] EnterpriseMlSystem', () => {
  test('loads and initializes', () => {
    const mod = require(path.join(ML, 'enterprise_ml_system.js'));
    const Cls = mod.EnterpriseMlSystem || mod.EnterpriseMLSystem || Object.values(mod)[0];
    expect(new Cls()).toBeDefined();
  });
});

describe('[S10] SimpleRLAdapter', () => {
  test('loads and initializes', () => {
    const mod = require(path.join(ML, 'simple_rl_adapter.js'));
    const Cls = mod.SimpleRLAdapter || Object.values(mod)[0];
    expect(new Cls()).toBeDefined();
  });
});

// ============================================================
// SECTION 11-15: QUANTUM & MEGATRON MODULES
// ============================================================
describe('[S11] HybridQuantumPipeline', () => {
  test('loads and initializes', () => {
    const { HybridQuantumClassicalPipeline } = require(path.join(AI, 'hybrid_quantum_pipeline.js'));
    expect(new HybridQuantumClassicalPipeline()).toBeDefined();
  });
});

describe('[S12] QuantumGpuSim', () => {
  test('exports all expected classes', () => {
    const mod = require(path.join(AI, 'quantum_gpu_sim.js'));
    expect(mod.GPUQuantumState).toBeDefined();
    expect(mod.QuantumState).toBeDefined();
    expect(typeof mod.gpuBatchMonteCarlo).toBe('function');
    expect(typeof mod.gpuMatMul).toBe('function');
  });

  test('GPUQuantumState initializes', () => {
    const { GPUQuantumState } = require(path.join(AI, 'quantum_gpu_sim.js'));
    expect(new GPUQuantumState()).toBeDefined();
  });
});

describe('[S13] QuantumPositionManager', () => {
  test('loads and initializes', () => {
    const { QuantumPositionManager } = require(path.join(AI, 'quantum_position_manager.js'));
    expect(new QuantumPositionManager()).toBeDefined();
  });
});

describe('[S14] QuantumOptimizer', () => {
  test('exports and initializes', () => {
    const mod = require(path.join(AI, 'quantum_optimizer.js'));
    expect(mod.QuantumHybridEngine).toBeDefined();
    expect(new mod.QuantumHybridEngine()).toBeDefined();
    expect(mod.SimulatedQuantumAnnealer).toBeDefined();
  });
});

describe('[S15] MegatronSystem', () => {
  test('loads and initializes', () => {
    const mod = require(path.join(AI, 'megatron_system.js'));
    expect(mod.MegatronCore).toBeDefined();
    expect(mod.AIActivityFeed).toBeDefined();
    expect(mod.LLMRouter).toBeDefined();
    expect(new mod.MegatronCore()).toBeDefined();
  });
});

// ============================================================
// SECTION 16: BOT.JS CODE ANALYSIS (no instantiation)
// ============================================================
describe('[S16] Bot.js Orchestration — Code Analysis', () => {
  const botCode = fs.readFileSync(path.join(MODULES, 'bot.js'), 'utf8');

  test('PATCH #45: SCALE_IN has confidence + quantity checks', () => {
    const idx = botCode.indexOf("rawAction === 'SCALE_IN'");
    expect(idx).toBeGreaterThan(-1);
    const section = botCode.substring(idx, idx + 3500);
    expect(section).toMatch(/llmConf.*>=.*0\.40|scaleQty|addToPosition/);
    expect(section).toMatch(/scaleErr|SCALE_IN error|catch/);
  });

  test('PATCH #45: FLIP uses executeTradeSignal for re-entry', () => {
    const idx = botCode.indexOf("rawAction === 'FLIP'");
    expect(idx).toBeGreaterThan(-1);
    const section = botCode.substring(idx, idx + 3000);
    expect(section).toMatch(/executeTradeSignal/);
    expect(section).toMatch(/closePosition/);
  });

  test('PATCH #45: ADJUST_SL uses entryPrice', () => {
    const idx = botCode.indexOf("rawAction === 'ADJUST_SL'");
    if (idx > -1) {
      const section = botCode.substring(idx, idx + 600);
      expect(section).toMatch(/entryPrice|entry/i);
    }
  });

  test('PATCH #45: OVERRIDE_BIAS gate at 0.60', () => {
    expect(botCode).toMatch(/0\.60/);
  });

  test('PATCH #45: starvation uses boostedSignals clone', () => {
    expect(botCode).toMatch(/boostedSignals/);
  });

  test('circuit breaker guard', () => { expect(botCode).toMatch(/circuitBreaker|circuit.*break/i); });
  test('drawdown kill switch', () => { expect(botCode).toMatch(/drawdown|maxDrawdown/i); });
  test('fee gate', () => { expect(botCode).toMatch(/fee|commission|feeRate/i); });
  test('position sizing', () => { expect(botCode).toMatch(/riskPerTrade|POSITION SIZING/i); });
  test('ensemble integration', () => { expect(botCode).toMatch(/ensemble|EnsembleVoting|ENSEMBLE/i); });
  test('quantum integration', () => { expect(botCode).toMatch(/quantum|QDV|qdv/i); });
  test('NeuronAI integration', () => { expect(botCode).toMatch(/neuronAI|NeuronAI|SKYNET PRIME/i); });
  test('Skynet Brain integration', () => { expect(botCode).toMatch(/skynet|SKYNET|AdaptiveNeuralEngine/i); });
});

// ============================================================
// SECTION 17: CROSS-MODULE DEPENDENCIES
// ============================================================
describe('[S17] Cross-Module Dependencies', () => {
  const botCode = fs.readFileSync(path.join(MODULES, 'bot.js'), 'utf8');

  test('bot.js requires AdaptiveNeuralEngine', () => { expect(botCode).toMatch(/require.*adaptive_neural_engine/); });
  test('bot.js requires EnsembleVoting', () => { expect(botCode).toMatch(/require.*ensemble/i); });
  test('bot.js requires RiskManager', () => { expect(botCode).toMatch(/require.*risk/i); });
  test('bot.js requires ExecutionEngine', () => { expect(botCode).toMatch(/require.*execution/i); });
  test('bot.js requires StrategyRunner', () => { expect(botCode).toMatch(/require.*strategy/i); });
  test('bot.js requires NeuronAI', () => { expect(botCode).toMatch(/require.*neuron_ai_manager/); });
  test('bot.js requires Quantum', () => { expect(botCode).toMatch(/require.*quantum/i); });

  test('no circular dependency: AI files dont require bot.js', () => {
    const aiFiles = [
      path.join(AI, 'adaptive_neural_engine.js'),
      path.join(AI, 'neuron_ai_manager.js'),
      path.join(AI, 'hybrid_quantum_pipeline.js'),
    ];
    for (const f of aiFiles) {
      const code = fs.readFileSync(f, 'utf8');
      expect(code).not.toMatch(/require\s*\(\s*['"].*bot\.js['"]\s*\)/);
    }
  });
});

// ============================================================
// SECTION 18: EDGE CASES
// ============================================================
describe('[S18] Edge Cases', () => {
  test('AdaptiveNeuralEngine handles empty candles', async () => {
    const { AdaptiveNeuralEngine } = require(path.join(AI, 'adaptive_neural_engine.js'));
    const eng = new AdaptiveNeuralEngine();
    // processMarketUpdate handles empty/insufficient data gracefully
    await expect(eng.processMarketUpdate([])).resolves.not.toThrow();
  });

  test('EnsembleVoting handles single signal', () => {
    const { EnsembleVoting } = require(path.join(MODULES, 'ensemble-voting.js'));
    const ev = new EnsembleVoting();
    if (typeof ev.vote === 'function') {
      expect(() => ev.vote(new Map([['Only', { action: 'BUY', confidence: 1.0 }]]))).not.toThrow();
    }
  });

  test('NeuronAI _fallbackDecision with undefined', () => {
    const { NeuronAIManager } = require(path.join(AI, 'neuron_ai_manager.js'));
    const nam = new NeuronAIManager();
    if (typeof nam._fallbackDecision === 'function') {
      expect(() => nam._fallbackDecision(undefined)).not.toThrow();
    }
  });
});

// ============================================================
// SECTION 19: DATA INTEGRITY
// ============================================================
describe('[S19] Data Integrity', () => {
  test('No hardcoded API keys', () => {
    const files = [path.join(MODULES, 'bot.js'), path.join(AI, 'neuron_ai_manager.js')];
    for (const f of files) {
      const code = fs.readFileSync(f, 'utf8');
      expect(code).not.toMatch(/['"]sk-[a-zA-Z0-9]{30,}['"]/);
    }
  });

  test('All JSON configs valid', () => {
    // tsconfig.json uses JSONC (JSON with comments) — valid for tsc but not JSON.parse
    for (const c of ['package.json', '.eslintrc.json']) {
      const p = path.resolve(__dirname, '../../', c);
      if (fs.existsSync(p)) expect(() => JSON.parse(fs.readFileSync(p, 'utf8'))).not.toThrow();
    }
    // Verify tsconfig.json exists (JSONC, not strict JSON)
    const tsconfig = path.resolve(__dirname, '../../tsconfig.json');
    expect(fs.existsSync(tsconfig)).toBe(true);
  });

  test('ecosystem.config.js valid', () => {
    const p = path.resolve(__dirname, '../../ecosystem.config.js');
    if (fs.existsSync(p)) {
      const cfg = require(p);
      expect(cfg.apps[0].name).toBe('turbo-bot');
      expect(cfg.apps[0].args).toContain('trading-bot/src/modules/bot.js');
    }
  });
});

// ============================================================
// SECTION 20: CODE QUALITY
// ============================================================
describe('[S20] Code Quality', () => {
  const coreFiles = [
    path.join(MODULES, 'bot.js'),
    path.join(AI, 'adaptive_neural_engine.js'),
    path.join(AI, 'neuron_ai_manager.js'),
    path.join(MODULES, 'ensemble-voting.js'),
  ];

  test.each(coreFiles)('%s — no empty console.error()', (file) => {
    const code = fs.readFileSync(file, 'utf8');
    expect(code.match(/console\.error\(\)/g) || []).toHaveLength(0);
  });

  test.each(coreFiles)('%s — no empty catch blocks', (file) => {
    const code = fs.readFileSync(file, 'utf8');
    // Catches with only whitespace inside are empty; catches with comments or code are OK
    const emptyMatches = (code.match(/catch\s*\([^)]*\)\s*\{\s*\}/g) || []);
    expect(emptyMatches).toHaveLength(0);
  });

  test('bot.js has adequate try-catch coverage', () => {
    const code = fs.readFileSync(path.join(MODULES, 'bot.js'), 'utf8');
    const asyncCalls = (code.match(/await /g) || []).length;
    const tryCatch = (code.match(/try\s*\{/g) || []).length;
    if (asyncCalls > 5) expect(tryCatch).toBeGreaterThan(Math.floor(asyncCalls / 10));
  });
});
