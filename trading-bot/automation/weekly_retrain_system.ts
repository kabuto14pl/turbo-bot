/**
 * 🔄 WEEKLY RETRAIN SYSTEM
 * Automatyczny system tygodniowego retreningu modeli RL
 * Uruchamia się każdą niedzielę o 2:00 AM
 */

import { Logger } from '../core/utils/logger';
import { AdvancedRLTrainingPipeline } from '../core/rl/advanced/advanced_rl_training_pipeline';
import { PerformanceTracker, PerformanceMetrics } from '../core/analysis/performance_tracker';
import { EventEmitter } from 'events';

export interface WeeklyRetrainConfig {
  enabled: boolean;
  performanceThreshold: number;      // Minimum Sharpe ratio to keep current model
  dataLookbackWeeks: number;         // Weeks of data to use for training
  minPerformanceImprovement: number; // Minimum improvement to deploy new model
  abTestDuration: number;            // Hours to run A/B test
  rollbackEnabled: boolean;
  rollbackThreshold: number;         // Performance drop % to trigger rollback
  maxConsecutiveFailures: number;    // Max training failures before alert
    schedule: string;                  // Schedule for retraining
    additionalField1: string;          // Example additional field
    additionalField2: number;          // Example additional field
}

export interface WeeklyRetrainReport {
  date: Date;
  currentModelId: string;
  currentModelPerformance: {
    sharpeRatio: number;
    totalReturn: number;
    maxDrawdown: number;
    winRate: number;
  };
  retrainTriggered: boolean;
  retrainReason: string;
  newModelId?: string;
  newModelPerformance?: {
    sharpeRatio: number;
    totalReturn: number;
    maxDrawdown: number;
    winRate: number;
  };
  abTestRequired: boolean;
  abTestResult?: {
    winner: 'current' | 'new' | 'tie';
    confidence: number;
    deployed: boolean;
  };
  actionTaken: 'keep_current' | 'deploy_new' | 'rollback' | 'require_manual_review';
  executionTime: number;
  errors: string[];
  nextRetrainDate: Date;
}

export interface RetrainStats {
  totalRetrains: number;
  successfulRetrains: number;
  deployedModels: number;
  averageImprovement: number;
  lastRetrainDate?: Date;
  consecutiveFailures: number;
}

/**
 * 🎯 WEEKLY RETRAIN SYSTEM
 * Automated weekly RL model retraining and deployment
 */
export class WeeklyRetrainSystem extends EventEmitter {
  private logger: Logger;
  private config: WeeklyRetrainConfig;
  private trainingPipeline: AdvancedRLTrainingPipeline;
  private performanceTracker: PerformanceTracker;
  private isRetraining: boolean = false;
  private retrainHistory: WeeklyRetrainReport[] = [];
  private stats: RetrainStats;

  constructor(
    config: WeeklyRetrainConfig,
    trainingPipeline: AdvancedRLTrainingPipeline,
    performanceTracker: PerformanceTracker
  ) {
    super();
    
    this.config = config;
    this.logger = new Logger();
    this.trainingPipeline = trainingPipeline;
    this.performanceTracker = performanceTracker;

    this.stats = {
      totalRetrains: 0,
      successfulRetrains: 0,
      deployedModels: 0,
      averageImprovement: 0,
      consecutiveFailures: 0
    };

    this.logger.info('🔄 Weekly Retrain System initialized');
  }

