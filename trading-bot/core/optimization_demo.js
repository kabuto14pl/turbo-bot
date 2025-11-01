"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🎯 DEMONSTRACJA ALGORYTMÓW OPTYMALIZACJI
 *
 * Test wszystkich algorytmów optymalizacji z syntetycznymi funkcjami celu
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizationDemo = void 0;
const hyperparameter_space_1 = require("./hyperparameter_space");
const optimization_algorithms_1 = require("./optimization_algorithms");
/**
 * Funkcje celu do testowania algorytmów
 */
class ObjectiveFunctions {
    /**
     * Funkcja Rosenbrock - klasyczny benchmark optymalizacji
     * Ma globalne minimum w (1, 1) z wartością 0
     */
    static rosenbrock(params) {
        const x = params.x || 0;
        const y = params.y || 0;
        const result = -(100 * Math.pow(y - x * x, 2) + Math.pow(1 - x, 2));
        return result; // Negacja bo maksymalizujemy
    }
    /**
     * Funkcja Sphere - prosta funkcja kwadratowa
     * Ma globalne minimum w (0, 0, ..., 0)
     */
    static sphere(params) {
        let sum = 0;
        for (const key in params) {
            if (typeof params[key] === 'number') {
                sum += params[key] * params[key];
            }
        }
        return -sum; // Negacja bo maksymalizujemy
    }
    /**
     * Symulowana funkcja celu dla strategii RSI
     * Maksymalizuje Sharpe ratio na podstawie parametrów RSI
     */
    static rsiStrategy(params) {
        const period = params.rsi_period || 14;
        const oversold = params.oversold_threshold || 30;
        const overbought = params.overbought_threshold || 70;
        const positionSize = params.position_size || 0.1;
        // Syntetyczna formuła oparta na heurystykach tradingu
        let score = 0;
        // Preferuj średnie okresy RSI (10-20)
        const periodPenalty = Math.abs(period - 15) * 0.01;
        score -= periodPenalty;
        // Preferuj asymetryczne progi (oversold niższy niż 35, overbought wyższy niż 65)
        const thresholdBonus = (35 - oversold) * 0.02 + (overbought - 65) * 0.02;
        score += Math.max(0, thresholdBonus);
        // Preferuj większy spread między progami
        const spread = overbought - oversold;
        score += Math.max(0, (spread - 30) * 0.01);
        // Kara za zbyt duży rozmiar pozycji
        const sizePenalty = Math.max(0, (positionSize - 0.3) * 2);
        score -= sizePenalty;
        // Dodaj szum żeby symulować rzeczywiste warunki
        const noise = (Math.random() - 0.5) * 0.1;
        score += noise;
        return score;
    }
    /**
     * Symulowana funkcja celu dla strategii MA Crossover
     */
    static maCrossoverStrategy(params) {
        const fastPeriod = params.fast_period || 10;
        const slowPeriod = params.slow_period || 20;
        const positionSize = params.position_size || 0.1;
        const stopLoss = params.stop_loss || 0.02;
        const takeProfit = params.take_profit || 0.04;
        let score = 0;
        // Preferuj dobry stosunek fast/slow (około 1:2 do 1:4)
        const ratio = slowPeriod / fastPeriod;
        const optimalRatio = 2.5;
        const ratioPenalty = Math.abs(ratio - optimalRatio) * 0.1;
        score -= ratioPenalty;
        // Risk/Reward ratio powinien być około 1:2
        const rrRatio = takeProfit / stopLoss;
        const rrBonus = Math.max(0, (rrRatio - 1.5) * 0.5);
        score += rrBonus;
        // Kara za zbyt małe różnice między MA
        const periodDiff = slowPeriod - fastPeriod;
        if (periodDiff < 5)
            score -= 0.5;
        // Bonus za umiarkowane rozmiary pozycji
        const sizeBonus = positionSize > 0.05 && positionSize < 0.5 ? 0.2 : 0;
        score += sizeBonus;
        // Szum
        const noise = (Math.random() - 0.5) * 0.05;
        score += noise;
        return score;
    }
}
/**
 * Główna klasa demonstracyjna
 */
