"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Enterprise testing component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * PHASE C.3 - Enterprise Monitoring & Alerting
 * Test Runner for Monitoring System Validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMonitoringTests = runMonitoringTests;
const test_phase_c3_monitoring_1 = require("./test_phase_c3_monitoring");
async function runMonitoringTests() {
    console.log('🚀 Starting Phase C.3 Monitoring System Tests...');
    console.log('='.repeat(60));
    try {
        const testSuite = new test_phase_c3_monitoring_1.MonitoringSystemTestSuite();
        const results = await testSuite.runAllTests();
        console.log('\n✅ Test execution completed successfully');
        console.log(`📊 Test suites executed: ${results.size}`);
        const performanceMetrics = testSuite.getPerformanceMetrics();
        console.log('\n📈 Key Performance Metrics:');
        console.log(`   Alert Response Time: ${performanceMetrics.alertProcessingTime}ms`);
        console.log(`   Metrics Collection: ${performanceMetrics.metricsCollectionLatency}ms`);
        console.log(`   Notification Delivery: ${performanceMetrics.notificationDeliveryTime}ms`);
        return results;
    }
    catch (error) {
        console.error('❌ Test execution failed:', error);
        throw error;
    }
}
// Run tests if this file is executed directly
if (require.main === module) {
    runMonitoringTests()
        .then(() => {
        console.log('\n🎉 All tests completed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Test execution failed:', error);
        process.exit(1);
    });
}
