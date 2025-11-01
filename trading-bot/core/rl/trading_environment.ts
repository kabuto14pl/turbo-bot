/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🌍 TRADING ENVIRONMENT FOR RL
 * 
 * Complete trading environment for reinforcement learning agents
 * Provides state space, action space, reward functions, and step mechanics
 */

import { Candle } from '../types/strategy';
import { BotState } from '../types/bot_state';
import { IndicatorSet } from '../types/indicator_set';
import { Logger } from '../../infrastructure/logging/logger';

export interface TradingEnvironmentState {
  // Market data
  price: number;
  volume: number;
  high: number;
  low: number;
  
  // Technical indicators
  indicators: {
    rsi: number;
    macd: number;
    macd_signal: number;
    macd_histogram: number;
    sma_20: number;
    sma_50: number;
    sma_200: number;
    bollinger_upper: number;
    bollinger_middle: number;
    bollinger_lower: number;
    atr: number;
    volatility: number;
    momentum: number;
  };
  
  // Portfolio state
  portfolio: {
    cash: number;
    btc_holdings: number;
    total_value: number;
    unrealized_pnl: number;
    realized_pnl: number;
    position_size: number;
    average_entry_price: number;
  };
  
  // Market context
  market_context: {
    hour_of_day: number;
    day_of_week: number;
    month_of_year: number;
    market_trend: 'BULL' | 'BEAR' | 'SIDEWAYS';
    volatility_regime: 'LOW' | 'MEDIUM' | 'HIGH';
    trend_strength: number;
  };
  
  // Performance metrics
  performance: {
    recent_trades: number[];
    win_rate: number;
    avg_return: number;
    max_drawdown: number;
    sharpe_ratio: number;
    sortino_ratio: number;
  };
  
  // Risk metrics
  risk: {
    var_95: number; // Value at Risk
    expected_shortfall: number;
    portfolio_volatility: number;
    correlation_with_market: number;
  };
}

export interface RLAction {
  action_type: 'BUY' | 'SELL' | 'HOLD';
  quantity_percent: number; // 0-100% of available capital
  confidence: number; // 0-1
  stop_loss_percent?: number; // % below/above entry price
  take_profit_percent?: number; // % above/below entry price
  timeframe_hint: 'SHORT' | 'MEDIUM' | 'LONG'; // Expected holding period
}

export interface EnvironmentStep {
  state: TradingEnvironmentState;
  reward: number;
  done: boolean;
  info: {
    trade_executed: boolean;
    trade_result?: {
      profit: number;
      roi: number;
      duration: number;
    };
    risk_violation: boolean;
    reason: string;
  };
}

export interface RewardConfig {
  profit_weight: number;
  risk_weight: number;
  consistency_weight: number;
  drawdown_penalty: number;
  trade_frequency_penalty: number;
  win_rate_bonus: number;
  sharpe_ratio_bonus: number;
}

/**
 * 🎯 ADVANCED TRADING ENVIRONMENT
 */
export class TradingEnvironment {
  private logger: Logger;
  private config: RewardConfig;
  private currentState: TradingEnvironmentState;
  private previousState?: TradingEnvironmentState;
  private tradeHistory: Array<{
    action: RLAction;
    entry_price: number;
    exit_price?: number;
    profit?: number;
    roi?: number;
    duration?: number;
    timestamp: number;
  }> = [];
  
  private performanceMetrics: {
    total_return: number;
    max_drawdown: number;
    trades_count: number;
    winning_trades: number;
    total_profit: number;
    total_loss: number;
  };

  constructor(config: RewardConfig) {
    this.logger = new Logger('TradingEnvironment');
    this.config = config;
    this.currentState = this.initializeState();
    this.performanceMetrics = {
      total_return: 0,
      max_drawdown: 0,
      trades_count: 0,
      winning_trades: 0,
      total_profit: 0,
      total_loss: 0,
    };
  }

