"use strict";
/**
 * ============================================================================
 * PREDEFINIOWANE PRZESTRZENIE HIPERPARAMETRÓW
 *
 * Ten moduł zawiera gotowe definicje przestrzeni hiperparametrów dla
 * popularnych strategii tradingowych oraz narzędzia do ich tworzenia.
 * ============================================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceBuilder = exports.MULTI_TIMEFRAME_SPACE = exports.MACD_STRATEGY_SPACE = exports.BOLLINGER_BANDS_SPACE = exports.RSI_STRATEGY_SPACE = exports.MA_CROSSOVER_SPACE = void 0;
exports.initializePredefinedSpaces = initializePredefinedSpaces;
exports.createCustomSpace = createCustomSpace;
const hyperparameter_space_1 = require("./hyperparameter_space");
/**
 * Przestrzeń hiperparametrów dla strategii Moving Average Crossover
 */
exports.MA_CROSSOVER_SPACE = {
    name: 'ma_crossover',
    description: 'Przestrzeń hiperparametrów dla strategii przecięcia średnich kroczących',
    strategyType: 'MovingAverageCrossover',
    version: '1.0.0',
    parameters: [
        {
            name: 'fast_period',
            type: hyperparameter_space_1.ParameterType.INTEGER,
            description: 'Okres szybkiej średniej kroczącej',
            min: 5,
            max: 50,
            step: 1,
            default: 10,
            transformation: hyperparameter_space_1.TransformationType.NONE,
            samplingStrategy: hyperparameter_space_1.SamplingStrategy.UNIFORM,
            importance: 0.9,
            tags: ['technical_indicator', 'trend_following']
        },
        {
            name: 'slow_period',
            type: hyperparameter_space_1.ParameterType.INTEGER,
            description: 'Okres wolnej średniej kroczącej',
            min: 20,
            max: 200,
            step: 1,
            default: 50,
            transformation: hyperparameter_space_1.TransformationType.NONE,
            samplingStrategy: hyperparameter_space_1.SamplingStrategy.UNIFORM,
            importance: 0.9,
            tags: ['technical_indicator', 'trend_following'],
            correlatedWith: ['fast_period']
        },
        {
            name: 'ma_type',
            type: hyperparameter_space_1.ParameterType.CATEGORICAL,
            description: 'Typ średniej kroczącej',
            choices: ['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA'],
            defaultChoice: 'EMA',
            importance: 0.7,
            tags: ['technical_indicator']
        },
        {
            name: 'position_size',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Rozmiar pozycji (% kapitału)',
            min: 0.01,
            max: 1.0,
            default: 0.1,
            transformation: hyperparameter_space_1.TransformationType.NONE,
            samplingStrategy: hyperparameter_space_1.SamplingStrategy.LOG_UNIFORM,
            importance: 0.8,
            tags: ['risk_management']
        },
        {
            name: 'stop_loss',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Stop loss (% od ceny wejścia)',
            min: 0.005,
            max: 0.1,
            default: 0.02,
            transformation: hyperparameter_space_1.TransformationType.LOG,
            samplingStrategy: hyperparameter_space_1.SamplingStrategy.LOG_UNIFORM,
            importance: 0.85,
            tags: ['risk_management']
        },
        {
            name: 'take_profit',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Take profit (% od ceny wejścia)',
            min: 0.01,
            max: 0.2,
            default: 0.04,
            transformation: hyperparameter_space_1.TransformationType.LOG,
            samplingStrategy: hyperparameter_space_1.SamplingStrategy.LOG_UNIFORM,
            importance: 0.8,
            tags: ['risk_management']
        },
        {
            name: 'use_confirmation',
            type: hyperparameter_space_1.ParameterType.BOOLEAN,
            description: 'Czy używać dodatkowej konfirmacji sygnału',
            importance: 0.6,
            tags: ['signal_filtering']
        },
        {
            name: 'confirmation_indicator',
            type: hyperparameter_space_1.ParameterType.CATEGORICAL,
            description: 'Wskaźnik potwierdzenia sygnału',
            choices: ['RSI', 'MACD', 'Stochastic', 'Volume'],
            defaultChoice: 'RSI',
            conditions: [
                {
                    parameterName: 'use_confirmation',
                    operator: '==',
                    value: true
                }
            ],
            importance: 0.5,
            tags: ['signal_filtering', 'technical_indicator']
        }
    ],
    constraints: [
        {
            name: 'fast_slower_than_slow',
            description: 'Szybka średnia musi być krótsza od wolnej',
            type: 'linear',
            expression: 'fast_period < slow_period',
            parameters: ['fast_period', 'slow_period']
        },
        {
            name: 'reasonable_risk_reward',
            description: 'Stosunek zysku do straty powinien być sensowny',
            type: 'linear',
            expression: 'take_profit >= stop_loss',
            parameters: ['take_profit', 'stop_loss']
        }
    ]
};
/**
 * Przestrzeń hiperparametrów dla strategii RSI
 */
