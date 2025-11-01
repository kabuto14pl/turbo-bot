/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { MarketData, Signal, StrategyResult } from '../types';
import { SimpleErrorManager } from '../error-handling/simple-error-manager';

/**
 * Grid Trading Strategy - Simple Implementation
 * Buy at support levels, sell at resistance levels
 */
export interface GridLevel {
    price: number;
    type: 'BUY' | 'SELL';
    filled: boolean;
    quantity: number;
}

export class GridTradingStrategy {
    private errorManager: SimpleErrorManager;
    private gridLevels: GridLevel[] = [];
    private gridSpacing: number;
    private baseQuantity: number;
    private currentPrice: number = 0;

    constructor(config: any) {
        this.errorManager = new SimpleErrorManager();
        this.gridSpacing = config.gridSpacing || 0.01; // 1% spacing
        this.baseQuantity = config.baseQuantity || 0.1;
        
        this.initializeGrid(config.startPrice || 50000, config.gridCount || 10);
    }

    private initializeGrid(centerPrice: number, gridCount: number): void {
        this.gridLevels = [];
        
        for (let i = -gridCount/2; i <= gridCount/2; i++) {
            if (i === 0) continue; // Skip center
            
            const price = centerPrice * (1 + i * this.gridSpacing);
            const type = i < 0 ? 'BUY' : 'SELL';
            
            this.gridLevels.push({
                price,
                type,
                filled: false,
                quantity: this.baseQuantity
            });
        }
    }

    async execute(data: MarketData): Promise<StrategyResult> {
        try {
            this.currentPrice = data.close;
            const signals: Signal[] = [];

            // Check for grid level triggers
            for (const level of this.gridLevels) {
                if (level.filled) continue;

                const priceReached = level.type === 'BUY' 
                    ? this.currentPrice <= level.price
                    : this.currentPrice >= level.price;

                if (priceReached) {
                    signals.push({
                        type: level.type,
                        symbol: data.symbol,
                        timestamp: Date.now(),
                        strength: 0.8,
                        price: level.price,
                        quantity: level.quantity,
                        reason: `Grid level triggered at ${level.price}`
                    });

                    level.filled = true;
                }
            }

            return {
                signals,
                metadata: {
                    strategy: 'grid_trading',
                    timestamp: Date.now(),
                    active_levels: this.gridLevels.filter(l => !l.filled).length,
                    filled_levels: this.gridLevels.filter(l => l.filled).length
                }
            };

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('Grid strategy error:', errorMsg);
            throw error;
        }
    }
}

export default new GridTradingStrategy({
    gridSpacing: 0.01,
    baseQuantity: 0.1,
    gridCount: 10
});