class OptimizationDemo {
    constructor() {
        this.spaceManager = new hyperparameter_space_1.HyperparameterSpaceManager();
        this.optimizationManager = new optimization_algorithms_1.OptimizationManager(this.spaceManager);
    }
    /**
     * Uruchom pełną demonstrację
     */
    async runFullDemo() {
        console.log('🚀 === DEMONSTRACJA ALGORYTMÓW OPTYMALIZACJI ===\n');
        // Test 1: Funkcja syntetyczna
        await this.testSyntheticFunction();
        // Test 2: Strategia RSI
        await this.testRSIStrategy();
        // Test 3: Strategia MA Crossover
        await this.testMACrossoverStrategy();
        // Test 4: Porównanie algorytmów
        await this.compareAlgorithmsDemo();
        console.log('\n🎉 === DEMONSTRACJA ZAKOŃCZONA ===');
    }
    /**
     * Test z funkcją syntetyczną (Sphere)
     */
    async testSyntheticFunction() {
        console.log('📊 1. TEST FUNKCJI SYNTETYCZNEJ (SPHERE)');
        console.log('   Cel: Znaleźć minimum funkcji x² + y²\n');
        // Stwórz prostą przestrzeń 2D
        const spaceName = 'sphere_test';
        const spaceDefinition = {
            name: spaceName,
            description: 'Przestrzeń 2D dla funkcji Sphere',
            strategyType: 'TestFunction',
            version: '1.0.0',
            parameters: [
                {
                    name: 'x',
                    type: hyperparameter_space_1.ParameterType.FLOAT,
                    range: [-5, 5],
                    description: 'Współrzędna X'
                },
                {
                    name: 'y',
                    type: hyperparameter_space_1.ParameterType.FLOAT,
                    range: [-5, 5],
                    description: 'Współrzędna Y'
                }
            ],
            constraints: []
        };
        this.spaceManager.createSpace(spaceDefinition);
        const objective = ObjectiveFunctions.sphere;
        const result = await this.optimizationManager.optimize('genetic', spaceName, objective, 100);
        this.printResult('Sphere Function (Genetic)', result);
        // Sprawdź jak blisko jesteśmy optimum (0, 0)
        const x = result.bestParameters.x || 0;
        const y = result.bestParameters.y || 0;
        const distance = Math.sqrt(x * x + y * y);
        console.log(`   📍 Odległość od optimum (0,0): ${distance.toFixed(4)}\n`);
    }
    /**
     * Test strategii RSI
     */
    async testRSIStrategy() {
        console.log('📈 2. TEST STRATEGII RSI');
        console.log('   Cel: Optymalizacja parametrów RSI dla maksymalnego Sharpe ratio\n');
        const objective = ObjectiveFunctions.rsiStrategy;
        const result = await this.optimizationManager.optimize('annealing', 'rsi_strategy', objective, 200);
        this.printResult('RSI Strategy (Simulated Annealing)', result);
        this.printRSIParameters(result);
    }
    /**
     * Test strategii MA Crossover
     */
    async testMACrossoverStrategy() {
        console.log('📊 3. TEST STRATEGII MA CROSSOVER');
        console.log('   Cel: Optymalizacja parametrów MA dla najlepszego risk/reward\n');
        const objective = ObjectiveFunctions.maCrossoverStrategy;
        const result = await this.optimizationManager.optimize('random', 'ma_crossover', objective, 150);
        this.printResult('MA Crossover Strategy (Random Search)', result);
        this.printMAParameters(result);
    }
    /**
     * Porównanie wszystkich algorytmów
     */
    async compareAlgorithmsDemo() {
        console.log('🏁 4. PORÓWNANIE ALGORYTMÓW');
        console.log('   Strategia: RSI z 100 iteracjami na algorytm\n');
        const objective = ObjectiveFunctions.rsiStrategy;
        const results = await this.optimizationManager.compareAlgorithms('rsi_strategy', objective, 100);
        console.log('\n📊 SZCZEGÓŁOWE PORÓWNANIE:');
        console.log('─'.repeat(80));
        console.log('Algorytm'.padEnd(15) + 'Najlepszy wynik'.padEnd(20) + 'Czas [ms]'.padEnd(15) + 'Iteracje');
        console.log('─'.repeat(80));
        for (const [algorithm, result] of Object.entries(results)) {
            const score = result.bestScore.toFixed(4);
            const time = result.executionTime.toString();
            const iterations = result.totalIterations.toString();
            console.log(algorithm.padEnd(15) +
                score.padEnd(20) +
                time.padEnd(15) +
                iterations);
        }
        console.log('─'.repeat(80));
        // Znajdź najlepszy algorytm
        const bestAlgorithm = Object.entries(results).reduce((best, [alg, result]) => result.bestScore > best[1].bestScore ? [alg, result] : best);
        console.log(`🏆 ZWYCIĘZCA: ${bestAlgorithm[0].toUpperCase()}`);
        console.log(`   Wynik: ${bestAlgorithm[1].bestScore.toFixed(4)}`);
        console.log(`   Czas: ${bestAlgorithm[1].executionTime}ms`);
    }
    /**
     * Wyświetl wyniki optymalizacji
     */
    printResult(title, result) {
        console.log(`✅ ${title}:`);
        console.log(`   🎯 Najlepszy wynik: ${result.bestScore.toFixed(4)}`);
        console.log(`   ⏱️  Czas wykonania: ${result.executionTime}ms`);
        console.log(`   🔄 Liczba iteracji: ${result.totalIterations}`);
        console.log(`   📈 Poprawa: ${this.calculateImprovement(result.convergenceHistory)}%`);
    }
    /**
     * Wyświetl parametry RSI
     */
    printRSIParameters(result) {
        const params = result.bestParameters;
        console.log(`   📊 Parametry RSI:`);
        console.log(`      Okres: ${params.rsi_period || 'N/A'}`);
        console.log(`      Wyprzedanie: ${params.oversold_threshold?.toFixed(1) || 'N/A'}`);
        console.log(`      Wykupienie: ${params.overbought_threshold?.toFixed(1) || 'N/A'}`);
        console.log(`      Rozmiar pozycji: ${params.position_size ? (params.position_size * 100).toFixed(1) + '%' : 'N/A'}\n`);
    }
    /**
     * Wyświetl parametry MA
     */
    printMAParameters(result) {
        const params = result.bestParameters;
        console.log(`   📊 Parametry MA:`);
        console.log(`      Szybka MA: ${params.fast_period || 'N/A'}`);
        console.log(`      Wolna MA: ${params.slow_period || 'N/A'}`);
        console.log(`      Typ MA: ${params.ma_type || 'N/A'}`);
        console.log(`      Stop Loss: ${params.stop_loss ? (params.stop_loss * 100).toFixed(2) + '%' : 'N/A'}`);
        console.log(`      Take Profit: ${params.take_profit ? (params.take_profit * 100).toFixed(2) + '%' : 'N/A'}`);
        const rrRatio = (params.take_profit && params.stop_loss) ? (params.take_profit / params.stop_loss).toFixed(2) : 'N/A';
        console.log(`      Risk/Reward: ${rrRatio}\n`);
    }
    /**
     * Oblicz procentową poprawę od początku do końca
     */
    calculateImprovement(history) {
        if (history.length < 2)
            return '0.0';
        const initial = history[0];
        const final = history[history.length - 1];
        if (initial === 0)
            return '∞';
        const improvement = ((final - initial) / Math.abs(initial)) * 100;
        return improvement.toFixed(1);
    }
}
exports.OptimizationDemo = OptimizationDemo;
/**
 * Funkcja główna - uruchom demonstrację
 */
async function main() {
    try {
        const demo = new OptimizationDemo();
        await demo.runFullDemo();
    }
    catch (error) {
        console.error('❌ Błąd w demonstracji:', error);
    }
}
// Uruchom jeśli ten plik jest wykonywany bezpośrednio
if (require.main === module) {
    main();
}
