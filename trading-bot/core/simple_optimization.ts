/**
 * 🚀 UPROSZCZONA WERSJA ALGORYTMÓW OPTYMALIZACJI
 * 
 * Implementacja bez skomplikowanych typów - skupiona na działaniu
 */

import { HyperparameterSpaceManager } from './hyperparameter_space';

export interface SimpleOptimizationResult {
    bestParameters: any;
    bestScore: number;
    allScores: number[];
    totalIterations: number;
    executionTime: number;
}

export interface SimpleObjectiveFunction {
    (parameters: any): Promise<number> | number;
}

/**
 * 🎲 RANDOM SEARCH OPTIMIZER
 */
export class SimpleRandomSearchOptimizer {
    private spaceManager: HyperparameterSpaceManager;
    private spaceName: string;
    private objective: SimpleObjectiveFunction;

    constructor(spaceManager: HyperparameterSpaceManager, spaceName: string, objective: SimpleObjectiveFunction) {
        this.spaceManager = spaceManager;
        this.spaceName = spaceName;
        this.objective = objective;
    }

    async optimize(maxIterations: number): Promise<SimpleOptimizationResult> {
        const startTime = Date.now();
        console.log(`🎲 Random Search: rozpoczynam optymalizację (${maxIterations} iteracji)`);

        let bestParams: any = null;
        let bestScore = -Infinity;
        const allScores: number[] = [];

        for (let i = 0; i < maxIterations; i++) {
            try {
                // Generuj losowe parametry
                const sampleResult = this.spaceManager.sampleParameters(this.spaceName);
                
                if (!sampleResult.isValid) {
                    continue;
                }

                // Ewaluuj
                const score = await this.objective(sampleResult.parameters);
                allScores.push(score);

                if (score > bestScore) {
                    bestScore = score;
                    bestParams = { ...sampleResult.parameters };
                }

                // Progress logging
                if ((i + 1) % Math.max(1, Math.floor(maxIterations / 10)) === 0) {
                    console.log(`📈 Postęp: ${i + 1}/${maxIterations}, Najlepszy wynik: ${bestScore.toFixed(4)}`);
                }
            } catch (error) {
                console.warn(`Błąd w iteracji ${i}:`, error);
                allScores.push(-Infinity);
            }
        }

        const executionTime = Date.now() - startTime;
        console.log(`✅ Random Search zakończony w ${executionTime}ms`);
        
        return {
            bestParameters: bestParams || {},
            bestScore,
            allScores,
            totalIterations: allScores.length,
            executionTime
        };
    }
}

/**
 * 🧬 GENETIC ALGORITHM OPTIMIZER
 */
export class SimpleGeneticOptimizer {
    private spaceManager: HyperparameterSpaceManager;
    private spaceName: string;
    private objective: SimpleObjectiveFunction;
    private populationSize: number;
    private mutationRate: number;

    constructor(
        spaceManager: HyperparameterSpaceManager, 
        spaceName: string, 
        objective: SimpleObjectiveFunction,
        populationSize: number = 30,
        mutationRate: number = 0.1
    ) {
        this.spaceManager = spaceManager;
        this.spaceName = spaceName;
        this.objective = objective;
        this.populationSize = populationSize;
        this.mutationRate = mutationRate;
    }

    async optimize(maxIterations: number): Promise<SimpleOptimizationResult> {
        const startTime = Date.now();
        console.log(`🧬 Genetic Algorithm: rozpoczynam optymalizację`);
        console.log(`   Populacja: ${this.populationSize}, Mutacja: ${this.mutationRate}`);

        // Inicjalizuj populację
        let population = await this.initializePopulation();
        
        const generations = Math.floor(maxIterations / this.populationSize);
        const allScores: number[] = [];
        let bestParams: any = null;
        let bestScore = -Infinity;
        
        for (let gen = 0; gen < generations; gen++) {
            // Ewaluuj populację
            for (const individual of population) {
                if (individual.fitness === undefined) {
                    try {
                        const score = await this.objective(individual.parameters);
                        individual.fitness = score;
                        allScores.push(score);

                        if (score > bestScore) {
                            bestScore = score;
                            bestParams = { ...individual.parameters };
                        }
                    } catch (error) {
                        individual.fitness = -Infinity;
                        allScores.push(-Infinity);
                    }
                }
            }
            
            // Sortuj populację
            population.sort((a, b) => (b.fitness || -Infinity) - (a.fitness || -Infinity));
            
            // Ewolucja
            population = this.evolvePopulation(population);
            
            if ((gen + 1) % Math.max(1, Math.floor(generations / 10)) === 0) {
                console.log(`📈 Generacja: ${gen + 1}/${generations}, Najlepszy wynik: ${bestScore.toFixed(4)}`);
            }
        }

        const executionTime = Date.now() - startTime;
        console.log(`✅ Genetic Algorithm zakończony w ${executionTime}ms`);
        
        return {
            bestParameters: bestParams || {},
            bestScore,
            allScores,
            totalIterations: allScores.length,
            executionTime
        };
    }

