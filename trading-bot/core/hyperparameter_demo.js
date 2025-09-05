"use strict";
/**
 * ============================================================================
 * DEMONSTRACJA SYSTEMU PRZESTRZENI HIPERPARAMETRÓW
 *
 * Ten plik demonstruje możliwości systemu definiowania i próbkowania
 * przestrzeni hiperparametrów dla strategii tradingowych.
 * ============================================================================
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.demonstrateHyperparameterSpaces = demonstrateHyperparameterSpaces;
exports.performanceTest = performanceTest;
const hyperparameter_space_1 = require("./hyperparameter_space");
const predefined_spaces_1 = require("./predefined_spaces");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Demonstruje podstawowe funkcjonalności systemu przestrzeni hiperparametrów
 */
async function demonstrateHyperparameterSpaces() {
    console.log('🔧 === DEMONSTRACJA SYSTEMU PRZESTRZENI HIPERPARAMETRÓW ===\n');
    // ============================================================================
    // 1. INICJALIZACJA PREDEFINIOWANYCH PRZESTRZENI
    // ============================================================================
    console.log('📦 1. INICJALIZACJA PREDEFINIOWANYCH PRZESTRZENI');
    try {
        (0, predefined_spaces_1.initializePredefinedSpaces)();
        const allSpaces = hyperparameter_space_1.hyperparameterSpaceManager.getAllSpaces();
        console.log(`✅ Załadowano ${allSpaces.length} przestrzeni:`);
        allSpaces.forEach(space => {
            const stats = hyperparameter_space_1.hyperparameterSpaceManager.getSpaceStatistics(space.name);
            console.log(`  📊 ${space.name}: ${stats?.parametersCount} parametrów, ~${stats?.estimatedSpaceSize} kombinacji`);
        });
    }
    catch (error) {
        console.error('❌ Błąd inicjalizacji:', error);
    }
    // ============================================================================
    // 2. SZCZEGÓŁOWA ANALIZA PRZESTRZENI
    // ============================================================================
    console.log('\n🔍 2. SZCZEGÓŁOWA ANALIZA PRZESTRZENI');
    const spacesToAnalyze = ['ma_crossover', 'rsi_strategy'];
    for (const spaceName of spacesToAnalyze) {
        console.log(`\n📈 Analiza przestrzeni: ${spaceName}`);
        const space = hyperparameter_space_1.hyperparameterSpaceManager.getSpace(spaceName);
        if (!space) {
            console.log(`❌ Przestrzeń ${spaceName} nie została znaleziona`);
            continue;
        }
        console.log(`  📝 Opis: ${space.description}`);
        console.log(`  🎯 Typ strategii: ${space.strategyType}`);
        console.log(`  📊 Parametrów: ${space.parameters.length}`);
        console.log(`  🚫 Ograniczeń: ${space.constraints?.length || 0}`);
        // Analiza parametrów
        console.log(`\n  📋 Parametry:`);
        space.parameters.forEach((param, index) => {
            const typeInfo = param.type === hyperparameter_space_1.ParameterType.INTEGER || param.type === hyperparameter_space_1.ParameterType.FLOAT
                ? `[${param.min}-${param.max}]`
                : param.type === hyperparameter_space_1.ParameterType.CATEGORICAL
                    ? `{${param.choices?.length} opcji}`
                    : `{${param.type}}`;
            const transformInfo = param.transformation && param.transformation !== hyperparameter_space_1.TransformationType.NONE
                ? ` (${param.transformation})`
                : '';
            const conditionInfo = param.conditions && param.conditions.length > 0
                ? ` [warunkowy]`
                : '';
            console.log(`    ${index + 1}. ${param.name}: ${typeInfo}${transformInfo}${conditionInfo}`);
            if (param.description) {
                console.log(`       "${param.description}"`);
            }
        });
        // Statystyki
        const stats = hyperparameter_space_1.hyperparameterSpaceManager.getSpaceStatistics(spaceName);
        if (stats) {
            console.log(`\n  📊 Statystyki:`);
            console.log(`    Szacowana wielkość przestrzeni: ${stats.estimatedSpaceSize.toLocaleString()}`);
            console.log(`    Parametry warunkowe: ${stats.conditionalParameters}`);
            console.log(`    Typy parametrów:`, stats.parameterTypes);
        }
    }
    // ============================================================================
    // 3. PRÓBKOWANIE PARAMETRÓW
    // ============================================================================
    console.log('\n🎲 3. PRÓBKOWANIE PARAMETRÓW');
    // Test różnych strategii próbkowania
    const samplingStrategies = [
        hyperparameter_space_1.SamplingStrategy.UNIFORM,
        hyperparameter_space_1.SamplingStrategy.LOG_UNIFORM,
        hyperparameter_space_1.SamplingStrategy.NORMAL
    ];
    for (const strategy of samplingStrategies) {
        console.log(`\n🎯 Strategia próbkowania: ${strategy}`);
        try {
            // Próbkuj z przestrzeni MA Crossover
            const samples = hyperparameter_space_1.hyperparameterSpaceManager.sampleMultiple('ma_crossover', 5, strategy);
            console.log(`📦 Wygenerowano ${samples.length} próbek:`);
            samples.forEach((sample, index) => {
                console.log(`  ${index + 1}. ${sample.id}:`);
                console.log(`     Fast MA: ${sample.parameters.fast_period}`);
                console.log(`     Slow MA: ${sample.parameters.slow_period}`);
                console.log(`     Position Size: ${sample.parameters.position_size?.toFixed(3)}`);
                console.log(`     Stop Loss: ${sample.parameters.stop_loss?.toFixed(4)}`);
                console.log(`     Status: ${sample.isValid ? '✅ Valid' : '❌ Invalid'}`);
                if (!sample.isValid && sample.validationErrors) {
                    console.log(`     Błędy: ${sample.validationErrors.join(', ')}`);
                }
            });
        }
        catch (error) {
            console.error(`❌ Błąd próbkowania ${strategy}:`, error);
        }
    }
    // ============================================================================
    // 4. TESTOWANIE PARAMETRÓW WARUNKOWYCH
    // ============================================================================
    console.log('\n🔗 4. TESTOWANIE PARAMETRÓW WARUNKOWYCH');
    try {
        console.log(`\n📊 Test przestrzeni Multi-Timeframe z parametrami warunkowymi:`);
        const conditionalSamples = hyperparameter_space_1.hyperparameterSpaceManager.sampleMultiple('multi_timeframe_strategy', 10);
        console.log(`📦 Wygenerowano ${conditionalSamples.length} próbek z parametrami warunkowymi:`);
        conditionalSamples.slice(0, 3).forEach((sample, index) => {
            console.log(`\n  ${index + 1}. ${sample.id}:`);
            console.log(`     Primary Indicator: ${sample.parameters.primary_indicator}`);
            console.log(`     Primary Timeframe: ${sample.parameters.primary_timeframe}`);
            // Pokaż parametry warunkowe w zależności od wskaźnika
            if (sample.parameters.primary_indicator === 'MA_CROSSOVER') {
                console.log(`     MA Fast: ${sample.parameters.primary_ma_fast}`);
                console.log(`     MA Slow: ${sample.parameters.primary_ma_slow}`);
            }
            else if (sample.parameters.primary_indicator === 'RSI') {
                console.log(`     RSI Period: ${sample.parameters.primary_rsi_period}`);
                console.log(`     RSI Oversold: ${sample.parameters.primary_rsi_oversold}`);
                console.log(`     RSI Overbought: ${sample.parameters.primary_rsi_overbought}`);
            }
            console.log(`     Position Size: ${sample.parameters.position_size_base?.toFixed(3)}`);
            console.log(`     Use Dynamic Sizing: ${sample.parameters.use_dynamic_sizing}`);
            if (sample.parameters.use_dynamic_sizing) {
                console.log(`     Volatility Factor: ${sample.parameters.volatility_adjustment_factor?.toFixed(2)}`);
            }
            console.log(`     Stop Loss Method: ${sample.parameters.stop_loss_method}`);
            if (sample.parameters.stop_loss_method === 'ATR_BASED') {
                console.log(`     ATR Multiplier: ${sample.parameters.stop_loss_atr_multiplier?.toFixed(2)}`);
            }
            else if (sample.parameters.stop_loss_method === 'FIXED_PERCENT') {
                console.log(`     Fixed Percent: ${sample.parameters.stop_loss_fixed_percent?.toFixed(4)}`);
            }
            console.log(`     Status: ${sample.isValid ? '✅ Valid' : '❌ Invalid'}`);
        });
    }
    catch (error) {
        console.error('❌ Błąd testowania parametrów warunkowych:', error);
    }
    // ============================================================================
    // 5. TWORZENIE NIESTANDARDOWEJ PRZESTRZENI
    // ============================================================================
    console.log('\n🏗️ 5. TWORZENIE NIESTANDARDOWEJ PRZESTRZENI');
    try {
        const customSpace = new predefined_spaces_1.SpaceBuilder('momentum_strategy', 'MomentumStrategy')
            .description('Strategia momentum z niestandardowymi parametrami')
            .addIntegerParam('momentum_period', 10, 50, {
            description: 'Okres kalkulacji momentum',
            importance: 0.9,
            tags: ['momentum']
        })
            .addFloatParam('momentum_threshold', 0.01, 0.1, {
            description: 'Próg momentum dla sygnału',
            transformation: hyperparameter_space_1.TransformationType.LOG,
            samplingStrategy: hyperparameter_space_1.SamplingStrategy.LOG_UNIFORM,
            importance: 0.85,
            tags: ['threshold']
        })
            .addCategoricalParam('direction_filter', ['both', 'up_only', 'down_only'], {
            description: 'Filtr kierunku momentum',
            defaultChoice: 'both',
            importance: 0.7,
            tags: ['filter']
        })
            .addBooleanParam('use_volume_confirmation', {
            description: 'Czy używać potwierdzenia wolumenem',
            importance: 0.6,
            tags: ['volume']
        })
            .addFloatParam('volume_threshold', 1.0, 3.0, {
            description: 'Próg wolumenu (wielokrotność średniej)',
            default: 1.5,
            conditions: [
                {
                    parameterName: 'use_volume_confirmation',
                    operator: '==',
                    value: true
                }
            ],
            importance: 0.5,
            tags: ['volume']
        })
            .addFloatParam('position_size', 0.01, 0.3, {
            description: 'Rozmiar pozycji (% kapitału)',
            transformation: hyperparameter_space_1.TransformationType.LOG,
            importance: 0.8,
            tags: ['risk']
        })
            .addConstraint('momentum_sanity', 'momentum_threshold < 0.05', ['momentum_threshold'])
            .build();
        const customSpaceId = hyperparameter_space_1.hyperparameterSpaceManager.createSpace(customSpace);
        console.log(`✅ Utworzono niestandardową przestrzeń: ${customSpaceId}`);
        // Test próbkowania z niestandardowej przestrzeni
        const customSamples = hyperparameter_space_1.hyperparameterSpaceManager.sampleMultiple(customSpaceId, 3);
        console.log(`📦 Próbki z niestandardowej przestrzeni:`);
        customSamples.forEach((sample, index) => {
            console.log(`  ${index + 1}. Momentum Period: ${sample.parameters.momentum_period}`);
            console.log(`     Momentum Threshold: ${sample.parameters.momentum_threshold?.toFixed(4)}`);
            console.log(`     Direction Filter: ${sample.parameters.direction_filter}`);
            console.log(`     Use Volume: ${sample.parameters.use_volume_confirmation}`);
            if (sample.parameters.use_volume_confirmation) {
                console.log(`     Volume Threshold: ${sample.parameters.volume_threshold?.toFixed(2)}`);
            }
            console.log(`     Status: ${sample.isValid ? '✅ Valid' : '❌ Invalid'}`);
        });
    }
    catch (error) {
        console.error('❌ Błąd tworzenia niestandardowej przestrzeni:', error);
    }
    // ============================================================================
    // 6. ANALIZA TRANSFORMACJI PARAMETRÓW
    // ============================================================================
    console.log('\n🔄 6. ANALIZA TRANSFORMACJI PARAMETRÓW');
    try {
        console.log(`\n📊 Porównanie transformacji dla parametru position_size:`);
        const rsiSamples = hyperparameter_space_1.hyperparameterSpaceManager.sampleMultiple('rsi_strategy', 5);
        rsiSamples.slice(0, 3).forEach((sample, index) => {
            const original = sample.parameters.position_size;
            const transformed = sample.transformedParameters?.position_size;
            console.log(`  ${index + 1}. Oryginał: ${original?.toFixed(4)}, Transformacja (LOG): ${transformed?.toFixed(4)}`);
        });
    }
    catch (error) {
        console.error('❌ Błąd analizy transformacji:', error);
    }
    // ============================================================================
    // 7. PODSUMOWANIE
    // ============================================================================
    console.log('\n📊 7. PODSUMOWANIE SYSTEMU');
    const finalSpaces = hyperparameter_space_1.hyperparameterSpaceManager.getAllSpaces();
    let totalParameters = 0;
    let totalEstimatedSize = 0;
    console.log(`\n📋 Wszystkie przestrzenie hiperparametrów:`);
    finalSpaces.forEach(space => {
        const stats = hyperparameter_space_1.hyperparameterSpaceManager.getSpaceStatistics(space.name);
        if (stats) {
            totalParameters += stats.parametersCount;
            totalEstimatedSize += stats.estimatedSpaceSize;
            console.log(`  📊 ${space.name}:`);
            console.log(`      Parametry: ${stats.parametersCount}`);
            console.log(`      Przestrzeń: ~${stats.estimatedSpaceSize.toLocaleString()}`);
            console.log(`      Warunkowe: ${stats.conditionalParameters}`);
        }
    });
    console.log(`\n🎯 STATYSTYKI GLOBALNE:`);
    console.log(`  📦 Przestrzenie: ${finalSpaces.length}`);
    console.log(`  ⚙️ Parametry łącznie: ${totalParameters}`);
    console.log(`  🌌 Szacowana wielkość przestrzeni: ~${totalEstimatedSize.toLocaleString()}`);
    console.log('\n🎉 === DEMONSTRACJA ZAKOŃCZONA ===');
    // Sprawdź czy katalogi zostały utworzone
    const baseDir = 'hyperparameter_spaces';
    if (fs.existsSync(baseDir)) {
        const definitionsCount = fs.readdirSync(path.join(baseDir, 'definitions')).length;
        const samplesCount = fs.readdirSync(path.join(baseDir, 'samples')).length;
        console.log(`\n💾 Pliki zapisane:`);
        console.log(`  📁 Definicje przestrzeni: ${definitionsCount}`);
        console.log(`  🎲 Próbki parametrów: ${samplesCount}`);
    }
}
/**
 * Test wydajności systemu próbkowania
 */
