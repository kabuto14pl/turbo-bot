/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * ============================================================================
 * SYSTEM ZŁOŻONYCH FUNKCJI CELU
 * 
 * Ten moduł implementuje wielokryterialne funkcje celu dla optymalizacji
 * strategii tradingowych, uwzględniając zysk, ryzyko, stabilność i inne metryki.
 * Faza 3.1: Definiowanie Złożonych Funkcji Celu
 * ============================================================================
 */

/**
 * Typ komponenty funkcji celu
 */
export enum ObjectiveComponentType {
    PROFIT = 'profit',                    // Zysk/zwrot
    RISK = 'risk',                       // Ryzyko (volatilność, drawdown)
    STABILITY = 'stability',             // Stabilność wyników
    EFFICIENCY = 'efficiency',           // Efektywność kapitału
    ROBUSTNESS = 'robustness',          // Odporność na zmiany rynkowe
    LIQUIDITY = 'liquidity',            // Płynność pozycji
    TRANSACTION_COSTS = 'transaction_costs', // Koszty transakcyjne
    MARKET_IMPACT = 'market_impact'      // Wpływ na rynek
}

/**
 * Strategia agregacji komponentów funkcji celu
 */
export enum AggregationStrategy {
    WEIGHTED_SUM = 'weighted_sum',       // Suma ważona
    GEOMETRIC_MEAN = 'geometric_mean',   // Średnia geometryczna
    HARMONIC_MEAN = 'harmonic_mean',     // Średnia harmoniczna
    MIN_MAX = 'min_max',                 // Minimalizacja maksimum
    PARETO_FRONT = 'pareto_front',      // Front Pareto
    UTILITY_FUNCTION = 'utility_function' // Funkcja użyteczności
}

/**
 * Warunki rynkowe do adaptacji funkcji celu
 */
export enum MarketCondition {
    BULL_MARKET = 'bull_market',         // Hossa
    BEAR_MARKET = 'bear_market',         // Bessa
    SIDEWAYS = 'sideways',               // Rynek boczny
    HIGH_VOLATILITY = 'high_volatility', // Wysoka zmienność
    LOW_VOLATILITY = 'low_volatility',   // Niska zmienność
    CRISIS = 'crisis',                   // Kryzys
    RECOVERY = 'recovery'                // Odbicie
}

/**
 * Komponent funkcji celu
 */
export interface ObjectiveComponent {
    type: ObjectiveComponentType;        // Typ komponenty
    name: string;                        // Nazwa komponenty
    description?: string;                // Opis komponenty
    weight: number;                      // Waga (0-1)
    target?: number;                     // Wartość docelowa
    threshold?: {                        // Progi akceptacji
        min?: number;
        max?: number;
    };
    transformation?: {                   // Transformacja wartości
        type: 'linear' | 'log' | 'sqrt' | 'sigmoid' | 'custom';
        parameters?: Record<string, number>;
    };
    penaltyFunction?: {                  // Funkcja kary
        type: 'quadratic' | 'exponential' | 'linear' | 'custom';
        parameters?: Record<string, number>;
    };
}

/**
 * Konfiguracja funkcji celu
 */
export interface ObjectiveConfiguration {
    name: string;                        // Nazwa konfiguracji
    description?: string;                // Opis konfiguracji
    components: ObjectiveComponent[];    // Lista komponentów
    aggregationStrategy: AggregationStrategy; // Strategia agregacji
    marketAdaptation?: {                 // Adaptacja do warunków rynkowych
        enabled: boolean;
        conditions: Record<MarketCondition, Partial<ObjectiveConfiguration>>;
    };
    constraints?: {                      // Ograniczenia
        name: string;
        type: 'hard' | 'soft';
        expression: string;
        penalty?: number;
    }[];
    metadata?: Record<string, any>;      // Dodatkowe metadane
}

/**
 * Wyniki oceny funkcji celu
 */
export interface ObjectiveEvaluation {
    totalScore: number;                  // Łączny wynik
    componentScores: Record<string, number>; // Wyniki komponentów
    penalties: Record<string, number>;   // Kary
    marketCondition?: MarketCondition;   // Wykryte warunki rynkowe
    adaptedWeights?: Record<string, number>; // Dostosowane wagi
    constraints: {                       // Status ograniczeń
        satisfied: boolean;
        violations: string[];
    };
    metadata: {
        evaluationTime: number;
        dataQuality: number;
        confidence: number;
    };
}

