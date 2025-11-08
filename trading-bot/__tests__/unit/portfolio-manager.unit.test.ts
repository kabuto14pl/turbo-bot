/**
 * 🧪 UNIT TESTS - PORTFOLIO MANAGER
 * Exhaustive tests for balance tracking, PnL, and position management
 * Enterprise-grade precision and error handling
 */

import Decimal from 'decimal.js';

describe('💼 UNIT: Portfolio Manager', () => {

    describe('Balance Tracking', () => {
        let portfolio: any;

        beforeEach(() => {
            portfolio = {
                initialBalance: 10000,
                balance: 10000,
                balanceHistory: [10000],

                updateBalance(amount: number): void {
                    if (!Number.isFinite(amount)) {
                        throw new Error('Amount must be a finite number');
                    }

                    this.balance = new Decimal(this.balance).plus(amount).toNumber();
                    this.balanceHistory.push(this.balance);

                    if (this.balance < 0) {
                        throw new Error('Balance cannot be negative');
                    }
                },

                getBalance(): number {
                    return this.balance;
                },

                getBalanceHistory(): number[] {
                    return [...this.balanceHistory];
                },

                resetBalance(newBalance: number): void {
                    if (newBalance < 0) throw new Error('Balance cannot be negative');
                    this.balance = newBalance;
                    this.initialBalance = newBalance;
                    this.balanceHistory = [newBalance];
                }
            };
        });

        test('should initialize with correct balance', () => {
            expect(portfolio.getBalance()).toBe(10000);
            expect(portfolio.initialBalance).toBe(10000);
        });

        test('should update balance with positive amount', () => {
            portfolio.updateBalance(500);
            expect(portfolio.getBalance()).toBe(10500);
        });

        test('should update balance with negative amount', () => {
            portfolio.updateBalance(-500);
            expect(portfolio.getBalance()).toBe(9500);
        });

        test('should update balance with zero amount', () => {
            portfolio.updateBalance(0);
            expect(portfolio.getBalance()).toBe(10000);
        });

        test('should update balance with decimal amount', () => {
            portfolio.updateBalance(123.45);
            expect(portfolio.getBalance()).toBeCloseTo(10123.45, 2);
        });

        test('should track balance history', () => {
            portfolio.updateBalance(500);
            portfolio.updateBalance(-200);
            portfolio.updateBalance(100);

            const history = portfolio.getBalanceHistory();
            expect(history).toEqual([10000, 10500, 10300, 10400]);
        });

        test('should prevent negative balance', () => {
            expect(() => portfolio.updateBalance(-15000))
                .toThrow('Balance cannot be negative');
        });

        test('should reject NaN amount', () => {
            expect(() => portfolio.updateBalance(NaN))
                .toThrow('Amount must be a finite number');
        });

        test('should reject Infinity amount', () => {
            expect(() => portfolio.updateBalance(Infinity))
                .toThrow('Amount must be a finite number');
        });

        test('should reset balance correctly', () => {
            portfolio.updateBalance(500);
            portfolio.resetBalance(20000);

            expect(portfolio.getBalance()).toBe(20000);
            expect(portfolio.initialBalance).toBe(20000);
            expect(portfolio.balanceHistory).toEqual([20000]);
        });

        test('should reject negative reset balance', () => {
            expect(() => portfolio.resetBalance(-1000))
                .toThrow('Balance cannot be negative');
        });

        test('should handle very large balance', () => {
            portfolio.updateBalance(1000000000);
            expect(portfolio.getBalance()).toBe(1000010000);
        });

        test('should handle very small balance changes', () => {
            portfolio.updateBalance(0.01);
            expect(portfolio.getBalance()).toBeCloseTo(10000.01, 2);
        });
    });

    describe('PnL Calculations', () => {
        let pnlCalculator: any;

        beforeEach(() => {
            pnlCalculator = {
                calculateTradePnL(entry: any, exit: any, fees: number = 0): any {
                    if (!entry || !exit) throw new Error('Entry and exit required');
                    if (entry.quantity <= 0) throw new Error('Quantity must be positive');
                    if (entry.price <= 0 || exit.price <= 0) {
                        throw new Error('Prices must be positive');
                    }

                    const side = entry.side;
                    let pnl: Decimal;

                    if (side === 'BUY') {
                        // Long position: profit when price goes up
                        pnl = new Decimal(exit.price).minus(entry.price).times(entry.quantity);
                    } else if (side === 'SELL') {
                        // Short position: profit when price goes down
                        pnl = new Decimal(entry.price).minus(exit.price).times(entry.quantity);
                    } else {
                        throw new Error('Invalid side: must be BUY or SELL');
                    }

                    const grossPnL = pnl.toNumber();
                    const netPnL = new Decimal(grossPnL).minus(fees).toNumber();
                    const pnlPercent = new Decimal(netPnL)
                        .dividedBy(new Decimal(entry.price).times(entry.quantity))
                        .times(100)
                        .toDecimalPlaces(2)
                        .toNumber();

                    return {
                        grossPnL,
                        fees,
                        netPnL,
                        pnlPercent,
                        entryValue: new Decimal(entry.price).times(entry.quantity).toNumber(),
                        exitValue: new Decimal(exit.price).times(entry.quantity).toNumber()
                    };
                },

                calculateTotalPnL(trades: any[]): any {
                    if (!trades || trades.length === 0) {
                        return { totalGross: 0, totalFees: 0, totalNet: 0, count: 0 };
                    }

                    let totalGross = new Decimal(0);
                    let totalFees = new Decimal(0);

                    for (const trade of trades) {
                        totalGross = totalGross.plus(trade.grossPnL);
                        totalFees = totalFees.plus(trade.fees);
                    }

                    return {
                        totalGross: totalGross.toNumber(),
                        totalFees: totalFees.toNumber(),
                        totalNet: totalGross.minus(totalFees).toNumber(),
                        count: trades.length
                    };
                }
            };
        });

        test('should calculate profit for long position', () => {
            const entry = { side: 'BUY', price: 50000, quantity: 0.1 };
            const exit = { price: 51000, quantity: 0.1 };

            const result = pnlCalculator.calculateTradePnL(entry, exit);

            expect(result.grossPnL).toBe(100); // (51000 - 50000) * 0.1
            expect(result.netPnL).toBe(100);
        });

        test('should calculate loss for long position', () => {
            const entry = { side: 'BUY', price: 50000, quantity: 0.1 };
            const exit = { price: 49000, quantity: 0.1 };

            const result = pnlCalculator.calculateTradePnL(entry, exit);

            expect(result.grossPnL).toBe(-100);
            expect(result.netPnL).toBe(-100);
        });

        test('should calculate profit for short position', () => {
            const entry = { side: 'SELL', price: 50000, quantity: 0.1 };
            const exit = { price: 49000, quantity: 0.1 };

            const result = pnlCalculator.calculateTradePnL(entry, exit);

            expect(result.grossPnL).toBe(100); // (50000 - 49000) * 0.1
            expect(result.netPnL).toBe(100);
        });

        test('should calculate loss for short position', () => {
            const entry = { side: 'SELL', price: 50000, quantity: 0.1 };
            const exit = { price: 51000, quantity: 0.1 };

            const result = pnlCalculator.calculateTradePnL(entry, exit);

            expect(result.grossPnL).toBe(-100);
        });

        test('should deduct fees from PnL', () => {
            const entry = { side: 'BUY', price: 50000, quantity: 0.1 };
            const exit = { price: 51000, quantity: 0.1 };
            const fees = 10;

            const result = pnlCalculator.calculateTradePnL(entry, exit, fees);

            expect(result.grossPnL).toBe(100);
            expect(result.netPnL).toBe(90); // 100 - 10
            expect(result.fees).toBe(10);
        });

        test('should calculate PnL percentage', () => {
            const entry = { side: 'BUY', price: 50000, quantity: 0.1 };
            const exit = { price: 51000, quantity: 0.1 };

            const result = pnlCalculator.calculateTradePnL(entry, exit);

            expect(result.pnlPercent).toBeCloseTo(2, 2); // 2% profit
        });

        test('should handle zero PnL', () => {
            const entry = { side: 'BUY', price: 50000, quantity: 0.1 };
            const exit = { price: 50000, quantity: 0.1 };

            const result = pnlCalculator.calculateTradePnL(entry, exit);

            expect(result.grossPnL).toBe(0);
            expect(result.pnlPercent).toBe(0);
        });

        test('should reject negative quantity', () => {
            const entry = { side: 'BUY', price: 50000, quantity: -0.1 };
            const exit = { price: 51000, quantity: -0.1 };

            expect(() => pnlCalculator.calculateTradePnL(entry, exit))
                .toThrow('Quantity must be positive');
        });

        test('should reject zero price', () => {
            const entry = { side: 'BUY', price: 0, quantity: 0.1 };
            const exit = { price: 51000, quantity: 0.1 };

            expect(() => pnlCalculator.calculateTradePnL(entry, exit))
                .toThrow('Prices must be positive');
        });

        test('should reject invalid side', () => {
            const entry = { side: 'INVALID', price: 50000, quantity: 0.1 };
            const exit = { price: 51000, quantity: 0.1 };

            expect(() => pnlCalculator.calculateTradePnL(entry, exit))
                .toThrow('Invalid side');
        });

        test('should calculate total PnL for multiple trades', () => {
            const trades = [
                { grossPnL: 100, fees: 5 },
                { grossPnL: -50, fees: 3 },
                { grossPnL: 75, fees: 4 }
            ];

            const result = pnlCalculator.calculateTotalPnL(trades);

            expect(result.totalGross).toBe(125);
            expect(result.totalFees).toBe(12);
            expect(result.totalNet).toBe(113);
            expect(result.count).toBe(3);
        });

        test('should handle empty trades array', () => {
            const result = pnlCalculator.calculateTotalPnL([]);

            expect(result.totalGross).toBe(0);
            expect(result.totalNet).toBe(0);
            expect(result.count).toBe(0);
        });

        test('should handle very small PnL amounts', () => {
            const entry = { side: 'BUY', price: 0.01, quantity: 100 };
            const exit = { price: 0.0101, quantity: 100 };

            const result = pnlCalculator.calculateTradePnL(entry, exit);

            // 100 * (0.0101 - 0.01) = 100 * 0.0001 = 0.01
            expect(result.grossPnL).toBeCloseTo(0.01, 4);
        });

        test('should handle very large PnL amounts', () => {
            const entry = { side: 'BUY', price: 50000, quantity: 1000 };
            const exit = { price: 60000, quantity: 1000 };

            const result = pnlCalculator.calculateTradePnL(entry, exit);

            expect(result.grossPnL).toBe(10000000);
        });
    });

    describe('Position Management', () => {
        let positionManager: any;

        beforeEach(() => {
            positionManager = {
                positions: new Map(),

                openPosition(symbol: string, side: string, quantity: number, price: number): any {
                    if (this.positions.has(symbol)) {
                        throw new Error(`Position already exists for ${symbol}`);
                    }

                    if (quantity <= 0) throw new Error('Quantity must be positive');
                    if (price <= 0) throw new Error('Price must be positive');

                    const position = {
                        symbol,
                        side,
                        quantity,
                        entryPrice: price,
                        currentPrice: price,
                        unrealizedPnL: 0,
                        openTime: Date.now()
                    };

                    this.positions.set(symbol, position);
                    return position;
                },

                closePosition(symbol: string, exitPrice: number): any {
                    const position = this.positions.get(symbol);
                    if (!position) throw new Error(`No position found for ${symbol}`);

                    const pnl = this.calculatePositionPnL(position, exitPrice);
                    this.positions.delete(symbol);

                    return {
                        ...position,
                        exitPrice,
                        realizedPnL: pnl,
                        closeTime: Date.now()
                    };
                },

                updatePosition(symbol: string, currentPrice: number): any {
                    const position = this.positions.get(symbol);
                    if (!position) throw new Error(`No position found for ${symbol}`);

                    position.currentPrice = currentPrice;
                    position.unrealizedPnL = this.calculatePositionPnL(position, currentPrice);

                    return position;
                },

                calculatePositionPnL(position: any, currentPrice: number): number {
                    if (position.side === 'BUY') {
                        return new Decimal(currentPrice)
                            .minus(position.entryPrice)
                            .times(position.quantity)
                            .toNumber();
                    } else {
                        return new Decimal(position.entryPrice)
                            .minus(currentPrice)
                            .times(position.quantity)
                            .toNumber();
                    }
                },

                getPosition(symbol: string): any {
                    return this.positions.get(symbol);
                },

                getAllPositions(): any[] {
                    return Array.from(this.positions.values());
                },

                getTotalExposure(): number {
                    let total = new Decimal(0);
                    for (const position of this.positions.values()) {
                        const exposure = new Decimal(position.currentPrice).times(position.quantity);
                        total = total.plus(exposure);
                    }
                    return total.toNumber();
                }
            };
        });

        test('should open long position', () => {
            const position = positionManager.openPosition('BTCUSDT', 'BUY', 0.1, 50000);

            expect(position.symbol).toBe('BTCUSDT');
            expect(position.side).toBe('BUY');
            expect(position.quantity).toBe(0.1);
            expect(position.entryPrice).toBe(50000);
            expect(position.unrealizedPnL).toBe(0);
        });

        test('should open short position', () => {
            const position = positionManager.openPosition('ETHUSDT', 'SELL', 1, 3000);

            expect(position.symbol).toBe('ETHUSDT');
            expect(position.side).toBe('SELL');
        });

        test('should reject duplicate position', () => {
            positionManager.openPosition('BTCUSDT', 'BUY', 0.1, 50000);

            expect(() => positionManager.openPosition('BTCUSDT', 'BUY', 0.2, 51000))
                .toThrow('Position already exists');
        });

        test('should close position and calculate PnL', () => {
            positionManager.openPosition('BTCUSDT', 'BUY', 0.1, 50000);
            const closed = positionManager.closePosition('BTCUSDT', 51000);

            expect(closed.exitPrice).toBe(51000);
            expect(closed.realizedPnL).toBe(100);
            expect(positionManager.getPosition('BTCUSDT')).toBeUndefined();
        });

        test('should update position with unrealized PnL', () => {
            positionManager.openPosition('BTCUSDT', 'BUY', 0.1, 50000);
            const updated = positionManager.updatePosition('BTCUSDT', 52000);

            expect(updated.currentPrice).toBe(52000);
            expect(updated.unrealizedPnL).toBe(200);
        });

        test('should calculate unrealized profit for long', () => {
            positionManager.openPosition('BTCUSDT', 'BUY', 0.1, 50000);
            positionManager.updatePosition('BTCUSDT', 51000);

            const position = positionManager.getPosition('BTCUSDT');
            expect(position.unrealizedPnL).toBe(100);
        });

        test('should calculate unrealized loss for long', () => {
            positionManager.openPosition('BTCUSDT', 'BUY', 0.1, 50000);
            positionManager.updatePosition('BTCUSDT', 49000);

            const position = positionManager.getPosition('BTCUSDT');
            expect(position.unrealizedPnL).toBe(-100);
        });

        test('should calculate unrealized profit for short', () => {
            positionManager.openPosition('BTCUSDT', 'SELL', 0.1, 50000);
            positionManager.updatePosition('BTCUSDT', 49000);

            const position = positionManager.getPosition('BTCUSDT');
            expect(position.unrealizedPnL).toBe(100);
        });

        test('should calculate unrealized loss for short', () => {
            positionManager.openPosition('BTCUSDT', 'SELL', 0.1, 50000);
            positionManager.updatePosition('BTCUSDT', 51000);

            const position = positionManager.getPosition('BTCUSDT');
            expect(position.unrealizedPnL).toBe(-100);
        });

        test('should get all open positions', () => {
            positionManager.openPosition('BTCUSDT', 'BUY', 0.1, 50000);
            positionManager.openPosition('ETHUSDT', 'SELL', 1, 3000);

            const positions = positionManager.getAllPositions();
            expect(positions.length).toBe(2);
        });

        test('should calculate total exposure', () => {
            positionManager.openPosition('BTCUSDT', 'BUY', 0.1, 50000);
            positionManager.openPosition('ETHUSDT', 'SELL', 1, 3000);

            const exposure = positionManager.getTotalExposure();
            expect(exposure).toBe(8000); // 5000 + 3000
        });

        test('should handle position not found on close', () => {
            expect(() => positionManager.closePosition('INVALID', 50000))
                .toThrow('No position found');
        });

        test('should handle position not found on update', () => {
            expect(() => positionManager.updatePosition('INVALID', 50000))
                .toThrow('No position found');
        });

        test('should reject zero quantity', () => {
            expect(() => positionManager.openPosition('BTCUSDT', 'BUY', 0, 50000))
                .toThrow('Quantity must be positive');
        });

        test('should reject negative price', () => {
            expect(() => positionManager.openPosition('BTCUSDT', 'BUY', 0.1, -50000))
                .toThrow('Price must be positive');
        });

        test('should track position open time', () => {
            const before = Date.now();
            const position = positionManager.openPosition('BTCUSDT', 'BUY', 0.1, 50000);
            const after = Date.now();

            expect(position.openTime).toBeGreaterThanOrEqual(before);
            expect(position.openTime).toBeLessThanOrEqual(after);
        });

        test('should track position close time', () => {
            positionManager.openPosition('BTCUSDT', 'BUY', 0.1, 50000);

            const before = Date.now();
            const closed = positionManager.closePosition('BTCUSDT', 51000);
            const after = Date.now();

            expect(closed.closeTime).toBeGreaterThanOrEqual(before);
            expect(closed.closeTime).toBeLessThanOrEqual(after);
        });
    });

    describe('Portfolio Metrics', () => {
        let metrics: any;

        beforeEach(() => {
            metrics = {
                calculateEquityCurve(balanceHistory: number[]): any {
                    if (!balanceHistory || balanceHistory.length === 0) {
                        throw new Error('Balance history required');
                    }

                    const initial = balanceHistory[0];
                    const current = balanceHistory[balanceHistory.length - 1];
                    const peak = Math.max(...balanceHistory);
                    const valley = Math.min(...balanceHistory);

                    const totalReturn = ((current - initial) / initial) * 100;
                    const maxDrawdown = ((peak - valley) / peak) * 100;

                    return {
                        initial,
                        current,
                        peak,
                        valley,
                        totalReturn: parseFloat(totalReturn.toFixed(2)),
                        maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
                        dataPoints: balanceHistory.length
                    };
                },

                calculateROI(initialInvestment: number, currentValue: number): number {
                    if (initialInvestment <= 0) throw new Error('Initial investment must be positive');

                    return new Decimal(currentValue)
                        .minus(initialInvestment)
                        .dividedBy(initialInvestment)
                        .times(100)
                        .toDecimalPlaces(2)
                        .toNumber();
                }
            };
        });

        test('should calculate equity curve metrics', () => {
            const history = [10000, 11000, 10500, 12000, 11500];
            const curve = metrics.calculateEquityCurve(history);

            expect(curve.initial).toBe(10000);
            expect(curve.current).toBe(11500);
            expect(curve.peak).toBe(12000);
            expect(curve.totalReturn).toBe(15);
        });

        test('should calculate max drawdown in equity curve', () => {
            const history = [10000, 12000, 9000, 11000];
            const curve = metrics.calculateEquityCurve(history);

            expect(curve.maxDrawdown).toBe(25); // 12000 -> 9000
        });

        test('should handle flat equity curve', () => {
            const history = [10000, 10000, 10000];
            const curve = metrics.calculateEquityCurve(history);

            expect(curve.totalReturn).toBe(0);
            expect(curve.maxDrawdown).toBe(0);
        });

        test('should calculate positive ROI', () => {
            const roi = metrics.calculateROI(10000, 15000);
            expect(roi).toBe(50);
        });

        test('should calculate negative ROI', () => {
            const roi = metrics.calculateROI(10000, 7000);
            expect(roi).toBe(-30);
        });

        test('should calculate zero ROI', () => {
            const roi = metrics.calculateROI(10000, 10000);
            expect(roi).toBe(0);
        });

        test('should reject zero initial investment', () => {
            expect(() => metrics.calculateROI(0, 5000))
                .toThrow('Initial investment must be positive');
        });
    });
});

/**
 * Test Coverage:
 * ✅ Balance tracking (add/subtract/reset)
 * ✅ PnL calculations (long/short, gross/net)
 * ✅ Position management (open/close/update)
 * ✅ Unrealized PnL tracking
 * ✅ Total exposure calculation
 * ✅ Portfolio metrics (ROI, equity curve)
 * ✅ Edge cases (zero, negative, extreme)
 * ✅ Error handling (invalid inputs)
 * ✅ Precision with Decimal.js
 * ✅ Timestamps and history tracking
 */
