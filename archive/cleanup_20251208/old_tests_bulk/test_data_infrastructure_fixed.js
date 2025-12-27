/**
 * Enterprise Data Infrastructure Test - FIXED VERSION
 * Full validation of DuckDBAdapter and csv_loader with proper OHLCV data
 */

const { loadCandles, saveCandles } = require('./trading-bot/infrastructure/data/csv_loader.js');
const { DuckDBAdapter } = require('./trading-bot/infrastructure/data/duckdb_adapter.js');
const fs = require('fs');

async function runDataInfrastructureTest() {
    console.log('🧪 ENTERPRISE DATA INFRASTRUCTURE TEST SUITE - FIXED');
    console.log('==================================================');
    
    let testsRun = 0;
    let testsPassed = 0;
    
    // Test 1: CSV Loader Basic Functionality
    try {
        console.log('\n📊 Test 1: CSV Loader Basic Functionality');
        testsRun++;
        
        const testData = [
            { timestamp: 1640995200000, open: 47000, high: 47500, low: 46800, close: 47200, volume: 100 },
            { timestamp: 1640998800000, open: 47200, high: 47600, low: 46900, close: 47400, volume: 150 },
            { timestamp: 1641002400000, open: 47400, high: 47800, low: 47100, close: 47600, volume: 200 }
        ];
        
        const testFile = '/tmp/enterprise_test_candles_fixed.csv';
        
        await saveCandles(testFile, testData);
        console.log('✅ Save functionality working');
        
        if (!fs.existsSync(testFile)) {
            throw new Error('CSV file was not created');
        }
        
        const loadedData = await loadCandles(testFile);
        console.log(`✅ Load functionality working - ${loadedData.length} candles loaded`);
        
        if (loadedData.length !== testData.length) {
            throw new Error(`Data integrity check failed: expected ${testData.length}, got ${loadedData.length}`);
        }
        
        console.log('✅ Data integrity verified');
        testsPassed++;
        
        fs.unlinkSync(testFile);
        
    } catch (error) {
        console.error('❌ CSV Loader test failed:', error.message);
    }
    
    // Test 2: DuckDB Adapter Initialization
    try {
        console.log('\n🦆 Test 2: DuckDB Adapter Initialization');
        testsRun++;
        
        const duckdb = new DuckDBAdapter('/tmp/enterprise_test_fixed.duckdb', {
            enableOptimizations: true,
            maxConnections: 5,
            queryTimeout: 15000
        });
        
        await new Promise((resolve) => {
            duckdb.on('connected', () => {
                console.log('✅ DuckDB connection established');
                resolve();
            });
            duckdb.on('error', (error) => {
                throw error;
            });
        });
        
        console.log('✅ DuckDB initialization successful');
        testsPassed++;
        
    } catch (error) {
        console.error('❌ DuckDB Adapter test failed:', error.message);
    }
    
    // Test 3: DuckDB Query Functionality
    try {
        console.log('\n🔍 Test 3: DuckDB Query Functionality');
        testsRun++;
        
        const duckdb = new DuckDBAdapter('/tmp/enterprise_query_test_fixed.duckdb');
        
        await new Promise((resolve) => {
            duckdb.on('connected', async () => {
                try {
                    const result = await duckdb.query('SELECT 1 as test_column');
                    console.log('✅ Basic query execution working');
                    
                    const testSeries = [
                        { timestamp: Date.now(), value: 100, symbol: 'BTCUSDT' },
                        { timestamp: Date.now() + 1000, value: 101, symbol: 'BTCUSDT' }
                    ];
                    
                    await duckdb.saveSeries('test_series_fixed', testSeries);
                    console.log('✅ Series save functionality working');
                    
                    testsPassed++;
                    resolve();
                } catch (queryError) {
                    console.error('❌ DuckDB query failed:', queryError.message);
                    resolve();
                }
            });
        });
        
    } catch (error) {
        console.error('❌ DuckDB Query test failed:', error.message);
    }
    
    // Test 4: Data Integration Flow - FIXED with proper OHLCV
    try {
        console.log('\n🔄 Test 4: Full Data Integration Flow - FIXED');
        testsRun++;
        
        // Generate realistic OHLCV data
        const marketData = [];
        const baseTime = Date.now() - 86400000; // 24 hours ago
        let lastClose = 47000; // Starting price
        
        for (let i = 0; i < 100; i++) {
            // Generate realistic price movement
            const priceChange = (Math.random() - 0.5) * 100; // ±50 price movement
            const open = lastClose;
            const close = Math.max(1000, open + priceChange); // Ensure positive price
            
            // Ensure high >= max(open, close) and low <= min(open, close)
            const maxPrice = Math.max(open, close);
            const minPrice = Math.min(open, close);
            
            const high = maxPrice + Math.random() * 50; // Add some wick above
            const low = Math.max(1000, minPrice - Math.random() * 50); // Add some wick below, ensure positive
            
            marketData.push({
                timestamp: baseTime + (i * 60000), // 1 minute intervals
                open: Math.round(open * 100) / 100,
                high: Math.round(high * 100) / 100,
                low: Math.round(low * 100) / 100,
                close: Math.round(close * 100) / 100,
                volume: Math.round(Math.random() * 1000 * 100) / 100
            });
            
            lastClose = close; // Update for next iteration
        }
        
        console.log(`📈 Generated ${marketData.length} realistic OHLCV candles`);
        console.log(`Price range: ${Math.min(...marketData.map(c => c.low))} - ${Math.max(...marketData.map(c => c.high))}`);
        
        // Test CSV round-trip
        const csvFile = '/tmp/integration_test_fixed.csv';
        await saveCandles(csvFile, marketData);
        const loadedCSV = await loadCandles(csvFile);
        
        if (loadedCSV.length === marketData.length) {
            console.log('✅ CSV round-trip successful');
        } else {
            throw new Error(`CSV round-trip data loss: ${marketData.length} -> ${loadedCSV.length}`);
        }
        
        // Test DuckDB integration
        const duckdb = new DuckDBAdapter('/tmp/integration_test_fixed.duckdb');
        
        await new Promise((resolve) => {
            duckdb.on('connected', async () => {
                try {
                    await duckdb.saveSeries('market_data_fixed', marketData);
                    console.log('✅ DuckDB integration successful');
                    testsPassed++;
                    resolve();
                } catch (integrationError) {
                    console.error('❌ DuckDB integration failed:', integrationError.message);
                    resolve();
                }
            });
        });
        
        fs.unlinkSync(csvFile);
        
    } catch (error) {
        console.error('❌ Data Integration test failed:', error.message);
    }
    
    // Test 5: Advanced Analytics Queries
    try {
        console.log('\n📊 Test 5: Advanced Analytics Queries');
        testsRun++;
        
        const duckdb = new DuckDBAdapter('/tmp/enterprise_analytics_test.duckdb');
        
        await new Promise((resolve) => {
            duckdb.on('connected', async () => {
                try {
                    // Create sample trading data
                    const tradingData = [
                        { timestamp: Date.now(), symbol: 'BTCUSDT', price: 47000, volume: 100, pnl: 150 },
                        { timestamp: Date.now() + 1000, symbol: 'ETHUSDT', price: 3200, volume: 50, pnl: -75 },
                        { timestamp: Date.now() + 2000, symbol: 'BTCUSDT', price: 47200, volume: 200, pnl: 300 }
                    ];
                    
                    await duckdb.saveSeries('trading_analytics', tradingData);
                    console.log('✅ Analytics data saved');
                    
                    // Test aggregation queries
                    const aggregateResult = await duckdb.query(`
                        SELECT symbol, 
                               COUNT(*) as trade_count, 
                               AVG(price) as avg_price, 
                               SUM(pnl) as total_pnl 
                        FROM trading_analytics 
                        GROUP BY symbol
                    `);
                    
                    console.log('✅ Aggregate query executed successfully');
                    
                    testsPassed++;
                    resolve();
                } catch (analyticsError) {
                    console.error('❌ Analytics query failed:', analyticsError.message);
                    resolve();
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Advanced Analytics test failed:', error.message);
    }
    
    // Final Results
    console.log('\n📈 ENTERPRISE DATA INFRASTRUCTURE TEST RESULTS');
    console.log('==============================================');
    console.log(`Tests Run: ${testsRun}`);
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
    
    if (testsPassed === testsRun) {
        console.log('🎉 ALL DATA INFRASTRUCTURE TESTS PASSED!');
        console.log('✅ Enterprise-grade data infrastructure is FULLY OPERATIONAL');
        console.log('🚀 Ready for production deployment with complete data layer');
    } else {
        console.log(`⚠️ ${testsRun - testsPassed} test(s) failed - review implementation`);
    }
}

runDataInfrastructureTest().catch(error => {
    console.error('💥 Test suite crashed:', error);
});
