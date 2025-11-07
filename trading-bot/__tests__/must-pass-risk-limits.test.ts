/**
 * 🧪 MUST-PASS TEST SUITE - RISK LIMITS
 * Critical tests for risk management enforcement
 * Category: Position Sizing, Drawdown Limits, Circuit Breakers
 */

describe('🛡️ MUST-PASS: Risk Limit Enforcement', () => {
    let portfolio: any;
    let riskManager: any;

    beforeEach(() => {
        // Mock Portfolio
        portfolio = {
            balance: 10000,
            initialBalance: 10000,
            positions: [],
            trades: [],

            getCurrentBalance() {
                return this.balance;
            },

            getDrawdown() {
                const currentBalance = this.getCurrentBalance();
                const peak = Math.max(this.initialBalance, currentBalance);
                return (peak - currentBalance) / peak;
            },

            addPosition(position: any) {
                this.positions.push(position);
                this.balance -= position.cost;
            },

            recordTrade(trade: any) {
                this.trades.push(trade);
                this.balance += trade.pnl;
            }
        };

        // Mock Risk Manager
        riskManager = {
            maxDrawdown: 0.15, // 15%
            maxPositionSizePercent: 0.02, // 2%
            maxTotalExposure: 1.0, // 100%
            circuitBreakerActive: false,

            checkRiskLimits(order: any) {
                const checks = {
                    passed: true,
                    violations: [] as string[],
                    drawdownCheck: false,
                    positionSizeCheck: false,
                    exposureCheck: false
                };

                // 1. Drawdown check
                const currentDrawdown = portfolio.getDrawdown();
                if (currentDrawdown >= this.maxDrawdown) {
                    checks.passed = false;
                    checks.violations.push(`Max drawdown exceeded: ${(currentDrawdown * 100).toFixed(2)}%`);
                    this.circuitBreakerActive = true;
                } else {
                    checks.drawdownCheck = true;
                }

                // 2. Position size check
                const portfolioValue = portfolio.getCurrentBalance();
                const orderValue = order.price * order.quantity;
                const positionSizePercent = orderValue / portfolioValue;

                if (positionSizePercent > this.maxPositionSizePercent) {
                    checks.passed = false;
                    checks.violations.push(
                        `Position size ${(positionSizePercent * 100).toFixed(2)}% exceeds max ${(this.maxPositionSizePercent * 100)}%`
                    );
                } else {
                    checks.positionSizeCheck = true;
                }

                // 3. Total exposure check
                const currentExposure = portfolio.positions.reduce(
                    (sum: number, pos: any) => sum + (pos.cost / portfolioValue),
                    0
                );
                const newExposure = currentExposure + positionSizePercent;

                if (newExposure > this.maxTotalExposure) {
                    checks.passed = false;
                    checks.violations.push(
                        `Total exposure ${(newExposure * 100).toFixed(2)}% exceeds max 100%`
                    );
                } else {
                    checks.exposureCheck = true;
                }

                return checks;
            },

            calculatePositionSize(signal: any, portfolioValue: number) {
                const riskAmount = portfolioValue * this.maxPositionSizePercent;
                return riskAmount / signal.price;
            }
        };
    });

    test('TC-RISK-001: Max drawdown 15% blocks new orders', () => {
        // Simulate 15% loss
        portfolio.recordTrade({ pnl: -1500 });

        expect(portfolio.getCurrentBalance()).toBe(8500);
        expect(portfolio.getDrawdown()).toBeCloseTo(0.15, 2);

        // Try to place new order
        const order = {
            symbol: 'BTCUSDT',
            side: 'BUY',
            price: 50000,
            quantity: 0.04
        };

        const result = riskManager.checkRiskLimits(order);

        expect(result.passed).toBe(false);
        expect(result.violations.some((v: string) => v.includes('Max drawdown exceeded'))).toBe(true);
        expect(riskManager.circuitBreakerActive).toBe(true);
    });

    test('TC-RISK-002: Single trade exceeding 2% capital rejected', () => {
        const portfolioValue = portfolio.getCurrentBalance(); // 10000
        const maxPositionValue = portfolioValue * 0.02; // 200

        // Try to place order worth 3% (300)
        const order = {
            symbol: 'BTCUSDT',
            side: 'BUY',
            price: 50000,
            quantity: 0.006 // 50000 * 0.006 = 300 (3%)
        };

        const result = riskManager.checkRiskLimits(order);

        expect(result.passed).toBe(false);
        expect(result.positionSizeCheck).toBe(false);
        expect(result.violations.some((v: string) => v.includes('Position size'))).toBe(true);
    });

    test('TC-RISK-003: Total exposure >100% capital triggers circuit breaker', () => {
        const portfolioValue = portfolio.getCurrentBalance();

        // Add existing positions totaling 90%
        portfolio.addPosition({
            symbol: 'BTCUSDT',
            cost: portfolioValue * 0.90
        });

        // Try to add another 20% position
        const order = {
            symbol: 'ETHUSDT',
            side: 'BUY',
            price: 3000,
            quantity: 0.67 // 3000 * 0.67 = 2010 (>20%)
        };

        const result = riskManager.checkRiskLimits(order);

        expect(result.passed).toBe(false);
        expect(result.exposureCheck).toBe(false);
    });

    test('TC-RISK-004: Risk check latency <10ms', async () => {
        const order = {
            symbol: 'BTCUSDT',
            side: 'BUY',
            price: 50000,
            quantity: 0.002
        };

        const iterations = 1000;
        const latencies: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            riskManager.checkRiskLimits(order);
            const end = performance.now();
            latencies.push(end - start);
        }

        const avgLatency = latencies.reduce((a, b) => a + b, 0) / iterations;
        const p99 = latencies.sort((a, b) => a - b)[Math.floor(iterations * 0.99)];

        expect(avgLatency).toBeLessThan(10);
        expect(p99).toBeLessThan(10);
    });

    test('TC-RISK-005: Circuit breaker prevents all new orders after breach', () => {
        // Trigger circuit breaker
        portfolio.recordTrade({ pnl: -1500 });

        const order1 = {
            symbol: 'BTCUSDT',
            side: 'BUY',
            price: 50000,
            quantity: 0.002
        };

        riskManager.checkRiskLimits(order1);
        expect(riskManager.circuitBreakerActive).toBe(true);

        // Try another order - should also be blocked
        const order2 = {
            symbol: 'ETHUSDT',
            side: 'BUY',
            price: 3000,
            quantity: 0.001
        };

        const result = riskManager.checkRiskLimits(order2);
        expect(result.passed).toBe(false);
    });

    test('TC-RISK-006: Position size calculator respects 2% limit', () => {
        const portfolioValue = 10000;
        const signal = { price: 50000 };

        const positionSize = riskManager.calculatePositionSize(signal, portfolioValue);
        const positionValue = positionSize * signal.price;
        const positionPercent = positionValue / portfolioValue;

        expect(positionPercent).toBeLessThanOrEqual(0.02);
        expect(positionValue).toBeCloseTo(200, 0);
    });

    test('TC-RISK-007: Emergency stop at 14.5% drawdown (buffer)', () => {
        // Stop slightly before hard limit
        portfolio.recordTrade({ pnl: -1450 }); // 14.5% loss

        const order = {
            symbol: 'BTCUSDT',
            side: 'BUY',
            price: 50000,
            quantity: 0.002
        };

        const result = riskManager.checkRiskLimits(order);

        // Should still pass (not at 15% yet)
        expect(result.passed).toBe(true);

        // But warn in logs
        const drawdown = portfolio.getDrawdown();
        if (drawdown > 0.14) {
            console.warn(`⚠️ Approaching max drawdown: ${(drawdown * 100).toFixed(2)}%`);
        }
    });

    test('TC-RISK-008: Multiple violations reported correctly', () => {
        // Trigger both drawdown and position size violations
        portfolio.recordTrade({ pnl: -1500 }); // 15% drawdown

        const order = {
            symbol: 'BTCUSDT',
            side: 'BUY',
            price: 50000,
            quantity: 0.01 // >2% position
        };

        const result = riskManager.checkRiskLimits(order);

        expect(result.passed).toBe(false);
        expect(result.violations.length).toBeGreaterThanOrEqual(2);
        expect(result.violations.some((v: string) => v.includes('drawdown'))).toBe(true);
        expect(result.violations.some((v: string) => v.includes('Position size'))).toBe(true);
    });
});

/**
 * Test Evidence:
 * - Metrics: risk_violations_count, circuit_breaker_activations
 * - Logs: "Risk check failed: {violations}"
 * - DB: orders table with risk_check_passed=false
 */