    private async initializePopulation(): Promise<any[]> {
        const population: any[] = [];
        
        for (let i = 0; i < this.populationSize; i++) {
            const sample = this.spaceManager.sampleParameters(this.spaceName);
            if (sample.isValid) {
                population.push({
                    parameters: sample.parameters,
                    fitness: undefined
                });
            }
        }
        
        return population;
    }

    private evolvePopulation(population: any[]): any[] {
        const newPopulation: any[] = [];
        const eliteSize = Math.floor(this.populationSize * 0.2);
        
        // Elita (najlepsze osobniki przechodzą bez zmian)
        for (let i = 0; i < eliteSize; i++) {
            newPopulation.push({
                parameters: { ...population[i].parameters },
                fitness: undefined
            });
        }
        
        // Reszta populacji przez krzyżowanie i mutację
        while (newPopulation.length < this.populationSize) {
            const parent1 = this.tournamentSelection(population);
            const parent2 = this.tournamentSelection(population);
            
            let offspring = this.crossover(parent1, parent2);
            
            if (Math.random() < this.mutationRate) {
                offspring = this.mutate(offspring);
            }
            
            newPopulation.push(offspring);
        }
        
        return newPopulation;
    }

    private tournamentSelection(population: any[], tournamentSize: number = 3): any {
        const tournament = [];
        for (let i = 0; i < tournamentSize; i++) {
            const randomIndex = Math.floor(Math.random() * population.length);
            tournament.push(population[randomIndex]);
        }
        return tournament.reduce((best, current) => 
            (current.fitness || -Infinity) > (best.fitness || -Infinity) ? current : best
        );
    }

    private crossover(parent1: any, parent2: any): any {
        const offspring: any = { parameters: {}, fitness: undefined };
        
        // Uniform crossover
        for (const key of Object.keys(parent1.parameters)) {
            offspring.parameters[key] = Math.random() < 0.5 ? 
                parent1.parameters[key] : 
                parent2.parameters[key];
        }
        
        return offspring;
    }

    private mutate(individual: any): any {
        const mutated = {
            parameters: { ...individual.parameters },
            fitness: undefined
        };
        
        // Wymutuj jeden losowy parametr
        const keys = Object.keys(mutated.parameters);
        if (keys.length > 0) {
            const newSample = this.spaceManager.sampleParameters(this.spaceName);
            if (newSample.isValid) {
                const keyToMutate = keys[Math.floor(Math.random() * keys.length)];
                if (newSample.parameters[keyToMutate] !== undefined) {
                    mutated.parameters[keyToMutate] = newSample.parameters[keyToMutate];
                }
            }
        }
        
        return mutated;
    }
}

/**
 * 🌡️ SIMULATED ANNEALING OPTIMIZER
 */
export class SimpleSimulatedAnnealingOptimizer {
    private spaceManager: HyperparameterSpaceManager;
    private spaceName: string;
    private objective: SimpleObjectiveFunction;
    private initialTemperature: number;
    private coolingRate: number;

    constructor(
        spaceManager: HyperparameterSpaceManager, 
        spaceName: string, 
        objective: SimpleObjectiveFunction,
        initialTemperature: number = 100.0,
        coolingRate: number = 0.95
    ) {
        this.spaceManager = spaceManager;
        this.spaceName = spaceName;
        this.objective = objective;
        this.initialTemperature = initialTemperature;
        this.coolingRate = coolingRate;
    }

    async optimize(maxIterations: number): Promise<SimpleOptimizationResult> {
        const startTime = Date.now();
        console.log(`🌡️ Simulated Annealing: rozpoczynam optymalizację`);

        // Rozpocznij od losowego rozwiązania
        let currentSample = this.spaceManager.sampleParameters(this.spaceName);
        while (!currentSample.isValid) {
            currentSample = this.spaceManager.sampleParameters(this.spaceName);
        }
        
        let currentScore = await this.objective(currentSample.parameters);
        let bestParams = { ...currentSample.parameters };
        let bestScore = currentScore;
        
        const allScores: number[] = [currentScore];
        let temperature = this.initialTemperature;
        
        for (let i = 1; i < maxIterations && temperature > 0.01; i++) {
            try {
                // Wygeneruj sąsiada
                const neighborSample = this.generateNeighbor(currentSample.parameters);
                const neighborScore = await this.objective(neighborSample);
                allScores.push(neighborScore);
                
                // Sprawdź czy to najlepsze rozwiązanie
                if (neighborScore > bestScore) {
                    bestScore = neighborScore;
                    bestParams = { ...neighborSample };
                }
                
                // Decyzja o akceptacji
                const delta = neighborScore - currentScore;
                const acceptanceProbability = delta > 0 ? 1.0 : Math.exp(delta / temperature);
                
                if (Math.random() < acceptanceProbability) {
                    currentSample.parameters = neighborSample;
                    currentScore = neighborScore;
                }
                
                // Chłodzenie
                temperature *= this.coolingRate;
                
                if (i % Math.max(1, Math.floor(maxIterations / 10)) === 0) {
                    console.log(`📈 Iteracja: ${i}/${maxIterations}, Temperatura: ${temperature.toFixed(4)}, Najlepszy: ${bestScore.toFixed(4)}`);
                }
            } catch (error) {
                allScores.push(-Infinity);
                temperature *= this.coolingRate;
            }
        }

        const executionTime = Date.now() - startTime;
        console.log(`✅ Simulated Annealing zakończony w ${executionTime}ms`);
        
        return {
            bestParameters: bestParams,
            bestScore,
            allScores,
            totalIterations: allScores.length,
            executionTime
        };
    }