async function performanceTest() {
    console.log('\n⚡ === TEST WYDAJNOŚCI PRÓBKOWANIA ===');
    const testCases = [
        { space: 'ma_crossover', samples: 100 },
        { space: 'rsi_strategy', samples: 100 },
        { space: 'multi_timeframe_strategy', samples: 50 }
    ];
    for (const testCase of testCases) {
        console.log(`\n🚀 Test: ${testCase.space} (${testCase.samples} próbek)`);
        const startTime = Date.now();
        try {
            const samples = hyperparameter_space_1.hyperparameterSpaceManager.sampleMultiple(testCase.space, testCase.samples);
            const endTime = Date.now();
            const duration = endTime - startTime;
            const validSamples = samples.filter(s => s.isValid).length;
            const validityRate = (validSamples / samples.length * 100).toFixed(1);
            console.log(`  ✅ Czas: ${duration}ms`);
            console.log(`  📊 Próbek/s: ${(samples.length / duration * 1000).toFixed(1)}`);
            console.log(`  ✔️ Validne: ${validSamples}/${samples.length} (${validityRate}%)`);
        }
        catch (error) {
            console.error(`  ❌ Błąd:`, error);
        }
    }
}
// Uruchom demonstrację
if (require.main === module) {
    demonstrateHyperparameterSpaces()
        .then(() => performanceTest())
        .catch(error => {
        console.error('❌ Błąd demonstracji:', error);
        process.exit(1);
    });
}