/**
 * Dane historyczne do oceny strategii
 */
export interface StrategyPerformanceData {
    returns: number[];                   // Zwroty (dzienna/okresowa)
    prices: number[];                    // Ceny
    volumes?: number[];                  // Wolumeny
    positions: number[];                 // Pozycje (-1, 0, 1)
    equity: number[];                    // Wartość equity
    trades: {                           // Lista transakcji
        timestamp: number;
        type: 'buy' | 'sell';
        price: number;
        quantity: number;
        cost: number;
    }[];
    timestamps: number[];               // Znaczniki czasu
}

/**
 * Manager funkcji celu
 */
class ObjectiveFunctionManager {
    private configurations: Map<string, ObjectiveConfiguration> = new Map();
    private evaluationCache: Map<string, ObjectiveEvaluation> = new Map();
    private marketDetector: MarketConditionDetector;
    private performanceCalculator: PerformanceCalculator;

    constructor() {
        this.marketDetector = new MarketConditionDetector();
        this.performanceCalculator = new PerformanceCalculator();
        this.loadDefaultConfigurations();
    }

    /**
     * Tworzy nową konfigurację funkcji celu
     */
    createConfiguration(config: ObjectiveConfiguration): string {
        // Walidacja konfiguracji
        this.validateConfiguration(config);
        
        // Normalizacja wag
        this.normalizeWeights(config);
        
        // Zapisz konfigurację
        this.configurations.set(config.name, config);
        this.saveConfiguration(config);
        
        console.log(`✅ Created objective configuration: ${config.name}`);
        return config.name;
    }

    /**
     * Ocenia strategię używając funkcji celu
     */
    async evaluateStrategy(
        configName: string,
        performanceData: StrategyPerformanceData,
        parameters?: Record<string, any>
    ): Promise<ObjectiveEvaluation> {
        const config = this.configurations.get(configName);
        if (!config) {
            throw new Error(`Configuration ${configName} not found`);
        }

        // Cache key dla optymalizacji
        const cacheKey = this.generateCacheKey(configName, performanceData, parameters);
        if (this.evaluationCache.has(cacheKey)) {
            return this.evaluationCache.get(cacheKey)!;
        }

        const startTime = Date.now();

        // Wykryj warunki rynkowe
        const marketCondition = await this.marketDetector.detectCondition(performanceData);
        
        // Adaptuj konfigurację do warunków rynkowych
        const adaptedConfig = this.adaptConfigurationToMarket(config, marketCondition);

        // Oblicz komponenty funkcji celu
        const componentScores: Record<string, number> = {};
        const penalties: Record<string, number> = {};

        for (const component of adaptedConfig.components) {
            const score = await this.evaluateComponent(component, performanceData, parameters);
            componentScores[component.name] = score.value;
            if (score.penalty > 0) {
                penalties[component.name] = score.penalty;
            }
        }

        // Agreguj wyniki
        const totalScore = this.aggregateScores(
            componentScores,
            adaptedConfig.components,
            adaptedConfig.aggregationStrategy
        );

        // Sprawdź ograniczenia
        const constraintCheck = this.checkConstraints(
            adaptedConfig.constraints || [],
            componentScores,
            performanceData,
            parameters
        );

        // Zastosuj kary za naruszenie ograniczeń
        const finalScore = totalScore - Object.values(penalties).reduce((sum, p) => sum + p, 0);

        const evaluation: ObjectiveEvaluation = {
            totalScore: finalScore,
            componentScores,
            penalties,
            marketCondition,
            adaptedWeights: this.extractWeights(adaptedConfig.components),
            constraints: constraintCheck,
            metadata: {
                evaluationTime: Date.now() - startTime,
                dataQuality: this.assessDataQuality(performanceData),
                confidence: this.calculateConfidence(performanceData, componentScores)
            }
        };

        // Cache wynik
        this.evaluationCache.set(cacheKey, evaluation);

        return evaluation;
    }

