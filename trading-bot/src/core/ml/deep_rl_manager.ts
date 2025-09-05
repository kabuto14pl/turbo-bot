/**
 * 🔗 DEEP RL INTEGRATION MANAGER
 * Replaces SimpleRLManager with enterprise-grade Deep RL system
 * Manages transition from old SimpleRL to new DeepRL architecture
 */

import { DeepRLAgent, createBalancedAgent } from './deep_rl_agent';
import { MarketState, DeepRLAction, PerformanceMetrics } from './types';
import { Logger } from '../../../core/utils/logger';

interface DeepRLConfig {
  enabled: boolean;
  trainingMode: boolean;
  modelPath: string;
  
  // Performance thresholds
  minEpisodes: number;
  minWinRate: number;
  minSharpeRatio: number;
  
  // Risk management
  maxPositionSize: number;
  maxDailyLoss: number;
  emergencyStop: boolean;
  
  // Ensemble settings
  useEnsemble: boolean;
  agentWeights: { [agentName: string]: number };
}

export const DEFAULT_DEEP_RL_CONFIG: DeepRLConfig = {
  enabled: true,
  trainingMode: true,
  modelPath: './models/deep_rl',
  minEpisodes: 100,
  minWinRate: 0.55,
  minSharpeRatio: 1.0,
  maxPositionSize: 0.5,
  maxDailyLoss: 0.05,
  emergencyStop: false,
  useEnsemble: false,
  agentWeights: {
    'balanced': 1.0
  }
};

export class DeepRLManager {
  private agent: DeepRLAgent;
  private config: DeepRLConfig;
  private logger: Logger;
  
  // Performance tracking
  private dailyPnL: number = 0;
  private dailyTrades: number = 0;
  private lastResetTime: number = Date.now();
  private emergencyMode: boolean = false;
  
  // Integration metrics
  private actionCount: number = 0;
  private lastActionTime: number = 0;
  private averageResponseTime: number = 0;

  constructor(config: Partial<DeepRLConfig> = {}) {
    this.config = { ...DEFAULT_DEEP_RL_CONFIG, ...config };
    this.logger = new Logger();
    
    this.initializeAgent();
    this.logger.info('🧠 Deep RL Manager initialized successfully');
  }

  /**
   * Initialize the Deep RL agent
   */
  private initializeAgent(): void {
    try {
      // Create the main agent
      this.agent = createBalancedAgent();
      
      // Load pre-trained models if available
      if (this.config.modelPath) {
        this.loadModels().catch(error => {
          this.logger.warn(`Could not load models: ${error.message}`);
        });
      }
      
    } catch (error) {
      this.logger.error(`Failed to initialize Deep RL agent: ${error}`);
      throw error;
    }
  }

  /**
   * Main processing step - replaces SimpleRL processStep
   */
  async processStep(
    price: number,
    rsi: number,
    volume: number,
    additionalData: any = {}
  ): Promise<DeepRLAction | null> {
    const startTime = Date.now();
    
    try {
      // Check if system is enabled
      if (!this.config.enabled || this.emergencyMode) {
        return null;
      }

      // Create market state from inputs
      const marketState = this.createMarketState(price, rsi, volume, additionalData);
      
      // Generate action using Deep RL
      const action = await this.agent.generateAction(marketState);
      
      // Apply risk management filters
      const filteredAction = this.applyRiskManagement(action);
      
      // Update metrics
      this.updateMetrics(startTime);
      this.actionCount++;
      
      this.logger.debug(`🎯 Deep RL action: ${filteredAction.action_type} (confidence: ${filteredAction.confidence.toFixed(3)})`);
      
      return filteredAction;
      
    } catch (error) {
      this.logger.error(`Error in processStep: ${error}`);
      return null;
    }
  }

  /**
   * Learn from trade results - replaces SimpleRL learnFromResult
   */
  async learnFromResult(
    price: number,
    rsi: number,
    volume: number,
    tradeResult: {
      profit: number;
      success: boolean;
      duration: number;
    }
  ): Promise<void> {
    try {
      if (!this.config.trainingMode) {
        return;
      }

      // Create market state
      const marketState = this.createMarketState(price, rsi, volume);
      
      // Calculate reward from trade result
      const reward = this.calculateReward(tradeResult);
      
      // Let agent learn
      await this.agent.learnFromResult(marketState, reward, false);
      
      // Update daily PnL tracking
      this.dailyPnL += tradeResult.profit;
      this.dailyTrades++;
      
      // Check for emergency stop conditions
      this.checkEmergencyConditions();
      
      this.logger.debug(`🎓 Agent learned from result: reward=${reward.toFixed(4)}, dailyPnL=${this.dailyPnL.toFixed(4)}`);
      
    } catch (error) {
      this.logger.error(`Error in learnFromResult: ${error}`);
    }
  }

