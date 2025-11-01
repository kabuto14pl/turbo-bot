/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
import { Logger } from '../infrastructure/logging/logger';
import { MetaStrategySystem } from '../core/strategy/meta_strategy_system';
import { EnhancedRSITurboStrategy } from '../core/strategy/enhanced_rsi_turbo';
import { MACrossoverStrategy } from '../core/strategy/ma_crossover';
import { SuperTrendStrategy } from '../core/strategy/supertrend';
import { MomentumProStrategy } from '../core/strategy/momentum_pro';
import { MarketCalendar } from '../core/analysis/market_calendar';
import { SessionManager } from '../core/analysis/session_manager';
import {
    STRONG_UPTREND_SCENARIO,
    RANGING_SCENARIO,
    HIGH_VOLATILITY_SCENARIO
} from './simulate_market_scenarios';

async function testScenarios() {
    // Inicjalizacja komponentów
    const logger = new Logger();
    const calendar = new MarketCalendar({}, logger);
    const sessionManager = new SessionManager({}, logger);

    // Inicjalizacja strategii
    const strategies = [
        new EnhancedRSITurboStrategy(logger),
        new MACrossoverStrategy(logger),
        new SuperTrendStrategy(logger),
        new MomentumProStrategy(logger)
    ];

    // Inicjalizacja meta-systemu
    const metaSystem = new MetaStrategySystem(
        strategies,
        {
            minSignalConfidence: 0.2,
            maxCorrelation: 0.7,
            maxPortfolioAllocation: 0.3,
            rebalanceInterval: 6 * 60 * 60 * 1000,
            useKellyCriterion: true,
            useMetaModel: true
        },
        logger
    );

    // Test Scenariusz 1: Silny trend wzrostowy
    console.log('\n=== SCENARIUSZ 1: SILNY TREND WZROSTOWY ===');
    const upTrendSignals = await metaSystem.run(STRONG_UPTREND_SCENARIO);
    console.log('Liczba sygnałów:', upTrendSignals.length);
    console.log('Sygnały:', upTrendSignals.map(s => ({
        type: s.type,
        strategy: s.metadata?.strategy,
        confidence: s.confidence,
        size: s.size
    })));

    // Test Scenariusz 2: Konsolidacja
    console.log('\n=== SCENARIUSZ 2: KONSOLIDACJA ===');
    const rangingSignals = await metaSystem.run(RANGING_SCENARIO);
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
        blackoutBefore: 15 * 60 * 1000,  // 15 min
        blackoutAfter: 15 * 60 * 1000    // 15 min
    };

    // Dodaj wydarzenie do kalendarza
    await calendar.initialize();
    
    // Zaktualizuj stan rynku o kalendarz i sesje
    const volatilityState = {
        ...HIGH_VOLATILITY_SCENARIO,
        marketContext: {
            ...HIGH_VOLATILITY_SCENARIO.marketContext,
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

function average(numbers: number[]): number {
    return numbers.length > 0
        ? numbers.reduce((a, b) => a + b, 0) / numbers.length
        : 0;
}

// Uruchom testy
testScenarios().catch(console.error); 