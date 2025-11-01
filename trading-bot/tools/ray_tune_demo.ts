/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
import * as path from 'path';
import { RayTuneOptimizer, ParameterSpace } from './ray_tune_optimizer';

/**
 * Przykładowa funkcja celu do testowania
 */
async function testObjectiveFunction(params: { x: number, y: number }): Promise<number> {
    // Funkcja 2D z minimum w (5, 5)
    const { x, y } = params;
    
    // Dodaj opóźnienie aby symulować złożone obliczenia
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Funkcja celu: (x-5)^2 + (y-5)^2
    return Math.pow(x - 5, 2) + Math.pow(y - 5, 2);
}

/**
 * Funkcja demonstracyjna dla optymalizacji przy użyciu Ray Tune
 */
async function demoRayTuneOptimization(): Promise<void> {
    console.log('🚀 Rozpoczynam demonstrację optymalizacji z Ray Tune');
    
    // Konfiguracja eksperymentu
    const optimizer = new RayTuneOptimizer({
        experimentName: 'demo_optimization',
        metric: 'score',
        mode: 'min',
        numSamples: 20,
        cpusPerTrial: 1,
        maxConcurrentTrials: 4
    });
    
    // Definiowanie przestrzeni parametrów
    const parameterSpace: ParameterSpace = {
        x: { type: 'uniform', min: 0, max: 10 },
        y: { type: 'uniform', min: 0, max: 10 }
    };
    
    try {
        console.log('Rozpoczynam optymalizację z mostkiem TypeScript...');
        
        // Uruchom optymalizację
        const results = await optimizer.optimize(testObjectiveFunction, parameterSpace);
        
        // Wyświetl wyniki
        console.log('✅ Optymalizacja zakończona pomyślnie!');
        console.log(`Najlepszy wynik: ${results.bestScore}`);
        console.log(`Najlepsze parametry:`, results.bestParameters);
        console.log(`Liczba prób: ${results.allTrials.length}`);
        
        // Analiza innych prób
        const sortedTrials = [...results.allTrials].sort((a, b) => a.score - b.score);
        console.log('\nTop 5 najlepszych prób:');
        sortedTrials.slice(0, 5).forEach((trial, i) => {
            console.log(`${i+1}. Wynik: ${trial.score.toFixed(4)}, Parametry:`, trial.parameters);
        });
        
        // Opcjonalne czyszczenie
        optimizer.cleanup();
        
    } catch (error) {
        console.error('❌ Błąd podczas optymalizacji:', error);
    }
}

/**
 * Funkcja demonstracyjna dla optymalizacji w Pythonie
 */
async function demoRayTunePython(): Promise<void> {
    console.log('🚀 Rozpoczynam demonstrację optymalizacji w Pythonie');
    
    // Konfiguracja eksperymentu
    const optimizer = new RayTuneOptimizer({
        experimentName: 'demo_python_optimization',
        metric: 'score',
        mode: 'min',
        numSamples: 20,
        cpusPerTrial: 1,
        maxConcurrentTrials: 4
    });
    
    // Definiowanie przestrzeni parametrów
    const parameterSpace: ParameterSpace = {
        x: { type: 'uniform', min: 0, max: 10 },
        y: { type: 'uniform', min: 0, max: 10 }
    };
    
    try {
        console.log('Rozpoczynam optymalizację bezpośrednio w Pythonie...');
        
        // Ścieżka do skryptu Pythona z funkcją obiektywną
        const objectiveScriptPath = path.resolve(__dirname, './python/test_objective.py');
        
        // Uruchom optymalizację w Pythonie
        const results = await optimizer.optimizeWithPython(
            objectiveScriptPath, 
            parameterSpace,
            { param_a: 5, param_b: 5 } // Dodatkowe parametry
        );
        
        // Wyświetl wyniki
        console.log('✅ Optymalizacja zakończona pomyślnie!');
        console.log(`Najlepszy wynik: ${results.bestScore}`);
        console.log(`Najlepsze parametry:`, results.bestParameters);
        console.log(`Liczba prób: ${results.allTrials.length}`);
        
        // Analiza innych prób
        const sortedTrials = [...results.allTrials].sort((a, b) => a.score - b.score);
        console.log('\nTop 5 najlepszych prób:');
        sortedTrials.slice(0, 5).forEach((trial, i) => {
            console.log(`${i+1}. Wynik: ${trial.score.toFixed(4)}, Parametry:`, trial.parameters);
        });
        
        // Opcjonalne czyszczenie
        optimizer.cleanup();
        
    } catch (error) {
        console.error('❌ Błąd podczas optymalizacji:', error);
    }
}

// Uruchom obie demonstracje
async function runDemo() {
    try {
        // Najpierw testujemy mostek TypeScript
        await demoRayTuneOptimization();
        
        console.log('\n------------------------------------------------\n');
        
        // Następnie testujemy bezpośrednią optymalizację w Pythonie
        await demoRayTunePython();
        
    } catch (error) {
        console.error('❌ Błąd podczas demonstracji:', error);
    }
}

// Uruchom demonstrację, jeśli uruchomiony bezpośrednio
if (require.main === module) {
    runDemo();
}
