/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Portfolio } from './index';
import * as fs from 'fs';
import * as path from 'path';

export interface RollingMetric {
    timestamp: number;
    value: number;
}

export interface PortfolioStats {
    totalPnL: number;
    totalReturnPct: number;
    maxDrawdown: number;
    rollingNAV: RollingMetric[];
    rollingExposure: RollingMetric[];
    rollingDrawdown: RollingMetric[];
    sharpe?: number;
    sortino?: number;
    volatility?: number;
    rollingSharpe?: RollingMetric[];
    rollingSortino?: RollingMetric[];
    rollingVolatility?: RollingMetric[];
    correlations?: Record<string, number>;
    calmar?: number;
    rollingCalmar?: RollingMetric[];
}

export class PortfolioAnalytics {
    private portfolio: Portfolio;
    private navHistory: { timestamp: number, nav: number }[];

    constructor(portfolio: Portfolio) {
        this.portfolio = portfolio;
        this.navHistory = portfolio.getNavHistory();
    }

    getNavHistory(): { timestamp: number, nav: number }[] {
        return this.navHistory;
    }

    getRollingNAV(): RollingMetric[] {
        return this.navHistory.map(({ timestamp, nav }) => ({ timestamp, value: nav }));
    }

    getRollingDrawdown(): RollingMetric[] {
        let peak = -Infinity;
        return this.navHistory.map(({ timestamp, nav }) => {
            if (nav > peak) peak = nav;
            const drawdown = peak > 0 ? (nav - peak) / peak : 0;
            return { timestamp, value: drawdown };
        });
    }

    /**
     * Liczy rolling exposure (wymaga mapy: timestamp -> { [symbol]: price })
     */
    getRollingExposure(priceMap: Record<number, Record<string, number>>): RollingMetric[] {
        return this.navHistory.map(({ timestamp }) => {
            const prices = priceMap[timestamp] || {};
            const exposure = this.portfolio.getTotalExposure(prices);
            return { timestamp, value: exposure };
        });
    }

    /**
     * Liczy rolling zwroty (log returns)
     */
    getRollingReturns(): RollingMetric[] {
        const navs = this.navHistory;
        const result: RollingMetric[] = [];
        for (let i = 1; i < navs.length; ++i) {
            const prev = navs[i - 1].nav;
            const curr = navs[i].nav;
            const ret = prev > 0 ? Math.log(curr / prev) : 0;
            result.push({ timestamp: navs[i].timestamp, value: ret });
        }
        return result;
    }

    /**
     * Liczy rolling volatility (np. 20-okresowa stddev zwrotów)
     */
    getRollingVolatility(window: number = 20): RollingMetric[] {
        const returns = this.getRollingReturns();
        const result: RollingMetric[] = [];
        for (let i = window - 1; i < returns.length; ++i) {
            const slice = returns.slice(i - window + 1, i + 1).map(x => x.value);
            const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
            const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
            result.push({ timestamp: returns[i].timestamp, value: Math.sqrt(variance) });
        }
        return result;
    }

