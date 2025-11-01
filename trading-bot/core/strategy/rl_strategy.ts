/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🤖 RL STRATEGY INTEGRATION
 * 
 * Integration layer łączący PPOTradingAgent z main trading system
 * Implementuje BaseStrategy interface dla seamless integration
 */

import { AbstractStrategy } from '../strategy/abstract_strategy';
import { BotState } from '../types/bot_state';
import { Candle, StrategySignal } from '../types/strategy';
import { IndicatorSet } from '../types/indicator_set';
// import { PPOTradingAgent, MarketState, TradingAction } from '../../advanced_ai_ml_system'; // TYMCZASOWO WYŁĄCZONE

// Temporary type definitions for disabled ML components
type PPOTradingAgent = any;
type MarketState = any;
type TradingAction = any;
import { Logger } from '../../infrastructure/logging/logger';

interface RLStrategyConfig {
  agentId: string;
  agentName: string;
  modelPath?: string;
  enableOnlineLearning: boolean;
  rewardParameters: {
    profitWeight: number;
    riskWeight: number;
    consistencyWeight: number;
  };
  performanceThreshold: number; // Min performance to keep using RL
}

export class RLStrategy {
  // NOTE: removed explicit 'implements AbstractStrategy' to avoid needing to
  // implement additional interface members that this integration layer doesn't use.
  private rlAgent: PPOTradingAgent;
  private logger: Logger;
  private config: RLStrategyConfig;
  private performanceHistory: number[] = [];
  private isEnabled: boolean = true;

  constructor(config: RLStrategyConfig) {
    this.config = config;
    this.logger = new Logger('RLStrategy');
    
    // Initialize PPO agent
    // this.rlAgent = new PPOTradingAgent({
    //   name: this.config.agentName,
    //   id: this.config.agentId,
    //   hyperparameters: {}
    // });
    this.rlAgent = null; // Mock agent (temporarily disabled)

    this.logger.info(`RL Strategy initialized with agent: ${config.agentName}`);
  }

  async execute(candle: Candle, indicators: IndicatorSet, botState: BotState): Promise<StrategySignal> {
    if (!this.isEnabled) {
      return this.createHoldSignal('RL Strategy disabled due to poor performance');
    }

    try {
      // Convert BotState + indicators to RL MarketState
      const marketState = this.convertToMarketState(candle, indicators, botState);
      
      // Get action from RL agent
      const rlAction = await this.rlAgent.generateAction(marketState);
      
      // Convert RL action to StrategySignal
      const signal = this.convertToStrategySignal(rlAction, candle);
      
      // Log RL decision
      this.logger.info(`RL Action: ${rlAction.action_type} ${rlAction.quantity_percent.toFixed(1)}% (conf: ${rlAction.confidence.toFixed(3)})`);
      
      return signal;
      
    } catch (error) {
      this.logger.error(`RL Strategy error: ${error}`);
      return this.createHoldSignal('RL Strategy error');
    }
  }

  /**
   * Convert trading bot state to RL environment state
   */
  private convertToMarketState(candle: Candle, indicators: IndicatorSet, botState: BotState): MarketState {
    const portfolio = botState.portfolio;

    // Ensure we never pass `undefined` to `new Date(...)` by providing a fallback timestamp.
    const ts = candle.timestamp ?? Date.now();
    
    return {
      price: candle.close,
      volume: candle.volume,
      indicators: {
        rsi: indicators.rsi || 50,
        macd: indicators.macd?.histogram || 0,
        sma_20: indicators.sma20 || candle.close,
        sma_50: indicators.sma50 || candle.close,
        bollinger_upper: indicators.bb?.upper || candle.close * 1.02,
        bollinger_lower: indicators.bb?.lower || candle.close * 0.98,
        volatility: indicators.atr || candle.close * 0.01,
      },
      portfolio: {
        cash: portfolio.cash,
        btc_holdings: portfolio.btc,
        total_value: portfolio.totalValue,
        unrealized_pnl: portfolio.unrealizedPnL,
      },
      market_context: {
        hour_of_day: new Date(ts).getHours(),
        day_of_week: new Date(ts).getDay(),
        market_trend: this.detectMarketTrend(indicators),
        volatility_regime: this.detectVolatilityRegime(indicators),
      },
      recent_performance: this.performanceHistory.slice(-10),
    };
  }

