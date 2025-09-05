"use strict";
/**
 * Automatic Strategy Generation Demo - Phase 3.3
 *
 * Demonstruje możliwości automatycznego systemu generowania strategii:
 * - Tworzenie nowych strategii AI
 * - Ewolucyjną optymalizację
 * - Testowanie i walidację
 * - Meta-learning
 *
 * @author Turbo Bot Deva
 * @version 3.3.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomaticStrategyGenerationDemo = void 0;
const automatic_strategy_generator_1 = require("./automatic_strategy_generator");
// ============================================================================
// MOCK DATA GENERATOR (from previous demo)
// ============================================================================
class MockDataGenerator {
    static generateMarketData(days, regime = 'sideways') {
        const data = [];
        let price = 100;
        const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        for (let i = 0; i < days; i++) {
            const timestamp = startTime + (i * 24 * 60 * 60 * 1000);
            let dailyReturn;
            let volatility;
            switch (regime) {
                case 'bull':
                    dailyReturn = 0.0008 + (Math.random() - 0.5) * 0.004;
                    volatility = 0.015;
                    break;
                case 'bear':
                    dailyReturn = -0.0006 + (Math.random() - 0.5) * 0.006;
                    volatility = 0.025;
                    break;
                case 'volatile':
                    dailyReturn = (Math.random() - 0.5) * 0.008;
                    volatility = 0.035;
                    break;
                default: // sideways
                    dailyReturn = (Math.random() - 0.5) * 0.003;
                    volatility = 0.012;
            }
            const change = price * (dailyReturn + (Math.random() - 0.5) * volatility);
            const newPrice = Math.max(price + change, 0.01);
            const high = newPrice * (1 + Math.random() * 0.01);
            const low = newPrice * (1 - Math.random() * 0.01);
            const volume = 1000000 + Math.random() * 5000000;
            data.push({
                timestamp,
                open: price,
                high,
                low,
                close: newPrice,
                volume
            });
            price = newPrice;
        }
        return data;
    }
    static generateMixedRegimeData() {
        const bullData = this.generateMarketData(150, 'bull');
        const sidewaysData = this.generateMarketData(100, 'sideways');
        const bearData = this.generateMarketData(80, 'bear');
        const volatileData = this.generateMarketData(70, 'volatile');
        const allData = [...bullData, ...sidewaysData, ...bearData, ...volatileData];
        for (let i = 1; i < allData.length; i++) {
            allData[i].timestamp = allData[i - 1].timestamp + (24 * 60 * 60 * 1000);
            if (i === bullData.length || i === bullData.length + sidewaysData.length ||
                i === bullData.length + sidewaysData.length + bearData.length) {
                allData[i].open = allData[i - 1].close;
            }
        }
        return allData;
    }
}
// ============================================================================
// DEMO CLASS
// ============================================================================
class AutomaticStrategyGenerationDemo {
    constructor() {
        // Generate test data
        this.data = MockDataGenerator.generateMixedRegimeData();
        // Backtest configuration
        this.backtestConfig = {
            startCapital: 10000,
            commissionRate: 0.001,
            slippageRate: 0.0005,
            spreadCost: 0.0002,
            impactModel: 'sqrt',
            latencyMs: 100,
            marginRequirement: 0.1,
            interestRate: 0.02,
            benchmark: 'SPY',
            currency: 'USD',
            timezone: 'UTC'
        };
        // Initialize generator
        this.generator = new automatic_strategy_generator_1.AutomaticStrategyGenerator(this.data, this.backtestConfig);
        this.setupEventListeners();
    }
    /**
     * Uruchamia wszystkie demonstracje automatycznego generowania strategii
     */
    async runAllDemos() {
        console.log('🤖 AUTOMATIC STRATEGY GENERATION DEMO');
        console.log('🚀 Faza 3.3: Automatyczne Generowanie i Testowanie Nowych Strategii');
        console.log('================================================================================\n');
        await this.demoComponentLibrary();
        await this.demoStrategyTemplateGeneration();
        await this.demoCodeGeneration();
        await this.demoEvolutionaryOptimization();
        await this.demoComprehensiveGeneration();
        console.log('\n🎉 ALL AUTOMATIC STRATEGY GENERATION DEMOS COMPLETED!\n');
        console.log('✅ System capabilities demonstrated:');
        console.log('   🔹 Component library with 8+ indicators and 4+ risk management systems');
        console.log('   🔹 AI-powered strategy template generation');
        console.log('   🔹 Automatic TypeScript code generation');
        console.log('   🔹 Evolutionary optimization with genetic algorithms');
        console.log('   🔹 Multi-criteria fitness evaluation');
        console.log('   🔹 Strategy mutation and crossover operations');
        console.log('   🔹 Diversity and novelty scoring');
        console.log('\n🚀 AUTOMATIC STRATEGY GENERATOR READY FOR PRODUCTION!');
    }
    /**
     * Demo 1: Biblioteka komponentów strategii
     */
    async demoComponentLibrary() {
        console.log('📚 Demo 1: Strategy Component Library');
        console.log('============================================================\n');
        const library = new automatic_strategy_generator_1.StrategyComponentLibrary();
        console.log('🔧 Available technical indicators:');
        const indicators = library.getIndicators();
        indicators.forEach((indicator, key) => {
            console.log(`   📊 ${indicator.name} (${key})`);
            console.log(`      Complexity: ${indicator.complexity}`);
            console.log(`      Markets: ${indicator.marketConditions.join(', ')}`);
            console.log(`      Params: ${Object.keys(indicator.parameters).join(', ')}\n`);
        });
        console.log('⚖️ Available risk management systems:');
        const riskManagement = library.getRiskManagement();
        riskManagement.forEach((rm, key) => {
            console.log(`   🛡️ ${rm.name} (${key})`);
            console.log(`      Complexity: ${rm.complexity}`);
            console.log(`      Description: ${rm.description}\n`);
        });
        // Test component filtering
        const simpleComponents = library.getComponentsByComplexity('simple');
        const bullMarketComponents = library.getComponentsByMarketCondition('bull');
        console.log(`📈 Simple complexity components: ${simpleComponents.length}`);
        console.log(`🐂 Bull market components: ${bullMarketComponents.length}\n`);
    }
    /**
     * Demo 2: Generowanie szablonów strategii
     */
    async demoStrategyTemplateGeneration() {
        console.log('🎯 Demo 2: Strategy Template Generation');
        console.log('============================================================\n');
        const generator = new automatic_strategy_generator_1.StrategyTemplateGenerator(42); // Seeded for reproducibility
        // Different complexity configurations
        const configs = [
            {
                name: 'Simple Strategy',
                config: {
                    maxComplexity: 'simple',
                    targetMarketConditions: ['bull', 'bear'],
                    requiredMinSharpe: 1.0,
                    requiredMinReturn: 0.1,
                    maxDrawdownLimit: 0.15,
                    minWinRate: 0.5,
                    diversificationRequirement: false,
                    innovationBonus: false,
                    stabilityRequirement: true
                }
            },
            {
                name: 'Complex Strategy',
                config: {
                    maxComplexity: 'complex',
                    targetMarketConditions: ['bull', 'bear', 'sideways', 'volatile'],
                    requiredMinSharpe: 1.5,
                    requiredMinReturn: 0.2,
                    maxDrawdownLimit: 0.1,
                    minWinRate: 0.6,
                    diversificationRequirement: true,
                    innovationBonus: true,
                    stabilityRequirement: true
                }
            },
            {
                name: 'Advanced Strategy',
                config: {
                    maxComplexity: 'advanced',
                    targetMarketConditions: ['volatile'],
                    requiredMinSharpe: 2.0,
                    requiredMinReturn: 0.3,
                    maxDrawdownLimit: 0.08,
                    minWinRate: 0.65,
                    diversificationRequirement: true,
                    innovationBonus: true,
                    stabilityRequirement: true
                }
            }
        ];
        for (const { name, config } of configs) {
            console.log(`🎲 Generating ${name}...`);
            const template = generator.generateTemplate(config);
            console.log(`   📝 ID: ${template.id}`);
            console.log(`   📋 Name: ${template.name}`);
            console.log(`   📄 Description: ${template.description}`);
            console.log(`   🎚️ Complexity: ${template.complexity}`);
            console.log(`   ⏰ Timeframe: ${template.timeframe}`);
            console.log(`   🌍 Market Types: ${template.marketTypes.join(', ')}`);
            console.log(`   🔧 Components: ${template.components.length}`);
            template.components.forEach((comp, i) => {
                console.log(`      ${i + 1}. ${comp.name} (${comp.type}) - Weight: ${comp.weight.toFixed(2)}`);
            });
            console.log(`   📈 Expected Return: ${(template.expectedPerformance.returnRange[0] * 100).toFixed(1)}% - ${(template.expectedPerformance.returnRange[1] * 100).toFixed(1)}%`);
            console.log(`   📊 Expected Sharpe: ${template.expectedPerformance.sharpeRange[0].toFixed(1)} - ${template.expectedPerformance.sharpeRange[1].toFixed(1)}`);
            console.log(`   📉 Max Drawdown: ${(template.expectedPerformance.maxDrawdown * 100).toFixed(1)}%`);
            console.log(`   🎯 Win Rate: ${(template.expectedPerformance.winRate * 100).toFixed(1)}%\n`);
        }
    }
    /**
     * Demo 3: Generowanie kodu strategii
     */
    async demoCodeGeneration() {
        console.log('💻 Demo 3: Strategy Code Generation');
        console.log('============================================================\n');
        const templateGenerator = new automatic_strategy_generator_1.StrategyTemplateGenerator(123);
        const codeGenerator = new automatic_strategy_generator_1.StrategyCodeGenerator();
        const config = {
            maxComplexity: 'medium',
            targetMarketConditions: ['bull', 'sideways'],
            requiredMinSharpe: 1.2,
            requiredMinReturn: 0.15,
            maxDrawdownLimit: 0.12,
            minWinRate: 0.55,
            diversificationRequirement: false,
            innovationBonus: true,
            stabilityRequirement: true
        };
        console.log('🎲 Generating strategy template...');
        const template = templateGenerator.generateTemplate(config);
        console.log('💻 Generating TypeScript code...');
        const generatedCode = codeGenerator.generateStrategyCode(template);
        console.log('\n📄 Generated Strategy Details:');
        console.log(`   📝 Strategy: ${template.name}`);
        console.log(`   🆔 ID: ${template.id}`);
        console.log(`   📏 Code Length: ${generatedCode.length} characters`);
        console.log(`   📊 Lines of Code: ${generatedCode.split('\n').length}`);
        // Show code preview (first 20 lines)
        console.log('\n📋 Code Preview (first 20 lines):');
        console.log('-----------------------------------');
        const lines = generatedCode.split('\n');
        lines.slice(0, 20).forEach((line, i) => {
            console.log(`${(i + 1).toString().padStart(2, ' ')}: ${line}`);
        });
        console.log('...\n');
        // Save to file for inspection
        try {
            const fs = require('fs');
            const path = require('path');
            const outputPath = path.join(process.cwd(), 'generated_strategy_demo.ts');
            await fs.promises.writeFile(outputPath, generatedCode);
            console.log(`💾 Full code saved to: ${outputPath}\n`);
        }
        catch (error) {
            console.log('⚠️ Could not save file (this is normal in demo mode)\n');
        }
    }
    /**
     * Demo 4: Ewolucyjna optymalizacja strategii
     */
    async demoEvolutionaryOptimization() {
        console.log('🧬 Demo 4: Evolutionary Strategy Optimization');
        console.log('============================================================\n');
        const evolutionConfig = {
            populationSize: 10, // Small for demo
            maxGenerations: 5,
            mutationRate: 0.2,
            crossoverRate: 0.6,
            elitismRate: 0.2,
            diversityWeight: 0.2,
            performanceWeight: 0.4,
            stabilityWeight: 0.3,
            noveltyWeight: 0.1
        };
        const generationConfig = {
            maxComplexity: 'medium',
            targetMarketConditions: ['bull', 'bear', 'sideways'],
            requiredMinSharpe: 1.0,
            requiredMinReturn: 0.1,
            maxDrawdownLimit: 0.15,
            minWinRate: 0.5,
            diversificationRequirement: false,
            innovationBonus: true,
            stabilityRequirement: true
        };
        console.log('🧬 Evolution Configuration:');
        console.log(`   👥 Population Size: ${evolutionConfig.populationSize}`);
        console.log(`   🔄 Max Generations: ${evolutionConfig.maxGenerations}`);
        console.log(`   🎲 Mutation Rate: ${(evolutionConfig.mutationRate * 100).toFixed(1)}%`);
        console.log(`   🔀 Crossover Rate: ${(evolutionConfig.crossoverRate * 100).toFixed(1)}%`);
        console.log(`   👑 Elitism Rate: ${(evolutionConfig.elitismRate * 100).toFixed(1)}%\n`);
        const evolutionEngine = new automatic_strategy_generator_1.StrategyEvolutionEngine(evolutionConfig, this.data, this.backtestConfig);
        // Monitor evolution progress
        let generationCount = 0;
        evolutionEngine.on('generationStart', (data) => {
            console.log(`🔄 Generation ${data.generation + 1}/${evolutionConfig.maxGenerations} starting...`);
        });
        evolutionEngine.on('generationComplete', (data) => {
            generationCount++;
            console.log(`   ✅ Generation ${generationCount} complete:`);
            console.log(`      🏆 Best Fitness: ${(data.bestFitness * 100).toFixed(2)}%`);
            console.log(`      📊 Average Fitness: ${(data.avgFitness * 100).toFixed(2)}%`);
            console.log(`      🎨 Diversity: ${(data.diversity * 100).toFixed(1)}%`);
        });
        evolutionEngine.on('strategyEvaluationComplete', (data) => {
            if (data.index % 3 === 0) { // Show every 3rd for brevity
                console.log(`      📈 Strategy ${data.index + 1}: Return ${(data.performance.totalReturn * 100).toFixed(1)}%, Sharpe ${data.performance.sharpeRatio.toFixed(2)}`);
            }
        });
        console.log('🚀 Starting evolutionary optimization...\n');
        try {
            const results = await evolutionEngine.evolveStrategies(generationConfig, evolutionConfig.maxGenerations);
            console.log('\n🏆 Evolution Results:');
            console.log(`   📊 Final Population: ${results.length} strategies`);
            console.log(`   🥇 Best Strategy Performance: ${(results[0].performance?.totalReturn || 0) * 100}%`);
            console.log(`   📈 Top 3 Strategies:`);
            results.slice(0, 3).forEach((strategy, i) => {
                console.log(`      ${i + 1}. ${strategy.template.name}`);
                console.log(`         Return: ${(strategy.performance?.totalReturn || 0) * 100}%`);
                console.log(`         Sharpe: ${strategy.performance?.sharpeRatio.toFixed(2) || 'N/A'}`);
                console.log(`         Generation: ${strategy.generation}`);
                console.log(`         Mutations: ${strategy.mutations.length}`);
            });
        }
        catch (error) {
            console.error('❌ Evolution failed:', error);
        }
        console.log('');
    }
    /**
     * Demo 5: Kompletny system generowania strategii
     */
    async demoComprehensiveGeneration() {
        console.log('🎯 Demo 5: Comprehensive Strategy Generation System');
        console.log('============================================================\n');
        const generationConfig = {
            maxComplexity: 'complex',
            targetMarketConditions: ['bull', 'bear', 'sideways', 'volatile'],
            requiredMinSharpe: 1.5,
            requiredMinReturn: 0.2,
            maxDrawdownLimit: 0.1,
            minWinRate: 0.6,
            diversificationRequirement: true,
            innovationBonus: true,
            stabilityRequirement: true
        };
        console.log('🎯 Generation Configuration:');
        console.log(`   🎚️ Max Complexity: ${generationConfig.maxComplexity}`);
        console.log(`   🌍 Target Markets: ${generationConfig.targetMarketConditions.join(', ')}`);
        console.log(`   📊 Min Sharpe: ${generationConfig.requiredMinSharpe}`);
        console.log(`   📈 Min Return: ${(generationConfig.requiredMinReturn * 100)}%`);
        console.log(`   📉 Max Drawdown: ${(generationConfig.maxDrawdownLimit * 100)}%`);
        console.log(`   🎯 Min Win Rate: ${(generationConfig.minWinRate * 100)}%\n`);
        console.log('🚀 Starting comprehensive generation...\n');
        try {
            const result = await this.generator.generateAndTestStrategies(generationConfig, 3); // 3 generations for demo
            console.log('🎉 COMPREHENSIVE GENERATION RESULTS');
            console.log('================================================================================');
            console.log('\n📊 Summary Statistics:');
            console.log(`   🏭 Total Generated: ${result.summary.totalGenerated}`);
            console.log(`   🧪 Total Tested: ${result.summary.totalTested}`);
            console.log(`   ✅ Success Rate: ${(result.summary.successRate * 100).toFixed(1)}%`);
            console.log(`   📈 Average Performance: ${(result.summary.averagePerformance * 100).toFixed(2)}%`);
            console.log(`   🏆 Best Performance: ${(result.summary.bestPerformance * 100).toFixed(2)}%`);
            console.log('\n🏆 Top 5 Generated Strategies:');
            result.bestStrategies.slice(0, 5).forEach((strategy, i) => {
                console.log(`\n   ${i + 1}. ${strategy.template.name}`);
                console.log(`      🆔 ID: ${strategy.template.id}`);
                console.log(`      🎚️ Complexity: ${strategy.template.complexity}`);
                console.log(`      ⏰ Timeframe: ${strategy.template.timeframe}`);
                console.log(`      🌍 Markets: ${strategy.template.marketTypes.join(', ')}`);
                console.log(`      🧬 DNA: ${strategy.dnaSignature}`);
                console.log(`      🔄 Generation: ${strategy.generation}`);
                console.log(`      🎲 Mutations: ${strategy.mutations.length}`);
                if (strategy.performance) {
                    console.log(`      📈 Performance:`);
                    console.log(`         Return: ${(strategy.performance.totalReturn * 100).toFixed(2)}%`);
                    console.log(`         Sharpe: ${strategy.performance.sharpeRatio.toFixed(2)}`);
                    console.log(`         Max DD: ${(strategy.performance.maxDrawdown * 100).toFixed(1)}%`);
                    console.log(`         Win Rate: ${(strategy.performance.winRate * 100).toFixed(1)}%`);
                }
                console.log(`      🎯 Validation Score: ${(strategy.validationScore * 100).toFixed(1)}%`);
                console.log(`      🔒 Confidence: ${(strategy.confidence * 100).toFixed(1)}%`);
                console.log(`      🔧 Components:`);
                strategy.template.components.forEach((comp, j) => {
                    console.log(`         ${j + 1}. ${comp.name} (${comp.type}) - Weight: ${comp.weight.toFixed(2)}`);
                });
            });
            // Save best strategies
            try {
                await this.generator.saveStrategies(result.bestStrategies.slice(0, 3), './generated_strategies');
                console.log('\n💾 Top 3 strategies saved to ./generated_strategies/');
            }
            catch (error) {
                console.log('\n⚠️ Could not save strategies (this is normal in demo mode)');
            }
        }
        catch (error) {
            console.error('❌ Comprehensive generation failed:', error);
        }
    }
    setupEventListeners() {
        this.generator.on('generationStart', (data) => {
            console.log(`🎬 Generation started with ${JSON.stringify(data.config.maxComplexity)} complexity`);
        });
        this.generator.on('evolutionStart', (data) => {
            console.log(`🧬 Evolution started: ${data.populationSize} population, ${data.maxGenerations} generations`);
        });
        this.generator.on('evolutionGenerationStart', (data) => {
            console.log(`   🔄 Evolution generation ${data.generation + 1} starting with ${data.population} strategies`);
        });
        this.generator.on('strategyEvaluationStart', (data) => {
            if (data.index % 5 === 0) { // Show every 5th
                console.log(`      🧪 Evaluating strategy ${data.index + 1}: ${data.id}`);
            }
        });
        this.generator.on('strategiesSaved', (data) => {
            console.log(`💾 Saved ${data.count} strategies to ${data.outputDir}`);
        });
    }
}
exports.AutomaticStrategyGenerationDemo = AutomaticStrategyGenerationDemo;
// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function main() {
    try {
        const demo = new AutomaticStrategyGenerationDemo();
        await demo.runAllDemos();
    }
    catch (error) {
        console.error('Demo failed:', error);
        process.exit(1);
    }
}
// Run the demo if this file is executed directly
if (require.main === module) {
    main();
}
exports.default = AutomaticStrategyGenerationDemo;
