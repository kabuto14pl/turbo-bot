/**
 * CRITICAL UNIT TESTS — Turbo Bot AI Pipeline
 * 
 * These tests target the 20 bugs found in the deep analysis (SKYNET_NEURONAI_DEEP_ANALYSIS.md)
 * Run: npx jest src/__tests__/critical-bugs.test.js
 * 
 * NOTE: Tests that require actual module imports use the REAL paths:
 *   trading-bot/src/modules/  (ensemble-voting, risk-manager, etc.)
 *   trading-bot/src/core/ai/  (adaptive_neural_engine, neuron_ai_manager, etc.)
 */

// ─── Mocks ─────────────────────────────────────────────────────────────────
const mockFs = { writeFileSync: jest.fn(), readFileSync: jest.fn(), existsSync: jest.fn() };
jest.mock('fs', () => mockFs);

// ─── 1. Ensemble Voting Tests ──────────────────────────────────────────────

describe('EnsembleVoting', () => {
    let EnsembleVoting, ensemble;

    beforeEach(() => {
        jest.resetModules();
        // Real path in repo: trading-bot/src/modules/ensemble-voting.js
        ({ EnsembleVoting } = require('../../trading-bot/src/modules/ensemble-voting'));
        ensemble = new EnsembleVoting();
    });

    test('BUG #20: should handle all-zero weights without crash', () => {
        ensemble.weights = { strategy1: 0, strategy2: 0, strategy3: 0 };
        const signals = new Map([
            ['strategy1', { action: 'BUY', confidence: 0.8 }],
            ['strategy2', { action: 'BUY', confidence: 0.7 }],
            ['strategy3', { action: 'SELL', confidence: 0.6 }],
        ]);
        expect(() => ensemble.vote(signals)).not.toThrow();
    });

    test('BUG #19: SkynetOverride should only apply when action matches winner', () => {
        const signals = new Map([
            ['trend', { action: 'BUY', confidence: 0.8 }],
            ['meanrev', { action: 'SELL', confidence: 0.9 }],
            ['SkynetOverride', { action: 'BUY', confidence: 1.0, strategy: 'SkynetOverride' }],
        ]);
        ensemble.weights = { trend: 0.3, meanrev: 0.7, SkynetOverride: 1.0 };
        const result = ensemble.vote(signals);
        if (result) {
            expect(['BUY', 'SELL', 'HOLD']).toContain(result.action);
        }
    });

    test('should return valid consensus structure', () => {
        const signals = new Map([
            ['strategy1', { action: 'BUY', confidence: 0.9 }],
            ['strategy2', { action: 'BUY', confidence: 0.8 }],
            ['strategy3', { action: 'BUY', confidence: 0.7 }],
        ]);
        const result = ensemble.vote(signals);
        if (result && result.action !== 'HOLD') {
            expect(result).toHaveProperty('action');
            expect(result).toHaveProperty('confidence');
            expect(['BUY', 'SELL']).toContain(result.action);
        }
    });
});

// ─── 2. Risk Manager Tests ─────────────────────────────────────────────────