    /**
     * Ocenia pojedynczy komponent funkcji celu
     */
    private async evaluateComponent(
        component: ObjectiveComponent,
        data: StrategyPerformanceData,
        parameters?: Record<string, any>
    ): Promise<{ value: number; penalty: number }> {
        let rawValue: number;

        // Oblicz wartość surową w zależności od typu komponenty
        switch (component.type) {
            case ObjectiveComponentType.PROFIT:
                rawValue = this.performanceCalculator.calculateProfit(data);
                break;
            case ObjectiveComponentType.RISK:
                rawValue = this.performanceCalculator.calculateRisk(data);
                break;
            case ObjectiveComponentType.STABILITY:
                rawValue = this.performanceCalculator.calculateStability(data);
                break;
            case ObjectiveComponentType.EFFICIENCY:
                rawValue = this.performanceCalculator.calculateEfficiency(data);
                break;
            case ObjectiveComponentType.ROBUSTNESS:
                rawValue = this.performanceCalculator.calculateRobustness(data, parameters);
                break;
            case ObjectiveComponentType.LIQUIDITY:
                rawValue = this.performanceCalculator.calculateLiquidity(data);
                break;
            case ObjectiveComponentType.TRANSACTION_COSTS:
                rawValue = this.performanceCalculator.calculateTransactionCosts(data);
                break;
            case ObjectiveComponentType.MARKET_IMPACT:
                rawValue = this.performanceCalculator.calculateMarketImpact(data);
                break;
            default:
                throw new Error(`Unknown component type: ${component.type}`);
        }

        // Zastosuj transformację jeśli zdefiniowana
        const transformedValue = this.applyTransformation(rawValue, component.transformation);

        // Oblicz karę jeśli wartość wykracza poza progi
        const penalty = this.calculatePenalty(transformedValue, component);

        return {
            value: transformedValue,
            penalty: penalty
        };
    }

    /**
     * Agreguje wyniki komponentów
     */
    private aggregateScores(
        scores: Record<string, number>,
        components: ObjectiveComponent[],
        strategy: AggregationStrategy
    ): number {
        const weightedScores = components.map(comp => ({
            score: scores[comp.name] || 0,
            weight: comp.weight
        }));

        switch (strategy) {
            case AggregationStrategy.WEIGHTED_SUM:
                return weightedScores.reduce((sum, item) => sum + item.score * item.weight, 0);
                
            case AggregationStrategy.GEOMETRIC_MEAN:
                const product = weightedScores.reduce((prod, item) => 
                    prod * Math.pow(Math.max(0.001, item.score), item.weight), 1);
                return Math.pow(product, 1 / weightedScores.reduce((sum, item) => sum + item.weight, 0));
                
            case AggregationStrategy.HARMONIC_MEAN:
                const harmonicSum = weightedScores.reduce((sum, item) => 
                    sum + item.weight / Math.max(0.001, item.score), 0);
                const totalWeight = weightedScores.reduce((sum, item) => sum + item.weight, 0);
                return totalWeight / harmonicSum;
                
            case AggregationStrategy.MIN_MAX:
                return Math.min(...weightedScores.map(item => item.score * item.weight));
                
            default:
                return weightedScores.reduce((sum, item) => sum + item.score * item.weight, 0);
        }
    }

    /**
     * Adaptuje konfigurację do warunków rynkowych
     */
    private adaptConfigurationToMarket(
        config: ObjectiveConfiguration,
        marketCondition: MarketCondition
    ): ObjectiveConfiguration {
        if (!config.marketAdaptation?.enabled || !config.marketAdaptation.conditions[marketCondition]) {
            return config;
        }

        const adaptation = config.marketAdaptation.conditions[marketCondition];
        const adaptedConfig = JSON.parse(JSON.stringify(config)); // Deep clone

        // Zastosuj adaptacje
        if (adaptation.components) {
            adaptation.components.forEach((adaptComponent, index) => {
                if (adaptedConfig.components[index]) {
                    Object.assign(adaptedConfig.components[index], adaptComponent);
                }
            });
        }

        return adaptedConfig;
    }

    /**
     * Zastosuj transformację do wartości
     */
    private applyTransformation(
        value: number,
        transformation?: ObjectiveComponent['transformation']
    ): number {
        if (!transformation) return value;

        switch (transformation.type) {
            case 'linear':
                const a = transformation.parameters?.a || 1;
                const b = transformation.parameters?.b || 0;
                return a * value + b;
                
            case 'log':
                return Math.log(Math.max(0.001, value));
                
            case 'sqrt':
                return Math.sqrt(Math.max(0, value));
                
            case 'sigmoid':
                const k = transformation.parameters?.k || 1;
                const x0 = transformation.parameters?.x0 || 0;
                return 1 / (1 + Math.exp(-k * (value - x0)));
                
            default:
                return value;
        }
    }

