import { Registry, Gauge, Counter, Histogram } from 'prom-client';
import { Logger } from '../../infrastructure/logging/logger';

export class MetricsExporter {
    private readonly registry: Registry;
    private readonly logger: Logger;

    // Performance Metrics
    private readonly equityCurve: Gauge<string>;
    private readonly drawdown: Gauge<string>;
    private readonly sharpeRatio: Gauge<string>;
    private readonly sortinoRatio: Gauge<string>;
    private readonly calmarRatio: Gauge<string>;
    private readonly winRate: Gauge<string>;
    private readonly profitFactor: Gauge<string>;

    // Strategy Metrics
    private readonly strategyConfidence: Gauge<string>;
    private readonly strategyWeight: Gauge<string>;
    private readonly strategyPnL: Gauge<string>;
    private readonly strategyPositions: Gauge<string>;

    // Risk Metrics
    private readonly portfolioRisk: Gauge<string>;
    private readonly positionRisk: Gauge<string>;
    private readonly correlationMatrix: Gauge<string>;
    private readonly valueAtRisk: Gauge<string>;

    // Market Metrics
    private readonly marketVolatility: Gauge<string>;
    private readonly marketVolume: Gauge<string>;
    private readonly marketRegime: Gauge<string>;
    private readonly liquidityScore: Gauge<string>;

    // Trading Metrics
    private readonly tradeCount: Counter<string>;
    private readonly tradeDuration: Histogram<string>;
    private readonly slippageMetric: Histogram<string>;
    private readonly executionLatency: Histogram<string>;

    constructor(logger: Logger) {
        this.logger = logger;
        this.registry = new Registry();

        // Performance Metrics
        this.equityCurve = new Gauge({
            name: 'trading_equity_curve',
            help: 'Current equity value in base currency',
            labelNames: ['strategy', 'timeframe']
        });

        this.drawdown = new Gauge({
            name: 'trading_drawdown',
            help: 'Current drawdown percentage',
            labelNames: ['strategy', 'timeframe']
        });

        this.sharpeRatio = new Gauge({
            name: 'trading_sharpe_ratio',
            help: 'Rolling Sharpe ratio',
            labelNames: ['strategy', 'timeframe', 'window']
        });

        this.sortinoRatio = new Gauge({
            name: 'trading_sortino_ratio',
            help: 'Rolling Sortino ratio',
            labelNames: ['strategy', 'timeframe', 'window']
        });

        this.calmarRatio = new Gauge({
            name: 'trading_calmar_ratio',
            help: 'Rolling Calmar ratio',
            labelNames: ['strategy', 'timeframe', 'window']
        });

        this.winRate = new Gauge({
            name: 'trading_win_rate',
            help: 'Rolling win rate percentage',
            labelNames: ['strategy', 'timeframe', 'window']
        });

        this.profitFactor = new Gauge({
            name: 'trading_profit_factor',
            help: 'Rolling profit factor',
            labelNames: ['strategy', 'timeframe', 'window']
        });

        // Strategy Metrics
        this.strategyConfidence = new Gauge({
            name: 'strategy_confidence',
            help: 'Current strategy confidence level',
            labelNames: ['strategy', 'signal_type']
        });

        this.strategyWeight = new Gauge({
            name: 'strategy_weight',
            help: 'Current strategy weight in portfolio',
            labelNames: ['strategy']
        });

        this.strategyPnL = new Gauge({
            name: 'strategy_pnl',
            help: 'Strategy P&L in base currency',
            labelNames: ['strategy', 'timeframe']
        });

        this.strategyPositions = new Gauge({
            name: 'strategy_positions',
            help: 'Current number of open positions',
            labelNames: ['strategy', 'direction']
        });

        // Risk Metrics
        this.portfolioRisk = new Gauge({
            name: 'portfolio_risk',
            help: 'Current portfolio risk exposure',
            labelNames: ['type']
        });

        this.positionRisk = new Gauge({
            name: 'position_risk',
            help: 'Individual position risk metrics',
            labelNames: ['strategy', 'symbol', 'type']
        });

        this.correlationMatrix = new Gauge({
            name: 'correlation_matrix',
            help: 'Strategy correlation matrix',
            labelNames: ['strategy1', 'strategy2']
        });

        this.valueAtRisk = new Gauge({
            name: 'value_at_risk',
            help: 'Portfolio Value at Risk',
            labelNames: ['confidence_level', 'timeframe']
        });

        // Market Metrics
        this.marketVolatility = new Gauge({
            name: 'market_volatility',
            help: 'Current market volatility',
            labelNames: ['symbol', 'timeframe']
        });

        this.marketVolume = new Gauge({
            name: 'market_volume',
            help: 'Current market volume',
            labelNames: ['symbol', 'timeframe']
        });

        this.marketRegime = new Gauge({
            name: 'market_regime',
            help: 'Current market regime indicator',
            labelNames: ['symbol', 'regime_type']
        });

        this.liquidityScore = new Gauge({
            name: 'liquidity_score',
            help: 'Market liquidity score',
            labelNames: ['symbol', 'timeframe']
        });

        // Trading Metrics
        this.tradeCount = new Counter({
            name: 'trade_count',
            help: 'Number of executed trades',
            labelNames: ['strategy', 'result']
        });

        this.tradeDuration = new Histogram({
            name: 'trade_duration',
            help: 'Trade duration in seconds',
            labelNames: ['strategy'],
            buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400]
        });