exports.RSI_STRATEGY_SPACE = {
    name: 'rsi_strategy',
    description: 'Przestrzeń hiperparametrów dla strategii opartej na RSI',
    strategyType: 'RSIStrategy',
    version: '1.0.0',
    parameters: [
        {
            name: 'rsi_period',
            type: hyperparameter_space_1.ParameterType.INTEGER,
            description: 'Okres RSI',
            min: 5,
            max: 30,
            step: 1,
            default: 14,
            importance: 0.9,
            tags: ['technical_indicator']
        },
        {
            name: 'oversold_threshold',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Próg wyprzedania RSI',
            min: 15,
            max: 35,
            default: 30,
            importance: 0.85,
            tags: ['signal_threshold']
        },
        {
            name: 'overbought_threshold',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Próg wykupienia RSI',
            min: 65,
            max: 85,
            default: 70,
            importance: 0.85,
            tags: ['signal_threshold']
        },
        {
            name: 'position_size',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Rozmiar pozycji (% kapitału)',
            min: 0.01,
            max: 0.5,
            default: 0.1,
            transformation: hyperparameter_space_1.TransformationType.LOG,
            samplingStrategy: hyperparameter_space_1.SamplingStrategy.LOG_UNIFORM,
            importance: 0.8,
            tags: ['risk_management']
        },
        {
            name: 'use_dynamic_thresholds',
            type: hyperparameter_space_1.ParameterType.BOOLEAN,
            description: 'Czy używać dynamicznych progów RSI',
            importance: 0.6,
            tags: ['adaptive']
        },
        {
            name: 'volatility_lookback',
            type: hyperparameter_space_1.ParameterType.INTEGER,
            description: 'Okres dla kalkulacji zmienności (dni)',
            min: 10,
            max: 50,
            step: 1,
            default: 20,
            conditions: [
                {
                    parameterName: 'use_dynamic_thresholds',
                    operator: '==',
                    value: true
                }
            ],
            importance: 0.5,
            tags: ['adaptive', 'volatility']
        }
    ],
    constraints: [
        {
            name: 'threshold_consistency',
            description: 'Próg wykupienia musi być większy od wyprzedania',
            type: 'linear',
            expression: 'overbought_threshold > oversold_threshold + 10',
            parameters: ['overbought_threshold', 'oversold_threshold']
        }
    ]
};
/**
 * Przestrzeń hiperparametrów dla strategii Bollinger Bands
 */
