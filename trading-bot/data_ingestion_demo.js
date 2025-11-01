"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 DATA INGESTION SYSTEM - INTEGRATION TEST & DEMO
 *
 * Test demonstracyjny nowego systemu pobierania danych:
 * ✅ Real-time WebSocket streaming
 * ✅ REST API backup
 * ✅ Kafka integration (optional)
 * ✅ Data validation & quality checks
 * ✅ Circuit breaker & error recovery
 * ✅ Performance metrics
 * ✅ Health monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataIngestionDemo = void 0;
const unified_data_pipeline_1 = require("./core/data/unified_data_pipeline");
const logger_1 = require("./infrastructure/logging/logger");
class DataIngestionDemo {
    constructor() {
        this.startTime = Date.now();
        this.messageCount = 0;
        this.lastPrices = new Map();
        this.logger = new logger_1.Logger();
        this.dataPipeline = (0, unified_data_pipeline_1.createProductionDataPipeline)();
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        // Pipeline lifecycle events
        this.dataPipeline.on('started', () => {
            this.logger.info('🚀 Data Pipeline started successfully');
        });
        this.dataPipeline.on('stopped', () => {
            this.logger.info('🛑 Data Pipeline stopped');
        });
        // Data events
        this.dataPipeline.on('processedMarketData', (data) => {
            this.handleMarketData(data);
        });
        this.dataPipeline.on('processedCandle', ({ symbol, timeframe, candle }) => {
            this.logger.info(`📊 New ${timeframe} candle for ${symbol}: O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close} V:${candle.volume}`);
        });
        // Health monitoring
        this.dataPipeline.on('healthCheck', (health) => {
            if (health.overallHealth < 0.8) {
                this.logger.warn(`⚠️ Data pipeline health low: ${(health.overallHealth * 100).toFixed(1)}%`);
            }
        });
        this.dataPipeline.on('dataError', ({ source, error, errorRate }) => {
            this.logger.error(`❌ Data error from ${source}: ${error.message}, Error rate: ${(errorRate * 100).toFixed(2)}%`);
        });
        this.dataPipeline.on('backupModeActivated', (source) => {
            this.logger.warn(`🔄 Backup mode activated for ${source}`);
        });
        // Metrics
        this.dataPipeline.on('metricsUpdate', (metrics) => {
            this.logger.info(`📊 Pipeline Metrics: ${metrics.totalMessages} messages, ${metrics.throughput.toFixed(2)} msg/s, ${(metrics.errorRate * 100).toFixed(2)}% errors`);
        });
    }
    handleMarketData(data) {
        this.messageCount++;
        // Track price changes
        const lastPrice = this.lastPrices.get(data.symbol);
        const priceChange = lastPrice ? ((data.price - lastPrice) / lastPrice) * 100 : 0;
        this.lastPrices.set(data.symbol, data.price);
        // Log significant price movements
        if (Math.abs(priceChange) > 0.1) { // 0.1% change
            const direction = priceChange > 0 ? '📈' : '📉';
            this.logger.info(`${direction} ${data.symbol}: $${data.price.toFixed(2)} (${priceChange > 0 ? '+' : ''}${priceChange.toFixed(3)}%) | Spread: ${data.spreadsPercent.toFixed(3)}% | Quality: ${(data.dataQuality * 100).toFixed(1)}%`);
        }
        // Periodic summary
        if (this.messageCount % 100 === 0) {
            this.showStatusSummary();
        }
    }
    showStatusSummary() {
        const uptime = Date.now() - this.startTime;
        const uptimeMin = Math.floor(uptime / 60000);
        const avgRate = this.messageCount / (uptime / 1000);
        const health = this.dataPipeline.getDataHealth();
        const allMarketData = this.dataPipeline.getAllMarketData();
        console.log('\n' + '='.repeat(80));
        console.log('📊 DATA INGESTION SYSTEM - STATUS SUMMARY');
        console.log('='.repeat(80));
        console.log(`⏱️  Uptime: ${uptimeMin} minutes`);
        console.log(`📨 Messages processed: ${this.messageCount} (${avgRate.toFixed(2)} msg/s)`);
        console.log(`🏥 Overall health: ${(health.overallHealth * 100).toFixed(1)}%`);
        console.log(`📡 Active sources: ${health.activeDataSources.join(', ')}`);
        console.log(`⚡ Data latency: ${health.dataLatency}ms`);
        console.log(`❌ Error rate: ${(health.errorRate * 100).toFixed(2)}%`);
        console.log(`📊 Symbols tracked: ${allMarketData.length}`);
        if (allMarketData.length > 0) {
            console.log('\n📈 CURRENT MARKET DATA:');
            allMarketData.forEach((data) => {
                console.log(`   ${data.symbol}: $${data.price.toFixed(2)} | Vol: ${data.volume24h.toFixed(0)} | Chg: ${data.change24h.toFixed(2)}% | Quality: ${(data.dataQuality * 100).toFixed(1)}%`);
            });
        }
        console.log('='.repeat(80) + '\n');
    }
    async runDemo() {
        console.log('🧪 DATA INGESTION SYSTEM - INTEGRATION TEST');
        console.log('='.repeat(60));
        console.log('🎯 Testing real-time data streaming with WebSocket + REST backup');
        console.log('📊 Monitoring data quality, latency, and error recovery');
        console.log('🔄 Press Ctrl+C to stop the demo');
        console.log('='.repeat(60) + '\n');
        try {
            // Start the data pipeline
            await this.dataPipeline.start();
            // Show initial status
            setTimeout(() => {
                this.showStatusSummary();
            }, 5000);
            // Periodic status updates
            const statusInterval = setInterval(() => {
                this.showStatusSummary();
            }, 60000); // Every minute
            // Graceful shutdown handler
            process.on('SIGINT', async () => {
                console.log('\n🛑 Graceful shutdown initiated...');
                clearInterval(statusInterval);
                await this.dataPipeline.stop();
                console.log('\n📊 FINAL STATISTICS:');
                console.log(`Total messages processed: ${this.messageCount}`);
                console.log(`Average throughput: ${(this.messageCount / ((Date.now() - this.startTime) / 1000)).toFixed(2)} msg/s`);
                console.log('✅ Demo completed successfully');
                process.exit(0);
            });
            // Keep the demo running
            console.log('✅ Data ingestion system running... (Ctrl+C to stop)');
        }
        catch (error) {
            this.logger.error('❌ Demo failed:', error);
            process.exit(1);
        }
    }
    async testSpecificFeatures() {
        console.log('\n🔬 TESTING SPECIFIC FEATURES...\n');
        try {
            await this.dataPipeline.start();
            // Wait for initial data
            await new Promise(resolve => setTimeout(resolve, 10000));
            // Test 1: Market data retrieval
            console.log('🧪 Test 1: Market Data Retrieval');
            const btcData = this.dataPipeline.getMarketData('BTCUSDT');
            if (btcData) {
                console.log(`✅ BTCUSDT data: $${btcData.price.toFixed(2)}, Quality: ${(btcData.dataQuality * 100).toFixed(1)}%`);
            }
            else {
                console.log('❌ No BTCUSDT data available');
            }
            // Test 2: Candle data retrieval
            console.log('\n🧪 Test 2: Candle Data Retrieval');
            const btcCandles = this.dataPipeline.getCandleData('BTCUSDT', '1m');
            if (btcCandles && btcCandles.length > 0) {
                console.log(`✅ BTCUSDT 1m candles: ${btcCandles.length} available`);
                const lastCandle = btcCandles[btcCandles.length - 1];
                console.log(`   Latest: O:${lastCandle.open} H:${lastCandle.high} L:${lastCandle.low} C:${lastCandle.close}`);
            }
            else {
                console.log('❌ No BTCUSDT candle data available');
            }
            // Test 3: Health status
            console.log('\n🧪 Test 3: Health Status');
            const health = this.dataPipeline.getDataHealth();
            console.log(`✅ Health check: ${(health.overallHealth * 100).toFixed(1)}%`);
            console.log(`   Data engine: ${health.dataEngineHealthy ? '✅' : '❌'}`);
            console.log(`   Kafka: ${health.kafkaHealthy ? '✅' : '❌'}`);
            // Test 4: Data quality metrics
            console.log('\n🧪 Test 4: Data Quality Metrics');
            const allData = this.dataPipeline.getAllMarketData();
            if (allData.length > 0) {
                const avgQuality = allData.reduce((sum, data) => sum + data.dataQuality, 0) / allData.length;
                console.log(`✅ Average data quality: ${(avgQuality * 100).toFixed(1)}%`);
                console.log(`   Symbols with high quality (>90%): ${allData.filter((d) => d.dataQuality > 0.9).length}`);
            }
            console.log('\n✅ Feature tests completed successfully');
            await this.dataPipeline.stop();
        }
        catch (error) {
            console.error('❌ Feature test failed:', error);
        }
    }
}
exports.DataIngestionDemo = DataIngestionDemo;
// Run the demo
async function main() {
    const demo = new DataIngestionDemo();
    // Check if we want to run quick tests or full demo
    const args = process.argv.slice(2);
    if (args.includes('--test')) {
        await demo.testSpecificFeatures();
    }
    else {
        await demo.runDemo();
    }
}
// Execute if run directly
if (require.main === module) {
    main().catch(console.error);
}