    /**
     * Oblicz karę za naruszenie progów
     */
    private calculatePenalty(
        value: number,
        component: ObjectiveComponent
    ): number {
        if (!component.threshold && !component.penaltyFunction) return 0;

        let violation = 0;

        // Sprawdź naruszenie progów
        if (component.threshold) {
            if (component.threshold.min !== undefined && value < component.threshold.min) {
                violation = component.threshold.min - value;
            }
            if (component.threshold.max !== undefined && value > component.threshold.max) {
                violation = value - component.threshold.max;
            }
        }

        if (violation === 0) return 0;

        // Zastosuj funkcję kary
        if (component.penaltyFunction) {
            switch (component.penaltyFunction.type) {
                case 'linear':
                    const factor = component.penaltyFunction.parameters?.factor || 1;
                    return factor * Math.abs(violation);
                    
                case 'quadratic':
                    const quadFactor = component.penaltyFunction.parameters?.factor || 1;
                    return quadFactor * violation * violation;
                    
                case 'exponential':
                    const expFactor = component.penaltyFunction.parameters?.factor || 1;
                    const expBase = component.penaltyFunction.parameters?.base || Math.E;
                    return expFactor * (Math.pow(expBase, Math.abs(violation)) - 1);
                    
                default:
                    return Math.abs(violation);
            }
        }

        return Math.abs(violation);
    }

    /**
     * Sprawdź ograniczenia
     */
    private checkConstraints(
        constraints: ObjectiveConfiguration['constraints'],
        scores: Record<string, number>,
        data: StrategyPerformanceData,
        parameters?: Record<string, any>
    ): { satisfied: boolean; violations: string[] } {
        if (!constraints) return { satisfied: true, violations: [] };

        const violations: string[] = [];

        for (const constraint of constraints) {
            try {
                // Proste sprawdzenie ograniczeń (w prawdziwej implementacji użyłbyś parser wyrażeń)
                const satisfied = this.evaluateConstraintExpression(
                    constraint.expression,
                    scores,
                    data,
                    parameters
                );

                if (!satisfied) {
                    violations.push(constraint.name);
                }
            } catch (error) {
                console.warn(`Failed to evaluate constraint ${constraint.name}:`, error);
                violations.push(constraint.name);
            }
        }

        return {
            satisfied: violations.length === 0,
            violations
        };
    }

    /**
     * Ocenia wyrażenie ograniczenia (uproszczona implementacja)
     */
    private evaluateConstraintExpression(
        expression: string,
        scores: Record<string, number>,
        data: StrategyPerformanceData,
        parameters?: Record<string, any>
    ): boolean {
        // Uproszczona implementacja - w produkcji użyj właściwego parser'a wyrażeń
        // Na przykład: "profit > 0.1 AND risk < 0.2"
        
        // Zastąp nazwy zmiennych wartościami
        let evaluableExpression = expression;
        
        // Zastąp score components
        for (const [name, value] of Object.entries(scores)) {
            evaluableExpression = evaluableExpression.replace(
                new RegExp(`\\b${name}\\b`, 'g'),
                value.toString()
            );
        }

        // Dodaj podstawowe metryki
        const totalReturn = data.returns.reduce((sum, r) => sum + r, 0);
        const maxDrawdown = this.performanceCalculator.calculateMaxDrawdown(data.equity);
        
        evaluableExpression = evaluableExpression
            .replace(/\btotalReturn\b/g, totalReturn.toString())
            .replace(/\bmaxDrawdown\b/g, maxDrawdown.toString())
            .replace(/\bAND\b/g, '&&')
            .replace(/\bOR\b/g, '||');

        try {
            return eval(evaluableExpression);
        } catch {
            return false;
        }
    }

    /**
     * Waliduje konfigurację
     */
    private validateConfiguration(config: ObjectiveConfiguration): void {
        if (!config.name || config.name.trim() === '') {
            throw new Error('Configuration name is required');
        }

        if (!config.components || config.components.length === 0) {
            throw new Error('At least one component is required');
        }

        // Sprawdź czy suma wag wynosi 1
        const totalWeight = config.components.reduce((sum, comp) => sum + comp.weight, 0);
        if (Math.abs(totalWeight - 1) > 0.001) {
            console.warn(`Total weight is ${totalWeight}, will be normalized to 1`);
        }

        // Sprawdź unikalność nazw komponentów
        const names = config.components.map(comp => comp.name);
        const uniqueNames = new Set(names);
        if (names.length !== uniqueNames.size) {
            throw new Error('Component names must be unique');
        }
    }

