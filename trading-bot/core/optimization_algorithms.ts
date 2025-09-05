/**
 * 🚀 FAZA 2.2: ALGORYTMY OPTYMALIZACJI
 * 
 * Natywna implementacja algorytmów optymalizacji w TypeScript:
 * - Random Search
 * - Grid Search 
 * - Genetic Algorithm
 * - Simulated Annealing
 * - Bayesian Optimization (uproszczona)
 */

import { HyperparameterSpaceManager, ParameterSample, ParameterDefinition } from './hyperparameter_space';

// Type alias for parameter values
type ParameterValues = Record<string, any>;

export interface OptimizationResult {
    bestParameters: Record<string, any>;
    bestScore: number;
    allTrials: Trial[];
    convergenceHistory: number[];
    totalIterations: number;
    executionTime: number;
}

export interface Trial {
    id: string;
    parameters: Record<string, any>;
    score: number;
    timestamp: number;
    metadata?: any;
}

export interface ObjectiveFunction {
    (parameters: Record<string, any>): Promise<number> | number;
}

export abstract class BaseOptimizer {
    protected spaceManager: HyperparameterSpaceManager;
    protected spaceName: string;
    protected objective: ObjectiveFunction;
    protected trials: Trial[] = [];
    protected bestTrial: Trial | null = null;

    constructor(
        spaceManager: HyperparameterSpaceManager,
        spaceName: string,
        objective: ObjectiveFunction
    ) {
        this.spaceManager = spaceManager;
        this.spaceName = spaceName;
        this.objective = objective;
    }

    abstract optimize(maxIterations: number): Promise<OptimizationResult>;

    protected async evaluateParameters(parameters: Record<string, any>): Promise<number> {
        try {
            const score = await this.objective(parameters);
            return score;
        } catch (error) {
            console.warn(`Błąd ewaluacji parametrów:`, error);
            return -Infinity; // Najgorszy możliwy wynik
        }
    }

