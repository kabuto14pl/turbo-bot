/**
 * 🧪 TEST ML WARMUP - Weryfikacja wymuszonych transakcji BUY/SELL
 */

// Import ML system
import { EnterpriseMLAdapter } from './trading-bot/src/core/ml/enterprise_ml_system';

async function testMLWarmup() {
    console.log('\n🧪 ========== ML WARMUP TEST START ==========\n');

    // 1. Inicjalizacja ML
    console.log('📊 Step 1: Initializing EnterpriseMLAdapter...');
    const mlAdapter = new EnterpriseMLAdapter({
        enabled: true,
        training_mode: true,
        algorithm: 'PPO'
    });

    console.log('✅ EnterpriseMLAdapter initialized\n');

    // 2. Test pierwszych 10 akcji (powinny być BUY/SELL w 90%)
    console.log('📊 Step 2: Testing first 10 ML actions (WARMUP phase)...\n');

    const actions: string[] = [];
    let buyCount = 0;
    let sellCount = 0;
    let holdCount = 0;

    for (let i = 0; i < 10; i++) {
        // Mock market data
        const price = 45000 + (Math.random() - 0.5) * 1000;
        const rsi = 30 + Math.random() * 40; // 30-70 range
        const volume = 1000000 + Math.random() * 500000;

        const action = await mlAdapter.processStep(price, rsi, volume);

        if (action) {
            actions.push(action.action_type);
            console.log(`   Action ${i + 1}: ${action.action_type} (confidence: ${(action.confidence * 100).toFixed(1)}%)`);

            if (action.action_type === 'BUY') buyCount++;
            else if (action.action_type === 'SELL') sellCount++;
            else if (action.action_type === 'HOLD') holdCount++;
        } else {
            console.log(`   Action ${i + 1}: null (ML skipped)`);
            actions.push('null');
        }
    }

    // 3. Analiza wyników
    console.log('\n📊 Step 3: Results Analysis\n');
    console.log(`   BUY actions:  ${buyCount} (${(buyCount / 10 * 100).toFixed(1)}%)`);
    console.log(`   SELL actions: ${sellCount} (${(sellCount / 10 * 100).toFixed(1)}%)`);
    console.log(`   HOLD actions: ${holdCount} (${(holdCount / 10 * 100).toFixed(1)}%)`);
    console.log(`   Total trading actions (BUY+SELL): ${buyCount + sellCount} (${((buyCount + sellCount) / 10 * 100).toFixed(1)}%)`);

    // 4. Weryfikacja progu
    const tradingPercentage = (buyCount + sellCount) / 10;
    console.log('\n📊 Step 4: Verification\n');

    if (tradingPercentage >= 0.8) {
        console.log('   ✅ PASS: ML generates >=80% BUY/SELL actions in WARMUP phase');
    } else if (tradingPercentage >= 0.5) {
        console.log('   ⚠️  WARN: ML generates only ' + (tradingPercentage * 100).toFixed(0) + '% BUY/SELL actions (expected >=80%)');
    } else {
        console.log('   ❌ FAIL: ML generates only ' + (tradingPercentage * 100).toFixed(0) + '% BUY/SELL actions (expected >=80%)');
    }

    // 5. Pobranie performance metrics
    console.log('\n📊 Step 5: ML Performance Metrics\n');
    const performance = mlAdapter.getPerformance();
    console.log('   Episodes:', performance.episodes);
    console.log('   Total Reward:', performance.total_reward.toFixed(4));
    console.log('   Average Reward:', performance.average_reward.toFixed(4));
    console.log('   Exploration Rate:', (performance.exploration_rate * 100).toFixed(1) + '%');

    console.log('\n🧪 ========== ML WARMUP TEST END ==========\n');

    // Return test result
    return tradingPercentage >= 0.8;
}

// Uruchom test
testMLWarmup()
    .then(success => {
        if (success) {
            console.log('🎉 TEST PASSED - ML WARMUP działa poprawnie!');
            process.exit(0);
        } else {
            console.log('❌ TEST FAILED - ML WARMUP nie generuje wystarczająco dużo transakcji');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ TEST ERROR:', error);
        process.exit(1);
    });
