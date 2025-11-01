/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * Strategy Adapters for Advanced Strategy Orchestrator
 * Enterprise Trading Bot - Strategy Integration Layer
 * 
 * This module provides adapters to integrate existing trading strategies
 * with the new Advanced Strategy Orchestrator system.
 */

import type { 
    BaseStrategy, 
    TradingSignal, 
    StrategyPerformance
} from './advanced_strategy_orchestrator';
import type { NormalizedMarketData } from '../integration/real_time_market_data_engine';

// Import existing strategies
interface ExistingStrategy {
    generateSignal?(data: any): Promise<any> | any;
    getSignal?(data: any): Promise<any> | any;
    analyze?(data: any): Promise<any> | any;
    // Other potential method names from existing strategies
}

export class StrategyAdapter implements BaseStrategy {
    public name: string;
    public timeframe: string;
    public enabled: boolean = true;
    public priority: number;
    public riskLevel: 'low' | 'medium' | 'high';
    public marketRegimes: string[];
    
    private strategy: ExistingStrategy;
    private performanceMetrics: StrategyPerformance;
    private parameters: any;

    constructor(
        strategy: ExistingStrategy,
        config: {
            name: string;
            timeframe: string;
            priority: number;
            riskLevel: 'low' | 'medium' | 'high';
            marketRegimes: string[];
            parameters?: any;
        }
    ) {
        this.strategy = strategy;
        this.name = config.name;
        this.timeframe = config.timeframe;
        this.priority = config.priority;
        this.riskLevel = config.riskLevel;
        this.marketRegimes = config.marketRegimes;
        this.parameters = config.parameters || {};

        this.performanceMetrics = {
            name: this.name,
            totalSignals: 0,
            successfulSignals: 0,
            failedSignals: 0,
            winRate: 0,
            avgLatency: 0,
            memoryUsage: 0,
            errorRate: 0,
            lastExecutionTime: 0,
            profitLoss: 0
        };
    }

    public async generateSignal(data: NormalizedMarketData): Promise<TradingSignal> {
        const startTime = Date.now();
        
        try {
            // Try different method names that might exist on the strategy
            let rawSignal: any = null;
            
            if (typeof this.strategy.generateSignal === 'function') {
                rawSignal = await this.strategy.generateSignal(data);
            } else if (typeof this.strategy.getSignal === 'function') {
                rawSignal = await this.strategy.getSignal(data);
            } else if (typeof this.strategy.analyze === 'function') {
                rawSignal = await this.strategy.analyze(data);
            } else {
                throw new Error(`Strategy ${this.name} does not have a compatible signal method`);
            }

            // Normalize the signal to our standard format
            const normalizedSignal = this.normalizeSignal(rawSignal, data);
            
            // Update performance metrics
            this.performanceMetrics.totalSignals++;
            this.performanceMetrics.avgLatency = 
                (this.performanceMetrics.avgLatency + (Date.now() - startTime)) / 2;
            this.performanceMetrics.lastExecutionTime = Date.now();
            
            return normalizedSignal;

        } catch (error) {
            this.performanceMetrics.failedSignals++;
            this.performanceMetrics.errorRate = 
                this.performanceMetrics.failedSignals / this.performanceMetrics.totalSignals;
            
            console.error(`[STRATEGY ADAPTER] Error in ${this.name}:`, error);
            
            // Return neutral signal on error
            return this.createNeutralSignal(data);
        }
    }

    public getPerformanceMetrics(): StrategyPerformance {
        this.performanceMetrics.winRate = this.performanceMetrics.totalSignals > 0 
            ? this.performanceMetrics.successfulSignals / this.performanceMetrics.totalSignals 
            : 0;
            
        return { ...this.performanceMetrics };
    }

    public updateParameters(params: any): void {
        this.parameters = { ...this.parameters, ...params };
        
        // If the underlying strategy has an update method, call it
        if (typeof (this.strategy as any).updateParameters === 'function') {
            (this.strategy as any).updateParameters(this.parameters);
        }
    }

    private normalizeSignal(rawSignal: any, data: NormalizedMarketData): TradingSignal {
        // Handle different signal formats from existing strategies
        let action: 'buy' | 'sell' | 'hold' = 'hold';
        let strength: number = 50;
        let confidence: number = 50;
        let reasoning: string = `Signal from ${this.name}`;
        let metadata: any = {};

        if (rawSignal) {
            // Handle different signal formats
            if (typeof rawSignal === 'string') {
                action = this.parseStringSignal(rawSignal);
            } else if (typeof rawSignal === 'object') {
                action = this.parseObjectSignal(rawSignal);
                strength = rawSignal.strength || rawSignal.power || rawSignal.score || 50;
                confidence = rawSignal.confidence || rawSignal.certainty || rawSignal.probability || 50;
                reasoning = rawSignal.reasoning || rawSignal.explanation || reasoning;
                metadata = rawSignal.metadata || rawSignal.extra || {};
            } else if (typeof rawSignal === 'number') {
                action = this.parseNumericSignal(rawSignal);
                strength = Math.abs(rawSignal);
                confidence = Math.min(Math.abs(rawSignal), 100);
            }
        }

        return {
            strategy: this.name,
            symbol: data.symbol,
            action,
            strength: Math.max(0, Math.min(100, strength)),
            confidence: Math.max(0, Math.min(100, confidence)),
            timeframe: this.timeframe,
            timestamp: Date.now(),
            reasoning,
            metadata: {
                entry_price: data.price,
                risk_score: this.calculateRiskScore(action, strength),
                position_size: this.calculatePositionSize(action, strength, confidence),
                ...metadata
            }
        };
    }