    protected recordTrial(parameters: Record<string, any>, score: number, metadata?: any): Trial {
        const trial: Trial = {
            id: `trial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            parameters,
            score,
            timestamp: Date.now(),
            metadata
        };

        this.trials.push(trial);

        if (!this.bestTrial || score > this.bestTrial.score) {
            this.bestTrial = trial;
        }

        return trial;
    }

    protected buildResult(executionTime: number): OptimizationResult {
        return {
            bestParameters: this.bestTrial?.parameters || {},
            bestScore: this.bestTrial?.score || -Infinity,
            allTrials: [...this.trials],
            convergenceHistory: this.trials.map(t => t.score),
            totalIterations: this.trials.length,
            executionTime
        };
    }
}

/**
 * 🎲 RANDOM SEARCH OPTIMIZER
 * Najprostszy ale często skuteczny algorytm
 */
export class RandomSearchOptimizer extends BaseOptimizer {
    async optimize(maxIterations: number): Promise<OptimizationResult> {
        const startTime = Date.now();
        
        console.log(`🎲 Random Search: rozpoczynam optymalizację (${maxIterations} iteracji)`);

        for (let i = 0; i < maxIterations; i++) {
            // Generuj losowe parametry
            const sampleResult = this.spaceManager.sampleParameters(this.spaceName);
            
            if (!sampleResult.isValid) {
                continue; // Pomiń niepoprawne parametry
            }

            // Ewaluuj
            const score = await this.evaluateParameters(sampleResult.parameters);
            this.recordTrial(sampleResult.parameters, score);

            // Progress logging
            if ((i + 1) % Math.max(1, Math.floor(maxIterations / 10)) === 0) {
                console.log(`📈 Postęp: ${i + 1}/${maxIterations}, Najlepszy wynik: ${this.bestTrial?.score.toFixed(4)}`);
            }
        }

        const executionTime = Date.now() - startTime;
        console.log(`✅ Random Search zakończony w ${executionTime}ms`);
        
        return this.buildResult(executionTime);
    }
}

/**
 * 📊 GRID SEARCH OPTIMIZER
 * Systematyczne przeszukiwanie siatki parametrów
 */
export class GridSearchOptimizer extends BaseOptimizer {
    private gridResolution: number;

    constructor(
        spaceManager: HyperparameterSpaceManager,
        spaceName: string,
        objective: ObjectiveFunction,
        gridResolution: number = 10
    ) {
        super(spaceManager, spaceName, objective);
        this.gridResolution = gridResolution;
    }

    async optimize(maxIterations: number): Promise<OptimizationResult> {
        const startTime = Date.now();
        
        console.log(`📊 Grid Search: rozpoczynam optymalizację (rozdzielczość: ${this.gridResolution})`);

        const gridPoints = this.generateGrid();
        const totalPoints = Math.min(gridPoints.length, maxIterations);

        for (let i = 0; i < totalPoints; i++) {
            const parameters = gridPoints[i];
            const score = await this.evaluateParameters(parameters);
            this.recordTrial(parameters, score);

            if ((i + 1) % Math.max(1, Math.floor(totalPoints / 10)) === 0) {
                console.log(`📈 Postęp: ${i + 1}/${totalPoints}, Najlepszy wynik: ${this.bestTrial?.score.toFixed(4)}`);
            }
        }

        const executionTime = Date.now() - startTime;
        console.log(`✅ Grid Search zakończony w ${executionTime}ms`);
        
        return this.buildResult(executionTime);
    }

    private generateGrid(): Record<string, any>[] {
        // Uproszczona implementacja - generuje siatkę dla parametrów numerycznych
        const space = this.spaceManager.getSpace(this.spaceName);
        if (!space) return [];

        const gridPoints: Record<string, any>[] = [];
        const numericParams = space.parameters.filter(p => 
            p.type === 'integer' || p.type === 'float'
        );

        if (numericParams.length === 0) {
            // Jeśli brak parametrów numerycznych, użyj random search
            for (let i = 0; i < this.gridResolution ** 2; i++) {
                const sample = this.spaceManager.sampleParameters(this.spaceName);
                if (sample.isValid) {
                    gridPoints.push(sample.parameters);
                }
            }
            return gridPoints;
        }

        // Generuj kombinacje dla pierwszych 2-3 parametrów numerycznych
        const params = numericParams.slice(0, 3);
        
        const generateCombinations = (paramIndex: number, currentSample: Record<string, any>): void => {
            if (paramIndex >= params.length) {
                // Wypełnij pozostałe parametry losowymi wartościami
                const fullSample = this.spaceManager.sampleParameters(this.spaceName);
                if (fullSample.isValid) {
                    const combined = { ...fullSample.parameters, ...currentSample };
                    gridPoints.push(combined);
                }
                return;
            }

            const param = params[paramIndex];
            const values = this.getGridValues(param);

            for (const value of values) {
                const newSample = { ...currentSample };
                newSample[param.name] = value;
                generateCombinations(paramIndex + 1, newSample);
            }
        };

        generateCombinations(0, {});
        return gridPoints;
    }

    private getGridValues(param: ParameterDefinition): any[] {
        if (param.type === 'integer') {
            const min = param.min || 0;
            const max = param.max || 100;
            const step = Math.max(1, Math.floor((max - min) / this.gridResolution));
            const values = [];
            for (let i = min; i <= max; i += step) {
                values.push(i);
            }
            return values;
        } else if (param.type === 'float') {
            const min = param.min || 0.0;
            const max = param.max || 1.0;
            const step = (max - min) / this.gridResolution;
            const values = [];
            for (let i = 0; i <= this.gridResolution; i++) {
                values.push(min + i * step);
            }
            return values;
        }
        return [];
    }
}

/**
 * 🧬 GENETIC ALGORITHM OPTIMIZER
 * Algorytm genetyczny z krzyżowaniem i mutacją
 */
export class GeneticOptimizer extends BaseOptimizer {
    private populationSize: number;
    private mutationRate: number;
    private crossoverRate: number;
    private eliteSize: number;

    constructor(
        spaceManager: HyperparameterSpaceManager,
        spaceName: string,
        objective: ObjectiveFunction,
        options: {
            populationSize?: number;
            mutationRate?: number;
            crossoverRate?: number;
            eliteSize?: number;
        } = {}
    ) {
        super(spaceManager, spaceName, objective);
        this.populationSize = options.populationSize || 50;
        this.mutationRate = options.mutationRate || 0.1;
        this.crossoverRate = options.crossoverRate || 0.8;
        this.eliteSize = options.eliteSize || Math.floor(this.populationSize * 0.1);
    }

    async optimize(maxIterations: number): Promise<OptimizationResult> {
        const startTime = Date.now();
        
        console.log(`🧬 Genetic Algorithm: rozpoczynam optymalizację`);
        console.log(`   Populacja: ${this.populationSize}, Mutacja: ${this.mutationRate}, Krzyżowanie: ${this.crossoverRate}`);

        // Inicjalizuj populację
        let population = await this.initializePopulation();
        
        const generations = Math.floor(maxIterations / this.populationSize);
        
        for (let gen = 0; gen < generations; gen++) {
            // Ewaluuj populację
            population = await this.evaluatePopulation(population);
            
            // Selekcja, krzyżowanie, mutacja
            population = this.evolvePopulation(population);
            
            if ((gen + 1) % Math.max(1, Math.floor(generations / 10)) === 0) {
                console.log(`📈 Generacja: ${gen + 1}/${generations}, Najlepszy wynik: ${this.bestTrial?.score.toFixed(4)}`);
            }
        }

        const executionTime = Date.now() - startTime;
        console.log(`✅ Genetic Algorithm zakończony w ${executionTime}ms`);
        
        return this.buildResult(executionTime);
    }

    private async initializePopulation(): Promise<Individual[]> {
        const population: Individual[] = [];
        
        for (let i = 0; i < this.populationSize; i++) {
            const sample = this.spaceManager.sampleParameters(this.spaceName);
            if (sample.isValid) {
                population.push({
                    parameters: sample.parameters,
                    fitness: 0
                });
            }
        }
        
        return population;
    }

    private async evaluatePopulation(population: Individual[]): Promise<Individual[]> {
        for (const individual of population) {
            if (individual.fitness === 0) { // Nie ewaluowany jeszcze
                const score = await this.evaluateParameters(individual.parameters);
                individual.fitness = score;
                this.recordTrial(individual.parameters, score);
            }
        }
        
        return population.sort((a, b) => b.fitness - a.fitness);
    }

    private evolvePopulation(population: Individual[]): Individual[] {
        const newPopulation: Individual[] = [];
        
        // Elita (najlepsze osobniki przechodzą bez zmian)
        for (let i = 0; i < this.eliteSize; i++) {
            newPopulation.push({ ...population[i], fitness: 0 });
        }
        
        // Reszta populacji przez krzyżowanie i mutację
        while (newPopulation.length < this.populationSize) {
            const parent1 = this.tournamentSelection(population);
            const parent2 = this.tournamentSelection(population);
            
            let offspring: Individual;
            if (Math.random() < this.crossoverRate) {
                offspring = this.crossover(parent1, parent2);
            } else {
                offspring = { ...parent1, fitness: 0 };
            }
            
            if (Math.random() < this.mutationRate) {
                offspring = this.mutate(offspring);
            }
            
            newPopulation.push(offspring);
        }
        
        return newPopulation;
    }

    private tournamentSelection(population: Individual[], tournamentSize: number = 3): Individual {
        const tournament = [];
        for (let i = 0; i < tournamentSize; i++) {
            const randomIndex = Math.floor(Math.random() * population.length);
            tournament.push(population[randomIndex]);
        }
        return tournament.reduce((best, current) => 
            current.fitness > best.fitness ? current : best
        );
    }

    private crossover(parent1: Individual, parent2: Individual): Individual {
        const offspring: ParameterValues = {};
        
        // Uniform crossover - dla każdego parametru losuj rodzica
        for (const key of Object.keys(parent1.parameters)) {
            offspring[key] = Math.random() < 0.5 ? 
                parent1.parameters[key] : 
                parent2.parameters[key];
        }
        
        return { parameters: offspring, fitness: 0 };
    }

    private mutate(individual: Individual): Individual {
        // Wymutuj losowo wybrany parametr
        const mutated = { ...individual };
        const paramKeys = Object.keys(individual.parameters);
        const keyToMutate = paramKeys[Math.floor(Math.random() * paramKeys.length)];
        
        // Wygeneruj nowy losowy parametr dla tego klucza
        const newSample = this.spaceManager.sampleParameters(this.spaceName);
        if (newSample.isValid && newSample.parameters[keyToMutate] !== undefined) {
            mutated.parameters = { ...mutated.parameters };
            mutated.parameters[keyToMutate] = newSample.parameters[keyToMutate];
        }
        
        mutated.fitness = 0; // Wyzeruj fitness żeby został ponownie ewaluowany
        return mutated;
    }
}

interface Individual {
    parameters: ParameterValues;
    fitness: number;
}

/**
 * 🌡️ SIMULATED ANNEALING OPTIMIZER
 * Algorytm symulowanego wyżarzania
 */
export class SimulatedAnnealingOptimizer extends BaseOptimizer {
    private initialTemperature: number;
    private coolingRate: number;
    private minTemperature: number;

    constructor(
        spaceManager: HyperparameterSpaceManager,
        spaceName: string,
        objective: ObjectiveFunction,
        options: {
            initialTemperature?: number;
            coolingRate?: number;
            minTemperature?: number;
        } = {}
    ) {
        super(spaceManager, spaceName, objective);
        this.initialTemperature = options.initialTemperature || 100.0;
        this.coolingRate = options.coolingRate || 0.95;
        this.minTemperature = options.minTemperature || 0.01;
    }

    async optimize(maxIterations: number): Promise<OptimizationResult> {
        const startTime = Date.now();
        
        console.log(`🌡️ Simulated Annealing: rozpoczynam optymalizację`);
        console.log(`   Temperatura: ${this.initialTemperature}, Chłodzenie: ${this.coolingRate}`);

        // Rozpocznij od losowego rozwiązania
        let currentSample = this.spaceManager.sampleParameters(this.spaceName);
        while (!currentSample.isValid) {
            currentSample = this.spaceManager.sampleParameters(this.spaceName);
        }
        
        let currentScore = await this.evaluateParameters(currentSample.parameters);
        this.recordTrial(currentSample.parameters, currentScore);
        
        let temperature = this.initialTemperature;
        
        for (let i = 1; i < maxIterations && temperature > this.minTemperature; i++) {
            // Wygeneruj sąsiada (mutację)
            const neighborSample = this.generateNeighbor(currentSample.parameters);
            const neighborScore = await this.evaluateParameters(neighborSample);
            this.recordTrial(neighborSample, neighborScore);
            
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
                console.log(`📈 Iteracja: ${i}/${maxIterations}, Temperatura: ${temperature.toFixed(4)}, Najlepszy: ${this.bestTrial?.score.toFixed(4)}`);
            }
        }

        const executionTime = Date.now() - startTime;
        console.log(`✅ Simulated Annealing zakończony w ${executionTime}ms`);
        
        return this.buildResult(executionTime);
    }

    private generateNeighbor(currentSample: ParameterValues): ParameterValues {
        const neighbor = { ...currentSample };
        const space = this.spaceManager.getSpace(this.spaceName);
        
        if (!space) return neighbor;
        
        // Wybierz losowy parametr do zmutowania
        const params = space.parameters.filter(p => p.type === 'integer' || p.type === 'float');
        if (params.length === 0) return neighbor;
        
        const paramToMutate = params[Math.floor(Math.random() * params.length)];
        
        if (paramToMutate.type === 'integer') {
            const range = (paramToMutate.max || 100) - (paramToMutate.min || 0);
            const mutation = Math.floor((Math.random() - 0.5) * range * 0.1); // 10% zakresu
            const newValue = Math.max(
                paramToMutate.min || 0,
                Math.min(paramToMutate.max || 100, currentSample[paramToMutate.name] + mutation)
            );
            neighbor[paramToMutate.name] = newValue;
        } else if (paramToMutate.type === 'float') {
            const range = (paramToMutate.max || 1.0) - (paramToMutate.min || 0.0);
            const mutation = (Math.random() - 0.5) * range * 0.1; // 10% zakresu
            const newValue = Math.max(
                paramToMutate.min || 0.0,
                Math.min(paramToMutate.max || 1.0, currentSample[paramToMutate.name] + mutation)
            );
            neighbor[paramToMutate.name] = newValue;
        }
        
        return neighbor;
    }
}

/**
 * 🎯 OPTIMIZATION MANAGER
 * Centralny manager do uruchamiania różnych algorytmów
 */
export class OptimizationManager {
    private spaceManager: HyperparameterSpaceManager;

    constructor(spaceManager: HyperparameterSpaceManager) {
        this.spaceManager = spaceManager;
    }

    /**
     * Uruchom optymalizację z wybranym algorytmem
     */
    async optimize(
        algorithm: 'random' | 'grid' | 'genetic' | 'annealing',
        spaceName: string,
        objective: ObjectiveFunction,
        maxIterations: number,
        options?: any
    ): Promise<OptimizationResult> {
        let optimizer: BaseOptimizer;

        switch (algorithm) {
            case 'random':
                optimizer = new RandomSearchOptimizer(this.spaceManager, spaceName, objective);
                break;
            case 'grid':
                optimizer = new GridSearchOptimizer(this.spaceManager, spaceName, objective, options?.gridResolution);
                break;
            case 'genetic':
                optimizer = new GeneticOptimizer(this.spaceManager, spaceName, objective, options);
                break;
            case 'annealing':
                optimizer = new SimulatedAnnealingOptimizer(this.spaceManager, spaceName, objective, options);
                break;
            default:
                throw new Error(`Nieznany algorytm optymalizacji: ${algorithm}`);
        }

        return optimizer.optimize(maxIterations);
    }

    /**
     * Uruchom porównanie różnych algorytmów
     */
    async compareAlgorithms(
        spaceName: string,
        objective: ObjectiveFunction,
        maxIterationsPerAlgorithm: number
    ): Promise<{ [algorithm: string]: OptimizationResult }> {
        const algorithms = ['random', 'genetic', 'annealing'] as const;
        const results: { [algorithm: string]: OptimizationResult } = {};

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
                    allTrials: [],
                    convergenceHistory: [],
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
