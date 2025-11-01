"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
const logger_1 = require("../infrastructure/logging/logger");
const meta_strategy_system_1 = require("../core/strategy/meta_strategy_system");
const enhanced_rsi_turbo_1 = require("../core/strategy/enhanced_rsi_turbo");
const ma_crossover_1 = require("../core/strategy/ma_crossover");
const supertrend_1 = require("../core/strategy/supertrend");
const momentum_pro_1 = require("../core/strategy/momentum_pro");
const market_calendar_1 = require("../core/analysis/market_calendar");
const session_manager_1 = require("../core/analysis/session_manager");
const simulate_market_scenarios_1 = require("./simulate_market_scenarios");
async function testScenarios() {
    // Inicjalizacja komponentów
    const logger = new logger_1.Logger();
    const calendar = new market_calendar_1.MarketCalendar({}, logger);
    const sessionManager = new session_manager_1.SessionManager({}, logger);
    // Inicjalizacja strategii
    const strategies = [
        new enhanced_rsi_turbo_1.EnhancedRSITurboStrategy(logger),
        new ma_crossover_1.MACrossoverStrategy(logger),
        new supertrend_1.SuperTrendStrategy(logger),
        new momentum_pro_1.MomentumProStrategy(logger)
    ];
    // Inicjalizacja meta-systemu
    const metaSystem = new meta_strategy_system_1.MetaStrategySystem(strategies, {
        minSignalConfidence: 0.2,
        maxCorrelation: 0.7,
        maxPortfolioAllocation: 0.3,
        rebalanceInterval: 6 * 60 * 60 * 1000,
        useKellyCriterion: true,
        useMetaModel: true
    }, logger);
    // Test Scenariusz 1: Silny trend wzrostowy
    console.log('\n=== SCENARIUSZ 1: SILNY TREND WZROSTOWY ===');
    const upTrendSignals = await metaSystem.run(simulate_market_scenarios_1.STRONG_UPTREND_SCENARIO);
    console.log('Liczba sygnałów:', upTrendSignals.length);
    console.log('Sygnały:', upTrendSignals.map(s => ({
        type: s.type,
        strategy: s.metadata?.strategy,
        confidence: s.confidence,
        size: s.size
    })));
    // Test Scenariusz 2: Konsolidacja
    console.log('\n=== SCENARIUSZ 2: KONSOLIDACJA ===');
    const rangingSignals = await metaSystem.run(simulate_market_scenarios_1.RANGING_SCENARIO);
    console.log('Liczba sygnałów:', rangingSignals.length);
    console.log('Sygnały:', rangingSignals.map(s => ({
        type: s.type,
        strategy: s.metadata?.strategy,
        confidence: s.confidence,
        size: s.size
    })));
    // Test Scenariusz 3: Wysoka zmienność podczas wydarzenia makro
    console.log('\n=== SCENARIUSZ 3: WYSOKA ZMIENNOŚĆ + WYDARZENIE MAKRO ===');
    // Symuluj wydarzenie makro
    const event = {
        timestamp: Date.now(),
        type: 'HIGH',
        name: 'FED Interest Rate Decision',
        description: 'Federal Reserve interest rate announcement',
        impact: ['BTCUSDT'],
        blackoutBefore: 15 * 60 * 1000, // 15 min
        blackoutAfter: 15 * 60 * 1000 // 15 min
    };
    // Dodaj wydarzenie do kalendarza
    await calendar.initialize();
    // Zaktualizuj stan rynku o kalendarz i sesje
    const volatilityState = {
        ...simulate_market_scenarios_1.HIGH_VOLATILITY_SCENARIO,
        marketContext: {
            ...simulate_market_scenarios_1.HIGH_VOLATILITY_SCENARIO.marketContext,
            calendar,
            sessionManager
        }
    };
    const volatilitySignals = await metaSystem.run(volatilityState);
    console.log('Liczba sygnałów:', volatilitySignals.length);
    console.log('Sygnały:', volatilitySignals.map(s => ({
        type: s.type,
        strategy: s.metadata?.strategy,
        confidence: s.confidence,
        size: s.size
    })));
    // Podsumowanie zachowania systemu
    console.log('\n=== PODSUMOWANIE ZACHOWANIA SYSTEMU ===');
    console.log('1. Trend wzrostowy:');
    console.log('   - Liczba sygnałów:', upTrendSignals.length);
    console.log('   - Średnia pewność:', average(upTrendSignals.map(s => s.confidence)));
    console.log('   - Średnia wielkość:', average(upTrendSignals.map(s => s.size || 0)));
    console.log('\n2. Konsolidacja:');
    console.log('   - Liczba sygnałów:', rangingSignals.length);
    console.log('   - Średnia pewność:', average(rangingSignals.map(s => s.confidence)));
    console.log('   - Średnia wielkość:', average(rangingSignals.map(s => s.size || 0)));
    console.log('\n3. Wysoka zmienność:');
    console.log('   - Liczba sygnałów:', volatilitySignals.length);
    console.log('   - Średnia pewność:', average(volatilitySignals.map(s => s.confidence)));
    console.log('   - Średnia wielkość:', average(volatilitySignals.map(s => s.size || 0)));
}
function average(numbers) {
    return numbers.length > 0
        ? numbers.reduce((a, b) => a + b, 0) / numbers.length
        : 0;
}
// Uruchom testy
testScenarios().catch(console.error);
