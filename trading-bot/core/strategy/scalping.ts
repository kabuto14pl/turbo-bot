import { MarketData, Signal, StrategyResult } from '../types';
import { SimpleErrorManager } from '../error-handling/simple-error-manager';

/**
 * Scalping Strategy - High Frequency Short Term Trades
 * Quick profits on small price movements
 */
export class ScalpingStrategy {
    private errorManager: SimpleErrorManager;
    private prices: number[] = [];
    private volumes: number[] = [];
    private shortEMA: number = 0;
    private longEMA: number = 0;
    private previousSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    
    // Strategy parameters
    private shortPeriod: number = 5;
    private longPeriod: number = 15;
    private minProfitTarget: number = 0.002; // 0.2% target
    private maxHoldTime: number = 300000; // 5 minutes max
    private volumeThreshold: number = 1.5; // Volume multiplier

    constructor(config: any) {
        this.errorManager = new SimpleErrorManager();
        
        if (config) {
            this.shortPeriod = config.shortPeriod || this.shortPeriod;
            this.longPeriod = config.longPeriod || this.longPeriod;
            this.minProfitTarget = config.minProfitTarget || this.minProfitTarget;
            this.maxHoldTime = config.maxHoldTime || this.maxHoldTime;
            this.volumeThreshold = config.volumeThreshold || this.volumeThreshold;
        }
    }

    async execute(data: MarketData): Promise<StrategyResult> {
        try {
            this.prices.push(data.close);
            this.volumes.push(data.volume);

            // Keep only recent data
            if (this.prices.length > this.longPeriod * 2) {
                this.prices = this.prices.slice(-this.longPeriod * 2);
                this.volumes = this.volumes.slice(-this.longPeriod * 2);
            }

            if (this.prices.length < this.longPeriod) {
                return {
                    signals: [],
                    metadata: {
                        strategy: 'scalping',
                        timestamp: Date.now(),
                        status: 'warming_up'
                    }
                };
            }

            // Calculate EMAs
            this.shortEMA = this.calculateEMA(this.prices, this.shortPeriod);
            this.longEMA = this.calculateEMA(this.prices, this.longPeriod);

            // Check volume condition
            const avgVolume = this.volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
            const currentVolume = data.volume;
            const volumeSpike = currentVolume > avgVolume * this.volumeThreshold;

            const signals: Signal[] = [];
            const currentPrice = data.close;

            // Scalping conditions
            if (volumeSpike && this.shortEMA > this.longEMA && this.previousSignal !== 'BUY') {
                // Quick buy signal
                signals.push({
                    type: 'BUY',
                    symbol: data.symbol,
                    timestamp: Date.now(),
                    strength: 0.9,
                    price: currentPrice,
                    reason: 'Scalping buy: EMA crossover + volume spike',
                    metadata: {
                        strategy_type: 'scalping',
                        target_profit: this.minProfitTarget,
                        max_hold_time: this.maxHoldTime
                    }
                });
                this.previousSignal = 'BUY';
            } 
            else if (volumeSpike && this.shortEMA < this.longEMA && this.previousSignal !== 'SELL') {
                // Quick sell signal
                signals.push({
                    type: 'SELL',
                    symbol: data.symbol,
                    timestamp: Date.now(),
                    strength: 0.9,
                    price: currentPrice,
                    reason: 'Scalping sell: EMA crossover + volume spike',
                    metadata: {
                        strategy_type: 'scalping',
                        target_profit: this.minProfitTarget,
                        max_hold_time: this.maxHoldTime
                    }
                });
                this.previousSignal = 'SELL';
            }

            return {
                signals,
                metadata: {
                    strategy: 'scalping',
                    timestamp: Date.now(),
                    short_ema: this.shortEMA,
                    long_ema: this.longEMA,
                    volume_spike: volumeSpike,
                    avg_volume: avgVolume,
                    current_volume: currentVolume
                }
            };

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('Scalping strategy error:', errorMsg);
            throw error;
        }
    }

    private calculateEMA(prices: number[], period: number): number {
        if (prices.length < period) return prices[prices.length - 1] || 0;

        const k = 2 / (period + 1);
        let ema = prices[0];

        for (let i = 1; i < prices.length; i++) {
            ema = prices[i] * k + ema * (1 - k);
        }

        return ema;
    }

    getConfig(): any {
        return {
            shortPeriod: this.shortPeriod,
            longPeriod: this.longPeriod,
            minProfitTarget: this.minProfitTarget,
            maxHoldTime: this.maxHoldTime,
            volumeThreshold: this.volumeThreshold
        };
    }
}

export default new ScalpingStrategy({
    shortPeriod: 5,
    longPeriod: 15,
    minProfitTarget: 0.002,
    maxHoldTime: 300000,
    volumeThreshold: 1.5
});
