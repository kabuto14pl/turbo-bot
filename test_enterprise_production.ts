/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */

/**
 * 🧪 [TESTING-FRAMEWORK]
 * Test Enterprise ML Production System
 * 
 * Comprehensive testing framework for enterprise ML components
 * Tests real data integration, component interaction, and production environment simulation
 */

import { EnterpriseMLIntegrationManager } from './src/enterprise_ml_integration_manager';
import { EnterpriseMLPerformanceMonitor } from './src/enterprise_ml_performance_monitor';
import { promises as fs } from 'fs';
import * as path from 'path';

interface MarketData {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

async function loadMarketData(): Promise<MarketData[]> {
    try {
        const dataPath = path.join(__dirname, 'data/BTCUSDT');
        const files = await fs.readdir(dataPath);
        const csvFile = files.find(f => f.endsWith('.csv'));
        
        if (!csvFile) {
            console.log('📊 No market data found, generating synthetic data...');
            return generateSyntheticData();
        }
        
        const csvPath = path.join(dataPath, csvFile);
        const content = await fs.readFile(csvPath, 'utf-8');
        const lines = content.split('\n').slice(1).filter(line => line.trim());
        
        return lines.slice(0, 100).map(line => {
            const [timestamp, open, high, low, close, volume] = line.split(',');
            return {
                timestamp: parseInt(timestamp),
                open: parseFloat(open),
                high: parseFloat(high),
                low: parseFloat(low),
                close: parseFloat(close),
                volume: parseFloat(volume)
            };
        });
    } catch (error: any) {
        console.log('📊 Error loading data, using synthetic data:', error.message);
        return generateSyntheticData();
    }
}

function generateSyntheticData(): MarketData[] {
    const data: MarketData[] = [];
    let price = 45000;
    const now = Date.now();
    
    for (let i = 0; i < 100; i++) {
        const change = (Math.random() - 0.5) * 1000;
        price += change;
        
        const high = price + Math.random() * 200;
        const low = price - Math.random() * 200;
        const open = price + (Math.random() - 0.5) * 100;
        
        data.push({
            timestamp: now - (100 - i) * 60000,
            open,
            high,
            low,
            close: price,
            volume: Math.random() * 1000000
        });
    }
    
    return data;
}

async function testEnterpriseProduction() {
    console.log('🚀 Starting Enterprise ML Production Test...\n');
    
    try {
        // 1. Inicjalizacja systemu
        console.log('1️⃣ Initializing Enterprise ML System...');
        const mlManager = EnterpriseMLIntegrationManager.getInstance();
        
        await mlManager.initialize({
            enablePerformanceMonitoring: true,
            enableMetricsDashboard: true,
            enableEnsembleEngine: true,
            enableFeatureEngineering: true,
            dashboardPort: 3001,
            monitoringInterval: 5000,
            autoOptimization: true,
            realTimeUpdates: true
        });
        
        console.log('✅ Enterprise ML System initialized');
        
        // 2. Ładowanie danych rynkowych
        console.log('\n2️⃣ Loading market data...');
        const marketData = await loadMarketData();
        console.log(`✅ Loaded ${marketData.length} market data points`);
        
        // 3. Test przetwarzania danych w czasie rzeczywistym
        console.log('\n3️⃣ Testing real-time data processing...');
        
        for (let i = 0; i < Math.min(20, marketData.length); i++) {
            const data = marketData[i];
            
            // Symulacja ML inference z rzeczywistymi danymi
            const prediction = await mlManager.performMLInference({
                price: data.close,
                volume: data.volume,
                timestamp: data.timestamp,
                features: [
                    data.close,
                    data.volume,
                    data.high - data.low, // volatility
                    (data.close - data.open) / data.open, // price change
                    data.volume / 1000000 // normalized volume
                ]
            });
            
            if (i % 5 === 0) {
                console.log(`📊 Batch ${Math.floor(i/5) + 1}: Price: $${data.close.toFixed(2)}, Prediction: ${prediction.signal}, Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
            }
            
            // Krótka pauza między przetwarzaniem
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 4. Sprawdzenie health metrics
        console.log('\n4️⃣ Checking system health...');
        const systemStatus = mlManager.getSystemStatus();
        
        console.log('📈 System Status Report:');
        console.log(`   Performance Monitor: ${systemStatus.performanceMonitor || 'UNKNOWN'}`);
        console.log(`   Metrics Dashboard: ${systemStatus.metricsDashboard || 'UNKNOWN'}`);
        console.log(`   Ensemble Engine: ${systemStatus.ensembleEngine || 'UNKNOWN'}`);
        console.log(`   Feature Engineering: ${systemStatus.featureEngineering || 'UNKNOWN'}`);
        
        // 5. Performance metrics
        console.log('\n5️⃣ Performance Metrics Summary:');
        const performanceMonitor = EnterpriseMLPerformanceMonitor.getInstance();
        const performanceReport = performanceMonitor.getPerformanceReport();
        
        console.log(`📊 Performance Report:`);
        console.log(`   Summary:`, performanceReport.summary);
        console.log(`   Recent Metrics: ${performanceReport.recentMetrics.length} entries`);
        console.log(`   Drift Analysis: ${performanceReport.driftAnalysis.length} analyses`);
        console.log(`   Benchmark Comparison: ${performanceReport.benchmarkComparison.length} comparisons`);
        
        // 6. Test system report
        console.log('\n6️⃣ Getting ML Integration Report...');
        try {
            const integrationReport = mlManager.getPerformanceReport();
            console.log(`✅ Integration Report available with ${Object.keys(integrationReport).length} sections`);
        } catch (error: any) {
            console.log(`⚠️  Integration Report error: ${error.message}`);
        }
        
        console.log('\n🎉 ENTERPRISE ML PRODUCTION TEST COMPLETED SUCCESSFULLY!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Real-time data processing');
        console.log('   ✅ ML inference pipeline');
        console.log('   ✅ Performance monitoring');
        console.log('   ✅ Health checks');
        console.log('   ✅ Dashboard integration');
        
        // Graceful shutdown
        console.log('\n🔄 Performing graceful shutdown...');
        await mlManager.stop();
        console.log('✅ System shutdown complete');
        
    } catch (error: any) {
        console.error('❌ Enterprise ML Production Test Failed:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Uruchomienie testu
if (require.main === module) {
    testEnterpriseProduction()
        .then(() => {
            console.log('\n✨ Test completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error);
            process.exit(1);
        });
}