  /**
   * Execute action and return next state + reward
   */
  public step(action: RLAction, candle: Candle, indicators: IndicatorSet, botState: BotState): EnvironmentStep {
    this.previousState = { ...this.currentState };
    
    // Update state with new market data
    this.updateState(candle, indicators, botState);
    
    // Execute action and calculate reward
    const { reward, trade_executed, trade_result, risk_violation } = this.executeAction(action, candle);
    
    // Check if episode is done (risk limits breached, etc.)
    const done = this.checkEpisodeEnd();
    
    // Log the step
    this.logStep(action, reward, trade_executed);
    
    return {
      state: this.currentState,
      reward,
      done,
      info: {
        trade_executed,
        trade_result,
        risk_violation,
        reason: this.getStepReason(action, reward),
      },
    };
  }

  /**
   * Reset environment to initial state
   */
  public reset(initialBotState: BotState): TradingEnvironmentState {
    this.currentState = this.initializeState();
    this.previousState = undefined;
    this.tradeHistory = [];
    this.performanceMetrics = {
      total_return: 0,
      max_drawdown: 0,
      trades_count: 0,
      winning_trades: 0,
      total_profit: 0,
      total_loss: 0,
    };
    
    // Update with initial bot state
    this.currentState.portfolio = {
      cash: initialBotState.portfolio.cash,
      btc_holdings: initialBotState.portfolio.btc,
      total_value: initialBotState.portfolio.totalValue,
      unrealized_pnl: initialBotState.portfolio.unrealizedPnL,
      realized_pnl: initialBotState.portfolio.realizedPnL,
      position_size: initialBotState.portfolio.btc,
      average_entry_price: initialBotState.portfolio.averageEntryPrice || 0,
    };
    
    this.logger.info('Trading environment reset');
    return this.currentState;
  }

  /**
   * Get current state for observation
   */
  public getCurrentState(): TradingEnvironmentState {
    return { ...this.currentState };
  }

  /**
   * Convert state to vector for neural network input
   */
  public stateToVector(state: TradingEnvironmentState): number[] {
    return [
      // Price data (normalized)
      state.price / 100000,
      state.volume / 10000000,
      state.high / 100000,
      state.low / 100000,
      
      // Technical indicators (normalized 0-1)
      state.indicators.rsi / 100,
      Math.tanh(state.indicators.macd / 1000),
      Math.tanh(state.indicators.macd_signal / 1000),
      Math.tanh(state.indicators.macd_histogram / 500),
      state.indicators.sma_20 / 100000,
      state.indicators.sma_50 / 100000,
      state.indicators.sma_200 / 100000,
      state.indicators.bollinger_upper / 100000,
      state.indicators.bollinger_middle / 100000,
      state.indicators.bollinger_lower / 100000,
      state.indicators.atr / 5000,
      Math.tanh(state.indicators.volatility / 0.1),
      Math.tanh(state.indicators.momentum / 0.05),
      
      // Portfolio (normalized)
      state.portfolio.cash / 100000,
      state.portfolio.btc_holdings / 10,
      state.portfolio.total_value / 100000,
      Math.tanh(state.portfolio.unrealized_pnl / 10000),
      Math.tanh(state.portfolio.realized_pnl / 10000),
      state.portfolio.position_size / 10,
      
      // Market context
      state.market_context.hour_of_day / 24,
      state.market_context.day_of_week / 7,
      state.market_context.month_of_year / 12,
      state.market_context.trend_strength,
      
      // Performance metrics
      Math.tanh(state.performance.avg_return),
      state.performance.win_rate,
      Math.tanh(state.performance.max_drawdown),
      Math.tanh(state.performance.sharpe_ratio / 5),
      Math.tanh(state.performance.sortino_ratio / 5),
      
      // Risk metrics
      Math.tanh(state.risk.var_95 / 0.1),
      Math.tanh(state.risk.expected_shortfall / 0.1),
      Math.tanh(state.risk.portfolio_volatility / 0.2),
      Math.tanh(state.risk.correlation_with_market),
    ];
  }