exports.BOLLINGER_BANDS_SPACE = {
    name: 'bollinger_bands',
    description: 'Przestrzeń hiperparametrów dla strategii Bollinger Bands',
    strategyType: 'BollingerBandsStrategy',
    version: '1.0.0',
    parameters: [
        {
            name: 'period',
            type: hyperparameter_space_1.ParameterType.INTEGER,
            description: 'Okres średniej kroczącej',
            min: 10,
            max: 50,
            step: 1,
            default: 20,
            importance: 0.9,
            tags: ['technical_indicator']
        },
        {
            name: 'std_dev_multiplier',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Mnożnik odchylenia standardowego',
            min: 1.0,
            max: 3.0,
            default: 2.0,
            samplingStrategy: hyperparameter_space_1.SamplingStrategy.UNIFORM,
            importance: 0.85,
            tags: ['technical_indicator']
        },
        {
            name: 'strategy_type',
            type: hyperparameter_space_1.ParameterType.CATEGORICAL,
            description: 'Typ strategii Bollinger Bands',
            choices: ['mean_reversion', 'breakout', 'squeeze'],
            defaultChoice: 'mean_reversion',
            importance: 0.9,
            tags: ['strategy_logic']
        },
        {
            name: 'squeeze_threshold',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Próg wykrycia ściśnięcia pasm',
            min: 0.02,
            max: 0.1,
            default: 0.05,
            conditions: [
                {
                    parameterName: 'strategy_type',
                    operator: '==',
                    value: 'squeeze'
                }
            ],
            importance: 0.7,
            tags: ['signal_threshold']
        },
        {
            name: 'breakout_confirmation_period',
            type: hyperparameter_space_1.ParameterType.INTEGER,
            description: 'Okresy potwierdzenia wybicia',
            min: 1,
            max: 5,
            step: 1,
            default: 2,
            conditions: [
                {
                    parameterName: 'strategy_type',
                    operator: '==',
                    value: 'breakout'
                }
            ],
            importance: 0.6,
            tags: ['signal_filtering']
        },
        {
            name: 'position_size',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Rozmiar pozycji (% kapitału)',
            min: 0.01,
            max: 0.5,
            default: 0.1,
            transformation: hyperparameter_space_1.TransformationType.LOG,
            importance: 0.8,
            tags: ['risk_management']
        }
    ]
};
/**
 * Przestrzeń hiperparametrów dla strategii MACD
 */
exports.MACD_STRATEGY_SPACE = {
    name: 'macd_strategy',
    description: 'Przestrzeń hiperparametrów dla strategii MACD',
    strategyType: 'MACDStrategy',
    version: '1.0.0',
    parameters: [
        {
            name: 'fast_period',
            type: hyperparameter_space_1.ParameterType.INTEGER,
            description: 'Okres szybkiej EMA',
            min: 8,
            max: 15,
            step: 1,
            default: 12,
            importance: 0.85,
            tags: ['technical_indicator']
        },
        {
            name: 'slow_period',
            type: hyperparameter_space_1.ParameterType.INTEGER,
            description: 'Okres wolnej EMA',
            min: 20,
            max: 35,
            step: 1,
            default: 26,
            importance: 0.85,
            tags: ['technical_indicator']
        },
        {
            name: 'signal_period',
            type: hyperparameter_space_1.ParameterType.INTEGER,
            description: 'Okres linii sygnału',
            min: 5,
            max: 15,
            step: 1,
            default: 9,
            importance: 0.8,
            tags: ['technical_indicator']
        },
        {
            name: 'signal_type',
            type: hyperparameter_space_1.ParameterType.CATEGORICAL,
            description: 'Typ sygnału MACD',
            choices: ['zero_cross', 'signal_cross', 'histogram', 'divergence'],
            defaultChoice: 'signal_cross',
            importance: 0.9,
            tags: ['signal_logic']
        },
        {
            name: 'histogram_threshold',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Próg histogramu MACD',
            min: 0.001,
            max: 0.01,
            default: 0.005,
            transformation: hyperparameter_space_1.TransformationType.LOG,
            conditions: [
                {
                    parameterName: 'signal_type',
                    operator: '==',
                    value: 'histogram'
                }
            ],
            importance: 0.7,
            tags: ['signal_threshold']
        },
        {
            name: 'position_size',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Rozmiar pozycji (% kapitału)',
            min: 0.01,
            max: 0.5,
            default: 0.1,
            transformation: hyperparameter_space_1.TransformationType.LOG,
            importance: 0.8,
            tags: ['risk_management']
        }
    ],
    constraints: [
        {
            name: 'fast_slower_than_slow',
            description: 'Szybka EMA musi być krótsza od wolnej',
            type: 'linear',
            expression: 'fast_period < slow_period',
            parameters: ['fast_period', 'slow_period']
        }
    ]
};
/**
 * Zaawansowana przestrzeń dla strategii multi-timeframe
 */
