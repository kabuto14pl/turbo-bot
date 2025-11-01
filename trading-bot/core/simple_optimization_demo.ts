/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🎯 UPROSZCZONA DEMONSTRACJA ALGORYTMÓW OPTYMALIZACJI
 */

import { HyperparameterSpaceManager, ParameterType } from './hyperparameter_space';
import { 
    SimpleOptimizationManager, 
    SimpleObjectiveFunction, 
    SimpleOptimizationResult 
} from './simple_optimization';

/**
 * Funkcje celu do testowania
 */
class TestObjectives {
    
    /**
     * Funkcja Sphere - minimum w (0, 0)
     */
    static sphere(params: any): number {
        let sum = 0;
        for (const key in params) {
            if (typeof params[key] === 'number') {
                sum += params[key] * params[key];
            }
        }
        return -sum; // Negacja bo maksymalizujemy
    }
    
    /**
     * Symulowana funkcja RSI
     */
    static rsiStrategy(params: any): number {
        const period = params.rsi_period || 14;
        const oversold = params.oversold_threshold || 30;
        const overbought = params.overbought_threshold || 70;
        const positionSize = params.position_size || 0.1;
        
        let score = 0;
        
        // Preferuj okres 10-20
        score -= Math.abs(period - 15) * 0.01;
        
        // Preferuj asymetryczne progi  
        score += Math.max(0, (35 - oversold) * 0.02);
        score += Math.max(0, (overbought - 65) * 0.02);
        
        // Preferuj większy spread
        const spread = overbought - oversold;
        score += Math.max(0, (spread - 30) * 0.01);
        
        // Kara za zbyt duży rozmiar pozycji
        score -= Math.max(0, (positionSize - 0.3) * 2);
        
        // Szum
        score += (Math.random() - 0.5) * 0.1;
        
        return score;
    }
    
    /**
     * Symulowana funkcja MA Crossover
     */
    static maCrossover(params: any): number {
        const fastPeriod = params.fast_period || 10;
        const slowPeriod = params.slow_period || 20;
        const positionSize = params.position_size || 0.1;
        const stopLoss = params.stop_loss || 0.02;
        const takeProfit = params.take_profit || 0.04;
        
        let score = 0;
        
        // Preferuj stosunek 1:2 do 1:4
        const ratio = slowPeriod / fastPeriod;
        score -= Math.abs(ratio - 2.5) * 0.1;
        
        // Risk/Reward
        if (stopLoss > 0) {
            const rrRatio = takeProfit / stopLoss;
            score += Math.max(0, (rrRatio - 1.5) * 0.5);
        }
        
        // Rozmiar pozycji
        if (positionSize > 0.05 && positionSize < 0.5) {
            score += 0.2;
        }
        
        return score + (Math.random() - 0.5) * 0.05;
    }
}

/**
 * Główna demonstracja
 */