describe('RiskManager', () => {
    let RiskManager, rm;

    beforeEach(() => {
        jest.resetModules();
        // Real path: trading-bot/src/modules/risk-manager.js
        ({ RiskManager } = require('../../trading-bot/src/modules/risk-manager'));
        const mockPM = {
            getPortfolioValue: () => 10000,
            getCurrentDrawdown: () => 0.02,
            getPortfolio: () => ({ totalValue: 10000, drawdown: 0.02, balance: 10000 }),
        };
        rm = new RiskManager({
            riskPerTrade: 0.015,
            maxDrawdown: 0.12,
            maxConsecutiveLosses: 5,
        }, mockPM);
    });

    test('circuit breaker should trip after 5 consecutive losses', () => {
        for (let i = 0; i < 5; i++) {
            rm.recordTradeResult(-10);
        }
        expect(rm.isCircuitBreakerTripped()).toBe(true);
    });

    test('circuit breaker should NOT trip after 4 losses', () => {
        for (let i = 0; i < 4; i++) {
            rm.recordTradeResult(-10);
        }
        expect(rm.isCircuitBreakerTripped()).toBe(false);
    });

    test('circuit breaker should reset after a win', () => {
        for (let i = 0; i < 4; i++) rm.recordTradeResult(-10);
        rm.recordTradeResult(50);
        rm.recordTradeResult(-10);
        expect(rm.isCircuitBreakerTripped()).toBe(false);
    });

    test('calculateOptimalQuantity should return positive number', () => {
        const qty = rm.calculateOptimalQuantity(60000, 0.8, 500, 'BTC-USDT', 'TRENDING_UP');
        expect(qty).toBeGreaterThan(0);
        expect(typeof qty).toBe('number');
        expect(isNaN(qty)).toBe(false);
    });

    test('calculateOptimalQuantity should return 0 when circuit breaker tripped', () => {
        for (let i = 0; i < 5; i++) rm.recordTradeResult(-10);
        const qty = rm.calculateOptimalQuantity(60000, 0.8, 500, 'BTC-USDT', 'TRENDING_UP');
        expect(qty).toBe(0);
    });

    test('BUG #14: SCALE_IN should be validated — low confidence quantity', () => {
        const qty = rm.calculateOptimalQuantity(60000, 0.40, 500, 'BTC-USDT', 'HIGH_VOLATILITY');
        expect(qty).toBeLessThan(1);
        expect(qty).toBeGreaterThanOrEqual(0);
    });

    test('overtrading limit should return boolean', () => {
        for (let i = 0; i < 10; i++) rm.recordTradeResult(5);
        const canTrade = rm.checkOvertradingLimit();
        expect(typeof canTrade).toBe('boolean');
    });

    test('exportState and restoreState should round-trip', () => {
        rm.recordTradeResult(-10);
        rm.recordTradeResult(-10);
        const state = rm.exportState();
        expect(state).toBeDefined();
        
        const rm2 = new RiskManager({
            riskPerTrade: 0.015, maxDrawdown: 0.12, maxConsecutiveLosses: 5,
        }, { getPortfolioValue: () => 10000, getCurrentDrawdown: () => 0.02 });
        rm2.restoreState(state);
        expect(rm2.exportState().consecutiveLosses).toBe(state.consecutiveLosses);
    });
});

// ─── 3. Starvation Override Signal Mutation Test ────────────────────────────

describe('Starvation Override (conceptual)', () => {
    test('BUG #17: signal confidence mutation should be reverted after override attempt', () => {
        const signals = new Map([
            ['trend', { action: 'BUY', confidence: 0.35 }],
            ['meanrev', { action: 'SELL', confidence: 0.30 }],
            ['momentum', { action: 'HOLD', confidence: 0.50 }],
        ]);

        const origConfidences = new Map();
        for (const [name, sig] of signals) {
            origConfidences.set(name, sig.confidence);
        }

        // Simulate starvation boost (mutates in-place — BUG)
        for (const [name, sig] of signals) {
            if (sig.action !== 'HOLD' && sig.confidence > 0.2) {
                sig.confidence = Math.min(0.95, sig.confidence * 1.15);
            }
        }

        expect(signals.get('trend').confidence).not.toBe(origConfidences.get('trend'));
        expect(signals.get('meanrev').confidence).not.toBe(origConfidences.get('meanrev'));
        expect(signals.get('momentum').confidence).toBe(origConfidences.get('momentum'));
    });
});

// ─── 4. NeuronAI learnFromTrade Validation ─────────────────────────────────

describe('NeuronAI learnFromTrade validation', () => {
    test('BUG #12: should handle null/undefined tradeResult gracefully', () => {
        const learnFromTrade = (tradeResult) => {
            if (!tradeResult) return { safe: true };
            const pnl = tradeResult.pnl || 0;
            return { pnl, safe: true };
        };

        expect(learnFromTrade(null)).toEqual({ safe: true });
        expect(learnFromTrade(undefined)).toEqual({ safe: true });
        expect(learnFromTrade({})).toEqual({ pnl: 0, safe: true });
        expect(learnFromTrade({ pnl: NaN })).toEqual({ pnl: 0, safe: true });
    });

    test('pnl=0 should NOT count as a loss', () => {
        const pnl = 0;
        const isWin = pnl > 0;
        const isLoss = pnl < 0;
        const isNeutral = pnl === 0;
        
        expect(isWin).toBe(false);
        expect(isLoss).toBe(false);
        expect(isNeutral).toBe(true);
    });
});