    private parseStringSignal(signal: string): 'buy' | 'sell' | 'hold' {
        const lowerSignal = signal.toLowerCase();
        if (lowerSignal.includes('buy') || lowerSignal.includes('long')) return 'buy';
        if (lowerSignal.includes('sell') || lowerSignal.includes('short')) return 'sell';
        return 'hold';
    }

    private parseObjectSignal(signal: any): 'buy' | 'sell' | 'hold' {
        // Handle common object signal formats
        if (signal.action) return signal.action;
        if (signal.signal) return this.parseStringSignal(signal.signal);
        if (signal.direction) {
            if (signal.direction > 0) return 'buy';
            if (signal.direction < 0) return 'sell';
        }
        if (signal.recommendation) return this.parseStringSignal(signal.recommendation);
        
        return 'hold';
    }

    private parseNumericSignal(signal: number): 'buy' | 'sell' | 'hold' {
        if (signal > 0.1) return 'buy';
        if (signal < -0.1) return 'sell';
        return 'hold';
    }

    private calculateRiskScore(action: string, strength: number): number {
        const baseRisk = {
            'low': 20,
            'medium': 50,
            'high': 80
        }[this.riskLevel];

        return Math.min(100, baseRisk + (strength * 0.3));
    }

    private calculatePositionSize(action: string, strength: number, confidence: number): number {
        if (action === 'hold') return 0;
        
        const baseSize = 0.1; // 10%
        const strengthFactor = strength / 100;
        const confidenceFactor = confidence / 100;
        const riskFactor = this.riskLevel === 'low' ? 0.5 : this.riskLevel === 'medium' ? 1.0 : 1.5;
        
        return baseSize * strengthFactor * confidenceFactor * riskFactor;
    }

    private createNeutralSignal(data: NormalizedMarketData): TradingSignal {
        return {
            strategy: this.name,
            symbol: data.symbol,
            action: 'hold',
            strength: 0,
            confidence: 0,
            timeframe: this.timeframe,
            timestamp: Date.now(),
            reasoning: `Neutral signal due to error in ${this.name}`,
            metadata: {
                entry_price: data.price,
                risk_score: 0,
                position_size: 0,
                ...{ error: true } // Spread error property separately
            }
        };
    }
}

// Strategy Factory for creating adapters from existing strategies
export class StrategyFactory {
    private static registeredStrategies: Map<string, any> = new Map();

    public static registerExistingStrategy(name: string, strategyClass: any): void {
        this.registeredStrategies.set(name, strategyClass);
    }

    public static createAdapter(
        strategyName: string,
        config: {
            timeframe: string;
            priority: number;
            riskLevel: 'low' | 'medium' | 'high';
            marketRegimes: string[];
            parameters?: any;
        }
    ): StrategyAdapter {
        const StrategyClass = this.registeredStrategies.get(strategyName);
        if (!StrategyClass) {
            throw new Error(`Strategy ${strategyName} not registered`);
        }

        const strategyInstance = new StrategyClass(config.parameters || {});
        
        return new StrategyAdapter(strategyInstance, {
            name: strategyName,
            ...config
        });
    }

    public static createMockStrategy(name: string): StrategyAdapter {
        const mockStrategy = new MockStrategy();
        
        return new StrategyAdapter(mockStrategy, {
            name: name,
            timeframe: '1h',
            priority: 1,
            riskLevel: 'medium',
            marketRegimes: ['trending', 'ranging', 'volatile']
        });
    }

    public static getRegisteredStrategies(): string[] {
        return Array.from(this.registeredStrategies.keys());
    }
}

// Mock Strategy for testing purposes
class MockStrategy implements ExistingStrategy {
    private signalCount = 0;

    public async generateSignal(data: any): Promise<any> {
        this.signalCount++;
        
        // Simulate different signal types for testing
        const signals = [
            { action: 'buy', strength: 75, confidence: 80, reasoning: 'Bullish momentum detected' },
            { action: 'sell', strength: 60, confidence: 70, reasoning: 'Bearish reversal signal' },
            { action: 'hold', strength: 30, confidence: 50, reasoning: 'Sideways market detected' },
            'buy',
            'sell',
            1.5,  // Numeric buy signal
            -0.8, // Numeric sell signal
            0.05  // Numeric hold signal
        ];

        const randomSignal = signals[this.signalCount % signals.length];
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        
        return randomSignal;
    }
}

// Pre-configured strategy definitions for common trading strategies
export const CommonStrategyConfigs = {
    'RSI_Strategy': {
        timeframe: '1h',
        priority: 3,
        riskLevel: 'medium' as const,
        marketRegimes: ['trending', 'ranging']
    },
    'MACD_Strategy': {
        timeframe: '4h',
        priority: 4,
        riskLevel: 'medium' as const,
        marketRegimes: ['trending']
    },
    'Bollinger_Strategy': {
        timeframe: '1d',
        priority: 2,
        riskLevel: 'low' as const,
        marketRegimes: ['ranging', 'volatile']
    },
    'EMA_Crossover': {
        timeframe: '15m',
        priority: 5,
        riskLevel: 'high' as const,
        marketRegimes: ['trending']
    },
    'Support_Resistance': {
        timeframe: '1h',
        priority: 3,
        riskLevel: 'medium' as const,
        marketRegimes: ['ranging']
    },
    'Momentum_Strategy': {
        timeframe: '30m',
        priority: 4,
        riskLevel: 'high' as const,
        marketRegimes: ['trending', 'volatile']
    }
};

export { MockStrategy };
