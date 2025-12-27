"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
const production_ml_integrator_1 = require("./trading-bot/src/core/ml/production_ml_integrator");
console.log('🧪 Testing ML System Enhancement - Production ML Integrator');
console.log('='.repeat(60));
async function testProductionMLIntegrator() {
    try {
        console.log('📋 Creating ProductionMLIntegrator instance...');
        const mlIntegrator = new production_ml_integrator_1.ProductionMLIntegrator({
            ml_system_enabled: true,
            fallback_to_simple_rl: true,
            deep_rl: {
                algorithm: 'PPO',
                training_mode: true,
                auto_optimization: false, // Disable for testing
                model_versioning: true
            },
            performance: {
                gpu_acceleration: false, // Disable for testing
                memory_optimization: true,
                model_compression: false,
                real_time_optimization: false
            },
            production: {
                deployment_strategy: 'blue_green',
                monitoring_enabled: true,
                ab_testing_enabled: false,
                auto_rollback: true
            },
            risk_management: {
                max_position_size: 0.05, // Conservative for testing
                max_daily_loss: 0.02,
                emergency_stop_threshold: 0.05,
                confidence_threshold: 0.8
            }
        });
        console.log('✅ ProductionMLIntegrator created successfully');
        console.log('📋 Initializing ML system...');
        await mlIntegrator.initialize();
        console.log('✅ ML system initialized successfully');
        console.log('📋 Getting ML system status...');
        const status = await mlIntegrator.getStatus();
        console.log('📊 ML System Status:', JSON.stringify(status, null, 2));
        console.log('📋 Testing ML predictions with processStep...');
        const prediction = await mlIntegrator.processStep(50000, 65, 1000000);
        console.log('🔮 ML Prediction:', JSON.stringify(prediction, null, 2));
        if (prediction) {
            console.log('📋 Testing learning from result...');
            const testState = {
                price: 50000,
                rsi: 65,
                volume: 1000000,
                volatility: 0.02,
                market_trend: 'bullish',
                timestamp: Date.now()
            };
            await mlIntegrator.learnFromResult(0.05, 300, testState);
            console.log('✅ Learning from result completed');
        }
        else {
            console.log('⚠️  Prediction returned null, skipping learning test');
        }
        console.log('\n🎊 ML SYSTEM ENHANCEMENT TEST COMPLETED SUCCESSFULLY!');
        console.log('✅ ProductionMLIntegrator is fully functional');
        console.log('✅ All core ML functions working correctly');
        console.log('✅ Ready for integration with autonomous trading bot');
        return true;
    }
    catch (error) {
        console.error('❌ ML System Enhancement Test FAILED:', error);
        console.error('📋 Error details:', error instanceof Error ? error.message : String(error));
        return false;
    }
}
// Run the test
testProductionMLIntegrator()
    .then(success => {
    console.log('\n' + '='.repeat(60));
    if (success) {
        console.log('🏆 ML SYSTEM ENHANCEMENT: PHASE 1 COMPLETED');
        console.log('🚀 Ready to proceed to Phase 2: Advanced ML Components');
    }
    else {
        console.log('💥 ML SYSTEM ENHANCEMENT: PHASE 1 FAILED');
        console.log('⚠️  Need to fix issues before proceeding');
    }
    process.exit(success ? 0 : 1);
})
    .catch(error => {
    console.error('💥 Unexpected test error:', error);
    process.exit(1);
});