  private executeAction(action: RLAction, candle: Candle): {
    reward: number;
    trade_executed: boolean;
    trade_result?: any;
    risk_violation: boolean;
  } {
    let reward = 0;
    let trade_executed = false;
    let trade_result = undefined;
    let risk_violation = false;

    // Risk checks
    if (this.checkRiskViolation(action)) {
      risk_violation = true;
      reward = -1.0; // Heavy penalty for risk violations
      return { reward, trade_executed, trade_result, risk_violation };
    }

    // Execute action
    if (action.action_type === 'HOLD') {
      reward = this.calculateHoldReward();
    } else {
      const execution_result = this.simulateTradeExecution(action, candle);
      trade_executed = execution_result.executed;
      trade_result = execution_result.result;
      reward = this.calculateTradingReward(action, execution_result);
      
      if (trade_executed) {
        this.recordTrade(action, candle.close, execution_result);
      }
    }

    // Add consistency bonus/penalty
    reward += this.calculateConsistencyReward();
    
    // Add performance-based adjustments
    reward += this.calculatePerformanceAdjustment();

    return { reward, trade_executed, trade_result, risk_violation };
  }

  private calculateTradingReward(action: RLAction, execution_result: any): number {
    let reward = 0;

    if (!execution_result.executed) {
      return -0.1; // Small penalty for failed executions
    }

    const { profit, roi } = execution_result.result;
    
    // Profit component
    reward += Math.tanh(roi * 10) * this.config.profit_weight;
    
    // Risk component
    const portfolio_risk = this.calculatePortfolioRisk();
    reward -= portfolio_risk * this.config.risk_weight;
    
    // Confidence alignment (reward high confidence when correct)
    if ((profit > 0 && action.confidence > 0.7) || (profit < 0 && action.confidence < 0.3)) {
      reward += 0.1 * action.confidence;
    }

    return reward;
  }

  private calculateHoldReward(): number {
    // Small positive reward for HOLD when market is uncertain
    const market_uncertainty = this.calculateMarketUncertainty();
    return market_uncertainty * 0.05;
  }

  private calculateConsistencyReward(): number {
    if (this.tradeHistory.length < 5) return 0;
    
    const recent_returns = this.tradeHistory.slice(-5).map(trade => trade.roi || 0);
    const volatility = this.calculateVolatility(recent_returns);
    
    // Reward low volatility (consistency)
    return (1 / (1 + volatility)) * this.config.consistency_weight;
  }

  private calculatePerformanceAdjustment(): number {
    let adjustment = 0;
    
    // Win rate bonus
    if (this.performanceMetrics.trades_count > 10) {
      const win_rate = this.performanceMetrics.winning_trades / this.performanceMetrics.trades_count;
      adjustment += (win_rate - 0.5) * this.config.win_rate_bonus;
    }
    
    // Drawdown penalty
    adjustment -= this.performanceMetrics.max_drawdown * this.config.drawdown_penalty;
    
    return adjustment;
  }

