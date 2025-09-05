import { BaseStrategy } from './base_strategy';
import { BotState, StrategySignal } from '../types/strategy';
import { Logger } from '../../infrastructure/logging/logger';

export class EnhancedRSITurboStrategySentiment extends BaseStrategy {
    private previousRsi: number | null = null;

    constructor(logger: Logger) {
        super(
            'RSITurboSentiment',
            'Sentiment-Enhanced RSI Turbo Strategy',
            0.25,
            {
                name: 'RSITurboSentiment',
                timeframes: ['m15', 'h1', 'h4'],
                indicators: {
                    rsi: {
                        period: 14,
                        overbought: 66,
                        oversold: 29
                    },
                    atr: {
                        period: 14,
                        multiplier: 2.4
                    }
                },
                riskManagement: {
                    maxPositionSize: 0.1,
                    riskPerTrade: 0.02,
                    maxDrawdown: 0.15,
                    stopLossAtrMultiplier: 2.4,
                    takeProfitAtrMultiplier: 4.8
                }
            },
            logger
        );
    }

    async run(state: BotState): Promise<StrategySignal[]> {
        // Use the correct BotState structure
        const currentPrice = state.prices.m15;
        const indicators = state.indicators.m15;
        
        if (!indicators?.rsi || !indicators?.atr) {
            return [];
        }

        const rsi = indicators.rsi;
        const atr = indicators.atr;
        const price = currentPrice.close;
        
        // RSI-based signal logic
        const signals: StrategySignal[] = [];

        const oversold = 29; // Fixed values for simplicity
        const overbought = 66;
        const atrMultiplier = 2.4;

        if (rsi < oversold) {
            // Oversold - potential buy signal
            signals.push({
                type: 'ENTER_LONG',
                price: price,
                confidence: Math.min(0.9, (oversold - rsi) / 10),
                stopLoss: price - (atr * atrMultiplier),
                takeProfit: price + (atr * atrMultiplier * 2),
                indicators: {
                    rsi: rsi,
                    atr: atr,
                    signal_strength: (oversold - rsi) / 10
                }
            });
        } else if (rsi > overbought) {
            // Overbought - potential sell signal
            signals.push({
                type: 'ENTER_SHORT',
                price: price,
                confidence: Math.min(0.9, (rsi - overbought) / 10),
                stopLoss: price + (atr * atrMultiplier),
                takeProfit: price - (atr * atrMultiplier * 2),
                indicators: {
                    rsi: rsi,
                    atr: atr,
                    signal_strength: (rsi - overbought) / 10
                }
            });
        }

        this.previousRsi = rsi;
        return signals;
    }
}
