"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexObjectiveDemo = void 0;
const complex_objective_functions_1 = require("./complex_objective_functions");
/**
 * Demonstracja systemu złożonych funkcji celu
 * Faza 3.1: Definiowanie Złożonych Funkcji Celu
 */
class ComplexObjectiveDemo {
    constructor() {
        this.objectiveManager = new complex_objective_functions_1.ObjectiveFunctionManager();
        this.marketDetector = new complex_objective_functions_1.MarketConditionDetector();
        this.perfCalculator = new complex_objective_functions_1.PerformanceCalculator();
    }
    /**
     * Demo 1: Podstawowe funkcje celu
     */
    async demoBasicObjectiveFunctions() {
        console.log('\n🎯 Demo 1: Basic Multi-Criteria Objective Functions');
        console.log('='.repeat(60));
        // Przygotuj dane testowe
        const performanceData = this.generateTestPerformanceData('stable_growth');
        console.log('\n📊 Testing default objective configurations:');
        const configs = ['balanced_trading', 'conservative', 'aggressive'];
        for (const configName of configs) {
            console.log(`\n🔍 Evaluating ${configName} objective:`);
            const evaluation = await this.objectiveManager.evaluateStrategy(configName, performanceData);
            console.log(`   📈 Total Score: ${evaluation.totalScore.toFixed(4)}`);
            console.log(`   🧮 Component Scores:`);
            Object.entries(evaluation.componentScores).forEach(([name, score]) => {
                console.log(`      ${name}: ${score.toFixed(4)}`);
            });
            if (Object.keys(evaluation.penalties).length > 0) {
                console.log(`   ⚠️  Penalties:`);
                Object.entries(evaluation.penalties).forEach(([name, penalty]) => {
                    console.log(`      ${name}: -${penalty.toFixed(4)}`);
                });
            }
            console.log(`   🌍 Market Condition: ${evaluation.marketCondition}`);
            console.log(`   ⏱️  Evaluation Time: ${evaluation.metadata.evaluationTime}ms`);
            console.log(`   📊 Data Quality: ${(evaluation.metadata.dataQuality * 100).toFixed(1)}%`);
            console.log(`   🎯 Confidence: ${(evaluation.metadata.confidence * 100).toFixed(1)}%`);
        }
    }
    /**
     * Demo 2: Niestandardowe funkcje celu
     */
    async demoCustomObjectiveFunctions() {
        console.log('\n🛠️  Demo 2: Custom Multi-Criteria Objectives');
        console.log('='.repeat(60));
        // Stwórz niestandardową funkcję celu dla high-frequency trading
        const hftObjective = {
            name: 'high_frequency_trading',
            description: 'Objective optimized for high-frequency trading strategies',
            components: [
                {
                    type: complex_objective_functions_1.ObjectiveComponentType.PROFIT,
                    name: 'profit',
                    weight: 0.25,
                    threshold: { min: 0.001 }, // Minimum profit threshold
                    transformation: { type: 'sqrt' } // Square root to reduce outlier impact
                },
                {
                    type: complex_objective_functions_1.ObjectiveComponentType.EFFICIENCY,
                    name: 'efficiency',
                    weight: 0.30,
                    transformation: { type: 'log' }
                },
                {
                    type: complex_objective_functions_1.ObjectiveComponentType.TRANSACTION_COSTS,
                    name: 'transaction_costs',
                    weight: 0.25,
                    transformation: { type: 'linear', parameters: { a: -1, b: 0 } }, // Minimize costs
                    penaltyFunction: { type: 'exponential', parameters: { factor: 2, base: 2 } }
                },
                {
                    type: complex_objective_functions_1.ObjectiveComponentType.MARKET_IMPACT,
                    name: 'market_impact',
                    weight: 0.20,
                    transformation: { type: 'linear', parameters: { a: -1, b: 0 } }, // Minimize impact
                    threshold: { max: 0.01 }
                }
            ],
            aggregationStrategy: complex_objective_functions_1.AggregationStrategy.WEIGHTED_SUM,
            constraints: [
                {
                    name: 'min_profitability',
                    type: 'hard',
                    expression: 'profit > 0 AND efficiency > 0.5'
                },
                {
                    name: 'cost_control',
                    type: 'soft',
                    expression: 'transaction_costs < 0.001',
                    penalty: 10
                }
            ]
        };
        console.log('\n🎯 Creating HFT objective function...');
        this.objectiveManager.createConfiguration(hftObjective);
        // Test z różnymi typami danych
        const dataTypes = ['high_frequency', 'volatile_market', 'low_volume'];
        for (const dataType of dataTypes) {
            console.log(`\n📊 Testing with ${dataType} data:`);
            const testData = this.generateTestPerformanceData(dataType);
            const evaluation = await this.objectiveManager.evaluateStrategy('high_frequency_trading', testData);
            console.log(`   📈 Total Score: ${evaluation.totalScore.toFixed(4)}`);
            console.log(`   🧮 Component breakdown:`);
            Object.entries(evaluation.componentScores).forEach(([name, score]) => {
                const component = hftObjective.components.find(c => c.name === name);
                const weight = component?.weight || 0;
                const contribution = score * weight;
                console.log(`      ${name}: ${score.toFixed(4)} (weight: ${weight}, contribution: ${contribution.toFixed(4)})`);
            });
            console.log(`   ⚖️  Constraints: ${evaluation.constraints.satisfied ? '✅ Satisfied' : '❌ Violated'}`);
            if (!evaluation.constraints.satisfied) {
                console.log(`      Violations: ${evaluation.constraints.violations.join(', ')}`);
            }
        }
    }
    /**
     * Demo 3: Adaptacja do warunków rynkowych
     */
    async demoMarketAdaptiveObjectives() {
        console.log('\n🌍 Demo 3: Market-Adaptive Objective Functions');
        console.log('='.repeat(60));
        // Stwórz adaptacyjną funkcję celu
        const adaptiveObjective = {
            name: 'market_adaptive',
            description: 'Objective that adapts to market conditions',
            components: [
                {
                    type: complex_objective_functions_1.ObjectiveComponentType.PROFIT,
                    name: 'profit',
                    weight: 0.4
                },
                {
                    type: complex_objective_functions_1.ObjectiveComponentType.RISK,
                    name: 'risk',
                    weight: 0.3,
                    transformation: { type: 'linear', parameters: { a: -1, b: 0 } }
                },
                {
                    type: complex_objective_functions_1.ObjectiveComponentType.STABILITY,
                    name: 'stability',
                    weight: 0.2
                },
                {
                    type: complex_objective_functions_1.ObjectiveComponentType.ROBUSTNESS,
                    name: 'robustness',
                    weight: 0.1
                }
            ],
            aggregationStrategy: complex_objective_functions_1.AggregationStrategy.WEIGHTED_SUM,
            marketAdaptation: {
                enabled: true,
                conditions: {
                    [complex_objective_functions_1.MarketCondition.BULL_MARKET]: {
                        // W hossie zwiększ wagę zysku, zmniejsz ryzyko
                        aggregationStrategy: complex_objective_functions_1.AggregationStrategy.WEIGHTED_SUM
                    },
                    [complex_objective_functions_1.MarketCondition.BEAR_MARKET]: {
                        // W bessie zwiększ wagę ryzyka, zmniejsz zysk
                        aggregationStrategy: complex_objective_functions_1.AggregationStrategy.WEIGHTED_SUM
                    },
                    [complex_objective_functions_1.MarketCondition.HIGH_VOLATILITY]: {
                        // W wysokiej zmienności zwiększ wagę stabilności
                        aggregationStrategy: complex_objective_functions_1.AggregationStrategy.HARMONIC_MEAN
                    },
                    [complex_objective_functions_1.MarketCondition.LOW_VOLATILITY]: {
                        aggregationStrategy: complex_objective_functions_1.AggregationStrategy.WEIGHTED_SUM
                    },
                    [complex_objective_functions_1.MarketCondition.SIDEWAYS]: {
                        // W rynku bocznym zwiększ wagę stabilności
                        aggregationStrategy: complex_objective_functions_1.AggregationStrategy.GEOMETRIC_MEAN
                    },
                    [complex_objective_functions_1.MarketCondition.CRISIS]: {
                        aggregationStrategy: complex_objective_functions_1.AggregationStrategy.HARMONIC_MEAN
                    },
                    [complex_objective_functions_1.MarketCondition.RECOVERY]: {
                        aggregationStrategy: complex_objective_functions_1.AggregationStrategy.WEIGHTED_SUM
                    }
                }
            }
        };
        console.log('\n🎯 Creating market-adaptive objective...');
        this.objectiveManager.createConfiguration(adaptiveObjective);
        // Testuj różne warunki rynkowe
        const marketScenarios = [
            { condition: 'bull_market', description: 'Bull Market (Rising Trend)' },
            { condition: 'bear_market', description: 'Bear Market (Falling Trend)' },
            { condition: 'high_volatility', description: 'High Volatility Period' },
            { condition: 'sideways', description: 'Sideways Market' },
            { condition: 'crisis', description: 'Crisis Conditions' }
        ];
        for (const scenario of marketScenarios) {
            console.log(`\n📈 Testing ${scenario.description}:`);
            const testData = this.generateTestPerformanceData(scenario.condition);
            const evaluation = await this.objectiveManager.evaluateStrategy('market_adaptive', testData);
            console.log(`   🌍 Detected Condition: ${evaluation.marketCondition}`);
            console.log(`   📊 Total Score: ${evaluation.totalScore.toFixed(4)}`);
            if (evaluation.adaptedWeights) {
                console.log(`   ⚖️  Adapted Weights:`);
                Object.entries(evaluation.adaptedWeights).forEach(([name, weight]) => {
                    console.log(`      ${name}: ${(weight * 100).toFixed(1)}%`);
                });
            }
            console.log(`   🧮 Performance Metrics:`);
            Object.entries(evaluation.componentScores).forEach(([name, score]) => {
                console.log(`      ${name}: ${score.toFixed(4)}`);
            });
        }
    }
    /**
     * Demo 4: Różne strategie agregacji
     */
    async demoAggregationStrategies() {
        console.log('\n🔢 Demo 4: Different Aggregation Strategies');
        console.log('='.repeat(60));
        const baseComponents = [
            {
                type: complex_objective_functions_1.ObjectiveComponentType.PROFIT,
                name: 'profit',
                weight: 0.4
            },
            {
                type: complex_objective_functions_1.ObjectiveComponentType.RISK,
                name: 'risk',
                weight: 0.3,
                transformation: { type: 'linear', parameters: { a: -1, b: 0 } }
            },
            {
                type: complex_objective_functions_1.ObjectiveComponentType.STABILITY,
                name: 'stability',
                weight: 0.2
            },
            {
                type: complex_objective_functions_1.ObjectiveComponentType.EFFICIENCY,
                name: 'efficiency',
                weight: 0.1
            }
        ];
        const aggregationStrategies = [
            complex_objective_functions_1.AggregationStrategy.WEIGHTED_SUM,
            complex_objective_functions_1.AggregationStrategy.GEOMETRIC_MEAN,
            complex_objective_functions_1.AggregationStrategy.HARMONIC_MEAN,
            complex_objective_functions_1.AggregationStrategy.MIN_MAX
        ];
        const testData = this.generateTestPerformanceData('balanced');
        console.log('\n📊 Comparing aggregation strategies:');
        console.log('Strategy'.padEnd(20) + 'Score'.padEnd(12) + 'Description');
        console.log('-'.repeat(60));
        for (const strategy of aggregationStrategies) {
            const config = {
                name: `test_${strategy}`,
                description: `Test configuration with ${strategy}`,
                components: baseComponents,
                aggregationStrategy: strategy
            };
            this.objectiveManager.createConfiguration(config);
            const evaluation = await this.objectiveManager.evaluateStrategy(config.name, testData);
            let description = '';
            switch (strategy) {
                case complex_objective_functions_1.AggregationStrategy.WEIGHTED_SUM:
                    description = 'Linear combination';
                    break;
                case complex_objective_functions_1.AggregationStrategy.GEOMETRIC_MEAN:
                    description = 'Balanced performance';
                    break;
                case complex_objective_functions_1.AggregationStrategy.HARMONIC_MEAN:
                    description = 'Penalizes poor components';
                    break;
                case complex_objective_functions_1.AggregationStrategy.MIN_MAX:
                    description = 'Conservative (worst case)';
                    break;
            }
            console.log(strategy.padEnd(20) +
                evaluation.totalScore.toFixed(4).padEnd(12) +
                description);
        }
    }
    /**
     * Demo 5: Analiza wrażliwości
     */
    async demoSensitivityAnalysis() {
        console.log('\n🔍 Demo 5: Sensitivity Analysis');
        console.log('='.repeat(60));
        const baseData = this.generateTestPerformanceData('balanced');
        console.log('\n📊 Testing sensitivity to component weights:');
        // Test różnych rozkładów wag
        const weightDistributions = [
            { name: 'Profit-focused', weights: [0.7, 0.1, 0.1, 0.1] },
            { name: 'Risk-focused', weights: [0.1, 0.7, 0.1, 0.1] },
            { name: 'Stability-focused', weights: [0.1, 0.1, 0.7, 0.1] },
            { name: 'Balanced', weights: [0.25, 0.25, 0.25, 0.25] }
        ];
        for (const distribution of weightDistributions) {
            const config = {
                name: `sensitivity_${distribution.name.toLowerCase().replace('-', '_')}`,
                description: `Sensitivity test: ${distribution.name}`,
                components: [
                    {
                        type: complex_objective_functions_1.ObjectiveComponentType.PROFIT,
                        name: 'profit',
                        weight: distribution.weights[0]
                    },
                    {
                        type: complex_objective_functions_1.ObjectiveComponentType.RISK,
                        name: 'risk',
                        weight: distribution.weights[1],
                        transformation: { type: 'linear', parameters: { a: -1, b: 0 } }
                    },
                    {
                        type: complex_objective_functions_1.ObjectiveComponentType.STABILITY,
                        name: 'stability',
                        weight: distribution.weights[2]
                    },
                    {
                        type: complex_objective_functions_1.ObjectiveComponentType.EFFICIENCY,
                        name: 'efficiency',
                        weight: distribution.weights[3]
                    }
                ],
                aggregationStrategy: complex_objective_functions_1.AggregationStrategy.WEIGHTED_SUM
            };
            this.objectiveManager.createConfiguration(config);
            const evaluation = await this.objectiveManager.evaluateStrategy(config.name, baseData);
            console.log(`\n${distribution.name}:`);
            console.log(`   📈 Total Score: ${evaluation.totalScore.toFixed(4)}`);
            console.log(`   ⚖️  Weight Distribution: [${distribution.weights.map(w => (w * 100).toFixed(0) + '%').join(', ')}]`);
            // Pokaż który komponent ma największy wpływ
            let maxContribution = -Infinity;
            let maxComponent = '';
            Object.entries(evaluation.componentScores).forEach(([name, score], index) => {
                const contribution = score * distribution.weights[index];
                if (contribution > maxContribution) {
                    maxContribution = contribution;
                    maxComponent = name;
                }
            });
            console.log(`   🎯 Dominant Component: ${maxComponent} (${maxContribution.toFixed(4)})`);
        }
    }
    /**
     * Generuje testowe dane wydajności
     */
    generateTestPerformanceData(scenario) {
        const periods = 252; // Rok danych dziennych
        const returns = [];
        const prices = [];
        const volumes = [];
        const positions = [];
        const equity = [];
        const trades = [];
        const timestamps = [];
        let currentPrice = 100;
        let currentEquity = 10000;
        let currentPosition = 0;
        for (let i = 0; i < periods; i++) {
            const timestamp = Date.now() - (periods - i) * 24 * 60 * 60 * 1000;
            timestamps.push(timestamp);
            // Generuj zwroty w zależności od scenariusza
            let dailyReturn = 0;
            switch (scenario) {
                case 'stable_growth':
                    dailyReturn = 0.0005 + (Math.random() - 0.5) * 0.01;
                    break;
                case 'bull_market':
                    dailyReturn = 0.001 + (Math.random() - 0.3) * 0.015;
                    break;
                case 'bear_market':
                    dailyReturn = -0.001 + (Math.random() - 0.7) * 0.015;
                    break;
                case 'high_volatility':
                    dailyReturn = (Math.random() - 0.5) * 0.03;
                    break;
                case 'high_frequency':
                    dailyReturn = (Math.random() - 0.5) * 0.001;
                    break;
                case 'volatile_market':
                    dailyReturn = (Math.random() - 0.5) * 0.025;
                    break;
                case 'low_volume':
                    dailyReturn = (Math.random() - 0.5) * 0.005;
                    break;
                case 'sideways':
                    dailyReturn = (Math.random() - 0.5) * 0.008;
                    break;
                case 'crisis':
                    dailyReturn = -0.002 + (Math.random() - 0.8) * 0.05;
                    break;
                default:
                    dailyReturn = (Math.random() - 0.5) * 0.01;
            }
            returns.push(dailyReturn);
            currentPrice *= (1 + dailyReturn);
            prices.push(currentPrice);
            // Generuj wolumen
            const baseVolume = scenario === 'low_volume' ? 50000 :
                scenario === 'high_frequency' ? 500000 : 100000;
            volumes.push(baseVolume * (0.8 + Math.random() * 0.4));
            // Generuj pozycje (prosta strategia momentum)
            if (i > 10) {
                const recentReturns = returns.slice(-10);
                const avgReturn = recentReturns.reduce((sum, r) => sum + r, 0) / 10;
                currentPosition = avgReturn > 0 ? 1 : avgReturn < -0.001 ? -1 : 0;
            }
            positions.push(currentPosition);
            // Aktualizuj equity
            currentEquity *= (1 + dailyReturn * currentPosition);
            equity.push(currentEquity);
            // Generuj transakcje co jakiś czas
            if (i > 0 && positions[i] !== positions[i - 1]) {
                trades.push({
                    timestamp: timestamp,
                    type: currentPosition > 0 ? 'buy' : 'sell',
                    price: currentPrice,
                    quantity: Math.abs(currentPosition) * 100,
                    cost: Math.abs(currentPosition) * 100 * 0.001 // 0.1% koszt transakcji
                });
            }
        }
        return {
            returns,
            prices,
            volumes,
            positions,
            equity,
            trades,
            timestamps
        };
    }
    /**
     * Uruchom pełną demonstrację
     */
    async runCompleteDemo() {
        console.log('\n🎯 COMPLEX OBJECTIVE FUNCTIONS SYSTEM DEMO');
        console.log('🚀 Faza 3.1: Definiowanie Złożonych Funkcji Celu');
        console.log('='.repeat(80));
        try {
            await this.demoBasicObjectiveFunctions();
            await this.demoCustomObjectiveFunctions();
            await this.demoMarketAdaptiveObjectives();
            await this.demoAggregationStrategies();
            await this.demoSensitivityAnalysis();
            console.log('\n🎉 ALL OBJECTIVE FUNCTION DEMOS COMPLETED!');
            console.log('\n✅ System capabilities demonstrated:');
            console.log('   🔹 Multi-criteria objective functions (profit, risk, stability, efficiency)');
            console.log('   🔹 Weighted component aggregation with custom transformations');
            console.log('   🔹 Market-adaptive weight adjustment based on conditions');
            console.log('   🔹 Multiple aggregation strategies (weighted sum, geometric, harmonic, min-max)');
            console.log('   🔹 Constraint handling with penalty functions');
            console.log('   🔹 Sensitivity analysis and component contribution tracking');
            console.log('   🔹 Automatic market condition detection and adaptation');
            console.log('\n🚀 OBJECTIVE SYSTEM READY FOR STRATEGY OPTIMIZATION!');
        }
        catch (error) {
            console.error('❌ Demo failed:', error);
        }
    }
}
exports.ComplexObjectiveDemo = ComplexObjectiveDemo;
// Funkcja główna
async function main() {
    const demo = new ComplexObjectiveDemo();
    await demo.runCompleteDemo();
}
// Uruchom jeśli plik jest wykonywany bezpośrednio
if (require.main === module) {
    main().catch(console.error);
}
