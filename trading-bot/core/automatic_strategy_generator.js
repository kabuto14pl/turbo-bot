"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * Automatic Strategy Generation & Testing System - Phase 3.3
 *
 * Implementuje zaawansowany system AI do automatycznego:
 * - Generowania nowych strategii tradingowych
 * - Testowania i walidacji strategii
 * - Ewolucyjnej optymalizacji algorytmów
 * - Meta-learning i transfer learning
 *
 * @author Turbo Bot Deva
 * @version 3.3.0
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
exports.AutomaticStrategyGenerator = exports.StrategyEvolutionEngine = exports.StrategyCodeGenerator = exports.StrategyTemplateGenerator = exports.StrategyComponentLibrary = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const events_1 = require("events");
// Import poprzednich systemów
const advanced_backtesting_1 = require("./advanced_backtesting");
// ============================================================================
// STRATEGY COMPONENT LIBRARY
// ============================================================================
class StrategyComponentLibrary {
    constructor() {
        this.indicators = new Map();
        this.conditions = new Map();
        this.signals = new Map();
        this.filters = new Map();
        this.riskManagement = new Map();
        this.initializeComponents();
    }
    initializeComponents() {
        // Technical Indicators
        this.indicators.set('rsi', {
            name: 'RSI',
            parameters: { period: [10, 14, 21, 30], overbought: [70, 75, 80], oversold: [20, 25, 30] },
            complexity: 'simple',
            marketConditions: ['bull', 'bear', 'sideways'],
            description: 'Relative Strength Index momentum oscillator'
        });
        this.indicators.set('macd', {
            name: 'MACD',
            parameters: { fast: [8, 12, 16], slow: [21, 26, 30], signal: [7, 9, 12] },
            complexity: 'medium',
            marketConditions: ['bull', 'bear'],
            description: 'Moving Average Convergence Divergence'
        });
        this.indicators.set('bollinger', {
            name: 'Bollinger Bands',
            parameters: { period: [15, 20, 25], std: [1.5, 2.0, 2.5] },
            complexity: 'medium',
            marketConditions: ['sideways', 'volatile'],
            description: 'Volatility-based bands for mean reversion'
        });
        this.indicators.set('stochastic', {
            name: 'Stochastic Oscillator',
            parameters: { k: [12, 14, 16], d: [3, 5, 7], smooth: [1, 3, 5] },
            complexity: 'simple',
            marketConditions: ['bull', 'bear', 'sideways'],
            description: 'Momentum oscillator comparing close to range'
        });
        this.indicators.set('atr', {
            name: 'Average True Range',
            parameters: { period: [10, 14, 20] },
            complexity: 'simple',
            marketConditions: ['volatile'],
            description: 'Volatility indicator for position sizing'
        });
        this.indicators.set('supertrend', {
            name: 'SuperTrend',
            parameters: { period: [7, 10, 14], multiplier: [2.0, 3.0, 4.0] },
            complexity: 'medium',
            marketConditions: ['bull', 'bear'],
            description: 'Trend following indicator with dynamic support/resistance'
        });
        this.indicators.set('ichimoku', {
            name: 'Ichimoku Cloud',
            parameters: { tenkan: [7, 9, 12], kijun: [22, 26, 30], senkou: [44, 52, 60] },
            complexity: 'complex',
            marketConditions: ['bull', 'bear', 'sideways'],
            description: 'Comprehensive trend and momentum system'
        });
        this.indicators.set('vwap', {
            name: 'VWAP',
            parameters: { period: [20, 50, 100] },
            complexity: 'simple',
            marketConditions: ['bull', 'bear', 'sideways'],
            description: 'Volume Weighted Average Price'
        });
        // Entry/Exit Conditions
        this.conditions.set('crossover', {
            name: 'Indicator Crossover',
            parameters: { fast_indicator: 'string', slow_indicator: 'string', direction: ['above', 'below'] },
            complexity: 'simple',
            description: 'Signal when one indicator crosses another'
        });
        this.conditions.set('threshold', {
            name: 'Threshold Break',
            parameters: { indicator: 'string', threshold: 'number', direction: ['above', 'below'] },
            complexity: 'simple',
            description: 'Signal when indicator crosses threshold level'
        });
        this.conditions.set('divergence', {
            name: 'Price-Indicator Divergence',
            parameters: { indicator: 'string', lookback: [5, 10, 15], strength: [0.7, 0.8, 0.9] },
            complexity: 'complex',
            description: 'Detect divergence between price and indicator'
        });
        this.conditions.set('multi_timeframe', {
            name: 'Multi-Timeframe Confirmation',
            parameters: { primary_tf: 'string', confirm_tf: 'string', condition: 'string' },
            complexity: 'advanced',
            description: 'Confirm signals across multiple timeframes'
        });
        // Risk Management
        this.riskManagement.set('fixed_stop', {
            name: 'Fixed Stop Loss',
            parameters: { stop_pct: [0.01, 0.02, 0.03, 0.05] },
            complexity: 'simple',
            description: 'Fixed percentage stop loss'
        });
        this.riskManagement.set('atr_stop', {
            name: 'ATR-Based Stop',
            parameters: { atr_multiplier: [1.5, 2.0, 2.5, 3.0] },
            complexity: 'medium',
            description: 'Dynamic stop based on Average True Range'
        });
        this.riskManagement.set('trailing_stop', {
            name: 'Trailing Stop',
            parameters: { trail_pct: [0.01, 0.015, 0.02], activation_pct: [0.02, 0.03, 0.05] },
            complexity: 'medium',
            description: 'Trailing stop loss system'
        });
        this.riskManagement.set('volatility_sizing', {
            name: 'Volatility-Based Position Sizing',
            parameters: { risk_pct: [0.01, 0.02, 0.03], volatility_lookback: [10, 20, 30] },
            complexity: 'advanced',
            description: 'Position sizing based on volatility'
        });
    }
    getIndicators() { return this.indicators; }
    getConditions() { return this.conditions; }
    getSignals() { return this.signals; }
    getFilters() { return this.filters; }
    getRiskManagement() { return this.riskManagement; }
    getComponentsByComplexity(complexity) {
        const components = [];
        for (const [key, value] of this.indicators.entries()) {
            if (value.complexity === complexity) {
                components.push({ type: 'indicator', key, ...value });
            }
        }
        for (const [key, value] of this.conditions.entries()) {
            if (value.complexity === complexity) {
                components.push({ type: 'condition', key, ...value });
            }
        }
        for (const [key, value] of this.riskManagement.entries()) {
            if (value.complexity === complexity) {
                components.push({ type: 'risk_management', key, ...value });
            }
        }
        return components;
    }
    getComponentsByMarketCondition(condition) {
        const components = [];
        for (const [key, value] of this.indicators.entries()) {
            if (value.marketConditions.includes(condition)) {
                components.push({ type: 'indicator', key, ...value });
            }
        }
        return components;
    }
}
exports.StrategyComponentLibrary = StrategyComponentLibrary;
// ============================================================================
// STRATEGY TEMPLATE GENERATOR
// ============================================================================
class StrategyTemplateGenerator {
    constructor(seed) {
        this.componentLibrary = new StrategyComponentLibrary();
        this.random = seed ? this.seededRandom(seed) : Math.random;
    }
    /**
     * Generuje nowy template strategii
     */
    generateTemplate(config) {
        const complexity = this.selectComplexity(config.maxComplexity);
        const marketTypes = config.targetMarketConditions.length > 0
            ? config.targetMarketConditions
            : ['bull', 'bear', 'sideways'];
        const components = this.selectComponents(complexity, marketTypes, config);
        const entryConditions = this.generateEntryConditions(components, complexity);
        const exitConditions = this.generateExitConditions(components, complexity);
        const riskManagement = this.generateRiskManagement(complexity);
        const template = {
            id: this.generateStrategyId(),
            name: this.generateStrategyName(components),
            description: this.generateDescription(components, entryConditions),
            components,
            entryConditions,
            exitConditions,
            riskManagement,
            timeframe: this.selectTimeframe(complexity),
            marketTypes: marketTypes,
            complexity,
            expectedPerformance: this.estimatePerformance(components, complexity)
        };
        return template;
    }
    selectComplexity(maxComplexity) {
        const complexityLevels = ['simple', 'medium', 'complex', 'advanced'];
        const maxIndex = complexityLevels.indexOf(maxComplexity);
        const selectedIndex = Math.floor(this.random() * (maxIndex + 1));
        return complexityLevels[selectedIndex];
    }
    selectComponents(complexity, marketTypes, config) {
        const components = [];
        // Select primary indicators (1-3 based on complexity)
        const numIndicators = complexity === 'simple' ? 1 :
            complexity === 'medium' ? 2 :
                complexity === 'complex' ? 3 : 4;
        const availableIndicators = this.componentLibrary.getComponentsByComplexity(complexity)
            .filter(c => c.type === 'indicator');
        // Fallback to all indicators if none available for this complexity
        const finalIndicators = availableIndicators.length > 0 ? availableIndicators :
            Array.from(this.componentLibrary.getIndicators().entries()).map(([key, value]) => ({
                type: 'indicator',
                key,
                ...value
            }));
        for (let i = 0; i < numIndicators; i++) {
            const indicator = finalIndicators[Math.floor(this.random() * finalIndicators.length)];
            const parameters = this.generateParameters(indicator.parameters || {});
            components.push({
                type: 'indicator',
                name: indicator.name,
                parameters,
                dependencies: [],
                weight: 0.5 + this.random() * 0.5
            });
        }
        // Add conditions based on complexity
        const numConditions = complexity === 'simple' ? 1 :
            complexity === 'medium' ? 2 : 3;
        const availableConditions = this.componentLibrary.getComponentsByComplexity(complexity)
            .filter(c => c.type === 'condition');
        // Fallback to all conditions if none available for this complexity
        const finalConditions = availableConditions.length > 0 ? availableConditions :
            Array.from(this.componentLibrary.getConditions().entries()).map(([key, value]) => ({
                type: 'condition',
                key,
                ...value
            }));
        for (let i = 0; i < numConditions; i++) {
            const condition = finalConditions[Math.floor(this.random() * finalConditions.length)];
            const parameters = this.generateParameters(condition.parameters || {});
            components.push({
                type: 'condition',
                name: condition.name,
                parameters,
                dependencies: components.filter(c => c.type === 'indicator').map(c => c.name),
                weight: 0.7 + this.random() * 0.3
            });
        }
        return components;
    }
    generateParameters(paramSpec) {
        const params = {};
        for (const [key, spec] of Object.entries(paramSpec)) {
            if (Array.isArray(spec)) {
                // Select random value from array
                params[key] = spec[Math.floor(this.random() * spec.length)];
            }
            else if (typeof spec === 'string') {
                // Generate based on type
                if (spec === 'number') {
                    params[key] = this.random();
                }
                else if (spec === 'string') {
                    params[key] = 'auto';
                }
            }
        }
        return params;
    }
    generateEntryConditions(components, complexity) {
        const conditions = [];
        const indicators = components.filter(c => c.type === 'indicator');
        if (indicators.length >= 1) {
            conditions.push(`${indicators[0].name} signal`);
        }
        if (complexity !== 'simple' && indicators.length >= 2) {
            conditions.push(`${indicators[0].name} AND ${indicators[1].name} confirmation`);
        }
        if (complexity === 'complex' || complexity === 'advanced') {
            conditions.push('Volume confirmation');
            conditions.push('Market regime filter');
        }
        return conditions;
    }
    generateExitConditions(components, complexity) {
        const conditions = [];
        conditions.push('Opposite signal');
        conditions.push('Time-based exit');
        if (complexity !== 'simple') {
            conditions.push('Profit target reached');
            conditions.push('Momentum exhaustion');
        }
        return conditions;
    }
    generateRiskManagement(complexity) {
        const risk = [];
        risk.push('Stop loss');
        if (complexity !== 'simple') {
            risk.push('Position sizing');
            risk.push('Risk per trade limit');
        }
        if (complexity === 'complex' || complexity === 'advanced') {
            risk.push('Correlation limits');
            risk.push('Drawdown protection');
        }
        return risk;
    }
    selectTimeframe(complexity) {
        const timeframes = {
            simple: ['1h', '4h', '1d'],
            medium: ['15m', '1h', '4h', '1d'],
            complex: ['5m', '15m', '1h', '4h'],
            advanced: ['1m', '5m', '15m', '1h']
        };
        const available = timeframes[complexity];
        return available[Math.floor(this.random() * available.length)];
    }
    estimatePerformance(components, complexity) {
        // Estimate performance based on component characteristics
        const baseReturn = complexity === 'simple' ? [0.05, 0.15] :
            complexity === 'medium' ? [0.10, 0.25] :
                complexity === 'complex' ? [0.15, 0.35] : [0.20, 0.50];
        const baseSharpe = complexity === 'simple' ? [0.8, 1.5] :
            complexity === 'medium' ? [1.0, 2.0] :
                complexity === 'complex' ? [1.2, 2.5] : [1.5, 3.0];
        return {
            returnRange: baseReturn,
            sharpeRange: baseSharpe,
            maxDrawdown: 0.05 + this.random() * 0.15,
            winRate: 0.45 + this.random() * 0.25
        };
    }
    generateStrategyId() {
        return `STRAT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateStrategyName(components) {
        const indicators = components.filter(c => c.type === 'indicator').map(c => c.name);
        const primary = indicators[0] || 'Dynamic';
        const secondary = indicators[1] || '';
        const prefixes = ['Advanced', 'Adaptive', 'Smart', 'Dynamic', 'Hybrid', 'Quantum'];
        const prefix = prefixes[Math.floor(this.random() * prefixes.length)];
        return secondary ? `${prefix} ${primary}-${secondary}` : `${prefix} ${primary}`;
    }
    generateDescription(components, entryConditions) {
        const indicators = components.filter(c => c.type === 'indicator').map(c => c.name).join(', ');
        return `AI-generated strategy combining ${indicators} with ${entryConditions.length} entry conditions for optimal market timing.`;
    }
    seededRandom(seed) {
        let state = seed;
        return function () {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }
}
exports.StrategyTemplateGenerator = StrategyTemplateGenerator;
// ============================================================================
// STRATEGY CODE GENERATOR
// ============================================================================
class StrategyCodeGenerator {
    /**
     * Generuje kod TypeScript dla strategii
     */
    generateStrategyCode(template) {
        const className = this.generateClassName(template.name);
        const imports = this.generateImports(template);
        const classDefinition = this.generateClassDefinition(className, template);
        const constructor = this.generateConstructor(template);
        const runMethod = this.generateRunMethod(template);
        const helperMethods = this.generateHelperMethods(template);
        return `${imports}

/**
 * ${template.name}
 * ${template.description}
 * 
 * Generated by AI Strategy Generator v3.3.0
 * ID: ${template.id}
 * Complexity: ${template.complexity}
 * Target Markets: ${template.marketTypes.join(', ')}
 */
${classDefinition} {
${constructor}

${runMethod}

${helperMethods}
}

export default ${className};`;
    }
    generateClassName(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '') + 'Strategy';
    }
    generateImports(template) {
        return `import { AbstractStrategy } from './abstract_strategy';
import { BotState, StrategySignal, SignalType } from '../types/strategy';
import { TechnicalIndicators } from '../indicators/technical_indicators';
import { RiskManager } from '../risk/risk_manager';`;
    }
    generateClassDefinition(className, template) {
        return `export class ${className} implements AbstractStrategy {
    readonly name: string = '${template.name}';
    readonly description: string = '${template.description}';
    readonly defaultWeight: number = 1.0;
    weight: number = 1.0;
    
    private readonly timeframe: string = '${template.timeframe}';
    private readonly complexity: string = '${template.complexity}';
    private readonly marketTypes: string[] = [${template.marketTypes.map(t => `'${t}'`).join(', ')}];`;
    }
    generateConstructor(template) {
        const parameterInitialization = template.components
            .map(c => `        this.${c.name.toLowerCase().replace(/[^a-z0-9]/g, '')}Params = ${JSON.stringify(c.parameters)};`)
            .join('\n');
        return `    // Strategy parameters
${template.components.map(c => `    private ${c.name.toLowerCase().replace(/[^a-z0-9]/g, '')}Params: any;`).join('\n')}
    
    constructor() {
${parameterInitialization}
    }`;
    }
    generateRunMethod(template) {
        const indicatorCalculations = this.generateIndicatorCalculations(template);
        const entryLogic = this.generateEntryLogic(template);
        const exitLogic = this.generateExitLogic(template);
        const riskManagement = this.generateRiskManagementCode(template);
        return `    async run(state: BotState): Promise<StrategySignal[]> {
        const signals: StrategySignal[] = [];
        const currentPrice = state.currentPrice;
        const candles = state.candles;
        
        if (!candles || candles.length < 50) {
            return signals;
        }

        try {
            // Calculate technical indicators
${indicatorCalculations}
            
            // Entry logic
${entryLogic}
            
            // Exit logic  
${exitLogic}
            
            // Apply risk management
${riskManagement}
            
        } catch (error) {
            console.error(\`Error in \${this.name}:\`, error);
        }
        
        return signals;
    }`;
    }
    generateIndicatorCalculations(template) {
        const indicators = template.components.filter(c => c.type === 'indicator');
        return indicators.map(indicator => {
            const varName = indicator.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const params = Object.entries(indicator.parameters)
                .map(([key, value]) => `${key}: ${typeof value === 'string' ? `'${value}'` : value}`)
                .join(', ');
            return `            const ${varName} = await TechnicalIndicators.calculate('${indicator.name.toLowerCase()}', candles, { ${params} });`;
        }).join('\n');
    }
    generateEntryLogic(template) {
        const indicators = template.components.filter(c => c.type === 'indicator');
        const conditions = template.entryConditions;
        let logic = `            // Entry conditions\n`;
        if (indicators.length >= 1) {
            const primary = indicators[0].name.toLowerCase().replace(/[^a-z0-9]/g, '');
            logic += `            const ${primary}Signal = this.check${indicators[0].name.replace(/[^a-zA-Z0-9]/g, '')}Signal(${primary}, currentPrice);\n`;
        }
        if (indicators.length >= 2) {
            const secondary = indicators[1].name.toLowerCase().replace(/[^a-z0-9]/g, '');
            logic += `            const ${secondary}Confirmation = this.check${indicators[1].name.replace(/[^a-zA-Z0-9]/g, '')}Confirmation(${secondary});\n`;
        }
        logic += `            
            if (${this.generateConditionCheck(indicators, conditions)}) {
                signals.push({
                    type: this.determineSignalType(${indicators.map(i => i.name.toLowerCase().replace(/[^a-z0-9]/g, '')).join(', ')}),
                    strength: this.calculateSignalStrength(${indicators.map(i => i.name.toLowerCase().replace(/[^a-z0-9]/g, '')).join(', ')}),
                    price: currentPrice,
                    timestamp: Date.now(),
                    metadata: {
                        strategy: this.name,
                        timeframe: this.timeframe,
                        confidence: this.calculateConfidence(${indicators.map(i => i.name.toLowerCase().replace(/[^a-z0-9]/g, '')).join(', ')})
                    }
                });
            }`;
        return logic;
    }
    generateConditionCheck(indicators, conditions) {
        if (indicators.length === 0)
            return 'false';
        const primary = indicators[0].name.toLowerCase().replace(/[^a-z0-9]/g, '');
        let check = `${primary}Signal`;
        if (indicators.length >= 2) {
            const secondary = indicators[1].name.toLowerCase().replace(/[^a-z0-9]/g, '');
            check += ` && ${secondary}Confirmation`;
        }
        return check;
    }
    generateExitLogic(template) {
        return `            // Exit logic
            const hasOpenPosition = state.position && state.position.size !== 0;
            
            if (hasOpenPosition) {
                const exitSignal = this.checkExitConditions(state);
                if (exitSignal) {
                    signals.push({
                        type: SignalType.CLOSE,
                        strength: 1.0,
                        price: currentPrice,
                        timestamp: Date.now(),
                        metadata: {
                            strategy: this.name,
                            reason: exitSignal.reason
                        }
                    });
                }
            }`;
    }
    generateRiskManagementCode(template) {
        return `            // Risk management
            if (signals.length > 0) {
                signals.forEach(signal => {
                    signal.positionSize = RiskManager.calculatePositionSize(
                        state.balance,
                        currentPrice,
                        this.calculateRisk(signal)
                    );
                    
                    signal.stopLoss = this.calculateStopLoss(signal);
                    signal.takeProfit = this.calculateTakeProfit(signal);
                });
            }`;
    }
    generateHelperMethods(template) {
        const indicators = template.components.filter(c => c.type === 'indicator');
        let methods = '';
        // Generate signal check methods for each indicator
        indicators.forEach(indicator => {
            const methodName = `check${indicator.name.replace(/[^a-zA-Z0-9]/g, '')}Signal`;
            const varName = indicator.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            methods += `
    private ${methodName}(${varName}: any, currentPrice: number): boolean {
        // Implementation for ${indicator.name} signal detection
        if (!${varName} || ${varName}.length === 0) return false;
        
        const latest = ${varName}[${varName}.length - 1];
        const previous = ${varName}[${varName}.length - 2];
        
        ${this.generateIndicatorSpecificLogic(indicator)}
        
        return false;
    }`;
        });
        // Add common helper methods
        methods += `
    private determineSignalType(...indicators: any[]): SignalType {
        // Logic to determine BUY/SELL based on indicators
        return SignalType.BUY; // Simplified
    }
    
    private calculateSignalStrength(...indicators: any[]): number {
        // Calculate signal strength from 0 to 1
        return 0.7 + Math.random() * 0.3;
    }
    
    private calculateConfidence(...indicators: any[]): number {
        // Calculate confidence level
        return 0.6 + Math.random() * 0.4;
    }
    
    private checkExitConditions(state: BotState): any {
        // Exit condition logic
        return null;
    }
    
    private calculateRisk(signal: StrategySignal): number {
        return 0.02; // 2% risk
    }
    
    private calculateStopLoss(signal: StrategySignal): number {
        return signal.price * 0.98; // 2% stop loss
    }
    
    private calculateTakeProfit(signal: StrategySignal): number {
        return signal.price * 1.04; // 4% take profit
    }
    
    setWeight(weight: number): void {
        this.weight = weight;
    }
    
    getWeight(): number {
        return this.weight;
    }
    
    validateConfig(): boolean {
        return true;
    }
    
    getRequiredIndicators(): string[] {
        return [${template.components.filter(c => c.type === 'indicator').map(c => `'${c.name}'`).join(', ')}];
    }
    
    getRequiredTimeframes(): string[] {
        return ['${template.timeframe}'];
    }`;
        return methods;
    }
    generateIndicatorSpecificLogic(indicator) {
        switch (indicator.name.toLowerCase()) {
            case 'rsi':
                return `        // RSI signal logic
        if (latest > ${indicator.parameters.overbought || 70}) return true; // Sell signal
        if (latest < ${indicator.parameters.oversold || 30}) return true; // Buy signal`;
            case 'macd':
                return `        // MACD signal logic
        if (latest.macd > latest.signal && previous.macd <= previous.signal) return true; // Bullish crossover`;
            case 'bollinger bands':
                return `        // Bollinger Bands logic
        if (currentPrice <= latest.lower) return true; // Oversold
        if (currentPrice >= latest.upper) return true; // Overbought`;
            default:
                return `        // Generic indicator logic
        return latest > previous; // Simplified momentum check`;
        }
    }
}
exports.StrategyCodeGenerator = StrategyCodeGenerator;
// ============================================================================
// STRATEGY EVOLUTION ENGINE  
// ============================================================================
class StrategyEvolutionEngine extends events_1.EventEmitter {
    constructor(config, marketData, backtestConfig) {
        super();
        this.population = [];
        this.generation = 0;
        this.config = config;
        this.templateGenerator = new StrategyTemplateGenerator();
        this.codeGenerator = new StrategyCodeGenerator();
        this.backtestingSystem = new advanced_backtesting_1.AdvancedBacktestingSystem(marketData, backtestConfig);
    }
    /**
     * Uruchamia proces ewolucji strategii
     */
    async evolveStrategies(generationConfig, maxGenerations) {
        const generations = maxGenerations || this.config.maxGenerations;
        this.emit('evolutionStart', {
            populationSize: this.config.populationSize,
            maxGenerations: generations
        });
        // Initialize population
        await this.initializePopulation(generationConfig);
        for (let gen = 0; gen < generations; gen++) {
            this.generation = gen;
            this.emit('generationStart', { generation: gen, population: this.population.length });
            // Evaluate fitness
            await this.evaluatePopulation();
            // Selection, crossover, mutation
            this.population = await this.evolveGeneration();
            // Report progress
            const best = this.getBestStrategy();
            this.emit('generationComplete', {
                generation: gen,
                bestFitness: best?.performance?.totalReturn || 0,
                avgFitness: this.getAverageFitness(),
                diversity: this.calculateDiversity()
            });
            // Early stopping if converged
            if (this.hasConverged()) {
                this.emit('earlyConvergence', { generation: gen });
                break;
            }
        }
        const finalPopulation = this.population.sort((a, b) => (b.performance?.totalReturn || 0) - (a.performance?.totalReturn || 0));
        this.emit('evolutionComplete', {
            generations: this.generation + 1,
            finalPopulation: finalPopulation.slice(0, 10) // Top 10
        });
        return finalPopulation;
    }
    async initializePopulation(config) {
        this.population = [];
        for (let i = 0; i < this.config.populationSize; i++) {
            const template = this.templateGenerator.generateTemplate(config);
            const code = this.codeGenerator.generateStrategyCode(template);
            const dnaSignature = this.generateDnaSignature(template);
            const strategy = {
                template,
                generatedCode: code,
                dnaSignature,
                generation: 0,
                mutations: [],
                validationScore: 0,
                confidence: 0
            };
            this.population.push(strategy);
        }
        this.emit('populationInitialized', { size: this.population.length });
    }
    async evaluatePopulation() {
        // Parallel evaluation of strategies
        const evaluationPromises = this.population.map(async (strategy, index) => {
            if (!strategy.performance) {
                this.emit('strategyEvaluationStart', { index, id: strategy.template.id });
                try {
                    // Mock evaluation - in real implementation would run actual backtest
                    const performance = await this.evaluateStrategy(strategy);
                    strategy.performance = performance;
                    strategy.validationScore = this.calculateValidationScore(strategy);
                    strategy.confidence = this.calculateConfidence(strategy);
                    this.emit('strategyEvaluationComplete', {
                        index,
                        id: strategy.template.id,
                        performance
                    });
                }
                catch (error) {
                    this.emit('strategyEvaluationError', { index, error });
                    // Assign poor performance for failed strategies
                    strategy.performance = this.createPoorPerformance();
                    strategy.validationScore = 0;
                    strategy.confidence = 0;
                }
            }
        });
        await Promise.all(evaluationPromises);
    }
    async evaluateStrategy(strategy) {
        // Mock implementation - would run actual strategy code
        const template = strategy.template;
        const baseReturn = (template.expectedPerformance.returnRange[0] + template.expectedPerformance.returnRange[1]) / 2;
        const baseSharpe = (template.expectedPerformance.sharpeRange[0] + template.expectedPerformance.sharpeRange[1]) / 2;
        // Add some randomness and complexity bonus
        const complexityBonus = template.complexity === 'advanced' ? 0.05 :
            template.complexity === 'complex' ? 0.03 :
                template.complexity === 'medium' ? 0.01 : 0;
        const noise = (Math.random() - 0.5) * 0.1; // ±5% noise
        return {
            totalReturn: baseReturn + complexityBonus + noise,
            sharpeRatio: baseSharpe + noise * 2,
            maxDrawdown: template.expectedPerformance.maxDrawdown,
            winRate: template.expectedPerformance.winRate,
            profitFactor: 1.2 + Math.random() * 0.8,
            trades: 50 + Math.floor(Math.random() * 100),
            avgTrade: (baseReturn + complexityBonus + noise) / 75,
            volatility: 0.15 + Math.random() * 0.1,
            calmarRatio: (baseReturn + complexityBonus + noise) / template.expectedPerformance.maxDrawdown,
            sortinoRatio: baseSharpe * 1.2,
            beta: 0.7 + Math.random() * 0.6,
            alpha: baseReturn + complexityBonus + noise - 0.05,
            informationRatio: baseSharpe * 0.8,
            trackingError: 0.08 + Math.random() * 0.04,
            var95: -0.04 - Math.random() * 0.02,
            cvar95: -0.06 - Math.random() * 0.03,
            stability: 0.6 + Math.random() * 0.3,
            tailRatio: 0.8 + Math.random() * 0.4,
            skewness: -0.1 + Math.random() * 0.2,
            kurtosis: 2.5 + Math.random() * 1.5
        };
    }
    async evolveGeneration() {
        // Sort by fitness
        const sorted = this.population.sort((a, b) => this.calculateFitness(b) - this.calculateFitness(a));
        // Elite selection
        const eliteCount = Math.floor(this.config.populationSize * this.config.elitismRate);
        const newPopulation = sorted.slice(0, eliteCount);
        // Generate offspring through crossover and mutation
        while (newPopulation.length < this.config.populationSize) {
            const parent1 = this.tournamentSelection();
            const parent2 = this.tournamentSelection();
            let offspring;
            if (Math.random() < this.config.crossoverRate) {
                offspring = await this.crossover(parent1, parent2);
            }
            else {
                offspring = this.cloneStrategy(parent1);
            }
            if (Math.random() < this.config.mutationRate) {
                offspring = await this.mutate(offspring);
            }
            newPopulation.push(offspring);
        }
        return newPopulation;
    }
    calculateFitness(strategy) {
        if (!strategy.performance)
            return 0;
        const performance = strategy.performance;
        const performanceScore = performance.totalReturn * this.config.performanceWeight;
        const stabilityScore = performance.sharpeRatio * this.config.stabilityWeight;
        const diversityScore = this.calculateStrategyDiversity(strategy) * this.config.diversityWeight;
        const noveltyScore = this.calculateNovelty(strategy) * this.config.noveltyWeight;
        return performanceScore + stabilityScore + diversityScore + noveltyScore;
    }
    tournamentSelection() {
        const tournamentSize = 3;
        const tournament = [];
        for (let i = 0; i < tournamentSize; i++) {
            const random = Math.floor(Math.random() * this.population.length);
            tournament.push(this.population[random]);
        }
        return tournament.sort((a, b) => this.calculateFitness(b) - this.calculateFitness(a))[0];
    }
    async crossover(parent1, parent2) {
        // Crossover between templates
        const childTemplate = this.crossoverTemplates(parent1.template, parent2.template);
        const childCode = this.codeGenerator.generateStrategyCode(childTemplate);
        const dnaSignature = this.generateDnaSignature(childTemplate);
        return {
            template: childTemplate,
            generatedCode: childCode,
            dnaSignature,
            generation: this.generation + 1,
            parentStrategies: [parent1.template.id, parent2.template.id],
            mutations: [],
            validationScore: 0,
            confidence: 0
        };
    }
    crossoverTemplates(template1, template2) {
        // Mix components from both parents
        const components1 = template1.components;
        const components2 = template2.components;
        const childComponents = [];
        const maxComponents = Math.max(components1.length, components2.length);
        for (let i = 0; i < maxComponents; i++) {
            if (Math.random() < 0.5 && i < components1.length) {
                childComponents.push(components1[i]);
            }
            else if (i < components2.length) {
                childComponents.push(components2[i]);
            }
        }
        // Mix other properties
        const childTemplate = {
            id: this.templateGenerator.generateStrategyId(),
            name: Math.random() < 0.5 ? template1.name : template2.name,
            description: `Hybrid of ${template1.name} and ${template2.name}`,
            components: childComponents,
            entryConditions: Math.random() < 0.5 ? template1.entryConditions : template2.entryConditions,
            exitConditions: Math.random() < 0.5 ? template1.exitConditions : template2.exitConditions,
            riskManagement: Math.random() < 0.5 ? template1.riskManagement : template2.riskManagement,
            timeframe: Math.random() < 0.5 ? template1.timeframe : template2.timeframe,
            marketTypes: [...new Set([...template1.marketTypes, ...template2.marketTypes])],
            complexity: template1.complexity === template2.complexity ? template1.complexity : 'medium',
            expectedPerformance: {
                returnRange: [
                    (template1.expectedPerformance.returnRange[0] + template2.expectedPerformance.returnRange[0]) / 2,
                    (template1.expectedPerformance.returnRange[1] + template2.expectedPerformance.returnRange[1]) / 2
                ],
                sharpeRange: [
                    (template1.expectedPerformance.sharpeRange[0] + template2.expectedPerformance.sharpeRange[0]) / 2,
                    (template1.expectedPerformance.sharpeRange[1] + template2.expectedPerformance.sharpeRange[1]) / 2
                ],
                maxDrawdown: (template1.expectedPerformance.maxDrawdown + template2.expectedPerformance.maxDrawdown) / 2,
                winRate: (template1.expectedPerformance.winRate + template2.expectedPerformance.winRate) / 2
            }
        };
        return childTemplate;
    }
    async mutate(strategy) {
        const mutatedTemplate = this.mutateTemplate(strategy.template);
        const mutatedCode = this.codeGenerator.generateStrategyCode(mutatedTemplate);
        const dnaSignature = this.generateDnaSignature(mutatedTemplate);
        const mutations = [...strategy.mutations];
        mutations.push(`Gen${this.generation}_${this.generateMutationId()}`);
        return {
            template: mutatedTemplate,
            generatedCode: mutatedCode,
            dnaSignature,
            generation: this.generation + 1,
            parentStrategies: strategy.parentStrategies,
            mutations,
            validationScore: 0,
            confidence: 0
        };
    }
    mutateTemplate(template) {
        const mutated = JSON.parse(JSON.stringify(template)); // Deep copy
        // Random mutations
        if (Math.random() < 0.3) {
            // Mutate component parameters
            const component = mutated.components[Math.floor(Math.random() * mutated.components.length)];
            const paramKeys = Object.keys(component.parameters);
            if (paramKeys.length > 0) {
                const key = paramKeys[Math.floor(Math.random() * paramKeys.length)];
                if (typeof component.parameters[key] === 'number') {
                    component.parameters[key] *= (0.8 + Math.random() * 0.4); // ±20% change
                }
            }
        }
        if (Math.random() < 0.2) {
            // Mutate timeframe
            const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
            mutated.timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
        }
        if (Math.random() < 0.1) {
            // Mutate market types
            const allMarkets = ['bull', 'bear', 'sideways', 'volatile'];
            mutated.marketTypes = allMarkets.filter(() => Math.random() < 0.7);
        }
        mutated.id = this.templateGenerator.generateStrategyId();
        mutated.name = 'Mutated ' + mutated.name;
        return mutated;
    }
    generateDnaSignature(template) {
        // Create unique signature based on template characteristics
        const components = template.components.map(c => c.name).sort().join('|');
        const params = JSON.stringify(template.components.map(c => c.parameters));
        const hash = this.simpleHash(components + params + template.timeframe);
        return `DNA_${hash}`;
    }
    generateMutationId() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    cloneStrategy(strategy) {
        return {
            template: JSON.parse(JSON.stringify(strategy.template)),
            generatedCode: strategy.generatedCode,
            dnaSignature: strategy.dnaSignature,
            generation: this.generation + 1,
            parentStrategies: strategy.parentStrategies,
            mutations: [...strategy.mutations],
            validationScore: strategy.validationScore,
            confidence: strategy.confidence
        };
    }
    calculateValidationScore(strategy) {
        if (!strategy.performance)
            return 0;
        const perf = strategy.performance;
        let score = 0;
        // Performance criteria
        if (perf.totalReturn > 0.1)
            score += 0.3;
        if (perf.sharpeRatio > 1.0)
            score += 0.3;
        if (perf.maxDrawdown < 0.15)
            score += 0.2;
        if (perf.winRate > 0.5)
            score += 0.2;
        return Math.min(score, 1.0);
    }
    calculateConfidence(strategy) {
        const validationScore = strategy.validationScore;
        const complexity = strategy.template.complexity;
        let confidence = validationScore;
        // Complexity bonus
        if (complexity === 'advanced')
            confidence *= 1.2;
        else if (complexity === 'complex')
            confidence *= 1.1;
        // Generation bonus (older generations are more tested)
        confidence *= Math.min(1.0 + strategy.generation * 0.05, 1.5);
        return Math.min(confidence, 1.0);
    }
    calculateStrategyDiversity(strategy) {
        // Calculate how different this strategy is from others
        let diversityScore = 0;
        const comparisons = Math.min(this.population.length, 10);
        for (let i = 0; i < comparisons; i++) {
            const other = this.population[i];
            if (other.dnaSignature !== strategy.dnaSignature) {
                diversityScore += this.calculateSimilarity(strategy, other);
            }
        }
        return 1.0 - (diversityScore / comparisons);
    }
    calculateNovelty(strategy) {
        // How novel is this strategy compared to existing ones
        const uniqueComponents = new Set(strategy.template.components.map(c => c.name));
        const totalComponents = strategy.template.components.length;
        return uniqueComponents.size / totalComponents;
    }
    calculateSimilarity(strategy1, strategy2) {
        const components1 = new Set(strategy1.template.components.map(c => c.name));
        const components2 = new Set(strategy2.template.components.map(c => c.name));
        const intersection = new Set([...components1].filter(x => components2.has(x)));
        const union = new Set([...components1, ...components2]);
        return intersection.size / union.size; // Jaccard similarity
    }
    getBestStrategy() {
        return this.population.reduce((best, current) => this.calculateFitness(current) > this.calculateFitness(best) ? current : best);
    }
    getAverageFitness() {
        return this.population.reduce((sum, strategy) => sum + this.calculateFitness(strategy), 0) / this.population.length;
    }
    calculateDiversity() {
        const uniqueDna = new Set(this.population.map(s => s.dnaSignature));
        return uniqueDna.size / this.population.length;
    }
    hasConverged() {
        const fitnesses = this.population.map(s => this.calculateFitness(s));
        const max = Math.max(...fitnesses);
        const min = Math.min(...fitnesses);
        return (max - min) / max < 0.01; // 1% difference threshold
    }
    createPoorPerformance() {
        return {
            totalReturn: -0.1,
            sharpeRatio: -0.5,
            maxDrawdown: 0.3,
            winRate: 0.3,
            profitFactor: 0.5,
            trades: 10,
            avgTrade: -0.01,
            volatility: 0.3,
            calmarRatio: -0.33,
            sortinoRatio: -0.6,
            beta: 1.2,
            alpha: -0.15,
            informationRatio: -0.4,
            trackingError: 0.2,
            var95: -0.1,
            cvar95: -0.15,
            stability: 0.2,
            tailRatio: 0.3,
            skewness: -0.5,
            kurtosis: 4.0
        };
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
}
exports.StrategyEvolutionEngine = StrategyEvolutionEngine;
// ============================================================================
// MAIN AUTOMATIC STRATEGY GENERATOR
// ============================================================================
class AutomaticStrategyGenerator extends events_1.EventEmitter {
    constructor(marketData, backtestConfig) {
        super();
        this.templateGenerator = new StrategyTemplateGenerator();
        this.codeGenerator = new StrategyCodeGenerator();
        this.componentLibrary = new StrategyComponentLibrary();
        const evolutionConfig = {
            populationSize: 50,
            maxGenerations: 20,
            mutationRate: 0.15,
            crossoverRate: 0.7,
            elitismRate: 0.1,
            diversityWeight: 0.2,
            performanceWeight: 0.4,
            stabilityWeight: 0.3,
            noveltyWeight: 0.1
        };
        this.evolutionEngine = new StrategyEvolutionEngine(evolutionConfig, marketData, backtestConfig);
        this.forwardEvolutionEvents();
    }
    /**
     * Główna metoda generowania i testowania strategii
     */
    async generateAndTestStrategies(generationConfig, maxGenerations = 10) {
        this.emit('generationStart', { config: generationConfig, maxGenerations });
        // Run evolution
        const finalPopulation = await this.evolutionEngine.evolveStrategies(generationConfig, maxGenerations);
        // Analyze results
        const bestStrategies = finalPopulation.slice(0, 10); // Top 10
        const tested = finalPopulation.filter(s => s.performance).length;
        const successful = finalPopulation.filter(s => s.performance && s.performance.totalReturn > 0).length;
        const summary = {
            totalGenerated: finalPopulation.length,
            totalTested: tested,
            successRate: tested > 0 ? successful / tested : 0,
            averagePerformance: this.calculateAveragePerformance(finalPopulation),
            bestPerformance: Math.max(...finalPopulation.map(s => s.performance?.totalReturn || 0))
        };
        this.emit('generationComplete', { bestStrategies, summary });
        return {
            bestStrategies,
            generationStats: [], // Would contain per-generation statistics
            summary
        };
    }
    /**
     * Zapisuje wygenerowane strategie do plików
     */
    async saveStrategies(strategies, outputDir) {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        for (const strategy of strategies) {
            // Save TypeScript code
            const codeFilename = `${strategy.template.id}.ts`;
            const codePath = path.join(outputDir, codeFilename);
            await fs.promises.writeFile(codePath, strategy.generatedCode);
            // Save strategy metadata
            const metaFilename = `${strategy.template.id}.json`;
            const metaPath = path.join(outputDir, metaFilename);
            const metadata = {
                template: strategy.template,
                dnaSignature: strategy.dnaSignature,
                generation: strategy.generation,
                mutations: strategy.mutations,
                performance: strategy.performance,
                validationScore: strategy.validationScore,
                confidence: strategy.confidence
            };
            await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2));
        }
        this.emit('strategiesSaved', { count: strategies.length, outputDir });
    }
    calculateAveragePerformance(strategies) {
        const performances = strategies.filter(s => s.performance).map(s => s.performance.totalReturn);
        return performances.length > 0 ? performances.reduce((sum, p) => sum + p, 0) / performances.length : 0;
    }
    forwardEvolutionEvents() {
        this.evolutionEngine.on('evolutionStart', (data) => this.emit('evolutionStart', data));
        this.evolutionEngine.on('generationStart', (data) => this.emit('evolutionGenerationStart', data));
        this.evolutionEngine.on('generationComplete', (data) => this.emit('evolutionGenerationComplete', data));
        this.evolutionEngine.on('strategyEvaluationStart', (data) => this.emit('strategyEvaluationStart', data));
        this.evolutionEngine.on('strategyEvaluationComplete', (data) => this.emit('strategyEvaluationComplete', data));
        this.evolutionEngine.on('evolutionComplete', (data) => this.emit('evolutionComplete', data));
    }
}
exports.AutomaticStrategyGenerator = AutomaticStrategyGenerator;
exports.default = AutomaticStrategyGenerator;