        this.slippageMetric = new Histogram({
            name: 'trade_slippage',
            help: 'Trade execution slippage in basis points',
            labelNames: ['strategy', 'type'],
            buckets: [1, 2, 5, 10, 20, 50, 100]
        });

        this.executionLatency = new Histogram({
            name: 'execution_latency',
            help: 'Trade execution latency in milliseconds',
            labelNames: ['type'],
            buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
        });

        // Register all metrics
        this.registry.registerMetric(this.equityCurve);
        this.registry.registerMetric(this.drawdown);
        this.registry.registerMetric(this.sharpeRatio);
        this.registry.registerMetric(this.sortinoRatio);
        this.registry.registerMetric(this.calmarRatio);
        this.registry.registerMetric(this.winRate);
        this.registry.registerMetric(this.profitFactor);
        this.registry.registerMetric(this.strategyConfidence);
        this.registry.registerMetric(this.strategyWeight);
        this.registry.registerMetric(this.strategyPnL);
        this.registry.registerMetric(this.strategyPositions);
        this.registry.registerMetric(this.portfolioRisk);
        this.registry.registerMetric(this.positionRisk);
        this.registry.registerMetric(this.correlationMatrix);
        this.registry.registerMetric(this.valueAtRisk);
        this.registry.registerMetric(this.marketVolatility);
        this.registry.registerMetric(this.marketVolume);
        this.registry.registerMetric(this.marketRegime);
        this.registry.registerMetric(this.liquidityScore);
        this.registry.registerMetric(this.tradeCount);
        this.registry.registerMetric(this.tradeDuration);
        this.registry.registerMetric(this.slippageMetric);
        this.registry.registerMetric(this.executionLatency);
    }

    // Performance Updates
    updateEquity(value: number, strategy: string, timeframe: string): void {
        this.equityCurve.set({ strategy, timeframe }, value);
    }

    updateDrawdown(value: number, strategy: string, timeframe: string): void {
        this.drawdown.set({ strategy, timeframe }, value);
    }

    updatePerformanceRatios(
        strategy: string,
        timeframe: string,
        window: string,
        ratios: {
            sharpe: number;
            sortino: number;
            calmar: number;
            winRate: number;
            profitFactor: number;
        }
    ): void {
        this.sharpeRatio.set({ strategy, timeframe, window }, ratios.sharpe);
        this.sortinoRatio.set({ strategy, timeframe, window }, ratios.sortino);
        this.calmarRatio.set({ strategy, timeframe, window }, ratios.calmar);
        this.winRate.set({ strategy, timeframe, window }, ratios.winRate);
        this.profitFactor.set({ strategy, timeframe, window }, ratios.profitFactor);
    }

    // Strategy Updates
    updateStrategyMetrics(
        strategy: string,
        metrics: {
            confidence?: number;
            weight?: number;
            pnl?: number;
            positions?: { long: number; short: number };
            signalType?: string;
        }
    ): void {
        if (metrics.confidence !== undefined && metrics.signalType) {
            this.strategyConfidence.set({ strategy, signal_type: metrics.signalType }, metrics.confidence);
        }
        if (metrics.weight !== undefined) {
            this.strategyWeight.set({ strategy }, metrics.weight);
        }
        if (metrics.pnl !== undefined) {
            this.strategyPnL.set({ strategy, timeframe: 'm15' }, metrics.pnl);
        }
        if (metrics.positions) {
            this.strategyPositions.set({ strategy, direction: 'long' }, metrics.positions.long);
            this.strategyPositions.set({ strategy, direction: 'short' }, metrics.positions.short);
        }
    }

    // Risk Updates
    updateRiskMetrics(
        metrics: {
            portfolioRisk?: { [key: string]: number };
            positionRisk?: Array<{ strategy: string; symbol: string; type: string; value: number }>;
            correlationMatrix?: Array<{ strategy1: string; strategy2: string; value: number }>;
            var?: Array<{ confidence: number; timeframe: string; value: number }>;
        }
    ): void {
        if (metrics.portfolioRisk) {
            Object.entries(metrics.portfolioRisk).forEach(([type, value]) => {
                this.portfolioRisk.set({ type }, value);
            });
        }

        if (metrics.positionRisk) {
            metrics.positionRisk.forEach(({ strategy, symbol, type, value }) => {
                this.positionRisk.set({ strategy, symbol, type }, value);
            });
        }

        if (metrics.correlationMatrix) {
            metrics.correlationMatrix.forEach(({ strategy1, strategy2, value }) => {
                this.correlationMatrix.set({ strategy1, strategy2 }, value);
            });
        }

        if (metrics.var) {
            metrics.var.forEach(({ confidence, timeframe, value }) => {
                this.valueAtRisk.set({ confidence_level: confidence.toString(), timeframe }, value);
            });
        }
    }

    // Market Updates
    updateMarketMetrics(
        symbol: string,
        metrics: {
            volatility?: { [timeframe: string]: number };
            volume?: { [timeframe: string]: number };
            regime?: { [type: string]: number };
            liquidity?: { [timeframe: string]: number };
        }
    ): void {
        if (metrics.volatility) {
            Object.entries(metrics.volatility).forEach(([timeframe, value]) => {
                this.marketVolatility.set({ symbol, timeframe }, value);
            });
        }

        if (metrics.volume) {
            Object.entries(metrics.volume).forEach(([timeframe, value]) => {
                this.marketVolume.set({ symbol, timeframe }, value);
            });
        }

        if (metrics.regime) {
            Object.entries(metrics.regime).forEach(([type, value]) => {
                this.marketRegime.set({ symbol, regime_type: type }, value);
            });
        }

        if (metrics.liquidity) {
            Object.entries(metrics.liquidity).forEach(([timeframe, value]) => {
                this.liquidityScore.set({ symbol, timeframe }, value);
            });
        }
    }

    // Trade Updates
    recordTrade(
        strategy: string,
        metrics: {
            result: 'win' | 'loss';
            duration: number;
            slippage: number;
            executionLatency: number;
        }
    ): void {
        this.tradeCount.inc({ strategy, result: metrics.result });
        this.tradeDuration.observe({ strategy }, metrics.duration);
        this.slippageMetric.observe({ strategy, type: 'execution' }, metrics.slippage);
        this.executionLatency.observe({ type: 'trade' }, metrics.executionLatency);
    }

    // Metrics Export
    async getMetrics(): Promise<string> {
        return await this.registry.metrics();
    }
} 