  /**
   * 🚀 Execute weekly retrain
   */
  async executeWeeklyRetrain(): Promise<WeeklyRetrainReport> {
    if (this.isRetraining) {
      throw new Error('Weekly retrain already in progress');
    }

    const startTime = Date.now();
    this.isRetraining = true;

    try {
      this.logger.info('🔄 Starting weekly retrain process...');

      const report: WeeklyRetrainReport = {
        date: new Date(),
        currentModelId: '',
        currentModelPerformance: {
          sharpeRatio: 0,
          totalReturn: 0,
          maxDrawdown: 0,
          winRate: 0
        },
        retrainTriggered: false,
        retrainReason: '',
        abTestRequired: false,
        actionTaken: 'keep_current',
        executionTime: 0,
        errors: [],
        nextRetrainDate: this.getNextRetrainDate()
      };

      // 1. Get current model performance
      const currentModel = this.trainingPipeline.getActiveModel();
      if (!currentModel) {
        throw new Error('No active model found');
      }

      report.currentModelId = currentModel.id;
      report.currentModelPerformance = await this.getCurrentModelPerformance();

      this.logger.info(`📊 Current model ${currentModel.id} performance:`);
      this.logger.info(`   Sharpe: ${report.currentModelPerformance.sharpeRatio.toFixed(3)}`);
      this.logger.info(`   Return: ${(report.currentModelPerformance.totalReturn * 100).toFixed(2)}%`);

      // 2. Determine if retrain is needed
      const retrainDecision = this.shouldRetrain(report.currentModelPerformance);
      report.retrainTriggered = retrainDecision.shouldRetrain;
      report.retrainReason = retrainDecision.reason;

      if (!report.retrainTriggered) {
        this.logger.info(`✅ Retrain not needed: ${report.retrainReason}`);
        report.actionTaken = 'keep_current';
        return this.finalizeReport(report, startTime);
      }

      this.logger.info(`🎯 Retrain triggered: ${report.retrainReason}`);
      this.stats.totalRetrains++;

      // 3. Train new model
      try {
        report.newModelId = await this.trainingPipeline.startTraining();
        if (report.newModelId) {
          report.newModelPerformance = await this.getNewModelPerformance(report.newModelId);
          
          this.logger.info(`🎓 New model ${report.newModelId} trained successfully`);
          if (report.newModelPerformance) {
            this.logger.info(`   Sharpe: ${report.newModelPerformance.sharpeRatio.toFixed(3)}`);
            this.logger.info(`   Return: ${(report.newModelPerformance.totalReturn * 100).toFixed(2)}%`);
          }
        }

        this.stats.successfulRetrains++;
        this.stats.consecutiveFailures = 0;

      } catch (error) {
        const errorMsg = `Training failed: ${error}`;
        this.logger.error(errorMsg);
        report.errors.push(errorMsg);
        this.stats.consecutiveFailures++;
        
        if (this.stats.consecutiveFailures >= this.config.maxConsecutiveFailures) {
          report.actionTaken = 'require_manual_review';
          this.emit('maxFailuresReached', this.stats.consecutiveFailures);
        }
        
        return this.finalizeReport(report, startTime);
      }

      // 4. Compare models and decide on deployment
      const deploymentDecision = this.shouldDeployNewModel(
        report.currentModelPerformance,
        report.newModelPerformance!
      );

      if (deploymentDecision.requiresABTest) {
        // 5. Run A/B test
        report.abTestRequired = true;
        const abTestResult = await this.runABTest(report.currentModelId, report.newModelId!);
        report.abTestResult = abTestResult;

        if (abTestResult.deployed) {
          report.actionTaken = 'deploy_new';
          this.stats.deployedModels++;
          this.stats.averageImprovement = this.updateAverageImprovement(
            (report.newModelPerformance!.sharpeRatio - report.currentModelPerformance.sharpeRatio) / 
            report.currentModelPerformance.sharpeRatio
          );
        } else {
          report.actionTaken = 'keep_current';
        }

      } else if (deploymentDecision.shouldDeploy) {
        // 6. Direct deployment (high confidence improvement)
        await this.trainingPipeline.deployModel(report.newModelId!);
        report.actionTaken = 'deploy_new';
        this.stats.deployedModels++;
        
        const improvement = (report.newModelPerformance!.sharpeRatio - report.currentModelPerformance.sharpeRatio) / 
                           report.currentModelPerformance.sharpeRatio;
        this.stats.averageImprovement = this.updateAverageImprovement(improvement);
        
        this.logger.info(`🚀 New model deployed directly (${(improvement * 100).toFixed(2)}% improvement)`);

      } else {
        // 7. Keep current model
        report.actionTaken = 'keep_current';
        this.logger.info('📋 New model performance insufficient, keeping current model');
      }

      this.logger.info(`✅ Weekly retrain completed: ${report.actionTaken}`);
      return this.finalizeReport(report, startTime);

    } catch (error) {
      this.logger.error('❌ Weekly retrain failed:', error);
      this.emit('retrainFailed', error);
      throw error;
    } finally {
      this.isRetraining = false;
    }
  }

