const { loadCandles, saveCandles } = require('./trading-bot/infrastructure/data/csv_loader.js');
const fs = require('fs');

async function debugCSVLoader() {
    console.log('🔍 CSV LOADER DEBUG SESSION');
    console.log('============================');
    
    // Create test data with controlled values
    const testData = [
        { timestamp: 1640995200000, open: 47000, high: 47500, low: 46800, close: 47200, volume: 100 },
        { timestamp: 1640998800000, open: 47200, high: 47600, low: 46900, close: 47400, volume: 150 },
        { timestamp: 1641002400000, open: 47400, high: 47800, low: 47100, close: 47600, volume: 200 }
    ];
    
    console.log('\n📊 Original test data:', testData.length, 'candles');
    console.log('Sample:', JSON.stringify(testData[0]));
    
    const testFile = '/tmp/debug_test.csv';
    
    // Test save
    await saveCandles(testFile, testData);
    console.log('\n✅ Saved to CSV');
    
    // Check file content
    const fileContent = fs.readFileSync(testFile, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    console.log('\n📄 CSV file lines:', lines.length);
    console.log('Header:', lines[0]);
    console.log('First data line:', lines[1]);
    console.log('Last data line:', lines[lines.length - 1]);
    
    // Test load
    const loadedData = await loadCandles(testFile);
    console.log('\n📈 Loaded data:', loadedData.length, 'candles');
    
    if (loadedData.length > 0) {
        console.log('First loaded:', JSON.stringify(loadedData[0]));
        console.log('Last loaded:', JSON.stringify(loadedData[loadedData.length - 1]));
    }
    
    // Compare data
    console.log('\n🔍 Data comparison:');
    console.log(`Original: ${testData.length} candles`);
    console.log(`Loaded: ${loadedData.length} candles`);
    console.log(`Difference: ${testData.length - loadedData.length}`);
    
    // Test with problematic random data
    console.log('\n🎲 Testing with random data generation...');
    
    const randomData = [];
    const baseTime = Date.now() - 86400000;
    
    for (let i = 0; i < 10; i++) {
        const base = 47000;
        const variation = Math.random() * 1000;
        const high = base + variation + 500;
        const low = base + variation - 500;
        const open = base + variation;
        const close = base + variation;
        
        randomData.push({
            timestamp: baseTime + (i * 60000),
            open: Math.max(0, open),
            high: Math.max(0, high),
            low: Math.max(0, low),
            close: Math.max(0, close),
            volume: Math.random() * 1000
        });
    }
    
    console.log('Random data generated:', randomData.length);
    console.log('Sample random candle:', JSON.stringify(randomData[0]));
    
    const randomFile = '/tmp/debug_random.csv';
    await saveCandles(randomFile, randomData);
    const loadedRandom = await loadCandles(randomFile);
    
    console.log('Random data round-trip:');
    console.log(`Original: ${randomData.length} -> Loaded: ${loadedRandom.length}`);
    
    // Cleanup
    fs.unlinkSync(testFile);
    fs.unlinkSync(randomFile);
}

debugCSVLoader().catch(console.error);
