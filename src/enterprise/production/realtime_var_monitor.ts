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
 * PHASE C.4 - Real-Time VaR (Value at Risk) Monitoring System
 * 
 * Advanced risk management component that continuously monitors portfolio risk
 * and provides real-time VaR calculations with automatic position sizing and limits.
 * 
 * Integrates with:
 * - Phase A: Cache for high-performance risk calculations
 * - Phase B: Memory optimization for historical data processing
 * - Phase C.3: Monitoring system for real-time alerts
 */

import { EventEmitter } from 'events';

// Risk Calculation Types
interface VaRConfiguration {
    confidenceLevel: number; // e.g., 0.95 for 95% confidence
    timeHorizon: number; // in days
    historicalPeriod: number; // days of historical data to use
    method: 'historical' | 'parametric' | 'monte_carlo';
    
    // Risk Limits
    portfolioVaRLimit: number; // Maximum portfolio VaR (e.g., 0.02 = 2%)
    positionVaRLimit: number; // Maximum single position VaR
    correlationThreshold: number; // Maximum correlation between positions
    
    // Monitoring Settings
    calculationInterval: number; // milliseconds between VaR calculations
    alertThresholds: {
        warning: number; // % of VaR limit (e.g., 0.8 = 80%)
        critical: number; // % of VaR limit (e.g., 0.95 = 95%)
    };
}

interface PositionRisk {
    symbol: string;
    currentValue: number;
    volatility: number;
    var95: number; // 95% VaR
    var99: number; // 99% VaR
    expectedShortfall: number; // Conditional VaR
    beta: number; // Market beta
    contributionToPortfolioVaR: number;
    riskAttribution: number; // % of total portfolio risk
}

interface PortfolioRisk {
    totalValue: number;
    totalVaR: number;
    concentrationRisk: number;
    diversificationBenefit: number;
    marginOfSafety: number; // Distance from VaR limit
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    positions: PositionRisk[];
    correlationMatrix: number[][];
    riskFactors: {
        market: number;
        sector: number;
        currency: number;
        liquidity: number;
    };
}

interface HistoricalPrice {
    symbol: string;
    timestamp: Date;
    price: number;
    return?: number;
}

interface RiskAlert {
    level: 'warning' | 'critical';
    type: 'var_breach' | 'concentration' | 'correlation' | 'volatility';
    message: string;
    currentValue: number;
    threshold: number;
    action: 'monitor' | 'reduce_position' | 'hedge' | 'liquidate';
    timestamp: Date;
}

interface VaRCalculationResult {
    portfolioVaR: number;
    individualVaRs: Map<string, number>;
    marginalVaRs: Map<string, number>;
    componentVaRs: Map<string, number>;
    diversificationRatio: number;
    calculationTime: number;
    method: string;
    confidence: number;
}

interface PositionSizingRecommendation {
    symbol: string;
    currentSize: number;
    recommendedSize: number;
    adjustment: number; // percentage change
    reason: string;
    urgency: 'low' | 'medium' | 'high';
    riskImpact: number; // impact on portfolio VaR
}

// External Dependencies
interface CacheService {
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    invalidate(pattern: string): Promise<void>;
}

interface MemoryOptimizer {
    optimizeDataStructure(data: any[]): Promise<any[]>;
    getMemoryMetrics(): Promise<{ used: number; total: number; percentage: number }>;
}

interface MonitoringSystemIntegration {
    recordMetric(name: string, value: number, tags?: Record<string, string>): void;
    sendAlert(alert: { level: string; message: string; component: string; metadata?: any }): Promise<void>;
}

interface MarketDataProvider {
    getHistoricalPrices(symbol: string, days: number): Promise<HistoricalPrice[]>;
    getCurrentPrice(symbol: string): Promise<number>;
    getVolatility(symbol: string, period: number): Promise<number>;
}

interface Position {
    symbol: string;
    side: 'long' | 'short';
    size: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    timestamp: Date;
}

/**
 * Real-Time VaR Monitoring System
 * 
 * Provides continuous Value-at-Risk monitoring with:
 * - Multiple VaR calculation methods
 * - Real-time position risk assessment
 * - Automatic position sizing recommendations
 * - Risk limit enforcement
 * - Advanced correlation analysis
 */
export class RealTimeVaRMonitor extends EventEmitter {
    private config: VaRConfiguration;
    private cacheService: CacheService;
    private memoryOptimizer: MemoryOptimizer;
    private monitoringSystem: MonitoringSystemIntegration;
    private marketDataProvider: MarketDataProvider;
    
