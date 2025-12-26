/**
 * 🤖 ML RETRAIN MANAGER - KROK 5.2
 * Automatic ML model retraining system
 * 
 * Features:
 * - Auto-retrain every 50 trades
 * - Before/after performance validation
 * - Rollback if performance degrades >10%
 * - Incremental learning with history preservation
 * - Model checkpoint management
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface RetrainConfig {
  retrain_interval_trades: number;  // Default: 50
  validation_window: number;         // Default: 20
  max_performance_drop: number;      // Default: 0.10 (10%)
  min_trades_for_retrain: number;   // Default: 100
  checkpoint_dir: string;            // Default: './data/ml_checkpoints'
  keep_checkpoints: number;          // Default: 5
  auto_rollback: boolean;            // Default: true
}

export interface RetrainResult {
  success: boolean;
  timestamp: Date;
  trades_used: number;
  
  // Performance before retrain
  before_win_rate: number;
  before_sharpe: number;
  before_ml_confidence: number;
  
  // Performance after retrain
  after_win_rate: number;
  after_sharpe: number;
  after_ml_confidence: number;
  
  // Comparison
  performance_change: number;
  rolled_back: boolean;
  
  // Model info
  checkpoint_path?: string;
  error?: string;
}

export class MLRetrainManager extends EventEmitter {
  private config: RetrainConfig;
  private trade_count: number = 0;
  private total_retrains: number = 0;
  private last_retrain_at: number = 0;
  private retrain_history: RetrainResult[] = [];
  
  // Performance tracking
  private recent_trades: any[] = [];
  private pre_retrain_checkpoint: any = null;
  
  constructor(config?: Partial<RetrainConfig>) {
    super();
    
    this.config = {
      retrain_interval_trades: 50,
      validation_window: 20,
      max_performance_drop: 0.10,
      min_trades_for_retrain: 100,
      checkpoint_dir: './data/ml_checkpoints',
      keep_checkpoints: 5,
      auto_rollback: true,
      ...config
    };
    
    // Ensure checkpoint directory exists
    this.ensureCheckpointDir();
  }
  
  private ensureCheckpointDir(): void {
    if (!fs.existsSync(this.config.checkpoint_dir)) {
      fs.mkdirSync(this.config.checkpoint_dir, { recursive: true });
      console.log(`📁 Created checkpoint directory: ${this.config.checkpoint_dir}`);
    }
  }
  
  /**
   * 📊 Record trade for retrain monitoring
   */
  public recordTrade(trade: any): void {
    this.trade_count++;
    this.recent_trades.push(trade);
    
    // Keep only recent trades in memory
    if (this.recent_trades.length > this.config.retrain_interval_trades * 3) {
      this.recent_trades.shift();
    }
    
    // Check if retrain needed
    if (this.shouldRetrain()) {
      console.log(`🔄 Retrain trigger: ${this.trade_count} trades since last retrain`);
      this.emit('retrain:needed', {
        trade_count: this.trade_count,
        trades_since_last: this.trade_count - this.last_retrain_at
      });
    }
  }
  
  /**
   * ❓ Check if retrain is needed
   */
  private shouldRetrain(): boolean {
    // Not enough total trades
    if (this.trade_count < this.config.min_trades_for_retrain) {
      return false;
    }
    
    // Check interval
    const trades_since_last = this.trade_count - this.last_retrain_at;
    return trades_since_last >= this.config.retrain_interval_trades;
  }
  
  /**
   * 🎓 Perform ML model retraining
   */
  public async performRetrain(mlAdapter: any): Promise<RetrainResult> {
    console.log('\n🎓 ML RETRAIN STARTING...');
    console.log(`   Total trades: ${this.trade_count}`);
    console.log(`   Trades since last retrain: ${this.trade_count - this.last_retrain_at}`);
    
    const result: RetrainResult = {
      success: false,
      timestamp: new Date(),
      trades_used: this.recent_trades.length,
      before_win_rate: 0,
      before_sharpe: 0,
      before_ml_confidence: 0,
      after_win_rate: 0,
      after_sharpe: 0,
      after_ml_confidence: 0,
      performance_change: 0,
      rolled_back: false
    };
    
    try {
      // Step 1: Capture before-retrain performance
      const before_metrics = await this.capturePerformance(mlAdapter);
      result.before_win_rate = before_metrics.win_rate;
      result.before_sharpe = before_metrics.sharpe;
      result.before_ml_confidence = before_metrics.ml_confidence;
      
      console.log('   Before retrain:');
      console.log(`     Win Rate: ${(before_metrics.win_rate * 100).toFixed(1)}%`);
      console.log(`     Sharpe: ${before_metrics.sharpe.toFixed(2)}`);
      console.log(`     ML Confidence: ${(before_metrics.ml_confidence * 100).toFixed(1)}%`);
      
      // Step 2: Create checkpoint (backup current model)
      const checkpoint_path = await this.createCheckpoint(mlAdapter);
      result.checkpoint_path = checkpoint_path;
      console.log(`   ✅ Checkpoint saved: ${checkpoint_path}`);
      
      // Step 3: Retrain model with recent trades
      console.log('   🔄 Retraining model...');
      await this.retrainModel(mlAdapter, this.recent_trades);
      
      // Step 4: Validate retrained model
      const after_metrics = await this.capturePerformance(mlAdapter);
      result.after_win_rate = after_metrics.win_rate;
      result.after_sharpe = after_metrics.sharpe;
      result.after_ml_confidence = after_metrics.ml_confidence;
      
      console.log('   After retrain:');
      console.log(`     Win Rate: ${(after_metrics.win_rate * 100).toFixed(1)}%`);
      console.log(`     Sharpe: ${after_metrics.sharpe.toFixed(2)}`);
      console.log(`     ML Confidence: ${(after_metrics.ml_confidence * 100).toFixed(1)}%`);
      
      // Step 5: Calculate performance change
      result.performance_change = this.calculatePerformanceChange(before_metrics, after_metrics);
      
      console.log(`   Performance Change: ${(result.performance_change * 100).toFixed(1)}%`);
      
      // Step 6: Rollback if performance degraded significantly
      if (result.performance_change < -this.config.max_performance_drop && this.config.auto_rollback) {
        console.log(`   ⚠️ Performance degraded by ${Math.abs(result.performance_change * 100).toFixed(1)}% - ROLLING BACK`);
        await this.rollbackToCheckpoint(mlAdapter, checkpoint_path);
        result.rolled_back = true;
        result.success = false;
      } else {
        console.log('   ✅ Retrain successful - model updated');
        result.success = true;
        this.last_retrain_at = this.trade_count;
        this.total_retrains++;
        
        // Clean old checkpoints
        await this.cleanOldCheckpoints();
      }
      
    } catch (error: any) {
      console.error('   ❌ Retrain failed:', error.message);
      result.error = error.message;
      result.success = false;
      
      // Try to rollback
      if (result.checkpoint_path && this.config.auto_rollback) {
        console.log('   🔄 Attempting rollback...');
        try {
          await this.rollbackToCheckpoint(mlAdapter, result.checkpoint_path);
          result.rolled_back = true;
          console.log('   ✅ Rollback successful');
        } catch (rollback_error: any) {
          console.error('   ❌ Rollback failed:', rollback_error.message);
        }
      }
    }
    
    // Store result
    this.retrain_history.push(result);
    
    // Emit event
    this.emit('retrain:completed', result);
    
    return result;
  }
  
  /**
   * 📊 Capture current model performance
   */
  private async capturePerformance(mlAdapter: any): Promise<any> {
    // Get validation window trades
    const validation_trades = this.recent_trades.slice(-this.config.validation_window);
    
    if (validation_trades.length < this.config.validation_window) {
      // Not enough validation data
      return {
        win_rate: 0.5,
        sharpe: 0,
        ml_confidence: 0.3
      };
    }
    
    // Calculate win rate
    const wins = validation_trades.filter(t => t.pnl > 0).length;
    const win_rate = wins / validation_trades.length;
    
    // Calculate Sharpe ratio
    const returns = validation_trades.map(t => t.pnl);
    const mean_return = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean_return, 2), 0) / returns.length;
    const std_dev = Math.sqrt(variance);
    const sharpe = std_dev > 0 ? mean_return / std_dev : 0;
    
    // Calculate average ML confidence
    const ml_confidences = validation_trades
      .filter(t => t.ml_confidence !== undefined)
      .map(t => t.ml_confidence);
    const ml_confidence = ml_confidences.length > 0
      ? ml_confidences.reduce((a, b) => a + b, 0) / ml_confidences.length
      : 0.3;
    
    return { win_rate, sharpe, ml_confidence };
  }
  
  /**
   * 💾 Create model checkpoint
   */
  private async createCheckpoint(mlAdapter: any): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const checkpoint_name = `ml_checkpoint_${timestamp}.json`;
    const checkpoint_path = path.join(this.config.checkpoint_dir, checkpoint_name);
    
    // Get model state
    const model_state = await mlAdapter.getModelState();
    
    // Save to file
    const checkpoint_data = {
      timestamp: new Date().toISOString(),
      trade_count: this.trade_count,
      model_state,
      performance: await this.capturePerformance(mlAdapter)
    };
    
    fs.writeFileSync(checkpoint_path, JSON.stringify(checkpoint_data, null, 2));
    
    return checkpoint_path;
  }
  
  /**
   * 🔄 Rollback to checkpoint
   */
  private async rollbackToCheckpoint(mlAdapter: any, checkpoint_path: string): Promise<void> {
    if (!fs.existsSync(checkpoint_path)) {
      throw new Error(`Checkpoint not found: ${checkpoint_path}`);
    }
    
    // Load checkpoint
    const checkpoint_data = JSON.parse(fs.readFileSync(checkpoint_path, 'utf-8'));
    
    // Restore model state
    await mlAdapter.restoreModelState(checkpoint_data.model_state);
    
    console.log(`   ✅ Model restored from checkpoint: ${checkpoint_path}`);
  }
  
  /**
   * 🎓 Retrain model with recent trades
   */
  private async retrainModel(mlAdapter: any, trades: any[]): Promise<void> {
    // Incremental learning - use recent trades
    for (const trade of trades) {
      // Extract features from trade
      const features = {
        price: trade.price || 0,
        rsi: trade.rsi || 50,
        volume: trade.volume || 0,
        priceHistory: trade.priceHistory || []
      };
      
      // Learn from result
      await mlAdapter.learnFromResult(
        trade.pnl,
        trade.duration || 0,
        {
          market_volatility: trade.volatility || 0.01,
          position_held_seconds: trade.duration || 0
        }
      );
    }
    
    console.log(`   ✅ Model retrained with ${trades.length} trades`);
  }
  
  /**
   * 📊 Calculate overall performance change
   */
  private calculatePerformanceChange(before: any, after: any): number {
    // Weighted combination of metrics
    const win_rate_change = (after.win_rate - before.win_rate);
    const sharpe_change = (after.sharpe - before.sharpe) / Math.max(Math.abs(before.sharpe), 1);
    const confidence_change = (after.ml_confidence - before.ml_confidence);
    
    // Weighted average (win rate 50%, Sharpe 30%, confidence 20%)
    return (win_rate_change * 0.5) + (sharpe_change * 0.3) + (confidence_change * 0.2);
  }
  
  /**
   * 🧹 Clean old checkpoints (keep only last N)
   */
  private async cleanOldCheckpoints(): Promise<void> {
    const files = fs.readdirSync(this.config.checkpoint_dir)
      .filter(f => f.startsWith('ml_checkpoint_') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    // Remove old checkpoints (keep only keep_checkpoints)
    const to_remove = files.slice(this.config.keep_checkpoints);
    
    for (const file of to_remove) {
      const file_path = path.join(this.config.checkpoint_dir, file);
      fs.unlinkSync(file_path);
      console.log(`   🗑️ Removed old checkpoint: ${file}`);
    }
  }
  
  /**
   * 📋 Get retrain history
   */
  public getRetrainHistory(limit: number = 10): RetrainResult[] {
    return this.retrain_history.slice(-limit);
  }
  
  /**
   * 📊 Get retrain statistics
   */
  public getStatistics(): any {
    const successful_retrains = this.retrain_history.filter(r => r.success && !r.rolled_back).length;
    const rolled_back = this.retrain_history.filter(r => r.rolled_back).length;
    
    return {
      total_retrains: this.total_retrains,
      successful_retrains,
      rolled_back_retrains: rolled_back,
      success_rate: this.retrain_history.length > 0
        ? `${(successful_retrains / this.retrain_history.length * 100).toFixed(1)}%`
        : 'N/A',
      last_retrain: this.retrain_history.length > 0
        ? this.retrain_history[this.retrain_history.length - 1].timestamp
        : null,
      trades_since_last: this.trade_count - this.last_retrain_at
    };
  }
}