    /**
     * Normalizuje wagi komponentów
     */
    private normalizeWeights(config: ObjectiveConfiguration): void {
        const totalWeight = config.components.reduce((sum, comp) => sum + comp.weight, 0);
        if (totalWeight !== 1) {
            config.components.forEach(comp => {
                comp.weight = comp.weight / totalWeight;
            });
        }
    }

    /**
     * Ładuje domyślne konfiguracje
     */
    private loadDefaultConfigurations(): void {
        // Balanced trading objective
        this.createConfiguration({
            name: 'balanced_trading',
            description: 'Balanced objective for general trading strategies',
            components: [
                {
                    type: ObjectiveComponentType.PROFIT,
                    name: 'profit',
                    weight: 0.4,
                    transformation: { type: 'linear', parameters: { a: 1, b: 0 } }
                },
                {
                    type: ObjectiveComponentType.RISK,
                    name: 'risk',
                    weight: 0.3,
                    transformation: { type: 'linear', parameters: { a: -1, b: 0 } } // Negatywne bo minimalizujemy ryzyko
                },
                {
                    type: ObjectiveComponentType.STABILITY,
                    name: 'stability',
                    weight: 0.2
                },
                {
                    type: ObjectiveComponentType.EFFICIENCY,
                    name: 'efficiency',
                    weight: 0.1
                }
            ],
            aggregationStrategy: AggregationStrategy.WEIGHTED_SUM
        });

        // Conservative objective
        this.createConfiguration({
            name: 'conservative',
            description: 'Conservative objective focusing on risk management',
            components: [
                {
                    type: ObjectiveComponentType.RISK,
                    name: 'risk',
                    weight: 0.5,
                    transformation: { type: 'linear', parameters: { a: -1, b: 0 } }
                },
                {
                    type: ObjectiveComponentType.STABILITY,
                    name: 'stability',
                    weight: 0.3
                },
                {
                    type: ObjectiveComponentType.PROFIT,
                    name: 'profit',
                    weight: 0.2
                }
            ],
            aggregationStrategy: AggregationStrategy.WEIGHTED_SUM
        });

        // Aggressive objective
        this.createConfiguration({
            name: 'aggressive',
            description: 'Aggressive objective focusing on maximum returns',
            components: [
                {
                    type: ObjectiveComponentType.PROFIT,
                    name: 'profit',
                    weight: 0.7
                },
                {
                    type: ObjectiveComponentType.EFFICIENCY,
                    name: 'efficiency',
                    weight: 0.2
                },
                {
                    type: ObjectiveComponentType.RISK,
                    name: 'risk',
                    weight: 0.1,
                    transformation: { type: 'linear', parameters: { a: -0.5, b: 0 } }
                }
            ],
            aggregationStrategy: AggregationStrategy.WEIGHTED_SUM
        });
    }

    /**
     * Pomocnicze metody
     */
    private generateCacheKey(configName: string, data: StrategyPerformanceData, parameters?: Record<string, any>): string {
        const dataHash = this.hashPerformanceData(data);
        const paramHash = parameters ? JSON.stringify(parameters) : '';
        return `${configName}_${dataHash}_${paramHash}`;
    }

    private hashPerformanceData(data: StrategyPerformanceData): string {
        // Uproszczony hash
        const key = `${data.returns.length}_${data.returns[0] || 0}_${data.returns[data.returns.length - 1] || 0}`;
        return Buffer.from(key).toString('base64').slice(0, 10);
    }

    private extractWeights(components: ObjectiveComponent[]): Record<string, number> {
        const weights: Record<string, number> = {};
        components.forEach(comp => {
            weights[comp.name] = comp.weight;
        });
        return weights;
    }

    private assessDataQuality(data: StrategyPerformanceData): number {
        // Uproszczona ocena jakości danych
        let quality = 1.0;
        
        if (data.returns.length < 100) quality *= 0.8;
        if (data.trades.length < 10) quality *= 0.9;
        
        const missingData = data.returns.filter(r => isNaN(r) || r === null).length;
        quality *= (1 - missingData / data.returns.length);
        
        return Math.max(0, Math.min(1, quality));
    }

    private calculateConfidence(data: StrategyPerformanceData, scores: Record<string, number>): number {
        // Uproszczona kalkulacja pewności
        const dataLength = data.returns.length;
        const scoreVariability = Object.values(scores).reduce((sum, score, _, arr) => {
            const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
            return sum + Math.abs(score - mean);
        }, 0) / Object.values(scores).length;
        
        const confidence = Math.min(1, (dataLength / 1000) * (1 - scoreVariability / 10));
        return Math.max(0, confidence);
    }