exports.MULTI_TIMEFRAME_SPACE = {
    name: 'multi_timeframe_strategy',
    description: 'Przestrzeń hiperparametrów dla strategii multi-timeframe',
    strategyType: 'MultiTimeframeStrategy',
    version: '1.0.0',
    parameters: [
        // Timeframe główny
        {
            name: 'primary_timeframe',
            type: hyperparameter_space_1.ParameterType.CATEGORICAL,
            description: 'Główny timeframe dla sygnałów',
            choices: ['1m', '5m', '15m', '1h', '4h', '1d'],
            defaultChoice: '1h',
            importance: 0.9,
            tags: ['timeframe']
        },
        {
            name: 'confirmation_timeframe',
            type: hyperparameter_space_1.ParameterType.CATEGORICAL,
            description: 'Timeframe dla potwierdzenia sygnałów',
            choices: ['5m', '15m', '1h', '4h', '1d', '1w'],
            defaultChoice: '4h',
            importance: 0.8,
            tags: ['timeframe']
        },
        // Wskaźniki dla timeframe głównego
        {
            name: 'primary_indicator',
            type: hyperparameter_space_1.ParameterType.CATEGORICAL,
            description: 'Główny wskaźnik techniczny',
            choices: ['MA_CROSSOVER', 'RSI', 'MACD', 'BOLLINGER_BANDS'],
            defaultChoice: 'MA_CROSSOVER',
            importance: 0.9,
            tags: ['indicator']
        },
        // Parametry dla MA_CROSSOVER na głównym timeframe
        {
            name: 'primary_ma_fast',
            type: hyperparameter_space_1.ParameterType.INTEGER,
            description: 'Szybka MA na głównym timeframe',
            min: 5,
            max: 30,
            step: 1,
            default: 10,
            conditions: [
                {
                    parameterName: 'primary_indicator',
                    operator: '==',
                    value: 'MA_CROSSOVER'
                }
            ],
            importance: 0.8,
            tags: ['indicator', 'ma']
        },
        {
            name: 'primary_ma_slow',
            type: hyperparameter_space_1.ParameterType.INTEGER,
            description: 'Wolna MA na głównym timeframe',
            min: 20,
            max: 100,
            step: 1,
            default: 50,
            conditions: [
                {
                    parameterName: 'primary_indicator',
                    operator: '==',
                    value: 'MA_CROSSOVER'
                }
            ],
            importance: 0.8,
            tags: ['indicator', 'ma']
        },
        // Parametry dla RSI na głównym timeframe
        {
            name: 'primary_rsi_period',
            type: hyperparameter_space_1.ParameterType.INTEGER,
            description: 'Okres RSI na głównym timeframe',
            min: 10,
            max: 25,
            step: 1,
            default: 14,
            conditions: [
                {
                    parameterName: 'primary_indicator',
                    operator: '==',
                    value: 'RSI'
                }
            ],
            importance: 0.8,
            tags: ['indicator', 'rsi']
        },
        {
            name: 'primary_rsi_oversold',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Próg wyprzedania RSI',
            min: 20,
            max: 35,
            default: 30,
            conditions: [
                {
                    parameterName: 'primary_indicator',
                    operator: '==',
                    value: 'RSI'
                }
            ],
            importance: 0.7,
            tags: ['indicator', 'rsi']
        },
        {
            name: 'primary_rsi_overbought',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Próg wykupienia RSI',
            min: 65,
            max: 80,
            default: 70,
            conditions: [
                {
                    parameterName: 'primary_indicator',
                    operator: '==',
                    value: 'RSI'
                }
            ],
            importance: 0.7,
            tags: ['indicator', 'rsi']
        },
        // Wskaźnik potwierdzenia
        {
            name: 'confirmation_indicator',
            type: hyperparameter_space_1.ParameterType.CATEGORICAL,
            description: 'Wskaźnik potwierdzenia na wyższym timeframe',
            choices: ['TREND_MA', 'TREND_EMA', 'VOLATILITY', 'VOLUME'],
            defaultChoice: 'TREND_EMA',
            importance: 0.7,
            tags: ['indicator', 'confirmation']
        },
        // Zarządzanie ryzykiem
        {
            name: 'position_size_base',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Bazowy rozmiar pozycji (% kapitału)',
            min: 0.01,
            max: 0.3,
            default: 0.1,
            transformation: hyperparameter_space_1.TransformationType.LOG,
            importance: 0.85,
            tags: ['risk_management']
        },
        {
            name: 'use_dynamic_sizing',
            type: hyperparameter_space_1.ParameterType.BOOLEAN,
            description: 'Czy używać dynamicznego rozmiaru pozycji',
            importance: 0.6,
            tags: ['risk_management', 'adaptive']
        },
        {
            name: 'volatility_adjustment_factor',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Czynnik dostosowania do zmienności',
            min: 0.5,
            max: 2.0,
            default: 1.0,
            conditions: [
                {
                    parameterName: 'use_dynamic_sizing',
                    operator: '==',
                    value: true
                }
            ],
            importance: 0.5,
            tags: ['risk_management', 'volatility']
        },
        // Stop loss i take profit
        {
            name: 'stop_loss_method',
            type: hyperparameter_space_1.ParameterType.CATEGORICAL,
            description: 'Metoda ustalania stop loss',
            choices: ['FIXED_PERCENT', 'ATR_BASED', 'SUPPORT_RESISTANCE'],
            defaultChoice: 'ATR_BASED',
            importance: 0.8,
            tags: ['risk_management']
        },
        {
            name: 'stop_loss_atr_multiplier',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Mnożnik ATR dla stop loss',
            min: 1.0,
            max: 4.0,
            default: 2.0,
            conditions: [
                {
                    parameterName: 'stop_loss_method',
                    operator: '==',
                    value: 'ATR_BASED'
                }
            ],
            importance: 0.7,
            tags: ['risk_management', 'atr']
        },
        {
            name: 'stop_loss_fixed_percent',
            type: hyperparameter_space_1.ParameterType.FLOAT,
            description: 'Stały procent stop loss',
            min: 0.005,
            max: 0.05,
            default: 0.02,
            transformation: hyperparameter_space_1.TransformationType.LOG,
            conditions: [
                {
                    parameterName: 'stop_loss_method',
                    operator: '==',
                    value: 'FIXED_PERCENT'
                }
            ],
            importance: 0.7,
            tags: ['risk_management']
        }
    ],
    constraints: [
        {
            name: 'ma_constraint',
            description: 'Szybka MA musi być krótsza od wolnej (dla MA_CROSSOVER)',
            type: 'custom',
            expression: 'primary_indicator === "MA_CROSSOVER" ? primary_ma_fast < primary_ma_slow : true',
            parameters: ['primary_indicator', 'primary_ma_fast', 'primary_ma_slow']
        },
        {
            name: 'rsi_threshold_constraint',
            description: 'Próg wykupienia RSI musi być większy od wyprzedania',
            type: 'custom',
            expression: 'primary_indicator === "RSI" ? primary_rsi_overbought > primary_rsi_oversold + 10 : true',
            parameters: ['primary_indicator', 'primary_rsi_overbought', 'primary_rsi_oversold']
        }
    ]
};
/**
 * Funkcja pomocnicza do tworzenia przestrzeni hiperparametrów
 */
