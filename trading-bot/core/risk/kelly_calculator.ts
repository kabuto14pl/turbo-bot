import { StrategySignal, BotState } from '../types/strategy';
import { Logger } from '../../infrastructure/logging/logger';

interface KellyConfig {
    minWinRate: number;
    maxLeverage: number;
    fractionMultiplier: number;
    useAdaptiveKelly: boolean;
    historicalWindow: number;
}

export class KellyCalculator {
    private readonly config: KellyConfig;
    private readonly logger: Logger;
    private readonly tradeHistory: Map<string, {
        timestamp: number;
        pnl: number;
        risk: number;
    }[]>;

    constructor(
        config: Partial<KellyConfig> = {},
        logger: Logger
    ) {
        this.logger = logger;
        this.config = {
            minWinRate: 0.4,         // Minimalny wymagany winrate
            maxLeverage: 3,          // Maksymalny lewar
            fractionMultiplier: 0.5, // Połowa sugerowanej frakcji Kelly
            useAdaptiveKelly: true,  // Adaptacyjne dostosowanie
            historicalWindow: 100,    // Liczba ostatnich transakcji do analizy
            ...config
        };
        this.tradeHistory = new Map();
    }

    calculateSize(
        signal: StrategySignal,
        state: BotState,
        atr: number
    ): number {
        // Oblicz podstawowe parametry Kelly
        const { winRate, avgWin, avgLoss } = this.calculateHistoricalStats(
            signal.metadata?.strategy || 'unknown'
        );

        // Jeśli brak wystarczających danych historycznych, użyj parametrów sygnału
        const effectiveWinRate = winRate || this.estimateWinRate(signal);
        const effectiveAvgWin = avgWin || this.estimateAvgWin(signal, atr);
        const effectiveAvgLoss = avgLoss || this.estimateAvgLoss(signal, atr);

        // Sprawdź minimalny wymagany winrate
        if (effectiveWinRate < this.config.minWinRate) {
            this.logger.info('[Kelly] Zbyt niski winrate', {
                strategy: signal.metadata?.strategy,
                winRate: effectiveWinRate,
                required: this.config.minWinRate
            });
            return 0;
        }

        // Oblicz frakcję Kelly
        const kellyFraction = this.calculateKellyFraction(
            effectiveWinRate,
            effectiveAvgWin,
            effectiveAvgLoss
        );

        // Dostosuj frakcję
        const adjustedFraction = this.adjustKellyFraction(
            kellyFraction,
            signal,
            state
        );

        // Oblicz wielkość pozycji
        const positionSize = this.calculatePositionSize(
            adjustedFraction,
            state.equity,
            signal.price,
            atr
        );

        this.logger.info('[Kelly] Obliczona wielkość pozycji', {
            strategy: signal.metadata?.strategy,
            kellyFraction,
            adjustedFraction,
            positionSize,
            stats: {
                winRate: effectiveWinRate,
                avgWin: effectiveAvgWin,
                avgLoss: effectiveAvgLoss
            }
        });

        return positionSize;
    }

    addTradeResult(
        strategy: string,
        pnl: number,
        risk: number
    ): void {
        if (!this.tradeHistory.has(strategy)) {
            this.tradeHistory.set(strategy, []);
        }

        const history = this.tradeHistory.get(strategy)!;
        history.push({
            timestamp: Date.now(),
            pnl,
            risk
        });

        // Zachowaj tylko ostatnie N transakcji
        while (history.length > this.config.historicalWindow) {
            history.shift();
        }
    }

    private calculateHistoricalStats(
        strategy: string
    ): { winRate: number; avgWin: number; avgLoss: number } {
        const history = this.tradeHistory.get(strategy);
        if (!history || history.length < 10) {
            return { winRate: 0, avgWin: 0, avgLoss: 0 };
        }

        const wins = history.filter(trade => trade.pnl > 0);
        const losses = history.filter(trade => trade.pnl < 0);

        const winRate = wins.length / history.length;
        const avgWin = wins.reduce((sum, trade) => sum + trade.pnl, 0) / wins.length;
        const avgLoss = Math.abs(
            losses.reduce((sum, trade) => sum + trade.pnl, 0) / losses.length
        );

        return { winRate, avgWin, avgLoss };
    }

    private estimateWinRate(signal: StrategySignal): number {
        // Estymuj winrate na podstawie pewności sygnału
        return 0.5 + (signal.confidence * 0.3); // 50-80% w zależności od confidence
    }

    private estimateAvgWin(signal: StrategySignal, atr: number): number {
        // Estymuj średni zysk jako 2-3 ATR
        return atr * (2 + signal.confidence);
    }

    private estimateAvgLoss(signal: StrategySignal, atr: number): number {
        // Estymuj średnią stratę jako 1-1.5 ATR
        return atr * (1 + signal.confidence * 0.5);
    }

    private calculateKellyFraction(
        winRate: number,
        avgWin: number,
        avgLoss: number
    ): number {
        // Klasyczna formuła Kelly
        return (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
    }

    private adjustKellyFraction(
        kellyFraction: number,
        signal: StrategySignal,
        state: BotState
    ): number {
        let adjustedFraction = kellyFraction;

        // Zastosuj mnożnik frakcji
        adjustedFraction *= this.config.fractionMultiplier;

        if (this.config.useAdaptiveKelly) {
            // Dostosuj do zmienności rynku
            const volatility = state.indicators.m15.atr || 0;
            const volatilityAdjustment = Math.exp(-volatility);
            adjustedFraction *= volatilityAdjustment;

            // Dostosuj do reżimu rynkowego
            if (state.regime.regime === 'range') {
                adjustedFraction *= 0.8; // Zmniejsz pozycje w konsolidacji
            }
        }

        // Ogranicz maksymalny lewar
        return Math.min(adjustedFraction, 1 / this.config.maxLeverage);
    }

    private calculatePositionSize(
        fraction: number,
        equity: number,
        price: number,
        atr: number
    ): number {
        // Oblicz wielkość pozycji w jednostkach bazowych
        const riskAmount = equity * fraction;
        const stopDistance = atr * 2; // 2 ATR jako domyślny stop-loss
        return (riskAmount / stopDistance) * price;
    }
} 