  /**
   * 📊 Get current model performance
   */
  private async getCurrentModelPerformance(): Promise<{
    sharpeRatio: number;
    totalReturn: number;
    maxDrawdown: number;
    winRate: number;
  }> {
    // Get performance from last week
    const summary = this.performanceTracker.calculateMetrics();
    
    // Some PerformanceMetrics implementations may not expose `totalReturn` directly.
    // Use a type cast and fallbacks to support alternate property names while preserving the return shape.
    const totalReturn = (summary as any).totalReturn ?? (summary as any).cumulativeReturn ?? (summary as any).returns ?? 0;
    
    return {
      sharpeRatio: summary.sharpeRatio || 0,
      totalReturn,
      maxDrawdown: summary.maxDrawdown || 0,
      winRate: summary.winRate || 0
    };
  }

  /**
   * 📈 Get new model performance
   */
  private async getNewModelPerformance(modelId: string): Promise<WeeklyRetrainReport['newModelPerformance']> {
    const model = this.trainingPipeline.getAllModels().find((m: any) => m.id === modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    return {
      sharpeRatio: model.validationMetrics.sharpeRatio,
      totalReturn: model.validationMetrics.totalReturn,
      maxDrawdown: model.validationMetrics.maxDrawdown,
      winRate: model.validationMetrics.winRate
    };
  }

  /**
   * 🤔 Determine if retrain is needed
   */
  private shouldRetrain(performance: WeeklyRetrainReport['currentModelPerformance']): {
    shouldRetrain: boolean;
    reason: string;
  } {
    // Check performance threshold
    if (performance.sharpeRatio < this.config.performanceThreshold) {
      return {
        shouldRetrain: true,
        reason: `Performance below threshold (${performance.sharpeRatio.toFixed(3)} < ${this.config.performanceThreshold})`
      };
    }

    // Check drawdown
    if (performance.maxDrawdown > 0.15) {
      return {
        shouldRetrain: true,
        reason: `High drawdown detected (${(performance.maxDrawdown * 100).toFixed(1)}%)`
      };
    }

    // Check win rate
    if (performance.winRate < 0.45) {
      return {
        shouldRetrain: true,
        reason: `Low win rate (${(performance.winRate * 100).toFixed(1)}%)`
      };
    }

    // Always retrain if it's been more than 2 weeks since last retrain
    if (this.stats.lastRetrainDate) {
      const daysSinceLastRetrain = (Date.now() - this.stats.lastRetrainDate.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceLastRetrain > 14) {
        return {
          shouldRetrain: true,
          reason: `Scheduled retrain (${daysSinceLastRetrain.toFixed(1)} days since last retrain)`
        };
      }
    }

    return {
      shouldRetrain: false,
      reason: 'Performance within acceptable range'
    };
  }

  /**
   * 🎯 Determine if new model should be deployed
   */
  private shouldDeployNewModel(
    currentPerformance: WeeklyRetrainReport['currentModelPerformance'],
    newPerformance: WeeklyRetrainReport['newModelPerformance']
  ): { shouldDeploy: boolean; requiresABTest: boolean; reason: string } {
    if (!newPerformance || !currentPerformance) {
      return { shouldDeploy: false, requiresABTest: false, reason: 'Missing performance data' };
    }
    
    const improvement = (newPerformance.sharpeRatio - currentPerformance.sharpeRatio) / currentPerformance.sharpeRatio;

    // High confidence improvement - deploy directly
    if (improvement > this.config.minPerformanceImprovement * 2) {
      return {
        shouldDeploy: true,
        requiresABTest: false,
        reason: `High confidence improvement (${(improvement * 100).toFixed(2)}%)`
      };
    }

    // Moderate improvement - require A/B test
    if (improvement > this.config.minPerformanceImprovement) {
      return {
        shouldDeploy: false,
        requiresABTest: true,
        reason: `Moderate improvement requires A/B test (${(improvement * 100).toFixed(2)}%)`
      };
    }

    // Insufficient improvement
    return {
      shouldDeploy: false,
      requiresABTest: false,
      reason: `Insufficient improvement (${(improvement * 100).toFixed(2)}%)`
    };
  }

  /**
   * 🔬 Run A/B test
   */
  private async runABTest(currentModelId: string, newModelId: string): Promise<{
    winner: 'current' | 'new' | 'tie';
    confidence: number;
    deployed: boolean;
  }> {
    this.logger.info(`🔬 Starting A/B test: ${currentModelId} vs ${newModelId}`);

    await this.trainingPipeline.startABTest(currentModelId, newModelId);

    // Wait for A/B test to complete
    return new Promise((resolve) => {
      const handleABTestCompleted = (result: any) => {
        this.trainingPipeline.removeListener('abTestCompleted', handleABTestCompleted);

        const winner = result.winner === 'A' ? 'current' : result.winner === 'B' ? 'new' : 'tie';
        const shouldDeploy = winner === 'new' && result.confidence > 0.7;

        if (shouldDeploy) {
          this.trainingPipeline.deployModel(newModelId).then(() => {
            this.logger.info(`🚀 A/B test winner deployed: ${newModelId}`);
          });
        }

        resolve({
          winner,
          confidence: result.confidence,
          deployed: shouldDeploy
        });
      };

      this.trainingPipeline.on('abTestCompleted', handleABTestCompleted);
    });
  }

  /**
   * 📊 Update average improvement
   */
  private updateAverageImprovement(improvement: number): number {
    const totalDeployments = this.stats.deployedModels;
    return (this.stats.averageImprovement * (totalDeployments - 1) + improvement) / totalDeployments;
  }

  /**
   * 📅 Get next retrain date
   */
  private getNextRetrainDate(): Date {
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
    nextSunday.setHours(2, 0, 0, 0);
    
    if (nextSunday <= now) {
      nextSunday.setDate(nextSunday.getDate() + 7);
    }
    
    return nextSunday;
  }

  /**
   * 📋 Finalize report
   */
  private finalizeReport(report: WeeklyRetrainReport, startTime: number): WeeklyRetrainReport {
    report.executionTime = Date.now() - startTime;
    this.retrainHistory.push(report);
    this.stats.lastRetrainDate = report.date;

    // Keep only last 12 weeks of history
    if (this.retrainHistory.length > 12) {
      this.retrainHistory = this.retrainHistory.slice(-12);
    }

    this.emit('retrainCompleted', report);
    return report;
  }

  /**
   * 🔄 Manual retrain trigger
   */
  async triggerManualRetrain(reason: string): Promise<WeeklyRetrainReport> {
    this.logger.info(`🔧 Manual retrain triggered: ${reason}`);
    return this.executeWeeklyRetrain();
  }

  /**
   * 🔄 Emergency rollback
   */
  async emergencyRollback(reason: string): Promise<void> {
    this.logger.warn(`🚨 Emergency rollback triggered: ${reason}`);
    
    try {
      await this.trainingPipeline.rollbackToPreviousModel();
      this.logger.info('✅ Emergency rollback completed');
      this.emit('emergencyRollback', reason);
    } catch (error) {
      this.logger.error('❌ Emergency rollback failed:', error);
      this.emit('rollbackFailed', error);
      throw error;
    }
  }

  /**
   * 📊 Get retrain history
   */
  getRetrainHistory(weeks: number = 12): WeeklyRetrainReport[] {
    return this.retrainHistory.slice(-weeks);
  }

  /**
   * ⚙️ Configuration methods
   */
  updateConfig(updates: Partial<WeeklyRetrainConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.info('🔧 Weekly retrain config updated');
  }

  isRetrainInProgress(): boolean {
    return this.isRetraining;
  }

  /**
   * 🧪 Test helper - check if retrain should be initiated
   */
  public async shouldInitiateRetraining(performanceData: any): Promise<boolean> {
    const performance = {
      sharpeRatio: performanceData.sharpeRatio || 1.0,
      totalReturn: performanceData.totalReturn || 0.1,
      maxDrawdown: performanceData.maxDrawdown || 0.05,
      winRate: performanceData.winRate || 0.6
    };
    
    const decision = this.shouldRetrain(performance);
    return decision.shouldRetrain;
  }

  /**
   * 🧪 Test helper - prepare A/B test config
   */
  public async prepareABTest(): Promise<{ duration: number }> {
    return { 
      duration: this.config.abTestDuration || 1
    };
  }

  /**
   * Test helper methods for continuous improvement manager
   */

  /**
   * Health status for continuous improvement manager
   */
  getHealth(): { status: 'healthy' | 'warning' | 'critical', details: any } {
    const baseStatus = this.stats.consecutiveFailures > this.config.maxConsecutiveFailures ? 'critical' : 'healthy';
    return {
      status: baseStatus,
      details: {
        lastRetrain: this.stats.lastRetrainDate,
        consecutiveFailures: this.stats.consecutiveFailures,
        isRetraining: this.isRetraining
      }
    };
  }

  /**
   * Get retrain statistics
   */
  getRetrainStats(): RetrainStats {
    return { ...this.stats };
  }
}

export default WeeklyRetrainSystem;