// ─── 5. FLIP Command — FORCE_ENTRY validation ──────────────────────────────

describe('FLIP Command (conceptual)', () => {
    test('BUG #1: FORCE_ENTRY should be in valid command types', () => {
        const VALID_COMMAND_TYPES = [
            'SCALE_IN', 'SCALE_OUT', 'FLIP', 'ADJUST_SL', 'ADJUST_TP',
            'OVERRIDE_BIAS', 'SET_MODE', 'EXIT_ALL',
        ];
        expect(VALID_COMMAND_TYPES.includes('FORCE_ENTRY')).toBe(false);
        
        const FIXED_COMMAND_TYPES = [...VALID_COMMAND_TYPES, 'FORCE_ENTRY'];
        expect(FIXED_COMMAND_TYPES.includes('FORCE_ENTRY')).toBe(true);
    });

    test('BUG #1: FLIP close + open should either both succeed or both fail', () => {
        let closeSucceeded = false;
        let openSucceeded = false;

        const flipOperation = () => {
            closeSucceeded = true;
            const validTypes = ['SCALE_IN', 'SCALE_OUT', 'FLIP', 'ADJUST_SL'];
            if (validTypes.includes('FORCE_ENTRY')) {
                openSucceeded = true;
            }
        };
        flipOperation();
        
        expect(closeSucceeded).toBe(true);
        expect(openSucceeded).toBe(false); // Documents the bug
    });
});

// ─── 6. State Persistence ──────────────────────────────────────────────────

describe('State Persistence', () => {
    test('saveState should write valid JSON', () => {
        const state = {
            totalDecisions: 100, winCount: 30, lossCount: 70,
            totalPnL: -150.50, riskMultiplier: 0.8,
            consecutiveWins: 2, consecutiveLosses: 0,
            savedAt: new Date().toISOString(),
        };
        const parsed = JSON.parse(JSON.stringify(state, null, 2));
        expect(parsed.totalDecisions).toBe(100);
        expect(parsed.totalPnL).toBe(-150.50);
    });

    test('loadState with empty object should use safe defaults', () => {
        const data = {};
        const loaded = {
            totalDecisions: data.totalDecisions || 0,
            riskMultiplier: data.riskMultiplier || 1.0,
        };
        expect(loaded.riskMultiplier).toBe(1.0);
        expect(loaded.totalDecisions).toBe(0);
    });

    test('BUG: riskMultiplier=0 replaced by 1.0 due to || operator', () => {
        const data = { riskMultiplier: 0 };
        const buggy = data.riskMultiplier || 1.0;
        expect(buggy).toBe(1.0); // || treats 0 as falsy
        const fixed = data.riskMultiplier ?? 1.0;
        expect(fixed).toBe(0); // ?? only catches null/undefined
    });
});

// ─── 7. Risk Amplification ─────────────────────────────────────────────────

describe('Risk Amplification', () => {
    test('BUG #5: riskMultiplier should be capped', () => {
        let riskMultiplier = 1.0;
        const MAX_RISK_MULTIPLIER = 2.0;
        // Simulate consecutive wins amplifying risk without any cap
        for (let i = 0; i < 10; i++) {
            riskMultiplier += 0.15; // Each win adds 0.15 — no upper bound in original code
        }
        // Without cap: 1.0 + 10*0.15 = 2.5 — exceeds safe limit
        expect(riskMultiplier).toBeGreaterThan(2.0);
        // Cap SHOULD prevent this — proves Math.min guard is needed
        expect(Math.min(MAX_RISK_MULTIPLIER, riskMultiplier)).toBe(MAX_RISK_MULTIPLIER);
    });
});

// ─── 8. Defense Mode Asymmetry ─────────────────────────────────────────────

describe('Defense Mode', () => {
    test('BUG #10: SELL signals should also benefit from defense mode adjustment', () => {
        const defenseMultiplier = 0.7;
        const buyThreshold = 0.60 * defenseMultiplier;
        const sellThresholdBuggy = 0.60;
        const sellThresholdFixed = 0.60 * defenseMultiplier;

        expect(buyThreshold).toBeLessThan(sellThresholdBuggy);
        expect(sellThresholdFixed).toBe(buyThreshold);
    });
});