    private currentPortfolioRisk: PortfolioRisk | null = null;
    private historicalData: Map<string, HistoricalPrice[]> = new Map();
    private correlationMatrix: number[][] = [];
    private isMonitoring: boolean = false;
    private monitoringInterval: NodeJS.Timeout | null = null;
    
    // Performance tracking
    private calculationMetrics: {
        totalCalculations: number;
        averageTime: number;
        lastCalculation: Date | null;
        errorCount: number;
    } = {
        totalCalculations: 0,
        averageTime: 0,
        lastCalculation: null,
        errorCount: 0
    };

    constructor(
        config: VaRConfiguration,
        cacheService: CacheService,
        memoryOptimizer: MemoryOptimizer,
        monitoringSystem: MonitoringSystemIntegration,
        marketDataProvider: MarketDataProvider
    ) {
        super();
        
        this.config = config;
        this.cacheService = cacheService;
        this.memoryOptimizer = memoryOptimizer;
        this.monitoringSystem = monitoringSystem;
        this.marketDataProvider = marketDataProvider;
        
        this.validateConfiguration();
    }

    /**
     * Initialize VaR Monitoring System
     */
    public async initialize(): Promise<void> {
        try {
            console.log('📊 Initializing Real-Time VaR Monitor...');
            
            // Validate configuration
            this.validateConfiguration();
            
            // Load historical data for risk calculations
            await this.loadHistoricalData();
            
            // Initialize correlation matrix
            await this.calculateCorrelationMatrix();
            
            // Setup monitoring infrastructure
            await this.setupMonitoringInfrastructure();
            
            console.log('✅ VaR Monitor initialized successfully');
            
            this.monitoringSystem.recordMetric('var_monitor.initialization', 1, {
                method: this.config.method,
                confidence: this.config.confidenceLevel.toString()
            });
            
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize VaR Monitor:', error);
            
            await this.monitoringSystem.sendAlert({
                level: 'critical',
                message: `VaR Monitor initialization failed: ${(error as Error).message}`,
                component: 'RealTimeVaRMonitor'
            });
            
            throw error;
        }
    }

    /**
     * Start Real-Time VaR Monitoring
     */
    public async startMonitoring(): Promise<void> {
        if (this.isMonitoring) {
            console.log('⚠️ VaR monitoring is already active');
            return;
        }

        try {
            console.log('🔄 Starting real-time VaR monitoring...');
            
            this.isMonitoring = true;
            
            // Start continuous monitoring loop
            this.monitoringInterval = setInterval(async () => {
                await this.performVaRCalculation();
            }, this.config.calculationInterval);
            
            // Perform initial calculation
            await this.performVaRCalculation();
            
            console.log(`✅ VaR monitoring started (interval: ${this.config.calculationInterval}ms)`);
            
            this.monitoringSystem.recordMetric('var_monitor.start', 1);
            this.emit('monitoring_started');
            
        } catch (error) {
            console.error('❌ Failed to start VaR monitoring:', error);
            this.isMonitoring = false;
            
            await this.monitoringSystem.sendAlert({
                level: 'error',
                message: `VaR monitoring start failed: ${(error as Error).message}`,
                component: 'RealTimeVaRMonitor'
            });
            
            throw error;
        }
    }