  private updateState(candle: Candle, indicators: IndicatorSet, botState: BotState): void {
    // Update price data
    this.currentState.price = candle.close;
    this.currentState.volume = candle.volume;
    this.currentState.high = candle.high;
    this.currentState.low = candle.low;
    
    // Update technical indicators
    this.currentState.indicators = {
      rsi: indicators.rsi || 50,
  macd: indicators.macd?.macd || 0,
      macd_signal: indicators.macd?.signal || 0,
      macd_histogram: indicators.macd?.histogram || 0,
      sma_20: indicators.sma20 || candle.close,
      sma_50: indicators.sma50 || candle.close,
      sma_200: indicators.sma200 || candle.close,
      bollinger_upper: indicators.bb?.upper || candle.close * 1.02,
      bollinger_middle: indicators.bb?.middle || candle.close,
      bollinger_lower: indicators.bb?.lower || candle.close * 0.98,
      atr: indicators.atr || candle.close * 0.01,
      volatility: this.calculateRealizedVolatility(),
      momentum: this.calculateMomentum(),
    };
    
    // Update portfolio
    this.currentState.portfolio = {
      cash: botState.portfolio.cash,
      btc_holdings: botState.portfolio.btc,
      total_value: botState.portfolio.totalValue,
      unrealized_pnl: botState.portfolio.unrealizedPnL,
      realized_pnl: botState.portfolio.realizedPnL,
      position_size: botState.portfolio.btc,
      average_entry_price: botState.portfolio.averageEntryPrice || 0,
    };
    
    // Update market context
  const date = new Date(candle.timestamp ?? candle.time);
    this.currentState.market_context = {
      hour_of_day: date.getHours(),
      day_of_week: date.getDay(),
      month_of_year: date.getMonth(),
      market_trend: this.detectMarketTrend(indicators),
      volatility_regime: this.detectVolatilityRegime(indicators),
      trend_strength: this.calculateTrendStrength(indicators),
    };
    
    // Update performance metrics
    this.updatePerformanceMetrics();
    
    // Update risk metrics
    this.updateRiskMetrics();
  }

  private initializeState(): TradingEnvironmentState {
    return {
      price: 0,
      volume: 0,
      high: 0,
      low: 0,
      indicators: {
        rsi: 50,
        macd: 0,
        macd_signal: 0,
        macd_histogram: 0,
        sma_20: 0,
        sma_50: 0,
        sma_200: 0,
        bollinger_upper: 0,
        bollinger_middle: 0,
        bollinger_lower: 0,
        atr: 0,
        volatility: 0,
        momentum: 0,
      },
      portfolio: {
        cash: 10000,
        btc_holdings: 0,
        total_value: 10000,
        unrealized_pnl: 0,
        realized_pnl: 0,
        position_size: 0,
        average_entry_price: 0,
      },
      market_context: {
        hour_of_day: 12,
        day_of_week: 1,
        month_of_year: 1,
        market_trend: 'SIDEWAYS',
        volatility_regime: 'MEDIUM',
        trend_strength: 0,
      },
      performance: {
        recent_trades: [],
        win_rate: 0.5,
        avg_return: 0,
        max_drawdown: 0,
        sharpe_ratio: 0,
        sortino_ratio: 0,
      },
      risk: {
        var_95: 0,
        expected_shortfall: 0,
        portfolio_volatility: 0,
        correlation_with_market: 0,
      },
    };
  }

  // Helper methods...
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

  private calculateTrendStrength(indicators: IndicatorSet): number {
    // Simplified trend strength calculation
    if (indicators.sma20 && indicators.sma50) {
      return Math.min(1, Math.abs(indicators.sma20 - indicators.sma50) / indicators.sma50);
    }
    return 0;
  }

  private calculateRealizedVolatility(): number {
    // Simplified volatility calculation
    return Math.random() * 0.05; // Placeholder
  }

  private calculateMomentum(): number {
    // Simplified momentum calculation
    return Math.random() * 0.1 - 0.05; // Placeholder
  }

  private calculatePortfolioRisk(): number {
    // Simplified risk calculation
    return Math.abs(this.currentState.portfolio.position_size) / 10; // Placeholder
  }