    /**
     * Liczy rolling Sharpe ratio (np. 20-okresowy, annualizowany, rf=0)
     */
    getRollingSharpe(window: number = 20, periodsPerYear: number = 252): RollingMetric[] {
        const returns = this.getRollingReturns();
        const result: RollingMetric[] = [];
        for (let i = window - 1; i < returns.length; ++i) {
            const slice = returns.slice(i - window + 1, i + 1).map(x => x.value);
            const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
            const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length);
            const sharpe = std > 0 ? (mean * periodsPerYear) / (std * Math.sqrt(periodsPerYear)) : 0;
            result.push({ timestamp: returns[i].timestamp, value: sharpe });
        }
        return result;
    }

    /**
     * Liczy rolling Sortino ratio (np. 20-okresowy, annualizowany, rf=0)
     */
    getRollingSortino(window: number = 20, periodsPerYear: number = 252): RollingMetric[] {
        const returns = this.getRollingReturns();
        const result: RollingMetric[] = [];
        for (let i = window - 1; i < returns.length; ++i) {
            const slice = returns.slice(i - window + 1, i + 1).map(x => x.value);
            const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
            const downside = slice.filter(x => x < 0);
            const downsideDev = downside.length > 0 ? Math.sqrt(downside.reduce((a, b) => a + b ** 2, 0) / downside.length) : 0.0001;
            const sortino = (mean * periodsPerYear) / (downsideDev * Math.sqrt(periodsPerYear));
            result.push({ timestamp: returns[i].timestamp, value: sortino });
        }
        return result;
    }

    /**
     * Liczy rolling Calmar Ratio (rolling CAGR / rolling max drawdown)
     * window - długość okna rolling (np. 50, 252)
     * periodsPerYear - liczba okresów w roku (np. 252 dla dziennych, 365 dla dziennych, 96*365/7 dla 15m)
     */
    getRollingCalmar(window: number = 50, periodsPerYear: number = 252): RollingMetric[] {
        const navs = this.navHistory;
        const result: RollingMetric[] = [];
        for (let i = window - 1; i < navs.length; ++i) {
            const slice = navs.slice(i - window + 1, i + 1);
            const startNav = slice[0].nav;
            const endNav = slice[slice.length - 1].nav;
            const years = window / periodsPerYear;
            const cagr = startNav > 0 && years > 0 ? Math.pow(endNav / startNav, 1 / years) - 1 : 0;
            // Rolling max drawdown w oknie
            let peak = -Infinity;
            let maxDd = 0;
            for (const { nav } of slice) {
                if (nav > peak) peak = nav;
                const dd = peak > 0 ? (nav - peak) / peak : 0;
                if (dd < maxDd) maxDd = dd;
            }
            const calmar = maxDd !== 0 ? cagr / Math.abs(maxDd) : 0;
            result.push({ timestamp: slice[slice.length - 1].timestamp, value: calmar });
        }
        return result;
    }

    /**
     * Liczy Calmar Ratio dla całego okresu (CAGR / |max drawdown|)
     */
    getCalmarRatio(periodsPerYear: number = 252): number {
        const navs = this.navHistory;
        if (navs.length < 2) return 0;
        const startNav = navs[0].nav;
        const endNav = navs[navs.length - 1].nav;
        const years = (navs.length - 1) / periodsPerYear;
        const cagr = startNav > 0 && years > 0 ? Math.pow(endNav / startNav, 1 / years) - 1 : 0;
        // Max drawdown
        let peak = -Infinity;
        let maxDd = 0;
        for (const { nav } of navs) {
            if (nav > peak) peak = nav;
            const dd = peak > 0 ? (nav - peak) / peak : 0;
            if (dd < maxDd) maxDd = dd;
        }
        return maxDd !== 0 ? cagr / Math.abs(maxDd) : 0;
    }

    /**
     * Liczy rolling korelacje Pearsona dla wszystkich par strategii/portfeli.
     * @param returnsMap - mapa {nazwaStrategii: RollingMetric[]} (rolling returns każdej strategii)
     * @param window - długość okna rolling
     * @returns mapa {pair: RollingMetric[]} (np. 'RSITurbo|SuperTrend': [{timestamp, value}, ...])
     */
    static getRollingCorrelations(
        returnsMap: Record<string, RollingMetric[]>,
        window: number = 20
    ): Record<string, RollingMetric[]> {
        // 1. Zbierz wspólne timestampy (występujące we wszystkich strategiach)
        const allTimestamps = Object.values(returnsMap)
            .map(arr => arr.map(x => x.timestamp))
            .reduce((a, b) => a.filter(ts => b.includes(ts)));
        // 2. Dla każdej strategii: mapa timestamp -> value
        const valueMaps: Record<string, Record<number, number>> = {};
        for (const strat in returnsMap) {
            valueMaps[strat] = {};
            for (const { timestamp, value } of returnsMap[strat]) {
                valueMaps[strat][timestamp] = value;
            }
        }
        // 3. Dla każdej pary strategii licz rolling korelację
        const strategies = Object.keys(returnsMap);
        const result: Record<string, RollingMetric[]> = {};
        for (let i = 0; i < strategies.length; ++i) {
            for (let j = i + 1; j < strategies.length; ++j) {
                const a = strategies[i];
                const b = strategies[j];
                const pair = `${a}|${b}`;
                result[pair] = [];
                // Rolling window po wspólnych timestampach
                for (let k = window - 1; k < allTimestamps.length; ++k) {
                    const windowTimestamps = allTimestamps.slice(k - window + 1, k + 1);
                    const seriesA = windowTimestamps.map(ts => valueMaps[a][ts]);
                    const seriesB = windowTimestamps.map(ts => valueMaps[b][ts]);
                    if (seriesA.some(v => v === undefined) || seriesB.some(v => v === undefined)) continue;
                    const meanA = seriesA.reduce((s, v) => s + v, 0) / window;
                    const meanB = seriesB.reduce((s, v) => s + v, 0) / window;
                    const cov = seriesA.reduce((s, v, idx) => s + (v - meanA) * (seriesB[idx] - meanB), 0) / window;
                    const stdA = Math.sqrt(seriesA.reduce((s, v) => s + (v - meanA) ** 2, 0) / window);
                    const stdB = Math.sqrt(seriesB.reduce((s, v) => s + (v - meanB) ** 2, 0) / window);
                    const corr = stdA > 0 && stdB > 0 ? cov / (stdA * stdB) : 0;
                    result[pair].push({ timestamp: windowTimestamps[window - 1], value: corr });
                }
            }
        }
        return result;
    }

    /**
     * Liczy rolling Value at Risk (VaR) na podstawie rolling log-returns.
     * window - długość okna rolling (np. 250)
     * quantile - poziom kwantyla (np. 0.05 dla 95% VaR)
     * Zwraca ujemny kwantyl (maksymalna strata z danego poziomu ufności)
     */
    getRollingVaR(window: number = 250, quantile: number = 0.05): RollingMetric[] {
        const returns = this.getRollingReturns();
        const result: RollingMetric[] = [];
        for (let i = window - 1; i < returns.length; ++i) {
            const slice = returns.slice(i - window + 1, i + 1).map(x => x.value);
            // Sortuj rosnąco (największe straty na początku)
            const sorted = [...slice].sort((a, b) => a - b);
            const idx = Math.floor(quantile * sorted.length);
            const varValue = -sorted[idx]; // Ujemny kwantyl (strata)
            result.push({ timestamp: returns[i].timestamp, value: varValue });
        }
        return result;
    }

    /**
     * Liczy podstawowe statystyki portfela
     */
    getStats(): PortfolioStats {
        const rollingNAV = this.getRollingNAV();
        const rollingDrawdown = this.getRollingDrawdown();
        const navs = rollingNAV.map(x => x.value);
        const totalPnL = navs.length > 0 ? navs[navs.length - 1] - navs[0] : 0;
        const totalReturnPct = navs.length > 0 && navs[0] > 0 ? (navs[navs.length - 1] - navs[0]) / navs[0] * 100 : 0;
        const maxDrawdown = Math.min(...rollingDrawdown.map(x => x.value));
        const rollingVolatility = this.getRollingVolatility();
        const rollingSharpe = this.getRollingSharpe();
        const rollingSortino = this.getRollingSortino();
        const rollingCalmar = this.getRollingCalmar();
        const sharpe = rollingSharpe.length > 0 ? rollingSharpe[rollingSharpe.length - 1].value : undefined;
        const sortino = rollingSortino.length > 0 ? rollingSortino[rollingSortino.length - 1].value : undefined;
        const volatility = rollingVolatility.length > 0 ? rollingVolatility[rollingVolatility.length - 1].value : undefined;
        const calmar = this.getCalmarRatio();
        return {
            totalPnL,
            totalReturnPct,
            maxDrawdown,
            rollingNAV,
            rollingExposure: [], // Użytkownik może podać priceMap do getRollingExposure
            rollingDrawdown,
            sharpe,
            sortino,
            volatility,
            rollingSharpe,
            rollingSortino,
            rollingVolatility,
            calmar,
            rollingCalmar,
        };
    }

    /**
     * Eksportuje rolling Calmar Ratio do pliku CSV
     */
    exportRollingCalmarToCSV(outputPath: string, window: number = 50, periodsPerYear: number = 252) {
        const rollingCalmar = this.getRollingCalmar(window, periodsPerYear);
        const lines = ['timestamp,rolling_calmar'];
        for (const { timestamp, value } of rollingCalmar) {
            lines.push(`${timestamp},${value}`);
        }
        fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
    }

    /**
     * Eksportuje rolling VaR do pliku CSV
     */
    exportRollingVaRToCSV(outputPath: string, window: number = 250, quantile: number = 0.05) {
        const rollingVaR = this.getRollingVaR(window, quantile);
        const lines = ['timestamp,rolling_var'];
        for (const { timestamp, value } of rollingVaR) {
            lines.push(`${timestamp},${value}`);
        }
        fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
    }

    // TODO: korelacje między strategiami (wymaga multi-portfolio)
} 