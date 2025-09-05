import { Logger } from '../../infrastructure/logging/logger';
import { BotState } from '../types/strategy';

export type MarketRegime = 'trending_bull' | 'trending_bear' | 'ranging_low_vol' | 'ranging_high_vol' | 'MIXED' | 'TRENDING' | 'RANGING';

export type Regime = 'TRENDING' | 'RANGING' | 'MIXED';

interface RegimeConfig {
    adxThreshold: number;
    volatilityThreshold: number;
    trendThreshold: number;
    updateInterval: number;
}

export class MarketRegimeDetector {
    private readonly config: RegimeConfig;
    private readonly logger: Logger;
    private lastUpdate: number = 0;
    private currentRegime: string = 'MIXED';

    constructor(
        config: Partial<RegimeConfig> = {},
        logger: Logger
    ) {
        this.logger = logger;
        this.config = {
            adxThreshold: 25,
            volatilityThreshold: 2.0,
            trendThreshold: 0.02,
            updateInterval: 15 * 60 * 1000,  // 15 min
            ...config
        };
    }

    detectRegime(state: BotState): string {
        // Sprawdź czy potrzebna aktualizacja
        if (state.timestamp - this.lastUpdate < this.config.updateInterval) {
            return this.currentRegime;
        }

        const m15 = state.indicators.m15;
        const h1 = state.indicators.h1;
        const h4 = state.indicators.h4;

        // Oblicz wskaźniki trendu
        const adx = m15.adx || 0;
        const volatility = state.marketData.volatility24h;
        const trendStrength = this.calculateTrendStrength(m15, h1, h4);

        // Określ reżim
        let regime = 'MIXED';

        if (adx > this.config.adxThreshold) {
            if (trendStrength > this.config.trendThreshold) {
                regime = volatility > this.config.volatilityThreshold
                    ? 'STRONG_UPTREND'
                    : 'UPTREND';
            } else if (trendStrength < -this.config.trendThreshold) {
                regime = volatility > this.config.volatilityThreshold
                    ? 'STRONG_DOWNTREND'
                    : 'DOWNTREND';
            }
        } else {
            regime = volatility < this.config.volatilityThreshold
                ? 'RANGING'
                : 'MIXED';
        }

        // Zaloguj zmianę reżimu
        if (regime !== this.currentRegime) {
            this.logger.info('[RegimeDetector] Zmiana reżimu', {
                from: this.currentRegime,
                to: regime,
                indicators: {
                    adx,
                    volatility,
                    trendStrength
                }
            });
        }

        this.currentRegime = regime;
        this.lastUpdate = state.timestamp;

        return regime;
    }

    private calculateTrendStrength(m15: any, h1: any, h4: any): number {
        // Oblicz kierunek trendu na różnych timeframe'ach
        const m15Trend = this.getTrendDirection(m15);
        const h1Trend = this.getTrendDirection(h1);
        const h4Trend = this.getTrendDirection(h4);

        // Oblicz siłę trendu jako ważoną sumę
        return (
            m15Trend * 0.5 +  // Większa waga dla krótszego timeframe'u
            h1Trend * 0.3 +
            h4Trend * 0.2
        );
    }

    private getTrendDirection(indicators: any): number {
        const ema9 = indicators.ema_9 || 0;
        const ema21 = indicators.ema_21 || 0;
        const ema50 = indicators.ema_50 || 0;
        const ema200 = indicators.ema_200 || 0;

        // Oblicz kierunek trendu na podstawie układu średnich
        let direction = 0;

        if (ema9 > ema21) direction += 0.25;
        if (ema21 > ema50) direction += 0.35;
        if (ema50 > ema200) direction += 0.4;

        if (ema9 < ema21) direction -= 0.25;
        if (ema21 < ema50) direction -= 0.35;
        if (ema50 < ema200) direction -= 0.4;

        return direction;
    }
} 