#!/usr/bin/env ts-node
"use strict";
/**
 * 🚀 FAZA 1-5 ENTERPRISE ML SYSTEM - STANDALONE TEST
 *
 * Kompleksowy test nowego zaawansowanego systemu ML
 * Kompatybilny z SimpleRL API ale z zaawansowanymi funkcjami Enterprise
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEnterpriseMLTest = runEnterpriseMLTest;
const simple_rl_adapter_1 = require("./src/core/ml/simple_rl_adapter");
async function runEnterpriseMLTest() {
    console.log('🚀 ENTERPRISE ML SYSTEM - PRODUCTION TEST');
    console.log('==========================================');
    try {
        // Inicjalizacja Enterprise ML System
        const enterpriseML = new simple_rl_adapter_1.SimpleRLAdapter({
            learning_rate: 0.001,
            gamma: 0.95,
            epsilon: 0.1,
            memory_size: 10000,
            batch_size: 32,
            update_frequency: 100,
            target_update_frequency: 1000
        });
        console.log('✅ Enterprise ML System zainicjalizowany');
        // Test danych rynkowych
        const testMarketData = [
            {
                price: 45000,
                volume: 1250000,
                timestamp: Date.now(),
                indicators: {
                    rsi: 65.5,
                    ema20: 44800,
                    ema50: 43200,
                    macd: 250.5,
                    volatility: 0.025
                }
            },
            {
                price: 45250,
                volume: 1180000,
                timestamp: Date.now() + 60000,
                indicators: {
                    rsi: 68.2,
                    ema20: 44950,
                    ema50: 43350,
                    macd: 275.8,
                    volatility: 0.028
                }
            },
            {
                price: 44800,
                volume: 1350000,
                timestamp: Date.now() + 120000,
                indicators: {
                    rsi: 62.1,
                    ema20: 44750,
                    ema50: 43400,
                    macd: 195.2,
                    volatility: 0.032
                }
            }
        ];
        console.log('📊 Test zaawansowanych predykcji...');
        // Test predykcji dla każdego punktu danych
        for (let i = 0; i < testMarketData.length; i++) {
            const data = testMarketData[i];
            // Konwersja na format state vector
            const state = [
                data.price / 50000, // normalizacja ceny
                data.volume / 2000000, // normalizacja volume
                data.indicators.rsi / 100,
                (data.indicators.ema20 - data.indicators.ema50) / data.price,
                data.indicators.macd / 1000,
                data.indicators.volatility
            ];
            // Predykcja akcji
            const action = await enterpriseML.predict(state);
            console.log(`\n📈 Tick ${i + 1}:`);
            console.log(`   Cena: $${data.price.toLocaleString()}`);
            console.log(`   RSI: ${data.indicators.rsi.toFixed(1)}`);
            console.log(`   Volatility: ${(data.indicators.volatility * 100).toFixed(2)}%`);
            console.log(`   🤖 ML Akcja: ${action} (0=HOLD, 1=BUY, 2=SELL)`);
            // Symulacja feedbacku
            const reward = Math.random() * 0.02 - 0.01; // -1% do +1%
            const nextState = i < testMarketData.length - 1 ?
                [testMarketData[i + 1].price / 50000, testMarketData[i + 1].volume / 2000000] : null;
            if (nextState) {
                await enterpriseML.remember(state, action, reward, nextState, false);
            }
            console.log(`   💰 Reward: ${(reward * 100).toFixed(3)}%`);
        }
        // Test trenowania
        console.log('\n🧠 Test zaawansowanego trenowania...');
        const trainingResult = await enterpriseML.replay();
        console.log(`✅ Trening zakończony. Loss: ${trainingResult || 'N/A'}`);
        // Test zapisywania modelu
        console.log('\n💾 Test zapisywania modelu...');
        await enterpriseML.save('/tmp/enterprise_ml_model');
        console.log('✅ Model zapisany');
        // Test statystyk
        console.log('\n📊 Statystyki Enterprise ML System:');
        const stats = enterpriseML.getStats();
        console.log(`   Akcje wykonane: ${stats.total_actions || 0}`);
        console.log(`   Średni reward: ${stats.average_reward || 0}`);
        console.log(`   Epsilon (eksploracja): ${stats.epsilon || 0}`);
        console.log('\n🎉 ENTERPRISE ML SYSTEM - TEST ZAKOŃCZONY POMYŚLNIE!');
        console.log('================================================');
        return true;
    }
    catch (error) {
        console.error('❌ Błąd podczas testu Enterprise ML:', error);
        return false;
    }
}
// Uruchom test
if (require.main === module) {
    runEnterpriseMLTest()
        .then(success => {
        process.exit(success ? 0 : 1);
    })
        .catch(error => {
        console.error('❌ Krytyczny błąd:', error);
        process.exit(1);
    });
}