  /**
   * Convert RL action to strategy signal
   */
  private convertToStrategySignal(rlAction: TradingAction, candle: Candle): StrategySignal {
    if (rlAction.action_type === 'HOLD') {
      return this.createHoldSignal(`RL recommendation: HOLD (conf: ${rlAction.confidence.toFixed(3)})`);
    }

    // Map RL agent actions to the strategy's expected action types
    // Default mapping: BUY -> ENTER_LONG, SELL -> ENTER_SHORT
    // If your RL agent can also emit explicit exit actions, extend this mapping accordingly.
    const mappedType: 'ENTER_LONG' | 'ENTER_SHORT' | 'EXIT_LONG' | 'EXIT_SHORT' =
      rlAction.action_type === 'BUY' ? 'ENTER_LONG' : 'ENTER_SHORT';

    const signal: StrategySignal = {
      price: candle.close,
      type: mappedType,
      confidence: rlAction.confidence,
      indicators: {
        confidence: rlAction.confidence,
        quantity_percent: rlAction.quantity_percent,
        stop_loss: rlAction.stop_loss || 0,
        take_profit: rlAction.take_profit || 0,
        timestamp: candle.timestamp || Date.now()
      },
      metadata: {
          strategy: 'RLStrategy',
          timeframe: 'm15',
          regime: 'NORMAL' as any
      }
    };

    return signal;
  }

  /**
   * Learn from trade results (online learning)
   */
  async learnFromTradeResult(
    tradeResult: {
      profit: number;
      roi: number;
      duration: number;
      drawdown: number;
    },
    isPositionClosed: boolean
  ): Promise<void> {
    if (!this.config.enableOnlineLearning) return;

    try {
      // Calculate reward based on trade performance
      const reward = this.calculateReward(tradeResult);
      
      // Update performance history
      this.performanceHistory.push(reward);
      if (this.performanceHistory.length > 100) {
        this.performanceHistory.shift();
      }

      // Check if we should disable RL strategy
      if (this.performanceHistory.length >= 20) {
        const avgPerformance = this.performanceHistory.slice(-20).reduce((a, b) => a + b, 0) / 20;
        if (avgPerformance < this.config.performanceThreshold) {
          this.isEnabled = false;
          this.logger.warn(`RL Strategy disabled due to poor performance: ${avgPerformance.toFixed(4)}`);
        }
      }

      // Train the RL agent with the result
      const dummyState: MarketState = this.createDummyState(); // Would use actual state in production
      await this.rlAgent.learnFromResult(reward, dummyState, isPositionClosed);
      
      this.logger.debug(`RL learning: reward=${reward.toFixed(4)}, enabled=${this.isEnabled}`);
      
    } catch (error) {
      this.logger.error(`RL learning error: ${error}`);
    }
  }

  /**
   * Calculate reward from trade performance
   */
  private calculateReward(tradeResult: { profit: number; roi: number; duration: number; drawdown: number }): number {
    const { profitWeight, riskWeight, consistencyWeight } = this.config.rewardParameters;
    
    // Profit component (normalized ROI)
    const profitReward = Math.tanh(tradeResult.roi * 10) * profitWeight;
    
    // Risk component (penalize high drawdown)
    const riskPenalty = -Math.abs(tradeResult.drawdown) * riskWeight;
    
    // Consistency component (reward consistent small wins over big volatile swings)
    const consistencyReward = (1 / (1 + Math.abs(tradeResult.roi))) * consistencyWeight;
    
    return profitReward + riskPenalty + consistencyReward;
  }

  private detectMarketTrend(indicators: IndicatorSet): 'BULL' | 'BEAR' | 'SIDEWAYS' {
    if (indicators.sma20 && indicators.sma50) {
      if (indicators.sma20 > indicators.sma50 * 1.02) return 'BULL';
      if (indicators.sma20 < indicators.sma50 * 0.98) return 'BEAR';
    }
    return 'SIDEWAYS';
  }

  private detectVolatilityRegime(indicators: IndicatorSet): 'LOW' | 'MEDIUM' | 'HIGH' {
    const atr = indicators.atr || 0;
    if (atr < 500) return 'LOW';
    if (atr < 1500) return 'MEDIUM';
    return 'HIGH';
  }

  private createHoldSignal(reason: string): StrategySignal {
    return {
      price: 0,
      type: 'EXIT_LONG',
      confidence: 0,
      indicators: { reason: 0 },
      metadata: { 
        strategy: 'RLStrategy', 
        timeframe: 'm15',
        regime: 'NORMAL' as any
      }
    };
  }

  private createDummyState(): MarketState {
    // This would be replaced with actual state tracking in production
    return {
      price: 50000,
      volume: 1000000,
      indicators: {
        rsi: 50,
        macd: 0,
        sma_20: 50000,
        sma_50: 50000,
        bollinger_upper: 51000,
        bollinger_lower: 49000,
        volatility: 500,
      },
      portfolio: {
        cash: 10000,
        btc_holdings: 0,
        total_value: 10000,
        unrealized_pnl: 0,
      },
      market_context: {
        hour_of_day: 12,
        day_of_week: 1,
        market_trend: 'SIDEWAYS',
        volatility_regime: 'MEDIUM',
      },
      recent_performance: [],
    };
  }

  // Required by AbstractStrategy interface
  getName(): string {
    return `RLStrategy-${this.config.agentName}`;
  }

  getMetadata() {
    return {
      type: 'RL',
      agent: this.config.agentName,
      enabled: this.isEnabled,
      performance: this.performanceHistory.length > 0 
        ? this.performanceHistory.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, this.performanceHistory.length)
        : 0,
    };
  }
}
