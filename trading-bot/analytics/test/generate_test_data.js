"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const metrics_server_1 = require("../metrics/metrics_server");
const logger_1 = require("../../infrastructure/logging/logger");
class TestDataGenerator {
    constructor() {
        this.strategies = ['RSITurbo'];
        this.timeframes = ['m15'];
        this.symbols = ['BTCUSDT'];
        this.equity = 100000;
        this.startTime = Date.now();
        this.intervalId = null;
        this.lastUpdateTime = Date.now();
        this.updateCount = 0;
        this.MAX_UPDATES = 10;
        this.isShuttingDown = false;
        this.logger = new logger_1.Logger();
        this.metricsServer = new metrics_server_1.MetricsServer(9090, this.logger);
    }
    start() {
        try {
            this.logger.info('[TestDataGenerator] Initializing quick test...');
            this.metricsServer.start();
            this.intervalId = setInterval(() => {
                if (this.isShuttingDown)
                    return;
                try {
                    this.generateData();
                    this.updateCount++;
                    this.logger.info(`[TestDataGenerator] Generated update ${this.updateCount}/${this.MAX_UPDATES}`);
                    if (this.updateCount >= this.MAX_UPDATES) {
                        this.logger.info('[TestDataGenerator] Reached maximum updates, stopping...');
                        this.stop();
                    }
                }
                catch (error) {
                    this.logger.error(`[TestDataGenerator] Error: ${error}`);
                    this.stop();
                }
            }, 500);
            this.logger.info('[TestDataGenerator] Quick test started');
            // Obsługa sygnałów zakończenia
            process.on('SIGINT', () => this.stop());
            process.on('SIGTERM', () => this.stop());
        }
        catch (error) {
            this.logger.error(`[TestDataGenerator] Error: ${error}`);
            this.stop();
        }
    }
    async stop() {
        if (this.isShuttingDown) {
            return; // Zapobiegaj wielokrotnemu wywołaniu stop()
        }
        this.isShuttingDown = true;
        this.logger.info('[TestDataGenerator] Stopping...');
        try {
            // Zatrzymaj interval
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            // Zatrzymaj serwer metryk
            await new Promise((resolve) => {
                this.metricsServer.stop(() => {
                    this.logger.info('[TestDataGenerator] Metrics server stopped');
                    resolve();
                });
            });
            this.logger.info(`[TestDataGenerator] Test completed. Generated ${this.updateCount} updates`);
            // Zakończ proces po krótkim opóźnieniu, aby dać czas na zapisanie ostatnich logów
            setTimeout(() => {
                process.exit(0);
            }, 100);
        }
        catch (error) {
            this.logger.error(`[TestDataGenerator] Error during shutdown: ${error}`);
            process.exit(1);
        }
    }
    generateData() {
        try {
            const metrics = this.metricsServer.getMetricsExporter();
            // Podstawowe metryki dla jednej strategii
            const strategy = this.strategies[0];
            const timeframe = this.timeframes[0];
            metrics.updateEquity(this.equity, strategy, timeframe);
            metrics.updateDrawdown(Math.random() * 0.1, strategy, timeframe);
            metrics.updatePerformanceRatios(strategy, timeframe, '30d', {
                sharpe: 1.5 + Math.random(),
                sortino: 2.0 + Math.random(),
                calmar: 1.0 + Math.random(),
                winRate: 55 + Math.random() * 10,
                profitFactor: 1.5 + Math.random()
            });
            // Uproszczone metryki ryzyka
            metrics.updateRiskMetrics({
                portfolioRisk: {
                    total: 0.15 + Math.random() * 0.1,
                    leverage: 1.5,
                    concentration: 0.2
                },
                positionRisk: [{
                        strategy,
                        symbol: 'BTCUSDT',
                        type: 'exposure',
                        value: 0.1
                    }],
                correlationMatrix: [],
                var: [
                    { confidence: 0.95, timeframe: 'd1', value: this.equity * 0.02 }
                ]
            });
            // Podstawowe metryki rynkowe
            metrics.updateMarketMetrics(this.symbols[0], {
                volatility: { m15: 0.02 },
                volume: { m15: 5000000 },
                regime: {
                    trend: 0.7,
                    volatility: 0.02,
                    momentum: 0.5
                },
                liquidity: { m15: 0.8 }
            });
        }
        catch (error) {
            this.logger.error(`[TestDataGenerator] Error in generateData: ${error}`);
            throw error;
        }
    }
}
// Uruchom generator
const generator = new TestDataGenerator();
generator.start();
// Obsługa błędów na poziomie procesu
process.on('uncaughtException', (error) => {
    console.error('[CRITICAL] Error:', error);
    generator.stop();
});
process.on('unhandledRejection', (reason) => {
    console.error('[CRITICAL] Rejection:', reason);
    generator.stop();
});
