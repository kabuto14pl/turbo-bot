"use strict";
// ============================================================================
// types.test.ts - Tests for Bot Configuration Types and Interfaces
// Unit tests for the modularized types module
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
describe('Types Module', () => {
    describe('StrategyName', () => {
        it('should include all supported strategy names', () => {
            const supportedStrategies = [
                'RSITurbo',
                'SuperTrend',
                'MACrossover',
                'MomentumConfirm',
                'MomentumPro',
                'EnhancedRSITurbo',
                'AdvancedAdaptive'
            ];
            // This test ensures all strategies are properly typed
            expect(supportedStrategies).toHaveLength(7);
            expect(supportedStrategies).toContain('RSITurbo');
            expect(supportedStrategies).toContain('AdvancedAdaptive');
        });
    });
    describe('StrategyConfig', () => {
        it('should create valid strategy config', () => {
            const config = {
                name: 'RSITurbo',
                params: { rsiPeriod: 14, threshold: 70 }
            };
            expect(config.name).toBe('RSITurbo');
            expect(config.params).toEqual({ rsiPeriod: 14, threshold: 70 });
        });
    });
    describe('TestConfig', () => {
        it('should create valid test configuration', () => {
            const config = {
                id: 'test-123',
                initialCapital: 10000,
                riskConfig: {
                    maxDrawdown: 0.2,
                    maxDailyDrawdown: 0.05
                },
                simulationConfig: {
                    commissionBps: 10,
                    slippageBps: 5
                },
                strategies: [{
                        name: 'RSITurbo',
                        params: { rsiPeriod: 14 }
                    }],
                symbols: ['BTCUSDT'],
                executionMode: 'simulation'
            };
            expect(config.id).toBe('test-123');
            expect(config.initialCapital).toBe(10000);
            expect(config.strategies).toHaveLength(1);
            expect(config.symbols).toContain('BTCUSDT');
        });
        it('should create config with auto-hedging', () => {
            const config = {
                id: 'hedge-test',
                initialCapital: 50000,
                riskConfig: {
                    maxDrawdown: 0.15,
                    maxDailyDrawdown: 0.03
                },
                simulationConfig: {
                    commissionBps: 5,
                    slippageBps: 3
                },
                strategies: [{
                        name: 'AdvancedAdaptive',
                        params: {}
                    }],
                symbols: ['BTCUSDT', 'ETHUSDT'],
                autoHedging: {
                    enabled: true,
                    deltaThreshold: 0.1,
                    correlationThreshold: 0.7,
                    volatilityThreshold: 0.3,
                    rebalanceFrequency: 24
                },
                executionMode: 'demo'
            };
            expect(config.autoHedging?.enabled).toBe(true);
            expect(config.autoHedging?.deltaThreshold).toBe(0.1);
            expect(config.executionMode).toBe('demo');
        });
    });
    describe('SignalEvent', () => {
        it('should create valid signal event', () => {
            const signal = {
                strategy: 'RSITurbo',
                ts: Date.now(),
                type: 'BUY',
                price: 50000,
                confidence: 0.8
            };
            expect(signal.strategy).toBe('RSITurbo');
            expect(signal.type).toBe('BUY');
            expect(signal.price).toBe(50000);
            expect(signal.confidence).toBe(0.8);
        });
    });
    describe('TradeEvent', () => {
        it('should create valid trade event', () => {
            const trade = {
                strategy: 'SuperTrend',
                action: 'OPEN',
                side: 'buy',
                ts: Date.now(),
                price: 45000,
                size: 0.1,
                sl: 44000,
                tp: 47000,
                pnl: null
            };
            expect(trade.strategy).toBe('SuperTrend');
            expect(trade.action).toBe('OPEN');
            expect(trade.side).toBe('buy');
            expect(trade.size).toBe(0.1);
        });
    });
    describe('BotRuntimeState', () => {
        it('should create valid runtime state', () => {
            const state = {
                signalEvents: [],
                tradeEvents: [],
                startTime: Date.now(),
                isRunning: true,
                mode: 'backtest'
            };
            expect(state.isRunning).toBe(true);
            expect(state.mode).toBe('backtest');
            expect(state.signalEvents).toEqual([]);
            expect(state.tradeEvents).toEqual([]);
        });
    });
    describe('PerformanceMetrics', () => {
        it('should create valid performance metrics', () => {
            const metrics = {
                totalReturn: 0.25,
                sharpeRatio: 1.5,
                maxDrawdown: 0.08,
                winRate: 0.65,
                totalTrades: 100,
                profitFactor: 1.8,
                var95: 0.02,
                cvar95: 0.035
            };
            expect(metrics.totalReturn).toBe(0.25);
            expect(metrics.sharpeRatio).toBe(1.5);
            expect(metrics.maxDrawdown).toBe(0.08);
            expect(metrics.winRate).toBe(0.65);
            expect(metrics.totalTrades).toBe(100);
        });
    });
});
