"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🧪 [TESTING-FRAMEWORK]
 **
 * 🧪 [TESTING-FRAMEWORK]
 * Simplified Enterprise ML System Test
 */
const enterprise_ml_performance_monitor_1 = require("./src/enterprise_ml_performance_monitor");
const enterprise_feature_engineering_1 = require("./src/enterprise_feature_engineering");
async function simpleMLTest() {
    console.log('🚀 Testing Enterprise ML Components...\n');
    try {
        // Test Performance Monitor
        console.log('1️⃣ Testing Performance Monitor...');
        const monitor = enterprise_ml_performance_monitor_1.EnterpriseMLPerformanceMonitor.getInstance();
        const inferenceUid = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await monitor.startInferenceTracking(inferenceUid);
        console.log('✅ Inference tracking started:', inferenceUid);
        // Test Feature Engineering
        console.log('\n2️⃣ Testing Feature Engineering...');
        const featureEngine = enterprise_feature_engineering_1.EnterpriseFeatureEngineering.getInstance();
        const mockData = {
            timestamp: Date.now(),
            open: 50000,
            high: 50500,
            low: 49800,
            close: 50200,
            volume: 1234567
        };
        const features = await featureEngine.extractFeatures([mockData]);
        console.log('✅ Features extracted:', Object.keys(features.normalized).length, 'features');
        // End performance tracking
        await monitor.endInferenceTracking(inferenceUid, [0.75], [0.85], [[1.0, 2.0, 3.0]], 'TestModel');
        console.log('✅ Performance tracking completed');
        console.log('\n🎉 ALL BASIC TESTS PASSED!');
        console.log('✅ Performance Monitor: OPERATIONAL');
        console.log('✅ Feature Engineering: OPERATIONAL');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    simpleMLTest().catch(console.error);
}
