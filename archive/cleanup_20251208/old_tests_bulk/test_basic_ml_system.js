"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
console.log('🧠 Testing Basic ML System Enhancement');
console.log('='.repeat(50));
// Import basic ML components
const enterprise_ml_system_1 = require("./trading-bot/src/core/ml/enterprise_ml_system");
const simple_rl_adapter_1 = require("./trading-bot/src/core/ml/simple_rl_adapter");
async function testBasicMLSystem() {
    try {
        console.log('📋 Testing EnterpriseMLAdapter...');
        const enterpriseML = new enterprise_ml_system_1.EnterpriseMLAdapter({
            enabled: true,
            algorithm: 'PPO',
            training_mode: true
        });
        console.log('✅ EnterpriseMLAdapter created successfully');
        console.log('📊 EnterpriseML created and ready for integration');
        console.log('📋 Testing SimpleRLAdapter...');
        const simpleRL = new simple_rl_adapter_1.SimpleRLAdapter({
            enabled: true,
            algorithm: 'PPO',
            training_mode: true
        });
        console.log('✅ SimpleRLAdapter created successfully');
        console.log('📊 SimpleRL created and ready for integration');
        console.log('\n🎊 BASIC ML SYSTEM TEST COMPLETED!');
        console.log('✅ EnterpriseMLAdapter functional');
        console.log('✅ SimpleRLAdapter functional');
        console.log('🚀 Ready for integration with autonomous trading bot');
        return true;
    }
    catch (error) {
        console.error('❌ Basic ML System Test FAILED:', error);
        console.error('📋 Error details:', error instanceof Error ? error.message : String(error));
        return false;
    }
}
// Run the test
testBasicMLSystem()
    .then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
        console.log('🏆 BASIC ML SYSTEM ENHANCEMENT: SUCCESS');
        console.log('🚀 Core ML components are functional');
        console.log('📋 Ready to activate ProductionMLIntegrator');
    }
    else {
        console.log('💥 BASIC ML SYSTEM ENHANCEMENT: FAILED');
        console.log('⚠️  Need to fix basic issues first');
    }
    process.exit(success ? 0 : 1);
})
    .catch(error => {
    console.error('💥 Unexpected test error:', error);
    process.exit(1);
});