async function main(): Promise<void> {
    console.log('🚀 === DEMONSTRACJA ALGORYTMÓW OPTYMALIZACJI ===\n');

    const spaceManager = new HyperparameterSpaceManager();
    const optimizationManager = new SimpleOptimizationManager(spaceManager);

    // Test 1: Funkcja Sphere
    console.log('📊 1. TEST FUNKCJI SPHERE');
    console.log('   Cel: Znaleźć minimum funkcji x² + y²\n');

    // Stwórz przestrzeń 2D
    const sphereSpace = {
        name: 'sphere_test',
        description: 'Przestrzeń 2D dla funkcji Sphere',
        strategyType: 'TestFunction',
        version: '1.0.0',
        parameters: [
            {
                name: 'x',
                type: ParameterType.FLOAT,
                min: -5,
                max: 5,
                description: 'Współrzędna X'
            },
            {
                name: 'y',
                type: ParameterType.FLOAT,
                min: -5,
                max: 5,
                description: 'Współrzędna Y'
            }
        ],
        constraints: []
    };
    
    spaceManager.createSpace(sphereSpace);

    const sphereResult = await optimizationManager.optimize(
        'genetic',
        'sphere_test',
        TestObjectives.sphere,
        100
    );

    console.log(`✅ Wynik Sphere (Genetic):`);
    console.log(`   🎯 Najlepszy wynik: ${sphereResult.bestScore.toFixed(4)}`);
    console.log(`   ⏱️  Czas: ${sphereResult.executionTime}ms`);
    const x = sphereResult.bestParameters.x || 0;
    const y = sphereResult.bestParameters.y || 0;
    const distance = Math.sqrt(x*x + y*y);
    console.log(`   📍 Parametry: x=${x.toFixed(3)}, y=${y.toFixed(3)}`);
    console.log(`   📏 Odległość od optimum: ${distance.toFixed(4)}\n`);

    // Test 2: Strategia RSI
    console.log('📈 2. TEST STRATEGII RSI');
    
    const rsiResult = await optimizationManager.optimize(
        'annealing',
        'rsi_strategy',
        TestObjectives.rsiStrategy,
        150
    );

    console.log(`✅ Wynik RSI (Simulated Annealing):`);
    console.log(`   🎯 Najlepszy wynik: ${rsiResult.bestScore.toFixed(4)}`);
    console.log(`   ⏱️  Czas: ${rsiResult.executionTime}ms`);
    console.log(`   📊 Parametry RSI:`);
    console.log(`      Okres: ${rsiResult.bestParameters.rsi_period || 'N/A'}`);
    console.log(`      Wyprzedanie: ${rsiResult.bestParameters.oversold_threshold?.toFixed(1) || 'N/A'}`);
    console.log(`      Wykupienie: ${rsiResult.bestParameters.overbought_threshold?.toFixed(1) || 'N/A'}`);
    console.log(`      Rozmiar pozycji: ${((rsiResult.bestParameters.position_size || 0) * 100).toFixed(1)}%\n`);

    // Test 3: Strategia MA Crossover
    console.log('📊 3. TEST STRATEGII MA CROSSOVER');
    
    const maResult = await optimizationManager.optimize(
        'random',
        'ma_crossover',
        TestObjectives.maCrossover,
        120
    );

    console.log(`✅ Wynik MA Crossover (Random Search):`);
    console.log(`   🎯 Najlepszy wynik: ${maResult.bestScore.toFixed(4)}`);
    console.log(`   ⏱️  Czas: ${maResult.executionTime}ms`);
    console.log(`   📊 Parametry MA:`);
    console.log(`      Szybka MA: ${maResult.bestParameters.fast_period || 'N/A'}`);
    console.log(`      Wolna MA: ${maResult.bestParameters.slow_period || 'N/A'}`);
    console.log(`      Typ: ${maResult.bestParameters.ma_type || 'N/A'}`);
    console.log(`      Stop Loss: ${((maResult.bestParameters.stop_loss || 0) * 100).toFixed(2)}%`);
    console.log(`      Take Profit: ${((maResult.bestParameters.take_profit || 0) * 100).toFixed(2)}%\n`);

    // Test 4: Porównanie algorytmów
    console.log('🏁 4. PORÓWNANIE ALGORYTMÓW');
    console.log('   Strategia: RSI z 80 iteracjami na algorytm\n');

    const comparison = await optimizationManager.compareAlgorithms(
        'rsi_strategy',
        TestObjectives.rsiStrategy,
        80
    );

    console.log('\n📊 SZCZEGÓŁOWE PORÓWNANIE:');
    console.log('─'.repeat(70));
    console.log('Algorytm'.padEnd(15) + 'Wynik'.padEnd(15) + 'Czas [ms]'.padEnd(15) + 'Iteracje');
    console.log('─'.repeat(70));

    for (const [algorithm, result] of Object.entries(comparison)) {
        const score = result.bestScore.toFixed(4);
        const time = result.executionTime.toString();
        const iterations = result.totalIterations.toString();
        
        console.log(
            algorithm.padEnd(15) + 
            score.padEnd(15) + 
            time.padEnd(15) + 
            iterations
        );
    }
    
    console.log('─'.repeat(70));
    
    // Znajdź najlepszy algorytm
    const bestAlgorithm = Object.entries(comparison).reduce((best, [alg, result]) => 
        result.bestScore > best[1].bestScore ? [alg, result] : best
    );
    
    console.log(`🏆 ZWYCIĘZCA: ${bestAlgorithm[0].toUpperCase()}`);
    console.log(`   Wynik: ${bestAlgorithm[1].bestScore.toFixed(4)}`);
    console.log(`   Czas: ${bestAlgorithm[1].executionTime}ms`);
    
    console.log('\n🎉 === DEMONSTRACJA ZAKOŃCZONA ===');
}

// Uruchom demonstrację
if (require.main === module) {
    main().catch(console.error);
}
