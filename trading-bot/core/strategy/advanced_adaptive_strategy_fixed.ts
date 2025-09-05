// ============================================================================
//  advanced_adaptive_strategy_fixed.ts – FIXED VERSION 
//  Uproszczona wersja bez błędów kompilacji
// ============================================================================

import { BotState, StrategySignal } from '../types/strategy';
import { Logger } from '../../infrastructure/logging/logger';

interface AdaptiveStrategyOptions {
    rsiPeriod?: number;
    rsiOversold?: number;
    rsiOverbought?: number;
    adxThreshold?: number;
}

export class AdvancedAdaptiveStrategyFixed {
    private options: AdaptiveStrategyOptions;
    private logger: Logger;
    public readonly name: string = 'AdvancedAdaptiveFixed';

    constructor(logger: Logger, options: AdaptiveStrategyOptions = {}) {
        this.logger = logger;
        this.options = {
            rsiPeriod: 14,
            rsiOversold: 30,
            rsiOverbought: 70,
            adxThreshold: 25,
            ...options
        };
    }

    async run(state: BotState): Promise<StrategySignal[]> {
        const signals: StrategySignal[] = [];
        
        try {
            const indicators = state.indicators.m15;
            const rsi = indicators.rsi;
            const adx = indicators.adx;

            // Basic trend filter
            if (adx < (this.options.adxThreshold || 25)) {
                return signals; // No trend, no signals
            }

            // Entry signals
            if (rsi < (this.options.rsiOversold || 30)) {
                signals.push({
                    type: 'ENTER_LONG',
                    price: state.marketData.lastPrice,
                    confidence: 0.7,
                    indicators: { rsi, adx },
                    metadata: {
                        strategy: this.name,
                        timeframe: 'm15',
                        regime: state.regime
                    }
                });
            }

            if (rsi > (this.options.rsiOverbought || 70)) {
                signals.push({
                    type: 'ENTER_SHORT',
                    price: state.marketData.lastPrice,
                    confidence: 0.7,
                    indicators: { rsi, adx },
                    metadata: {
                        strategy: this.name,
                        timeframe: 'm15',
                        regime: state.regime
                    }
                });
            }

        } catch (error) {
            this.logger.error('Error in AdvancedAdaptiveStrategy:', error);
        }

        return signals;
    }
} 