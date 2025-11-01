/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { AbstractStrategy } from './abstract_strategy';
import { TradeSignal } from '../types/trade_signal';
import { BotState } from '../types/bot_state';
import { MarketRegimeDetector } from '../analysis/market_regime_detector';
import { Logger } from '../../infrastructure/logging/logger';

export interface AdvancedAdaptiveStrategyOptions {
    // Podstawowe parametry
    rsiPeriod?: number;
    rsiOversold?: number;
    rsiOverbought?: number;
    emaShortPeriod?: number;
    emaLongPeriod?: number;
    adxPeriod?: number;
    atrPeriod?: number;
    atrMultiplier?: number;
}

export class AdvancedAdaptiveStrategy { // DISABLED - has compilation errors
    private options: AdvancedAdaptiveStrategyOptions;
    private marketRegimeDetector: MarketRegimeDetector;
    private logger: Logger;

    constructor(options: AdvancedAdaptiveStrategyOptions, logger?: Logger) {
        this.logger = logger || new Logger();
        this.marketRegimeDetector = new MarketRegimeDetector({}, this.logger);
        this.options = {
            rsiPeriod: options.rsiPeriod || 14,
            rsiOversold: options.rsiOversold || 30,
            rsiOverbought: options.rsiOverbought || 70,
            emaShortPeriod: options.emaShortPeriod || 50,
            emaLongPeriod: options.emaLongPeriod || 200,
            adxPeriod: options.adxPeriod || 14,
            atrPeriod: options.atrPeriod || 14,
            atrMultiplier: options.atrMultiplier || 2
        };
    }

    run(state: BotState): TradeSignal[] {
        const signals: TradeSignal[] = [];
        
        // Pobierz wskaźniki z 15-minutowego interwału
        const indicators = state.indicators.m15;
        if (!indicators) {
            this.logger.warn('[AdvancedAdaptive] Brak wskaźników m15');
            return signals;
        }

        const { rsi, ema_50, ema_200, adx, atr } = indicators;
        const currentPrice = state.prices.m15.close;
        
        if (!currentPrice || !rsi || !ema_50 || !ema_200 || !adx || !atr) {
            this.logger.warn('[AdvancedAdaptive] Brak wymaganych wskaźników');
            return signals;
        }

        // Generuj sygnały na podstawie wskaźników
        if (rsi < this.options.rsiOversold! && currentPrice > ema_200 && adx > 25) {
            signals.push({
                type: 'ENTER_LONG',
                orderRequest: {
                    symbol: state.marketContext?.symbol || 'BTCUSDT',
                    side: 'buy',
                    type: 'market',
                    size: 1
                },
                reason: 'RSI oversold with strong trend'
            });
        }
        else if (rsi > this.options.rsiOverbought! && currentPrice < ema_200 && adx > 25) {
            signals.push({
                type: 'ENTER_SHORT',
                orderRequest: {
                    symbol: state.marketContext?.symbol || 'BTCUSDT',
                    side: 'sell',
                    type: 'market',
                    size: 1
                },
                reason: 'RSI overbought with strong downtrend'
            });
        }

        return signals;
    }
} 