    /**
     * Stop VaR Monitoring
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            console.log('⚠️ VaR monitoring is not active');
            return;
        }

        console.log('🛑 Stopping VaR monitoring...');
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('✅ VaR monitoring stopped');
        
        this.monitoringSystem.recordMetric('var_monitor.stop', 1);
        this.emit('monitoring_stopped');
    }

    /**
     * Calculate Portfolio VaR for given positions
     */
    public async calculatePortfolioVaR(positions: Position[]): Promise<VaRCalculationResult> {
        const startTime = Date.now();
        
        try {
            console.log(`📊 Calculating Portfolio VaR using ${this.config.method} method...`);
            
            // Check cache first
            const cacheKey = this.generateCacheKey(positions);
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                console.log('📋 Using cached VaR calculation');
                return cached;
            }
            
            let result: VaRCalculationResult;
            
            // Calculate VaR based on configured method
            switch (this.config.method) {
                case 'historical':
                    result = await this.calculateHistoricalVaR(positions);
                    break;
                case 'parametric':
                    result = await this.calculateParametricVaR(positions);
                    break;
                case 'monte_carlo':
                    result = await this.calculateMonteCarloVaR(positions);
                    break;
                default:
                    throw new Error(`Unsupported VaR method: ${this.config.method}`);
            }
            
            const calculationTime = Date.now() - startTime;
            result.calculationTime = calculationTime;
            
            // Cache result
            await this.cacheService.set(cacheKey, result, 300); // 5 minutes TTL
            
            // Update metrics
            this.updateCalculationMetrics(calculationTime);
            
            this.monitoringSystem.recordMetric('var_monitor.calculation', 1, {
                method: this.config.method,
                calculation_time: calculationTime.toString(),
                portfolio_var: result.portfolioVaR.toString()
            });
            
            console.log(`✅ Portfolio VaR: ${(result.portfolioVaR * 100).toFixed(2)}% (${calculationTime}ms)`);
            
            return result;
            
        } catch (error) {
            console.error('❌ VaR calculation failed:', error);
            this.calculationMetrics.errorCount++;
            
            this.monitoringSystem.recordMetric('var_monitor.calculation_error', 1, {
                error: (error as Error).message
            });
            
            throw error;
        }
    }

    /**
     * Assess Position Risk for single position
     */
    public async assessPositionRisk(position: Position): Promise<PositionRisk> {
        try {
            const symbol = position.symbol;
            const currentValue = position.size * position.currentPrice;
            
            // Get historical volatility
            const volatility = await this.marketDataProvider.getVolatility(symbol, 30);
            
            // Calculate individual VaR
            const var95 = this.calculateIndividualVaR(currentValue, volatility, 0.95);
            const var99 = this.calculateIndividualVaR(currentValue, volatility, 0.99);
            
            // Calculate Expected Shortfall (Conditional VaR)
            const expectedShortfall = var95 * 1.2; // Simplified calculation
            
            // Get market beta (simplified)
            const beta = await this.calculateBeta(symbol);
            
            const positionRisk: PositionRisk = {
                symbol,
                currentValue,
                volatility,
                var95,
                var99,
                expectedShortfall,
                beta,
                contributionToPortfolioVaR: 0, // Will be calculated in portfolio context
                riskAttribution: 0 // Will be calculated in portfolio context
            };
            
            return positionRisk;
            
        } catch (error) {
            console.error(`❌ Failed to assess position risk for ${position.symbol}:`, error);
            throw error;
        }
    }

    /**
     * Get Position Sizing Recommendations
     */
    public async getPositionSizingRecommendations(
        positions: Position[], 
        newPosition?: { symbol: string; intendedSize: number }
    ): Promise<PositionSizingRecommendation[]> {
        try {
            console.log('📏 Calculating position sizing recommendations...');
            
            const recommendations: PositionSizingRecommendation[] = [];
            
            // Calculate current portfolio VaR
            const currentVaR = await this.calculatePortfolioVaR(positions);
            
            // Check if current VaR exceeds limits
            if (currentVaR.portfolioVaR > this.config.portfolioVaRLimit) {
                // Generate reduction recommendations
                recommendations.push(...await this.generateReductionRecommendations(positions, currentVaR));
            }
            
            // If new position is provided, assess its impact
            if (newPosition) {
                const newPositionRecommendation = await this.assessNewPositionSizing(
                    positions, newPosition, currentVaR
                );
                if (newPositionRecommendation) {
                    recommendations.push(newPositionRecommendation);
                }
            }
            
            // Check for concentration risk
            recommendations.push(...await this.checkConcentrationRisk(positions));
            
            console.log(`📋 Generated ${recommendations.length} position sizing recommendations`);
            
            return recommendations;
            
        } catch (error) {
            console.error('❌ Failed to generate position sizing recommendations:', error);
            throw error;
        }
    }

    /**
     * Get Current Portfolio Risk Assessment
     */
    public getCurrentPortfolioRisk(): PortfolioRisk | null {
        return this.currentPortfolioRisk;
    }

    /**
     * Get VaR Calculation Metrics
     */
    public getCalculationMetrics() {
        return { ...this.calculationMetrics };
    }

    // Private Implementation Methods

    private validateConfiguration(): void {
        if (this.config.confidenceLevel <= 0 || this.config.confidenceLevel >= 1) {
            throw new Error('Confidence level must be between 0 and 1');
        }
        
        if (this.config.timeHorizon <= 0) {
            throw new Error('Time horizon must be positive');
        }
        
        if (this.config.portfolioVaRLimit <= 0) {
            throw new Error('Portfolio VaR limit must be positive');
        }
        
        if (this.config.calculationInterval < 1000) {
            throw new Error('Calculation interval must be at least 1 second');
        }
    }

    private async loadHistoricalData(): Promise<void> {
        console.log('📈 Loading historical data for VaR calculations...');
        
        // Get list of symbols from cache or configuration
        const symbols = await this.getActiveSymbols();
        
        for (const symbol of symbols) {
            try {
                const historicalPrices = await this.marketDataProvider.getHistoricalPrices(
                    symbol, 
                    this.config.historicalPeriod
                );
                
                // Calculate returns
                const pricesWithReturns = this.calculateReturns(historicalPrices);
                
                // Optimize memory usage
                const optimizedData = await this.memoryOptimizer.optimizeDataStructure(pricesWithReturns);
                
                this.historicalData.set(symbol, optimizedData);
                
                console.log(`📊 Loaded ${historicalPrices.length} historical prices for ${symbol}`);
                
            } catch (error) {
                console.error(`❌ Failed to load historical data for ${symbol}:`, error);
            }
        }
        
        console.log(`✅ Historical data loaded for ${this.historicalData.size} symbols`);
    }

    private async calculateCorrelationMatrix(): Promise<void> {
        console.log('🔗 Calculating correlation matrix...');
        
        const symbols = Array.from(this.historicalData.keys());
        const returns = symbols.map(symbol => 
            this.historicalData.get(symbol)?.map(p => p.return || 0) || []
        );
        
        this.correlationMatrix = this.computeCorrelationMatrix(returns);
        
        // Cache correlation matrix
        await this.cacheService.set('correlation_matrix', this.correlationMatrix, 3600);
        
        console.log(`✅ Correlation matrix calculated for ${symbols.length} symbols`);
    }

    private async setupMonitoringInfrastructure(): Promise<void> {
        console.log('🔧 Setting up VaR monitoring infrastructure...');
        
        // Register VaR-specific metrics
        this.monitoringSystem.recordMetric('var_monitor.setup', 1, {
            method: this.config.method,
            confidence_level: this.config.confidenceLevel.toString(),
            time_horizon: this.config.timeHorizon.toString()
        });
        
        console.log('✅ VaR monitoring infrastructure ready');
    }

    private async performVaRCalculation(): Promise<void> {
        try {
            // Get current positions (would be provided by production engine)
            const positions = await this.getCurrentPositions();
            
            if (positions.length === 0) {
                return; // No positions to monitor
            }
            
            // Calculate portfolio VaR
            const varResult = await this.calculatePortfolioVaR(positions);
            
            // Update current risk assessment
            await this.updatePortfolioRisk(positions, varResult);
            
            // Check risk limits and generate alerts
            await this.checkRiskLimits();
            
            this.calculationMetrics.lastCalculation = new Date();
            
        } catch (error) {
            console.error('❌ VaR calculation cycle failed:', error);
            this.calculationMetrics.errorCount++;
            
            await this.monitoringSystem.sendAlert({
                level: 'warning',
                message: `VaR calculation cycle failed: ${(error as Error).message}`,
                component: 'RealTimeVaRMonitor'
            });
        }
    }

    private async calculateHistoricalVaR(positions: Position[]): Promise<VaRCalculationResult> {
        console.log('📊 Using Historical Simulation method...');
        
        const portfolioReturns: number[] = [];
        const individualVaRs = new Map<string, number>();
        const marginalVaRs = new Map<string, number>();
        const componentVaRs = new Map<string, number>();
        
        // Calculate portfolio returns for each historical period
        const minDataLength = Math.min(...positions.map(p => 
            this.historicalData.get(p.symbol)?.length || 0
        ));
        
        for (let i = 0; i < minDataLength - 1; i++) {
            let portfolioReturn = 0;
            let totalValue = 0;
            
            for (const position of positions) {
                const historicalPrices = this.historicalData.get(position.symbol);
                if (historicalPrices && historicalPrices[i] && historicalPrices[i].return) {
                    const positionValue = position.size * position.currentPrice;
                    const positionReturn = historicalPrices[i].return! * positionValue;
                    portfolioReturn += positionReturn;
                    totalValue += positionValue;
                }
            }
            
            if (totalValue > 0) {
                portfolioReturns.push(portfolioReturn / totalValue);
            }
        }
        
        // Sort returns to find VaR percentile
        portfolioReturns.sort((a, b) => a - b);
        
        const varIndex = Math.floor((1 - this.config.confidenceLevel) * portfolioReturns.length);
        const portfolioVaR = Math.abs(portfolioReturns[varIndex] || 0);
        
        // Calculate individual VaRs
        for (const position of positions) {
            const positionReturns = this.getPositionReturns(position);
            positionReturns.sort((a, b) => a - b);
            const positionVaR = Math.abs(positionReturns[varIndex] || 0);
            individualVaRs.set(position.symbol, positionVaR);
        }
        
        return {
            portfolioVaR,
            individualVaRs,
            marginalVaRs,
            componentVaRs,
            diversificationRatio: this.calculateDiversificationRatio(portfolioVaR, individualVaRs),
            calculationTime: 0, // Will be set by caller
            method: 'historical',
            confidence: this.config.confidenceLevel
        };
    }

    private async calculateParametricVaR(positions: Position[]): Promise<VaRCalculationResult> {
        console.log('📊 Using Parametric (Variance-Covariance) method...');
        
        // Implementation would use normal distribution assumptions
        // with portfolio variance calculated from covariance matrix
        
        const individualVaRs = new Map<string, number>();
        const marginalVaRs = new Map<string, number>();
        const componentVaRs = new Map<string, number>();
        
        let portfolioVariance = 0;
        
        // Calculate portfolio variance using correlation matrix
        for (let i = 0; i < positions.length; i++) {
            for (let j = 0; j < positions.length; j++) {
                const pos1 = positions[i];
                const pos2 = positions[j];
                
                const vol1 = await this.marketDataProvider.getVolatility(pos1.symbol, 30);
                const vol2 = await this.marketDataProvider.getVolatility(pos2.symbol, 30);
                
                const weight1 = pos1.size * pos1.currentPrice;
                const weight2 = pos2.size * pos2.currentPrice;
                
                const correlation = this.getCorrelation(pos1.symbol, pos2.symbol);
                
                portfolioVariance += weight1 * weight2 * vol1 * vol2 * correlation;
            }
        }
        
        const portfolioStdDev = Math.sqrt(portfolioVariance);
        
        // Z-score for confidence level (e.g., 1.645 for 95% confidence)
        const zScore = this.getZScore(this.config.confidenceLevel);
        
        const portfolioVaR = portfolioStdDev * zScore * Math.sqrt(this.config.timeHorizon);
        
        // Calculate individual VaRs
        for (const position of positions) {
            const volatility = await this.marketDataProvider.getVolatility(position.symbol, 30);
            const positionValue = position.size * position.currentPrice;
            const positionVaR = positionValue * volatility * zScore * Math.sqrt(this.config.timeHorizon);
            individualVaRs.set(position.symbol, positionVaR);
        }
        
        return {
            portfolioVaR,
            individualVaRs,
            marginalVaRs,
            componentVaRs,
            diversificationRatio: this.calculateDiversificationRatio(portfolioVaR, individualVaRs),
            calculationTime: 0,
            method: 'parametric',
            confidence: this.config.confidenceLevel
        };
    }

    private async calculateMonteCarloVaR(positions: Position[]): Promise<VaRCalculationResult> {
        console.log('📊 Using Monte Carlo simulation method...');
        
        const simulations = 10000;
        const portfolioReturns: number[] = [];
        
        // Run Monte Carlo simulations
        for (let sim = 0; sim < simulations; sim++) {
            let portfolioReturn = 0;
            let totalValue = 0;
            
            for (const position of positions) {
                // Generate random return based on historical distribution
                const randomReturn = this.generateRandomReturn(position.symbol);
                const positionValue = position.size * position.currentPrice;
                portfolioReturn += randomReturn * positionValue;
                totalValue += positionValue;
            }
            
            if (totalValue > 0) {
                portfolioReturns.push(portfolioReturn / totalValue);
            }
        }
        
        // Sort and find VaR
        portfolioReturns.sort((a, b) => a - b);
        const varIndex = Math.floor((1 - this.config.confidenceLevel) * portfolioReturns.length);
        const portfolioVaR = Math.abs(portfolioReturns[varIndex] || 0);
        
        const individualVaRs = new Map<string, number>();
        const marginalVaRs = new Map<string, number>();
        const componentVaRs = new Map<string, number>();
        
        // Calculate individual VaRs using same Monte Carlo approach
        for (const position of positions) {
            const positionReturns: number[] = [];
            
            for (let sim = 0; sim < simulations; sim++) {
                const randomReturn = this.generateRandomReturn(position.symbol);
                positionReturns.push(randomReturn);
            }
            
            positionReturns.sort((a, b) => a - b);
            const positionVaR = Math.abs(positionReturns[varIndex] || 0);
            individualVaRs.set(position.symbol, positionVaR);
        }
        
        return {
            portfolioVaR,
            individualVaRs,
            marginalVaRs,
            componentVaRs,
            diversificationRatio: this.calculateDiversificationRatio(portfolioVaR, individualVaRs),
            calculationTime: 0,
            method: 'monte_carlo',
            confidence: this.config.confidenceLevel
        };
    }

    // Helper methods for VaR calculations
    
    private generateCacheKey(positions: Position[]): string {
        const positionData = positions.map(p => `${p.symbol}:${p.size}:${p.currentPrice}`).join('|');
        return `var_${this.config.method}_${this.config.confidenceLevel}_${positionData}`;
    }

    private calculateReturns(prices: HistoricalPrice[]): HistoricalPrice[] {
        const pricesWithReturns = [...prices];
        
        for (let i = 1; i < pricesWithReturns.length; i++) {
            const currentPrice = pricesWithReturns[i].price;
            const previousPrice = pricesWithReturns[i - 1].price;
            pricesWithReturns[i].return = (currentPrice - previousPrice) / previousPrice;
        }
        
        return pricesWithReturns;
    }

    private computeCorrelationMatrix(returns: number[][]): number[][] {
        const n = returns.length;
        const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = 1.0;
                } else {
                    matrix[i][j] = this.calculateCorrelation(returns[i], returns[j]);
                }
            }
        }
        
        return matrix;
    }

    private calculateCorrelation(returns1: number[], returns2: number[]): number {
        const n = Math.min(returns1.length, returns2.length);
        if (n < 2) return 0;
        
        const mean1 = returns1.slice(0, n).reduce((a, b) => a + b, 0) / n;
        const mean2 = returns2.slice(0, n).reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let sumSq1 = 0;
        let sumSq2 = 0;
        
        for (let i = 0; i < n; i++) {
            const diff1 = returns1[i] - mean1;
            const diff2 = returns2[i] - mean2;
            
            numerator += diff1 * diff2;
            sumSq1 += diff1 * diff1;
            sumSq2 += diff2 * diff2;
        }
        
        const denominator = Math.sqrt(sumSq1 * sumSq2);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    private calculateIndividualVaR(value: number, volatility: number, confidence: number): number {
        const zScore = this.getZScore(confidence);
        return value * volatility * zScore * Math.sqrt(this.config.timeHorizon);
    }

    private getZScore(confidence: number): number {
        // Z-scores for common confidence levels
        const zScores: Record<string, number> = {
            '0.90': 1.282,
            '0.95': 1.645,
            '0.99': 2.326
        };
        
        return zScores[confidence.toString()] || 1.645;
    }

    private calculateDiversificationRatio(portfolioVaR: number, individualVaRs: Map<string, number>): number {
        const sumIndividualVaRs = Array.from(individualVaRs.values()).reduce((sum, var_) => sum + var_, 0);
        return sumIndividualVaRs === 0 ? 1 : sumIndividualVaRs / portfolioVaR;
    }

    private getPositionReturns(position: Position): number[] {
        const historicalPrices = this.historicalData.get(position.symbol);
        return historicalPrices?.map(p => p.return || 0) || [];
    }

    private getCorrelation(symbol1: string, symbol2: string): number {
        // Simplified correlation lookup
        // In production, would use actual correlation matrix lookup
        return symbol1 === symbol2 ? 1.0 : 0.3; // Default correlation
    }

    private generateRandomReturn(symbol: string): number {
        const historicalPrices = this.historicalData.get(symbol);
        if (!historicalPrices || historicalPrices.length === 0) {
            return 0;
        }
        
        // Generate random return based on historical distribution
        const returns = historicalPrices.map(p => p.return || 0).filter(r => r !== 0);
        const randomIndex = Math.floor(Math.random() * returns.length);
        return returns[randomIndex] || 0;
    }

    private async calculateBeta(symbol: string): Promise<number> {
        // Simplified beta calculation
        // In production, would calculate against market index
        return 1.0 + (Math.random() - 0.5) * 0.5; // Random beta between 0.75 and 1.25
    }

    private updateCalculationMetrics(calculationTime: number): void {
        this.calculationMetrics.totalCalculations++;
        
        if (this.calculationMetrics.averageTime === 0) {
            this.calculationMetrics.averageTime = calculationTime;
        } else {
            this.calculationMetrics.averageTime = 
                (this.calculationMetrics.averageTime + calculationTime) / 2;
        }
    }

    private async getActiveSymbols(): Promise<string[]> {
        // Get symbols from cache or default list
        const cached = await this.cacheService.get('active_symbols');
        return cached || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    }

    private async getCurrentPositions(): Promise<Position[]> {
        // Get current positions from cache (would be updated by production engine)
        const cached = await this.cacheService.get('current_positions');
        return cached || [];
    }

    private async updatePortfolioRisk(positions: Position[], varResult: VaRCalculationResult): Promise<void> {
        // Calculate position risks
        const positionRisks: PositionRisk[] = [];
        let totalValue = 0;
        
        for (const position of positions) {
            const positionRisk = await this.assessPositionRisk(position);
            positionRisks.push(positionRisk);
            totalValue += positionRisk.currentValue;
        }
        
        // Calculate portfolio risk metrics
        this.currentPortfolioRisk = {
            totalValue,
            totalVaR: varResult.portfolioVaR,
            concentrationRisk: this.calculateConcentrationRisk(positionRisks),
            diversificationBenefit: 1 - (1 / varResult.diversificationRatio),
            marginOfSafety: (this.config.portfolioVaRLimit - varResult.portfolioVaR) / this.config.portfolioVaRLimit,
            riskLevel: this.assessRiskLevel(varResult.portfolioVaR),
            positions: positionRisks,
            correlationMatrix: this.correlationMatrix,
            riskFactors: {
                market: 0.4,
                sector: 0.3,
                currency: 0.2,
                liquidity: 0.1
            }
        };
        
        // Cache portfolio risk
        await this.cacheService.set('portfolio_risk', this.currentPortfolioRisk, 60);
        
        this.emit('portfolio_risk_updated', this.currentPortfolioRisk);
    }

    private calculateConcentrationRisk(positionRisks: PositionRisk[]): number {
        if (positionRisks.length === 0) return 0;
        
        const totalValue = positionRisks.reduce((sum, p) => sum + p.currentValue, 0);
        const weights = positionRisks.map(p => p.currentValue / totalValue);
        
        // Herfindahl-Hirschman Index for concentration
        return weights.reduce((sum, w) => sum + w * w, 0);
    }

    private assessRiskLevel(portfolioVaR: number): 'low' | 'medium' | 'high' | 'critical' {
        const varRatio = portfolioVaR / this.config.portfolioVaRLimit;
        
        if (varRatio >= 1.0) return 'critical';
        if (varRatio >= 0.8) return 'high';
        if (varRatio >= 0.5) return 'medium';
        return 'low';
    }

    private async checkRiskLimits(): Promise<void> {
        if (!this.currentPortfolioRisk) return;
        
        const riskAlerts: RiskAlert[] = [];
        
        // Check portfolio VaR limit
        if (this.currentPortfolioRisk.totalVaR > this.config.portfolioVaRLimit * this.config.alertThresholds.critical) {
            riskAlerts.push({
                level: 'critical',
                type: 'var_breach',
                message: 'Portfolio VaR exceeds critical threshold',
                currentValue: this.currentPortfolioRisk.totalVaR,
                threshold: this.config.portfolioVaRLimit,
                action: 'reduce_position',
                timestamp: new Date()
            });
        } else if (this.currentPortfolioRisk.totalVaR > this.config.portfolioVaRLimit * this.config.alertThresholds.warning) {
            riskAlerts.push({
                level: 'warning',
                type: 'var_breach',
                message: 'Portfolio VaR exceeds warning threshold',
                currentValue: this.currentPortfolioRisk.totalVaR,
                threshold: this.config.portfolioVaRLimit * this.config.alertThresholds.warning,
                action: 'monitor',
                timestamp: new Date()
            });
        }
        
        // Check concentration risk
        if (this.currentPortfolioRisk.concentrationRisk > this.config.correlationThreshold) {
            riskAlerts.push({
                level: 'warning',
                type: 'concentration',
                message: 'Portfolio concentration risk is high',
                currentValue: this.currentPortfolioRisk.concentrationRisk,
                threshold: this.config.correlationThreshold,
                action: 'hedge',
                timestamp: new Date()
            });
        }
        
        // Send alerts
        for (const alert of riskAlerts) {
            await this.monitoringSystem.sendAlert({
                level: alert.level,
                message: alert.message,
                component: 'RealTimeVaRMonitor',
                metadata: {
                    type: alert.type,
                    currentValue: alert.currentValue,
                    threshold: alert.threshold,
                    action: alert.action
                }
            });
            
            this.emit('risk_alert', alert);
        }
    }

    private async generateReductionRecommendations(
        positions: Position[], 
        currentVaR: VaRCalculationResult
    ): Promise<PositionSizingRecommendation[]> {
        const recommendations: PositionSizingRecommendation[] = [];
        
        // Find positions with highest risk contribution
        const sortedPositions = positions.sort((a, b) => {
            const varA = currentVaR.individualVaRs.get(a.symbol) || 0;
            const varB = currentVaR.individualVaRs.get(b.symbol) || 0;
            return varB - varA;
        });
        
        // Recommend reducing largest risk contributors
        for (let i = 0; i < Math.min(3, sortedPositions.length); i++) {
            const position = sortedPositions[i];
            const currentVar = currentVaR.individualVaRs.get(position.symbol) || 0;
            const reductionPct = Math.min(0.3, (currentVaR.portfolioVaR - this.config.portfolioVaRLimit) / currentVaR.portfolioVaR);
            
            recommendations.push({
                symbol: position.symbol,
                currentSize: position.size,
                recommendedSize: position.size * (1 - reductionPct),
                adjustment: -reductionPct,
                reason: `Reduce to lower portfolio VaR from ${(currentVaR.portfolioVaR * 100).toFixed(2)}% to target`,
                urgency: currentVaR.portfolioVaR > this.config.portfolioVaRLimit * 1.1 ? 'high' : 'medium',
                riskImpact: currentVar * reductionPct
            });
        }
        
        return recommendations;
    }

    private async assessNewPositionSizing(
        existingPositions: Position[],
        newPosition: { symbol: string; intendedSize: number },
        currentVaR: VaRCalculationResult
    ): Promise<PositionSizingRecommendation | null> {
        // Estimate impact of new position on portfolio VaR
        const newPositionVar = await this.estimatePositionVar(newPosition.symbol, newPosition.intendedSize);
        const estimatedNewPortfolioVar = currentVaR.portfolioVaR + newPositionVar * 0.8; // Simplified correlation adjustment
        
        if (estimatedNewPortfolioVar > this.config.portfolioVaRLimit) {
            const maxAllowableSize = newPosition.intendedSize * (this.config.portfolioVaRLimit / estimatedNewPortfolioVar);
            
            return {
                symbol: newPosition.symbol,
                currentSize: 0,
                recommendedSize: maxAllowableSize,
                adjustment: (maxAllowableSize - newPosition.intendedSize) / newPosition.intendedSize,
                reason: `Reduce new position size to keep portfolio VaR within ${(this.config.portfolioVaRLimit * 100).toFixed(2)}% limit`,
                urgency: 'medium',
                riskImpact: newPositionVar
            };
        }
        
        return null;
    }

    private async checkConcentrationRisk(positions: Position[]): Promise<PositionSizingRecommendation[]> {
        const recommendations: PositionSizingRecommendation[] = [];
        
        const totalValue = positions.reduce((sum, p) => sum + p.size * p.currentPrice, 0);
        
        for (const position of positions) {
            const positionValue = position.size * position.currentPrice;
            const concentration = positionValue / totalValue;
            
            if (concentration > this.config.positionVaRLimit) {
                const targetSize = position.size * (this.config.positionVaRLimit / concentration);
                
                recommendations.push({
                    symbol: position.symbol,
                    currentSize: position.size,
                    recommendedSize: targetSize,
                    adjustment: (targetSize - position.size) / position.size,
                    reason: `Reduce concentration from ${(concentration * 100).toFixed(1)}% to ${(this.config.positionVaRLimit * 100).toFixed(1)}%`,
                    urgency: concentration > this.config.positionVaRLimit * 1.2 ? 'high' : 'medium',
                    riskImpact: positionValue * (concentration - this.config.positionVaRLimit)
                });
            }
        }
        
        return recommendations;
    }

    private async estimatePositionVar(symbol: string, size: number): Promise<number> {
        const volatility = await this.marketDataProvider.getVolatility(symbol, 30);
        const currentPrice = await this.marketDataProvider.getCurrentPrice(symbol);
        const positionValue = size * currentPrice;
        
        return this.calculateIndividualVaR(positionValue, volatility, this.config.confidenceLevel);
    }
}

export default RealTimeVaRMonitor;
