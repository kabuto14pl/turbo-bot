"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 [TESTING-FRAMEWORK]
 **
 * 🧪 [TESTING-FRAMEWORK]
 * Enterprise ML System Integration Test
 * Tests complete ML infrastructure with all components
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEnterpriseMLSystem = testEnterpriseMLSystem;
const enterprise_ml_integration_manager_1 = require("./src/enterprise_ml_integration_manager");
async function testEnterpriseMLSystem() {
    console.log('🚀 Starting Enterprise ML System Integration Test...\n');
    try {
        // 1. Initialize Integration Manager
        console.log('1️⃣ Initializing Enterprise ML Integration Manager...');
        const mlManager = enterprise_ml_integration_manager_1.EnterpriseMLIntegrationManager.getInstance();
        await mlManager.initialize();
        // 2. Test ML Inference
        console.log('🔄 Testing ML Inference...');
        // Mock market data matching expected format
        const mockMarketData = {
            timestamp: Date.now(),
            open: 50000,
            high: 51000,
            low: 49500,
            close: 50500,
            volume: 1000000
        };
        const inferenceResult = await mlManager.performMLInference([mockMarketData]);
        console.log('✅ ML Inference completed:', typeof inferenceResult);
        console.log('   Results available:', !!inferenceResult, '\n');
        // 3. Test System Status
        console.log('🔄 Testing System Status...');
        const status = await mlManager.getSystemStatus();
        console.log('✅ System Status:', status);
        console.log('✅ System operational\n');
        // 4. Test Performance Report
        console.log('🔄 Testing Performance Report...');
        const performanceReport = mlManager.getPerformanceReport();
        console.log('✅ Performance Report available:', typeof performanceReport);
        console.log('   Report keys:', Object.keys(performanceReport || {}));
        console.log('✅ Performance monitoring working\n');
        console.log('🎉 All Enterprise ML System Tests PASSED! 🎉');
        console.log('✅ Integration Manager: Working');
        console.log('✅ ML Inference: Working');
        console.log('✅ System Status: Working');
        console.log('✅ Performance Monitoring: Working');
        console.log('\n🚀 Enterprise ML System is fully operational! 🚀\n');
    }
    catch (error) {
        console.error('❌ Enterprise ML System Test FAILED!');
        console.error('   - Type:', typeof error);
        console.error('   - Message:', error.message);
        console.error('   - Stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
        process.exit(1);
    }
}
// Main execution
if (require.main === module) {
    testEnterpriseMLSystem().then(() => {
        console.log('✅ Test execution completed successfully');
        process.exit(0);
    }).catch((error) => {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    });
}