  private calculateMarketUncertainty(): number {
    // High uncertainty when RSI is around 50, low volatility
    const rsi_uncertainty = 1 - Math.abs(this.currentState.indicators.rsi - 50) / 50;
    const vol_uncertainty = 1 - this.currentState.indicators.volatility;
    return (rsi_uncertainty + vol_uncertainty) / 2;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private checkRiskViolation(action: RLAction): boolean {
    // Check position size limits
    if (action.quantity_percent > 100) return true;
    
    // Check portfolio leverage
    const total_exposure = this.currentState.portfolio.position_size * this.currentState.price;
    if (total_exposure > this.currentState.portfolio.total_value * 2) return true;
    
    return false;
  }

  private simulateTradeExecution(action: RLAction, candle: Candle): { executed: boolean; result?: any } {
    // Simplified trade execution simulation
    const executed = Math.random() > 0.05; // 95% execution success rate
    
    if (!executed) {
      return { executed: false };
    }

    // Simulate slippage and fees
    const slippage = (Math.random() - 0.5) * 0.001; // ±0.05% slippage
    const fee = 0.001; // 0.1% fee
    const execution_price = candle.close * (1 + slippage);
    
    // Calculate hypothetical profit (simplified)
    const price_change = (Math.random() - 0.5) * 0.02; // ±1% random price change
    const gross_profit = action.action_type === 'BUY' ? price_change : -price_change;
    const net_profit = gross_profit - fee;
    const roi = net_profit * (action.quantity_percent / 100);

    return {
      executed: true,
      result: {
        execution_price,
        profit: roi * this.currentState.portfolio.total_value,
        roi,
        slippage,
        fee,
      },
    };
  }

  private recordTrade(action: RLAction, price: number, execution_result: any): void {
    this.tradeHistory.push({
      action,
      entry_price: price,
      profit: execution_result.result.profit,
      roi: execution_result.result.roi,
      duration: 1, // Simplified
      timestamp: Date.now(),
    });

    // Update performance metrics
    this.performanceMetrics.trades_count++;
    if (execution_result.result.profit > 0) {
      this.performanceMetrics.winning_trades++;
      this.performanceMetrics.total_profit += execution_result.result.profit;
    } else {
      this.performanceMetrics.total_loss += Math.abs(execution_result.result.profit);
    }
  }

  private updatePerformanceMetrics(): void {
    if (this.tradeHistory.length === 0) return;

    const recent_trades = this.tradeHistory.slice(-20);
    const returns = recent_trades.map(trade => trade.roi || 0);
    
    this.currentState.performance.recent_trades = returns.slice(-10);
    this.currentState.performance.win_rate = this.performanceMetrics.trades_count > 0 
      ? this.performanceMetrics.winning_trades / this.performanceMetrics.trades_count 
      : 0.5;
    this.currentState.performance.avg_return = returns.length > 0 
      ? returns.reduce((a, b) => a + b, 0) / returns.length 
      : 0;
      
    // Calculate Sharpe ratio (simplified)
    const volatility = this.calculateVolatility(returns);
    this.currentState.performance.sharpe_ratio = volatility > 0 
      ? this.currentState.performance.avg_return / volatility 
      : 0;
  }

  private updateRiskMetrics(): void {
    // Simplified risk metrics
    this.currentState.risk.portfolio_volatility = this.calculateVolatility(
      this.currentState.performance.recent_trades
    );
    
    // Placeholder values
    this.currentState.risk.var_95 = this.currentState.risk.portfolio_volatility * 1.65;
    this.currentState.risk.expected_shortfall = this.currentState.risk.var_95 * 1.2;
    this.currentState.risk.correlation_with_market = Math.random() * 0.8 + 0.1;
  }

  private checkEpisodeEnd(): boolean {
    // Episode ends if portfolio drops below 50% of initial value
    return this.currentState.portfolio.total_value < 5000;
  }

  private logStep(action: RLAction, reward: number, trade_executed: boolean): void {
    this.logger.debug(`RL Step: ${action.action_type} ${action.quantity_percent.toFixed(1)}% | Reward: ${reward.toFixed(4)} | Executed: ${trade_executed}`);
  }

  private getStepReason(action: RLAction, reward: number): string {
    if (reward > 0.1) return `Positive outcome for ${action.action_type}`;
    if (reward < -0.1) return `Negative outcome for ${action.action_type}`;
    return `Neutral outcome for ${action.action_type}`;
  }
}
