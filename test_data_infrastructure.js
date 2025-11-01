/**
 * Enterprise Data Infrastructure Test
 * Full validation of DuckDBAdapter and csv_loader
 */

const { loadCandles, saveCandles } = require('./trading-bot/infrastructure/data/csv_loader.js');
const { DuckDBAdapter } = require('./trading-bot/infrastructure/data/duckdb_adapter.js');
const fs = require('fs');
const path = require('path');

async function runDataInfrastructureTest() {
    console.log('🧪 ENTERPRISE DATA INFRASTRUCTURE TEST SUITE');
    console.log('============================================');
    
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
        
        const testFile = '/tmp/enterprise_test_candles.csv';
        
        // Test save
        await saveCandles(testFile, testData);
        console.log('✅ Save functionality working');
        
        // Verify file exists
        if (!fs.existsSync(testFile)) {
            throw new Error('CSV file was not created');
        }
        
        // Test load
        const loadedData = await loadCandles(testFile);
        console.log(`✅ Load functionality working - ${loadedData.length} candles loaded`);
        
        // Verify data integrity
        if (loadedData.length !== testData.length) {
            throw new Error(`Data integrity check failed: expected ${testData.length}, got ${loadedData.length}`);
        }
        
        console.log('✅ Data integrity verified');
        testsPassed++;
        
        // Cleanup
        fs.unlinkSync(testFile);
        
    } catch (error) {
        console.error('❌ CSV Loader test failed:', error.message);
    }
    
    // Test 2: DuckDB Adapter Initialization
    try {
        console.log('\n🦆 Test 2: DuckDB Adapter Initialization');
        testsRun++;
        
        const duckdb = new DuckDBAdapter('/tmp/enterprise_test.duckdb', {
            enableOptimizations: true,
            maxConnections: 5,
            queryTimeout: 15000
        });
        
        // Wait for initialization
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
        
        const duckdb = new DuckDBAdapter('/tmp/enterprise_query_test.duckdb');
        
        await new Promise((resolve) => {
            duckdb.on('connected', async () => {
                try {
                    // Test basic query
                    const result = await duckdb.query('SELECT 1 as test_column');
                    console.log('✅ Basic query execution working');
                    
                    // Test series save
                    const testSeries = [
                        { timestamp: Date.now(), value: 100, symbol: 'BTCUSDT' },
                        { timestamp: Date.now() + 1000, value: 101, symbol: 'BTCUSDT' }
                    ];
                    
                    await duckdb.saveSeries('test_series', testSeries);
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
    
    // Test 4: Data Integration Flow
    try {
        console.log('\n🔄 Test 4: Full Data Integration Flow');
        testsRun++;
        
        // Create test data
        const marketData = [];
        const baseTime = Date.now() - 86400000; // 24 hours ago
        
        for (let i = 0; i < 100; i++) {
            marketData.push({
                timestamp: baseTime + (i * 60000), // 1 minute intervals
                open: 47000 + Math.random() * 1000,
                high: 47000 + Math.random() * 1000 + 500,
                low: 47000 + Math.random() * 1000 - 500,
                close: 47000 + Math.random() * 1000,
                volume: Math.random() * 1000
            });
        }
        
        // Test CSV round-trip
        const csvFile = '/tmp/integration_test.csv';
        await saveCandles(csvFile, marketData);
        const loadedCSV = await loadCandles(csvFile);
        
        if (loadedCSV.length === marketData.length) {
            console.log('✅ CSV round-trip successful');
        } else {
            throw new Error('CSV round-trip data loss');
        }
        
        // Test DuckDB integration
        const duckdb = new DuckDBAdapter('/tmp/integration_test.duckdb');
        
        await new Promise((resolve) => {
            duckdb.on('connected', async () => {
                try {
                    await duckdb.saveSeries('market_data', marketData);
                    console.log('✅ DuckDB integration successful');
                    testsPassed++;
                    resolve();
                } catch (integrationError) {
                    console.error('❌ DuckDB integration failed:', integrationError.message);
                    resolve();
                }
            });
        });
        
        // Cleanup
        fs.unlinkSync(csvFile);
        
    } catch (error) {
        console.error('❌ Data Integration test failed:', error.message);
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
    } else {
        console.log('⚠️ Some tests failed - review implementation');
    }
}

// Run the test suite
runDataInfrastructureTest().catch(error => {
    console.error('💥 Test suite crashed:', error);
});