class SpaceBuilder {
    constructor(name, strategyType) {
        this.space = {
            name,
            strategyType,
            version: '1.0.0',
            parameters: [],
            constraints: []
        };
    }
    description(desc) {
        this.space.description = desc;
        return this;
    }
    addIntegerParam(name, min, max, options) {
        const param = {
            name,
            type: hyperparameter_space_1.ParameterType.INTEGER,
            min,
            max,
            step: 1,
            ...options
        };
        this.space.parameters.push(param);
        return this;
    }
    addFloatParam(name, min, max, options) {
        const param = {
            name,
            type: hyperparameter_space_1.ParameterType.FLOAT,
            min,
            max,
            ...options
        };
        this.space.parameters.push(param);
        return this;
    }
    addCategoricalParam(name, choices, options) {
        const param = {
            name,
            type: hyperparameter_space_1.ParameterType.CATEGORICAL,
            choices,
            ...options
        };
        this.space.parameters.push(param);
        return this;
    }
    addBooleanParam(name, options) {
        const param = {
            name,
            type: hyperparameter_space_1.ParameterType.BOOLEAN,
            ...options
        };
        this.space.parameters.push(param);
        return this;
    }
    addConstraint(name, expression, parameters) {
        this.space.constraints.push({
            name,
            expression,
            parameters,
            type: 'linear'
        });
        return this;
    }
    build() {
        if (!this.space.name || !this.space.strategyType || !this.space.parameters) {
            throw new Error('Niepełna definicja przestrzeni hiperparametrów');
        }
        return this.space;
    }
}
exports.SpaceBuilder = SpaceBuilder;
/**
 * Funkcja do inicjalizacji wszystkich predefiniowanych przestrzeni
 */