    private saveConfiguration(config: ObjectiveConfiguration): void {
        const configDir = path.join(__dirname, '..', 'config', 'objectives');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        const filePath = path.join(configDir, `${config.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    }

    /**
     * Pobierz konfigurację
     */
    getConfiguration(name: string): ObjectiveConfiguration | undefined {
        return this.configurations.get(name);
    }

    /**
     * Lista dostępnych konfiguracji
     */
    listConfigurations(): string[] {
        return Array.from(this.configurations.keys());
    }

    /**
     * Usuń konfigurację
     */
    removeConfiguration(name: string): boolean {
        return this.configurations.delete(name);
    }
}

/**
 * Detektor warunków rynkowych
 */
class MarketConditionDetector {
    async detectCondition(data: StrategyPerformanceData): Promise<MarketCondition> {
        const returns = data.returns;
        const recentReturns = returns.slice(-30); // Ostatnie 30 okresów
        
        const avgReturn = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
        const volatility = this.calculateVolatility(recentReturns);
        
        // Prosta logika klasyfikacji
        if (volatility > 0.03) {
            return MarketCondition.HIGH_VOLATILITY;
        } else if (volatility < 0.01) {
            return MarketCondition.LOW_VOLATILITY;
        } else if (avgReturn > 0.002) {
            return MarketCondition.BULL_MARKET;
        } else if (avgReturn < -0.002) {
            return MarketCondition.BEAR_MARKET;
        } else {
            return MarketCondition.SIDEWAYS;
        }
    }

    private calculateVolatility(returns: number[]): number {
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }
}

/**
 * Kalkulator wydajności
 */
class PerformanceCalculator {
    calculateProfit(data: StrategyPerformanceData): number {
        // Całkowity zwrot
        const totalReturn = data.returns.reduce((sum, r) => sum + r, 0);
        return totalReturn;
    }

    calculateRisk(data: StrategyPerformanceData): number {
        // Volatilność zwrotów
        const returns = data.returns;
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    calculateStability(data: StrategyPerformanceData): number {
        // Współczynnik Sharpe'a jako miera stabilności
        const returns = data.returns;
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const volatility = this.calculateRisk(data);
        
        return volatility > 0 ? avgReturn / volatility : 0;
    }

    calculateEfficiency(data: StrategyPerformanceData): number {
        // Zwrot na jednostkę maksymalnego drawdown
        const totalReturn = this.calculateProfit(data);
        const maxDrawdown = this.calculateMaxDrawdown(data.equity);
        
        return maxDrawdown > 0 ? totalReturn / maxDrawdown : totalReturn;
    }

    calculateRobustness(data: StrategyPerformanceData, parameters?: Record<string, any>): number {
        // Procent zyskownych transakcji
        const profitableTrades = data.trades.filter((trade, index) => {
            if (index === 0) return false;
            const prevTrade = data.trades[index - 1];
            return (trade.price - prevTrade.price) * prevTrade.quantity > 0;
        });
        
        return data.trades.length > 0 ? profitableTrades.length / data.trades.length : 0;
    }

    calculateLiquidity(data: StrategyPerformanceData): number {
        // Średni wolumen jako proxy płynności
        if (!data.volumes || data.volumes.length === 0) return 1;
        return data.volumes.reduce((sum, v) => sum + v, 0) / data.volumes.length;
    }

    calculateTransactionCosts(data: StrategyPerformanceData): number {
        // Suma kosztów transakcyjnych
        return data.trades.reduce((sum, trade) => sum + trade.cost, 0);
    }

    calculateMarketImpact(data: StrategyPerformanceData): number {
        // Uproszczona miara wpływu na rynek
        const totalVolume = data.trades.reduce((sum, trade) => sum + trade.quantity, 0);
        const avgMarketVolume = data.volumes ? 
            data.volumes.reduce((sum, v) => sum + v, 0) / data.volumes.length : 1000000;
        
        return totalVolume / avgMarketVolume;
    }

    calculateMaxDrawdown(equity: number[]): number {
        let maxDrawdown = 0;
        let peak = equity[0] || 0;
        
        for (const value of equity) {
            if (value > peak) {
                peak = value;
            }
            const drawdown = (peak - value) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        
        return maxDrawdown;
    }
}

// Export głównych klas
export {
    ObjectiveFunctionManager,
    MarketConditionDetector,
    PerformanceCalculator
};