  /**
   * Create comprehensive market state from basic inputs
   */
  private createMarketState(
    price: number,
    rsi: number,
    volume: number,
    additionalData: any = {}
  ): MarketState {
    const now = Date.now();
    const date = new Date(now);
    
    return {
      timestamp: now,
      price: price,
      volume: volume,
      
      // Technical indicators (expanded from basic inputs)
      indicators: {
        rsi_14: rsi,
        rsi_21: rsi * 1.02, // Approximated
        rsi_30: rsi * 0.98, // Approximated
        ema_9: price * 0.999,
        ema_21: price * 0.998,
        ema_50: price * 0.995,
        ema_200: price * 0.99,
        sma_20: price * 0.997,
        sma_50: price * 0.994,
        sma_200: price * 0.989,
        adx: 25, // Default values - would be calculated from real data
        atr: price * 0.02,
        macd: 0,
        macd_signal: 0,
        macd_histogram: 0,
        bollinger_upper: price * 1.02,
        bollinger_middle: price,
        bollinger_lower: price * 0.98,
        stochastic_k: rsi * 0.8,
        stochastic_d: rsi * 0.75,
        williams_r: -rsi,
        cci: 0,
        momentum: 0,
        roc: 0,
        
        // Volatility indicators
        volatility_1h: 0.02,
        volatility_4h: 0.025,
        volatility_1d: 0.03,
        realized_volatility: 0.028,
        
        // Volume indicators
        volume_sma_20: volume,
        volume_weighted_price: price,
        on_balance_volume: volume,
        accumulation_distribution: 0,
        
        // Price action patterns
        doji: false,
        hammer: false,
        shooting_star: false,
        engulfing_bullish: false,
        engulfing_bearish: false,
        
        ...additionalData.indicators
      },

      // Market microstructure (simplified)
      microstructure: {
        bidAskSpread: price * 0.001,
        orderBookImbalance: 0,
        volumeProfile: new Array(20).fill(volume / 20),
        tickSize: 0.01,
        liquidity: volume * price,
        marketImpact: 0.001,
        
        // Order flow
        buyVolume: volume * 0.6,
        sellVolume: volume * 0.4,
        aggressiveBuys: volume * 0.3,
        aggressiveSells: volume * 0.2,
        
        // Market depth
        bidLevels: new Array(10).fill(price * 0.999),
        askLevels: new Array(10).fill(price * 1.001),
        supportResistance: [price * 0.95, price * 1.05],
        
        ...additionalData.microstructure
      },

      // Cross-asset features (simplified)
      crossAsset: {
        btcEthCorrelation: 0.8,
        dollarIndex: 100,
        bondYields: 0.04,
        vixLevel: 20,
        goldPrice: 2000,
        oilPrice: 80,
        
        // Crypto ecosystem
        defiTvl: 50000000000,
        stablecoinSupply: 100000000000,
        exchangeInflows: volume * 0.1,
        exchangeOutflows: volume * 0.05,
        
        // Traditional markets
        sp500: 4000,
        nasdaq: 12000,
        eur_usd: 1.1,
        gbp_usd: 1.3,
        
        ...additionalData.crossAsset
      },

      // Sentiment features (simplified)
      sentiment: {
        newssentiment: 0.6,
        socialSentiment: 0.55,
        fearGreedIndex: 50,
        redditMentions: 100,
        twitterSentiment: 0.5,
        googleTrends: 50,
        
        // On-chain sentiment
        hodlerSentiment: 0.7,
        whaleActivity: 0.3,
        exchangeSentiment: 0.5,
        
        ...additionalData.sentiment
      },

      // Temporal features
      temporal: {
        hourOfDay: date.getHours(),
        dayOfWeek: date.getDay(),
        monthOfYear: date.getMonth(),
        seasonality: Math.sin(2 * Math.PI * date.getMonth() / 12),
        marketSession: this.getMarketSession(date.getHours()),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isHoliday: false, // Would need holiday detection
        
        // Time-based patterns
        timeToClose: 0,
        timeToOpen: 0,
        sessionVolatility: 0.02,
        
        ...additionalData.temporal
      }
    };
  }

  /**
   * Determine market session based on hour
   */
  private getMarketSession(hour: number): 'asian' | 'european' | 'american' | 'overlap' {
    if (hour >= 0 && hour < 8) return 'asian';
    if (hour >= 8 && hour < 16) return 'european';
    if (hour >= 16 && hour < 24) return 'american';
    return 'overlap';
  }

  /**
   * Apply risk management to the generated action
   */
  private applyRiskManagement(action: DeepRLAction): DeepRLAction {
    const filteredAction = { ...action };
    
    // Limit position size
    filteredAction.position_size = Math.max(
      -this.config.maxPositionSize,
      Math.min(this.config.maxPositionSize, filteredAction.position_size)
    );
    
    // Override action if daily loss limit reached
    if (this.dailyPnL < -this.config.maxDailyLoss) {
      filteredAction.action_type = 'HOLD';
      filteredAction.position_size = 0;
      filteredAction.confidence *= 0.1;
      filteredAction.reasoning += ' [RISK: Daily loss limit reached]';
    }
    
    // Reduce confidence in high uncertainty
    if (filteredAction.uncertainty > 0.8) {
      filteredAction.confidence *= 0.5;
      filteredAction.position_size *= 0.5;
    }
    
    return filteredAction;
  }

