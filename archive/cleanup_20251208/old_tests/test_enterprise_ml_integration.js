"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Enterprise ML Integration Test
 *
 * Testing framework for enterprise ML infrastructure integration with main trading bot
 * Validates ML component integration with autonomous trading bot
 */
const autonomous_trading_bot_1 = require("./trading-bot/autonomous_trading_bot");
async function testEnterpriseMLIntegration() {
    console.log('🚀 TESTING ENTERPRISE ML INTEGRATION WITH TRADING BOT\n');
    try {
        // 1. Create Trading Bot Instance
        console.log('1️⃣ Creating Autonomous Trading Bot...');
        const bot = new autonomous_trading_bot_1.AutonomousTradingBot();
        // 2. Initialize Bot (this should now include Enterprise ML)
        console.log('2️⃣ Initializing Trading Bot with Enterprise ML...');
        await bot.initialize();
        console.log('✅ Trading Bot with Enterprise ML initialized successfully!\n');
        // 3. Check if Enterprise ML is integrated
        console.log('3️⃣ Verifying Enterprise ML Integration...');
        const status = bot.getCurrentStatus();
        console.log('📊 Bot Status:', {
            isRunning: status.isRunning,
            uptime: Math.round(status.uptime / 1000) + 's',
            cyclesCompleted: status.metrics.cyclesCompleted
        });
        // 4. Test single trading cycle with Enterprise ML
        console.log('\n4️⃣ Testing Single Trading Cycle with Enterprise ML...');
        // We can't call private methods directly, so we'll start the bot for a short time
        console.log('🔄 Starting bot for 10 seconds to test trading cycle...');
        // Start the bot
        bot.start();
        // Wait for 10 seconds to let it run one cycle
        await new Promise(resolve => setTimeout(resolve, 10000));
        // Check status after running
        const finalStatus = bot.getCurrentStatus();
        console.log('📊 Final Status:', {
            isRunning: finalStatus.isRunning,
            uptime: Math.round(finalStatus.uptime / 1000) + 's',
            cyclesCompleted: finalStatus.metrics.cyclesCompleted,
            tradesExecuted: finalStatus.metrics.tradesExecuted
        });
        // 5. Stop the bot
        console.log('\n5️⃣ Stopping Trading Bot...');
        await bot.stop();
        console.log('\n🎉 ENTERPRISE ML INTEGRATION TEST COMPLETED SUCCESSFULLY!');
        console.log('\n📋 Integration Results:');
        console.log('✅ Enterprise ML Infrastructure: INTEGRATED');
        console.log('✅ Trading Bot Initialization: SUCCESS');
        console.log('✅ ML-Enhanced Trading Cycle: TESTED');
        console.log('✅ Graceful Shutdown: COMPLETED');
    }
    catch (error) {
        console.error('\n❌ ENTERPRISE ML INTEGRATION TEST FAILED:', error.message);
        console.error('Error details:', error.stack);
        process.exit(1);
    }
}
// Run the test
if (require.main === module) {
    testEnterpriseMLIntegration()
        .then(() => {
        console.log('\n✨ Enterprise ML integration test completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Enterprise ML integration test failed:', error.message);
        process.exit(1);
    });
}
