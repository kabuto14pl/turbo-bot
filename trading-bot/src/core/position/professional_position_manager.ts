/**
 * 🎯 PROFESSIONAL POSITION MANAGEMENT SYSTEM
 * Enterprise-grade position tracking with TP/SL/Trailing Stop
 * 
 * @author AI Professional Trader
 * @date 2025-12-08
 * @version 1.0.0
 */

export interface PositionEntry {
    symbol: string;
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    quantity: number;
    entryTime: number;
    stopLoss: number;      // -1% default
    takeProfit: number;    // +2% default
    trailingStop: number;  // Activated at +1%
    highWaterMark: number; // Track highest price for trailing
}

export interface PositionExitSignal {
    shouldExit: boolean;
    reason: string;
    exitType: 'TAKE_PROFIT' | 'STOP_LOSS' | 'TRAILING_STOP' | 'TIME_BASED' | 'MARKET_SIGNAL';
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class ProfessionalPositionManager {
    private positions: Map<string, PositionEntry> = new Map();
    
    // Configuration
    private readonly DEFAULT_TAKE_PROFIT = 0.02;  // 2%
    private readonly DEFAULT_STOP_LOSS = 0.01;    // 1%
    private readonly TRAILING_ACTIVATION = 0.01;  // Activate at +1%
    private readonly TRAILING_DISTANCE = 0.005;   // Trail 0.5% below high
    private readonly MAX_HOLDING_TIME = 30 * 60 * 1000; // 30 minutes
    private readonly MIN_PROFIT_EXIT_TIME = 0.005; // 0.5% profit for time-based exit

    /**
     * Open new position with professional risk management
     */
    openPosition(
        symbol: string,
        side: 'LONG' | 'SHORT',
        entryPrice: number,
        quantity: number,
        customTP?: number,
        customSL?: number
    ): void {
        const takeProfit = customTP || entryPrice * (1 + this.DEFAULT_TAKE_PROFIT);
        const stopLoss = customSL || entryPrice * (1 - this.DEFAULT_STOP_LOSS);

        const position: PositionEntry = {
            symbol,
            side,
            entryPrice,
            quantity,
            entryTime: Date.now(),
            stopLoss,
            takeProfit,
            trailingStop: entryPrice * (1 + this.TRAILING_ACTIVATION), // Activate at +1%
            highWaterMark: entryPrice
        };

        this.positions.set(symbol, position);
        
        console.log(`✅ [POSITION] Opened ${side} ${symbol} @ $${entryPrice.toFixed(2)}`);
        console.log(`   TP: $${takeProfit.toFixed(2)} (+${(this.DEFAULT_TAKE_PROFIT*100).toFixed(1)}%)`);
        console.log(`   SL: $${stopLoss.toFixed(2)} (-${(this.DEFAULT_STOP_LOSS*100).toFixed(1)}%)`);
        console.log(`   Trailing: Activates @ $${position.trailingStop.toFixed(2)}`);
    }

    /**
     * Check if position should be exited (CORE LOGIC)
     */
    shouldExitPosition(symbol: string, currentPrice: number, marketSignal?: number): PositionExitSignal {
        const position = this.positions.get(symbol);
        
        if (!position) {
            return { shouldExit: false, reason: 'No open position', exitType: 'MARKET_SIGNAL', urgency: 'LOW' };
        }

        const now = Date.now();
        const holdingTime = now - position.entryTime;
        const unrealizedPnL = (currentPrice - position.entryPrice) / position.entryPrice;
        const unrealizedPnLDollars = (currentPrice - position.entryPrice) * position.quantity;

        // Update high water mark for trailing stop
        if (currentPrice > position.highWaterMark) {
            position.highWaterMark = currentPrice;
            
            // Update trailing stop (0.5% below high water mark)
            const newTrailingStop = position.highWaterMark * (1 - this.TRAILING_DISTANCE);
            if (newTrailingStop > position.trailingStop) {
                position.trailingStop = newTrailingStop;
                console.log(`📈 [POSITION] Trailing stop updated: $${newTrailingStop.toFixed(2)} (high: $${position.highWaterMark.toFixed(2)})`);
            }
        }

        // 🎯 EXIT RULE 1: TAKE PROFIT (Highest Priority)
        if (currentPrice >= position.takeProfit) {
            return {
                shouldExit: true,
                reason: `Take-Profit hit: $${currentPrice.toFixed(2)} >= $${position.takeProfit.toFixed(2)} (+${(unrealizedPnL*100).toFixed(2)}%)`,
                exitType: 'TAKE_PROFIT',
                urgency: 'HIGH'
            };
        }

        // 🎯 EXIT RULE 2: STOP LOSS (Critical Risk Management)
        if (currentPrice <= position.stopLoss) {
            return {
                shouldExit: true,
                reason: `Stop-Loss hit: $${currentPrice.toFixed(2)} <= $${position.stopLoss.toFixed(2)} (${(unrealizedPnL*100).toFixed(2)}%)`,
                exitType: 'STOP_LOSS',
                urgency: 'HIGH'
            };
        }

        // 🎯 EXIT RULE 3: TRAILING STOP (Lock in Profits)
        if (position.highWaterMark >= position.trailingStop && currentPrice <= position.trailingStop) {
            return {
                shouldExit: true,
                reason: `Trailing Stop hit: $${currentPrice.toFixed(2)} <= $${position.trailingStop.toFixed(2)} (locking +${(unrealizedPnL*100).toFixed(2)}%)`,
                exitType: 'TRAILING_STOP',
                urgency: 'HIGH'
            };
        }

        // 🎯 EXIT RULE 4: TIME-BASED EXIT (Avoid dead capital)
        if (holdingTime > this.MAX_HOLDING_TIME) {
            if (unrealizedPnL > this.MIN_PROFIT_EXIT_TIME) {
                // Exit with small profit after max holding time
                return {
                    shouldExit: true,
                    reason: `Time-based exit: ${(holdingTime/60000).toFixed(1)}min holding, +${(unrealizedPnL*100).toFixed(2)}% profit`,
                    exitType: 'TIME_BASED',
                    urgency: 'MEDIUM'
                };
            } else if (unrealizedPnL < -0.005 && holdingTime > this.MAX_HOLDING_TIME * 1.5) {
                // Exit at loss if holding too long and losing
                return {
                    shouldExit: true,
                    reason: `Extended time-based exit: ${(holdingTime/60000).toFixed(1)}min holding, ${(unrealizedPnL*100).toFixed(2)}% loss`,
                    exitType: 'TIME_BASED',
                    urgency: 'HIGH'
                };
            }
        }

        // 🎯 EXIT RULE 5: MARKET SIGNAL (ML/Technical)
        if (marketSignal !== undefined && marketSignal < -0.3) {
            // Moderate sell signal + some profit = exit
            if (unrealizedPnL > 0.003) {
                return {
                    shouldExit: true,
                    reason: `Market turning: signal=${marketSignal.toFixed(3)}, +${(unrealizedPnL*100).toFixed(2)}% profit`,
                    exitType: 'MARKET_SIGNAL',
                    urgency: 'MEDIUM'
                };
            }
            // Strong sell signal even at small loss
            if (marketSignal < -0.5) {
                return {
                    shouldExit: true,
                    reason: `Strong sell signal: ${marketSignal.toFixed(3)}, PnL=${(unrealizedPnL*100).toFixed(2)}%`,
                    exitType: 'MARKET_SIGNAL',
                    urgency: 'HIGH'
                };
            }
        }

        // No exit signal - hold position
        return {
            shouldExit: false,
            reason: `Holding: PnL=${(unrealizedPnL*100).toFixed(2)}% ($${unrealizedPnLDollars.toFixed(2)}), Time=${(holdingTime/60000).toFixed(1)}min`,
            exitType: 'MARKET_SIGNAL',
            urgency: 'LOW'
        };
    }

    /**
     * Close position
     */
    closePosition(symbol: string, exitPrice: number, reason: string): void {
        const position = this.positions.get(symbol);
        
        if (!position) {
            console.warn(`⚠️ [POSITION] Cannot close - no position found for ${symbol}`);
            return;
        }

        const pnl = (exitPrice - position.entryPrice) * position.quantity;
        const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
        const holdingTime = Date.now() - position.entryTime;

        console.log(`🔒 [POSITION] Closed ${position.side} ${symbol} @ $${exitPrice.toFixed(2)}`);
        console.log(`   Entry: $${position.entryPrice.toFixed(2)} | Exit: $${exitPrice.toFixed(2)}`);
        console.log(`   PnL: $${pnl.toFixed(2)} (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`);
        console.log(`   Holding Time: ${(holdingTime/60000).toFixed(1)} minutes`);
        console.log(`   Reason: ${reason}`);

        this.positions.delete(symbol);
    }

    /**
     * Get position info
     */
    getPosition(symbol: string): PositionEntry | undefined {
        return this.positions.get(symbol);
    }

    /**
     * Check if has open position
     */
    hasOpenPosition(symbol: string): boolean {
        return this.positions.has(symbol);
    }

    /**
     * Get unrealized PnL
     */
    getUnrealizedPnL(symbol: string, currentPrice: number): { pnl: number; pnlPercent: number } {
        const position = this.positions.get(symbol);
        
        if (!position) {
            return { pnl: 0, pnlPercent: 0 };
        }

        const pnl = (currentPrice - position.entryPrice) * position.quantity;
        const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

        return { pnl, pnlPercent };
    }
}