  /**
   * Calculate reward from trade result
   */
  private calculateReward(tradeResult: {
    profit: number;
    success: boolean;
    duration: number;
  }): number {
    let reward = 0;
    
    // Base reward from profit/loss
    reward += tradeResult.profit * 10; // Scale profit to reasonable reward range
    
    // Bonus for successful trades
    if (tradeResult.success) {
      reward += 0.1;
    } else {
      reward -= 0.05;
    }
    
    // Penalty for very long trades (encourage efficiency)
    if (tradeResult.duration > 24 * 60) { // More than 24 hours
      reward -= 0.02;
    }
    
    // Clip reward to reasonable range
    return Math.max(-1, Math.min(1, reward));
  }

  /**
   * Check for emergency stop conditions
   */
  private checkEmergencyConditions(): void {
    const metrics = this.agent.getPerformanceMetrics();
    
    // Emergency stop conditions
    if (
      this.dailyPnL < -this.config.maxDailyLoss * 2 || // Extreme daily loss
      (metrics.win_rate < 0.3 && this.dailyTrades > 10) || // Very low win rate
      metrics.max_drawdown > 0.2 // Large drawdown
    ) {
      this.emergencyMode = true;
      this.config.emergencyStop = true;
      this.logger.error('🚨 EMERGENCY STOP ACTIVATED - Deep RL system halted');
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(startTime: number): void {
    const responseTime = Date.now() - startTime;
    this.lastActionTime = Date.now();
    
    // Calculate moving average of response time
    this.averageResponseTime = this.averageResponseTime === 0 ? 
      responseTime : 
      (this.averageResponseTime * 0.9 + responseTime * 0.1);
  }

  /**
   * Check if the Deep RL system should be used
   */
  shouldUseRL(): boolean {
    if (!this.config.enabled || this.emergencyMode) {
      return false;
    }

    const status = this.agent.getTrainingStatus();
    const metrics = this.agent.getPerformanceMetrics();
    
    // Minimum episode requirement
    if (status.episodeCount < this.config.minEpisodes) {
      return false;
    }
    
    // Performance requirements
    if (metrics.win_rate > 0 && metrics.win_rate < this.config.minWinRate) {
      return false;
    }
    
    if (metrics.sharpe_ratio < this.config.minSharpeRatio) {
      return false;
    }
    
    return true;
  }

  /**
   * Reset daily tracking (should be called daily)
   */
  resetDailyTracking(): void {
    this.dailyPnL = 0;
    this.dailyTrades = 0;
    this.lastResetTime = Date.now();
    this.emergencyMode = false;
    this.config.emergencyStop = false;
    
    this.logger.info('📅 Daily tracking reset completed');
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus(): {
    enabled: boolean;
    trainingMode: boolean;
    emergencyMode: boolean;
    shouldUse: boolean;
    performance: PerformanceMetrics;
    dailyStats: {
      pnl: number;
      trades: number;
      avgResponseTime: number;
    };
    agentStatus: any;
  } {
    return {
      enabled: this.config.enabled,
      trainingMode: this.config.trainingMode,
      emergencyMode: this.emergencyMode,
      shouldUse: this.shouldUseRL(),
      performance: this.agent.getPerformanceMetrics(),
      dailyStats: {
        pnl: this.dailyPnL,
        trades: this.dailyTrades,
        avgResponseTime: this.averageResponseTime
      },
      agentStatus: this.agent.getTrainingStatus()
    };
  }

  /**
   * Save models to disk
   */
  async saveModels(): Promise<void> {
    try {
      await this.agent.saveModels(this.config.modelPath);
      this.logger.info(`💾 Deep RL models saved to ${this.config.modelPath}`);
    } catch (error) {
      this.logger.error(`Failed to save models: ${error}`);
    }
  }

  /**
   * Load models from disk
   */
  async loadModels(): Promise<void> {
    try {
      await this.agent.loadModels(this.config.modelPath);
      this.logger.info(`📖 Deep RL models loaded from ${this.config.modelPath}`);
    } catch (error) {
      this.logger.error(`Failed to load models: ${error}`);
    }
  }

  /**
   * Force emergency stop
   */
  activateEmergencyStop(): void {
    this.emergencyMode = true;
    this.config.emergencyStop = true;
    this.logger.error('🚨 Emergency stop manually activated');
  }

  /**
   * Reset emergency stop
   */
  resetEmergencyStop(): void {
    this.emergencyMode = false;
    this.config.emergencyStop = false;
    this.logger.info('✅ Emergency stop reset - system reactivated');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DeepRLConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('⚙️ Deep RL configuration updated');
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.agent.dispose();
    this.logger.info('🗑️ Deep RL Manager disposed');
  }
}