function initializePredefinedSpaces() {
    console.log('🔧 Inicjalizacja predefiniowanych przestrzeni hiperparametrów...');
    const spaces = [
        exports.MA_CROSSOVER_SPACE,
        exports.RSI_STRATEGY_SPACE,
        exports.BOLLINGER_BANDS_SPACE,
        exports.MACD_STRATEGY_SPACE,
        exports.MULTI_TIMEFRAME_SPACE
    ];
    let initializedCount = 0;
    for (const space of spaces) {
        try {
            hyperparameter_space_1.hyperparameterSpaceManager.createSpace(space);
            initializedCount++;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('już istnieje')) {
                console.log(`⚠️ Przestrzeń ${space.name} już istnieje, pomijam`);
            }
            else {
                console.error(`❌ Błąd inicjalizacji przestrzeni ${space.name}:`, error);
            }
        }
    }
    console.log(`✅ Zainicjalizowano ${initializedCount} przestrzeni hiperparametrów`);
}
/**
 * Przykład użycia SpaceBuilder
 */
function createCustomSpace() {
    return new SpaceBuilder('custom_strategy', 'CustomStrategy')
        .description('Niestandardowa przestrzeń utworzona przez SpaceBuilder')
        .addIntegerParam('period', 5, 50, {
        description: 'Okres wskaźnika',
        importance: 0.9
    })
        .addFloatParam('threshold', 0.01, 0.1, {
        description: 'Próg sygnału',
        transformation: hyperparameter_space_1.TransformationType.LOG
    })
        .addCategoricalParam('mode', ['conservative', 'balanced', 'aggressive'], {
        description: 'Tryb strategii',
        importance: 0.8
    })
        .addBooleanParam('use_filter', {
        description: 'Czy używać filtra sygnałów'
    })
        .addConstraint('threshold_limit', 'threshold < 0.05', ['threshold'])
        .build();
}