    private generateNeighbor(currentParams: any): any {
        const neighbor = { ...currentParams };
        const space = this.spaceManager.getSpace(this.spaceName);
        
        if (!space) return neighbor;
        
        // Znajdź parametry numeryczne
        const numericParams = space.parameters.filter(p => 
            p.type === 'integer' || p.type === 'float'
        );
        
        if (numericParams.length === 0) {
            // Jeśli brak parametrów numerycznych, wygeneruj nową próbkę
            const newSample = this.spaceManager.sampleParameters(this.spaceName);
            return newSample.isValid ? newSample.parameters : neighbor;
        }
        
        // Wybierz losowy parametr numeryczny do zmutowania
        const paramToMutate = numericParams[Math.floor(Math.random() * numericParams.length)];
        
        // Wykonaj małą mutację
        const currentValue = currentParams[paramToMutate.name];
        if (typeof currentValue === 'number') {
            let newValue;
            
            if (paramToMutate.type === 'integer') {
                const mutation = Math.floor((Math.random() - 0.5) * 6); // ±3
                newValue = Math.round(currentValue + mutation);
                // Ograniczenia są sprawdzane przez spaceManager
            } else {
                const mutation = (Math.random() - 0.5) * 0.2; // ±10%
                newValue = currentValue + mutation;
            }
            
            neighbor[paramToMutate.name] = newValue;
        }
        
        return neighbor;
    }
}

/**
 * 🎯 SIMPLE OPTIMIZATION MANAGER
 */
export class SimpleOptimizationManager {
    private spaceManager: HyperparameterSpaceManager;

    constructor(spaceManager: HyperparameterSpaceManager) {
        this.spaceManager = spaceManager;
    }

    async optimize(
        algorithm: 'random' | 'genetic' | 'annealing',
        spaceName: string,
        objective: SimpleObjectiveFunction,
        maxIterations: number,
        options?: any
    ): Promise<SimpleOptimizationResult> {
        switch (algorithm) {
            case 'random':
                const randomOptimizer = new SimpleRandomSearchOptimizer(this.spaceManager, spaceName, objective);
                return randomOptimizer.optimize(maxIterations);
                
            case 'genetic':
                const geneticOptimizer = new SimpleGeneticOptimizer(
                    this.spaceManager, 
                    spaceName, 
                    objective,
                    options?.populationSize,
                    options?.mutationRate
                );
                return geneticOptimizer.optimize(maxIterations);
                
            case 'annealing':
                const annealingOptimizer = new SimpleSimulatedAnnealingOptimizer(
                    this.spaceManager, 
                    spaceName, 
                    objective,
                    options?.initialTemperature,
                    options?.coolingRate
                );
                return annealingOptimizer.optimize(maxIterations);
                
            default:
                throw new Error(`Nieznany algorytm: ${algorithm}`);
        }
    }

    async compareAlgorithms(
        spaceName: string,
        objective: SimpleObjectiveFunction,
        maxIterationsPerAlgorithm: number
    ): Promise<{ [algorithm: string]: SimpleOptimizationResult }> {
        const algorithms = ['random', 'genetic', 'annealing'] as const;
        const results: { [algorithm: string]: SimpleOptimizationResult } = {};

        console.log(`🏁 Porównanie algorytmów optymalizacji (${algorithms.length} algorytmów)`);

        for (const algorithm of algorithms) {
            console.log(`\n🔄 Testowanie: ${algorithm.toUpperCase()}`);
            try {
                results[algorithm] = await this.optimize(
                    algorithm,
                    spaceName,
                    objective,
                    maxIterationsPerAlgorithm
                );
            } catch (error) {
                console.error(`❌ Błąd w algorytmie ${algorithm}:`, error);
                results[algorithm] = {
                    bestParameters: {},
                    bestScore: -Infinity,
                    allScores: [],
                    totalIterations: 0,
                    executionTime: 0
                };
            }
        }

        // Podsumowanie
        console.log(`\n📊 PODSUMOWANIE PORÓWNANIA:`);
        for (const [alg, result] of Object.entries(results)) {
            console.log(`   ${alg.padEnd(10)}: ${result.bestScore.toFixed(4)} (${result.executionTime}ms)`);
        }

        return results;
    }
}
